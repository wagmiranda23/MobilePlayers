import { Crown } from 'lucide-react'
import { atributosDe, comAptidao, comPrincipal, principalDe, type JogadorFmrte } from '../lib/fmrte'
import { calcular } from '../lib/overall'
import { NIVEIS, nivelDe, type Posicao } from '../lib/posicoes'
import { Botao, CaixaOvr, Folha, SiglaPosicao } from './ui'
import { faixaDoNivel } from './Campinho'

/** A folha que abre ao tocar numa posição do campinho: o nível de aptidão ali, ou "Tornar principal". */
export function EscolherNivel({
  posicao,
  dados,
  onMudar,
  onFechar,
}: {
  posicao: Posicao
  dados: JogadorFmrte
  onMudar: (d: JogadorFmrte) => void
  onFechar: () => void
}) {
  const ehPrincipal = principalDe(dados).chave === posicao.chave
  const atual = nivelDe(dados.Positions[posicao.chave] ?? 1)
  const ovrAli = calcular(atributosDe(dados), posicao).ovr
  return (
    <Folha
      titulo={
        <span className="flex items-center gap-2">
          <SiglaPosicao posicao={posicao} /> {posicao.nome}
        </span>
      }
      onFechar={onFechar}
    >
      <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
        <CaixaOvr ovr={ovrAli} tamanho="sm" />
        <span className="text-sm text-[var(--apagado)]">Overall ali, pelos atributos</span>
      </div>

      {ehPrincipal ? (
        <p className="mt-3 text-sm text-[var(--apagado)]">
          É a posição principal: aptidão 20, e é nela que o overall é calculado. Para trocar, toque em outra posição e
          escolha “Tornar principal”.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-1.5">
            {NIVEIS.map((n, i) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onMudar(comAptidao(dados, posicao.chave, n.valor))}
                className={`flex h-11 items-center gap-3 rounded-xl px-3 text-left text-sm ${
                  atual.id === n.id ? 'bg-white/12 font-semibold' : 'bg-white/4 hover:bg-white/8 active:bg-white/10'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full ${n.cor}`} />
                <span className="flex-1">{n.nome}</span>
                <span className="text-xs tabular-nums text-[var(--apagado)]">{faixaDoNivel(i)}</span>
              </button>
            ))}
          </div>
          <Botao tipo="primario" className="mt-3 w-full" onClick={() => onMudar(comPrincipal(dados, posicao.chave))}>
            <Crown size={18} /> Tornar principal
          </Botao>
        </>
      )}
    </Folha>
  )
}
