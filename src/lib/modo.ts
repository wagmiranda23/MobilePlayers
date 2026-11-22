// Onde o app está aberto.
//
// - No iPhone (ou no endereço do GitHub em qualquer navegador): os "meus"
//   ficam no aparelho e vão para o PC pela sincronia, se ela estiver ligada.
// - No próprio PC (http://localhost:8765, servido por `servidor/pc.ts`): os
//   "meus" são a pasta `meus/`. O programa do PC põe uma meta no index.html
//   para o app saber disso. No `npm run dev`, `?pc` no endereço finge o mesmo.

import { useEffect, useState } from 'react'

export const NO_PC =
  typeof document !== 'undefined' &&
  (document.querySelector('meta[name="mobileplayers-pc"]') !== null ||
    (import.meta.env.DEV && new URLSearchParams(location.search).has('pc')))

/** No PC, o programa do PC é o próprio endereço do app. */
export const ENDERECO_LOCAL = NO_PC ? location.origin : ''

/** A partir dessa largura, o app usa o layout de PC (lista, ficha e campinho lado a lado). */
const LARGA = '(min-width: 1024px)'

export function useTelaLarga(): boolean {
  const [larga, setLarga] = useState(() => matchMedia(LARGA).matches)
  useEffect(() => {
    const m = matchMedia(LARGA)
    const mudou = () => setLarga(m.matches)
    m.addEventListener('change', mudou)
    return () => m.removeEventListener('change', mudou)
  }, [])
  return larga
}
