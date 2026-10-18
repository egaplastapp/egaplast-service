export type FotoPedido = {
  statusId: number | null
  erpNumero: string | null
  erpRecusa: string | null
  cancelado: boolean
  valor: number | null
}

export type Diferenca = {
  campo: string
  anterior: string | null
  novo: string | null
}

const CAMPOS: { chave: keyof FotoPedido; campo: string }[] = [
  { chave: "statusId", campo: "status_id" },
  { chave: "erpNumero", campo: "erp_number" },
  { chave: "erpRecusa", campo: "erp_rejection" },
  { chave: "cancelado", campo: "is_canceled" },
  { chave: "valor", campo: "amount_final" },
]

function texto(valor: FotoPedido[keyof FotoPedido]): string | null {
  if (valor == null) return null
  return String(valor)
}

export function diferencas(antes: FotoPedido | null, depois: FotoPedido): Diferenca[] {
  if (!antes) return [{ campo: "created", anterior: null, novo: "sim" }]
  const saida: Diferenca[] = []
  for (const item of CAMPOS) {
    const anterior = texto(antes[item.chave])
    const novo = texto(depois[item.chave])
    if (anterior !== novo) saida.push({ campo: item.campo, anterior, novo })
  }
  return saida
}
