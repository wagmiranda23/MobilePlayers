// O app em tela larga (PC): barra de cima, a lista à esquerda e o jogador
// aberto no meio. Clicar num jogador seu abre para editar; um da base abre
// para ver (e "Editar cópia"). Arrastar arquivos .json para a janela importa.
//
// Atalhos: Ctrl+S salva; Esc fecha as janelas.

import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import {
  ClipboardPaste,
  Copy,
  CopyPlus,
  FilePlus2,
  FileUp,
  GitCompareArrows,
  Pencil,
  Save,
  Search,
  Settings,
  Share,
  Trash2,
} from 'lucide-react'
import { atributosDe, nomeDeArquivo, paraTexto, principalDe, type JogadorFmrte } from '../../lib/fmrte'
import { calcular } from '../../lib/overall'
import { FILTROS, filtrar, linhasDe, type FiltroSetor } from '../../lib/lista'
import type { Registro } from '../../lib/registro'
import type { Rascunho } from '../../lib/base'
import { copiarTexto, exportarArquivo } from '../../lib/exportar'
import { GERADO_EM, VERSAO } from '../../lib/versao'
import { CaixaOvr, estiloEntrada, Folha, SiglaPosicao } from '../../components/ui'
import { CartaoBackup, CartaoSincronia, dataCurta, situacaoDoPc, type PropsPc } from '../../components/Cartoes'
import { Importar } from '../../components/Importar'
import { Painel } from './Painel'
import { Comparar, MAX_COMPARAR, type Comparado } from './Comparar'

type Origem = 'todos' | 'meus' | 'base'
/** Id especial para o jogador que está aberto no editor, salvo ou não. */
const RASCUNHO = 'rascunho'

interface Props {
  registros: Registro[]
  qtdMeus: number
  rascunho: Rascunho
  /** O editor tem mudança que não foi salva. */
  sujo: boolean
  onRascunho: (r: Rascunho) => void
  onSalvar: () => void
  onNovo: () => void
  onEditar: (r: Registro) => void
  onDuplicar: (dados: JogadorFmrte) => void
  onExcluir: (r: Registro) => void
  onImportar: (registros: Registro[], backup: boolean) => void
  onEscolherArquivos: () => void
  onArquivos: (arquivos: File[]) => void
  onBackup: () => void
  ultimoBackup: number | null
  pc: PropsPc
  avisar: (m: string) => void
}

function BotaoTopo({
  onClick,
  children,
  ativo = false,
  primario = false,
  titulo,
}: {
  onClick: () => void
  children: ReactNode
  ativo?: boolean
  primario?: boolean
  titulo?: string
}) {
  return (
    <button
      type="button"
      title={titulo}
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${
        primario
          ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
          : ativo
            ? 'bg-emerald-500/20 text-emerald-300'
            : 'bg-white/6 text-[var(--texto)] hover:bg-white/12'
      }`}
    >
      {children}
    </button>
  )
}

function BotaoAcao({
  onClick,
  children,
  tipo = 'secundario',
  titulo,
}: {
  onClick: () => void
  children: ReactNode
  tipo?: 'primario' | 'secundario' | 'perigo'
  titulo?: string
}) {
  const cores = {
    primario: 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400',
    secundario: 'bg-white/6 text-[var(--texto)] hover:bg-white/12',
    perigo: 'bg-red-500/12 text-red-300 hover:bg-red-500/25',
  }[tipo]
  return (
    <button type="button" title={titulo} onClick={onClick} className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${cores}`}>
      {children}
    </button>
  )
}

