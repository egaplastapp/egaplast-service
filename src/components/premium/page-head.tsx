import { cn } from "cn"

export function PageHead({
  eyebrow,
  titulo,
  subtitulo,
  acoes,
  className,
}: {
  eyebrow?: string
  titulo: string
  subtitulo?: React.ReactNode
  acoes?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-[1.6875rem] font-[760] tracking-[-0.04em] leading-tight">{titulo}</h1>
        {subtitulo ? <p className="mt-2 max-w-3xl text-[13px] text-muted-foreground">{subtitulo}</p> : null}
      </div>
      {acoes ? <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div> : null}
    </header>
  )
}

export function DateChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-[#4b596b]">
      {children}
    </div>
  )
}

export function BotaoSecundario({ href, children }: { href?: string; children: React.ReactNode }) {
  const cls =
    "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm font-semibold text-[#3c4859] hover:bg-muted/80"
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={cls}>
      {children}
    </button>
  )
}

export function BotaoPrimario({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-[0_3px_8px_#176b5620] hover:bg-brand-strong"
    >
      {children}
    </a>
  )
}
