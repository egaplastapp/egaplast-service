"use client"

import { useCallback, useSyncExternalStore } from "react"

const EVENTO = "egaplast-armazenado"

function assinar(aviso: () => void) {
  window.addEventListener("storage", aviso)
  window.addEventListener(EVENTO, aviso)
  return () => {
    window.removeEventListener("storage", aviso)
    window.removeEventListener(EVENTO, aviso)
  }
}

/** Valor do localStorage. No servidor e na hidratação vale null. */
export function useArmazenado(chave: string): [string | null, (valor: string | null) => void] {
  const valor = useSyncExternalStore(
    assinar,
    () => window.localStorage.getItem(chave),
    () => null,
  )
  const gravar = useCallback(
    (proximo: string | null) => {
      if (proximo == null) window.localStorage.removeItem(chave)
      else window.localStorage.setItem(chave, proximo)
      window.dispatchEvent(new Event(EVENTO))
    },
    [chave],
  )
  return [valor, gravar]
}