export function LayoutPc(props: Props) {
  const { registros, qtdMeus, rascunho, sujo, pc, avisar } = props
  const [busca, setBusca] = useState('')
  const [setor, setSetor] = useState<FiltroSetor>('TODOS')
  const [origem, setOrigem] = useState<Origem>('todos')
  /** Jogador da base aberto só para ver. `null`: o editor. */
  const [vendo, setVendo] = useState<string | null>(null)
  const [comparando, setComparando] = useState<string[] | null>(null)
  const [ajustes, setAjustes] = useState(false)
  const [importando, setImportando] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const camadas = useRef(0)
  const areaPrincipal = useRef<HTMLElement>(null)

  const linhas = useMemo(() => linhasDe(registros), [registros])
  const visiveis = filtrar(linhas, busca, setor).filter(
    (l) => origem === 'todos' || (origem === 'meus' ? l.r.origem === 'meu' : l.r.origem === 'base'),
  )
  const porId = useMemo(() => new Map(registros.map((r) => [r.id, r])), [registros])
  const vendoRegistro = vendo ? porId.get(vendo) : undefined
  const editandoRegistro = rascunho.editando ? porId.get(rascunho.editando) : undefined

  // Ctrl+S salva o jogador aberto no editor.
  const salvarRef = useRef(props.onSalvar)
  salvarRef.current = props.onSalvar
  const noEditor = !comparando && !vendoRegistro
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (noEditor) salvarRef.current()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [noEditor])

  // Trocou o que está aberto: volta para o topo.
  const emComparacao = !!comparando
  useEffect(() => {
    areaPrincipal.current?.scrollTo({ top: 0 })
  }, [vendo, emComparacao, rascunho.editando])

  /** Antes de trocar o jogador do editor, confirma se há mudança não salva. */
  const podeTrocar = () => !sujo || confirm('O jogador aberto tem alterações não salvas. Descartar?')

  const clicarNaLista = (r: Registro) => {
    if (comparando) {
      setComparando(
        comparando.includes(r.id)
          ? comparando.filter((id) => id !== r.id)
          : comparando.length >= MAX_COMPARAR
            ? (avisar(`Dá para comparar até ${MAX_COMPARAR}`), comparando)
            : [...comparando, r.id],
      )
      return
    }
    if (r.origem === 'base') return setVendo(r.id)
    if (r.id !== rascunho.editando) {
      if (!podeTrocar()) return
      props.onEditar(r)
    }
    setVendo(null)
  }

  const novo = () => {
    if (!podeTrocar()) return
    props.onNovo()
    setVendo(null)
    setComparando(null)
  }

  const editarCopia = (r: Registro) => {
    if (!podeTrocar()) return
    props.onEditar(r)
    setVendo(null)
  }

  const duplicar = (dados: JogadorFmrte) => {
    if (!podeTrocar()) return
    props.onDuplicar(dados)
    setVendo(null)
  }

  const comecarComparacao = (id: string) => {
    setComparando([id])
    setVendo(null)
  }

  const exportar = async (dados: JogadorFmrte, arquivo?: string) => {
    if ((await exportarArquivo(arquivo ?? nomeDeArquivo(dados), paraTexto(dados))) === 'baixado') avisar('JSON baixado')
  }
  const copiar = async (dados: JogadorFmrte) => avisar((await copiarTexto(paraTexto(dados))) ? 'JSON copiado' : 'Não deu para copiar')

  // Arrastar arquivos para a janela.
  const temArquivos = (e: DragEvent) => e.dataTransfer.types.includes('Files')
  const aoEntrar = (e: DragEvent) => {
    if (!temArquivos(e)) return
    e.preventDefault()
    camadas.current++
    setArrastando(true)
  }
  const aoSair = (e: DragEvent) => {
    if (!temArquivos(e)) return
    camadas.current = Math.max(0, camadas.current - 1)
    if (camadas.current === 0) setArrastando(false)
  }
  const aoSoltar = (e: DragEvent) => {
    if (!temArquivos(e)) return
    e.preventDefault()
    camadas.current = 0
    setArrastando(false)
    const arquivos = [...e.dataTransfer.files].filter((f) => /\.json$/i.test(f.name) || f.type === 'application/json')
    if (!arquivos.length) return avisar('Só arquivos .json')
    props.onArquivos(arquivos)
  }

  const comparados: Comparado[] = (comparando ?? []).flatMap((id) => {
    if (id === RASCUNHO) return [{ id, nome: rascunho.dados.Name.trim() || 'Novo jogador', dados: rascunho.dados }]
    const r = porId.get(id)
    return r ? [{ id, nome: r.nome, dados: r.dados }] : []
  })

  const situacao = situacaoDoPc(pc.estado, pc.noPc)
  const selecionados = new Set(comparando ?? [vendoRegistro?.id ?? rascunho.editando ?? ''])

  let principal: ReactNode
  if (comparando) {
    principal = (
      <Comparar jogadores={comparados} onTirar={(id) => setComparando(comparando.filter((x) => x !== id))} onSair={() => setComparando(null)} />
    )
  } else if (vendoRegistro) {
    const r = vendoRegistro
    principal = (
      <Painel
        dados={r.dados}
        titulo={`Da base · ${r.arquivo ?? nomeDeArquivo(r.dados)}.json`}
        aviso={
          r.dados.CA !== calcular(atributosDe(r.dados), principalDe(r.dados)).ca ? (
            <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              O arquivo diz CA {r.dados.CA}; pelos atributos, o app calcula {calcular(atributosDe(r.dados), principalDe(r.dados)).ca}.
            </p>
          ) : undefined
        }
        acoes={
          <>
            <BotaoAcao tipo="primario" onClick={() => editarCopia(r)}>
              <Pencil size={16} /> Editar cópia
            </BotaoAcao>
            <BotaoAcao onClick={() => comecarComparacao(r.id)}>
              <GitCompareArrows size={16} /> Comparar
            </BotaoAcao>
            <BotaoAcao onClick={() => void exportar(r.dados, r.arquivo)} titulo="Baixar o JSON">
              <Share size={16} /> Exportar
            </BotaoAcao>
            <BotaoAcao onClick={() => void copiar(r.dados)} titulo="Copiar o JSON">
              <Copy size={16} />
            </BotaoAcao>
          </>
        }
      />
    )
  } else {
    const titulo = !rascunho.editando
      ? 'Novo jogador · ainda não salvo'
      : sujo
        ? 'Seu jogador · alterações não salvas'
        : 'Seu jogador · salvo'
    principal = (
      <Painel
        dados={rascunho.dados}
        onChange={(d) => props.onRascunho({ ...rascunho, dados: d })}
        titulo={<span className={sujo ? 'text-amber-300' : ''}>{titulo}</span>}
        acoes={
          <>
            <BotaoAcao tipo="primario" onClick={props.onSalvar} titulo="Ctrl+S">
              <Save size={16} /> {rascunho.editando ? 'Salvar' : 'Salvar novo'}
            </BotaoAcao>
            {rascunho.editando && (
              <BotaoAcao onClick={() => duplicar(rascunho.dados)} titulo="Um jogador novo com os mesmos dados (outra temporada, por exemplo)">
                <CopyPlus size={16} /> Duplicar
              </BotaoAcao>
            )}
            <BotaoAcao onClick={() => comecarComparacao(rascunho.editando && !sujo ? rascunho.editando : RASCUNHO)}>
              <GitCompareArrows size={16} /> Comparar
            </BotaoAcao>
            <BotaoAcao onClick={() => void exportar(rascunho.dados)} titulo="Baixar o JSON">
              <Share size={16} /> Exportar
            </BotaoAcao>
            <BotaoAcao onClick={() => void copiar(rascunho.dados)} titulo="Copiar o JSON">
              <Copy size={16} />
            </BotaoAcao>
            {editandoRegistro && (
              <BotaoAcao
                tipo="perigo"
                titulo="Excluir (vai para a lixeira da pasta)"
                onClick={() => {
                  if (confirm(`Excluir ${editandoRegistro.nome}?`)) props.onExcluir(editandoRegistro)
                }}
              >
                <Trash2 size={16} />
              </BotaoAcao>
            )}
          </>
        }
      />
    )
  }

  return (
    <div
      className="flex h-dvh flex-col"
      onDragEnter={aoEntrar}
      onDragOver={(e) => temArquivos(e) && e.preventDefault()}
      onDragLeave={aoSair}
      onDrop={aoSoltar}
    >
      {/* barra de cima */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--borda)] px-4">
        <img src="./icone-192.png" alt="" className="h-8 w-8 rounded-lg" />
        <span className="text-base font-bold">MobilePlayers</span>
        <button
          type="button"
          onClick={() => setAjustes(true)}
          className="ml-2 flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-[var(--apagado)] hover:bg-white/10"
          title={pc.estado.tipo === 'online' ? pc.estado.status.pasta : undefined}
        >
          <span className={`inline-block h-2 w-2 rounded-full ${situacao.cor}`} />
          {situacao.texto}
          {pc.pendentes > 0 && <span className="text-amber-300">· {pc.pendentes} na fila</span>}
        </button>
        <div className="flex-1" />
        <BotaoTopo onClick={novo} primario>
          <FilePlus2 size={16} /> Novo
        </BotaoTopo>
        <BotaoTopo onClick={() => setImportando(true)}>
          <ClipboardPaste size={16} /> Importar
        </BotaoTopo>
        <BotaoTopo onClick={() => (comparando ? setComparando(null) : setComparando([]))} ativo={!!comparando}>
          <GitCompareArrows size={16} /> Comparar
        </BotaoTopo>
        <BotaoTopo onClick={() => setAjustes(true)} titulo="Pasta, sincronia e backup">
          <Settings size={16} />
        </BotaoTopo>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* lista */}
        <aside className="flex w-[300px] shrink-0 flex-col border-r border-[var(--borda)]">
          <div className="flex flex-col gap-2 p-3">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--apagado)]" />
              <input
                className={`${estiloEntrada} h-9 pl-9 text-sm`}
                placeholder="Buscar nome, clube, nação…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className="flex gap-1">
              {FILTROS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSetor(f)}
                  className={`h-7 flex-1 rounded-md text-[11px] font-bold ${
                    setor === f ? 'bg-emerald-500 text-emerald-950' : 'bg-white/5 text-[var(--apagado)] hover:bg-white/10'
                  }`}
                >
                  {f === 'TODOS' ? 'Todos' : f}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(
                [
                  ['todos', `Todos · ${registros.length}`],
                  ['meus', `Meus · ${qtdMeus}`],
                  ['base', `Base · ${registros.length - qtdMeus}`],
                ] as const
              ).map(([o, rotulo]) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOrigem(o)}
                  className={`h-7 flex-1 rounded-md text-[11px] font-semibold ${
                    origem === o ? 'bg-white/15 text-white' : 'bg-white/5 text-[var(--apagado)] hover:bg-white/10'
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            {comparando && (
              <p className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-300">
                Comparando: clique para pôr ou tirar ({comparando.length}/{MAX_COMPARAR}).
              </p>
            )}
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {visiveis.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-[var(--apagado)]">
                {registros.length === 0 ? 'Nenhum jogador ainda.' : 'Nenhum jogador com esse filtro.'}
              </li>
            )}
            {visiveis.map((l) => {
              const ativo = selecionados.has(l.r.id)
              return (
                <li key={l.r.id}>
                  <button
                    type="button"
                    onClick={() => clicarNaLista(l.r)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left ${
                      ativo ? 'bg-emerald-500/15 ring-1 ring-emerald-500/40' : 'hover:bg-white/5'
                    }`}
                  >
                    <CaixaOvr ovr={l.ovr} tamanho="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{l.r.nome}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--apagado)]">
                        <SiglaPosicao posicao={l.principal} />
                        <span className="tabular-nums">CA {l.ca}</span>
                        <span className="truncate">· {l.onde || l.r.dados.Nation.Name}</span>
                      </div>
                    </div>
                    {l.r.origem === 'meu' && (
                      <span className="rounded bg-emerald-500/15 px-1 py-0.5 text-[9px] font-bold text-emerald-300">MEU</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        {/* jogador aberto */}
        <main ref={areaPrincipal} className="min-w-0 flex-1 overflow-y-auto p-5">
          <div className="mx-auto max-w-[1500px]">{principal}</div>
        </main>
      </div>

      {arrastando && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-emerald-400 bg-[var(--cartao)] px-16 py-12 text-emerald-300 shadow-2xl">
            <FileUp size={40} />
            <span className="text-lg font-semibold">Solte para importar</span>
            <span className="text-sm text-[var(--apagado)]">Jogadores do FMRTE, listas ou backup do app</span>
          </div>
        </div>
      )}

      {importando && (
        <Importar
          onFechar={() => setImportando(false)}
          onArquivo={() => {
            setImportando(false)
            props.onEscolherArquivos()
          }}
          onImportar={(regs) => {
            props.onImportar(regs, false)
            setImportando(false)
          }}
        />
      )}

      {ajustes && (
        <Folha titulo="Ajustes" onFechar={() => setAjustes(false)}>
          <div className="flex flex-col gap-3">
            <CartaoSincronia {...pc} />
            <CartaoBackup
              qtdMeus={qtdMeus}
              comPc={!!pc.endereco}
              noPc={pc.noPc}
              ultimoBackup={props.ultimoBackup}
              onBackup={props.onBackup}
              onRestaurar={props.onEscolherArquivos}
            />
            <p className="text-center text-[11px] text-[var(--apagado)]">
              Versão {VERSAO} · {dataCurta(GERADO_EM)}
            </p>
          </div>
        </Folha>
      )}
    </div>
  )
}
