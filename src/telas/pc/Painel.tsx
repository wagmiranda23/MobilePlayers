// O jogador na tela do PC, no jeito do perfil do FM: cabeçalho com o overall,
// identidade, os atributos em três colunas e, do lado, o campinho e o overall
// por posição. Serve para editar (com `onChange`) e para só ver (sem).
//
// Teclado: clique num atributo e digite o número (o valor fica selecionado,
// então "17" troca direto), setas ↑↓ sobem e descem (com Shift, de 5 em 5),
// Tab ou Enter vão para o próximo.

import { useMemo, useState, type ReactNode } from 'react'
import { corDoValor, doGrupo, NOME_GRUPO, PES, type Atributo, type Grupo } from '../../lib/atributos'
import {
  atributosDe,
  biotipoSugerido,
  BIOTIPOS,
  CABELOS,
  comAtributo,
  comCorpo,
  comPes,
  COMPRIMENTOS,
  ehDestro,
  ETNIAS,
  idade,
  peFracoDe,
  principalDe,
  recalcular,
  type JogadorFmrte,
} from '../../lib/fmrte'
import { calcular, porPosicao } from '../../lib/overall'
import { PESOS } from '../../lib/pesos'
import { NIVEIS, type Posicao } from '../../lib/posicoes'
import { CaixaOvr, SiglaPosicao } from '../../components/ui'
import { Campinho, LegendaNiveis } from '../../components/Campinho'
import { EscolherNivel } from '../../components/EscolherNivel'

/** Do "competente" para cima, o campinho mostra o OVR; abaixo disso, só a sigla. */
const MOSTRA_OVR = NIVEIS.find((n) => n.id === 'competente')!.min

const entradaPc =
  'h-9 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo)] px-2.5 text-sm text-[var(--texto)] outline-none hover:border-white/20 focus:border-emerald-500'

