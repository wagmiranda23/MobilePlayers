import type { ReactNode } from 'react'
import { NIVEIS, NO_CAMPO, nivelDe, POSICOES, type Posicao } from '../lib/posicoes'

interface Props {
  aptidoes: Record<string, number>
  /** Chave da posição principal: ganha o anel branco. */
  principal: string
  /** O que vai dentro do círculo. Sem isso, vai a sigla. */
  conteudo?: (p: Posicao, aptidao: number) => ReactNode
  /** Com isso, cada posição vira um botão. */
  onTocar?: (p: Posicao) => void
}

/** As 14 posições no campo, coloridas pelo nível de aptidão, como no FM. */
export function Campinho({ aptidoes, principal, conteudo, onTocar }: Props) {
  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-[340px] overflow-hidden rounded-2xl border border-emerald-900/50 bg-gradient-to-b from-[#0f2a1f] to-[#0c1f18]">
      {/* linhas do campo */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
      <div className="absolute top-0 left-1/2 h-[14%] w-[46%] -translate-x-1/2 border-x border-b border-white/10" />
      <div className="absolute bottom-0 left-1/2 h-[14%] w-[46%] -translate-x-1/2 border-x border-t border-white/10" />

      {POSICOES.map((p) => {
        const aptidao = aptidoes[p.chave] ?? 1
        const nivel = nivelDe(aptidao)
        const { x, y } = NO_CAMPO[p.chave]
        const anel = p.chave === principal ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0e251c]' : ''
        const circulo = (
          <>
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-extrabold tabular-nums ${nivel.cor} ${anel}`}
            >
              {conteudo ? conteudo(p, aptidao) : p.sigla}
            </span>
            {conteudo && <span className="text-[10px] leading-none font-bold text-white/70">{p.sigla}</span>}
          </>
        )
        const estilo = { left: `${x}%`, top: `${y}%` }
        const classe = 'absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1'
        return onTocar ? (
          <button
            key={p.chave}
            type="button"
            aria-label={`${p.nome}: ${nivel.nome}`}
            onClick={() => onTocar(p)}
            style={estilo}
            className={`${classe} active:scale-95`}
          >
            {circulo}
          </button>
        ) : (
          <div key={p.chave} style={estilo} className={classe} title={`${p.nome}: ${nivel.nome} (${aptidao})`}>
            {circulo}
          </div>
        )
      })}
    </div>
  )
}

/** A faixa de aptidão de cada nível: "18–20", "15–17"… */
export function faixaDoNivel(i: number): string {
  const max = i === 0 ? 20 : NIVEIS[i - 1].min - 1
  const min = Math.max(1, NIVEIS[i].min)
  return `${min}–${max}`
}

export function LegendaNiveis() {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[11px] text-[var(--apagado)]">
      {NIVEIS.map((n) => (
        <span key={n.id} className="flex items-center gap-1">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${n.cor}`} />
          {n.nome}
        </span>
      ))}
    </div>
  )
}
