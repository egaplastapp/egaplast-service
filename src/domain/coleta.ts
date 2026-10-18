import { intervaloConsulta } from "./calendario"

export const FONTES = ["orders_full", "pendency_list", "invoices", "bi_orders"] as const

export type Fonte = (typeof FONTES)[number]

export type Cadencia = "daily" | "once_then_daily"

export type ModoPedidos = "inicial" | "incremental"

export type StatusDia = "ok" | "pendente" | "falhou" | "rodando" | "na_fila" | "sem_execucao"

export function deveContinuar(statusAnterior: "succeeded" | "failed" | null) {
  return statusAnterior !== "failed"
}

export type FaseColeta = "downloading" | "staging" | "promoting"

/** Percentual visível. Sem uma coleta anterior, não inventa uma fração. */
export function leituraFechaComApi(lidos: number, totalApi: number) {
  return lidos === totalApi
}

export function percentualColeta(visto: number, esperado: number | null, status: string): number | null {
  if (status === "succeeded") return 100
  if (!esperado || esperado <= 0) return null
  const bruto = Math.round((visto / esperado) * 100)
  if (status === "running") return Math.min(99, Math.max(0, bruto))
  return Math.min(100, Math.max(0, bruto))
}

/** Dia de calendário em São Paulo, formato YYYY-MM-DD. */
export function diaCalendarioSp(iso: string | null | undefined, agora = new Date()) {
  if (iso) return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
  return agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
}

/** Limites UTC para filtrar `collections.started_at` num dia de calendário em SP. `ate` é exclusivo. */
export function intervaloDiaColeta(dia: string) {
  return intervaloConsulta("dia", dia).pedidos
}

/** `todos` = sem filtro de dia; vazio/inválido = hoje (SP). */
export function validarDiaColeta(dia: string | undefined, hojeSp: string): string | null {
  if (dia === "todos") return null
  if (dia && /^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    const [ano, mes, numero] = dia.split("-").map(Number)
    const probe = new Date(Date.UTC(ano, mes - 1, numero))
    if (probe.getUTCFullYear() === ano && probe.getUTCMonth() === mes - 1 && probe.getUTCDate() === numero) return dia
  }
  return hojeSp
}

export function agruparExecucoesPorFonte<T extends { id: number; source: string }>(
  execucoes: T[],
  ordemFontes: readonly string[] = FONTES,
) {
  const mapa = new Map<string, T[]>()
  for (const fonte of ordemFontes) mapa.set(fonte, [])
  for (const item of execucoes) {
    const lista = mapa.get(item.source) ?? []
    lista.push(item)
    mapa.set(item.source, lista)
  }
  for (const lista of mapa.values()) lista.sort((a, b) => b.id - a.id)
  return mapa
}

export function rotuloDiaColeta(dia: string) {
  const [ano, mes, numero] = dia.split("-").map(Number)
  return new Date(Date.UTC(ano, mes - 1, numero)).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function modoPedidos(ultimaSucessoPedidos: string | null | undefined): ModoPedidos {
  return ultimaSucessoPedidos ? "incremental" : "inicial"
}

/** Falta uma execução com sucesso hoje (America/Sao_Paulo). A cadência só muda o texto explicativo. */
export function precisaRodarHoje(ultimaSucessoEm: string | null | undefined, hojeSp: string) {
  if (!ultimaSucessoEm) return true
  return diaCalendarioSp(ultimaSucessoEm) < hojeSp
}

export function cadenciaTexto(schedule: Cadencia, fonte: Fonte) {
  if (fonte === "orders_full") {
    return schedule === "once_then_daily"
      ? "1ª carga cheia; depois incremental por dia"
      : "Incremental por dia"
  }
  return "Lista completa por dia"
}

export function significadoQuantidade(fonte: Fonte | string) {
  switch (fonte) {
    case "orders_full":
      return "Pedidos inseridos ou atualizados na promoção"
    case "pendency_list":
      return "Pendências gravadas"
    case "invoices":
      return "Faturas gravadas"
    case "bi_orders":
      return "Pedidos com previsão ou rastreio atualizados"
    default:
      return "Registros gravados"
  }
}

export function significadoPulados(fonte: Fonte | string) {
  switch (fonte) {
    case "invoices":
      return "Faturas sem pedido correspondente na base"
    case "bi_orders":
      return "Linhas sem pedido na base ou sem previsão/rastreio"
    case "pendency_list":
      return "Pendências sem pedido na base"
    default:
      return "Registros não gravados"
  }
}

export function duracaoMs(inicio: string, fim: string | null) {
  if (!fim) return null
  const ms = new Date(fim).getTime() - new Date(inicio).getTime()
  return ms >= 0 ? ms : null
}

export function duracaoLegivel(inicio: string, fim: string | null) {
  const ms = duracaoMs(inicio, fim)
  if (ms == null) return "—"
  const seg = Math.round(ms / 1000)
  if (seg < 60) return `${seg}s`
  const min = Math.floor(seg / 60)
  const resto = seg % 60
  return resto ? `${min}min ${resto}s` : `${min}min`
}

export function statusDiaFonte(opcoes: {
  ultimaTentativa: { status: string } | null
  ultimaSucessoEm: string | null | undefined
  hojeSp: string
  naFila: boolean
}): StatusDia {
  const { ultimaTentativa, ultimaSucessoEm, hojeSp, naFila } = opcoes
  if (naFila) return "na_fila"
  if (ultimaTentativa?.status === "running") return "rodando"
  if (ultimaTentativa?.status === "failed") return "falhou"
  if (!ultimaTentativa) return "sem_execucao"
  if (!precisaRodarHoje(ultimaSucessoEm, hojeSp)) return "ok"
  return "pendente"
}

export function proximoPassoFonte(opcoes: {
  fonte: Fonte
  posicao: number
  posicaoRodando: number | null
  statusDia: StatusDia
  modoPedidos: ModoPedidos
  pipelineFalhou: boolean
}) {
  const { fonte, posicao, posicaoRodando, statusDia, modoPedidos, pipelineFalhou } = opcoes
  if (statusDia === "rodando") return "Em execução agora."
  if (statusDia === "na_fila") return "Aguarda a fonte anterior terminar."
  if (statusDia === "ok") return "Sucesso registrado hoje. Só rode de novo se precisar reprocessar."
  if (pipelineFalhou && posicaoRodando != null && posicao > posicaoRodando) {
    return "Corrija a falha e rode npm run coletar de novo."
  }
  if (fonte === "orders_full" && modoPedidos === "inicial") {
    return "Rode npm run coletar para a carga cheia de pedidos."
  }
  if (statusDia === "pendente" || statusDia === "sem_execucao" || statusDia === "falhou") {
    return "Rode npm run coletar (pipeline completo, nesta ordem)."
  }
  return "—"
}

export function rotuloStatusDia(status: StatusDia) {
  switch (status) {
    case "ok":
      return "OK hoje"
    case "pendente":
      return "Pendente hoje"
    case "falhou":
      return "Falhou"
    case "rodando":
      return "Rodando"
    case "na_fila":
      return "Na fila"
    case "sem_execucao":
      return "Sem execução"
  }
}
