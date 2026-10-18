import { cn } from "cn"
import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react"

export function Cabecalho({
  titulo,
  subtitulo,
  sobretitulo,
  children,
}: {
  titulo: string
  subtitulo?: React.ReactNode
  sobretitulo?: string
  children?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {sobretitulo ? <p className="eyebrow mb-2">{sobretitulo}</p> : null}
        <h1 className="text-[1.6875rem] font-semibold tracking-[-0.04em]">{titulo}</h1>
        {subtitulo ? <p className="mt-2 max-w-3xl text-[13px] text-muted-foreground">{subtitulo}</p> : null}
      </div>
      {children}
    </header>
  )
}

export function Cartao({
  titulo,
  descricao,
  acao,
  className,
  corpo,
  children,
}: {
  titulo?: React.ReactNode
  descricao?: React.ReactNode
  acao?: React.ReactNode
  className?: string
  corpo?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("rounded-[14px] border border-border bg-card shadow-card", className)}>
      {titulo ? (
        <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{titulo}</h2>
            {descricao ? <p className="mt-0.5 text-sm text-muted-foreground">{descricao}</p> : null}
          </div>
          {acao}
        </div>
      ) : null}
      <div className={corpo ?? cn("p-5 sm:p-6", titulo ? "pt-4 sm:pt-4" : "")}>{children}</div>
    </section>
  )
}

const TONS = {
  brand: { fundo: "bg-brand-soft", icone: "text-brand" },
  success: { fundo: "bg-success-soft", icone: "text-success" },
  warning: { fundo: "bg-warning-soft", icone: "text-warning" },
  danger: { fundo: "bg-danger-soft", icone: "text-danger" },
  info: { fundo: "bg-info-soft", icone: "text-info" },
} as const

export function Indicador({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
  variacao,
  tom = "brand",
}: {
  rotulo: string
  valor: React.ReactNode
  detalhe?: React.ReactNode
  icone: LucideIcon
  variacao?: number | null
  tom?: keyof typeof TONS
}) {
  const paleta = TONS[tom]
  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-card transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-soft motion-reduce:transition-none sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{rotulo}</p>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", paleta.fundo)}>
          <Icone className={cn("size-4", paleta.icone)} aria-hidden />
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <p className="tabular min-w-0 text-[1.8125rem] font-bold tracking-[-0.045em]">{valor}</p>
        <Variacao valor={variacao} />
      </div>
      {detalhe ? <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p> : null}
    </div>
  )
}

export function Variacao({ valor }: { valor?: number | null }) {
  if (valor == null || !Number.isFinite(valor)) return null
  const subiu = valor >= 0
  const Seta = subiu ? ArrowUp : ArrowDown
  return (
    <span
      className={cn(
        "tabular inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        subiu ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
      )}
    >
      <Seta className="size-3" aria-hidden />
      {Math.abs(valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
      <span className="sr-only">{subiu ? "acima" : "abaixo"} do mês anterior</span>
    </span>
  )
}

export function SemPapel() {
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-2xl border bg-card p-6">
      <h1 className="text-lg font-semibold">Acesso sem papel</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Esta conta não tem papel de admin ou operador. Peça o convite à operação.
      </p>
    </div>
  )
}
