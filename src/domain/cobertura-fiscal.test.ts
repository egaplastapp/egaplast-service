import {
  bucketPertenceMesFoco,
  calcularCoberturaFiscal,
  faturadoNoMesFoco,
} from "@/domain/cobertura-fiscal"
import type { ResumoPainel } from "@/domain/painel"
import { describe, expect, it } from "vitest"

function resumo(parcial: Partial<ResumoPainel>): ResumoPainel {
  return {
    mes: "2026-10",
    pedidos: { atual: 0, anterior: 0, variacao: null },
    valor: { atual: 1000, anterior: 0, variacao: null },
    notas: { atual: 2, anterior: 0, variacao: null },
    integracao: { total: 0, comNumero: 0, comRecusa: 0, semNumero: 0, percentual: null },
    porMes: [{ mes: "2026-10", quantidade: 1, valor: 1000, faturado: 400 }],
    recusas: { atual: 0, anterior: 0, variacao: null },
    porUf: [],
    ultimos: [],
    semData: 0,
    ...parcial,
  }
}

describe("calcularCoberturaFiscal", () => {
  it("calcula gap e percentual no mês", () => {
    const c = calcularCoberturaFiscal(resumo({}))
    expect(c.valorPedidos).toBe(1000)
    expect(c.valorFaturado).toBe(400)
    expect(c.gapValor).toBe(600)
    expect(c.coberturaPercentual).toBe(40)
  })

  it("ignora faturamento de outros meses na série 12m", () => {
    const base = resumo({
      porMes: [
        { mes: "2026-09", quantidade: 1, valor: 500, faturado: 900 },
        { mes: "2026-10", quantidade: 1, valor: 1000, faturado: 400 },
        { mes: "2026-11", quantidade: 0, valor: 0, faturado: 200 },
      ],
    })
    expect(faturadoNoMesFoco(base)).toBe(400)
    expect(calcularCoberturaFiscal(base).valorFaturado).toBe(400)
  })

  it("soma semanas do mês foco", () => {
    expect(bucketPertenceMesFoco("2026-10-S2", "2026-10")).toBe(true)
    expect(bucketPertenceMesFoco("2026-09-S4", "2026-10")).toBe(false)
    const base = resumo({
      porMes: [
        { mes: "2026-10-S1", quantidade: 0, valor: 0, faturado: 100 },
        { mes: "2026-10-S2", quantidade: 0, valor: 0, faturado: 250 },
        { mes: "2026-09-S5", quantidade: 0, valor: 0, faturado: 999 },
      ],
    })
    expect(faturadoNoMesFoco(base)).toBe(350)
  })
})
