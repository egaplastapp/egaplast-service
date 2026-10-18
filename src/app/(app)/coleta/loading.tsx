import { CabecalhoEsqueleto, CartaoEsqueleto, IndicadorEsqueleto } from "@/components/esqueleto"

export default function Loading() {
  return (
    <div className="space-y-5">
      <CabecalhoEsqueleto />
      <div className="grid gap-4 md:grid-cols-2">
        <IndicadorEsqueleto />
        <IndicadorEsqueleto />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, indice) => (
          <CartaoEsqueleto key={indice} linhas={4} />
        ))}
      </div>
    </div>
  )
}
