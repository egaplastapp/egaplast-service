import { PAGINA_LISTA, TETO_LISTA, type PedidoLista } from "@/domain/pedidos"
import type { papelAtual } from "@/lib/supabase/servidor"

export type Supabase = Awaited<ReturnType<typeof papelAtual>>["supabase"]

export type Nota = {
  id: number
  pedidoId: number
  numero: string | null
  data: string | null
  valor: number | null
}

export type FaturaLista = {
  id: number
  pedidoId: number
  numero: string | null
  data: string | null
  valor: number | null
  creditStatus: string | null
  erpNumero: string | null
}

export type Intervalo = { desde: string; ate: string }

const COLUNAS =
  "id, code, erp_number, erp_rejection, amount_final, is_canceled, deleted_at, updated_at, order_date, address_state, buyer_name, order_statuses(name, color), customers(name), sellers(name)"

type Relacao<T> = T | T[] | null

type LinhaBruta = {
  id: number
  code: string | null
  erp_number: string | null
  erp_rejection: string | null
  amount_final: number | string | null
  is_canceled: boolean | null
  deleted_at: string | null
  updated_at: string | null
  order_date: string | null
  address_state: string | null
  buyer_name: string | null
  order_statuses: Relacao<{ name: string | null; color: string | null }>
  customers: Relacao<{ name: string | null }>
  sellers: Relacao<{ name: string | null }>
}

type NotaBruta = {
  id: number
  order_id: number
  invoice_number: string | null
  date: string | null
  value: number | string | null
}

type FaturaBruta = NotaBruta & {
  credit_status: string | null
  erp_number: string | null
}

// intervalo em order_date: desde inclusivo, ate exclusivo
export async function lerPedidos(supabase: Supabase, intervalo?: Intervalo) {
  const pedidos: PedidoLista[] = []
  for (let inicio = 0; inicio < TETO_LISTA; inicio += PAGINA_LISTA) {
    let consulta = supabase.from("orders").select(COLUNAS)
    if (intervalo) consulta = consulta.gte("order_date", intervalo.desde).lt("order_date", intervalo.ate)
    const { data, error } = await consulta
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(inicio, inicio + PAGINA_LISTA - 1)
    if (error) return { pedidos: [] as PedidoLista[], truncado: false, erro: error.message }
    const lote = ((data ?? []) as LinhaBruta[]).map(mapear)
    pedidos.push(...lote)
    if (lote.length < PAGINA_LISTA) return { pedidos, truncado: false, erro: null }
  }

  let contagem = supabase.from("orders").select("id", { count: "exact", head: true })
  if (intervalo) contagem = contagem.gte("order_date", intervalo.desde).lt("order_date", intervalo.ate)
  const { count, error } = await contagem
  if (error) return { pedidos, truncado: true, erro: null }
  return { pedidos, truncado: (count ?? 0) > TETO_LISTA, erro: null }
}

export type JanelaMovimento = { desde: string; ate?: string | null }

/** Pedidos distintos com ao menos um evento na réplica dentro da janela. */
export async function lerPedidosComEventos(supabase: Supabase, janela: JanelaMovimento) {
  const ids = await distinctOrderIdsComEventos(supabase, janela)
  if (ids.erro) return { pedidos: [] as PedidoLista[], truncado: false, erro: ids.erro }
  if (ids.ids.size === 0) return { pedidos: [], truncado: false, erro: null }
  return lerPedidosPorIds(supabase, [...ids.ids])
}

export async function contarPedidosComEventos(supabase: Supabase, janela: JanelaMovimento) {
  const ids = await distinctOrderIdsComEventos(supabase, janela, TETO_LISTA + 1)
  if (ids.erro) return { total: null as number | null, truncado: false, erro: ids.erro }
  const total = ids.ids.size
  return { total, truncado: total > TETO_LISTA, erro: null as string | null }
}

export async function contarPedidosPorDataPedido(supabase: Supabase, desde: string, ateExclusivo: string) {
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .gte("order_date", desde)
    .lt("order_date", ateExclusivo)
  if (error) return { total: null, erro: error.message }
  return { total: count ?? 0, erro: null as string | null }
}

async function distinctOrderIdsComEventos(supabase: Supabase, janela: JanelaMovimento, teto = TETO_LISTA) {
  const ids = new Set<number>()
  for (let inicio = 0; inicio < teto * 4; inicio += PAGINA_LISTA) {
    let consulta = supabase
      .from("order_events")
      .select("order_id")
      .gte("observed_at", janela.desde)
      .order("observed_at", { ascending: false })
    if (janela.ate) consulta = consulta.lte("observed_at", janela.ate)
    const { data, error } = await consulta.range(inicio, inicio + PAGINA_LISTA - 1)
    if (error) return { ids: new Set<number>(), erro: error.message }
    const lote = data ?? []
    for (const linha of lote) {
      const id = Number(linha.order_id)
      if (Number.isFinite(id)) ids.add(id)
      if (ids.size >= teto) break
    }
    if (ids.size >= teto || lote.length < PAGINA_LISTA) break
  }
  return { ids, erro: null as string | null }
}

async function lerPedidosPorIds(supabase: Supabase, ids: number[]) {
  const pedidos: PedidoLista[] = []
  const ordenados = [...ids].sort((a, b) => b - a)
  for (let i = 0; i < ordenados.length && pedidos.length < TETO_LISTA; i += PAGINA_LISTA) {
    const loteIds = ordenados.slice(i, i + PAGINA_LISTA)
    const { data, error } = await supabase.from("orders").select(COLUNAS).in("id", loteIds)
    if (error) return { pedidos: [] as PedidoLista[], truncado: false, erro: error.message }
    pedidos.push(...((data ?? []) as LinhaBruta[]).map(mapear))
  }
  pedidos.sort((a, b) => (b.atualizadoEm ?? "").localeCompare(a.atualizadoEm ?? "") || b.id - a.id)
  return { pedidos, truncado: ids.length > TETO_LISTA, erro: null }
}

