/** Mesma regra do coletor: instante UTC menos 1 segundo, formato da API. */
export function cursorParaApi(iso: string) {
  const data = new Date(new Date(iso).getTime() - 1000)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${data.getUTCFullYear()}-${p(data.getUTCMonth() + 1)}-${p(data.getUTCDate())} ${p(data.getUTCHours())}:${p(data.getUTCMinutes())}:${p(data.getUTCSeconds())}`
}
