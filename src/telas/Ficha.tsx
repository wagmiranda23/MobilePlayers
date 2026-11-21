import { useMemo } from 'react'
import { ChevronLeft, Copy, Pencil, Share, Trash2 } from 'lucide-react'
import { corDoValor, doGrupo, NOME_GRUPO, type Grupo } from '../lib/atributos'
import { aptidoesDe, atributosDe, BIOTIPOS, contexto, idade, nomeDeArquivo, paraTexto, principalDe } from '../lib/fmrte'
import { calcular, porPosicao } from '../lib/overall'
import { NIVEIS } from '../lib/posicoes'
import type { Registro } from '../lib/registro'
import { copiarTexto, exportarArquivo } from '../lib/exportar'
import { Botao, CaixaOvr, Secao, SiglaPosicao } from '../components/ui'
import { Campinho, LegendaNiveis } from '../components/Campinho'

/** Do "competente" para cima, o campinho mostra o OVR; abaixo disso, só a sigla. */
const MOSTRA_OVR = NIVEIS.find((n) => n.id === 'competente')!.min

/** Grade em duas colunas lida de cima para baixo, como no FM. */
const linhas = (g: Grupo) => ({ gridTemplateRows: `repeat(${Math.ceil(doGrupo(g).length / 2)}, auto)` })

interface Props {
  registro: Registro
  onFechar: () => void
  onEditar: (r: Registro) => void
  onExcluir: (r: Registro) => void
  avisar: (m: string) => void
}

export function Ficha({ registro, onFechar, onEditar, onExcluir, avisar }: Props) {
  const { nome, dados } = registro
  const atributos = useMemo(() => atributosDe(dados), [dados])
  const principal = principalDe(dados)
  const resultado = calcular(atributos, principal)
  const aptidoes = aptidoesDe(dados)
  const ehGoleiro = principal.chave === 'Goalkeeper'
  const anos = idade(dados)
  const onde = contexto(dados)
  const biotipo = BIOTIPOS.find(([v]) => v === dados.BodyType)
  const melhor = porPosicao(atributos)[0]

  const grupos: Grupo[] = ehGoleiro ? ['goleiro', 'mental', 'fisico', 'tecnico'] : ['tecnico', 'mental', 'fisico']
  const texto = paraTexto(dados)
  const arquivo = registro.arquivo ?? nomeDeArquivo(dados)

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-[var(--fundo)]">
      <div className="mx-auto flex max-w-md flex-col gap-3 px-4 pb-10">
        <div className="pt-seguro sticky top-0 z-10 -mx-4 bg-[var(--fundo)]/95 px-2 backdrop-blur">
          <button type="button" onClick={onFechar} className="flex h-12 items-center gap-1 text-sm text-emerald-400">
            <ChevronLeft size={20} /> Voltar
          </button>
        </div>

        <div className="flex items-center gap-4">
          <CaixaOvr ovr={resultado.ovr} tamanho="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{nome}</h1>
            {onde && <div className="truncate text-sm text-[var(--apagado)]">{onde}</div>}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--apagado)]">
              <SiglaPosicao posicao={principal} />
              {anos !== null && <span>{anos} anos</span>}
              {dados.Nation.Name && <span>· {dados.Nation.Name}</span>}
            </div>
            <div className="mt-1 text-xs tabular-nums text-[var(--apagado)]">
              CA {resultado.ca} · PA {Math.max(dados.PA, resultado.ca)} · {dados.Height} cm · {dados.Weight} kg · biotipo{' '}
              {dados.BodyType}
              {biotipo?.[1] ? ` (${biotipo[1].toLowerCase()})` : ''} ·{' '}
              {atributos.RightFoot >= atributos.LeftFoot ? 'destro' : 'canhoto'}
            </div>
          </div>
        </div>

        {registro.origem === 'base' && dados.CA !== resultado.ca && (
          <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            O arquivo diz CA {dados.CA}; pelos atributos, o app calcula {resultado.ca}.
          </p>
        )}

        <Secao titulo="Posições">
          <Campinho
            aptidoes={aptidoes}
            principal={principal.chave}
            conteudo={(p, aptidao) =>
              aptidao >= MOSTRA_OVR ? calcular(atributos, p).ovr : <span className="text-[11px] opacity-70">–</span>
            }
          />
          <LegendaNiveis />
          <p className="mt-2 text-center text-xs text-[var(--apagado)]">
            O número é o overall em cada posição em que ele é pelo menos competente.
          </p>
          {melhor.posicao.chave !== principal.chave && melhor.ovr > resultado.ovr && (
            <p className="mt-3 text-xs text-[var(--apagado)]">
              Pelos atributos, renderia mais como {melhor.posicao.nome.toLowerCase()} (OVR {melhor.ovr}).
            </p>
          )}
        </Secao>

        {grupos.map((g) => (
          <Secao key={g} titulo={NOME_GRUPO[g]}>
            <div className="grid grid-flow-col grid-cols-2 gap-x-4 gap-y-1.5" style={linhas(g)}>
              {doGrupo(g).map((a) => (
                <div key={a.chave} className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] text-[var(--apagado)]">{a.rotulo}</span>
                  <span className={`text-[15px] font-bold tabular-nums ${corDoValor(atributos[a.chave])}`}>
                    {atributos[a.chave]}
                  </span>
                </div>
              ))}
            </div>
          </Secao>
        ))}

        {(['oculto', 'personalidade'] as Grupo[]).map((g) => (
          <Secao key={g} titulo={NOME_GRUPO[g]} aberta={false}>
            <div className="grid grid-flow-col grid-cols-2 gap-x-4 gap-y-1.5" style={linhas(g)}>
              {doGrupo(g).map((a) => (
                <div key={a.chave} className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] text-[var(--apagado)]">{a.rotulo}</span>
                  <span className={`text-[15px] font-bold tabular-nums ${corDoValor(atributos[a.chave])}`}>
                    {atributos[a.chave]}
                  </span>
                </div>
              ))}
            </div>
          </Secao>
        ))}

        <Secao titulo="JSON (FMRTE)" aberta={false}>
          <pre className="max-h-72 overflow-auto rounded-xl bg-black/40 p-3 text-[11px] leading-snug text-[var(--apagado)]">
            {texto}
          </pre>
        </Secao>

        <div className="grid grid-cols-2 gap-2">
          <Botao tipo="primario" onClick={() => onEditar(registro)}>
            <Pencil size={18} /> {registro.origem === 'base' ? 'Editar cópia' : 'Editar'}
          </Botao>
          <Botao
            onClick={async () => {
              if ((await exportarArquivo(arquivo, texto)) === 'baixado') avisar('JSON baixado')
            }}
          >
            <Share size={18} /> Exportar
          </Botao>
          <Botao onClick={async () => avisar((await copiarTexto(texto)) ? 'JSON copiado' : 'Não deu para copiar')}>
            <Copy size={18} /> Copiar JSON
          </Botao>
          {registro.origem === 'meu' && (
            <Botao
              tipo="perigo"
              onClick={() => {
                if (confirm(`Excluir ${nome}?`)) onExcluir(registro)
              }}
            >
              <Trash2 size={18} /> Excluir
            </Botao>
          )}
        </div>
      </div>
    </div>
  )
}
