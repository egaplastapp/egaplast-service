import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { deveContinuar, FONTES, leituraFechaComApi, type Fonte } from "../src/domain/coleta"
import { diferencas, type FotoPedido } from "../src/domain/eventos"
import { cursorParaApi } from "../src/lib/sellent/cursor"
import {
  mapearFatura,
  mapearPedido,
  mapearPendencia,
  texto,
  type Customer,
  type Entidade,
  type Registro,
} from "../src/lib/sellent/mapear"
import { conferirSellentReplica, conferenciaOk, imprimirConferencia } from "./lib/conferir-core"

const HOST = "https://api.sellentt.com.br/api/v1"

function lerEnv() {
  const pares = Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((linha) => linha && !linha.startsWith("#") && linha.includes("="))
      .map((linha) => {
        const indice = linha.indexOf("=")
        return [linha.slice(0, indice).trim(), linha.slice(indice + 1).trim()]
      }),
  )
  const url = pares.NEXT_PUBLIC_SUPABASE_URL
  const chave = pares.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const token = pares.SELLENT_API_TOKEN
  const email = pares.SERVICE_ADMIN_EMAIL
  const senha = pares.SERVICE_ADMIN_PASSWORD
  if (!url || !chave || !token || !email || !senha) {
    throw new Error("Faltam variáveis em .env.local para a coleta.")
  }
  return { url, chave, token, email, senha }
}

async function sellent(caminho: string, token: string): Promise<Registro> {
  const resposta = await fetch(HOST + caminho, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })
  if (!resposta.ok) throw new Error(`Sellent respondeu ${resposta.status} em ${caminho.split("?")[0]}`)
  return (await resposta.json()) as Registro
}

function dedupe<T extends { id: number }>(linhas: T[]): T[] {
  const mapa = new Map<number, T>()
  for (const linha of linhas) mapa.set(linha.id, linha)
  return [...mapa.values()]
}

function dim(linhas: Entidade[]) {
  return dedupe(linhas).map((linha) => ({
    id: linha.id,
    code: linha.code,
    name: linha.name,
    payload: linha.payload,
  }))
}

function statusLinha(linhas: Entidade[]) {
  return dedupe(linhas).map((linha) => ({
    id: linha.id,
    code: linha.code,
    name: linha.name,
    color: texto(linha.payload.color),
    payload: linha.payload,
  }))
}

function clienteLinha(linhas: Customer[]) {
  return dedupe(linhas).map((linha) => ({
    id: linha.id,
    code: linha.code,
    name: linha.name,
    erp_id: linha.erp_id,
    doc_number: linha.doc_number,
    email: linha.email,
    phone: linha.phone,
    segment_id: linha.segment_id,
    payload: linha.payload,
  }))
}

async function gravar(
  cliente: SupabaseClient,
  tabela: string,
  linhas: Record<string, unknown>[],
  conflito: string,
  aoGravar?: (gravados: number) => Promise<void>,
) {
  for (let i = 0; i < linhas.length; i += 40) {
    const lote = linhas.slice(i, i + 40)
    if (lote.length === 0) continue
    let tentativa = 0
    for (;;) {
      const { error } = await cliente.from(tabela).upsert(lote, { onConflict: conflito })
      if (!error) break
      const bruto = error.message
      const instavel = bruto.includes("502") || bruto.includes("<html") || bruto.includes("fetch failed") || bruto.includes("Bad gateway")
      tentativa += 1
      if (!instavel || tentativa > 5) {
        throw new Error(`${tabela}: ${bruto.includes("<html") ? "gateway 502" : bruto.slice(0, 180)}`)
      }
      await new Promise((resolver) => setTimeout(resolver, 2000 * tentativa))
    }
    if (aoGravar) await aoGravar(lote.length)
  }
}

