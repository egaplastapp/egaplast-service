import { classificarErpId } from "@/domain/erp"

export type Registro = Record<string, unknown>

export type Entidade = {
  id: number
  code: string | null
  name: string | null
  payload: Registro
}

export type Customer = Entidade & {
  erp_id: string | null
  doc_number: string | null
  email: string | null
  phone: string | null
  segment_id: number | null
}

export type Contact = {
  id: number
  name: string | null
  email: string | null
  phone: string | null
  payload: Registro
}

export type Product = {
  id: number
  code: string | null
  name: string | null
  measure_unit: string | null
  payload: Registro
}

export type OrderItem = {
  id: number
  order_id: number
  product_id: number | null
  code: string | null
  name: string | null
  quantity: number | null
  unit_price: number | null
  total_price: number | null
  measure_unit: string | null
  notes: string | null
  payload: Registro
}

export type OrderRow = {
  id: number
  code: string | null
  status_id: number | null
  customer_id: number | null
  seller_id: number | null
  sellent_user_id: number | null
  company_id: number | null
  order_type_id: number | null
  payment_method_id: number | null
  payment_term_id: number | null
  partner_id: number | null
  origin_id: number | null
  document_type_id: number | null
  sales_office_id: number | null
  erp_id: string | null
  erp_number: string | null
  erp_rejection: string | null
  is_integrated: boolean
  is_canceled: boolean
  deleted_at: string | null
  created_at: string | null
  updated_at: string | null
  order_date: string | null
  amount: number | null
  amount_final: number | null
  total_products: number | null
  buyer_name: string | null
  buyer_email: string | null
  buyer_phone: string | null
  buyer_mobile: string | null
  doc_type: string | null
  doc_number: string | null
  address_city: string | null
  address_state: string | null
  address_zipcode: string | null
  address_street: string | null
  address_number: string | null
  address_district: string | null
  sales_office: string | null
  prevision: string | null
  tracking: string | null
  payload: Registro
}

export type PedidoMapeado = {
  order: OrderRow
  items: OrderItem[]
  products: Product[]
  contacts: Contact[]
  customers: Customer[]
  segments: Entidade[]
  statuses: Entidade[]
  sellers: Entidade[]
  sellentUsers: Entidade[]
  companies: Entidade[]
  orderTypes: Entidade[]
  paymentMethods: Entidade[]
  paymentTerms: Entidade[]
  partners: Entidade[]
  origins: Entidade[]
  documentTypes: Entidade[]
  salesOffices: Entidade[]
}

export function texto(valor: unknown): string | null {
  if (valor == null) return null
  const saida = String(valor).trim()
  return saida ? saida : null
}

export function numero(valor: unknown): number | null {
  if (valor == null || valor === "") return null
  const n = typeof valor === "number" ? valor : Number(valor)
  return Number.isFinite(n) ? n : null
}

export function inteiro(valor: unknown): number | null {
  const n = numero(valor)
  return n == null ? null : Math.trunc(n)
}

/** Sem fuso no texto, o instante é lido como UTC. A amostra do Sellent foi conferida em UTC. */
export function dataIso(valor: unknown): string | null {
  const bruto = texto(valor)
  if (!bruto) return null
  const comFuso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(bruto) ? bruto : `${bruto.replace(" ", "T")}Z`
  const data = new Date(comFuso)
  return Number.isNaN(data.getTime()) ? null : data.toISOString()
}

export function flag(valor: unknown): boolean {
  return valor === 1 || valor === true || valor === "1"
}

export function erpDaChave(key: string | null): string | null {
  if (!key) return null
  return classificarErpId(key.split("_")[0] ?? "").erpNumero
}

function objeto(valor: unknown): Registro | null {
  if (valor && typeof valor === "object" && !Array.isArray(valor)) return valor as Registro
  return null
}

function entidade(valor: unknown, nomeAlternativo?: string): Entidade | null {
  const o = objeto(valor)
  const id = inteiro(o?.id)
  if (!o || id == null) return null
  return {
    id,
    code: texto(o.code),
    name: texto(o.name) ?? (nomeAlternativo ? texto(o[nomeAlternativo]) : null),
    payload: o,
  }
}

