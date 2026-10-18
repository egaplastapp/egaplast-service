import type { ItemFilaOperacional } from "@/domain/painel"
import { inicioMes, mesLocal, ultimoDiaMes } from "@/domain/painel"
import type { PedidoLista } from "@/domain/pedidos"

/** Status Sellent que indica faturamento concluído no comercial. */
export function pedidoStatusFaturado(pedido: PedidoLista) {
  const status = (pedido.status ?? "").toUpperCase()
  return status.includes("INVOICE-ATIVO")
}

/** Alias semântico: pedido com status que exige nota no BI na réplica. */
export const pedidoExigeNotaBi = pedidoStatusFaturado

export function pedidoSemNotaNaReplica(pedido: PedidoLista, pedidosComNota: ReadonlySet<number>) {
  return pedidoStatusFaturado(pedido) && !pedidosComNota.has(pedido.id)
}

export function contarStatusFaturadoSemNota(
  pedidos: readonly PedidoLista[],
  pedidosComNota: ReadonlySet<number>,
  mesFoco?: string,
) {
  return pedidos.filter((pedido) => {
    if (pedido.apagadoEm) return false
    if (mesFoco && mesLocal(pedido.dataPedido) !== mesFoco) return false
    return pedidoSemNotaNaReplica(pedido, pedidosComNota)
  }).length
}

export function itemFilaSemNotaFiscal(contagem: number, mesFoco: string): ItemFilaOperacional | null {
  if (contagem <= 0) return null
  const de = inicioMes(mesFoco)
  const ate = ultimoDiaMes(mesFoco)
  return {
    id: "sem_nota_fiscal",
    cor: "#c64d53",
    contagem,
    rotulo: "INVOICE-ATIVO sem nota na réplica",
    href: `/pedidos?sem_nota_fiscal=1&de=${de}&ate=${ate}&vista=completa`,
  }
}

export function pedidosStatusFaturadoSemNota(
  pedidos: readonly PedidoLista[],
  pedidosComNota: ReadonlySet<number>,
  mesFoco?: string,
) {
  return pedidos.filter((pedido) => {
    if (pedido.apagadoEm) return false
    if (mesFoco && mesLocal(pedido.dataPedido) !== mesFoco) return false
    return pedidoSemNotaNaReplica(pedido, pedidosComNota)
  })
}
