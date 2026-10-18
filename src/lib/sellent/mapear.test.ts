import { describe, expect, it } from "vitest"
import { mapearFatura, mapearPedido } from "./mapear"

describe("mapearPedido", () => {
  it("separa recusa de ERP e guarda o documento bruto", () => {
    const mapeado = mapearPedido({
      id: 10,
      code: 5501,
      erp_id: "Forma de pagamento não cadastrado",
      is_integrated: 1,
      is_canceled: 0,
      updated_at: "2026-10-16 18:06:50",
      amount_final: 1500.5,
      buyer_name: "Cliente Teste",
      sales_office: "Brasília",
      status: { id: 14162, code: "0101", name: "APROVADO", color: "#fff" },
      store: { id: 7, erp_id: "C10", name: "Loja", doc_number: "000", segment_id: 3, segment_code: "AT" },
      seller: { id: 4, code: "V1", name: "Vendedor" },
      products: [
        { id: 90, product_id: 8, code: "SKU-1", name: "Mecanismo", quantity: 2, unit_price: 10, total_price: 20, measure_unit: "UN" },
      ],
      contacts: [{ id: 5, name: "Contato", email_1: "a@b.c", phone_1: "61" }],
    })
    expect(mapeado?.order.erp_number).toBeNull()
    expect(mapeado?.order.erp_rejection).toBe("Forma de pagamento não cadastrado")
    expect(mapeado?.order.sales_office).toBe("Brasília")
    expect(mapeado?.order.updated_at).toBe("2026-10-16T18:06:50.000Z")
    expect(mapeado?.items).toHaveLength(1)
    expect(mapeado?.products[0]?.id).toBe(8)
    expect(mapeado?.customers[0]?.segment_id).toBe(3)
    expect(mapeado?.contacts[0]?.email).toBe("a@b.c")
    expect(mapeado?.order.payload.id).toBe(10)
  })

  it("ignora payload sem id", () => {
    expect(mapearPedido({ code: 1 })).toBeNull()
  })
})

describe("mapearFatura", () => {
  it("guarda order_id e o número do ERP do prefixo da key", () => {
    const fatura = mapearFatura({
      id: 21582089,
      key: "203430_27802",
      order_id: 35325752,
      date: "2026-10-15",
      invoice_number: 27802,
      value: 10,
      items: [{ id: 1, qty: 2, net_value: 5, product: { name: "Peca" } }],
    })
    expect(fatura?.order_id).toBe(35325752)
    expect(fatura?.key).toBe("203430_27802")
    expect(fatura?.erp_number).toBe("203430")
    expect(fatura?.payload.order_id).toBe(35325752)
    expect(fatura?.payload.items).toBeUndefined()
    expect(fatura?.items[0]?.invoice_id).toBe(21582089)
  })
})
