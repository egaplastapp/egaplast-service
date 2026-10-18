import type { FaixaFunil } from "@/domain/acompanhamento"

export function FlowBars({ faixas }: { faixas: FaixaFunil[] }) {
  if (faixas.length === 0) {
    return <p className="px-5 pb-5 text-sm text-muted-foreground">Nenhum pedido no mês de referência.</p>
  }
  const max = Math.max(...faixas.map((f) => f.quantidade), 1)
  return (
    <div className="px-5 pb-5">
      {faixas.map((faixa) => (
        <div key={faixa.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[#eef1f5] py-3.5 last:border-0">
          <div>
            <div className="mb-2 flex justify-between gap-2 text-xs font-semibold">
              <span>{faixa.rotulo}</span>
              <span className="tabular text-[#46556a]">{faixa.quantidade.toLocaleString("pt-BR")}</span>
            </div>
            <div className="premium-flow-track">
              <div
                className="h-full rounded-full"
                style={{ width: `${(faixa.quantidade / max) * 100}%`, backgroundColor: faixa.cor }}
              />
            </div>
            {faixa.meta ? <p className="mt-1.5 text-[10px] text-muted-foreground">{faixa.meta}</p> : null}
          </div>
        </div>
      ))}
    </div>
  )
}
