import { describe, expect, it } from "vitest"
import { classificarErpId } from "./erp"

describe("classificarErpId", () => {
  it("separa número de 5 a 7 dígitos", () => {
    expect(classificarErpId("203245")).toEqual({ erpNumero: "203245", erpRecusa: null })
    expect(classificarErpId(" 1234567 ")).toEqual({ erpNumero: "1234567", erpRecusa: null })
    expect(classificarErpId(20324)).toEqual({ erpNumero: "20324", erpRecusa: null })
  })

  it("guarda mensagem de recusa fora do número", () => {
    expect(classificarErpId("Portador não cadastrado")).toEqual({
      erpNumero: null,
      erpRecusa: "Portador não cadastrado",
    })
    expect(classificarErpId("1234")).toEqual({ erpNumero: null, erpRecusa: "1234" })
  })

  it("trata vazio como ausência", () => {
    expect(classificarErpId(null)).toEqual({ erpNumero: null, erpRecusa: null })
    expect(classificarErpId("")).toEqual({ erpNumero: null, erpRecusa: null })
    expect(classificarErpId("  ")).toEqual({ erpNumero: null, erpRecusa: null })
  })
})
