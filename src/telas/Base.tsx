import { useMemo, useState } from 'react'
import { ClipboardPaste, Search } from 'lucide-react'
import { FILTROS, filtrar, linhasDe, type FiltroSetor } from '../lib/lista'
import type { Registro } from '../lib/registro'
import { GERADO_EM, VERSAO } from '../lib/versao'
import { CaixaOvr, estiloEntrada, SiglaPosicao } from '../components/ui'
import { CartaoBackup, CartaoSincronia, dataCurta, type PropsPc } from '../components/Cartoes'
import { Importar } from '../components/Importar'

interface Props {
  registros: Registro[]
  qtdMeus: number
  ultimoBackup: number | null
  onAbrir: (r: Registro) => void
  onImportar: (registros: Registro[], backup: boolean) => void
  /** Abre o seletor de arquivos .json (importar ou restaurar backup). */
  onEscolherArquivos: () => void
  onBackup: () => void
  pc: PropsPc
}

export function Base({ registros, qtdMeus, ultimoBackup, onAbrir, onImportar, onEscolherArquivos, onBackup, pc }: Props) {
  const [busca, setBusca] = useState('')
  const [setor, setSetor] = useState<FiltroSetor>('TODOS')
  const [importando, setImportando] = useState(false)

  const linhas = useMemo(() => linhasDe(registros), [registros])
  const visiveis = filtrar(linhas, busca, setor)

  return (
    <div className="pt-seguro flex flex-col gap-3">
      <div className="flex items-center justify-between pt-3">
        <div>
          <h1 className="text-2xl font-bold">Base</h1>
          <p className="text-xs text-[var(--apagado)]">
            {registros.length - qtdMeus} na base · {qtdMeus} {qtdMeus === 1 ? 'seu' : 'seus'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setImportando(true)}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-white/8 px-3 text-sm font-semibold active:bg-white/15"
        >
          <ClipboardPaste size={16} /> Importar
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--apagado)]" />
        <input
          className={`${estiloEntrada} pl-10`}
          placeholder="Nome, clube, temporada ou nação"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setSetor(f)}
            className={`h-8 flex-1 rounded-lg text-xs font-bold ${
              setor === f ? 'bg-emerald-500 text-emerald-950' : 'bg-white/5 text-[var(--apagado)]'
            }`}
          >
            {f === 'TODOS' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--apagado)]">
          {registros.length === 0
            ? 'A base ainda está vazia. Peça um jogador ao Claude ou crie o seu.'
            : 'Nenhum jogador com esse filtro.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visiveis.map((l) => (
            <li key={l.r.id}>
              <button
                type="button"
                onClick={() => onAbrir(l.r)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[var(--borda)] bg-[var(--cartao)] px-3 py-2.5 text-left active:bg-white/5"
              >
                <CaixaOvr ovr={l.ovr} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{l.r.nome}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--apagado)]">
                    <SiglaPosicao posicao={l.principal} />
                    <span className="tabular-nums">CA {l.ca}</span>
                    <span className="truncate">· {l.onde || l.r.dados.Nation.Name}</span>
                  </div>
                </div>
                {l.r.origem === 'meu' && (
                  <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">MEU</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2">
        <CartaoSincronia {...pc} />
      </div>

      <CartaoBackup
        qtdMeus={qtdMeus}
        comPc={!!pc.endereco}
        noPc={pc.noPc}
        ultimoBackup={ultimoBackup}
        onBackup={onBackup}
        onRestaurar={onEscolherArquivos}
      />

      <p className="pb-2 text-center text-[11px] text-[var(--apagado)]">
        Versão {VERSAO} · {dataCurta(GERADO_EM)}
      </p>

      {importando && (
        <Importar
          onFechar={() => setImportando(false)}
          onArquivo={() => {
            setImportando(false)
            onEscolherArquivos()
          }}
          onImportar={(regs) => {
            onImportar(regs, false)
            setImportando(false)
          }}
        />
      )}
    </div>
  )
}
