import { describe, expect, it } from "vitest"
import { PARADO_MS, type PedidoLista } from "./pedidos"
import {
  configPainel,
  deslocarMes,
  detalharBucket,
  filaOperacional,
  mesesAte,
  porSemestre,
  porTrimestre,
  resumirPainel,
  rotuloMes,
  sinaisPainel,
  variacao,
} from "./painel"

function pedido(parcial: Partial<PedidoLista> & Pick<PedidoLista, "id">): PedidoLista {
  return {
    codigo: String(parcial.id),
    erpNumero: null,
    erpRecusa: null,
    valor: 100,
    cancelado: false,
    apagadoEm: null,
    atualizadoEm: "2026-10-18T12:00:00.000Z",
    dataPedido: "2026-10-10T15:00:00.000Z",
    uf: "SP",
    cliente: "Cliente",
    status: "APROVADO",
    corStatus: "#0785c5",
    loja: "Loja",
    vendedor: "Ana",
    ...parcial,
  }
}

const hoje = new Date("2026-10-18T15:00:00.000Z")

describe("variação e meses", () => {
  it("não calcula variação sem base no mês anterior", () => {
    expect(variacao(10, 0)).toBeNull()
    expect(variacao(110, 100)).toBe(10)
    expect(variacao(80, 100)).toBe(-20)
  })

  it("desloca o mês virando o ano", () => {
    expect(deslocarMes("2026-01", -1)).toBe("2025-12")
    expect(deslocarMes("2025-12", 1)).toBe("2026-01")
  })

  it("lista os 12 meses que terminam no atual", () => {
    expect(mesesAte("2026-10", 12)[0]).toBe("2025-11")
    expect(mesesAte("2026-10", 12).at(-1)).toBe("2026-10")
  })

  it("rotula o mês em português curto", () => {
    expect(rotuloMes("2026-10")).toBe("out/26")
  })
})

describe("resumirPainel", () => {
  it("recorte pelo fuso de São Paulo, ignora apagado e conta cancelado", () => {
    const resumo = resumirPainel(
      [
        pedido({ id: 1, dataPedido: "2026-10-01T03:00:00.000Z", valor: 200, erpNumero: "1" }),
        pedido({ id: 2, dataPedido: "2026-10-01T02:00:00.000Z", valor: 50, uf: "RJ" }),
        pedido({ id: 3, dataPedido: "2026-09-15T15:00:00.000Z", valor: 80, erpRecusa: "recusa" }),
        pedido({ id: 4, dataPedido: "2026-10-05T15:00:00.000Z", valor: 30, cancelado: true }),
        pedido({ id: 5, dataPedido: "2026-10-05T15:00:00.000Z", valor: 999, apagadoEm: "2026-10-06T12:00:00.000Z" }),
        pedido({ id: 6, dataPedido: null, valor: 10 }),
      ],
      [
        { data: "2026-10-12", valor: 150 },
        { data: "2026-09-02", valor: 40 },
      ],
      hoje,
    )

    expect(resumo.mes).toBe("2026-10")
    expect(resumo.semData).toBe(1)
    expect(resumo.pedidos.atual).toBe(2)
    expect(resumo.pedidos.anterior).toBe(2)
    expect(resumo.valor.atual).toBe(230)
    expect(resumo.valor.anterior).toBe(130)
    expect(resumo.notas.atual).toBe(1)
    expect(resumo.notas.anterior).toBe(1)
    expect(resumo.recusas.atual).toBe(0)
    expect(resumo.recusas.anterior).toBe(1)
    expect(resumo.pedidos.variacao).toBe(0)
    expect(resumo.porUf.map((item) => item.uf)).toEqual(["SP"])
    expect(resumo.ultimos.map((item) => item.id)).toEqual([4, 1, 2, 3])
  })

  it("integração ao ERP no mês corrente", () => {
    const resumo = resumirPainel(
      [
        pedido({ id: 1, erpNumero: "203201" }),
        pedido({ id: 2, erpNumero: "203202" }),
        pedido({ id: 3, erpRecusa: "portador" }),
        pedido({ id: 4 }),
      ],
      [],
      hoje,
    )
    expect(resumo.integracao).toEqual({
      total: 4,
      comNumero: 2,
      comRecusa: 1,
      semNumero: 1,
      percentual: 50,
    })
  })

  it("soma o faturado no mês da série", () => {
    const resumo = resumirPainel(
      [pedido({ id: 1, dataPedido: "2026-10-10T15:00:00.000Z", valor: 100 })],
      [{ data: "2026-10-11", valor: 80 }],
      hoje,
    )
    expect(resumo.porMes.at(-1)).toMatchObject({ mes: "2026-10", quantidade: 1, valor: 100, faturado: 80 })
  })
})

