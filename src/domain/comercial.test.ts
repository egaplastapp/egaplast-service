import { describe, expect, it } from "vitest"
import { comercialDoPayload, fechaValores, impostosDoItem, ordemDosItens, ordenarItens, previsaoExibivel, valorItemNota } from "./comercial"

describe("comercialDoPayload", () => {
  it("lê condição, totais, parcelas e entrega sem inventar campo", () => {
    const comercial = comercialDoPayload({
      price_table_id_order: "FKN SUL",
      obs: "30% NF",
      commission: "12.27",
      commission_percentage: 1.79,
      value_mer: 683.68,
      st_total: 129.31,
      ipi_total: 15.11,
      shipping_cost: 0,
      freight_text: "",
      weight: 6.084,
      net_weight: 0,
      cubage: 0,
      transport_company: null,
      payment_term: {
        parcelas: [
          { parcela: 1, term: "28", valor: 414.05 },
          { parcela: 2, term: "42", valor: 414.05 },
        ],
      },
      address_street_delivery: "Rua A",
      address_number_delivery: "10",
      address_city_delivery: "Caxias do Sul",
      address_state_delivery: "RS",
      address_zipcode_delivery: "95020000",
    })

    expect(comercial.tabela).toBe("FKN SUL")
    expect(comercial.comissao).toBe(12.27)
    expect(comercial.frete).toBe(0)
    expect(comercial.freteTexto).toBeNull()
    expect(comercial.transportadora).toBeNull()
    expect(comercial.parcelas).toEqual([
      { numero: 1, prazo: "28", valor: 414.05 },
      { numero: 2, prazo: "42", valor: 414.05 },
    ])
    expect(comercial.entrega.cidade).toBe("Caxias do Sul")
    expect(comercial.entrega.cep).toBe("95020000")
  })

  it("aceita transportadora como objeto e payload vazio", () => {
    expect(comercialDoPayload({ transport_company: { name: "EGAPLAST" } }).transportadora).toBe("EGAPLAST")
    expect(comercialDoPayload(null).mercadoria).toBeNull()
    expect(comercialDoPayload(null).parcelas).toEqual([])
  })
})

describe("itens", () => {
  it("guarda a ordem do array products e os impostos da linha", () => {
    const payload = { products: [{ id: 30 }, { id: "10" }, { id: null }] }
    expect(ordemDosItens(payload)).toEqual([30, 10])
    expect(ordenarItens([{ id: 10 }, { id: 99 }, { id: 30 }], ordemDosItens(payload)).map((item) => item.id)).toEqual([30, 10, 99])
    expect(valorItemNota({ item_value: "37.02", gross_value: "296.16", net_value: 0, item_net_value: 0 })).toEqual({
      unitario: 37.02,
      total: 296.16,
    })
    expect(impostosDoItem({ ipi_value: "1.25", st_value: 3.4, discount_percentage: 15, stock_place_code: "01" })).toEqual({
      descontoPercentual: 15,
      icms: null,
      ipi: 1.25,
      substituicao: 3.4,
      deposito: "01",
    })
  })
})

describe("previsaoExibivel", () => {
  it("esconde a sentinela de 1899 e mantém o dia de calendário", () => {
    expect(previsaoExibivel("1899-11-30T00:00:00.000Z")).toBeNull()
    expect(previsaoExibivel("2026-05-04T00:00:00.000Z")).toBe("04/05/2026")
    expect(previsaoExibivel("a combinar")).toBe("a combinar")
    expect(previsaoExibivel(null)).toBeNull()
  })
})

describe("fechaValores", () => {
  it("fecha quando mercadoria, impostos e frete batem com o valor final", () => {
    expect(fechaValores({ mercadoria: 683.68, substituicao: 129.31, ipi: 15.11, frete: 0, valorFinal: 828.1 })).toBe(0)
    expect(fechaValores({ mercadoria: 100, substituicao: 0, ipi: 0, frete: 0, valorFinal: 90 })).toBe(10)
    expect(fechaValores({ mercadoria: null, substituicao: 0, ipi: 0, frete: 0, valorFinal: 0 })).toBeNull()
  })
})
