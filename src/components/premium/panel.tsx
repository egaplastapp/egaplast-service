import { cn } from "cn"
import Link from "next/link"

export function Panel({
  titulo,
  subtitulo,
  acao,
  acaoHref,
  badge,
  className,
  children,
  corpoClassName,
}: {
  titulo: string
  subtitulo?: string
  acao?: string
  acaoHref?: string
  badge?: React.ReactNode
  className?: string
  children: React.ReactNode
  corpoClassName?: string
}) {
  return (
    <article className={cn("premium-panel", className)}>
      <div className="flex items-start justify-between gap-3.5 px-5 pt-5 pb-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-[750] tracking-[-0.015em]">{titulo}</h2>
          {subtitulo ? <p className="mt-1 text-[11px] text-muted-foreground">{subtitulo}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge}
          {acao && acaoHref ? (
            <Link href={acaoHref} className="premium-text-button whitespace-nowrap">
              {acao}
            </Link>
          ) : null}
        </div>
      </div>
      <div className={cn(corpoClassName ?? "px-5 pb-5")}>{children}</div>
    </article>
  )
}
