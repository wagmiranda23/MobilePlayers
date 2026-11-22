// O app aberto no próprio PC: o programa do PC serve um build do app em
// http://localhost:8765, e esse build sabe que está no PC (a meta
// `mobileplayers-pc` que vai no index.html). Aí os "meus" são a pasta `meus/`.
//
// O build fica em `.pc-app/` (fora do git) e se refaz sozinho quando o código
// ou a base mudam: o Claude cria um jogador, o programa nota, gera um build
// novo, e o app aberto mostra o aviso de versão nova, como no iPhone.

import { spawn } from 'node:child_process'
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'

const PROJETO = join(import.meta.dirname, '..')
export const DIR_APP = join(PROJETO, '.pc-app')
const DIR_NOVO = `${DIR_APP}-novo`

/** O que entra no build. Mudou algo aqui depois do último build, ele está velho. */
const FONTES = ['src', 'public', 'index.html', 'vite.config.ts', 'package.json']

const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

/** A meta que diz ao app que ele está no PC (`src/lib/modo.ts` procura por ela). */
export const META_PC = '<meta name="mobileplayers-pc" content="1" />'

function maisNovo(caminho: string): number {
  if (!existsSync(caminho)) return 0
  const s = statSync(caminho)
  if (!s.isDirectory()) return s.mtimeMs
  let max = s.mtimeMs
  for (const f of readdirSync(caminho)) max = Math.max(max, maisNovo(join(caminho, f)))
  return max
}

export function desatualizado(): boolean {
  const feito = maisNovo(join(DIR_APP, 'versao.json'))
  return feito === 0 || FONTES.some((f) => maisNovo(join(PROJETO, f)) > feito)
}

let construindo: Promise<boolean> | null = null
let conferidoEm = 0

/** Gera o build em `.pc-app-novo/` e troca pelo `.pc-app/`, para nunca servir um build pela metade. */
export function construir(registrar: (msg: string) => void): Promise<boolean> {
  if (construindo) return construindo
  construindo = new Promise<boolean>((resolve) => {
    const vite = join(PROJETO, 'node_modules', 'vite', 'bin', 'vite.js')
    const p = spawn(process.execPath, [vite, 'build', '--outDir', DIR_NOVO, '--emptyOutDir', '--logLevel', 'error'], {
      cwd: PROJETO,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let saida = ''
    p.stdout.on('data', (d: Buffer) => (saida += d.toString()))
    p.stderr.on('data', (d: Buffer) => (saida += d.toString()))
    p.on('error', (e) => {
      registrar(`build do app falhou: ${e.message}`)
      resolve(false)
    })
    p.on('close', (codigo) => {
      if (codigo !== 0) {
        registrar(`build do app falhou (código ${codigo}): ${saida.trim().slice(-800)}`)
        return resolve(false)
      }
      try {
        rmSync(DIR_APP, { recursive: true, force: true })
        try {
          renameSync(DIR_NOVO, DIR_APP)
        } catch {
          // o Windows às vezes segura a pasta (antivírus, Explorer): copia
          cpSync(DIR_NOVO, DIR_APP, { recursive: true })
          rmSync(DIR_NOVO, { recursive: true, force: true })
        }
        registrar('build do app atualizado')
        resolve(true)
      } catch (e) {
        registrar(`não deu para trocar o build: ${(e as Error).message}`)
        resolve(false)
      }
    })
  }).finally(() => {
    construindo = null
  })
  return construindo
}

/** Confere (no máximo a cada 3 s) se o build está velho e, se estiver, refaz em segundo plano. */
export function conferirBuild(registrar: (msg: string) => void) {
  const agora = Date.now()
  if (construindo || agora - conferidoEm < 3000) return
  conferidoEm = agora
  if (desatualizado()) void construir(registrar)
}

/** O caminho do arquivo pedido dentro de `raiz`, ou null se ele tentar sair de lá. */
export function caminhoSeguro(raiz: string, pathname: string): string | null {
  let rel: string
  try {
    rel = decodeURIComponent(pathname)
  } catch {
    return null
  }
  // Barra invertida: no Windows separa pastas; aqui nenhum arquivo do app usa.
  if (rel.includes('\0') || rel.includes('\\')) return null
  if (rel === '/' || rel === '') rel = '/index.html'
  const caminho = normalize(join(raiz, rel))
  return caminho.startsWith(raiz + sep) ? caminho : null
}

const PREPARANDO = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="refresh" content="2">
<title>MobilePlayers</title><style>body{background:#0b1015;color:#8a9bab;font:16px system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0}</style>
</head><body>Preparando o app…</body></html>`

/** Serve um arquivo do build. Devolve false se não for um arquivo do app (aí o servidor responde 404). */
export function servirApp(req: IncomingMessage, res: ServerResponse, pathname: string, registrar: (msg: string) => void): boolean {
  const caminho = caminhoSeguro(DIR_APP, pathname)
  if (!caminho) return false
  const ehIndice = caminho === join(DIR_APP, 'index.html')
  if (ehIndice || pathname === '/versao.json') conferirBuild(registrar)

  if (!existsSync(join(DIR_APP, 'index.html'))) {
    if (!ehIndice) return false
    void construir(registrar)
    res.writeHead(503, { 'Content-Type': TIPOS['.html'], 'Cache-Control': 'no-store' })
    res.end(PREPARANDO)
    return true
  }
  if (!existsSync(caminho) || statSync(caminho).isDirectory()) return false

  // Os arquivos de assets/ têm hash no nome: podem ficar em cache para sempre.
  const imutavel = caminho.startsWith(join(DIR_APP, 'assets') + sep)
  res.setHeader('Cache-Control', imutavel ? 'public, max-age=31536000, immutable' : 'no-cache')
  res.setHeader('Content-Type', TIPOS[extname(caminho).toLowerCase()] ?? 'application/octet-stream')
  if (ehIndice) {
    const html = readFileSync(caminho, 'utf-8').replace('</head>', `  ${META_PC}\n  </head>`)
    res.writeHead(200)
    res.end(req.method === 'HEAD' ? undefined : html)
  } else {
    res.writeHead(200)
    res.end(req.method === 'HEAD' ? undefined : readFileSync(caminho))
  }
  return true
}
