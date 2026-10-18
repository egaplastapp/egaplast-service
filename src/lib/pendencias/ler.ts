import { PAGINA_LISTA, TETO_LISTA } from "@/domain/pedidos"
import type { PendenciaLista } from "@/domain/pendencias"
import type { Supabase } from "@/lib/pedidos/ler"

type LinhaBruta = {
  id: number | string
  order_id: number | string
  approval_type: string | null
  profile_approval: string | null
  status: string | null
  reason: string | null
}

export async function lerPendenciasAbertas(supabase: Supabase) {
  const pendencias: PendenciaLista[] = []
  for (let inicio = 0; inicio < TETO_LISTA; inicio += PAGINA_LISTA) {
    const { data, error } = await supabase
      .from("pendencies")
      .select("id, order_id, approval_type, profile_approval, status, reason")
      .eq("status", "pending")
      .order("id", { ascending: true })
      .range(inicio, inicio + PAGINA_LISTA - 1)
    if (error) return { pendencias: [] as PendenciaLista[], erro: error.message }
    const lote = ((data ?? []) as LinhaBruta[]).map(mapear)
    pendencias.push(...lote)
    if (lote.length < PAGINA_LISTA) break
  }
  return { pendencias, erro: null as string | null }
}

function mapear(linha: LinhaBruta): PendenciaLista {
  return {
    id: Number(linha.id),
    orderId: Number(linha.order_id),
    approvalType: linha.approval_type,
    profileApproval: linha.profile_approval,
    status: linha.status,
    reason: linha.reason,
  }
}
