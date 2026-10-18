export function moeda(valor: number | null | undefined) {
  if (valor == null || Number.isNaN(valor)) return "—"
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function dataHora(iso: string | null | undefined) {
  if (!iso) return "—"
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return "—"
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

/** Dia de calendário gravado como `YYYY-MM-DD`, sem deslocar o fuso. */
export function diaGravado(valor: string | null | undefined) {
  if (!valor) return null
  const match = valor.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match || Number(match[1]) < 2000) return null
  return `${match[3]}/${match[2]}/${match[1]}`
}

export function dataCurta(iso: string | null | undefined) {
  if (!iso) return "—"
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return "—"
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

export function quantidade(valor: number | null | undefined) {
  if (valor == null || Number.isNaN(valor)) return "—"
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 })
}

export function percentual(valor: number | null | undefined) {
  if (valor == null || Number.isNaN(valor)) return "—"
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
}

export function medida(valor: number | null | undefined) {
  if (valor == null || Number.isNaN(valor)) return "—"
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 })
}

/** CPF e CNPJ ganham máscara. Outro texto volta como veio. */
export function documento(valor: string | null | undefined) {
  if (!valor) return "—"
  const digitos = valor.replace(/\D/g, "")
  if (digitos.length === 14 && digitos === valor.replace(/\s/g, "")) {
    return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
  }
  if (digitos.length === 11 && digitos === valor.replace(/\s/g, "")) {
    return digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")
  }
  return valor
}

export function cep(valor: string | null | undefined) {
  if (!valor) return null
  const digitos = valor.replace(/\D/g, "")
  if (digitos.length === 8) return digitos.replace(/^(\d{5})(\d{3})$/, "$1-$2")
  return valor.trim()
}
