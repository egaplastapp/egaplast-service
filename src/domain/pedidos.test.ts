import { describe, expect, it } from "vitest"
import {
  COR_MARCA,
  buscaDoFiltro,
  buscaLista,
  corLegivel,
  distribuicaoStatus,
  filtrarPedidos,
  contagensExcecaoPedidos,
  filasExcecaoPedidos,
  filtroDaBusca,
  aplicarLimiteVista,
  filtroEntradaPedidos,
  filtroInicial,
  filtroNegocioAtivo,
  motivosFilaPedido,
  rotuloFiltroPedidos,
  statusAnaliseNoRecorte,
  statusEmAnaliseNome,
  vistaDaBusca,
  fromParaDetalhe,
  selDaBusca,
  vizinhosLista,
  voltarPedidosUrl,
  type PedidoLista,
} from "./pedidos"

function pedido(parcial: Partial<PedidoLista> & Pick<PedidoLista, "id">): PedidoLista {
  return {
    codigo: null,
    erpNumero: null,
    erpRecusa: null,
    valor: null,
    cancelado: false,
    apagadoEm: null,
    atualizadoEm: null,
    dataPedido: null,
    uf: null,
    cliente: null,
    status: null,
    corStatus: null,
    loja: null,
    vendedor: null,
    ...parcial,
  }
}

const base = [
  pedido({
    id: 1,
    codigo: "4501",
    erpNumero: "203201",
    valor: 100,
    atualizadoEm: "2026-10-02T12:00:00.000Z",
    dataPedido: "2026-05-10T15:00:00.000Z",
    cliente: "João Mendes",
    loja: "Casa Azul",
    status: "APROVADO",
    uf: "SP",
    vendedor: "Ana",
  }),
  pedido({
    id: 2,
    codigo: "4502",
    erpRecusa: "Portador não cadastrado",
    valor: 50,
    cancelado: true,
    atualizadoEm: "2026-10-03T12:00:00.000Z",
    dataPedido: "2026-05-09T15:00:00.000Z",
    cliente: "Maria",
    loja: "Loja Norte",
    status: "REPROVADO",
    uf: "rj",
    vendedor: "Bruno",
  }),
  pedido({
    id: 3,
    codigo: "4503",
    valor: null,
    apagadoEm: "2026-08-01T12:00:00.000Z",
    atualizadoEm: "2026-08-01T12:00:00.000Z",
    dataPedido: "2026-05-10T02:30:00.000Z",
    cliente: "João Mendes",
    status: "APROVADO",
    vendedor: "Ana",
  }),
]

