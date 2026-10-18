"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function AtualizaColeta({ ativo }: { ativo: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (!ativo) return
    const id = setInterval(() => router.refresh(), 2000)
    return () => clearInterval(id)
  }, [ativo, router])
  return null
}
