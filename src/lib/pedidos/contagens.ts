import { PARADO_MS, statusEmAnaliseNome, type ContagensExcecaoPedidos } from "@/domain/pedidos"
import type { Supabase } from "@/lib/pedidos/ler"

export type ContagensGlobaisPedidos = ContagensExcecaoPedidos & {
  /** True quando a base de pedidos carregada na mesa pode estar truncada (teto de leitura). */
  recorteLimitado: boolean
}

async function idsStatusPorPredicado(supabase: Supabase, teste: (nome: string) => boolean) {
  const { data, error } = await supabase.from("order_statuses").select("id, name")
  if (error) throw new Error(error.message)
  return (data ?? [])
    .filter((item) => teste(String(item.name ?? "")))
    .map((item) => Number(item.id))
    .filter((id) => Number.isFinite(id))
}

async function contarPedidosStatus(supabase: Supabase, statusIds: number[]) {
  if (statusIds.length === 0) return 0
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .in("status_id", statusIds)
    .is("deleted_at", null)
  if (error) throw new Error(error.message)
  return count ?? 0
}

async function contarPedidosComPendenciaAberta(supabase: Supabase) {
  const ids = new Set<number>()
  const pagina = 1000
  for (let inicio = 0; ; inicio += pagina) {
    const { data, error } = await supabase
      .from("pendencies")
      .select("order_id")
      .eq("status", "pending")
      .order("order_id", { ascending: true })
      .range(inicio, inicio + pagina - 1)
    if (error) throw new Error(error.message)
    const lote = data ?? []
    for (const linha of lote) {
      const id = Number(linha.order_id)
      if (Number.isFinite(id)) ids.add(id)
    }
    if (lote.length < pagina) break
  }
  return ids.size
}

async function contarSemNotaFiscalGlobal(supabase: Supabase, idsComNota: ReadonlySet<number>) {
  const invoiceIds = await idsStatusPorPredicado(
    supabase,
    (nome) => nome.toUpperCase().includes("INVOICE-ATIVO"),
  )
  if (invoiceIds.length === 0) return 0

  let semNota = 0
  const pagina = 1000
  for (let inicio = 0; ; inicio += pagina) {
    const { data, error } = await supabase
      .from("orders")
      .select("id")
      .in("status_id", invoiceIds)
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .range(inicio, inicio + pagina - 1)
    if (error) throw new Error(error.message)
    const lote = data ?? []
    for (const linha of lote) {
      const id = Number(linha.id)
      if (Number.isFinite(id) && !idsComNota.has(id)) semNota += 1
    }
    if (lote.length < pagina) break
  }
  return semNota
}

/** Contagens operacionais na base inteira (Postgres), alinhadas às regras de domínio. */
export async function lerContagensExcecaoGlobais(
  supabase: Supabase,
  idsComNota: ReadonlySet<number>,
  recorteLimitado: boolean,
): Promise<{ contagens: ContagensGlobaisPedidos; erro: string | null }> {
  try {
    const limiteParado = new Date(Date.now() - PARADO_MS).toISOString()
    const idsAnalise = await idsStatusPorPredicado(supabase, statusEmAnaliseNome)
    const [emAnalise, paradosQuery, recusaQuery, comPendencia, semNotaFiscal] = await Promise.all([
      contarPedidosStatus(supabase, idsAnalise),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .lt("updated_at", limiteParado),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .not("erp_rejection", "is", null)
        .neq("erp_rejection", ""),
      contarPedidosComPendenciaAberta(supabase),
      contarSemNotaFiscalGlobal(supabase, idsComNota),
    ])

    if (paradosQuery.error) throw new Error(paradosQuery.error.message)
    if (recusaQuery.error) throw new Error(recusaQuery.error.message)

    return {
      contagens: {
        parados: paradosQuery.count ?? 0,
        comPendencia,
        semNotaFiscal,
        emAnalise,
        comRecusaErp: recusaQuery.count ?? 0,
        recorteLimitado,
      },
      erro: null,
    }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro ao ler contagens globais"
    return {
      contagens: {
        parados: 0,
        comPendencia: 0,
        semNotaFiscal: 0,
        emAnalise: 0,
        comRecusaErp: 0,
        recorteLimitado,
      },
      erro: mensagem,
    }
  }
}
