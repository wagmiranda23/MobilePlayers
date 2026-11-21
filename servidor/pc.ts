// O programinha do PC: recebe os jogadores salvos no iPhone e grava na pasta
// `meus/` (fora do git). O iPhone chega aqui pela rede do Tailscale:
//
//   tailscale serve --bg 8765   →   https://<nome-do-pc>.<sua-rede>.ts.net
//
//   npm run pc               roda aqui no terminal (Ctrl+C para parar)
//   npm run pc:instalar      liga junto com o Windows, escondido
//   npm run pc:desinstalar   desfaz o de cima e para o programa
//
// Só escuta em 127.0.0.1: quem vem de fora entra pelo `tailscale serve`, e
// só os seus aparelhos estão na sua rede do Tailscale. Navegador só passa se
// vier do app publicado ou do app rodando no próprio PC (CORS).

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { Pasta, type Entrada } from './pasta.ts'

const PORTA = Number(process.env.MOBILEPLAYERS_PORTA) || 8765
const pasta = new Pasta(process.env.MOBILEPLAYERS_PASTA || join(import.meta.dirname, '..', 'meus'))
const LOG = join(pasta.dir, '.servidor.log')

const ORIGENS = [
  /^https:\/\/wagmiranda23\.github\.io$/,
  /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/,
]

function registrar(msg: string) {
  const linha = `${new Date().toISOString()} ${msg}`
  console.log(linha)
  try {
    appendFileSync(LOG, linha + '\n')
  } catch {
    // sem log, segue
  }
}

function responder(res: ServerResponse, status: number, corpo?: unknown) {
  res.writeHead(status, corpo === undefined ? {} : { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(corpo === undefined ? undefined : JSON.stringify(corpo))
}

async function lerCorpo(req: IncomingMessage, limite = 1_000_000): Promise<unknown> {
  let tamanho = 0
  const partes: Buffer[] = []
  for await (const parte of req) {
    tamanho += (parte as Buffer).length
    if (tamanho > limite) throw new Error('corpo grande demais')
    partes.push(parte as Buffer)
  }
  return JSON.parse(Buffer.concat(partes).toString('utf-8'))
}

const servidor = createServer(async (req, res) => {
  const origem = req.headers.origin
  if (origem) {
    if (!ORIGENS.some((o) => o.test(origem))) return responder(res, 403, { erro: 'origem não permitida' })
    res.setHeader('Access-Control-Allow-Origin', origem)
    res.setHeader('Vary', 'Origin')
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Max-Age', '86400')
    return responder(res, 204)
  }

  const url = new URL(req.url ?? '/', 'http://localhost')
  const partes = url.pathname.split('/').filter(Boolean)
  try {
    if (req.method === 'GET' && url.pathname === '/status') {
      return responder(res, 200, { app: 'MobilePlayers', ok: true, jogadores: pasta.quantos(), pasta: pasta.dir })
    }
    if (req.method === 'GET' && url.pathname === '/jogadores') {
      return responder(res, 200, pasta.listar())
    }
    if (partes[0] === 'jogadores' && partes.length === 2) {
      const id = decodeURIComponent(partes[1])
      if (req.method === 'PUT') {
        // Só JSON: um formulário de outro site não consegue mandar isso sem passar pelo CORS.
        if (!req.headers['content-type']?.includes('application/json')) return responder(res, 415, { erro: 'mande JSON' })
        const corpo = (await lerCorpo(req)) as Partial<Entrada>
        if (!corpo || typeof corpo !== 'object' || !corpo.dados) return responder(res, 400, { erro: 'faltou "dados"' })
        const arquivo = pasta.salvar({ id, dados: corpo.dados, atualizadoEm: corpo.atualizadoEm })
        registrar(`salvo ${arquivo}.json (${id})`)
        return responder(res, 200, { ok: true, arquivo })
      }
      if (req.method === 'DELETE') {
        const arquivo = pasta.excluir(id)
        registrar(arquivo ? `para a lixeira: ${arquivo}.json (${id})` : `excluir ${id}: não estava na pasta`)
        return responder(res, 200, { ok: true, arquivo })
      }
    }
    return responder(res, 404, { erro: 'não existe' })
  } catch (e) {
    registrar(`erro em ${req.method} ${url.pathname}: ${(e as Error).message}`)
    return responder(res, e instanceof SyntaxError ? 400 : 500, { erro: (e as Error).message })
  }
})

servidor.on('error', (e: NodeJS.ErrnoException) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`A porta ${PORTA} já está em uso: o programa do PC já deve estar rodando.`)
    process.exit(0)
  }
  throw e
})

servidor.listen(PORTA, '127.0.0.1', () => {
  registrar(`MobilePlayers PC ouvindo em http://127.0.0.1:${PORTA}, gravando em ${pasta.dir}`)
})
