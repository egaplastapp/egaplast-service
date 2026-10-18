"use client"

import { OrigemPill, StatusBadge, TempoSemEvento } from "@/components/pedidos/badges"
import type { PedidoLista } from "@/domain/pedidos"
import { dataCurta, dataHora, moeda } from "@/lib/format"
import Link from "next/link"

export function TabelaRevisao({ pedidos }: { pedidos: PedidoLista[] }) {
  if (pedidos.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum pedido exige revisão automática neste mês.</p>
  }
  return (
    <div className="overflow-x-auto border-t border-border">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-[var(--cabecalho-tabela)] text-[10px] font-bold tracking-wide text-[#738095] uppercase">
            <th className="px-4 py-3">Pedido</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Última atualização</th>
            <th className="px-4 py-3">Sem evento</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3">Situação</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => {
            const href = `/pedidos/${pedido.id}`
            const codigo = pedido.codigo ?? String(pedido.id)
            return (
              <tr key={pedido.id} className="border-b border-[#edf0f4] transition-colors hover:bg-[#f8fbfa]">
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <Link href={href} className="block">
                    <span className="font-bold text-[#1c5c4d] tabular">{codigo}</span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">{dataCurta(pedido.dataPedido) || "—"}</span>
                  </Link>
                </td>
                <td className="max-w-48 px-4 py-3.5">
                  <p className="truncate text-xs font-semibold">{pedido.cliente ?? pedido.loja ?? "—"}</p>
                  <OrigemPill pedido={pedido} />
                </td>
                <td className="px-4 py-3.5 text-xs whitespace-nowrap">{dataHora(pedido.atualizadoEm)}</td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <TempoSemEvento iso={pedido.atualizadoEm} />
                </td>
                <td className="tabular px-4 py-3.5 text-right text-xs font-bold whitespace-nowrap">{moeda(pedido.valor)}</td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <StatusBadge pedido={pedido} />
                </td>
                <td className="px-4 py-3.5 text-muted-foreground">
                  <Link href={href} className="text-sm hover:text-brand">
                    ↗
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
