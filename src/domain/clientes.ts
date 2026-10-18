import { mesLocal } from "@/domain/painel"
import type { PedidoLista } from "@/domain/pedidos"
import { nomeStatus } from "@/domain/pedidos"

export type ClienteResumo = {
  chave: string
  nome: string
  loja: string | null
  pedidos: number
  emAberto: number
  valorTotal: number
  ultimoPedido: string | null
}

export function agruparClientesDosPedidos(pedidos: readonly PedidoLista[], limite = 200): ClienteResumo[] {
  const mapa = new Map<string, ClienteResumo>()
  for (const pedido of pedidos) {
    if (pedido.apagadoEm) continue
    const nome = pedido.cliente?.trim() || pedido.loja?.trim() || "Sem identificação"
    const loja = pedido.loja?.trim() || null
    const chave = `${nome}\n${loja ?? ""}`
    const atual = mapa.get(chave) ?? {
      chave,
      nome,
      loja,
      pedidos: 0,
      emAberto: 0,
      valorTotal: 0,
      ultimoPedido: null,
    }
    atual.pedidos += 1
    if (!pedido.cancelado && !nomeStatus(pedido).toUpperCase().includes("INVOICE-ATIVO")) {
      atual.emAberto += 1
    }
    if (pedido.valor != null) atual.valorTotal += pedido.valor
    const dia = mesLocal(pedido.dataPedido) ? pedido.dataPedido : null
    if (dia && (!atual.ultimoPedido || dia > atual.ultimoPedido)) atual.ultimoPedido = dia
    mapa.set(chave, atual)
  }
  return [...mapa.values()].sort((a, b) => b.valorTotal - a.valorTotal || b.pedidos - a.pedidos).slice(0, limite)
}
