import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Database, RefreshCw, UserPlus } from 'lucide-react'
import {
  BASE,
  gravarMeus,
  gravarRascunho,
  gravarUltimoBackup,
  lerMeus,
  lerRascunho,
  lerUltimoBackup,
  type Rascunho,
} from './lib/base'
import { mesclar, montarBackup, nomeDoBackup, registroMeu, type Registro } from './lib/registro'
import {
  abrirPastaNoPc,
  enfileirar,
  enviarFila,
  gravarEnderecoPc,
  gravarFila,
  lerEnderecoPc,
  lerFila,
  reconciliar,
  retratoDoPc,
  semEnviados,
  statusDoPc,
  type EstadoPc,
  type Fila,
  type Operacao,
} from './lib/sincronia'
import { jogadorNovo, recalcular, type JogadorFmrte } from './lib/fmrte'
import { exportarArquivo } from './lib/exportar'
import { ENDERECO_LOCAL, NO_PC, useTelaLarga } from './lib/modo'
import { atualizarPara, VERSAO, versaoPublicada } from './lib/versao'
import { lerArquivosJson } from './components/Importar'
import type { PropsPc } from './components/Cartoes'
import { Criar } from './telas/Criar'
import { Base } from './telas/Base'
import { Ficha } from './telas/Ficha'
import { LayoutPc } from './telas/pc/LayoutPc'

type Aba = 'criar' | 'base'

const rascunhoVazio = (): Rascunho => ({ dados: jogadorNovo() })
const JSON_NOVO = JSON.stringify(jogadorNovo())

/** "2 novos, 1 atualizado" */
function resumo(novos: number, atualizados: number, removidos: number): string {
  const partes: string[] = []
  if (novos) partes.push(`${novos} ${novos === 1 ? 'novo' : 'novos'}`)
  if (atualizados) partes.push(`${atualizados} ${atualizados === 1 ? 'atualizado' : 'atualizados'}`)
  if (removidos) partes.push(`${removidos} ${removidos === 1 ? 'removido' : 'removidos'}`)
  return partes.join(', ')
}

