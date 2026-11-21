import { useMemo, useRef, useState } from 'react'
import { ClipboardPaste, Download, FileUp, Search, Upload } from 'lucide-react'
import { atributosDe, contexto, principalDe } from '../lib/fmrte'
import { calcular } from '../lib/overall'
import type { Setor } from '../lib/posicoes'
import { lerImportado, type Registro } from '../lib/registro'
import { GERADO_EM, VERSAO } from '../lib/versao'
import { Botao, CaixaOvr, Campo, estiloEntrada, Folha, SiglaPosicao } from '../components/ui'

interface Props {
  registros: Registro[]
  qtdMeus: number
  ultimoBackup: number | null
  onAbrir: (r: Registro) => void
  onImportar: (registros: Registro[], backup: boolean) => void
  onBackup: () => void
  avisar: (m: string) => void
}

const FILTROS: (Setor | 'TODOS')[] = ['TODOS', 'GOL', 'DEF', 'MEI', 'ATA']

const dataCurta = (t: number | string) =>
  new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function Base({ registros, qtdMeus, ultimoBackup, onAbrir, onImportar, onBackup, avisar }: Props) {
  const [busca, setBusca] = useState('')
  const [setor, setSetor] = useState<Setor | 'TODOS'>('TODOS')
  const [importando, setImportando] = useState(false)
  const seletor = useRef<HTMLInputElement>(null)

  const linhas = useMemo(
    () =>
      registros
        .map((r) => {
          const principal = principalDe(r.dados)
          const onde = contexto(r.dados)
          const busca = [r.nome, onde, r.dados.Nation.Name].join(' ').toLocaleLowerCase('pt')
          return { r, principal, onde, busca, ...calcular(atributosDe(r.dados), principal) }
        })
        .sort((a, b) => b.ca - a.ca || a.r.nome.localeCompare(b.r.nome, 'pt')),
    [registros],
  )

  const termo = busca.trim().toLocaleLowerCase('pt')
  const visiveis = linhas.filter((l) => (setor === 'TODOS' || l.principal.setor === setor) && (!termo || l.busca.includes(termo)))

  /** Arquivos escolhidos no app Arquivos: backups, jogadores soltos ou listas. */
  const lerArquivos = async (lista: FileList | null) => {
    if (!lista?.length) return
    const chegando: Registro[] = []
    let backup = false
    for (const f of [...lista]) {
      try {
        const r = lerImportado(await f.text(), f.name)
        chegando.push(...r.registros)
        backup ||= r.backup
      } catch {
        avisar(`${f.name} não é um JSON válido`)
        return
      }
    }
    onImportar(chegando, backup)
    setImportando(false)
  }

  return (
    <div className="pt-seguro flex flex-col gap-3">
      <div className="flex items-center justify-between pt-3">
        <div>
          <h1 className="text-2xl font-bold">Base</h1>
          <p className="text-xs text-[var(--apagado)]">
            {registros.length - qtdMeus} na base · {qtdMeus} {qtdMeus === 1 ? 'seu' : 'seus'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setImportando(true)}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-white/8 px-3 text-sm font-semibold active:bg-white/15"
        >
          <ClipboardPaste size={16} /> Importar
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--apagado)]" />
        <input
          className={`${estiloEntrada} pl-10`}
          placeholder="Nome, clube, temporada ou nação"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setSetor(f)}
            className={`h-8 flex-1 rounded-lg text-xs font-bold ${
              setor === f ? 'bg-emerald-500 text-emerald-950' : 'bg-white/5 text-[var(--apagado)]'
            }`}
          >
            {f === 'TODOS' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--apagado)]">
          {registros.length === 0
            ? 'A base ainda está vazia. Peça um jogador ao Claude ou crie o seu.'
            : 'Nenhum jogador com esse filtro.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visiveis.map((l) => (
            <li key={l.r.id}>
              <button
                type="button"
                onClick={() => onAbrir(l.r)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[var(--borda)] bg-[var(--cartao)] px-3 py-2.5 text-left active:bg-white/5"
              >
                <CaixaOvr ovr={l.ovr} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{l.r.nome}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--apagado)]">
                    <SiglaPosicao posicao={l.principal} />
                    <span className="tabular-nums">CA {l.ca}</span>
                    <span className="truncate">· {l.onde || l.r.dados.Nation.Name}</span>
                  </div>
                </div>
                {l.r.origem === 'meu' && (
                  <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">MEU</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-2 rounded-2xl border border-[var(--borda)] bg-[var(--cartao)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--apagado)]">Backup</h2>
        <p className="mt-2 text-sm">
          {qtdMeus === 0
            ? 'Você ainda não salvou jogadores neste aparelho.'
            : `${qtdMeus} ${qtdMeus === 1 ? 'jogador seu fica' : 'jogadores seus ficam'} só neste aparelho.`}
        </p>
        <p className="mt-1 text-xs text-[var(--apagado)]">
          O backup vira um arquivo (salve no app Arquivos). “Restaurar” traz de volta, inclusive em outro aparelho.
          {' '}Último backup: {ultimoBackup ? dataCurta(ultimoBackup) : 'nunca'}.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Botao onClick={onBackup}>
            <Download size={18} /> Fazer backup
          </Botao>
          <Botao onClick={() => seletor.current?.click()}>
            <Upload size={18} /> Restaurar
          </Botao>
        </div>
      </section>

      <p className="pb-2 text-center text-[11px] text-[var(--apagado)]">
        Versão {VERSAO} · {dataCurta(GERADO_EM)}
      </p>

      <input
        ref={seletor}
        type="file"
        accept=".json,application/json"
        multiple
        className="hidden"
        onChange={(e) => {
          void lerArquivos(e.target.files)
          e.target.value = ''
        }}
      />

      {importando && (
        <Importar
          onFechar={() => setImportando(false)}
          onArquivo={() => seletor.current?.click()}
          onImportar={(regs) => {
            onImportar(regs, false)
            setImportando(false)
          }}
        />
      )}
    </div>
  )
}

