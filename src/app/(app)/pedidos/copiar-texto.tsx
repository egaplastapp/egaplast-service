"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"

export function CopiarTexto({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  const [copiado, setCopiado] = useState(false)
  if (!valor?.trim()) return null

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor!.trim())
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copiar}>
      {copiado ? "Copiado" : rotulo}
    </Button>
  )
}
