import { CartaoEsqueleto, TabelaEsqueleto } from "@/components/esqueleto"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-4 w-36" />
      <CartaoEsqueleto linhas={3} />
      <div className="grid gap-4 lg:grid-cols-3">
        <CartaoEsqueleto />
        <CartaoEsqueleto />
        <CartaoEsqueleto />
      </div>
      <TabelaEsqueleto linhas={4} />
    </div>
  )
}
