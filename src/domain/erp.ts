export type ClassificacaoErp = {
  erpNumero: string | null
  erpRecusa: string | null
}

/** Número de ERP válido observado no Sellent: 5 a 7 dígitos. Qualquer outro texto no campo é recusa. */
export function classificarErpId(valor: unknown): ClassificacaoErp {
  if (valor == null) return { erpNumero: null, erpRecusa: null }
  const texto = String(valor).trim()
  if (!texto) return { erpNumero: null, erpRecusa: null }
  if (/^\d{5,7}$/.test(texto)) return { erpNumero: texto, erpRecusa: null }
  return { erpNumero: null, erpRecusa: texto }
}
