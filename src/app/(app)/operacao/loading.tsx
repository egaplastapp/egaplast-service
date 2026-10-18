import { CabecalhoEsqueleto, TabelaEsqueleto } from "@/components/esqueleto"

export default function Loading() {
  return (
    <div className="space-y-5">
      <CabecalhoEsqueleto acao="w-64" />
      <TabelaEsqueleto />
    </div>
  )
}
