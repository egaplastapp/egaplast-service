import { CAMPOS_EVENTO } from "@/domain/notificacoes"
import { montarPassosRastreabilidade, type PassoRastreabilidade } from "@/domain/rastreabilidade"
import { numero, texto } from "@/lib/sellent/mapear"
import type { SupabaseClient } from "@supabase/supabase-js"

export type EventoPainel = {
  id: number
  rotulo: string
  anterior: string | null
  novo: string | null
  quando: string
}

export type PainelPedido = {
  id: number
  codigo: string | null
  erpNumero: string | null
  erpRecusa: string | null
  status: string | null
  corStatus: string | null
  valor: number | null
  loja: string | null
  vendedor: string | null
  pendenciasAbertas: number
  notas: number
  passos: PassoRastreabilidade[]
  eventos: EventoPainel[]
}

function um<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null
  return valor ?? null
}

export async function carregarPainelPedido(supabase: SupabaseClient, pedidoId: number): Promise<PainelPedido | null> {
  const { data: pedido } = await supabase
    .from("orders")
    .select(`id, code, erp_number, erp_rejection, amount_final, prevision, tracking,
      order_statuses(name, color),
      customers(name),
      sellers(name)`)
    .eq("id", pedidoId)
    .maybeSingle()
  if (!pedido) return null

  const { data: itens } = await supabase.from("order_items").select("id").eq("order_id", pedidoId)
  const idsItens = (itens ?? []).map((item) => Number(item.id))

  const [{ count: pendencias }, { count: notas }, { data: eventos }, progressoQuery] = await Promise.all([
    supabase.from("pendencies").select("id", { count: "exact", head: true }).eq("order_id", pedidoId).eq("status", "pending"),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("order_id", pedidoId),
    supabase
      .from("order_events")
      .select("id, field, previous_value, new_value, observed_at")
      .eq("order_id", pedidoId)
      .order("observed_at", { ascending: false })
      .limit(3),
    idsItens.length > 0
      ? supabase.from("order_item_progress").select("id", { count: "exact", head: true }).in("order_item_id", idsItens)
      : Promise.resolve({ count: 0 }),
  ])
  const progressos = progressoQuery.count ?? 0

  const status = um(pedido.order_statuses) as { name: string | null; color: string | null } | null
  const loja = um(pedido.customers) as { name: string | null } | null
  const vendedor = um(pedido.sellers) as { name: string | null } | null

  const passos = montarPassosRastreabilidade({
    statusSellent: texto(status?.name),
    erpNumero: texto(pedido.erp_number),
    erpRecusa: texto(pedido.erp_rejection),
    temNota: (notas ?? 0) > 0,
    temOperacaoInterna: (progressos ?? 0) > 0,
  })

  return {
    id: Number(pedido.id),
    codigo: texto(pedido.code),
    erpNumero: texto(pedido.erp_number),
    erpRecusa: texto(pedido.erp_rejection),
    status: texto(status?.name),
    corStatus: texto(status?.color),
    valor: numero(pedido.amount_final),
    loja: texto(loja?.name),
    vendedor: texto(vendedor?.name),
    pendenciasAbertas: pendencias ?? 0,
    notas: notas ?? 0,
    passos,
    eventos: (eventos ?? []).map((evento) => ({
      id: Number(evento.id),
      rotulo: CAMPOS_EVENTO[evento.field] ?? evento.field,
      anterior: evento.previous_value,
      novo: evento.new_value,
      quando: String(evento.observed_at),
    })),
  }
}
