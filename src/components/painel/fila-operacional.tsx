import type { ItemFilaOperacional } from "@/domain/painel"
import { cn } from "cn"
import Link from "next/link"

export function FilaOperacional({ itens }: { itens: ItemFilaOperacional[] }) {
  if (itens.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Nenhuma exceção automática no mês de referência. Ajuste o período ou abra Pedidos para detalhar.
      </p>
    )
  }

  return (
    <section aria-label="Fila operacional">
      <h2 className="mb-2 text-sm font-semibold text-foreground">Exceções no mês — clique para filtrar em Pedidos</h2>
      <ul className="flex flex-wrap gap-2">
        {itens.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                "inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold shadow-sm transition-colors hover:bg-muted/80",
              )}
            >
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.cor }} aria-hidden />
              <span className="tabular text-foreground">{item.contagem.toLocaleString("pt-BR")}</span>
              <span className="text-muted-foreground">{item.rotulo}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