describe("filtro de pedidos", () => {
  it("soma o recorte vazio sem ticket", () => {
    const recorte = filtrarPedidos([], filtroInicial())
    expect(recorte.linhas).toEqual([])
    expect(recorte.totais).toEqual({ quantidade: 0, soma: 0, ticket: null, comErp: 0, comRecusa: 0 })
  })

  it("deixa os apagados de fora e soma valor, ERP e recusa do que ficou", () => {
    const recorte = filtrarPedidos(base, filtroInicial())
    expect(recorte.linhas.map((linha) => linha.id)).toEqual([2, 1])
    expect(recorte.totais).toEqual({ quantidade: 2, soma: 150, ticket: 75, comErp: 1, comRecusa: 1 })
  })

  it("acha número, ERP, cliente e loja sem acento, e ignora vendedor no texto", () => {
    expect(filtrarPedidos(base, { ...filtroInicial(), texto: "4501" }).linhas.map((l) => l.id)).toEqual([1])
    expect(filtrarPedidos(base, { ...filtroInicial(), texto: "203201" }).linhas.map((l) => l.id)).toEqual([1])
    expect(filtrarPedidos(base, { ...filtroInicial(), texto: "joao" }).linhas.map((l) => l.id)).toEqual([1])
    expect(filtrarPedidos(base, { ...filtroInicial(), texto: "norte" }).linhas.map((l) => l.id)).toEqual([2])
    expect(filtrarPedidos(base, { ...filtroInicial(), texto: "bruno" }).linhas).toEqual([])
  })

  it("aceita vários status e mantém a distribuição dos demais filtros", () => {
    const filtro = { ...filtroInicial(), status: ["APROVADO", "REPROVADO"] }
    expect(filtrarPedidos(base, filtro).linhas.map((l) => l.id)).toEqual([2, 1])
    const soAprovado = filtrarPedidos(base, { ...filtroInicial(), status: ["APROVADO"] })
    expect(soAprovado.linhas.map((l) => l.id)).toEqual([1])
    expect(soAprovado.totais.soma).toBe(100)
    expect(distribuicaoStatus(base, { ...filtroInicial(), status: ["APROVADO"] }).map((item) => [item.nome, item.quantidade])).toEqual([
      ["APROVADO", 1],
      ["REPROVADO", 1],
    ])
  })

  it("inclui apagados, restringe cancelados e recusa, e trata valor ausente como zero na média", () => {
    expect(filtrarPedidos(base, { ...filtroInicial(), incluirApagados: true }).linhas.map((l) => l.id)).toEqual([2, 1, 3])
    expect(filtrarPedidos(base, { ...filtroInicial(), soCancelados: true }).linhas.map((l) => l.id)).toEqual([2])
    expect(filtrarPedidos(base, { ...filtroInicial(), soRecusa: true }).linhas.map((l) => l.id)).toEqual([2])
    expect(
      filtrarPedidos(
        [pedido({ id: 20, erpNumero: null }), pedido({ id: 21, erpNumero: "1" }), pedido({ id: 22, erpRecusa: "x" })],
        { ...filtroInicial(), semErp: true },
      ).linhas.map((l) => l.id),
    ).toEqual([20])
    const comNulo = filtrarPedidos(
      [pedido({ id: 1, valor: 30 }), pedido({ id: 2, valor: null })],
      { ...filtroInicial(), incluirApagados: true },
    )
    expect(comNulo.totais).toMatchObject({ quantidade: 2, soma: 30, ticket: 15 })
  })

  it("recorta o período pelo dia em São Paulo e exclui pedido sem data", () => {
    const noDia = filtrarPedidos(base, { ...filtroInicial(), de: "2026-05-10", ate: "2026-05-10" })
    expect(noDia.linhas.map((l) => l.id)).toEqual([1])
    const vespera = filtrarPedidos(base, { ...filtroInicial(), de: "2026-05-09", ate: "2026-05-09" })
    expect(vespera.linhas.map((l) => l.id)).toEqual([2])
    const madrugadaUtc = pedido({ id: 8, dataPedido: "2026-05-10T02:30:00.000Z" })
    expect(filtrarPedidos([madrugadaUtc], { ...filtroInicial(), de: "2026-05-10", ate: "2026-05-10" }).linhas).toEqual([])
    expect(filtrarPedidos([madrugadaUtc], { ...filtroInicial(), de: "2026-05-09", ate: "2026-05-09" }).linhas.map((l) => l.id)).toEqual([8])
    const semData = filtrarPedidos([pedido({ id: 9, dataPedido: null })], { ...filtroInicial(), de: "2026-05-01" })
    expect(semData.linhas).toEqual([])
  })

  it("ordena valor crescente com vazio no fim e não mexe na lista original", () => {
    const lista = [
      pedido({ id: 1, valor: 20 }),
      pedido({ id: 2, valor: null }),
      pedido({ id: 3, valor: 10 }),
    ]
    const ids = lista.map((item) => item.id)
    const recorte = filtrarPedidos(lista, { ...filtroInicial(), ordem: "valor", direcao: "asc" })
    expect(recorte.linhas.map((l) => l.id)).toEqual([3, 1, 2])
    expect(lista.map((item) => item.id)).toEqual(ids)
  })

  it("filtra pedidos parados há mais de 4 horas", () => {
    const antigo = pedido({ id: 10, atualizadoEm: "2020-01-01T12:00:00.000Z" })
    const recente = pedido({ id: 11, atualizadoEm: new Date().toISOString() })
    expect(filtrarPedidos([antigo, recente], { ...filtroInicial(), soParados: true }).linhas.map((l) => l.id)).toEqual([10])
    expect(filtroDaBusca("?parados=1&dir=asc").soParados).toBe(true)
  })

  it("filtra vendedor e UF", () => {
    expect(filtrarPedidos(base, { ...filtroInicial(), vendedor: "Ana" }).linhas.map((l) => l.id)).toEqual([1])
    expect(filtrarPedidos(base, { ...filtroInicial(), uf: "RJ" }).linhas.map((l) => l.id)).toEqual([2])
  })

  it("guarda e recupera o filtro na busca, e troca cor clara pela marca", () => {
    const filtro = {
      ...filtroInicial(),
      texto: "4501",
      status: ["EM ANÁLISE"],
      vendedor: "Ana",
      uf: "SP",
      de: "2026-05-01",
      ate: "2026-05-31",
      incluirApagados: true,
      soCancelados: true,
      soRecusa: true,
      soParados: true,
      semErp: true,
      ordem: "codigo" as const,
      direcao: "asc" as const,
    }
    expect(filtroDaBusca(buscaDoFiltro(filtro))).toEqual(filtro)
    expect(buscaDoFiltro(filtroInicial())).toBe("")
    expect(filtroDaBusca("?de=ontem&ordem=nope")).toMatchObject({ de: "", ordem: "atualizado", direcao: "desc" })
    expect(corLegivel("#ffffff")).toBe(COR_MARCA)
    expect(corLegivel("#fff")).toBe(COR_MARCA)
    expect(corLegivel(null)).toBe(COR_MARCA)
    expect(corLegivel("azul")).toBe(COR_MARCA)
    expect(corLegivel("#111111")).toBe("#111111")
  })

  it("preserva sel na busca e decodifica voltar do detalhe", () => {
    const filtro = { ...filtroInicial(), texto: "4501" }
    expect(buscaLista(filtro, 99)).toBe("?q=4501&sel=99")
    expect(selDaBusca("?q=4501&sel=99")).toBe(99)
    const from = fromParaDetalhe("?q=4501&sel=99")
    expect(voltarPedidosUrl(from)).toBe("/pedidos?q=4501")
  })

  it("calcula vizinhos no recorte", () => {
    expect(vizinhosLista([10, 20, 30], 20)).toEqual({ indice: 1, anterior: 10, proximo: 30, total: 3 })
    expect(vizinhosLista([10, 20], 99)).toMatchObject({ indice: -1, anterior: null, proximo: null })
  })

  it("descarta filtro legado só parados na entrada da mesa", () => {
    expect(filtroEntradaPedidos("?parados=1")).toEqual(filtroInicial())
    expect(filtroEntradaPedidos("?parados=1&dir=asc")).toEqual(filtroInicial())
    expect(filtroEntradaPedidos("?pendencia=1").comPendencia).toBe(true)
    expect(filtroEntradaPedidos("?parados=1&pendencia=1").soParados).toBe(true)
  })

  it("não promove fila parados quando é maioria do carregado", () => {
    const antigo = pedido({ id: 1, atualizadoEm: "2020-01-01T12:00:00.000Z" })
    const recente = pedido({ id: 2, atualizadoEm: new Date().toISOString() })
    const contagens = contagensExcecaoPedidos([antigo, recente], {})
    expect(contagens.parados).toBe(1)
    expect(filasExcecaoPedidos(contagens, 2).some((a) => a.id === "parados")).toBe(false)
    expect(filasExcecaoPedidos({ ...contagens, parados: 4, comPendencia: 1, emAnalise: 0 }, 10).map((a) => a.id)).toEqual(["pendencia"])
  })

  it("rotula filtro ativo para o operador", () => {
    expect(rotuloFiltroPedidos(filtroInicial())).toBeNull()
    expect(rotuloFiltroPedidos({ ...filtroInicial(), comPendencia: true })).toContain("pendência")
  })

  it("vista operacional limita linhas sem filtro de negócio", () => {
    const linhas = Array.from({ length: 80 }, (_, i) => pedido({ id: i + 1 }))
    expect(aplicarLimiteVista(linhas, "operacional", false)).toHaveLength(50)
    expect(aplicarLimiteVista(linhas, "completa", false)).toHaveLength(80)
    expect(aplicarLimiteVista(linhas, "operacional", true)).toHaveLength(80)
  })

  it("serializa vista e erp na URL da mesa", () => {
    expect(vistaDaBusca("?vista=completa")).toBe("completa")
    expect(vistaDaBusca("")).toBe("operacional")
    expect(buscaLista(filtroInicial(), null, { vista: "completa", erp: "recusa" })).toBe("?vista=completa&erp=recusa")
  })

  it("status de análise vem do recorte real", () => {
    const p = pedido({ id: 1, status: "EM ANÁLISE COMERCIAL" })
    expect(statusAnaliseNoRecorte([p])).toEqual(["EM ANÁLISE COMERCIAL"])
    expect(statusEmAnaliseNome("EM ANÁLISE COMERCIAL")).toBe(true)
    expect(statusEmAnaliseNome("APROVADO")).toBe(false)
  })

  it("filtro de negócio não inclui só ordenação", () => {
    expect(filtroNegocioAtivo(filtroInicial())).toBe(false)
    expect(filtroNegocioAtivo({ ...filtroInicial(), ordem: "codigo" })).toBe(false)
    expect(filtroNegocioAtivo({ ...filtroInicial(), comPendencia: true })).toBe(true)
  })

  it("motivos na fila combinam pendência e análise", () => {
    const p = pedido({ id: 5, status: "EM ANÁLISE" })
    const ctx = { pedidosComPendencia: new Set([5]), pedidosComNota: new Set<number>() }
    expect(motivosFilaPedido(p, ctx)).toEqual(expect.arrayContaining(["pendencia", "analise"]))
  })
})
