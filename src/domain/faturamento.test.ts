import { describe, expect, it } from "vitest"
import type { PedidoLista } from "./pedidos"
import {
  agregarNotasPorPedido,
  composicaoCredito,
  filtrarLinhasFaturamento,
  filtroFaturamentoInicial,
  linhasPedidoFatura,
  resumirFaturamento,
  rotuloCredito,
} from "./faturamento"
import { resumirPainel } from "./painel"
import type { FaturaLista } from "@/lib/pedidos/ler"

function pedido(parcial: Partial<PedidoLista> & Pick<PedidoLista, "id">): PedidoLista {
  return {
    codigo: String(parcial.id),
    erpNumero: null,
    erpRecusa: null,
    valor: 100,
    cancelado: false,
    apagadoEm: null,
    atualizadoEm: null,
    dataPedido: "2026-10-10T15:00:00.000Z",
    uf: "SP",
    cliente: "Cliente",
    status: null,
    corStatus: null,
    loja: null,
    vendedor: null,
    ...parcial,
  }
}

function fatura(parcial: Partial<FaturaLista> & Pick<FaturaLista, "id" | "pedidoId">): FaturaLista {
  return {
    numero: "F1",
    data: "2026-10-12",
    valor: 80,
    creditStatus: "LIBERADO",
    erpNumero: null,
    ...parcial,
  }
}

const hoje = new Date("2026-10-18T15:00:00.000Z")

describe("faturamento", () => {
  it("agrega notas por pedido", () => {
    const mapa = agregarNotasPorPedido([
      fatura({ id: 1, pedidoId: 10, valor: 50, data: "2026-10-01" }),
      fatura({ id: 2, pedidoId: 10, valor: 30, data: "2026-10-15" }),
    ])
    expect(mapa.get(10)?.valorNotas).toBe(80)
    expect(mapa.get(10)?.ultimaData).toBe("2026-10-15")
  })

  it("classifica gap e sem nota", () => {
    const pedidos = [pedido({ id: 10, valor: 100 }), pedido({ id: 11, valor: 200 })]
    const agregado = agregarNotasPorPedido([fatura({ id: 1, pedidoId: 10, valor: 80 })])
    const linhas = linhasPedidoFatura(pedidos, agregado, "2026-10")
    expect(linhas.find((l) => l.pedidoId === 10)?.situacao).toBe("gap")
    expect(linhas.find((l) => l.pedidoId === 11)?.situacao).toBe("sem_nota")
  })

  it("resume KPIs alinhados ao painel", () => {
    const pedidos = [
      pedido({ id: 10, valor: 100, status: "INVOICE-ATIVO" }),
      pedido({ id: 11, valor: 50, status: "INVOICE-ATIVO" }),
    ]
    const faturas = [fatura({ id: 1, pedidoId: 10, valor: 80 })]
    const resumo = resumirPainel(pedidos, [{ data: "2026-10-10", valor: 80 }], hoje, { mesFoco: "2026-10", buckets: ["2026-10"], bucketTipo: "mes" })
    const rf = resumirFaturamento(pedidos, faturas, "2026-10", resumo)
    expect(rf.quantidadeNotas).toBe(1)
    expect(rf.pedidosSemNota).toBe(1)
    expect(rf.valorFaturado).toBe(80)
    expect(rf.gapValor).toBe(resumo.valor.atual - 80)
  })

  it("filtra por situação fiscal", () => {
    const linhas = [
      { pedidoId: 1, codigo: "1", cliente: "A", valorPedido: 1, valorNotas: 0, ultimaNota: null, situacao: "sem_nota" as const, credito: null },
      { pedidoId: 2, codigo: "2", cliente: "B", valorPedido: 1, valorNotas: 1, ultimaNota: "2026-10-01", situacao: "com_nota" as const, credito: "LIBERADO" },
    ]
    const filtradas = filtrarLinhasFaturamento(linhas, { ...filtroFaturamentoInicial(), situacao: "sem_nota" })
    expect(filtradas.map((l) => l.pedidoId)).toEqual([1])
  })

  it("mapeia crédito sem inventar vencimento", () => {
    expect(rotuloCredito("LIBERADO").tom).toBe("success")
    expect(rotuloCredito(null).rotulo).toBe("Sem status")
  })

  it("monta composição por credit_status", () => {
    const { total, fatias } = composicaoCredito([
      fatura({ id: 1, pedidoId: 1, creditStatus: "A" }),
      fatura({ id: 2, pedidoId: 2, creditStatus: "A" }),
      fatura({ id: 3, pedidoId: 3, creditStatus: "B" }),
    ])
    expect(total).toBe(3)
    expect(fatias[0]?.rotulo).toBe("A")
  })
})
