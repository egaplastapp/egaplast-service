import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingAcompanhamento() {
  return (
    <div className="mx-auto max-w-[1700px] space-y-5 pb-10">
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-11 w-full max-w-2xl" />
      <Skeleton className="h-12 w-full rounded-[10px]" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-44 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-[14px]" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="premium-layout-main">
        <Skeleton className="h-72 rounded-[14px]" />
        <Skeleton className="h-72 rounded-[14px]" />
      </div>
    </div>
  )
}
