import { nomeStatus, type PedidoLista } from "@/domain/pedidos"
import { cn } from "cn"

export type TomStatus = "progress" | "attention" | "done" | "error" | "neutral"

export function tomStatus(pedido: PedidoLista): TomStatus {
  if (pedido.erpRecusa) return "error"
  if (pedido.cancelado || pedido.apagadoEm) return "neutral"
  const nome = nomeStatus(pedido).toUpperCase()
  if (nome.includes("ANÁLISE") || nome.includes("ANALISE") || nome.includes("PEND")) return "attention"
  if (nome.includes("CONCLU") || nome.includes("ENTREG") || nome.includes("FATUR") || nome.includes("FINALIZ")) return "done"
  return "progress"
}

const STATUS_CLASS: Record<TomStatus, string> = {
  progress: "bg-[#e8f1ff] text-[#2c62b4]",
  attention: "bg-[#fff2dc] text-[#a76512]",
  done: "bg-[#e5f5ed] text-[#187552]",
  error: "bg-[#ffeaeb] text-[#b43b42]",
  neutral: "bg-[#edf0f4] text-[#64748b]",
}

export function StatusBadge({ pedido }: { pedido: PedidoLista }) {
  const tom = tomStatus(pedido)
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold", STATUS_CLASS[tom])}>
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      {nomeStatus(pedido)}
    </span>
  )
}

export function OrigemPill({ pedido }: { pedido: PedidoLista }) {
  const partes = ["Sellent"]
  if (pedido.erpNumero || pedido.erpRecusa) partes.push("ERP")
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      <span className="size-1 shrink-0 rounded-full bg-[#7d8ba0]" aria-hidden />
      {partes.join(" · ")}
    </span>
  )
}

const QUATRO_HORAS = 4 * 60 * 60 * 1000

export function TempoSemEvento({ iso, titulo }: { iso: string | null | undefined; titulo?: string }) {
  if (!iso) return <span className="text-[10px] font-bold text-muted-foreground">—</span>
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return <span className="text-[10px] text-muted-foreground">—</span>
  const diff = Date.now() - data.getTime()
  const texto = formatarDuracao(diff)
  const tom = diff >= QUATRO_HORAS ? "late" : diff >= 60 * 60 * 1000 ? "wait" : "ok"
  return (
    <span
      title={titulo ?? "Tempo desde a última atualização gravada na réplica"}
      className={cn(
        "text-[10px] font-bold",
        tom === "late" && "text-danger",
        tom === "wait" && "text-warning",
        tom === "ok" && "text-brand",
      )}
    >
      {texto}
    </span>
  )
}

function formatarDuracao(ms: number) {
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))} s`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min`
  if (ms < 86_400_000) {
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    return m ? `${h}h ${m}min` : `${h}h`
  }
  const d = Math.floor(ms / 86_400_000)
  return `${d} dia${d === 1 ? "" : "s"}`
}
