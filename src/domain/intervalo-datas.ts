/** Filtro de pedidos na URL: `de` e `ate` são dias inclusivos (AAAA-MM-DD, São Paulo). */
export function diaDentroDoFiltroUi(dia: string | null, de: string, ate: string) {
  if (!dia) return false
  if (de && dia < de) return false
  if (ate && dia > ate) return false
  return true
}

/** Converte par inclusivo da UI em intervalo SQL (`desde` inclusivo, `ate` exclusivo) para `order_date` / `date`. */
export function intervaloSqlDeFiltroUi(deInclusivo: string, ateInclusivo: string) {
  return { desde: deInclusivo, ate: diaSeguinteIso(ateInclusivo) }
}

export function diaSeguinteIso(dia: string) {
  const [ano, mes, numero] = dia.split("-").map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, numero + 1))
  return data.toISOString().slice(0, 10)
}
