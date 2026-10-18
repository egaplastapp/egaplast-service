export const CAMPOS_EVENTO: Record<string, string> = {
  created: "criado",
  status_id: "status",
  erp_number: "número no ERP",
  erp_rejection: "recusa",
  is_canceled: "cancelado",
  amount_final: "valor",
}

export const NOMES_FONTE: Record<string, string> = {
  orders_full: "Pedidos",
  pendency_list: "Pendências",
  invoices: "Faturas",
  bi_orders: "Previsão e rastreio",
}

export type EventoBruto = {
  id: number
  field: string
  previous_value: string | null
  new_value: string | null
  observed_at: string
  pedidoId: number | null
  pedidoCodigo: string | null
}

export type FalhaBruta = {
  id: number
  source: string
  finished_at: string | null
  started_at: string
  error: string | null
}

export type Notificacao = {
  id: string
  tipo: "status" | "erp" | "recusa" | "cancelado" | "valor" | "coleta" | "novo"
  titulo: string
  texto: string
  quando: string
  href: string
}

const LIMITE_TEXTO = 140

export function montarNotificacoes(
  eventos: EventoBruto[],
  falhas: FalhaBruta[],
  nomesStatus: Map<string, string>,
  limite = 8,
): Notificacao[] {
  const deEventos = eventos.filter((evento) => evento.field !== "created").map((evento) => eventoParaNotificacao(evento, nomesStatus))
  const deFalhas = falhas.map(daFalha)
  return [...deFalhas, ...deEventos]
    .sort((a, b) => b.quando.localeCompare(a.quando))
    .slice(0, limite)
}

/** Feed operacional: inclui pedidos novos na réplica (`created`). */
export function montarFeedEventos(eventos: EventoBruto[], nomesStatus: Map<string, string>, limite = 20): Notificacao[] {
  return eventos
    .map((evento) => eventoParaNotificacao(evento, nomesStatus))
    .sort((a, b) => b.quando.localeCompare(a.quando))
    .slice(0, limite)
}

export function eventoParaNotificacao(evento: EventoBruto, nomesStatus: Map<string, string>): Notificacao {
  if (evento.field === "created") return eventoCriado(evento)
  return doEvento(evento, nomesStatus)
}

function eventoCriado(evento: EventoBruto): Notificacao {
  const pedido = evento.pedidoCodigo ?? (evento.pedidoId != null ? String(evento.pedidoId) : "sem código")
  const href = evento.pedidoId != null ? `/pedidos/${evento.pedidoId}` : "/pedidos"
  return {
    id: `evento-${evento.id}`,
    tipo: "novo",
    titulo: `Pedido ${pedido} entrou na réplica`,
    texto: "Primeira gravação na coleta do Sellent.",
    quando: evento.observed_at,
    href,
  }
}

export function naoVistas(notificacoes: Notificacao[], vistasEm: string | null) {
  if (!vistasEm) return notificacoes.length
  return notificacoes.filter((item) => item.quando > vistasEm).length
}

function doEvento(evento: EventoBruto, nomesStatus: Map<string, string>): Notificacao {
  const pedido = evento.pedidoCodigo ?? (evento.pedidoId != null ? String(evento.pedidoId) : "sem código")
  const href = evento.pedidoId != null ? `/pedidos/${evento.pedidoId}` : "/pedidos"
  const base = { id: `evento-${evento.id}`, quando: evento.observed_at, href }
  const antes = evento.previous_value
  const depois = evento.new_value

  if (evento.field === "status_id") {
    const de = antes ? nomesStatus.get(antes) ?? `status ${antes}` : "sem status"
    const para = depois ? nomesStatus.get(depois) ?? `status ${depois}` : "sem status"
    return { ...base, tipo: "status", titulo: `Pedido ${pedido} mudou de status`, texto: `${de} para ${para}, no Sellent.` }
  }
  if (evento.field === "erp_number") {
    return depois
      ? { ...base, tipo: "erp", titulo: `Pedido ${pedido} recebeu número no ERP`, texto: `Número ${depois}.` }
      : { ...base, tipo: "erp", titulo: `Pedido ${pedido} perdeu o número no ERP`, texto: `Antes era ${antes ?? "—"}.` }
  }
  if (evento.field === "erp_rejection") {
    return depois
      ? { ...base, tipo: "recusa", titulo: `Pedido ${pedido} voltou com recusa do ERP`, texto: cortar(depois) }
      : { ...base, tipo: "recusa", titulo: `Pedido ${pedido} saiu da recusa do ERP`, texto: "O texto de recusa foi limpo no Sellent." }
  }
  if (evento.field === "is_canceled") {
    const cancelado = depois === "true"
    return {
      ...base,
      tipo: "cancelado",
      titulo: cancelado ? `Pedido ${pedido} foi cancelado` : `Pedido ${pedido} deixou de estar cancelado`,
      texto: "Marca de cancelamento do Sellent.",
    }
  }
  if (evento.field === "amount_final") {
    return { ...base, tipo: "valor", titulo: `Pedido ${pedido} mudou de valor`, texto: `${antes ?? "—"} para ${depois ?? "—"} no valor final.` }
  }
  const campo = CAMPOS_EVENTO[evento.field] ?? evento.field
  return { ...base, tipo: "status", titulo: `Pedido ${pedido} mudou: ${campo}`, texto: `${antes ?? "—"} para ${depois ?? "—"}.` }
}

function daFalha(falha: FalhaBruta): Notificacao {
  const fonte = NOMES_FONTE[falha.source] ?? falha.source
  return {
    id: `coleta-${falha.id}`,
    tipo: "coleta",
    titulo: `Coleta de ${fonte} falhou`,
    texto: falha.error ? cortar(falha.error) : "A execução terminou sem gravar.",
    quando: falha.finished_at ?? falha.started_at,
    href: "/coleta",
  }
}

function cortar(texto: string) {
  return texto.length > LIMITE_TEXTO ? `${texto.slice(0, LIMITE_TEXTO - 1)}…` : texto
}
