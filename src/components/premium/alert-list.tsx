import type { PontoAtencao } from "@/domain/acompanhamento"
import { cn } from "cn"
import Link from "next/link"

export function AlertList({ itens }: { itens: PontoAtencao[] }) {
  if (itens.length === 0) {
    return <p className="px-5 pb-5 text-sm text-muted-foreground">Nenhuma ocorrência automática no mês.</p>
  }
  return (
    <ul className="px-5 pb-2">
      {itens.map((item) => (
        <li key={item.id} className="flex gap-2.5 border-b border-[#eef1f5] py-3 last:border-0">
          <div className={cn("premium-alert-mark", MARK[item.tom])}>{item.simbolo}</div>
          <div className="min-w-0 flex-1">
            <Link href={item.href} className="text-xs font-semibold hover:text-brand-strong hover:underline">
              {item.titulo}
            </Link>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{item.texto}</p>
          </div>
          <span
            className={cn(
              "shrink-0 self-start text-[10px] font-bold whitespace-nowrap",
              item.severidade === "alta" ? "text-danger" : "text-warning",
            )}
          >
            {item.severidade === "alta" ? "Alta" : "Média"}
          </span>
        </li>
      ))}
    </ul>
  )
}

const MARK = {
  amber: "premium-alert-mark-amber",
  red: "premium-alert-mark-red",
  blue: "premium-alert-mark-blue",
} as const
