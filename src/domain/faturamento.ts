import { calcularCoberturaFiscal } from "@/domain/cobertura-fiscal"
import { contarStatusFaturadoSemNota } from "@/domain/fiscal"
import { mesLocal } from "@/domain/painel"
import type { ResumoPainel } from "@/domain/painel"
import type { PedidoLista } from "@/domain/pedidos"
import type { FaturaLista } from "@/lib/pedidos/ler"
import type { FatiaComposicao } from "@/domain/acompanhamento"

export type ResumoFaturamento = {
  quantidadeNotas: number
  valorFaturado: number
  coberturaPercentual: number | null
  pedidosSemNota: number
  gapValor: number
}

export type AgregadoPedidoFatura = {
  pedidoId: number
  quantidadeNotas: number
  valorNotas: number
  ultimaData: string | null
  ultimoCredito: string | null
}

export type SituacaoFiscal = "sem_nota" | "com_nota" | "gap"

export type LinhaPedidoFatura = {
  pedidoId: number
  codigo: string
  cliente: string | null
  valorPedido: number | null
  valorNotas: number
  ultimaNota: string | null
  situacao: SituacaoFiscal
  credito: string | null
}

export type FaturaRecente = {
  id: number
  pedidoId: number
  pedidoRotulo: string
  cliente: string | null
  numero: string | null
  valor: number | null
  meta: string
  creditStatus: string | null
  badgeTom: TomCredito
  badgeRotulo: string
}

export type TomCredito = "success" | "warning" | "danger" | "neutral"

export type FiltroFaturamento = {
  texto: string
  situacao: "" | SituacaoFiscal
  credito: string
}

const CORES_DONUT = ["#176b56", "#4b88d8", "#e7ad52", "#d9e0e8", "#b43b42"] as const
const GAP_TOLERANCIA = 0.01

export function filtroFaturamentoInicial(): FiltroFaturamento {
  return { texto: "", situacao: "", credito: "" }
}

export function filtroFaturamentoDaBusca(busca: string): FiltroFaturamento {
  const params = new URLSearchParams(busca.startsWith("?") ? busca.slice(1) : busca)
  const situacao = params.get("situacao")
  return {
    texto: params.get("q") ?? "",
    situacao: situacao === "sem_nota" || situacao === "com_nota" || situacao === "gap" ? situacao : "",
    credito: params.get("credito") ?? "",
  }
}

export function buscaDoFiltroFaturamento(filtro: FiltroFaturamento) {
  const params = new URLSearchParams()
  if (filtro.texto) params.set("q", filtro.texto)
  if (filtro.situacao) params.set("situacao", filtro.situacao)
  if (filtro.credito) params.set("credito", filtro.credito)
  const texto = params.toString()
  return texto ? `?${texto}` : ""
}

export function agregarNotasPorPedido(faturas: readonly FaturaLista[]): Map<number, AgregadoPedidoFatura> {
  const mapa = new Map<number, AgregadoPedidoFatura>()
  for (const fatura of faturas) {
    const atual = mapa.get(fatura.pedidoId)
    const valor = fatura.valor ?? 0
    if (!atual) {
      mapa.set(fatura.pedidoId, {
        pedidoId: fatura.pedidoId,
        quantidadeNotas: 1,
        valorNotas: valor,
        ultimaData: fatura.data,
        ultimoCredito: fatura.creditStatus,
      })
      continue
    }
    atual.quantidadeNotas += 1
    atual.valorNotas += valor
    if ((fatura.data ?? "") > (atual.ultimaData ?? "")) {
      atual.ultimaData = fatura.data
      atual.ultimoCredito = fatura.creditStatus
    }
  }
  return mapa
}

export function resumirFaturamento(
  pedidos: readonly PedidoLista[],
  faturas: readonly FaturaLista[],
  mesFoco: string,
  resumo: ResumoPainel,
): ResumoFaturamento {
  const agregado = agregarNotasPorPedido(faturas)
  const pedidosComNota = new Set(agregado.keys())
  const cobertura = calcularCoberturaFiscal(resumo)
  return {
    quantidadeNotas: faturas.length,
    valorFaturado: cobertura.valorFaturado,
    coberturaPercentual: cobertura.coberturaPercentual,
    pedidosSemNota: contarStatusFaturadoSemNota(pedidos, pedidosComNota, mesFoco),
    gapValor: cobertura.gapValor,
  }
}

