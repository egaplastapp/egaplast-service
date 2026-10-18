import { numero, texto } from "@/lib/sellent/mapear"

export type EnderecoComercial = {
  rua: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
}

export type Parcela = {
  numero: number | null
  prazo: string | null
  valor: number | null
}

export type Comercial = {
  tabela: string | null
  observacao: string | null
  comissao: number | null
  comissaoPercentual: number | null
  mercadoria: number | null
  substituicao: number | null
  ipi: number | null
  frete: number | null
  freteTexto: string | null
  pesoBruto: number | null
  pesoLiquido: number | null
  cubagem: number | null
  parcelas: Parcela[]
  entrega: EnderecoComercial
  transportadora: string | null
}

export type ImpostosItem = {
  descontoPercentual: number | null
  icms: number | null
  ipi: number | null
  substituicao: number | null
  deposito: string | null
}

const ENDERECO_VAZIO: EnderecoComercial = {
  rua: null,
  numero: null,
  complemento: null,
  bairro: null,
  cidade: null,
  uf: null,
  cep: null,
}

function registro(valor: unknown): Record<string, unknown> | null {
  if (valor && typeof valor === "object" && !Array.isArray(valor)) return valor as Record<string, unknown>
  return null
}

function endereco(origem: Record<string, unknown>, sufixo: "" | "_delivery"): EnderecoComercial {
  return {
    rua: texto(origem[`address_street${sufixo}`]),
    numero: texto(origem[`address_number${sufixo}`]),
    complemento: texto(origem[`address_more${sufixo}`]),
    bairro: texto(origem[`address_district${sufixo}`]),
    cidade: texto(origem[`address_city${sufixo}`]),
    uf: texto(origem[`address_state${sufixo}`]),
    cep: texto(origem[`address_zipcode${sufixo}`]),
  }
}

function transportadoraDe(valor: unknown): string | null {
  if (typeof valor === "string") return texto(valor)
  const o = registro(valor)
  if (!o) return null
  return texto(o.name) ?? texto(o.code)
}

function parcelasDe(prazo: unknown): Parcela[] {
  const o = registro(prazo)
  if (!Array.isArray(o?.parcelas)) return []
  return o.parcelas.flatMap((linha) => {
    const parcela = registro(linha)
    if (!parcela) return []
    return [{ numero: numero(parcela.parcela), prazo: texto(parcela.term), valor: numero(parcela.valor) }]
  })
}

export function comercialDoPayload(payload: unknown): Comercial {
  const o = registro(payload)
  if (!o) {
    return {
      tabela: null,
      observacao: null,
      comissao: null,
      comissaoPercentual: null,
      mercadoria: null,
      substituicao: null,
      ipi: null,
      frete: null,
      freteTexto: null,
      pesoBruto: null,
      pesoLiquido: null,
      cubagem: null,
      parcelas: [],
      entrega: ENDERECO_VAZIO,
      transportadora: null,
    }
  }
  return {
    tabela: texto(o.price_table_id_order),
    observacao: texto(o.obs),
    comissao: numero(o.commission),
    comissaoPercentual: numero(o.commission_percentage),
    mercadoria: numero(o.value_mer),
    substituicao: numero(o.st_total),
    ipi: numero(o.ipi_total),
    frete: numero(o.shipping_cost),
    freteTexto: texto(o.freight_text),
    pesoBruto: numero(o.weight),
    pesoLiquido: numero(o.net_weight),
    cubagem: numero(o.cubage),
    parcelas: parcelasDe(o.payment_term),
    entrega: endereco(o, "_delivery"),
    transportadora: transportadoraDe(o.transport_company),
  }
}

/** O BI manda `net_value` zerado e o valor da linha em `gross_value`. */
export function valorItemNota(payload: unknown): { unitario: number | null; total: number | null } {
  const o = registro(payload)
  return {
    unitario: numero(o?.item_value),
    total: numero(o?.gross_value) ?? numero(o?.item_net_value) ?? numero(o?.net_value),
  }
}

export function impostosDoItem(payload: unknown): ImpostosItem {
  const o = registro(payload)
  return {
    descontoPercentual: numero(o?.discount_percentage),
    icms: numero(o?.icms_value),
    ipi: numero(o?.ipi_value),
    substituicao: numero(o?.st_value),
    deposito: texto(o?.stock_place_code),
  }
}

/** Ordem das linhas como o Sellent devolveu em `products`. */
export function ordemDosItens(payload: unknown): number[] {
  const products = registro(payload)?.products
  if (!Array.isArray(products)) return []
  const ids: number[] = []
  for (const linha of products) {
    const id = numero(registro(linha)?.id)
    if (id != null) ids.push(Math.trunc(id))
  }
  return ids
}

export function ordenarItens<T extends { id: number }>(itens: readonly T[], ordem: readonly number[]): T[] {
  const posicao = new Map(ordem.map((id, indice) => [id, indice]))
  return [...itens].sort((a, b) => (posicao.get(a.id) ?? ordem.length) - (posicao.get(b.id) ?? ordem.length) || a.id - b.id)
}

/** Diferença entre mercadoria + substituição + IPI + frete e o valor final. Null se faltar uma parte. */
export function fechaValores(partes: {
  mercadoria: number | null
  substituicao: number | null
  ipi: number | null
  frete: number | null
  valorFinal: number | null
}): number | null {
  const { mercadoria, substituicao, ipi, frete, valorFinal } = partes
  if (mercadoria == null || substituicao == null || ipi == null || frete == null || valorFinal == null) return null
  return Math.round((mercadoria + substituicao + ipi + frete - valorFinal) * 100) / 100
}

export function enderecoPreenchido(endereco: EnderecoComercial) {
  return Object.values(endereco).some(Boolean)
}

/**
 * Previsão gravada como data. Meia-noite em UTC é dia de calendário, sem deslocar para Brasília.
 * Ano anterior a 2000 é a sentinela 1899 do Sellent e não entra na tela.
 */
export function previsaoExibivel(valor: string | null | undefined): string | null {
  const bruto = texto(valor)
  if (!bruto) return null
  const data = new Date(bruto)
  if (Number.isNaN(data.getTime())) return bruto
  if (data.getUTCFullYear() < 2000) return null
  if (data.getUTCHours() === 0 && data.getUTCMinutes() === 0 && data.getUTCSeconds() === 0) {
    const dia = String(data.getUTCDate()).padStart(2, "0")
    const mes = String(data.getUTCMonth() + 1).padStart(2, "0")
    return `${dia}/${mes}/${data.getUTCFullYear()}`
  }
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
}
