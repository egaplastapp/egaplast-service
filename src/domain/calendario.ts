import { corLegivel, type PedidoLista } from "@/domain/pedidos"
import { diaLocal, deslocarMes } from "@/domain/painel"
import type { Nota } from "@/lib/pedidos/ler"

export type Vista = "mes" | "semana" | "dia"

export type EventoCalendario = {
  tipo: "pedido" | "nota"
  dia: string
  pedidoId: number
  rotulo: string
  cor: string
  valor: number
}

export type DiaCalendario = {
  dia: string
  noMes: boolean
  hoje: boolean
  eventos: EventoCalendario[]
}

export const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]
export const COR_NOTA = "#21845a"
const CELULAS_MES = 42

export function interpretarVista(bruto: string | undefined): Vista {
  return bruto === "semana" || bruto === "dia" ? bruto : "mes"
}

export function interpretarData(bruto: string | undefined, hoje: string) {
  if (!bruto || !/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return hoje
  const [ano, mes, dia] = bruto.split("-").map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() + 1 !== mes || data.getUTCDate() !== dia) return hoje
  return bruto
}

export function deslocarDia(dia: string, quantos: number) {
  const [ano, mes, numero] = dia.split("-").map(Number)
  return new Date(Date.UTC(ano, mes - 1, numero + quantos)).toISOString().slice(0, 10)
}

export function domingoDaSemana(dia: string) {
  const [ano, mes, numero] = dia.split("-").map(Number)
  return deslocarDia(dia, -new Date(Date.UTC(ano, mes - 1, numero)).getUTCDay())
}

export function deslocarVista(vista: Vista, dia: string, direcao: -1 | 1) {
  if (vista === "dia") return deslocarDia(dia, direcao)
  if (vista === "semana") return deslocarDia(dia, direcao * 7)
  return `${deslocarMes(dia.slice(0, 7), direcao)}-01`
}

export function diasDaVista(vista: Vista, dia: string) {
  if (vista === "dia") return [dia]
  if (vista === "semana") {
    const inicio = domingoDaSemana(dia)
    return Array.from({ length: 7 }, (_, indice) => deslocarDia(inicio, indice))
  }
  const inicio = domingoDaSemana(`${dia.slice(0, 7)}-01`)
  return Array.from({ length: CELULAS_MES }, (_, indice) => deslocarDia(inicio, indice))
}

/** Pedidos em instante UTC; notas em `AAAA-MM-DD`. `ate` é exclusivo. */
export function intervaloConsulta(vista: Vista, dia: string) {
  const dias = diasDaVista(vista, dia)
  const desde = dias[0]
  const ate = deslocarDia(dias[dias.length - 1], 1)
  return {
    pedidos: { desde: instanteInicio(desde), ate: instanteInicio(ate) },
    notas: { desde, ate },
  }
}

export function instanteInicio(dia: string) {
  return new Date(`${dia}T00:00:00-03:00`).toISOString()
}

export function hrefCalendario(vista: Vista, data: string, hoje: string) {
  const params = new URLSearchParams()
  if (vista !== "mes") params.set("vista", vista)
  if (data !== hoje) params.set("data", data)
  const query = params.toString()
  return query ? `/calendario?${query}` : "/calendario"
}

export function rotuloPeriodo(vista: Vista, dia: string) {
  const [ano, mes, numero] = dia.split("-").map(Number)
  if (vista === "dia") {
    return new Date(Date.UTC(ano, mes - 1, numero)).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
  }
  if (vista === "semana") {
    const inicio = domingoDaSemana(dia)
    const fim = deslocarDia(inicio, 6)
    const curto = (valor: string) => {
      const [a, m, d] = valor.split("-").map(Number)
      return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" }).replace(".", "")
    }
    return `${curto(inicio)} – ${curto(fim)} ${fim.slice(0, 4)}`
  }
  return new Date(Date.UTC(ano, mes - 1, 1)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
}

export function montarEventos(pedidos: readonly PedidoLista[], notas: readonly Nota[]): EventoCalendario[] {
  const eventos: EventoCalendario[] = []
  for (const pedido of pedidos) {
    if (pedido.apagadoEm) continue
    const dia = diaLocal(pedido.dataPedido)
    if (!dia) continue
    eventos.push({
      tipo: "pedido",
      dia,
      pedidoId: pedido.id,
      rotulo: rotuloPedido(pedido.codigo, pedido.id, pedido.valor),
      cor: corLegivel(pedido.corStatus),
      valor: pedido.valor ?? 0,
    })
  }
  for (const nota of notas) {
    const dia = nota.data?.slice(0, 10) ?? null
    if (!dia || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) continue
    eventos.push({
      tipo: "nota",
      dia,
      pedidoId: nota.pedidoId,
      rotulo: nota.numero ? `NF ${nota.numero}` : "Nota",
      cor: COR_NOTA,
      valor: nota.valor ?? 0,
    })
  }
  eventos.sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR") || a.pedidoId - b.pedidoId)
  return eventos
}

export function agruparPorDia(dias: readonly string[], eventos: readonly EventoCalendario[], hoje: string, mesRef: string): DiaCalendario[] {
  const mapa = new Map<string, EventoCalendario[]>()
  for (const evento of eventos) {
    const lista = mapa.get(evento.dia)
    if (lista) lista.push(evento)
    else mapa.set(evento.dia, [evento])
  }
  return dias.map((dia) => ({
    dia,
    noMes: dia.startsWith(mesRef),
    hoje: dia === hoje,
    eventos: mapa.get(dia) ?? [],
  }))
}

function rotuloPedido(codigo: string | null, id: number, valor: number | null) {
  const numero = codigo ?? String(id)
  if (valor == null || Number.isNaN(valor)) return numero
  return `${numero} · ${valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`
}

export function totaisDoDia(eventos: readonly EventoCalendario[]) {
  let pedidos = 0
  let notas = 0
  let valorPedidos = 0
  let valorNotas = 0
  for (const evento of eventos) {
    if (evento.tipo === "pedido") {
      pedidos++
      valorPedidos += evento.valor
    } else {
      notas++
      valorNotas += evento.valor
    }
  }
  return { pedidos, notas, valorPedidos, valorNotas }
}
