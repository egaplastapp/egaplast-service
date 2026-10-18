import { CabecalhoEsqueleto, CartaoEsqueleto, IndicadorEsqueleto } from "@/components/esqueleto"

export default function Loading() {
  return (
    <div className="space-y-5">
      <CabecalhoEsqueleto />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, indice) => (
          <IndicadorEsqueleto key={indice} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <CartaoEsqueleto className="xl:col-span-7" linhas={5} />
        <CartaoEsqueleto className="xl:col-span-5" linhas={4} />
      </div>
      <CartaoEsqueleto linhas={4} />
      <div className="grid gap-4 lg:grid-cols-2">
        <CartaoEsqueleto linhas={6} />
        <CartaoEsqueleto linhas={5} />
      </div>
    </div>
  )
}