async function fotos(cliente: SupabaseClient) {
  const mapa = new Map<number, FotoPedido>()
  let inicio = 0
  for (;;) {
    const { data, error } = await cliente
      .from("orders")
      .select("id, status_id, erp_number, erp_rejection, is_canceled, amount_final")
      .range(inicio, inicio + 999)
    if (error) throw new Error(error.message)
    for (const linha of data ?? []) {
      mapa.set(Number(linha.id), {
        statusId: linha.status_id == null ? null : Number(linha.status_id),
        erpNumero: linha.erp_number,
        erpRecusa: linha.erp_rejection,
        cancelado: Boolean(linha.is_canceled),
        valor: linha.amount_final == null ? null : Number(linha.amount_final),
      })
    }
    if (!data || data.length < 1000) break
    inicio += 1000
  }
  return mapa
}

async function paginas(
  recurso: string,
  token: string,
  limite: number,
  extra = "",
  aoLer?: (total: number) => Promise<void>,
) {
  const saida: Registro[] = []
  let pagina = 1
  for (;;) {
    const json = await sellent(`${recurso}?limit=${limite}&page=${pagina}${extra}`, token)
    const data = Array.isArray(json.data) ? (json.data as Registro[]) : []
    saida.push(...data)
    console.log(`${recurso} página ${pagina}: ${data.length}`)
    if (aoLer) await aoLer(saida.length)
    if (data.length < limite) break
    pagina += 1
  }
  return saida
}

function pulso(cliente: SupabaseClient, id: number) {
  let ultimo = 0
  return async (phase: "downloading" | "staging" | "promoting", seen: number, forcar = false) => {
    const agora = Date.now()
    if (!forcar && agora - ultimo < 2000) return
    ultimo = agora
    const { error } = await cliente.from("collections").update({ phase, seen }).eq("id", id).eq("status", "running")
    if (error) console.log("progresso não atualizado")
  }
}

type ResultadoTrabalho = {
  rpc: string
  args?: Record<string, unknown>
  stats?: Record<string, unknown>
}

async function promover(
  cliente: SupabaseClient,
  source: Fonte,
  trabalho: (id: number) => Promise<ResultadoTrabalho>,
) {
  const anterior = await cliente
    .from("collections")
    .select("seen, quantity")
    .eq("source", source)
    .eq("status", "succeeded")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
  const expected = Number(anterior.data?.seen) || Number(anterior.data?.quantity) || null
  const { data, error } = await cliente
    .from("collections")
    .insert({ source, status: "running", phase: "downloading", seen: 0, expected })
    .select("id")
    .single()
  if (error || !data) throw new Error(error?.message ?? "não abriu a coleta")
  const id = Number(data.id)
  try {
    const limpou = await cliente.rpc("clear_staging", { p_source: source })
    if (limpou.error) throw new Error(limpou.error.message)
    const chamada = await trabalho(id)
    const promoveu = await cliente.rpc(chamada.rpc, { p_collection: id, ...chamada.args })
    if (promoveu.error) throw new Error(promoveu.error.message)
    const stats = { ...chamada.stats }
    const retorno = promoveu.data
    if (retorno && typeof retorno === "object" && !Array.isArray(retorno)) {
      const json = retorno as Record<string, unknown>
      if (json.quantity != null) stats.promovidos = json.quantity
      if (json.skipped != null) stats.pulados_promocao = json.skipped
    }
    if (Object.keys(stats).length > 0) {
      await cliente.from("collections").update({ stats }).eq("id", id)
    }
    console.log(`${source} promovida`)
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "erro desconhecido"
    await cliente.from("collections").update({
      status: "failed",
      error: mensagem.includes("<html") ? "gateway 502" : mensagem.slice(0, 180),
      finished_at: new Date().toISOString(),
    }).eq("id", id)
    await cliente.rpc("clear_staging", { p_source: source })
    throw erro
  }
}

