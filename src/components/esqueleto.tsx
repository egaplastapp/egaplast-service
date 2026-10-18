import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "cn"

export function CabecalhoEsqueleto({ acao }: { acao?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {acao ? <Skeleton className={cn("h-10", acao)} /> : null}
    </div>
  )
}

export function CartaoEsqueleto({ className, linhas = 3 }: { className?: string; linhas?: number }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5", className)}>
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: linhas }, (_, indice) => (
          <Skeleton key={indice} className={cn("h-4", indice % 2 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  )
}

export function IndicadorEsqueleto() {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <Skeleton className="size-12 rounded-xl" />
      <Skeleton className="mt-5 h-4 w-24" />
      <Skeleton className="mt-2 h-7 w-28" />
    </div>
  )
}

export function TabelaEsqueleto({ linhas = 8 }: { linhas?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center justify-between px-5 py-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="h-10 border-y bg-(--cabecalho-tabela)" />
      <div className="divide-y">
        {Array.from({ length: linhas }, (_, indice) => (
          <div key={indice} className="flex h-11 items-center gap-4 px-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="hidden h-4 w-28 sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
