import type { Supabase } from "@/lib/pedidos/ler"

export async function ultimaColetaOk(supabase: Supabase) {
  const { data } = await supabase
    .from("collections")
    .select("finished_at")
    .eq("status", "succeeded")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.finished_at ?? null
}

export type ExecucaoColetaPedidos = {
  id: number
  started_at: string
  finished_at: string | null
  status: string
  source: string
}

/** Última promoção de pedidos (`orders_full`) concluída com sucesso. */
export async function ultimaColetaPedidosOk(supabase: Supabase): Promise<ExecucaoColetaPedidos | null> {
  const { data } = await supabase
    .from("collections")
    .select("id, started_at, finished_at, status, source")
    .eq("source", "orders_full")
    .eq("status", "succeeded")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return {
    id: Number(data.id),
    started_at: String(data.started_at),
    finished_at: data.finished_at ? String(data.finished_at) : null,
    status: String(data.status),
    source: String(data.source),
  }
}

export async function execucaoColeta(supabase: Supabase, id: number): Promise<ExecucaoColetaPedidos | null> {
  if (!Number.isFinite(id)) return null
  const { data } = await supabase
    .from("collections")
    .select("id, started_at, finished_at, status, source")
    .eq("id", id)
    .maybeSingle()
  if (!data) return null
  return {
    id: Number(data.id),
    started_at: String(data.started_at),
    finished_at: data.finished_at ? String(data.finished_at) : null,
    status: String(data.status),
    source: String(data.source),
  }
}
