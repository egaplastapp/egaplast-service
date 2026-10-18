import { montarPassosRastreabilidade } from "@/domain/rastreabilidade"
import { describe, expect, it } from "vitest"

describe("montarPassosRastreabilidade", () => {
  it("marca alerta quando faturado sem nota", () => {
    const passos = montarPassosRastreabilidade({
      statusSellent: "INVOICE-ATIVO",
      erpNumero: "203430",
      erpRecusa: null,
      temNota: false,
      temOperacaoInterna: false,
    })
    const nota = passos.find((p) => p.id === "nota")
    expect(nota?.estado).toBe("alerta")
    expect(passos.find((p) => p.id === "sifn")?.estado).toBe("desconhecido")
  })
})
