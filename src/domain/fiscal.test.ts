import { contarStatusFaturadoSemNota, pedidoSemNotaNaReplica } from "@/domain/fiscal"
import type { PedidoLista } from "@/domain/pedidos"
import { describe, expect, it } from "vitest"

function pedido(parcial: Partial<PedidoLista> & { id: number }): PedidoLista {
  return {
    codigo: String(parcial.id),
    erpNumero: null,
    erpRecusa: null,
    valor: 100,
    cancelado: false,
    apagadoEm: null,
    atualizadoEm: null,
    dataPedido: "2026-10-15T15:00:00Z",
    uf: null,
    cliente: null,
    status: "INVOICE-ATIVO",
    corStatus: null,
    loja: null,
    vendedor: null,
    ...parcial,
  }
}

describe("fiscal", () => {
  it("detecta INVOICE-ATIVO sem nota", () => {
    const comNota = new Set([2])
    expect(pedidoSemNotaNaReplica(pedido({ id: 1 }), comNota)).toBe(true)
    expect(pedidoSemNotaNaReplica(pedido({ id: 2 }), comNota)).toBe(false)
    expect(contarStatusFaturadoSemNota([pedido({ id: 1 }), pedido({ id: 2 })], comNota, "2026-10")).toBe(1)
  })
})
