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
  enfileirar,
  enviarFila,
  gravarEnderecoPc,
  gravarFila,
  jogadoresDoPc,
  lerEnderecoPc,
  lerFila,
  semEnviados,
  statusDoPc,
  type EstadoPc,
  type Fila,
  type Operacao,
} from './lib/sincronia'
import { jogadorNovo, recalcular } from './lib/fmrte'
import { exportarArquivo } from './lib/exportar'
import { atualizarPara, VERSAO, versaoPublicada } from './lib/versao'
import { Criar } from './telas/Criar'
import { Base } from './telas/Base'
import { Ficha } from './telas/Ficha'

type Aba = 'criar' | 'base'

const rascunhoVazio = (): Rascunho => ({ dados: jogadorNovo() })

export default function App() {
  const [aba, setAba] = useState<Aba>('criar')
  const [meus, setMeus] = useState<Registro[]>(lerMeus)
  const [rascunho, setRascunho] = useState<Rascunho>(() => lerRascunho() ?? rascunhoVazio())
  const [aberto, setAberto] = useState<Registro | null>(null)
  const [ultimoBackup, setUltimoBackup] = useState(lerUltimoBackup)
  const [novaVersao, setNovaVersao] = useState<string | null>(null)
  const [enderecoPc, setEnderecoPc] = useState(lerEnderecoPc)
  const [fila, setFila] = useState<Fila>(lerFila)
  const [estadoPc, setEstadoPc] = useState<EstadoPc>(() => (lerEnderecoPc() ? { tipo: 'conferindo' } : { tipo: 'sem' }))
  const [aviso, setAviso] = useState('')
  const timer = useRef<number | undefined>(undefined)

  const avisar = useCallback((m: string) => {
    setAviso(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setAviso(''), 2600)
  }, [])

  useEffect(() => gravarRascunho(rascunho), [rascunho])
  useEffect(() => gravarMeus(meus), [meus])
  useEffect(() => gravarFila(fila), [fila])

  // Jogador novo na base = build novo no GitHub Pages. Confere ao abrir e toda
  // vez que o app volta para a tela.
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
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [])

  // ------------------------------------------------------------ sincronia com o PC

  // O envio é assíncrono: lê sempre o estado mais novo pelas refs.
  const meusRef = useRef(meus)
  const filaRef = useRef(fila)
  meusRef.current = meus
  filaRef.current = fila
  const enviando = useRef(false)

  const sincronizar = useCallback(async () => {
    if (!enderecoPc || enviando.current) return
    enviando.current = true
    try {
      const status = await statusDoPc(enderecoPc)
      if (!status) return setEstadoPc({ tipo: 'offline' })
      const pendentes = filaRef.current
      if (Object.keys(pendentes).length) {
        const enviados = await enviarFila(enderecoPc, pendentes, meusRef.current)
        setFila((atual) => semEnviados(atual, enviados))
        const depois = await statusDoPc(enderecoPc)
        setEstadoPc(depois ? { tipo: 'online', status: depois } : { tipo: 'offline' })
      } else {
        setEstadoPc({ tipo: 'online', status })
      }
    } finally {
      enviando.current = false
    }
  }, [enderecoPc])

  // Ao abrir, ao voltar para a tela e a cada 30 s com o app aberto.
  useEffect(() => {
    if (!enderecoPc) return
    void sincronizar()
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void sincronizar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    const intervalo = window.setInterval(aoVoltar, 30_000)
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar)
      window.clearInterval(intervalo)
    }
  }, [enderecoPc, sincronizar])

  // Mudou a fila (salvou, excluiu, importou): tenta mandar na hora.
  useEffect(() => {
    if (Object.keys(fila).length) void sincronizar()
  }, [fila, sincronizar])

  const paraOPc = (ids: string[], op: Operacao) => {
    if (enderecoPc && ids.length) setFila((f) => enfileirar(f, ids, op))
  }

  const conectarPc = (endereco: string) => {
    gravarEnderecoPc(endereco)
    setEnderecoPc(endereco)
    if (!endereco) {
      setFila({})
      setEstadoPc({ tipo: 'sem' })
      return
    }
    setEstadoPc({ tipo: 'conferindo' })
    // Tudo o que já está no aparelho vai para o PC na primeira vez.
    setFila((f) => enfileirar(f, meus.map((m) => m.id), 'salvar'))
  }

  const trazerDoPc = async () => {
    if (!enderecoPc) return
    if (Object.keys(fila).length) return avisar('Espere a fila ir para o PC antes de trazer')
    try {
      const doPc = await jogadoresDoPc(enderecoPc)
      const { lista, novos, atualizados } = mesclar(meus, doPc)
      setMeus(lista)
      avisar(`Do PC: ${novos} novo(s), ${atualizados} atualizado(s)`)
    } catch {
      avisar('O PC não respondeu')
    }
  }

  // ------------------------------------------------------------ jogadores

  const registros = useMemo(() => [...meus, ...BASE], [meus])

  const salvar = () => {
    const nome = rascunho.dados.Name.trim()
    if (!nome) return avisar('Dê um nome ao jogador antes de salvar')
    const dados = recalcular({ ...rascunho.dados, Name: nome })
    if (rascunho.editando && meus.some((m) => m.id === rascunho.editando)) {
      setMeus(meus.map((m) => (m.id === rascunho.editando ? registroMeu(dados, m.id) : m)))
      paraOPc([rascunho.editando], 'salvar')
      avisar('Alterações salvas')
    } else {
      const novo = registroMeu(dados)
      setMeus([novo, ...meus])
      setRascunho({ dados, editando: novo.id })
      paraOPc([novo.id], 'salvar')
      avisar('Salvo em Meus jogadores')
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

  const excluir = (r: Registro) => {
    setMeus(meus.filter((m) => m.id !== r.id))
    if (rascunho.editando === r.id) setRascunho({ ...rascunho, editando: undefined })
    paraOPc([r.id], 'excluir')
    setAberto(null)
    avisar('Jogador excluído')
  }

  const importar = (chegando: Registro[], backup: boolean) => {
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

  const fazerBackup = async () => {
    if (!meus.length) return avisar('Nada para guardar ainda')
    const r = await exportarArquivo(nomeDoBackup(), montarBackup(meus))
    if (r === 'cancelado') return
    gravarUltimoBackup()
    setUltimoBackup(Date.now())
    if (r === 'baixado') avisar('Backup baixado')
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-28">
      {aba === 'criar' ? (
        <Criar rascunho={rascunho} onChange={setRascunho} onSalvar={salvar} onNovo={novo} avisar={avisar} />
      ) : (
        <Base
          registros={registros}
          qtdMeus={meus.length}
          ultimoBackup={ultimoBackup}
          onAbrir={setAberto}
          onImportar={importar}
          onBackup={fazerBackup}
          avisar={avisar}
          pc={{
            endereco: enderecoPc,
            estado: estadoPc,
            pendentes: Object.keys(fila).length,
            onConectar: conectarPc,
            onSincronizar: () => void sincronizar(),
            onTrazer: () => void trazerDoPc(),
          }}
        />
      )}

      {aberto && (
        <Ficha registro={aberto} onFechar={() => setAberto(null)} onEditar={editar} onExcluir={excluir} avisar={avisar} />
      )}

      {novaVersao && (
        <div className="pt-seguro fixed inset-x-0 top-0 z-40 flex justify-center px-4">
          <button
            type="button"
            onClick={() => atualizarPara(novaVersao)}
            className="mt-2 flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-lg active:bg-emerald-400"
          >
            <RefreshCw size={16} /> Base atualizada: toque para carregar
          </button>
        </div>
      )}

      {aviso && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
          <div className="rounded-full bg-white px-4 py-2 text-center text-sm font-semibold text-[#0b1015] shadow-lg">{aviso}</div>
        </div>
      )}

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
