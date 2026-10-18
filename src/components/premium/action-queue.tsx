import type { AcaoPrioritaria } from "@/domain/acompanhamento"
import { cn } from "cn"
import Link from "next/link"

export function ActionQueue({ acoes }: { acoes: AcaoPrioritaria[] }) {
  if (acoes.length === 0) return null
  return (
    <section aria-label="Ações prioritárias" className="mb-5 grid gap-3 md:grid-cols-3">
      {acoes.map((acao) => (
        <article key={acao.id} className="premium-action-card">
          <div className={cn("premium-alert-mark mt-0.5", MARK[acao.tom])}>{acao.simbolo}</div>
          <div className="min-w-0">
            <strong className="text-xs">{acao.titulo}</strong>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{acao.texto}</p>
            <Link href={acao.href} className="premium-text-button mt-2 inline-block">
              {acao.cta} →
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}

const MARK = {
  red: "premium-alert-mark-red",
  amber: "premium-alert-mark-amber",
  blue: "premium-alert-mark-blue",
} as const
