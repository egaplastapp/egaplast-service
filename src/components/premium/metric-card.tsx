import { cn } from "cn"
import { Variacao } from "@/components/pagina"
import type { LucideIcon } from "lucide-react"

const ICON_TOM = {
  brand: "bg-brand-soft text-brand",
  blue: "bg-info-soft text-info",
  amber: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
  green: "bg-brand-soft text-brand",
} as const

export function MetricCard({
  rotulo,
  valor,
  icone: Icone,
  tom = "brand",
  foot,
  variacao,
  detalhe,
}: {
  rotulo: string
  valor: React.ReactNode
  icone: LucideIcon
  tom?: keyof typeof ICON_TOM
  foot?: React.ReactNode
  variacao?: number | null
  detalhe?: React.ReactNode
}) {
  return (
    <article className="premium-metric min-w-0">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
        <span>{rotulo}</span>
        <span className={cn("grid size-[33px] place-items-center rounded-lg", ICON_TOM[tom])}>
          <Icone className="size-4" aria-hidden />
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <p className="premium-metric-value">{valor}</p>
        <Variacao valor={variacao} />
      </div>
      {foot ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">{foot}</p>
      ) : null}
      {detalhe ? <p className="mt-1 text-[11px] text-muted-foreground">{detalhe}</p> : null}
    </article>
  )
}

export function MetricGrid({ children }: { children: React.ReactNode }) {
  return <section className="mb-5 grid gap-[15px] sm:grid-cols-2 xl:grid-cols-4">{children}</section>
}
