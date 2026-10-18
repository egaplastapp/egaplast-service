import { CabecalhoEsqueleto, CartaoEsqueleto, IndicadorEsqueleto, TabelaEsqueleto } from "@/components/esqueleto"

export default function Loading() {
  return (
    <div className="space-y-4">
      <CabecalhoEsqueleto acao="w-full sm:w-80" />
      <CartaoEsqueleto linhas={2} />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, indice) => (
          <IndicadorEsqueleto key={indice} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <CartaoEsqueleto className="lg:col-span-2" linhas={5} />
        <CartaoEsqueleto linhas={2} />
      </div>
      <TabelaEsqueleto />
    </div>
  )
}
