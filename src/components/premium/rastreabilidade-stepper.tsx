import type { PassoRastreabilidade, EstadoIntegracao } from "@/domain/rastreabilidade"
import { cn } from "cn"

const ESTADO: Record<EstadoIntegracao, { rotulo: string; anel: string; fundo: string }> = {
  ok: { rotulo: "OK", anel: "outline-[#43c79b]", fundo: "bg-[#e5f5ed] text-[#187552]" },
  alerta: { rotulo: "Atenção", anel: "outline-[#e7ad52]", fundo: "bg-[#fff2dc] text-[#a76512]" },
  desconhecido: { rotulo: "Parcial", anel: "outline-[#8ca0b7]", fundo: "bg-[#edf0f4] text-[#64748b]" },
  futuro: { rotulo: "Futuro", anel: "outline-[#d8e2e0]", fundo: "bg-muted text-muted-foreground" },
}

export function RastreabilidadeStepper({ passos }: { passos: PassoRastreabilidade[] }) {
  return (
    <article className="premium-panel mb-5">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-sm font-[750] tracking-[-0.015em]">Rastreabilidade entre sistemas</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Estado inferido na réplica — SIFN e Monday entram quando houver integração.
        </p>
      </div>
      <ol className="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3">
        {passos.map((passo) => (
          <li key={passo.id} className="rounded-xl border border-[#edf0f4] bg-[#f8fbfa] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">{passo.titulo}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{passo.descricao}</p>
              </div>
              <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase", ESTADO[passo.estado].fundo)}>
                {ESTADO[passo.estado].rotulo}
              </span>
            </div>
            {passo.detalhe ? <p className="mt-2 line-clamp-2 text-[11px] text-[#485569]">{passo.detalhe}</p> : null}
          </li>
        ))}
      </ol>
    </article>
  )
}
