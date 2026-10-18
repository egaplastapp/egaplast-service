import { diaDentroDoFiltroUi, intervaloSqlDeFiltroUi } from "@/domain/intervalo-datas"
import { describe, expect, it } from "vitest"

describe("intervalo-datas", () => {
  it("filtro UI inclusivo nos dois extremos", () => {
    expect(diaDentroDoFiltroUi("2026-10-01", "2026-10-01", "2026-10-31")).toBe(true)
    expect(diaDentroDoFiltroUi("2026-10-31", "2026-10-01", "2026-10-31")).toBe(true)
    expect(diaDentroDoFiltroUi("2026-09-30", "2026-10-01", "2026-10-31")).toBe(false)
  })

  it("converte para SQL com ate exclusivo", () => {
    expect(intervaloSqlDeFiltroUi("2026-10-01", "2026-10-31")).toEqual({
      desde: "2026-10-01",
      ate: "2026-11-01",
    })
  })
})