function clienteDe(valor: unknown): { customer: Customer; segment: Entidade | null } | null {
  const o = objeto(valor)
  const id = inteiro(o?.id)
  if (!o || id == null) return null
  const segmentId = inteiro(o.segment_id)
  return {
    customer: {
      id,
      code: texto(o.code),
      name: texto(o.name),
      erp_id: texto(o.erp_id),
      doc_number: texto(o.doc_number),
      email: texto(o.email_1) ?? texto(o.email),
      phone: texto(o.phone_number_1) ?? texto(o.phone),
      segment_id: segmentId,
      payload: o,
    },
    segment: segmentId == null
      ? null
      : {
          id: segmentId,
          code: texto(o.segment_code),
          name: texto(objeto(o.segment)?.name),
          payload: objeto(o.segment) ?? { id: segmentId, code: o.segment_code },
        },
  }
}

export function mapearPedido(bruto: Registro): PedidoMapeado | null {
  const id = inteiro(bruto.id)
  if (id == null) return null

  const status = entidade(bruto.status)
  const loja = clienteDe(bruto.store)
  const loja2 = clienteDe(bruto.store2)
  const seller = entidade(bruto.seller)
  const user = entidade(bruto.user)
  const company = entidade(bruto.company)
  const orderType = entidade(bruto.order_type)
  const paymentMethod = entidade(bruto.payment_method)
  const paymentTerm = entidade(bruto.payment_term, "description")
  const partner = entidade(bruto.partner)
  const origin = entidade(bruto.origin)
  const documentType = entidade(bruto.document_type)
  const salesOffice = entidade(bruto.sales_office)
  const erp = classificarErpId(bruto.erp_id)

  const products: Product[] = []
  const items: OrderItem[] = []
  for (const linha of Array.isArray(bruto.products) ? bruto.products : []) {
    const item = objeto(linha)
    const itemId = inteiro(item?.id)
    if (!item || itemId == null) continue
    const productId = inteiro(item.product_id)
    if (productId != null) {
      products.push({
        id: productId,
        code: texto(item.code),
        name: texto(item.name),
        measure_unit: texto(item.measure_unit),
        payload: { id: productId, code: item.code, name: item.name, measure_unit: item.measure_unit },
      })
    }
    items.push({
      id: itemId,
      order_id: id,
      product_id: productId,
      code: texto(item.code),
      name: texto(item.name),
      quantity: numero(item.quantity),
      unit_price: numero(item.unit_price),
      total_price: numero(item.total_price),
      measure_unit: texto(item.measure_unit),
      notes: texto(item.notes),
      payload: item,
    })
  }

  const contacts: Contact[] = []
  for (const linha of Array.isArray(bruto.contacts) ? bruto.contacts : []) {
    const contato = objeto(linha)
    const contactId = inteiro(contato?.id)
    if (!contato || contactId == null) continue
    contacts.push({
      id: contactId,
      name: texto(contato.name),
      email: texto(contato.email_1),
      phone: texto(contato.phone_1) ?? texto(contato.cellphone_1),
      payload: contato,
    })
  }

  return {
    order: {
      id,
      code: texto(bruto.code),
      status_id: status?.id ?? null,
      customer_id: loja?.customer.id ?? null,
      seller_id: seller?.id ?? null,
      sellent_user_id: user?.id ?? null,
      company_id: company?.id ?? null,
      order_type_id: orderType?.id ?? null,
      payment_method_id: paymentMethod?.id ?? null,
      payment_term_id: paymentTerm?.id ?? null,
      partner_id: partner?.id ?? null,
      origin_id: origin?.id ?? null,
      document_type_id: documentType?.id ?? null,
      sales_office_id: salesOffice?.id ?? null,
      erp_id: texto(bruto.erp_id),
      erp_number: erp.erpNumero,
      erp_rejection: erp.erpRecusa,
      is_integrated: flag(bruto.is_integrated),
      is_canceled: flag(bruto.is_canceled),
      deleted_at: dataIso(bruto.deleted_at),
      created_at: dataIso(bruto.created_at),
      updated_at: dataIso(bruto.updated_at),
      order_date: dataIso(bruto.order_date),
      amount: numero(bruto.amount),
      amount_final: numero(bruto.amount_final),
      total_products: numero(bruto.total_products),
      buyer_name: texto(bruto.buyer_name),
      buyer_email: texto(bruto.buyer_email),
      buyer_phone: texto(bruto.buyer_phone_number),
      buyer_mobile: texto(bruto.buyer_mobile_number),
      doc_type: texto(bruto.doc_type),
      doc_number: texto(bruto.doc_number),
      address_city: texto(bruto.address_city),
      address_state: texto(bruto.address_state),
      address_zipcode: texto(bruto.address_zipcode),
      address_street: texto(bruto.address_street),
      address_number: texto(bruto.address_number),
      address_district: texto(bruto.address_district),
      sales_office: salesOffice ? null : texto(bruto.sales_office),
      prevision: texto(bruto.prevision),
      tracking: texto(bruto.tracking_code) ?? texto(bruto.tracking_id),
      payload: bruto,
    },
    items,
    products,
    contacts,
    customers: [loja?.customer, loja2?.customer].filter((item): item is Customer => item != null),
    segments: [loja?.segment, loja2?.segment].filter((item): item is Entidade => item != null),
    statuses: status ? [status] : [],
    sellers: seller ? [seller] : [],
    sellentUsers: user ? [user] : [],
    companies: company ? [company] : [],
    orderTypes: orderType ? [orderType] : [],
    paymentMethods: paymentMethod ? [paymentMethod] : [],
    paymentTerms: paymentTerm ? [paymentTerm] : [],
    partners: partner ? [partner] : [],
    origins: origin ? [origin] : [],
    documentTypes: documentType ? [documentType] : [],
    salesOffices: salesOffice ? [salesOffice] : [],
  }
}