export function linhasPedidoFatura(
  pedidos: readonly PedidoLista[],
  agregado: Map<number, AgregadoPedidoFatura>,
  mesFoco: string,
): LinhaPedidoFatura[] {
  return pedidos
    .filter((p) => !p.apagadoEm && mesLocal(p.dataPedido) === mesFoco)
    .map((pedido) => {
      const notas = agregado.get(pedido.id)
      const valorPedido = pedido.valor
      const valorNotas = notas?.valorNotas ?? 0
      let situacao: SituacaoFiscal = "sem_nota"
      if (notas && valorNotas > 0) {
        situacao = temGap(valorPedido, valorNotas) ? "gap" : "com_nota"
      }
      return {
        pedidoId: pedido.id,
        codigo: pedido.codigo ?? String(pedido.id),
        cliente: pedido.cliente ?? pedido.loja,
        valorPedido,
        valorNotas,
        ultimaNota: notas?.ultimaData ?? null,
        situacao,
        credito: notas?.ultimoCredito ?? null,
      }
    })
    .sort((a, b) => (b.ultimaNota ?? "").localeCompare(a.ultimaNota ?? "") || b.pedidoId - a.pedidoId)
}

export function filtrarLinhasFaturamento(linhas: readonly LinhaPedidoFatura[], filtro: FiltroFaturamento) {
  const texto = normalizar(filtro.texto)
  return linhas.filter((linha) => {
    if (filtro.situacao && linha.situacao !== filtro.situacao) return false
    if (filtro.credito && (linha.credito ?? "") !== filtro.credito) return false
    if (texto) {
      const alvo = [linha.codigo, linha.cliente].map(normalizar).join("\n")
      if (!alvo.includes(texto)) return false
    }
    return true
  })
}

export function opcoesCredito(faturas: readonly FaturaLista[]) {
  const set = new Set<string>()
  for (const f of faturas) {
    const s = f.creditStatus?.trim()
    if (s) set.add(s)
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"))
}

export function faturasRecentes(faturas: readonly FaturaLista[], pedidos: readonly PedidoLista[], limite = 3): FaturaRecente[] {
  const mapa = new Map(pedidos.map((p) => [p.id, p]))
  return [...faturas]
    .filter((f) => f.data)
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "") || b.id - a.id)
    .slice(0, limite)
    .map((fatura) => {
      const pedido = mapa.get(fatura.pedidoId)
      const badge = rotuloCredito(fatura.creditStatus)
      return {
        id: fatura.id,
        pedidoId: fatura.pedidoId,
        pedidoRotulo: pedido?.codigo ?? String(fatura.pedidoId),
        cliente: pedido?.cliente ?? pedido?.loja ?? null,
        numero: fatura.numero,
        valor: fatura.valor,
        meta: fatura.data ? `Emitida em ${formatarData(fatura.data)}` : "—",
        creditStatus: fatura.creditStatus,
        badgeTom: badge.tom,
        badgeRotulo: badge.rotulo,
      }
    })
}

export function composicaoCredito(faturas: readonly FaturaLista[]): { total: number; fatias: FatiaComposicao[] } {
  const mapa = new Map<string, number>()
  for (const f of faturas) {
    const rotulo = f.creditStatus?.trim() || "Sem status"
    mapa.set(rotulo, (mapa.get(rotulo) ?? 0) + 1)
  }
  const total = faturas.length
  if (total === 0) return { total: 0, fatias: [] }
  const ordenado = [...mapa.entries()].sort((a, b) => b[1] - a[1])
  const top = ordenado.slice(0, 4)
  const resto = ordenado.slice(4).reduce((s, [, q]) => s + q, 0)
  const fatias: FatiaComposicao[] = top.map(([rotulo, quantidade], indice) => ({
    rotulo,
    quantidade,
    percentual: (quantidade / total) * 100,
    cor: CORES_DONUT[indice % CORES_DONUT.length],
  }))
  if (resto > 0) {
    fatias.push({ rotulo: "Outros", quantidade: resto, percentual: (resto / total) * 100, cor: CORES_DONUT[3] })
  }
  return { total, fatias }
}

export function rotuloCredito(status: string | null | undefined): { rotulo: string; tom: TomCredito } {
  const bruto = status?.trim()
  if (!bruto) return { rotulo: "Sem status", tom: "neutral" }
  const upper = bruto.toUpperCase()
  if (upper.includes("LIBER") || upper.includes("APROV") || upper.includes("PAGO") || upper.includes("OK")) {
    return { rotulo: bruto, tom: "success" }
  }
  if (upper.includes("BLOQ") || upper.includes("RECUS") || upper.includes("NEG") || upper.includes("CANCEL")) {
    return { rotulo: bruto, tom: "danger" }
  }
  if (upper.includes("PEND") || upper.includes("ANÁLISE") || upper.includes("ANALISE") || upper.includes("AGUARD")) {
    return { rotulo: bruto, tom: "warning" }
  }
  return { rotulo: bruto, tom: "neutral" }
}

export function rotuloSituacao(situacao: SituacaoFiscal) {
  if (situacao === "sem_nota") return "Sem nota"
  if (situacao === "gap") return "Gap valor"
  return "Com nota"
}

function temGap(valorPedido: number | null, valorNotas: number) {
  if (valorPedido == null || valorPedido <= 0) return false
  return valorNotas + GAP_TOLERANCIA < valorPedido
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-")
  if (!dia) return data
  return `${dia}/${mes}/${String(ano).slice(2)}`
}

function normalizar(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
}
