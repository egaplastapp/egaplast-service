import { CabecalhoEsqueleto, CartaoEsqueleto } from "@/components/esqueleto"

export default function Loading() {
  return (
    <div className="space-y-5">
      <CabecalhoEsqueleto />
      <CartaoEsqueleto linhas={6} />
      <CartaoEsqueleto linhas={2} />
    </div>
  )
}
