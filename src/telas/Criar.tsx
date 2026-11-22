import { useMemo, useState } from 'react'
import { Copy, CopyPlus, FilePlus2, Save, Share } from 'lucide-react'
import { doGrupo, NOME_GRUPO, PES, type Grupo } from '../lib/atributos'
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
  nomeDeArquivo,
  paraTexto,
  peFracoDe,
  principalDe,
  recalcular,
  type JogadorFmrte,
} from '../lib/fmrte'
import { calcular, porPosicao } from '../lib/overall'
import { PESOS } from '../lib/pesos'
import type { Posicao } from '../lib/posicoes'
import type { Rascunho } from '../lib/base'
import { copiarTexto, exportarArquivo } from '../lib/exportar'
import { Botao, CaixaOvr, Campo, estiloEntrada, LinhaAtributo, Secao, SiglaPosicao } from '../components/ui'
import { Campinho, LegendaNiveis } from '../components/Campinho'
import { EscolherNivel } from '../components/EscolherNivel'

interface Props {
  rascunho: Rascunho
  onChange: (r: Rascunho) => void
  onSalvar: () => void
  onNovo: () => void
  /** Vira um jogador novo com os mesmos dados (outra temporada, por exemplo). */
  onDuplicar: () => void
  avisar: (m: string) => void
}

const GRUPOS_OVR: Grupo[] = ['tecnico', 'mental', 'fisico']

