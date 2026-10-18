import type { SupabaseClient } from "@supabase/supabase-js"
import { classificarErpId } from "../../src/domain/erp"
import { numero, texto, type Registro } from "../../src/lib/sellent/mapear"

const HOST = "https://api.sellentt.com.br/api/v1"

export type ResultadoConferencia = {
  totalSellent: number | null
  totalReplica: number | null
  totalFaturas: number | null
  divergenciasAmostra: number
  contagemDiverge: boolean
  detalhes: string[]
}

async function sellent(caminho: string, token: string): Promise<Registro> {
  const resposta = await fetch(HOST + caminho, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })
  if (!resposta.ok) throw new Error(`Sellent respondeu ${resposta.status} em ${caminho.split("?")[0]}`)
  return (await resposta.json()) as Registro
}

/** Compara totais e amostra de pedidos (GET Sellent vs Postgres). */
export async function conferirSellentReplica(
  cliente: SupabaseClient,
  token: string,
  limiteAmostra = 30,
): Promise<ResultadoConferencia> {
  const limite = Math.min(100, Math.max(1, limiteAmostra))
  const [totalApi, paginaApi] = await Promise.all([
    sellent("/orders?limit=1&page=1", token),
    sellent(`/orders_full?limit=${limite}&page=1`, token),
  ])
  const paginacao = totalApi.pagination as { total?: number } | undefined
  const totalSellent = Number(paginacao?.total)
  const amostra = Array.isArray(paginaApi.data) ? (paginaApi.data as Registro[]) : []

  const { count: totalReplica } = await cliente.from("orders").select("id", { count: "exact", head: true })
  const { count: totalFaturas } = await cliente.from("invoices").select("id", { count: "exact", head: true })

  const detalhes: string[] = []
  let divergencias = 0
  for (const bruto of amostra) {
    const id = Number(bruto.id)
    if (!Number.isFinite(id)) continue
    const { data: linha, error } = await cliente
      .from("orders")
      .select("id, code, amount_final, erp_number, erp_rejection, order_statuses(name)")
      .eq("id", id)
      .maybeSingle()
    if (error || !linha) {
      divergencias += 1
      detalhes.push(`#${id}: ${error?.message ?? "ausente na réplica"}`)
      continue
    }
    const statusApi = texto((bruto.status as Registro | undefined)?.name)
    const statusJoin = linha.order_statuses as { name?: string | null } | { name?: string | null }[] | null
    const statusRep = texto(Array.isArray(statusJoin) ? statusJoin[0]?.name : statusJoin?.name)
    const erpApi = classificarErpId(bruto.erp_id)
    const valorApi = numero(bruto.amount_final)
    const valorRep = numero(linha.amount_final)
    const erros: string[] = []
    if (texto(bruto.code) !== texto(linha.code)) erros.push("code")
    if (statusApi !== statusRep) erros.push("status")
    if (Math.abs((valorApi ?? 0) - (valorRep ?? 0)) > 0.01) erros.push(`amount_final ${valorApi} ≠ ${valorRep}`)
    if (erpApi.erpNumero !== texto(linha.erp_number)) erros.push("erp_number")
    if (erpApi.erpRecusa !== texto(linha.erp_rejection)) erros.push("erp_rejection")
    if (erros.length) {
      divergencias += 1
      detalhes.push(`#${id}: ${erros.join("; ")}`)
    }
  }

  const contagemDiverge =
    Number.isFinite(totalSellent) && totalReplica != null && totalSellent !== totalReplica

  return {
    totalSellent: Number.isFinite(totalSellent) ? totalSellent : null,
    totalReplica: totalReplica ?? null,
    totalFaturas: totalFaturas ?? null,
    divergenciasAmostra: divergencias,
    contagemDiverge,
    detalhes,
  }
}

export function imprimirConferencia(resultado: ResultadoConferencia, limiteAmostra: number) {
  console.log("--- Conferência Sellent × réplica ---")
  console.log(`Pedidos Sellent (pagination.total): ${resultado.totalSellent ?? "?"}`)
  console.log(`Pedidos na réplica: ${resultado.totalReplica ?? "?"}`)
  console.log(`Faturas na réplica: ${resultado.totalFaturas ?? "?"}`)
  if (resultado.contagemDiverge) {
    console.log("DIVERGÊNCIA: contagem de pedidos Sellent ≠ réplica")
  }
  if (resultado.detalhes.length) {
    console.log(`\nDivergências na amostra (até ${limiteAmostra}):`)
    for (const linha of resultado.detalhes) console.log(linha)
  }
  console.log(`\nDivergências na amostra: ${resultado.divergenciasAmostra}`)
}

export function conferenciaOk(resultado: ResultadoConferencia) {
  return !resultado.contagemDiverge && resultado.divergenciasAmostra === 0
}
