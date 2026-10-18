import type { FatiaComposicao } from "@/domain/acompanhamento"

export function DonutComposicao({ total, fatias }: { total: number; fatias: FatiaComposicao[] }) {
  if (total === 0 || fatias.length === 0) {
    return <p className="px-5 pb-5 text-sm text-muted-foreground">Sem pedidos com status no mês.</p>
  }

  let acumulado = 0
  const stops = fatias.map((fatia) => {
    const inicio = acumulado
    acumulado += fatia.percentual
    return `${fatia.cor} ${inicio}% ${acumulado}%`
  })

  return (
    <div className="flex flex-wrap items-center gap-5 px-5 pb-6 pt-1">
      <div
        className="relative grid size-[130px] shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
        role="img"
        aria-label={`Composição de ${total} pedidos por status`}
      >
        <div className="absolute inset-[13px] rounded-full bg-card" />
        <div className="relative z-10 text-center">
          <strong className="tabular block text-[23px] tracking-[-0.04em]">{total.toLocaleString("pt-BR")}</strong>
          <span className="text-[10px] text-muted-foreground">pedidos</span>
        </div>
      </div>
      <ul className="grid min-w-[140px] flex-1 gap-2.5">
        {fatias.map((fatia) => (
          <li key={fatia.rotulo} className="flex items-center gap-2 text-[11px] text-[#526075]">
            <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: fatia.cor }} aria-hidden />
            <span className="truncate">{fatia.rotulo}</span>
            <strong className="tabular ml-auto text-[#263446]">{fatia.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
