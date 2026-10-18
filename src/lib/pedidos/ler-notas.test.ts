import { distinctOrderIdsDePaginas } from "@/lib/pedidos/ler"
import { describe, expect, it } from "vitest"

describe("distinctOrderIdsDePaginas", () => {
  it("agrega todas as páginas sem perder ids além de 5000 linhas", () => {
    const pagina1 = Array.from({ length: 3000 }, (_, i) => ({ order_id: i + 1 }))
    const pagina2 = Array.from({ length: 3000 }, (_, i) => ({ order_id: i + 2501 }))
    const ids = distinctOrderIdsDePaginas([pagina1, pagina2])
    expect(ids.size).toBe(5500)
    expect(ids.has(1)).toBe(true)
    expect(ids.has(5500)).toBe(true)
  })
})
