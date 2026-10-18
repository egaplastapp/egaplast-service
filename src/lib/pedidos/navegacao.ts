const CHAVE = "egaplast-pedidos-nav"

export type RecorteNavegacao = {
  ids: number[]
  idAtual: number
}

export function gravarRecorteNavegacao(ids: readonly number[], idAtual: number) {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.setItem(CHAVE, JSON.stringify({ ids: [...ids], idAtual }))
}

export function lerRecorteNavegacao(): RecorteNavegacao | null {
  if (typeof sessionStorage === "undefined") return null
  const bruto = sessionStorage.getItem(CHAVE)
  if (!bruto) return null
  try {
    const json = JSON.parse(bruto) as RecorteNavegacao
    if (!Array.isArray(json.ids) || !Number.isFinite(json.idAtual)) return null
    return json
  } catch {
    return null
  }
}

export function atualizarIdAtualNavegacao(idAtual: number) {
  const atual = lerRecorteNavegacao()
  if (!atual) return
  gravarRecorteNavegacao(atual.ids, idAtual)
}
