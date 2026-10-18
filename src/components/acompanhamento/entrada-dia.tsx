import {
  hrefPedidosHoje,
  hrefPedidosMovimentoDesdeColeta,
} from "@/domain/recorte-pedidos"
import { dataHora } from "@/lib/format"
import { CalendarDays, RefreshCw } from "lucide-react"
import Link from "next/link"

export function EntradaDia({
  hoje,
  totalPedidosHoje,
  totalMovimento,
  ultimaColetaPedidos,
}: {
  hoje: string
  totalPedidosHoje: number | null
  totalMovimento: number | null
  ultimaColetaPedidos: { started_at: string; finished_at: string | null } | null
}) {
  return (
    <section className="mb-5 rounded-2xl border bg-card p-5 shadow-card">
      <header className="mb-4">
        <p className="eyebrow">Entrada do dia</p>
        <h2 className="text-lg font-semibold">Acompanhamento operacional</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dois recortes distintos: data do pedido no Sellent e movimento gravado na réplica desde a última coleta de pedidos.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={hrefPedidosHoje(hoje)}
          className="group flex gap-3 rounded-xl border border-border bg-background p-4 transition hover:border-brand/40 hover:shadow-sm"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
            <CalendarDays className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold group-hover:text-brand-strong">Pedidos de hoje (Sellent)</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Data do pedido · {hoje}</span>
            <span className="mt-1 block tabular-nums text-lg font-semibold">
              {totalPedidosHoje != null ? totalPedidosHoje.toLocaleString("pt-BR") : "—"}
            </span>
          </span>
        </Link>
        <Link
          href={hrefPedidosMovimentoDesdeColeta()}
          className="group flex gap-3 rounded-xl border border-border bg-background p-4 transition hover:border-brand/40 hover:shadow-sm"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <RefreshCw className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold group-hover:text-brand-strong">Desde a última coleta de pedidos</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {ultimaColetaPedidos?.finished_at
                ? `Coleta OK ${dataHora(ultimaColetaPedidos.finished_at)}`
                : "Nenhuma coleta de pedidos concluída"}
            </span>
            <span className="mt-1 block tabular-nums text-lg font-semibold">
              {totalMovimento != null ? totalMovimento.toLocaleString("pt-BR") : "—"}
            </span>
          </span>
        </Link>
      </div>
    </section>
  )
}
