import { CabecalhoEsqueleto } from "@/components/esqueleto"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-5">
      <CabecalhoEsqueleto />
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 7 }, (_, indice) => (
            <Skeleton key={`h-${indice}`} className="h-10 rounded-none" />
          ))}
          {Array.from({ length: 35 }, (_, indice) => (
            <div key={indice} className="min-h-24 border-r border-b p-2">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="mt-2 h-5 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
