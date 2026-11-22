// Os cartões de sincronia e de backup. Ficam na aba Base no celular e na
// janela de Ajustes no PC.

import { useState } from 'react'
import { Download, FolderOpen, HardDrive, Laptop, RefreshCw, Upload } from 'lucide-react'
import { normalizarEndereco, type EstadoPc } from '../lib/sincronia'
import { Botao, Campo, estiloEntrada } from './ui'

export interface PropsPc {
  /** O app está aberto no próprio PC: os "meus" são a pasta. */
  noPc: boolean
  endereco: string
  estado: EstadoPc
  pendentes: number
  onConectar: (endereco: string) => void
  onSincronizar: () => void
  onAbrirPasta: () => void
}

export const dataCurta = (t: number | string) =>
  new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const caixa = 'rounded-2xl border border-[var(--borda)] bg-[var(--cartao)] p-4'

function Titulo({ icone: Icone, children }: { icone: typeof Laptop; children: string }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--apagado)]">
      <Icone size={16} /> {children}
    </h2>
  )
}

/** Como está a ligação, numa linha: bolinha colorida e texto. */
export function situacaoDoPc(estado: EstadoPc, noPc: boolean): { cor: string; texto: string } {
  switch (estado.tipo) {
    case 'sem':
      return { cor: 'bg-white/30', texto: 'Sem sincronia' }
    case 'conferindo':
      return { cor: 'animate-pulse bg-amber-400', texto: noPc ? 'Abrindo a pasta…' : 'Procurando o PC…' }
    case 'online':
      return {
        cor: 'bg-emerald-400',
        texto: `${noPc ? 'Pasta meus' : 'PC ligado'} · ${estado.status.jogadores} ${estado.status.jogadores === 1 ? 'jogador' : 'jogadores'}`,
      }
    case 'offline':
      return { cor: 'bg-red-400', texto: noPc ? 'O programa do PC não respondeu' : 'PC desligado ou fora do Tailscale' }
  }
}

function textoPendentes(n: number) {
  return n ? `${n} ${n === 1 ? 'mudança espera' : 'mudanças esperam'} para ir à pasta.` : 'Tudo em dia.'
}

export function CartaoSincronia(props: PropsPc) {
  return props.noPc ? <CartaoPasta {...props} /> : <CartaoPc {...props} />
}

/** No app aberto no PC: a pasta é o lugar dos seus jogadores. */
function CartaoPasta({ estado, pendentes, onSincronizar, onAbrirPasta }: PropsPc) {
  const s = situacaoDoPc(estado, true)
  return (
    <section className={caixa}>
      <Titulo icone={HardDrive}>Pasta do PC</Titulo>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.cor}`} />
        <span className="flex-1">{s.texto}</span>
      </div>
      {estado.tipo === 'online' && (
        <p className="mt-1 truncate text-xs text-[var(--apagado)]" title={estado.status.pasta}>
          {estado.status.pasta}
        </p>
      )}
      <p className="mt-1 text-xs text-[var(--apagado)]">
        Aqui no PC, seus jogadores são os JSONs dessa pasta. O que você cria no iPhone chega nela, e o que você cria aqui
        vai para o iPhone. {textoPendentes(pendentes)}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Botao onClick={onAbrirPasta}>
          <FolderOpen size={18} /> Abrir pasta
        </Botao>
        <Botao onClick={onSincronizar}>
          <RefreshCw size={18} /> Atualizar
        </Botao>
      </div>
    </section>
  )
}

/** No iPhone (ou no endereço do GitHub): o endereço do PC e como está a fila. */
function CartaoPc({ endereco, estado, pendentes, onConectar, onSincronizar }: PropsPc) {
  const [editando, setEditando] = useState(!endereco)
  const [texto, setTexto] = useState(endereco)

  if (editando) {
    return (
      <section className={caixa}>
        <Titulo icone={Laptop}>Sincronizar com o PC</Titulo>
        <p className="mt-2 text-xs text-[var(--apagado)]">
          Seus jogadores ficam iguais aqui e na pasta <b>meus</b> do PC: o que você cria aqui vai para lá, e o que você
          cria no PC vem para cá. Com o PC desligado, as mudanças esperam numa fila e vão quando o PC estiver ligado e o
          app aberto. Precisa do Tailscale ligado no PC e no iPhone.
        </p>
        <div className="mt-3">
          <Campo rotulo="Endereço do PC">
            <input
              className={estiloEntrada}
              value={texto}
              placeholder="https://seu-pc.tailxxxx.ts.net"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setTexto(e.target.value)}
            />
          </Campo>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Botao
            tipo="primario"
            onClick={() => {
              const url = normalizarEndereco(texto)
              if (!url) return
              setTexto(url)
              onConectar(url)
              setEditando(false)
            }}
          >
            Conectar
          </Botao>
          {endereco ? (
            <Botao
              tipo="perigo"
              onClick={() => {
                onConectar('')
                setTexto('')
              }}
            >
              Desconectar
            </Botao>
          ) : (
            <span />
          )}
        </div>
      </section>
    )
  }

  const s = situacaoDoPc(estado, false)
  let host = endereco
  try {
    host = new URL(endereco).host
  } catch {
    // mostra como veio
  }

  return (
    <section className={caixa}>
      <Titulo icone={Laptop}>Sincronizar com o PC</Titulo>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.cor}`} />
        <span className="flex-1">{s.texto}</span>
      </div>
      <p className="mt-1 text-xs text-[var(--apagado)]">
        {textoPendentes(pendentes)}{' '}
        <button type="button" className="text-emerald-400 underline" onClick={() => setEditando(true)}>
          {host}
        </button>
      </p>
      <Botao className="mt-3 w-full" onClick={onSincronizar}>
        <RefreshCw size={18} /> Sincronizar agora
      </Botao>
    </section>
  )
}

export function CartaoBackup({
  qtdMeus,
  comPc,
  noPc,
  ultimoBackup,
  onBackup,
  onRestaurar,
}: {
  qtdMeus: number
  comPc: boolean
  noPc: boolean
  ultimoBackup: number | null
  onBackup: () => void
  onRestaurar: () => void
}) {
  const onde = noPc ? 'na pasta do PC' : 'neste aparelho'
  return (
    <section className={caixa}>
      <Titulo icone={Download}>Backup</Titulo>
      <p className="mt-2 text-sm">
        {qtdMeus === 0
          ? `Você ainda não tem jogadores ${onde}.`
          : noPc
            ? `${qtdMeus} ${qtdMeus === 1 ? 'jogador seu' : 'jogadores seus'} na pasta do PC. O backup junta todos num arquivo só.`
            : comPc
              ? `${qtdMeus} ${qtdMeus === 1 ? 'jogador seu' : 'jogadores seus'} neste aparelho, com cópia no PC. O backup é uma cópia extra.`
              : `${qtdMeus} ${qtdMeus === 1 ? 'jogador seu fica' : 'jogadores seus ficam'} só neste aparelho.`}
      </p>
      <p className="mt-1 text-xs text-[var(--apagado)]">
        {noPc
          ? 'O backup vira um arquivo .json. “Restaurar” traz de volta.'
          : 'O backup vira um arquivo (salve no app Arquivos). “Restaurar” traz de volta, inclusive em outro aparelho.'}{' '}
        Último backup: {ultimoBackup ? dataCurta(ultimoBackup) : 'nunca'}.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Botao onClick={onBackup}>
          <Download size={18} /> Fazer backup
        </Botao>
        <Botao onClick={onRestaurar}>
          <Upload size={18} /> Restaurar
        </Botao>
      </div>
    </section>
  )
}