export default function App() {
  const telaLarga = useTelaLarga()
  const [aba, setAba] = useState<Aba>('criar')
  const [meus, setMeus] = useState<Registro[]>(lerMeus)
  const [rascunho, setRascunho] = useState<Rascunho>(() => lerRascunho() ?? rascunhoVazio())
  const [aberto, setAberto] = useState<Registro | null>(null)
  const [ultimoBackup, setUltimoBackup] = useState(lerUltimoBackup)
  const [novaVersao, setNovaVersao] = useState<string | null>(null)
  const [enderecoPc, setEnderecoPc] = useState(lerEnderecoPc)
  const [fila, setFila] = useState<Fila>(lerFila)
  const [aviso, setAviso] = useState('')
  const timer = useRef<number | undefined>(undefined)
  const seletor = useRef<HTMLInputElement>(null)

  /** No PC, o programa do PC é o próprio endereço do app; no iPhone, o que o usuário colou. */
  const endereco = NO_PC ? ENDERECO_LOCAL : enderecoPc
  const [estadoPc, setEstadoPc] = useState<EstadoPc>(() => (endereco ? { tipo: 'conferindo' } : { tipo: 'sem' }))

  const avisar = useCallback((m: string) => {
    setAviso(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setAviso(''), 2600)
  }, [])

  useEffect(() => gravarRascunho(rascunho), [rascunho])
  useEffect(() => gravarMeus(meus), [meus])
  useEffect(() => gravarFila(fila), [fila])

  // Jogador novo na base = build novo (no GitHub Pages, ou no PC). Confere ao
  // abrir e toda vez que o app volta para a tela; no PC, também a cada minuto.
  useEffect(() => {
    const conferir = async () => {
      const v = await versaoPublicada()
      if (v && v !== VERSAO) setNovaVersao(v)
    }
    void conferir()
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void conferir()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    const intervalo = NO_PC ? window.setInterval(aoVoltar, 60_000) : undefined
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar)
      window.clearInterval(intervalo)
    }
  }, [])

  // ------------------------------------------------------------ sincronia com o PC

  // O envio é assíncrono: lê sempre o estado mais novo pelas refs.
  const meusRef = useRef(meus)
  const filaRef = useRef(fila)
  const rascunhoRef = useRef(rascunho)
  meusRef.current = meus
  filaRef.current = fila
  rascunhoRef.current = rascunho
  const enviando = useRef(false)
  const pedidoNoMeio = useRef(false)
  /** Ids que já voltaram para a fila nesta sessão: não volta de novo (evita laço se o PC recusar). */
  const reenviados = useRef(new Set<string>())
  const sincronizarRef = useRef<() => Promise<void>>(async () => {})

  const sincronizar = useCallback(async () => {
    if (!endereco) return
    if (enviando.current) {
      pedidoNoMeio.current = true
      return
    }
    enviando.current = true
    let online = false
    try {
      const status = await statusDoPc(endereco)
      if (!status) return setEstadoPc({ tipo: 'offline' })
      online = true

      // 1. Manda a fila.
      const pendentes = filaRef.current
      let enviados: Fila = {}
      if (Object.keys(pendentes).length) {
        enviados = await enviarFila(endereco, pendentes, meusRef.current)
        setFila((atual) => semEnviados(atual, enviados))
      }
      const resta = semEnviados(filaRef.current, enviados)

      // 2. Puxa a pasta e junta com o que está aqui. O que ainda está na fila não é tocado.
      const retrato = await retratoDoPc(endereco)
      if (!retrato) return setEstadoPc({ tipo: 'online', status })
      // (lê as refs de novo: o usuário pode ter salvo ou excluído enquanto o retrato vinha)
      const antes = meusRef.current
      const r = reconciliar(antes, retrato, new Set([...Object.keys(resta), ...Object.keys(filaRef.current)]))
      if (r.mudou) {
        setMeus(r.lista)
        const editando = rascunhoRef.current.editando
        if (editando) {
          const velho = antes.find((m) => m.id === editando)
          const novo = r.lista.find((m) => m.id === editando)
          if (!novo) {
            // excluído em outro lugar: o editor vira um jogador novo, não salvo
            setRascunho((x) => (x.editando === editando ? { ...x, editando: undefined } : x))
          } else if (velho && novo !== velho && JSON.stringify(rascunhoRef.current.dados) === JSON.stringify(velho.dados)) {
            // mudou em outro lugar e não há edição aqui: o editor acompanha
            setRascunho((x) => (x.editando === editando ? { dados: novo.dados, editando } : x))
          }
        }
        if (antes.length) avisar(`${NO_PC ? 'Pasta' : 'Do PC'}: ${resumo(r.novos, r.atualizados, r.removidos)}`)
      }
      const reenviar = r.reenviar.filter((id) => !reenviados.current.has(id))
      if (reenviar.length) {
        reenviar.forEach((id) => reenviados.current.add(id))
        setFila((f) => enfileirar(f, reenviar, 'salvar'))
      }
      setEstadoPc({ tipo: 'online', status: { ...status, jogadores: retrato.jogadores.length } })
    } finally {
      enviando.current = false
      // Pediram outra sincronia no meio desta (salvou algo): roda de novo, se o PC estava respondendo.
      const deNovo = pedidoNoMeio.current && online
      pedidoNoMeio.current = false
      if (deNovo) window.setTimeout(() => void sincronizarRef.current(), 0)
    }
  }, [endereco, avisar])
  sincronizarRef.current = sincronizar

  // Ao abrir, ao voltar para a tela e de tempos em tempos com o app aberto.
  useEffect(() => {
    if (!endereco) return
    void sincronizar()
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void sincronizar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('focus', aoVoltar)
    const intervalo = window.setInterval(aoVoltar, NO_PC ? 15_000 : 30_000)
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('focus', aoVoltar)
      window.clearInterval(intervalo)
    }
  }, [endereco, sincronizar])

  // Mudou a fila (salvou, excluiu, importou): tenta mandar na hora.
  useEffect(() => {
    if (Object.keys(fila).length) void sincronizar()
  }, [fila, sincronizar])

  const paraOPc = (ids: string[], op: Operacao) => {
    if (endereco && ids.length) setFila((f) => enfileirar(f, ids, op))
  }

  const conectarPc = (novo: string) => {
    gravarEnderecoPc(novo)
    setEnderecoPc(novo)
    reenviados.current.clear()
    if (!novo) {
      setFila({})
      setEstadoPc({ tipo: 'sem' })
      return
    }
    setEstadoPc({ tipo: 'conferindo' })
    // Tudo o que já está no aparelho vai para o PC na primeira vez.
    setFila((f) => enfileirar(f, meus.map((m) => m.id), 'salvar'))
  }

  const abrirPasta = async () => {
    if (!(await abrirPastaNoPc(endereco))) avisar('Não deu para abrir a pasta')
  }

  // ------------------------------------------------------------ jogadores

  const registros = useMemo(() => [...meus, ...BASE], [meus])

  const salvo = rascunho.editando ? meus.find((m) => m.id === rascunho.editando) : undefined
  const sujo = useMemo(
    () => JSON.stringify(rascunho.dados) !== (rascunho.editando ? JSON.stringify(salvo?.dados) : JSON_NOVO),
    [rascunho, salvo],
  )

  const salvar = () => {
    const nome = rascunho.dados.Name.trim()
    if (!nome) return avisar('Dê um nome ao jogador antes de salvar')
    const dados = recalcular({ ...rascunho.dados, Name: nome })
    if (rascunho.editando && meus.some((m) => m.id === rascunho.editando)) {
      const id = rascunho.editando
      setMeus(meus.map((m) => (m.id === id ? registroMeu(dados, id) : m)))
      setRascunho({ dados, editando: id })
      paraOPc([id], 'salvar')
      avisar('Alterações salvas')
    } else {
      const novo = registroMeu(dados)
      setMeus([novo, ...meus])
      setRascunho({ dados, editando: novo.id })
      paraOPc([novo.id], 'salvar')
      avisar(NO_PC ? 'Salvo na pasta meus' : 'Salvo em Meus jogadores')
    }
  }

  const novo = () => {
    setRascunho(rascunhoVazio())
    window.scrollTo({ top: 0 })
  }

  const editar = (r: Registro) => {
    // Jogador da base vira uma cópia sua; o arquivo da base não muda.
    setRascunho({ dados: r.dados, editando: r.origem === 'meu' ? r.id : undefined })
    setAberto(null)
    setAba('criar')
    window.scrollTo({ top: 0 })
    if (r.origem === 'base') avisar('Editando uma cópia: salve para ficar com ela')
  }

  const duplicar = (dados: JogadorFmrte) => {
    setRascunho({ dados: { ...dados }, editando: undefined })
    setAberto(null)
    setAba('criar')
    window.scrollTo({ top: 0 })
    avisar('Cópia pronta: mude a temporada e salve')
  }

  const excluir = (r: Registro) => {
    setMeus(meus.filter((m) => m.id !== r.id))
    if (rascunho.editando === r.id) setRascunho({ ...rascunho, editando: undefined })
    paraOPc([r.id], 'excluir')
    setAberto(null)
    avisar('Jogador excluído')
  }

  const importar = (chegando: Registro[], backup: boolean) => {
    if (!chegando.length) return avisar('Não achei nenhum jogador')
    const recalculados = chegando.map((r) => ({ ...r, dados: recalcular(r.dados) }))
    const { lista, novos, atualizados } = mesclar(meus, recalculados)
    setMeus(lista)
    paraOPc(
      recalculados.map((r) => r.id),
      'salvar',
    )
    if (backup) avisar(`Backup restaurado: ${novos} novo(s), ${atualizados} atualizado(s)`)
    else avisar(chegando.length === 1 ? `${chegando[0].nome} importado` : `${chegando.length} jogadores importados`)
  }

  const lerArquivos = async (arquivos: Iterable<File>) => {
    const r = await lerArquivosJson(arquivos)
    if ('erro' in r) return avisar(r.erro)
    importar(r.registros, r.backup)
  }

  const fazerBackup = async () => {
    if (!meus.length) return avisar('Nada para guardar ainda')
    const r = await exportarArquivo(nomeDoBackup(), montarBackup(meus))
    if (r === 'cancelado') return
    gravarUltimoBackup()
    setUltimoBackup(Date.now())
    if (r === 'baixado') avisar('Backup baixado')
  }

  const pc: PropsPc = {
    noPc: NO_PC,
    endereco,
    estado: estadoPc,
    pendentes: Object.keys(fila).length,
    onConectar: conectarPc,
    onSincronizar: () => void sincronizar(),
    onAbrirPasta: () => void abrirPasta(),
  }

  const escolherArquivos = () => seletor.current?.click()

  const comuns = (
    <>
      <input
        ref={seletor}
        type="file"
        accept=".json,application/json"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void lerArquivos([...e.target.files])
          e.target.value = ''
        }}
      />

      {novaVersao && (
        <div className="pt-seguro fixed inset-x-0 top-0 z-40 flex justify-center px-4">
          <button
            type="button"
            onClick={() => atualizarPara(novaVersao)}
            className="mt-2 flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-lg hover:bg-emerald-400 active:bg-emerald-400"
          >
            <RefreshCw size={16} /> Versão nova: {telaLarga ? 'clique' : 'toque'} para carregar
          </button>
        </div>
      )}

      {aviso && (
        <div className={`pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 ${telaLarga ? 'bottom-6' : 'bottom-24'}`}>
          <div className="rounded-full bg-white px-4 py-2 text-center text-sm font-semibold text-[#0b1015] shadow-lg">{aviso}</div>
        </div>
      )}
    </>
  )

  if (telaLarga) {
    return (
      <>
        <LayoutPc
          registros={registros}
          qtdMeus={meus.length}
          rascunho={rascunho}
          sujo={sujo}
          onRascunho={setRascunho}
          onSalvar={salvar}
          onNovo={novo}
          onEditar={editar}
          onDuplicar={duplicar}
          onExcluir={excluir}
          onImportar={importar}
          onEscolherArquivos={escolherArquivos}
          onArquivos={(arquivos) => void lerArquivos(arquivos)}
          onBackup={fazerBackup}
          ultimoBackup={ultimoBackup}
          pc={pc}
          avisar={avisar}
        />
        {comuns}
      </>
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-28">
      {aba === 'criar' ? (
        <Criar
          rascunho={rascunho}
          onChange={setRascunho}
          onSalvar={salvar}
          onNovo={novo}
          onDuplicar={() => duplicar(rascunho.dados)}
          avisar={avisar}
        />
      ) : (
        <Base
          registros={registros}
          qtdMeus={meus.length}
          ultimoBackup={ultimoBackup}
          onAbrir={setAberto}
          onImportar={importar}
          onEscolherArquivos={escolherArquivos}
          onBackup={fazerBackup}
          pc={pc}
        />
      )}

      {aberto && (
        <Ficha
          registro={aberto}
          onFechar={() => setAberto(null)}
          onEditar={editar}
          onDuplicar={(r) => duplicar(r.dados)}
          onExcluir={excluir}
          avisar={avisar}
        />
      )}

      {comuns}

      <nav className="pb-seguro fixed inset-x-0 bottom-0 z-20 border-t border-[var(--borda)] bg-[var(--fundo)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-md">
          {(
            [
              ['criar', 'Criar', UserPlus],
              ['base', 'Base', Database],
            ] as const
          ).map(([chave, rotulo, Icone]) => (
            <button
              key={chave}
              type="button"
              onClick={() => {
                setAba(chave)
                setAberto(null)
              }}
              className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold ${
                aba === chave ? 'text-emerald-400' : 'text-[var(--apagado)]'
              }`}
            >
              <Icone size={22} />
              {rotulo}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
