// Tirar o JSON do celular. No iPhone, compartilhar (AirDrop, Arquivos, WhatsApp)
// é o caminho natural, mas `navigator.share` e `navigator.clipboard` só
// existem em HTTPS. Pela rede local (http://192.168…) caem nos planos B.

export type ResultadoExportar = 'compartilhado' | 'baixado' | 'cancelado'

export async function exportarArquivo(nome: string, texto: string): Promise<ResultadoExportar> {
  const nomeArquivo = `${nome.trim() || 'Jogador'}.json`
  const arquivo = new File([texto], nomeArquivo, { type: 'application/json' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: nomeArquivo })
      return 'compartilhado'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelado'
    }
  }
  const url = URL.createObjectURL(arquivo)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'baixado'
}

export async function copiarTexto(texto: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(texto)
      return true
    } catch {
      // cai no plano B
    }
  }
  const area = document.createElement('textarea')
  area.value = texto
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  area.setSelectionRange(0, texto.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  area.remove()
  return ok
}