export function Cartao({ titulo, extra, children, className = '' }: { titulo: string; extra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[var(--borda)] bg-[var(--cartao)] p-3 ${className}`}>
      <div className="mb-2 flex items-center gap-2 px-1">
        <h2 className="flex-1 text-xs font-semibold uppercase tracking-wider text-[var(--apagado)]">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  )
}

/** Vai para a próxima caixa de número do painel (Enter faz o mesmo que Tab). */
function focarProxima(atual: HTMLInputElement) {
  const todas = [...document.querySelectorAll<HTMLInputElement>('input[data-entrada]')]
  todas[todas.indexOf(atual) + 1]?.focus()
}

/** Caixa de número que se edita pelo teclado. Mostra o valor colorido pela régua do FM. */
export function EntradaNumero({
  valor,
  onChange,
  rotulo,
  min = 1,
  max = 20,
  colorir = true,
  largura = 'w-9',
}: {
  valor: number
  onChange: (v: number) => void
  rotulo: string
  min?: number
  max?: number
  colorir?: boolean
  largura?: string
}) {
  const [texto, setTexto] = useState<string | null>(null)
  const limitar = (n: number) => Math.max(min, Math.min(max, n))
  return (
    <input
      data-entrada
      aria-label={rotulo}
      inputMode="numeric"
      value={texto ?? String(valor)}
      onFocus={(e) => e.target.select()}
      onBlur={() => setTexto(null)}
      onChange={(e) => {
        const t = e.target.value.replace(/\D/g, '').slice(0, String(max).length)
        setTexto(t)
        if (!t) return
        const n = Number(t)
        if (n > max) {
          onChange(max)
          setTexto(String(max))
        } else if (n >= min) {
          onChange(n)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          const passo = (e.shiftKey ? 5 : 1) * (e.key === 'ArrowUp' ? 1 : -1)
          onChange(limitar(valor + passo))
          setTexto(null)
          requestAnimationFrame(() => (e.target as HTMLInputElement).select())
        } else if (e.key === 'Enter') {
          e.preventDefault()
          focarProxima(e.currentTarget)
        }
      }}
      className={`${largura} shrink-0 rounded-md bg-transparent py-0.5 text-right text-[15px] font-bold tabular-nums outline-none hover:bg-white/6 focus:bg-white/10 focus:ring-1 focus:ring-emerald-500 ${
        colorir ? corDoValor(valor) : ''
      }`}
    />
  )
}

function Valor({ valor, colorir = true }: { valor: number; colorir?: boolean }) {
  return <span className={`w-9 shrink-0 text-right text-[15px] font-bold tabular-nums ${colorir ? corDoValor(valor) : ''}`}>{valor}</span>
}

/** Uma coluna de atributos (Técnicos, Mentais…). `chave` marca os que mais pesam na posição principal. */
function ColunaAtributos({
  titulo,
  lista,
  valores,
  pesos,
  onChange,
  nota,
}: {
  titulo: string
  lista: Atributo[]
  valores: Record<string, number>
  pesos: Record<string, number>
  onChange?: (chave: string, v: number) => void
  nota?: string
}) {
  return (
    <Cartao titulo={titulo}>
      {nota && <p className="mb-1 px-1 text-[11px] text-[var(--apagado)]">{nota}</p>}
      <div className="flex flex-col">
        {lista.map((a) => {
          const chave = (pesos[a.chave] ?? 0) >= 5
          return (
            <div key={a.chave} className="flex items-center gap-2 rounded-md px-1 py-[1px] hover:bg-white/4">
              <span className={`min-w-0 flex-1 truncate text-[13px] ${chave ? 'font-semibold text-white' : 'text-[var(--apagado)]'}`}>
                {chave && <span className="mr-1.5 inline-block h-1.5 w-1.5 -translate-y-0.5 rounded-full bg-emerald-400" />}
                {a.rotulo}
              </span>
              {onChange ? (
                <EntradaNumero valor={valores[a.chave]} rotulo={a.rotulo} onChange={(v) => onChange(a.chave, v)} />
              ) : (
                <Valor valor={valores[a.chave]} />
              )}
            </div>
          )
        })}
      </div>
    </Cartao>
  )
}

/** Um campo da identidade: caixa de texto para editar, texto para só ver. */
function CampoId({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="px-0.5 text-[11px] text-[var(--apagado)]">{rotulo}</span>
      {children}
    </label>
  )
}

function TextoId({ children }: { children: ReactNode }) {
  return <span className="flex h-9 items-center truncate px-0.5 text-sm">{children || '—'}</span>
}

const dataBr = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split('-')
  return a && m && d ? `${d}/${m}/${a}` : iso
}

export interface PropsPainel {
  dados: JogadorFmrte
  /** Sem isso, o painel é só para ver. */
  onChange?: (d: JogadorFmrte) => void
  /** Linha pequena acima do nome ("Da base", "Novo jogador", "Alterações não salvas"). */
  titulo?: ReactNode
  acoes: ReactNode
  aviso?: ReactNode
}

export function Painel({ dados, onChange, titulo, acoes, aviso }: PropsPainel) {
  const editavel = !!onChange
  const atributos = useMemo(() => atributosDe(dados), [dados])
  const principal = principalDe(dados)
  const resultado = calcular(atributos, principal)
  const ranking = useMemo(() => porPosicao(atributos).slice(0, 6), [atributos])
  const pesos = PESOS[principal.perfil]
  const ehGoleiro = principal.chave === 'Goalkeeper'
  const pa = Math.max(dados.PA, resultado.ca)
  const anos = idade(dados)
  const destro = ehDestro(dados)
  const fraco = peFracoDe(dados)
  const sugerido = biotipoSugerido(dados.Height, dados.Weight)
  const [posicaoAberta, setPosicaoAberta] = useState<Posicao | null>(null)

  const mudar = (d: JogadorFmrte) => onChange?.(d)
  const mudarAtributo = editavel ? (chave: string, v: number) => mudar(recalcular(comAtributo(dados, chave, v))) : undefined

  const fisicos = doGrupo('fisico').filter((a) => !(PES as readonly string[]).includes(a.chave))
  const [col1, col4]: Grupo[] = ehGoleiro ? ['goleiro', 'tecnico'] : ['tecnico', 'goleiro']

  const coluna = (g: Grupo, lista = doGrupo(g), nota?: string) => (
    <ColunaAtributos titulo={NOME_GRUPO[g]} lista={lista} valores={atributos} pesos={pesos} onChange={mudarAtributo} nota={nota} />
  )

  return (
    <div className="flex flex-col gap-4">
      {/* cabeçalho */}
      <div className="flex items-start gap-4">
        <CaixaOvr ovr={resultado.ovr} tamanho="lg" />
        <div className="min-w-0 flex-1">
          {titulo && <div className="text-xs text-[var(--apagado)]">{titulo}</div>}
          {editavel ? (
            <input
              className="-mx-1.5 w-full rounded-lg bg-transparent px-1.5 text-2xl font-bold outline-none placeholder:text-white/25 hover:bg-white/5 focus:bg-white/5"
              value={dados.Name}
              placeholder="Nome do jogador"
              onChange={(e) => mudar({ ...dados, Name: e.target.value })}
            />
          ) : (
            <h1 className="truncate text-2xl font-bold">{dados.Name}</h1>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--apagado)]">
            <SiglaPosicao posicao={principal} />
            <span className="tabular-nums">CA {resultado.ca}</span>
            <span>·</span>
            <span className="tabular-nums">PA {pa}</span>
            {anos !== null && <span>· {anos} anos</span>}
            {dados.Nation.Name && <span>· {dados.Nation.Name}</span>}
            {dados.Club && <span>· {dados.Club}</span>}
            {dados.Season && <span>· {dados.Season}</span>}
          </div>
        </div>
        <div className="flex max-w-[50%] flex-wrap justify-end gap-2">{acoes}</div>
      </div>

      {aviso}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Cartao titulo="Identidade">
            <div className="grid grid-cols-3 gap-x-3 gap-y-2.5 2xl:grid-cols-4">
              <CampoId rotulo="Clube">
                {editavel ? (
                  <input className={entradaPc} value={dados.Club ?? ''} placeholder="Opcional" onChange={(e) => mudar({ ...dados, Club: e.target.value || null })} />
                ) : (
                  <TextoId>{dados.Club}</TextoId>
                )}
              </CampoId>
              <CampoId rotulo="Temporada">
                {editavel ? (
                  <input className={entradaPc} value={dados.Season ?? ''} placeholder="Ex.: 2025/26" onChange={(e) => mudar({ ...dados, Season: e.target.value || null })} />
                ) : (
                  <TextoId>{dados.Season}</TextoId>
                )}
              </CampoId>
              <CampoId rotulo="Nascimento">
                {editavel ? (
                  <input
                    type="date"
                    className={entradaPc}
                    value={dados.Born.slice(0, 10)}
                    onChange={(e) => e.target.value && mudar({ ...dados, Born: `${e.target.value}T00:00:00` })}
                  />
                ) : (
                  <TextoId>{dataBr(dados.Born)}</TextoId>
                )}
              </CampoId>
              <CampoId rotulo="Nação">
                {editavel ? (
                  <input
                    className={entradaPc}
                    value={dados.Nation.Name}
                    onChange={(e) => mudar({ ...dados, Nation: { ...dados.Nation, Name: e.target.value, ShortName: e.target.value } })}
                  />
                ) : (
                  <TextoId>{dados.Nation.Name}</TextoId>
                )}
              </CampoId>
              <CampoId rotulo="Altura (cm)">
                {editavel ? (
                  <input
                    type="number"
                    className={entradaPc}
                    value={dados.Height}
                    onChange={(e) => mudar(comCorpo(dados, Number(e.target.value) || 0, dados.Weight))}
                  />
                ) : (
                  <TextoId>{dados.Height} cm</TextoId>
                )}
              </CampoId>
              <CampoId rotulo="Peso (kg)">
                {editavel ? (
                  <input
                    type="number"
                    className={entradaPc}
                    value={dados.Weight}
                    onChange={(e) => mudar(comCorpo(dados, dados.Height, Number(e.target.value) || 0))}
                  />
                ) : (
                  <TextoId>{dados.Weight} kg</TextoId>
                )}
              </CampoId>
              <CampoId rotulo={`Biotipo (FM27)${editavel && dados.BodyType !== sugerido ? ` · sugerido ${sugerido}` : ''}`}>
                {editavel ? (
                  <div className="flex h-9 gap-1">
                    {BIOTIPOS.map(([v, nome]) => (
                      <button
                        key={v}
                        type="button"
                        title={nome || undefined}
                        onClick={() => mudar({ ...dados, BodyType: v })}
                        className={`relative flex-1 rounded-lg text-sm font-bold tabular-nums ${
                          dados.BodyType === v ? 'bg-emerald-500 text-emerald-950' : 'bg-white/5 text-[var(--apagado)] hover:bg-white/10'
                        }`}
                      >
                        {v}
                        {v === sugerido && dados.BodyType !== v && (
                          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <TextoId>
                    {dados.BodyType}
                    {BIOTIPOS.find(([v]) => v === dados.BodyType)?.[1] ? ` (${BIOTIPOS.find(([v]) => v === dados.BodyType)![1].toLowerCase()})` : ''}
                  </TextoId>
                )}
              </CampoId>
              <CampoId rotulo="Pés (o bom é sempre 20)">
                {editavel ? (
                  <div className="flex h-9 items-center gap-1">
                    {[true, false].map((d) => (
                      <button
                        key={String(d)}
                        type="button"
                        onClick={() => mudar(comPes(dados, d, fraco))}
                        className={`h-9 flex-1 rounded-lg text-xs font-semibold ${
                          destro === d ? 'bg-emerald-500 text-emerald-950' : 'bg-white/5 text-[var(--apagado)] hover:bg-white/10'
                        }`}
                      >
                        {d ? 'Destro' : 'Canhoto'}
                      </button>
                    ))}
                    <span className="ml-1 text-[11px] text-[var(--apagado)]">fraco</span>
                    <EntradaNumero valor={fraco} rotulo="Pé fraco" onChange={(v) => mudar(comPes(dados, destro, v))} />
                  </div>
                ) : (
                  <TextoId>
                    {destro ? 'Destro' : 'Canhoto'} · pé fraco <b className={`ml-1 ${corDoValor(fraco)}`}>{fraco}</b>
                  </TextoId>
                )}
              </CampoId>
            </div>
          </Cartao>

          <div className="grid grid-cols-3 gap-4">
            {coluna(col1)}
            {coluna('mental')}
            <div className="flex flex-col gap-4">
              {coluna('fisico', fisicos)}
              {coluna('oculto')}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {coluna(col4, doGrupo(col4), col4 === 'goleiro' ? 'Para jogador de linha, deixe entre 1 e 3.' : undefined)}
            {coluna('personalidade', doGrupo('personalidade'), 'Não entra no overall.')}
            <div className="flex flex-col gap-4">
              <Cartao titulo="Potencial e fama">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 px-1">
                    <span className="flex-1 text-[13px] text-[var(--apagado)]">PA (potencial)</span>
                    {editavel ? (
                      <EntradaNumero
                        valor={pa}
                        rotulo="PA"
                        min={resultado.ca}
                        max={200}
                        colorir={false}
                        largura="w-12"
                        onChange={(v) => mudar(recalcular({ ...dados, PA: v }))}
                      />
                    ) : (
                      <Valor valor={pa} colorir={false} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="flex-1 text-[13px] text-[var(--apagado)]">Reputação mundial (0–20)</span>
                    {editavel ? (
                      <EntradaNumero
                        valor={Math.round(dados.WorldReputation / 500)}
                        rotulo="Reputação mundial"
                        min={0}
                        onChange={(v) => {
                          const rep = v * 500
                          mudar({ ...dados, WorldReputation: rep, CurrentReputation: rep, HomeReputation: Math.min(10000, rep + 700) })
                        }}
                      />
                    ) : (
                      <Valor valor={Math.round(dados.WorldReputation / 500)} />
                    )}
                  </div>
                </div>
              </Cartao>
              <Cartao titulo="Aparência">
                <div className="grid grid-cols-1 gap-x-2 gap-y-2 2xl:grid-cols-2">
                  {(
                    [
                      ['Etnia', 'Ethnicity', ETNIAS],
                      ['Cabelo', 'HairColour', CABELOS],
                      ['Comprimento', 'HairLength', COMPRIMENTOS],
                    ] as const
                  ).map(([rotulo, campo, opcoes]) => (
                    <CampoId key={campo} rotulo={rotulo}>
                      {editavel ? (
                        <select className={entradaPc} value={dados[campo]} onChange={(e) => mudar({ ...dados, [campo]: e.target.value })}>
                          {[...new Set([dados[campo], ...opcoes])].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      ) : (
                        <TextoId>{dados[campo]}</TextoId>
                      )}
                    </CampoId>
                  ))}
                  <CampoId rotulo="Tom de pele (1–20)">
                    {editavel ? (
                      <input
                        type="number"
                        min={1}
                        max={20}
                        className={entradaPc}
                        value={dados.SkinColour}
                        onChange={(e) => mudar({ ...dados, SkinColour: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                      />
                    ) : (
                      <TextoId>{dados.SkinColour}</TextoId>
                    )}
                  </CampoId>
                </div>
              </Cartao>
            </div>
          </div>
        </div>

        <aside className="grid content-start gap-4 lg:grid-cols-2 xl:grid-cols-1">
          <Cartao titulo="Posições">
            <Campinho
              aptidoes={dados.Positions}
              principal={principal.chave}
              conteudo={(p, aptidao) =>
                aptidao >= MOSTRA_OVR ? calcular(atributos, p).ovr : <span className="text-[11px] opacity-70">–</span>
              }
              onTocar={editavel ? setPosicaoAberta : undefined}
            />
            <LegendaNiveis />
            <p className="mt-2 text-center text-[11px] text-[var(--apagado)]">
              {editavel ? 'Clique numa posição para mudar o nível. ' : ''}O número é o overall onde ele é pelo menos competente.
            </p>
          </Cartao>
          <Cartao titulo="Overall por posição">
            <div className="flex flex-col gap-1.5">
              {ranking.map((r) => (
                <div key={r.posicao.chave} className="flex items-center gap-3 px-1">
                  <CaixaOvr ovr={r.ovr} tamanho="sm" />
                  <SiglaPosicao posicao={r.posicao} />
                  <span className="flex-1 truncate text-sm">{r.posicao.nome}</span>
                  <span className="text-xs tabular-nums text-[var(--apagado)]">CA {r.ca}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 px-1 text-[11px] text-[var(--apagado)]">O ponto verde marca os atributos que mais pesam na posição principal.</p>
          </Cartao>
        </aside>
      </div>

      {posicaoAberta && (
        <EscolherNivel
          posicao={posicaoAberta}
          dados={dados}
          onMudar={(d) => {
            mudar(d)
            setPosicaoAberta(null)
          }}
          onFechar={() => setPosicaoAberta(null)}
        />
      )}
    </div>
  )
}