async function main() {
  const env = lerEnv()
  const cliente = createClient(env.url, env.chave, { auth: { persistSession: false, autoRefreshToken: false } })
  const acesso = await cliente.auth.signInWithPassword({ email: env.email, password: env.senha })
  if (acesso.error || !acesso.data.session) throw new Error("Falha ao autenticar o coletor.")
  console.log("coletor autenticado")
  const abandono = await cliente.rpc("abandon_running")
  if (abandono.error) throw new Error(abandono.error.message)

  const { data: ultima } = await cliente
    .from("collections")
    .select("cursor")
    .eq("source", "orders_full")
    .eq("status", "succeeded")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
  const filtro = ultima?.cursor ? `&after_updated=${encodeURIComponent(cursorParaApi(String(ultima.cursor)))}` : ""

  let statusAnterior: "succeeded" | "failed" | null = null
  for (const fonte of FONTES) {
    if (!deveContinuar(statusAnterior)) {
      console.log(`${fonte} não iniciada`)
      break
    }
    try {
      if (fonte === "orders_full") {
        await coletarPedidos(cliente, env.token, filtro, ultima?.cursor ? String(ultima.cursor) : null)
        await conferirPedidos(cliente, env.token)
      }
      if (fonte === "pendency_list") await coletarPendencias(cliente, env.token)
      if (fonte === "invoices") await coletarFaturas(cliente, env.token)
      if (fonte === "bi_orders") await coletarRecentes(cliente, env.token)
      statusAnterior = "succeeded"
    } catch {
      console.error(`${fonte} falhou`)
      statusAnterior = "failed"
    }
  }
  if (statusAnterior === "failed") process.exit(1)

  console.log("\nConferência pós-coleta (amostra Sellent × réplica)...")
  const resultado = await conferirSellentReplica(cliente, env.token, 40)
  imprimirConferencia(resultado, 40)
  if (!conferenciaOk(resultado)) {
    console.error("Coleta terminou, mas a conferência encontrou divergência. Rode npm run coletar de novo ou investigue os IDs acima.")
    process.exit(1)
  }
  console.log("Conferência OK.")
}

async function totalPedidos(token: string) {
  const json = await sellent("/orders?limit=1&page=1", token)
  const paginacao = json.pagination
  const total = paginacao && typeof paginacao === "object" ? Number((paginacao as Registro).total) : NaN
  if (!Number.isFinite(total)) throw new Error("A API não informou o total de pedidos.")
  return total
}

async function conferirPedidos(cliente: SupabaseClient, token: string) {
  const total = await totalPedidos(token)
  const { count, error } = await cliente.from("orders").select("id", { count: "exact", head: true })
  if (error) throw new Error(error.message)
  const naBase = count ?? 0
  const { data: coleta } = await cliente
    .from("collections")
    .select("id")
    .eq("source", "orders_full")
    .eq("status", "succeeded")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!coleta) throw new Error("A coleta de pedidos não fechou.")
  if (!leituraFechaComApi(naBase, total)) {
    await cliente.from("collections").update({
      status: "failed",
      api_total: total,
      error: `A API informa ${total} pedidos e a base ficou com ${naBase}.`,
      finished_at: new Date().toISOString(),
    }).eq("id", coleta.id)
    throw new Error(`A API informa ${total} pedidos e a base ficou com ${naBase}.`)
  }
  await cliente.from("collections").update({ api_total: total }).eq("id", coleta.id)
}

