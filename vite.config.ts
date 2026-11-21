import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Cada build ganha uma versão: o commit no GitHub Actions, ou a hora, no PC.
// O app compara a dele com a do `versao.json` publicado para saber se a base
// mudou (é assim que um jogador novo aparece no celular sem reinstalar nada).
const VERSAO = process.env.GITHUB_SHA?.slice(0, 7) ?? `local-${Date.now().toString(36)}`
const GERADO_EM = new Date().toISOString()

function versaoJson(): Plugin {
  return {
    name: 'versao-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'versao.json', source: JSON.stringify({ versao: VERSAO, geradoEm: GERADO_EM }) })
    },
  }
}

// `base: './'` deixa o build funcionar em qualquer subpasta (o GitHub Pages
// serve em /MobilePlayers/).
export default defineConfig({
  base: './',
  define: {
    __VERSAO__: JSON.stringify(VERSAO),
    __GERADO_EM__: JSON.stringify(GERADO_EM),
  },
  plugins: [react(), tailwindcss(), versaoJson()],
})
