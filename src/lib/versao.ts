// Descobre se já tem uma versão mais nova publicada. O GitHub Pages guarda o
// index.html em cache por até 10 minutos, e o app da Tela de Início não tem
// botão de recarregar, então o app pergunta sozinho e oferece atualizar.

export const VERSAO = __VERSAO__
export const GERADO_EM = __GERADO_EM__

export async function versaoPublicada(): Promise<string | null> {
  if (import.meta.env.DEV) return null
  try {
    const r = await fetch(`./versao.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!r.ok) return null
    const { versao } = (await r.json()) as { versao?: string }
    return typeof versao === 'string' ? versao : null
  } catch {
    return null
  }
}

/** Recarrega por um endereço novo, para o navegador não usar o index.html do cache. */
export function atualizarPara(versao: string) {
  location.replace(`${location.pathname}?v=${encodeURIComponent(versao)}`)
}
