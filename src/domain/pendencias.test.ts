import { itemFilaPendencias, pendenciaAberta, resumirPendenciasAbertas } from "@/domain/pendencias"
import type { PedidoLista } from "@/domain/pedidos"
import { describe, expect, it } from "vitest"

function pedido(id: number): PedidoLista {
  return {
    id,
    codigo: String(id),
    erpNumero: null,
    erpRecusa: null,
    valor: 100,
    cancelado: false,
    apagadoEm: null,
    atualizadoEm: "2026-10-10T12:00:00Z",
    dataPedido: "2026-10-05T12:00:00Z",
    uf: "DF",
    cliente: "Loja",
    status: "EM ANÁLISE",
    corStatus: null,
    loja: null,
    vendedor: null,
  }
}

describe("pendencias", () => {
  it("conta pendências abertas no mês", () => {
    const resumo = resumirPendenciasAbertas(
      [
        { id: 1, orderId: 10, approvalType: "credit_limit", profileApproval: "manager", status: "pending", reason: null },
        { id: 2, orderId: 10, approvalType: "stock", profileApproval: null, status: "pending", reason: null },
        { id: 3, orderId: 99, approvalType: "stock", profileApproval: null, status: "approved", reason: null },
      ],
      [pedido(10)],
      "2026-10",
    )
    expect(resumo.totalAbertas).toBe(2)
    expect(resumo.pedidosComPendencia).toBe(1)
    expect(pendenciaAberta({ id: 1, orderId: 1, approvalType: null, profileApproval: null, status: "pending", reason: null })).toBe(true)
  })

  it("monta item de fila", () => {
    const item = itemFilaPendencias({ totalAbertas: 2, pedidosComPendencia: 1, porTipo: [] }, "2026-10")
    expect(item?.href).toContain("pendencia=1")
  })
})
