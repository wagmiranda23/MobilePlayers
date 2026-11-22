import { useState } from 'react'
import { FileUp } from 'lucide-react'
import { lerImportado, type Registro } from '../lib/registro'
import { Botao, Campo, estiloEntrada, Folha } from './ui'

/**
 * Lê arquivos .json escolhidos (ou arrastados para a janela, no PC): backups,
 * jogadores soltos do FMRTE ou listas. Para no primeiro que não for JSON.
 */
export async function lerArquivosJson(
  arquivos: Iterable<File>,
): Promise<{ registros: Registro[]; backup: boolean } | { erro: string }> {
  const registros: Registro[] = []
  let backup = false
  for (const f of arquivos) {
    try {
      const r = lerImportado(await f.text(), f.name)
      registros.push(...r.registros)
      backup ||= r.backup
    } catch {
      return { erro: `${f.name} não é um JSON válido` }
    }
  }
  return { registros, backup }
}

/** A folha de importar: escolher arquivo ou colar o JSON. */
export function Importar({
  onFechar,
  onArquivo,
  onImportar,
}: {
  onFechar: () => void
  onArquivo: () => void
  onImportar: (registros: Registro[]) => void
}) {
  const [nome, setNome] = useState('')
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')

  const importar = () => {
    try {
      const { registros } = lerImportado(texto)
      if (!registros.length) return setErro('Não achei nenhum jogador nesse JSON.')
      const n = nome.trim()
      if (n && registros.length === 1) registros[0] = { ...registros[0], nome: n, dados: { ...registros[0].dados, Name: n } }
      if (registros.some((r) => !r.dados.Name)) return setErro('O JSON não tem nome: escreva o nome do jogador.')
      onImportar(registros)
    } catch (e) {
      setErro(e instanceof SyntaxError ? 'Isso não é um JSON válido.' : (e as Error).message)
    }
  }

  return (
    <Folha titulo="Importar" onFechar={onFechar}>
      <div className="flex flex-col gap-3">
        <Botao tipo="primario" onClick={onArquivo}>
          <FileUp size={18} /> Escolher arquivo .json
        </Botao>
        <p className="text-center text-xs text-[var(--apagado)]">
          Aceita jogador do FMRTE, lista de jogadores ou backup do app. Ou cole o JSON aqui embaixo.
          <span className="hidden lg:inline"> No PC, dá também para arrastar os arquivos para a janela.</span>
        </p>
        <Campo rotulo="Nome (se o JSON não tiver)">
          <input className={estiloEntrada} value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Campo rotulo="JSON">
          <textarea
            className="h-40 w-full rounded-xl border border-[var(--borda)] bg-[var(--fundo)] p-3 font-mono text-[16px] leading-snug text-[var(--texto)] outline-none focus:border-emerald-500 lg:text-[13px]"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setErro('')
            }}
          />
        </Campo>
        {erro && <p className="text-sm text-red-300">{erro}</p>}
        <Botao onClick={importar}>Importar o JSON colado</Botao>
      </div>
    </Folha>
  )
}
