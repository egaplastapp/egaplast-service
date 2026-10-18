import { describe, expect, it } from "vitest"
import type { PedidoLista } from "./pedidos"
import {
  agruparPorDia,
  COR_NOTA,
  diasDaVista,
  domingoDaSemana,
  deslocarVista,
  hrefCalendario,
  instanteInicio,
  interpretarData,
  interpretarVista,
  intervaloConsulta,
  montarEventos,
  rotuloPeriodo,
  totaisDoDia,
} from "./calendario"

function pedido(parcial: Partial<PedidoLista> & Pick<PedidoLista, "id">): PedidoLista {
  return {
    codigo: String(parcial.id),
    erpNumero: null,
    erpRecusa: null,
    valor: 100,
    cancelado: false,
    apagadoEm: null,
    atualizadoEm: "2026-10-18T12:00:00.000Z",
    dataPedido: "2026-10-18T15:00:00.000Z",
    uf: "SP",
    cliente: "Cliente",
    status: "APROVADO",
    corStatus: "#0785c5",
    loja: "Loja",
    vendedor: "Ana",
    ...parcial,
  }
}

describe("interpretação da URL", () => {
  it("aceita só mês, semana e dia", () => {
    expect(interpretarVista(undefined)).toBe("mes")
    expect(interpretarVista("semana")).toBe("semana")
    expect(interpretarVista("agenda")).toBe("mes")
  })

  it("rejeita data inválida", () => {
    expect(interpretarData("2026-13-02", "2026-10-18")).toBe("2026-10-18")
    expect(interpretarData("2026-10-18", "2026-10-01")).toBe("2026-10-18")
  })
})

describe("grade do mês e da semana", () => {
  it("outubro de 2026 começa no domingo 27 de setembro e tem 42 células", () => {
    expect(domingoDaSemana("2026-10-01")).toBe("2026-09-27")
    const dias = diasDaVista("mes", "2026-10-18")
    expect(dias).toHaveLength(42)
    expect(dias[0]).toBe("2026-09-27")
    expect(dias.at(-1)).toBe("2026-11-07")
  })

  it("a semana começa no domingo", () => {
    expect(diasDaVista("semana", "2026-10-14")).toEqual([
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
    ])
  })

  it("desloca mês, semana e dia", () => {
    expect(deslocarVista("mes", "2026-10-18", -1)).toBe("2026-09-01")
    expect(deslocarVista("semana", "2026-10-14", 1)).toBe("2026-10-21")
    expect(deslocarVista("dia", "2026-10-01", -1)).toBe("2026-09-30")
  })
})

describe("consulta e eventos", () => {
  it("intervalo de pedidos usa o início do dia em São Paulo", () => {
    expect(instanteInicio("2026-10-18")).toBe("2026-10-18T03:00:00.000Z")
    const intervalo = intervaloConsulta("dia", "2026-10-18")
    expect(intervalo.pedidos).toEqual({ desde: "2026-10-18T03:00:00.000Z", ate: "2026-10-19T03:00:00.000Z" })
    expect(intervalo.notas).toEqual({ desde: "2026-10-18", ate: "2026-10-19" })
  })

  it("distribui pedido e nota no dia certo e ignora apagado", () => {
    const eventos = montarEventos(
      [
        pedido({ id: 1900, codigo: "1900", valor: 4003, dataPedido: "2026-10-18T15:00:00.000Z" }),
        pedido({ id: 2, dataPedido: "2026-10-18T15:00:00.000Z", apagadoEm: "2026-10-19T12:00:00.000Z" }),
        pedido({ id: 3, dataPedido: "2026-10-01T02:00:00.000Z" }),
      ],
      [{ id: 9, pedidoId: 1900, numero: "12345", data: "2026-10-18", valor: 4003 }],
    )
    expect(eventos.map((item) => item.dia).sort()).toEqual(["2026-09-30", "2026-10-18", "2026-10-18"])
    const noDia = eventos.filter((item) => item.dia === "2026-10-18")
    expect(noDia.some((item) => item.tipo === "nota" && item.cor === COR_NOTA && item.rotulo === "NF 12345")).toBe(true)
    expect(noDia.some((item) => item.tipo === "pedido" && item.rotulo.startsWith("1900"))).toBe(true)

    const dias = agruparPorDia(["2026-10-17", "2026-10-18"], eventos, "2026-10-18", "2026-10")
    expect(dias[0].eventos).toHaveLength(0)
    expect(dias[1].hoje).toBe(true)
    expect(dias[1].eventos).toHaveLength(2)
    expect(totaisDoDia(dias[1].eventos)).toEqual({ pedidos: 1, notas: 1, valorPedidos: 4003, valorNotas: 4003 })
  })

  it("monta o href sem parâmetros padrão", () => {
    expect(hrefCalendario("mes", "2026-10-18", "2026-10-18")).toBe("/calendario")
    expect(hrefCalendario("dia", "2026-10-01", "2026-10-18")).toBe("/calendario?vista=dia&data=2026-10-01")
  })

  it("rotula o período", () => {
    expect(rotuloPeriodo("mes", "2026-10-18")).toBe("outubro de 2026")
    expect(rotuloPeriodo("dia", "2026-10-18")).toMatch(/18/)
  })
})
