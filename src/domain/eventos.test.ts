import { describe, expect, it } from "vitest"
import { diferencas, type FotoPedido } from "./eventos"

const foto: FotoPedido = {
  statusId: 1,
  erpNumero: null,
  erpRecusa: null,
  cancelado: false,
  valor: 10,
}

describe("diferencas", () => {
  it("marca pedido novo sem inventar status anterior", () => {
    expect(diferencas(null, foto)).toEqual([{ campo: "created", anterior: null, novo: "sim" }])
  })

  it("só registra campo que mudou", () => {
    expect(diferencas(foto, { ...foto, statusId: 2, valor: 10 })).toEqual([
      { campo: "status_id", anterior: "1", novo: "2" },
    ])
  })

  it("não gera evento quando a foto é a mesma", () => {
    expect(diferencas(foto, { ...foto })).toEqual([])
  })
})
