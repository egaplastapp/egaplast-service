import { cn } from "cn"

const ETAPAS = [
  { sigla: "S", titulo: "Sellent", descricao: "Pedido e aprovação", estado: "ok" as const },
  { sigla: "E", titulo: "ERP", descricao: "Processamento / faturamento", estado: "ok" as const },
  { sigla: "W", titulo: "WMS", descricao: "Estoque / separação", estado: "futuro" as const },
  { sigla: "F", titulo: "Frota", descricao: "Expedição / entrega", estado: "futuro" as const },
]

export function SystemFlow() {
  return (
    <PanelFluxo />
  )
}

function PanelFluxo() {
  return (
    <article className="premium-panel mb-5">
      <div className="flex items-start justify-between gap-3.5 px-5 pt-5 pb-3">
        <div>
          <h2 className="text-sm font-[750] tracking-[-0.015em]">Visibilidade entre sistemas</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Como o pedido percorre as plataformas — WMS e frota ainda não integrados nesta entrega.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-1 text-[10px] text-muted-foreground">
          <span className="size-1 rounded-full bg-[#7d8ba0]" aria-hidden />
          Fluxo ilustrativo
        </span>
      </div>
      <div className="grid grid-cols-2 gap-y-3 px-5 pb-5 md:grid-cols-4">
        {ETAPAS.map((etapa, indice) => (
          <div key={etapa.sigla} className="relative pr-2">
            {indice < ETAPAS.length - 1 ? (
              <span className="absolute top-[27px] right-0 left-[31px] hidden h-px bg-[#d8e2e0] md:block" aria-hidden />
            ) : null}
            <div className="relative z-10 flex items-center gap-2">
              <span
                className={cn(
                  "grid size-[30px] place-items-center rounded-full border-[3px] border-white text-[11px] font-extrabold outline outline-1",
                  etapa.estado === "ok" && "bg-[#e6f4ee] text-brand outline-[#b6dbcd]",
                  etapa.estado === "futuro" && "bg-[#edf1f5] text-[#748196] outline-[#d7dfe7]",
                )}
              >
                {etapa.sigla}
              </span>
              <div>
                <strong className="text-[11px]">{etapa.titulo}</strong>
                <small className="mt-0.5 block text-[10px] text-muted-foreground">{etapa.descricao}</small>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