async function coletarPedidos(cliente: SupabaseClient, token: string, filtro: string, cursorAnterior: string | null) {
  const totalApi = await totalPedidos(token)
  await promover(cliente, "orders_full", async (id) => {
    await cliente.from("collections").update(filtro ? { api_total: totalApi } : { api_total: totalApi, expected: totalApi }).eq("id", id)
    const marcar = pulso(cliente, id)
    const brutos = await paginas("/orders_full", token, 50, filtro, (total) => marcar("downloading", total))
    if (!filtro && !leituraFechaComApi(brutos.length, totalApi)) {
      throw new Error(`A API informa ${totalApi} pedidos e a leitura trouxe ${brutos.length}.`)
    }
    await marcar("staging", 0, true)
    const mapeados = brutos.map((bruto) => mapearPedido(bruto)).filter((item) => item != null)
    const anteriores = await fotos(cliente)
    let gravados = 0
    const contar = async (n: number) => {
      gravados += n
      await marcar("staging", gravados)
    }
    await gravar(cliente, "stg_segments", dim(mapeados.flatMap((item) => item.segments)), "id", contar)
    await gravar(cliente, "stg_customers", clienteLinha(mapeados.flatMap((item) => item.customers)), "id", contar)
    await gravar(cliente, "stg_order_statuses", statusLinha(mapeados.flatMap((item) => item.statuses)), "id", contar)
    await gravar(cliente, "stg_sellers", dim(mapeados.flatMap((item) => item.sellers)), "id", contar)
    await gravar(cliente, "stg_sellent_users", dim(mapeados.flatMap((item) => item.sellentUsers)), "id", contar)
    await gravar(cliente, "stg_companies", dim(mapeados.flatMap((item) => item.companies)), "id", contar)
    await gravar(cliente, "stg_order_types", dim(mapeados.flatMap((item) => item.orderTypes)), "id", contar)
    await gravar(cliente, "stg_payment_methods", dim(mapeados.flatMap((item) => item.paymentMethods)), "id", contar)
    await gravar(cliente, "stg_payment_terms", dim(mapeados.flatMap((item) => item.paymentTerms)), "id", contar)
    await gravar(cliente, "stg_partners", dim(mapeados.flatMap((item) => item.partners)), "id", contar)
    await gravar(cliente, "stg_origins", dim(mapeados.flatMap((item) => item.origins)), "id", contar)
    await gravar(cliente, "stg_document_types", dim(mapeados.flatMap((item) => item.documentTypes)), "id", contar)
    await gravar(cliente, "stg_sales_offices", dim(mapeados.flatMap((item) => item.salesOffices)), "id", contar)
    await gravar(cliente, "stg_products", dedupe(mapeados.flatMap((item) => item.products)), "id", contar)
    await gravar(cliente, "stg_contacts", dedupe(mapeados.flatMap((item) => item.contacts)), "id", contar)
    await gravar(cliente, "stg_orders", mapeados.map((item) => item.order), "id", contar)
    await gravar(cliente, "stg_order_items", dedupe(mapeados.flatMap((item) => item.items)), "id", contar)
    const vinculos = new Map<string, { order_id: number; contact_id: number }>()
    for (const item of mapeados) {
      for (const contato of item.contacts) {
        vinculos.set(`${item.order.id}:${contato.id}`, { order_id: item.order.id, contact_id: contato.id })
      }
    }
    await gravar(cliente, "stg_order_contacts", [...vinculos.values()], "order_id,contact_id")
    const eventos = mapeados.flatMap((item) => {
      const depois: FotoPedido = {
        statusId: item.order.status_id,
        erpNumero: item.order.erp_number,
        erpRecusa: item.order.erp_rejection,
        cancelado: item.order.is_canceled,
        valor: item.order.amount_final,
      }
      return diferencas(anteriores.get(item.order.id) ?? null, depois).map((diferenca) => ({
        order_id: item.order.id,
        field: diferenca.campo,
        previous_value: diferenca.anterior,
        new_value: diferenca.novo,
      }))
    })
    for (let i = 0; i < eventos.length; i += 40) {
      const lote = eventos.slice(i, i + 40)
      const { error } = await cliente.from("stg_order_events").insert(lote)
      if (error) throw new Error(`stg_order_events: ${error.message.slice(0, 180)}`)
    }
    await marcar("promoting", mapeados.length, true)
    const cursor = mapeados.reduce<string | null>((maior, item) => {
      if (!item.order.updated_at) return maior
      if (!maior || item.order.updated_at > maior) return item.order.updated_at
      return maior
    }, cursorAnterior)
    const itens = dedupe(mapeados.flatMap((item) => item.items)).length
    return {
      rpc: "promote_orders",
      args: { p_cursor: cursor },
      stats: { pedidos_lidos: brutos.length, itens, eventos_novos: eventos.length },
    }
  })
}

