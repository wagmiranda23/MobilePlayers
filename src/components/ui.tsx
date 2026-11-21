import { useState, type ReactNode } from 'react'
import { ChevronDown, Minus, Plus, X } from 'lucide-react'
import { faixaDoOvr } from '../lib/overall'
import { corDoValor } from '../lib/atributos'
import { COR_SETOR, type Posicao } from '../lib/posicoes'

export function CaixaOvr({ ovr, tamanho = 'md' }: { ovr: number; tamanho?: 'sm' | 'md' | 'lg' }) {
  const medidas = {
    sm: 'h-9 w-9 text-base rounded-lg',
    md: 'h-12 w-12 text-xl rounded-xl',
    lg: 'h-16 w-16 text-3xl rounded-2xl',
  }[tamanho]
  return (
    <div className={`caixa-ovr faixa-${faixaDoOvr(ovr)} ${medidas} flex shrink-0 items-center justify-center font-extrabold tabular-nums`}>
      {ovr}
    </div>
  )
}

export function SiglaPosicao({ posicao }: { posicao: Posicao }) {
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tracking-wide ${COR_SETOR[posicao.setor]}`}>
      {posicao.sigla}
    </span>
  )
}

export function Secao({
  titulo,
  extra,
  aberta: abertaInicial = true,
  children,
}: {
  titulo: string
  extra?: ReactNode
  aberta?: boolean
  children: ReactNode
}) {
  const [aberta, setAberta] = useState(abertaInicial)
  return (
    <section className="rounded-2xl border border-[var(--borda)] bg-[var(--cartao)]">
      <button
        type="button"
        onClick={() => setAberta(!aberta)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <span className="flex-1 text-sm font-semibold uppercase tracking-wider text-[var(--apagado)]">{titulo}</span>
        {extra}
        <ChevronDown size={18} className={`text-[var(--apagado)] transition-transform ${aberta ? 'rotate-180' : ''}`} />
      </button>
      {aberta && <div className="px-4 pb-4">{children}</div>}
    </section>
  )
}

/** Uma linha de atributo: rótulo, slider e valor. `chave` marca os que mais pesam na posição. */
export function LinhaAtributo({
  rotulo,
  valor,
  onChange,
  chave = false,
  min = 1,
  max = 20,
}: {
  rotulo: string
  valor: number
  onChange: (v: number) => void
  chave?: boolean
  min?: number
  max?: number
}) {
  const p = max > min ? ((valor - min) / (max - min)) * 100 : 100
  return (
    <div className="flex items-center gap-2">
      <span className={`w-[44%] truncate text-[13px] ${chave ? 'font-semibold text-white' : 'text-[var(--apagado)]'}`}>
        {chave && <span className="mr-1 inline-block h-1.5 w-1.5 -translate-y-0.5 rounded-full bg-emerald-400" />}
        {rotulo}
      </span>
      <button
        type="button"
        aria-label={`Diminuir ${rotulo}`}
        onClick={() => onChange(Math.max(min, valor - 1))}
        className="hidden h-7 w-7 items-center justify-center rounded-md bg-white/5 text-[var(--apagado)] active:bg-white/15 min-[380px]:flex"
      >
        <Minus size={14} />
      </button>
      <input
        type="range"
        className="barra flex-1"
        min={min}
        max={max}
        value={valor}
        style={{ ['--p' as string]: `${p}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={rotulo}
      />
      <button
        type="button"
        aria-label={`Aumentar ${rotulo}`}
        onClick={() => onChange(Math.min(max, valor + 1))}
        className="hidden h-7 w-7 items-center justify-center rounded-md bg-white/5 text-[var(--apagado)] active:bg-white/15 min-[380px]:flex"
      >
        <Plus size={14} />
      </button>
      <span className={`w-6 text-right text-[15px] font-bold tabular-nums ${corDoValor(valor)}`}>{valor}</span>
    </div>
  )
}

export function Botao({
  children,
  onClick,
  tipo = 'secundario',
  className = '',
}: {
  children: ReactNode
  onClick: () => void
  tipo?: 'primario' | 'secundario' | 'perigo'
  className?: string
}) {
  const cores = {
    primario: 'bg-emerald-500 text-emerald-950 active:bg-emerald-400',
    secundario: 'bg-white/8 text-[var(--texto)] active:bg-white/15',
    perigo: 'bg-red-500/15 text-red-300 active:bg-red-500/25',
  }[tipo]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold ${cores} ${className}`}
    >
      {children}
    </button>
  )
}

/** Folha que sobe do pé da tela. Toque fora para fechar. */
export function Folha({ titulo, onFechar, children }: { titulo: ReactNode; onFechar: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/60" onClick={onFechar}>
      <div
        className="pb-seguro mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-[var(--borda)] bg-[var(--cartao)] px-4 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="min-w-0 flex-1 text-lg font-bold">{titulo}</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-2 text-[var(--apagado)]">
            <X size={20} />
          </button>
        </div>
        <div className="mt-2 pb-4">{children}</div>
      </div>
    </div>
  )
}

export function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-[var(--apagado)]">{rotulo}</span>
      {children}
    </label>
  )
}

export const estiloEntrada =
  'h-11 w-full rounded-xl border border-[var(--borda)] bg-[var(--fundo)] px-3 text-[16px] text-[var(--texto)] outline-none focus:border-emerald-500'
