import type { DadosCasca } from "@/components/casca/dados"
import { Shell } from "@/components/shell"
import { montarNotificacoes, type EventoBruto } from "@/domain/notificacoes"
import { statusEmAnaliseNome } from "@/domain/pedidos"
import { papelAtual } from "@/lib/supabase/servidor"
import { Suspense } from "react"

const SETE_DIAS = 7 * 24 * 60 * 60 * 1000

type Supabase = Awaited<ReturnType<typeof papelAtual>>["supabase"]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <CascaComDados>{children}</CascaComDados>
    </Suspense>
  )
}

// não espera: a casca desenha na hora e cada peça resolve a promessa no próprio Suspense
function CascaComDados({ children }: { children: React.ReactNode }) {
  return <Shell dados={carregarCasca()}>{children}</Shell>
}

const VAZIO: Omit<DadosCasca, "email" | "admin"> = {
  notificacoes: [],
  emAnalise: null,
  coletaComFalha: false,
  ultimaColeta: null,
}

async function carregarCasca(): Promise<DadosCasca> {
  const { supabase, user, papel } = await papelAtual()
  const email = user?.email ?? "usuário"
  if (!papel) return { ...VAZIO, email, admin: false }
  const admin = papel === "admin"
  try {
    return { ...(await lerDados(supabase, admin)), email, admin }
  } catch {
    return { ...VAZIO, email, admin }
  }
}

async function lerDados(supabase: Supabase, admin: boolean) {
  const desde = new Date(Date.now() - SETE_DIAS).toISOString()
  const [statusLidos, eventosLidos, coletasLidas] = await Promise.all([
    supabase.from("order_statuses").select("id, name"),
    supabase
      .from("order_events")
      .select("id, field, previous_value, new_value, observed_at, orders(id, code)")
      .neq("field", "created")
      .gte("observed_at", desde)
      .order("observed_at", { ascending: false })
      .limit(8),
    supabase
      .from("collections")
      .select("id, source, status, started_at, finished_at, error")
      .order("id", { ascending: false })
      .limit(20),
  ])

  const nomesStatus = new Map((statusLidos.data ?? []).map((item) => [String(item.id), String(item.name ?? "")]))
  const idsEmAnalise = (statusLidos.data ?? [])
    .filter((item) => statusEmAnaliseNome(item.name))
    .map((item) => Number(item.id))
  const emAnalise = idsEmAnalise.length
    ? await supabase.from("orders").select("id", { count: "exact", head: true }).in("status_id", idsEmAnalise).is("deleted_at", null)
    : null

  const eventos: EventoBruto[] = (eventosLidos.data ?? []).map((linha) => {
    const pedido = Array.isArray(linha.orders) ? linha.orders[0] : linha.orders
    return {
      id: Number(linha.id),
      field: linha.field,
      previous_value: linha.previous_value,
      new_value: linha.new_value,
      observed_at: linha.observed_at,
      pedidoId: pedido ? Number(pedido.id) : null,
      pedidoCodigo: pedido?.code ?? null,
    }
  })

  const coletas = coletasLidas.data ?? []
  const ultimaPorFonte = new Map<string, (typeof coletas)[number]>()
  for (const coleta of coletas) {
    if (!ultimaPorFonte.has(coleta.source)) ultimaPorFonte.set(coleta.source, coleta)
  }
  const falhasAtuais = admin ? [...ultimaPorFonte.values()].filter((coleta) => coleta.status === "failed") : []

  return {
    notificacoes: montarNotificacoes(
      eventos,
      falhasAtuais.map((coleta) => ({ ...coleta, id: Number(coleta.id) })),
      nomesStatus,
    ),
    emAnalise: emAnalise?.count ?? null,
    coletaComFalha: falhasAtuais.length > 0,
    ultimaColeta: coletas.find((coleta) => coleta.status === "succeeded")?.finished_at ?? null,
  }
}
