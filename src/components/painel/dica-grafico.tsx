"use client"

import type { DetalheBucket } from "@/domain/painel"
import { moeda } from "@/lib/format"
import { cn } from "cn"

export function PainelDicaBucket({ detalhe }: { detalhe: DetalheBucket }) {
  return (
    <div className="space-y-2 text-left">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{detalhe.rotulo}</p>
        {detalhe.alerta ? (
          <span
            className={cn(
              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
              detalhe.alerta === "critico" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning",
            )}
          >
            {detalhe.alerta === "critico" ? "Crítico" : "Atenção"}
          </span>
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <Item rotulo="Pedidos" valor={detalhe.quantidade.toLocaleString("pt-BR")} />
        <Item rotulo="Valor pedidos" valor={moeda(detalhe.valor)} />
        <Item rotulo="Notas (faturado)" valor={moeda(detalhe.faturado)} />
        <Item
          rotulo="Cobertura"
          valor={detalhe.taxaFaturamento == null ? "—" : `${detalhe.taxaFaturamento.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`}
        />
      </dl>
      {detalhe.gapValor > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Gap pedido − nota: <span className="font-semibold text-foreground">{moeda(detalhe.gapValor)}</span>
        </p>
      ) : null}
      {(detalhe.varQuantidade != null || detalhe.varValor != null) && (
        <p className="border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
          vs bucket anterior:{" "}
          {detalhe.varQuantidade != null ? (
            <Variacao rotulo="qtd" valor={detalhe.varQuantidade} />
          ) : null}
          {detalhe.varValor != null ? (
            <>
              {" · "}
              <Variacao rotulo="valor" valor={detalhe.varValor} />
            </>
          ) : null}
        </p>
      )}
    </div>
  )
}

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="tabular text-right font-semibold text-foreground">{valor}</dd>
    </>
  )
}

function Variacao({ rotulo, valor }: { rotulo: string; valor: number }) {
  const subiu = valor >= 0
  return (
    <span className={subiu ? "text-brand" : "text-danger"}>
      {rotulo} {subiu ? "+" : ""}
      {valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
    </span>
  )
}

export function FlutuarDica({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none z-50 w-full max-w-none rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg sm:max-w-none",
        className,
      )}
      role="tooltip"
    >
      {children}
    </div>
  )
}