// intervalo na data da nota (AAAA-MM-DD): desde inclusivo, ate exclusivo
export async function lerNotas(supabase: Supabase, intervalo?: Intervalo) {
  const notas: Nota[] = []
  for (let inicio = 0; inicio < TETO_LISTA; inicio += PAGINA_LISTA) {
    let consulta = supabase.from("invoices").select('id, order_id, invoice_number, "date", value')
    if (intervalo) consulta = consulta.gte("date", intervalo.desde).lt("date", intervalo.ate)
    const { data, error } = await consulta.order("id", { ascending: true }).range(inicio, inicio + PAGINA_LISTA - 1)
    if (error) return { notas: [] as Nota[], erro: error.message }
    const lote = ((data ?? []) as NotaBruta[]).map((linha) => ({
      id: Number(linha.id),
      pedidoId: Number(linha.order_id),
      numero: texto(linha.invoice_number),
      data: linha.date,
      valor: numero(linha.value),
    }))
    notas.push(...lote)
    if (lote.length < PAGINA_LISTA) break
  }
  return { notas, erro: null }
}

// intervalo na data da nota (AAAA-MM-DD): desde inclusivo, ate exclusivo
export async function lerFaturas(supabase: Supabase, intervalo?: Intervalo) {
  const faturas: FaturaLista[] = []
  for (let inicio = 0; inicio < TETO_LISTA; inicio += PAGINA_LISTA) {
    let consulta = supabase
      .from("invoices")
      .select('id, order_id, invoice_number, "date", value, credit_status, erp_number')
    if (intervalo) consulta = consulta.gte("date", intervalo.desde).lt("date", intervalo.ate)
    const { data, error } = await consulta.order("date", { ascending: false }).order("id", { ascending: false }).range(inicio, inicio + PAGINA_LISTA - 1)
    if (error) return { faturas: [] as FaturaLista[], truncado: false, erro: error.message }
    const lote = ((data ?? []) as FaturaBruta[]).map(mapearFatura)
    faturas.push(...lote)
    if (lote.length < PAGINA_LISTA) return { faturas, truncado: false, erro: null }
  }

  let contagem = supabase.from("invoices").select("id", { count: "exact", head: true })
  if (intervalo) contagem = contagem.gte("date", intervalo.desde).lt("date", intervalo.ate)
  const { count, error } = await contagem
  if (error) return { faturas, truncado: true, erro: null }
  return { faturas, truncado: (count ?? 0) > TETO_LISTA, erro: null }
}

/** Mescla linhas paginadas de `invoices` num set de `order_id` (função pura para teste). */
export function distinctOrderIdsDePaginas(paginas: readonly { order_id: number }[][]) {
  const ids = new Set<number>()
  for (const pagina of paginas) {
    for (const linha of pagina) {
      const id = Number(linha.order_id)
      if (Number.isFinite(id)) ids.add(id)
    }
  }
  return ids
}

/** Pedidos com ao menos uma nota na réplica (distinct order_id em toda a tabela). */
export async function lerIdsPedidosComNota(supabase: Supabase) {
  const ids = new Set<number>()
  let inicio = 0
  for (;;) {
    const { data, error } = await supabase
      .from("invoices")
      .select("order_id")
      .order("order_id", { ascending: true })
      .order("id", { ascending: true })
      .range(inicio, inicio + PAGINA_LISTA - 1)
    if (error) return { ids: new Set<number>(), erro: error.message }
    const lote = (data ?? []) as { order_id: number }[]
    for (const linha of lote) {
      const id = Number(linha.order_id)
      if (Number.isFinite(id)) ids.add(id)
    }
    if (lote.length < PAGINA_LISTA) break
    inicio += PAGINA_LISTA
  }
  return { ids, erro: null as string | null }
}

function mapearFatura(linha: FaturaBruta): FaturaLista {
  return {
    id: Number(linha.id),
    pedidoId: Number(linha.order_id),
    numero: texto(linha.invoice_number),
    data: linha.date,
    valor: numero(linha.value),
    creditStatus: texto(linha.credit_status),
    erpNumero: texto(linha.erp_number),
  }
}

function mapear(linha: LinhaBruta): PedidoLista {
  const status = um(linha.order_statuses)
  const loja = um(linha.customers)
  const vendedor = um(linha.sellers)
  return {
    id: linha.id,
    codigo: texto(linha.code),
    erpNumero: texto(linha.erp_number),
    erpRecusa: texto(linha.erp_rejection),
    valor: numero(linha.amount_final),
    cancelado: linha.is_canceled === true,
    apagadoEm: linha.deleted_at,
    atualizadoEm: linha.updated_at,
    dataPedido: linha.order_date,
    uf: uf(linha.address_state),
    cliente: texto(linha.buyer_name),
    status: texto(status?.name),
    corStatus: texto(status?.color),
    loja: texto(loja?.name),
    vendedor: texto(vendedor?.name),
  }
}

function um<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null
  return valor ?? null
}

function texto(valor: string | null | undefined) {
  const limpo = valor?.trim()
  return limpo ? limpo : null
}

function uf(valor: string | null) {
  const limpo = texto(valor)
  if (!limpo) return null
  return limpo.length <= 3 ? limpo.toUpperCase() : limpo
}

function numero(valor: number | string | null) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null
  if (typeof valor === "string" && valor.trim()) {
    const n = Number(valor)
    return Number.isFinite(n) ? n : null
  }
  return null
}
