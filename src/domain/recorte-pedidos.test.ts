import {
  hrefPedidosHoje,
  hrefPedidosMovimentoDesdeColeta,
  hrefPedidosMovimentoExecucao,
  interpretarRecortePedidos,
  recorteAtivo,
} from "@/domain/recorte-pedidos"
import { describe, expect, it } from "vitest"

describe("interpretarRecortePedidos", () => {
  it("detecta movimento e execução", () => {
    const params = new URLSearchParams("recorte=movimento&coleta_exec=42")
    expect(interpretarRecortePedidos(params)).toEqual({
      tipo: "movimento",
      desde: "",
      ate: null,
      coletaExecId: 42,
    })
  })

  it("detecta intervalo de data do pedido", () => {
    const params = new URLSearchParams("de=2026-10-18&ate=2026-10-18")
    expect(interpretarRecortePedidos(params)).toEqual({
      tipo: "data_pedido",
      de: "2026-10-18",
      ate: "2026-10-18",
    })
  })
})

describe("href helpers", () => {
  it("monta URLs estáveis", () => {
    expect(hrefPedidosHoje("2026-10-18")).toBe("/pedidos?de=2026-10-18&ate=2026-10-18&vista=completa")
    expect(hrefPedidosMovimentoDesdeColeta()).toContain("recorte=movimento")
    expect(hrefPedidosMovimentoExecucao(9)).toBe("/pedidos?recorte=movimento&coleta_exec=9&vista=completa")
  })
})

describe("recorteAtivo", () => {
  it("marca recortes especiais", () => {
    expect(recorteAtivo({ tipo: "padrao" })).toBe(false)
    expect(recorteAtivo({ tipo: "data_pedido", de: "2026-01-01", ate: "2026-01-01" })).toBe(true)
  })
})
