export function pedidoProntoParaConferencia(codigos: (string | null)[], codigoUltimaEtapa: string) {
  return codigos.length > 0 && codigos.every((codigo) => codigo === codigoUltimaEtapa)
}

export function etapaFinal<T extends { codigo: string; ordem: number }>(etapas: T[]): T | null {
  if (etapas.length === 0) return null
  return [...etapas].sort((a, b) => a.ordem - b.ordem)[etapas.length - 1] ?? null
}
