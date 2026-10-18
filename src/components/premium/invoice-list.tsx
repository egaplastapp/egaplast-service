import type { FaturaRecente } from "@/domain/faturamento"
import type { NotaRecente } from "@/domain/acompanhamento"
import { moeda } from "@/lib/format"
import { cn } from "cn"
import Link from "next/link"

type Item = NotaRecente | FaturaRecente

function isFatura(item: Item): item is FaturaRecente {
  return "badgeRotulo" in item
}

const BADGE = {
  success: "bg-[#e5f5ed] text-[#187552]",
  warning: "bg-[#fff2dc] text-[#a76512]",
  danger: "bg-[#ffeaeb] text-[#b43b42]",
  neutral: "bg-[#edf0f4] text-[#64748b]",
} as const

export function InvoiceList({ notas }: { notas: Item[] }) {
  if (notas.length === 0) {
    return <p className="px-5 pb-5 text-sm text-muted-foreground">Nenhuma nota no recorte carregado.</p>
  }
  return (
    <ul className="px-5 pb-4">
      {notas.map((nota) => (
        <li
          key={nota.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-b border-[#edf0f4] py-3 last:border-0"
        >
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">
              {nota.numero ?? `Nota ${nota.id}`}{" "}
              <span className="font-normal text-muted-foreground">· pedido {nota.pedidoRotulo}</span>
            </p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              {isFatura(nota) && nota.cliente ? `${nota.cliente} · ` : ""}
              {nota.meta}
            </p>
          </div>
          <div className="text-right">
            <p className="tabular text-[13px] font-bold">{moeda(nota.valor)}</p>
            {isFatura(nota) ? (
              <span className={cn("mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold", BADGE[nota.badgeTom])}>
                {nota.badgeRotulo}
              </span>
            ) : (
              <Link href={`/pedidos/${nota.pedidoId}`} className="premium-text-button mt-1 inline-block text-[10px]">
                Ver pedido
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
