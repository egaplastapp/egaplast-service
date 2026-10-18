import { pedidosNoMes } from "@/domain/acompanhamento"
import type { ItemFilaOperacional } from "@/domain/painel"
import { inicioMes, ultimoDiaMes } from "@/domain/painel"
import type { PedidoLista } from "@/domain/pedidos"

export type PendenciaLista = {
  id: number
  orderId: number
  approvalType: string | null
  profileApproval: string | null
  status: string | null
  reason: string | null
}

export type ResumoPendencias = {
  totalAbertas: number
  pedidosComPendencia: number
  porTipo: { tipo: string; quantidade: number }[]
}

export function normalizarStatusPendencia(status: string | null | undefined) {
  return (status ?? "").trim().toLowerCase()
}

export function pendenciaAberta(pendencia: PendenciaLista) {
  const s = normalizarStatusPendencia(pendencia.status)
  return s === "pending" || s === "pendente"
}

export function resumirPendenciasAbertas(
  pendencias: readonly PendenciaLista[],
  pedidos: readonly PedidoLista[],
  mesFoco: string,
): ResumoPendencias {
  const idsMes = new Set(pedidosNoMes(pedidos, mesFoco).map((p) => p.id))
  const abertas = pendencias.filter((p) => pendenciaAberta(p) && idsMes.has(p.orderId))
  const mapa = new Map<string, number>()
  for (const item of abertas) {
    const tipo = item.approvalType?.trim() || "sem tipo"
    mapa.set(tipo, (mapa.get(tipo) ?? 0) + 1)
  }
  const porTipo = [...mapa.entries()]
    .map(([tipo, quantidade]) => ({ tipo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
  return {
    totalAbertas: abertas.length,
    pedidosComPendencia: new Set(abertas.map((p) => p.orderId)).size,
    porTipo,
  }
}

export function pedidosComPendenciaAberta(pendencias: readonly PendenciaLista[]) {
  const ids = new Set<number>()
  for (const p of pendencias) {
    if (pendenciaAberta(p)) ids.add(p.orderId)
  }
  return ids
}

export function pendenciasPorPedido(pendencias: readonly PendenciaLista[]) {
  const mapa = new Map<number, PendenciaLista[]>()
  for (const item of pendencias) {
    if (!pendenciaAberta(item)) continue
    const lista = mapa.get(item.orderId) ?? []
    lista.push(item)
    mapa.set(item.orderId, lista)
  }
  return mapa
}

export function rotuloPendencia(pendencia: PendenciaLista) {
  const tipo = pendencia.approvalType?.trim() || "pendência"
  const perfil = pendencia.profileApproval?.trim()
  return perfil ? `${tipo} · ${perfil}` : tipo
}

export function itemFilaPendencias(resumo: ResumoPendencias, mesFoco: string): ItemFilaOperacional | null {
  if (resumo.pedidosComPendencia <= 0) return null
  const de = inicioMes(mesFoco)
  const ate = ultimoDiaMes(mesFoco)
  return {
    id: "pendencias",
    cor: "#4b88d8",
    contagem: resumo.pedidosComPendencia,
    rotulo: `pendência${resumo.pedidosComPendencia === 1 ? "" : "s"} aberta${resumo.pedidosComPendencia === 1 ? "" : "s"} no Sellent`,
    href: `/pedidos?pendencia=1&de=${de}&ate=${ate}`,
  }
}