function Importar({
  onFechar,
  onArquivo,
  onImportar,
}: {
  onFechar: () => void
  onArquivo: () => void
  onImportar: (registros: Registro[]) => void
}) {
  const [nome, setNome] = useState('')
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')

  const importar = () => {
    try {
      const { registros } = lerImportado(texto)
      if (!registros.length) return setErro('Não achei nenhum jogador nesse JSON.')
      const n = nome.trim()
      if (n && registros.length === 1) registros[0] = { ...registros[0], nome: n, dados: { ...registros[0].dados, Name: n } }
      if (registros.some((r) => !r.dados.Name)) return setErro('O JSON não tem nome: escreva o nome do jogador.')
      onImportar(registros)
    } catch (e) {
      setErro(e instanceof SyntaxError ? 'Isso não é um JSON válido.' : (e as Error).message)
    }
  }

  return (
    <Folha titulo="Importar" onFechar={onFechar}>
      <div className="flex flex-col gap-3">
        <Botao tipo="primario" onClick={onArquivo}>
          <FileUp size={18} /> Escolher arquivo .json
        </Botao>
        <p className="text-center text-xs text-[var(--apagado)]">
          Aceita jogador do FMRTE, lista de jogadores ou backup do app. Ou cole o JSON aqui embaixo.
        </p>
        <Campo rotulo="Nome (se o JSON não tiver)">
          <input className={estiloEntrada} value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Campo rotulo="JSON">
          <textarea
            className="h-40 w-full rounded-xl border border-[var(--borda)] bg-[var(--fundo)] p-3 font-mono text-[16px] leading-snug text-[var(--texto)] outline-none focus:border-emerald-500"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setErro('')
            }}
          />
        </Campo>
        {erro && <p className="text-sm text-red-300">{erro}</p>}
        <Botao onClick={importar}>Importar o JSON colado</Botao>
      </div>
    </Folha>
  )
}
