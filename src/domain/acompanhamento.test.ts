import { describe, expect, it } from "vitest"
import type { PedidoLista } from "./pedidos"
import { composicaoStatus, funilIntegracao, metricasAcompanhamento, pontosAtencao } from "./acompanhamento"
import { resumirPainel } from "./painel"

function pedido(parcial: Partial<PedidoLista> & Pick<PedidoLista, "id">): PedidoLista {
  return {
    codigo: String(parcial.id),
    erpNumero: null,
    erpRecusa: null,
    valor: 100,
    cancelado: false,
    apagadoEm: null,
    atualizadoEm: "2026-10-18T12:00:00.000Z",
    dataPedido: "2026-10-10T15:00:00.000Z",
    uf: "SP",
    cliente: "Cliente",
    status: "APROVADO",
    corStatus: "#0785c5",
    loja: "Loja",
    vendedor: "Ana",
    ...parcial,
  }
}

const hoje = new Date("2026-10-18T15:00:00.000Z")

describe("acompanhamento", () => {
  it("conta atenção por pedido com exceção", () => {
    const ok = pedido({ id: 1, erpNumero: "203201", status: "FATURADO" })
    const excecao = pedido({ id: 2, erpRecusa: "portador", erpNumero: null, atualizadoEm: "2026-10-18T14:00:00.000Z" })
    const lista = [ok, excecao]
    const resumo = resumirPainel(lista, [], hoje)
    const m = metricasAcompanhamento(lista, "2026-10", resumo, hoje.getTime())
    expect(m.emAndamento).toBe(2)
    expect(m.requeremAtencao).toBe(1)
  })

  it("monta funil ERP honesto", () => {
    const faixas = funilIntegracao(
      [pedido({ id: 1, erpNumero: "1" }), pedido({ id: 2, erpRecusa: "r" }), pedido({ id: 3 })],
      "2026-10",
    )
    expect(faixas.map((f) => f.id)).toEqual(["erp_ok", "recusa", "sem_erp"])
  })

  it("ordena pontos de atenção com severidade alta para recusa", () => {
    const pontos = pontosAtencao(
      [pedido({ id: 1, erpNumero: "1" }), pedido({ id: 2, erpRecusa: "falha", atualizadoEm: "2026-10-18T14:00:00.000Z" })],
      "2026-10",
      3,
      hoje.getTime(),
    )
    expect(pontos[0]?.severidade).toBe("alta")
    expect(pontos[0]?.titulo).toMatch(/Recusa/)
  })

  it("agrupa composição top 3 + outros", () => {
    const lista = [
      pedido({ id: 1, status: "A" }),
      pedido({ id: 2, status: "A" }),
      pedido({ id: 3, status: "B" }),
      pedido({ id: 4, status: "C" }),
      pedido({ id: 5, status: "D" }),
    ]
    const { total, fatias } = composicaoStatus(lista, "2026-10")
    expect(total).toBe(5)
    expect(fatias.at(-1)?.rotulo).toBe("Outros")
  })
})