async function coletarPendencias(cliente: SupabaseClient, token: string) {
  await promover(cliente, "pendency_list", async (id) => {
    const marcar = pulso(cliente, id)
    const json = await sellent("/pendency_list", token)
    const linhas = (Array.isArray(json.data) ? json.data : []).map((item) => mapearPendencia(item as Registro)).filter((item) => item != null)
    console.log(`pendency_list: ${linhas.length}`)
    await marcar("downloading", linhas.length, true)
    let gravados = 0
    const contar = async (n: number) => {
      gravados += n
      await marcar("staging", gravados)
    }
    await gravar(cliente, "stg_approval_types", [...new Set(linhas.map((item) => item.approval_type).filter(Boolean))].map((code) => ({ code })), "code", contar)
    await gravar(cliente, "stg_approval_profiles", [...new Set(linhas.map((item) => item.profile_approval).filter(Boolean))].map((code) => ({ code })), "code", contar)
    await gravar(cliente, "stg_pendencies", linhas, "id", contar)
    await marcar("promoting", linhas.length, true)
    return { rpc: "promote_pendencies", stats: { pendencias: linhas.length } }
  })
}

async function coletarFaturas(cliente: SupabaseClient, token: string) {
  await promover(cliente, "invoices", async (id) => {
    const marcar = pulso(cliente, id)
    const brutos = await paginas("/bi/invoices", token, 100, "", (total) => marcar("downloading", total))
    await marcar("staging", 0, true)
    const mapeadas = brutos.map((bruto) => mapearFatura(bruto)).filter((item) => item != null)
    await gravar(cliente, "stg_segments", dim(mapeadas.flatMap((item) => item.segment ? [item.segment] : [])), "id")
    await gravar(cliente, "stg_sellers", dim(mapeadas.flatMap((item) => item.seller ? [item.seller] : [])), "id")
    await gravar(cliente, "stg_customers", clienteLinha(mapeadas.flatMap((item) => item.customer ? [item.customer] : [])), "id")
    let gravados = 0
    const contar = async (n: number) => {
      gravados += n
      await marcar("staging", gravados)
    }
    await gravar(cliente, "stg_invoices", mapeadas.map((item) => ({
      id: item.id,
      key: item.key,
      order_id: item.order_id,
      invoice_number: item.invoice_number,
      date: item.date,
      value: item.value,
      credit_status: item.credit_status,
      erp_number: item.erp_number,
      payload: item.payload,
    })), "id", contar)
    await gravar(cliente, "stg_invoice_items", dedupe(mapeadas.flatMap((item) => item.items)), "id", contar)
    await marcar("promoting", mapeadas.length, true)
    const itensNota = dedupe(mapeadas.flatMap((item) => item.items)).length
    return { rpc: "promote_invoices", stats: { faturas_lidas: mapeadas.length, itens_nota: itensNota } }
  })
}

async function coletarRecentes(cliente: SupabaseClient, token: string) {
  await promover(cliente, "bi_orders", async (id) => {
    const marcar = pulso(cliente, id)
    const json = await sellent("/bi/orders?limit=20", token)
    const linhas = Array.isArray(json.data) ? (json.data as Registro[]) : []
    console.log(`bi_orders: ${linhas.length}`)
    await marcar("downloading", linhas.length, true)
    const recentes = linhas.map((linha) => ({
      code: texto(linha.code),
      prevision: texto(linha.prevision_date),
      tracking: texto(linha.tracking_id),
    }))
    for (let i = 0; i < recentes.length; i += 40) {
      const lote = recentes.slice(i, i + 40)
      const { error } = await cliente.from("stg_bi_orders").insert(lote)
      if (error) throw new Error(`stg_bi_orders: ${error.message.slice(0, 180)}`)
    }
    await marcar("promoting", linhas.length, true)
    return { rpc: "promote_bi_orders", stats: { linhas_lidas: linhas.length } }
  })
}

main().catch((erro) => {
  const mensagem = erro instanceof Error ? erro.message : "erro desconhecido"
  console.error(mensagem.includes("<html") ? "falha na coleta: gateway 502" : `falha na coleta: ${mensagem.slice(0, 240)}`)
  process.exit(1)
})
