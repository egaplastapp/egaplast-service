import type { EventoBruto } from "@/domain/notificacoes"
import type { Supabase } from "@/lib/pedidos/ler"

export async function lerEventosRecentes(supabase: Supabase, limite = 20) {
  const { data, error } = await supabase
    .from("order_events")
    .select("id, field, previous_value, new_value, observed_at, orders(id, code)")
    .order("observed_at", { ascending: false })
    .limit(limite)

  if (error) return { eventos: [] as EventoBruto[], erro: error.message }

  const eventos: EventoBruto[] = (data ?? []).map((linha) => {
    const pedido = Array.isArray(linha.orders) ? linha.orders[0] : linha.orders
    return {
      id: Number(linha.id),
      field: String(linha.field),
      previous_value: linha.previous_value,
      new_value: linha.new_value,
      observed_at: String(linha.observed_at),
      pedidoId: pedido ? Number(pedido.id) : null,
      pedidoCodigo: pedido?.code ?? null,
    }
  })

  return { eventos, erro: null as string | null }
}
