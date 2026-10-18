import { describe, expect, it } from "vitest"
import {
  agruparExecucoesPorFonte,
  cadenciaTexto,
  deveContinuar,
  diaCalendarioSp,
  duracaoLegivel,
  intervaloDiaColeta,
  leituraFechaComApi,
  modoPedidos,
  percentualColeta,
  precisaRodarHoje,
  proximoPassoFonte,
  significadoQuantidade,
  statusDiaFonte,
  validarDiaColeta,
} from "./coleta"

describe("fila da coleta", () => {
  it("para a fonte seguinte quando a anterior falha", () => {
    expect(deveContinuar("failed")).toBe(false)
    expect(deveContinuar("succeeded")).toBe(true)
    expect(deveContinuar(null)).toBe(true)
  })
})

describe("total da API", () => {
  it("só fecha quando a leitura tem o mesmo tamanho que a API informa", () => {
    expect(leituraFechaComApi(1787, 1787)).toBe(true)
    expect(leituraFechaComApi(1786, 1787)).toBe(false)
  })
})

describe("percentual da coleta", () => {
  it("usa a coleta anterior como tamanho esperado", () => {
    expect(percentualColeta(500, 1000, "running")).toBe(50)
    expect(percentualColeta(1000, 1000, "running")).toBe(99)
    expect(percentualColeta(1787, 1787, "succeeded")).toBe(100)
  })

  it("não inventa percentual na primeira execução", () => {
    expect(percentualColeta(12, null, "running")).toBeNull()
    expect(percentualColeta(12, 0, "running")).toBeNull()
  })
})

describe("agenda diária", () => {
  const hoje = "2026-10-18"

  it("marca pendente quando a última sucesso foi ontem", () => {
    expect(precisaRodarHoje("2026-10-17T23:00:00.000Z", hoje)).toBe(true)
    expect(precisaRodarHoje("2026-10-18T15:00:00.000Z", hoje)).toBe(false)
    expect(precisaRodarHoje(null, hoje)).toBe(true)
  })

  it("diferencia carga inicial e incremental de pedidos", () => {
    expect(modoPedidos(null)).toBe("inicial")
    expect(modoPedidos("2026-10-17T12:00:00.000Z")).toBe("incremental")
  })

  it("resume status do dia e próximo passo", () => {
    expect(statusDiaFonte({ ultimaTentativa: { status: "succeeded" }, ultimaSucessoEm: "2026-10-18T12:00:00.000Z", hojeSp: hoje, naFila: false })).toBe("ok")
    expect(statusDiaFonte({ ultimaTentativa: { status: "running" }, ultimaSucessoEm: null, hojeSp: hoje, naFila: false })).toBe("rodando")
    expect(
      proximoPassoFonte({
        fonte: "orders_full",
        posicao: 1,
        posicaoRodando: null,
        statusDia: "sem_execucao",
        modoPedidos: "inicial",
        pipelineFalhou: false,
      }),
    ).toContain("carga cheia")
  })

  it("explica quantity por fonte", () => {
    expect(significadoQuantidade("bi_orders")).toContain("atualizados")
    expect(cadenciaTexto("daily", "invoices")).toContain("completa")
  })

  it("formata duração", () => {
    expect(duracaoLegivel("2026-10-18T12:00:00.000Z", "2026-10-18T12:01:05.000Z")).toBe("1min 5s")
    expect(diaCalendarioSp("2026-10-18T02:30:00.000Z")).toMatch(/2026-10-1[78]/)
  })

  it("intervalo do dia de coleta segue São Paulo", () => {
    expect(intervaloDiaColeta("2026-10-18")).toEqual({
      desde: "2026-10-18T03:00:00.000Z",
      ate: "2026-10-19T03:00:00.000Z",
    })
  })

  it("valida filtro de dia", () => {
    const hoje = "2026-10-18"
    expect(validarDiaColeta(undefined, hoje)).toBe(hoje)
    expect(validarDiaColeta("2026-10-17", hoje)).toBe("2026-10-17")
    expect(validarDiaColeta("todos", hoje)).toBeNull()
    expect(validarDiaColeta("invalid", hoje)).toBe(hoje)
  })

  it("agrupa execuções por fonte em ordem decrescente de id", () => {
    const mapa = agruparExecucoesPorFonte([
      { id: 2, source: "orders_full" },
      { id: 5, source: "orders_full" },
      { id: 3, source: "invoices" },
    ])
    expect(mapa.get("orders_full")?.map((item) => item.id)).toEqual([5, 2])
    expect(mapa.get("invoices")?.map((item) => item.id)).toEqual([3])
    expect(mapa.get("pendency_list")).toEqual([])
  })
})