describe("configPainel", () => {
  it("usa o mês atual por padrão com comparação no mês anterior", () => {
    const cfg = configPainel({}, hoje)
    expect(cfg.vista).toBe("mes")
    expect(cfg.bucketTipo).toBe("semana")
    expect(cfg.intervalo).toEqual({ desde: "2026-09-01", ate: "2026-11-01" })
  })

  it("mantém vista 12 meses quando explícita", () => {
    const cfg = configPainel({ vista: "12m" }, hoje)
    expect(cfg.vista).toBe("12m")
    expect(cfg.intervalo.desde).toBe("2025-11-01")
  })

  it("recorta um mês com comparação no mês anterior", () => {
    const cfg = configPainel({ mes: "2026-10" }, hoje)
    expect(cfg.bucketTipo).toBe("semana")
    expect(cfg.intervalo).toEqual({ desde: "2026-09-01", ate: "2026-11-01" })
  })
})

describe("porTrimestre", () => {
  it("agrupa os meses e aceita trimestre incompleto nas pontas", () => {
    const trimestres = porTrimestre([
      { mes: "2025-11", quantidade: 1, valor: 10, faturado: 5 },
      { mes: "2025-12", quantidade: 1, valor: 10, faturado: 5 },
      { mes: "2026-01", quantidade: 2, valor: 20, faturado: 8 },
    ])
    expect(trimestres[0]).toEqual({ mes: "T4/25", quantidade: 2, valor: 20, faturado: 10 })
    expect(trimestres[1]).toEqual({ mes: "T1/26", quantidade: 2, valor: 20, faturado: 8 })
  })
})

describe("detalharBucket e sinais", () => {
  it("marca alerta quando faturamento cobre pouco do valor", () => {
    const detalhe = detalharBucket({ mes: "2026-10", quantidade: 10, valor: 1000, faturado: 400 }, undefined)
    expect(detalhe.alerta).toBe("critico")
    expect(detalhe.taxaFaturamento).toBe(40)
  })

  it("gera sinal crítico de ERP baixo", () => {
    const resumo = resumirPainel(
      Array.from({ length: 10 }, (_, i) => pedido({ id: i + 1, erpNumero: i < 3 ? "1" : null })),
      [],
      hoje,
    )
    const critico = sinaisPainel(resumo).find((s) => s.nivel === "critico")
    expect(critico?.titulo).toMatch(/ERP/)
  })

  it("não alerta queda de pedidos fora da vista mês", () => {
    const resumo = resumirPainel([pedido({ id: 1 }), pedido({ id: 2, dataPedido: "2026-09-01T12:00:00.000Z" })], [], hoje)
    resumo.pedidos = { atual: 1, anterior: 10, variacao: -90 }
    const sinais = sinaisPainel(resumo, "12m")
    expect(sinais.some((s) => s.titulo.includes("Queda"))).toBe(false)
  })
})

describe("filaOperacional", () => {
  it("monta chips com links para pedidos no mês", () => {
    const agora = hoje.getTime()
    const recente = new Date(agora - 60_000).toISOString()
    const parado = pedido({
      id: 10,
      atualizadoEm: new Date(agora - PARADO_MS - 60_000).toISOString(),
      erpRecusa: "x",
    })
    const resumo = resumirPainel([parado, pedido({ id: 11, atualizadoEm: recente })], [], hoje)
    const fila = filaOperacional([parado, pedido({ id: 11, atualizadoEm: recente })], "2026-10", resumo)
    expect(fila.some((item) => item.id === "recusa" && item.href.includes("recusa=1") && item.href.includes("vista=completa"))).toBe(true)
    expect(fila.some((item) => item.id === "parados")).toBe(false)
    const varios = filaOperacional(
      [
        parado,
        pedido({ id: 11, atualizadoEm: recente }),
        pedido({ id: 12, atualizadoEm: recente }),
        pedido({ id: 13, atualizadoEm: recente }),
      ],
      "2026-10",
      resumo,
    )
    expect(varios.some((item) => item.id === "parados" && item.href.includes("parados=1") && item.href.includes("vista=completa"))).toBe(true)
  })
})

describe("porSemestre", () => {
  it("agrupa meses em S1 e S2", () => {
    const partes = porSemestre([
      { mes: "2026-02", quantidade: 1, valor: 10, faturado: 5 },
      { mes: "2026-08", quantidade: 2, valor: 20, faturado: 8 },
    ])
    expect(partes).toEqual([
      { mes: "S1/26", quantidade: 1, valor: 10, faturado: 5 },
      { mes: "S2/26", quantidade: 2, valor: 20, faturado: 8 },
    ])
  })
})
