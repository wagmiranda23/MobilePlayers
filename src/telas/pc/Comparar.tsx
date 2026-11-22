// Dois ou três jogadores lado a lado: atributo por atributo, com o melhor de
// cada linha em destaque, e o overall de cada um em cada posição.

import { useMemo, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { corDoValor, doGrupo, NOME_GRUPO, PES, type Grupo } from '../../lib/atributos'
import { aptidoesDe, atributosDe, contexto, idade, peFracoDe, principalDe, type JogadorFmrte } from '../../lib/fmrte'
import { calcular } from '../../lib/overall'
import { nivelDe, POSICOES } from '../../lib/posicoes'
import { Botao, CaixaOvr, SiglaPosicao } from '../../components/ui'

export const MAX_COMPARAR = 3

/** Atributos em que o menor é o melhor, e os que não são nem bons nem ruins. */
const MENOR_MELHOR = new Set(['Dirtiness', 'InjuryProness'])
const NEUTROS = new Set(['Eccentricity', 'TendencyToPunch'])

export interface Comparado {
  id: string
  nome: string
  dados: JogadorFmrte
}

interface Props {
  jogadores: Comparado[]
  onTirar: (id: string) => void
  onSair: () => void
}

/** Uma linha: rótulo e um valor por jogador. `melhor` diz se o maior ou o menor é o bom (ou nenhum). */
function Linha({
  rotulo,
  valores,
  melhor = 'maior',
  colorir = false,
  extra,
}: {
  rotulo: ReactNode
  valores: number[]
  melhor?: 'maior' | 'menor' | 'nenhum'
  colorir?: boolean
  extra?: (i: number) => ReactNode
}) {
  const alvo = melhor === 'maior' ? Math.max(...valores) : Math.min(...valores)
  const destaca = melhor !== 'nenhum' && valores.length > 1 && valores.some((v) => v !== alvo)
  return (
    <>
      <div className="flex items-center truncate px-2 py-1 text-[13px] text-[var(--apagado)]">{rotulo}</div>
      {valores.map((v, i) => (
        <div
          key={i}
          className={`flex items-center justify-center gap-1.5 rounded-md py-1 text-[15px] font-bold tabular-nums ${
            colorir ? corDoValor(v) : ''
          } ${destaca && v === alvo ? 'bg-emerald-500/12 ring-1 ring-emerald-500/30' : ''}`}
        >
          {extra?.(i)}
          {v}
        </div>
      ))}
    </>
  )
}

function Titulo({ children, n }: { children: string; n: number }) {
  return (
    <div className="pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-[var(--apagado)]" style={{ gridColumn: `span ${n + 1}` }}>
      {children}
    </div>
  )
}

export function Comparar({ jogadores, onTirar, onSair }: Props) {
  const n = jogadores.length
  const info = useMemo(
    () =>
      jogadores.map((j) => {
        const atributos = atributosDe(j.dados)
        const principal = principalDe(j.dados)
        return { ...j, atributos, principal, aptidoes: aptidoesDe(j.dados), resultado: calcular(atributos, principal) }
      }),
    [jogadores],
  )
  const temGoleiro = info.some((j) => j.principal.chave === 'Goalkeeper')
  const grupos: Grupo[] = temGoleiro ? ['goleiro', 'tecnico', 'mental', 'fisico', 'oculto'] : ['tecnico', 'mental', 'fisico', 'oculto']
  const colunas = { gridTemplateColumns: `minmax(150px, 220px) repeat(${Math.max(n, 1)}, minmax(0, 1fr))` }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Comparar</h1>
        <span className="flex-1 text-sm text-[var(--apagado)]">
          Clique nos jogadores da lista para pôr ou tirar (até {MAX_COMPARAR}).
        </span>
        <Botao onClick={onSair}>
          <X size={18} /> Fechar
        </Botao>
      </div>

      {n < 2 && (
        <p className="rounded-xl bg-white/5 px-4 py-3 text-sm text-[var(--apagado)]">
          {n === 0 ? 'Escolha dois jogadores na lista.' : 'Escolha mais um jogador na lista para comparar.'}
        </p>
      )}

      {n > 0 && (
        <div className="grid gap-x-2 rounded-2xl border border-[var(--borda)] bg-[var(--cartao)] p-3" style={colunas}>
          <div />
          {info.map((j) => (
            <div key={j.id} className="relative flex flex-col items-center gap-1 rounded-xl bg-white/4 px-2 pt-3 pb-2 text-center">
              <button
                type="button"
                aria-label={`Tirar ${j.nome}`}
                onClick={() => onTirar(j.id)}
                className="absolute top-1.5 right-1.5 rounded-md p-1 text-[var(--apagado)] hover:bg-white/10"
              >
                <X size={14} />
              </button>
              <CaixaOvr ovr={j.resultado.ovr} />
              <div className="w-full truncate font-semibold">{j.nome}</div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--apagado)]">
                <SiglaPosicao posicao={j.principal} />
                <span className="tabular-nums">CA {j.resultado.ca}</span>
              </div>
              <div className="w-full truncate text-[11px] text-[var(--apagado)]">{contexto(j.dados) || j.dados.Nation.Name}</div>
            </div>
          ))}

          <Titulo n={n}>Resumo</Titulo>
          <Linha rotulo="Overall (na principal)" valores={info.map((j) => j.resultado.ovr)} />
          <Linha rotulo="CA" valores={info.map((j) => j.resultado.ca)} />
          <Linha rotulo="PA" valores={info.map((j) => Math.max(j.dados.PA, j.resultado.ca))} />
          <Linha rotulo="Idade" valores={info.map((j) => idade(j.dados) ?? 0)} melhor="nenhum" />
          <Linha rotulo="Altura (cm)" valores={info.map((j) => j.dados.Height)} melhor="nenhum" />
          <Linha rotulo="Pé fraco" valores={info.map((j) => peFracoDe(j.dados))} colorir />

          {grupos.map((g) => (
            <GrupoLinhas key={g} grupo={g} n={n} info={info} />
          ))}

          <Titulo n={n}>Overall em cada posição</Titulo>
          {POSICOES.map((p) => (
            <Linha
              key={p.chave}
              rotulo={
                <span className="flex items-center gap-2">
                  <SiglaPosicao posicao={p} /> {p.nome}
                </span>
              }
              valores={info.map((j) => calcular(j.atributos, p).ovr)}
              extra={(i) => (
                <span
                  title={nivelDe(info[i].aptidoes[p.chave] ?? 1).nome}
                  className={`inline-block h-2.5 w-2.5 rounded-full ${nivelDe(info[i].aptidoes[p.chave] ?? 1).cor}`}
                />
              )}
            />
          ))}
        </div>
      )}
      {n > 0 && (
        <p className="text-[11px] text-[var(--apagado)]">
          A bolinha ao lado do overall é o nível de aptidão dele naquela posição. O overall ainda não desconta a aptidão.
        </p>
      )}
    </div>
  )
}

function GrupoLinhas({ grupo, n, info }: { grupo: Grupo; n: number; info: { atributos: Record<string, number> }[] }) {
  const lista = doGrupo(grupo).filter((a) => !(PES as readonly string[]).includes(a.chave))
  return (
    <>
      <Titulo n={n}>{NOME_GRUPO[grupo]}</Titulo>
      {lista.map((a) => (
        <Linha
          key={a.chave}
          rotulo={a.rotulo}
          valores={info.map((j) => j.atributos[a.chave] ?? 1)}
          melhor={MENOR_MELHOR.has(a.chave) ? 'menor' : NEUTROS.has(a.chave) ? 'nenhum' : 'maior'}
          colorir={!MENOR_MELHOR.has(a.chave)}
        />
      ))}
    </>
  )
}
