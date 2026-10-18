"use client"

import { vizinhosLista } from "@/domain/pedidos"
import { atualizarIdAtualNavegacao, lerRecorteNavegacao } from "@/lib/pedidos/navegacao"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useEffect, useState } from "react"

export function BarraNavegacaoPedido({ idAtual, from }: { idAtual: number; from: string | null }) {
  const [vizinhos, setVizinhos] = useState(() => ({ indice: -1, anterior: null as number | null, proximo: null as number | null, total: 0 }))

  useEffect(() => {
    const recorte = lerRecorteNavegacao()
    setVizinhos(recorte ? vizinhosLista(recorte.ids, idAtual) : { indice: -1, anterior: null, proximo: null, total: 0 })
  }, [idAtual])
  const sufixo = from ? `?from=${from}` : ""

  function href(id: number) {
    atualizarIdAtualNavegacao(id)
    return `/pedidos/${id}${sufixo}`
  }

  if (vizinhos.total <= 1 || vizinhos.indice < 0) return null

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Navegação no recorte">
      {vizinhos.anterior ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={href(vizinhos.anterior)}>Anterior</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Anterior
        </Button>
      )}
      <span className="text-muted-foreground tabular-nums">
        {vizinhos.indice + 1} de {vizinhos.total} no recorte
      </span>
      {vizinhos.proximo ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={href(vizinhos.proximo)}>Próximo</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Próximo
        </Button>
      )}
    </nav>
  )
}
