const DIA = /^\d{4}-\d{2}-\d{2}$/

export type RecortePedidosUrl =
  | { tipo: "padrao" }
  | { tipo: "data_pedido"; de: string; ate: string }
  | { tipo: "movimento"; desde: string; ate: string | null; coletaExecId: number | null }

export function diaHojeSp(agora = new Date()) {
  return agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
}

export function interpretarRecortePedidos(params: URLSearchParams): RecortePedidosUrl {
  if (params.get("recorte") === "movimento") {
    const execBruto = params.get("coleta_exec")
    const execId = execBruto ? Number(execBruto) : NaN
    return {
      tipo: "movimento",
      desde: "",
      ate: null,
      coletaExecId: Number.isFinite(execId) ? execId : null,
    }
  }
  const de = params.get("de") ?? ""
  const ate = params.get("ate") ?? ""
  if (DIA.test(de) && DIA.test(ate)) return { tipo: "data_pedido", de, ate }
  return { tipo: "padrao" }
}

export function hrefPedidosHoje(hoje = diaHojeSp()) {
  const params = new URLSearchParams({ de: hoje, ate: hoje, vista: "completa" })
  return `/pedidos?${params}`
}

export function hrefPedidosMovimentoDesdeColeta() {
  const params = new URLSearchParams({
    recorte: "movimento",
    desde_coleta: "1",
    vista: "completa",
  })
  return `/pedidos?${params}`
}

export function hrefPedidosMovimentoExecucao(execucaoId: number) {
  const params = new URLSearchParams({
    recorte: "movimento",
    coleta_exec: String(execucaoId),
    vista: "completa",
  })
  return `/pedidos?${params}`
}

export function recorteAtivo(recorte: RecortePedidosUrl) {
  return recorte.tipo !== "padrao"
}