export function Criar({ rascunho, onChange, onSalvar, onNovo, onDuplicar, avisar }: Props) {
  const { dados } = rascunho
  const atributos = useMemo(() => atributosDe(dados), [dados])
  const principal = principalDe(dados)
  const resultado = calcular(atributos, principal)
  const ranking = useMemo(() => porPosicao(atributos).slice(0, 4), [atributos])
  const pesos = PESOS[principal.perfil]
  const ehGoleiro = principal.chave === 'Goalkeeper'
  const pa = Math.max(dados.PA, resultado.ca)
  const anos = idade(dados)
  const [posicaoAberta, setPosicaoAberta] = useState<Posicao | null>(null)

  const mudar = (d: JogadorFmrte) => onChange({ ...rascunho, dados: d })
  const mudarAtributo = (chave: string, v: number) => mudar(recalcular(comAtributo(dados, chave, v)))

  const destro = ehDestro(dados)
  const fraco = peFracoDe(dados)
  const mudarPes = (direito: boolean, valorFraco: number) => mudar(comPes(dados, direito, valorFraco))

  // O biotipo acompanha altura e peso enquanto estiver no sugerido; mexeu nele, fica.
  const sugerido = biotipoSugerido(dados.Height, dados.Weight)
  const mudarCorpo = (altura: number, peso: number) => mudar(comCorpo(dados, altura, peso))

  const texto = () => paraTexto(dados)
  const exportar = async () => {
    const r = await exportarArquivo(nomeDeArquivo(dados), texto())
    if (r === 'baixado') avisar('JSON baixado')
  }
  const copiar = async () => avisar((await copiarTexto(texto())) ? 'JSON copiado' : 'Não deu para copiar')

  return (
    <div className="flex flex-col gap-3">
      {/* Cabeçalho fixo com o resultado */}
      <div className="pt-seguro sticky top-0 z-10 -mx-4 border-b border-[var(--borda)] bg-[var(--fundo)]/95 px-4 pb-3 backdrop-blur">
        <div className="flex items-center gap-3 pt-3">
          <CaixaOvr ovr={resultado.ovr} tamanho="lg" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-bold">{dados.Name.trim() || 'Novo jogador'}</div>
            <div className="mt-0.5 flex items-center gap-2 text-sm text-[var(--apagado)]">
              <SiglaPosicao posicao={principal} />
              <span className="tabular-nums">CA {resultado.ca}</span>
              <span>·</span>
              <span className="tabular-nums">PA {pa}</span>
              {anos !== null && (
                <>
                  <span>·</span>
                  <span className="tabular-nums">{anos} anos</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Secao titulo="Identidade">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Campo rotulo="Nome">
              <input
                className={estiloEntrada}
                value={dados.Name}
                placeholder="Ex.: João Silva"
                onChange={(e) => mudar({ ...dados, Name: e.target.value })}
              />
            </Campo>
          </div>
          <Campo rotulo="Clube">
            <input
              className={estiloEntrada}
              value={dados.Club ?? ''}
              placeholder="Opcional"
              onChange={(e) => mudar({ ...dados, Club: e.target.value || null })}
            />
          </Campo>
          <Campo rotulo="Temporada">
            <input
              className={estiloEntrada}
              value={dados.Season ?? ''}
              placeholder="Ex.: 2025/26"
              inputMode="numeric"
              onChange={(e) => mudar({ ...dados, Season: e.target.value || null })}
            />
          </Campo>
          <Campo rotulo="Nascimento">
            <input
              type="date"
              className={estiloEntrada}
              value={dados.Born.slice(0, 10)}
              onChange={(e) => e.target.value && mudar({ ...dados, Born: `${e.target.value}T00:00:00` })}
            />
          </Campo>
          <Campo rotulo="Nação">
            <input
              className={estiloEntrada}
              value={dados.Nation.Name}
              onChange={(e) =>
                mudar({ ...dados, Nation: { ...dados.Nation, Name: e.target.value, ShortName: e.target.value } })
              }
            />
          </Campo>
          <Campo rotulo="Altura (cm)">
            <input
              type="number"
              inputMode="numeric"
              className={estiloEntrada}
              value={dados.Height}
              onChange={(e) => mudarCorpo(Number(e.target.value) || 0, dados.Weight)}
            />
          </Campo>
          <Campo rotulo="Peso (kg)">
            <input
              type="number"
              inputMode="numeric"
              className={estiloEntrada}
              value={dados.Weight}
              onChange={(e) => mudarCorpo(dados.Height, Number(e.target.value) || 0)}
            />
          </Campo>
          <div className="col-span-2">
            <span className="text-xs text-[var(--apagado)]">Biotipo (FM27)</span>
            <div className="mt-1 flex gap-1.5">
              {BIOTIPOS.map(([v]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => mudar({ ...dados, BodyType: v })}
                  className={`relative h-10 flex-1 rounded-xl text-sm font-bold tabular-nums ${
                    dados.BodyType === v ? 'bg-emerald-500 text-emerald-950' : 'bg-white/5 text-[var(--apagado)]'
                  }`}
                >
                  {v}
                  {v === sugerido && dados.BodyType !== v && (
                    <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-[var(--apagado)]">
              <span>Ectomorfo</span>
              <span>Mesomorfo</span>
              <span>Endomorfo</span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--apagado)]">
              Pela altura e peso, o sugerido é {sugerido}
              {dados.BodyType === sugerido ? ', e ele acompanha as mudanças.' : ' (o ponto verde).'}
            </p>
          </div>
        </div>
      </Secao>

      <Secao titulo="Posições">
        <Campinho aptidoes={dados.Positions} principal={principal.chave} onTocar={setPosicaoAberta} />
        <LegendaNiveis />
        <p className="mt-2 text-center text-xs text-[var(--apagado)]">
          Toque numa posição para mudar o nível. O anel branco marca a principal, que é a do overall.
        </p>
      </Secao>

      <Secao titulo="Pés">
        <div className="flex gap-2">
          {[true, false].map((d) => (
            <button
              key={String(d)}
              type="button"
              onClick={() => mudarPes(d, fraco)}
              className={`h-10 flex-1 rounded-xl text-sm font-semibold ${
                destro === d ? 'bg-emerald-500 text-emerald-950' : 'bg-white/5 text-[var(--apagado)]'
              }`}
            >
              {d ? 'Destro' : 'Canhoto'}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <LinhaAtributo
            rotulo={destro ? 'Pé Esquerdo' : 'Pé Direito'}
            valor={fraco}
            chave
            onChange={(v) => mudarPes(destro, v)}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--apagado)]">
          O pé bom é sempre 20. O pé fraco pesa no overall de todas as posições.
        </p>
      </Secao>

      {(ehGoleiro ? (['goleiro', ...GRUPOS_OVR] as Grupo[]) : GRUPOS_OVR).map((g) => (
        <Secao key={g} titulo={NOME_GRUPO[g]}>
          <div className="flex flex-col gap-1">
            {doGrupo(g)
              .filter((a) => !(PES as readonly string[]).includes(a.chave))
              .map((a) => (
                <LinhaAtributo
                  key={a.chave}
                  rotulo={a.rotulo}
                  valor={atributos[a.chave]}
                  chave={(pesos[a.chave] ?? 0) >= 5}
                  onChange={(v) => mudarAtributo(a.chave, v)}
                />
              ))}
          </div>
        </Secao>
      ))}

      <Secao titulo="Overall por posição">
        <div className="flex flex-col gap-2">
          {ranking.map((r) => (
            <div key={r.posicao.chave} className="flex items-center gap-3">
              <CaixaOvr ovr={r.ovr} tamanho="sm" />
              <SiglaPosicao posicao={r.posicao} />
              <span className="flex-1 text-sm">{r.posicao.nome}</span>
              <span className="text-xs tabular-nums text-[var(--apagado)]">CA {r.ca}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--apagado)]">
          O ponto verde marca os atributos que mais pesam na posição principal.
        </p>
      </Secao>

      <Secao titulo="Potencial e fama" aberta={false}>
        <div className="flex flex-col gap-3">
          <LinhaAtributo
            rotulo="PA (potencial)"
            valor={pa}
            min={resultado.ca}
            max={200}
            onChange={(v) => mudar(recalcular({ ...dados, PA: v }))}
          />
          <LinhaAtributo
            rotulo="Reputação mundial"
            valor={Math.round(dados.WorldReputation / 500)}
            min={0}
            max={20}
            onChange={(v) => {
              const rep = v * 500
              mudar({ ...dados, WorldReputation: rep, CurrentReputation: rep, HomeReputation: Math.min(10000, rep + 700) })
            }}
          />
        </div>
      </Secao>

      {!ehGoleiro && (
        <Secao titulo={NOME_GRUPO.goleiro} aberta={false}>
          <p className="mb-2 text-xs text-[var(--apagado)]">Para jogador de linha, deixe entre 1 e 3.</p>
          <div className="flex flex-col gap-1">
            {doGrupo('goleiro').map((a) => (
              <LinhaAtributo key={a.chave} rotulo={a.rotulo} valor={atributos[a.chave]} onChange={(v) => mudarAtributo(a.chave, v)} />
            ))}
          </div>
        </Secao>
      )}

      {(['oculto', 'personalidade'] as Grupo[]).map((g) => (
        <Secao key={g} titulo={NOME_GRUPO[g]} aberta={false}>
          <p className="mb-2 text-xs text-[var(--apagado)]">Não entram no overall.</p>
          <div className="flex flex-col gap-1">
            {doGrupo(g).map((a) => (
              <LinhaAtributo key={a.chave} rotulo={a.rotulo} valor={atributos[a.chave]} onChange={(v) => mudarAtributo(a.chave, v)} />
            ))}
          </div>
        </Secao>
      ))}

      <Secao titulo="Aparência" aberta={false}>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Etnia">
            <select className={estiloEntrada} value={dados.Ethnicity} onChange={(e) => mudar({ ...dados, Ethnicity: e.target.value })}>
              {[...new Set([dados.Ethnicity, ...ETNIAS])].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Tom de pele (1–20)">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              className={estiloEntrada}
              value={dados.SkinColour}
              onChange={(e) => mudar({ ...dados, SkinColour: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
            />
          </Campo>
          <Campo rotulo="Cabelo">
            <select className={estiloEntrada} value={dados.HairColour} onChange={(e) => mudar({ ...dados, HairColour: e.target.value })}>
              {[...new Set([dados.HairColour, ...CABELOS])].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Comprimento">
            <select className={estiloEntrada} value={dados.HairLength} onChange={(e) => mudar({ ...dados, HairLength: e.target.value })}>
              {[...new Set([dados.HairLength, ...COMPRIMENTOS])].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Campo>
        </div>
      </Secao>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Botao tipo="primario" onClick={onSalvar}>
          <Save size={18} /> {rascunho.editando ? 'Salvar alterações' : 'Salvar'}
        </Botao>
        <Botao onClick={exportar}>
          <Share size={18} /> Exportar JSON
        </Botao>
        <Botao onClick={copiar}>
          <Copy size={18} /> Copiar JSON
        </Botao>
        <Botao onClick={onNovo}>
          <FilePlus2 size={18} /> Novo
        </Botao>
        {rascunho.editando && (
          <Botao className="col-span-2" onClick={onDuplicar}>
            <CopyPlus size={18} /> Duplicar (outra temporada)
          </Botao>
        )}
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
