import { describe, expect, it } from "vitest"
import { etapaFinal, pedidoProntoParaConferencia } from "./operacao"

describe("operação", () => {
  it("não fica pronto com SKU no meio ou sem trabalho", () => {
    expect(pedidoProntoParaConferencia([], "pronto_para_conferencia")).toBe(false)
    expect(pedidoProntoParaConferencia(["aguardando", "pronto_para_conferencia"], "pronto_para_conferencia")).toBe(false)
  })

  it("fica pronto quando todos os SKUs estão na última etapa", () => {
    expect(pedidoProntoParaConferencia(["pronto_para_conferencia", "pronto_para_conferencia"], "pronto_para_conferencia")).toBe(true)
  })

  it("escolhe a etapa de maior ordem", () => {
    expect(etapaFinal([
      { codigo: "aguardando", ordem: 1 },
      { codigo: "pronto_para_conferencia", ordem: 3 },
      { codigo: "em_andamento", ordem: 2 },
    ])?.codigo).toBe("pronto_para_conferencia")
  })
})
