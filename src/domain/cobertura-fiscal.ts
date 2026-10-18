import type { ResumoPainel } from "@/domain/painel"

export type CoberturaFiscal = {
  valorPedidos: number
  valorFaturado: number
  gapValor: number
  coberturaPercentual: number | null
}

/** Bucket da série (`YYYY-MM` ou `YYYY-MM-Sn`) pertence ao mês foco do resumo. */
export function bucketPertenceMesFoco(chaveBucket: string, mesFoco: string) {
  return chaveBucket === mesFoco || chaveBucket.startsWith(`${mesFoco}-S`)
}

/** Soma faturamento dos buckets do mês foco (não da série inteira em vista 12m). */
export function faturadoNoMesFoco(resumo: ResumoPainel) {
  return resumo.porMes
    .filter((bucket) => bucketPertenceMesFoco(bucket.mes, resumo.mes))
    .reduce((soma, bucket) => soma + bucket.faturado, 0)
}

/** Fonte única para gap e cobertura no mês de referência do painel. */
export function calcularCoberturaFiscal(resumo: ResumoPainel): CoberturaFiscal {
  const valorPedidos = resumo.valor.atual
  const valorFaturado = faturadoNoMesFoco(resumo)
  const gapValor = valorPedidos - valorFaturado
  return {
    valorPedidos,
    valorFaturado,
    gapValor,
    coberturaPercentual: valorPedidos > 0 ? (valorFaturado / valorPedidos) * 100 : null,
  }
}

export function rotuloCobertura(cobertura: CoberturaFiscal) {
  if (cobertura.coberturaPercentual == null) return "—"
  return `${cobertura.coberturaPercentual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`
}
