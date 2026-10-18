import type { SinalPainel } from "@/domain/painel"
import { cn } from "cn"
import Link from "next/link"

export function SinaisPainel({ itens }: { itens: SinalPainel[] }) {
  if (itens.length === 0) return null
  return (
    <section aria-label="Sinais do período" className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Sinais para decisão</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {itens.map((item) => (
          <li
            key={item.titulo}
            className={cn(
              "rounded-xl border px-4 py-3 text-sm shadow-card",
              item.nivel === "critico" && "border-danger/35 bg-danger-soft/80",
              item.nivel === "atencao" && "border-warning/35 bg-warning-soft/80",
              item.nivel === "info" && "border-border bg-card",
            )}
          >
            <p className="font-semibold text-foreground">{item.titulo}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.texto}</p>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">
        Regras automáticas sobre o recorte carregado.{" "}
        <Link href="/pedidos" className="font-medium text-brand-strong hover:underline">
          Ver pedidos
        </Link>{" "}
        para agir.
      </p>
    </section>
  )
}