export type PendenciaMapeada = {
  id: number
  order_id: number | null
  approval_type: string | null
  reason: string | null
  profile_approval: string | null
  status: string | null
  ready_to_approval: boolean
  who_approval: string | null
  date_approval: string | null
  created_at: string | null
  payload: Registro
}

export function mapearPendencia(bruto: Registro): PendenciaMapeada | null {
  const id = inteiro(bruto.id)
  if (id == null) return null
  const order = objeto(bruto.order)
  return {
    id,
    order_id: inteiro(bruto.order_id) ?? inteiro(order?.id),
    approval_type: texto(bruto.approval_type),
    reason: texto(bruto.reason),
    profile_approval: texto(bruto.profile_approval),
    status: texto(bruto.status),
    ready_to_approval: flag(bruto.ready_to_approval),
    who_approval: texto(bruto.who_approval),
    date_approval: dataIso(bruto.date_approval),
    created_at: dataIso(bruto.created_at),
    payload: bruto,
  }
}

export type FaturaMapeada = {
  id: number
  key: string | null
  order_id: number | null
  erp_number: string | null
  invoice_number: string | null
  date: string | null
  value: number | null
  credit_status: string | null
  payload: Registro
  items: {
    id: number
    invoice_id: number
    product_name: string | null
    qty: number | null
    net_value: number | null
    payload: Registro
  }[]
  seller: Entidade | null
  customer: Customer | null
  segment: Entidade | null
}

export function mapearFatura(bruto: Registro): FaturaMapeada | null {
  const id = inteiro(bruto.id)
  if (id == null) return null
  const order = objeto(bruto.order)
  const loja = clienteDe(bruto.store)
  const segment = entidade(objeto(bruto.segment))
  const key = texto(bruto.key)
  const items = []
  for (const linha of Array.isArray(bruto.items) ? bruto.items : []) {
    const item = objeto(linha)
    const itemId = inteiro(item?.id)
    if (!item || itemId == null) continue
    const produto = objeto(item.product)
    items.push({
      id: itemId,
      invoice_id: id,
      product_name: texto(produto?.name),
      qty: numero(item.qty),
      net_value: numero(item.net_value) ?? numero(item.item_net_value),
      payload: item,
    })
  }
  const { items: _itens, ...cabeca } = bruto
  return {
    id,
    key,
    order_id: inteiro(bruto.order_id) ?? inteiro(order?.id),
    erp_number: erpDaChave(key),
    invoice_number: texto(bruto.invoice_number),
    date: texto(bruto.date)?.slice(0, 10) ?? null,
    value: numero(bruto.value),
    credit_status: texto(bruto.credit_status),
    payload: cabeca,
    items,
    seller: entidade(bruto.seller),
    customer: loja?.customer ?? null,
    segment: segment ?? loja?.segment ?? null,
  }
}
