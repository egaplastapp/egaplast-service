import type { ItemFilaOperacional } from "@/domain/painel"
import Link from "next/link"

export function PriorityStrip({ itens, extra }: { itens: ItemFilaOperacional[]; extra?: React.ReactNode }) {
  if (itens.length === 0 && !extra) return null
  return (
    <div className="-mt-1 mb-5 flex flex-wrap gap-2">
      {itens.map((item) => (
        <Link key={item.id} href={item.href} className="premium-chip">
          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.cor }} aria-hidden />
          <b className="tabular text-foreground">{item.contagem.toLocaleString("pt-BR")}</b>
          <span>{rotuloCurto(item)}</span>
        </Link>
      ))}
      {extra ? (
        <span className="premium-chip cursor-default opacity-90">
          <span className="size-1.5 shrink-0 rounded-full bg-[#7d8ba0]" aria-hidden />
          {extra}
        </span>
      ) : null}
    </div>
  )
}

function rotuloCurto(item: ItemFilaOperacional) {
  if (item.id === "parados") return "pedidos sem atualização há +4h"
  if (item.id === "recusa") return "com recusa no ERP"
  if (item.id === "sem_erp") return "sem número no ERP"
  if (item.id === "analise") return "em análise no Sellent"
  if (item.id === "gap") return "cobertura fiscal baixa no mês"
  return item.rotulo
}
