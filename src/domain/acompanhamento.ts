import { calcularCoberturaFiscal } from "@/domain/cobertura-fiscal"
import type { ItemFilaOperacional, ResumoPainel } from "@/domain/painel"
import type { PendenciaLista } from "@/domain/pendencias"
import { pendenciasPorPedido, rotuloPendencia } from "@/domain/pendencias"
import { mesLocal } from "@/domain/painel"
import { nomeStatus, pedidoParado, type PedidoLista } from "@/domain/pedidos"
import type { Nota } from "@/lib/pedidos/ler"

export type MetricasAcompanhamento = {
  emAndamento: number
  requeremAtencao: number
  valorMes: number
  notasMes: number
  gapValor: number
}

export type FaixaFunil = {
  id: string
  rotulo: string
  quantidade: number
  cor: string
  meta?: string
}

export type PontoAtencao = {
  id: number
  titulo: string
  texto: string
  href: string
  severidade: "alta" | "media"
  tom: "amber" | "red" | "blue"
  simbolo: string
}

export type AcaoPrioritaria = {
  id: string
  titulo: string
  texto: string
  href: string
  cta: string
  tom: "red" | "amber" | "blue"
  simbolo: string
}

export type FatiaComposicao = {
  rotulo: string
  quantidade: number
  percentual: number
  cor: string
}

export type NotaRecente = {
  id: number
  pedidoId: number
  pedidoRotulo: string
  numero: string | null
  valor: number | null
  meta: string
}

const CORES_FUNIL = ["#176b56", "#4b88d8", "#8ca0b7", "#a76512"] as const
const CORES_DONUT = ["#176b56", "#4b88d8", "#e7ad52", "#d9e0e8", "#b43b42"] as const

export function pedidosNoMes(pedidos: readonly PedidoLista[], mesFoco: string) {
  return pedidos.filter((p) => !p.apagadoEm && mesLocal(p.dataPedido) === mesFoco)
}

export function metricasAcompanhamento(
  pedidos: readonly PedidoLista[],
  mesFoco: string,
  resumo: ResumoPainel,
  agora = Date.now(),
): MetricasAcompanhamento {
  const noMes = pedidosNoMes(pedidos, mesFoco)
  const emAndamento = noMes.filter((p) => !p.cancelado).length
  const requeremAtencao = noMes.filter((p) => pedidoExigeAtencao(p, agora)).length
  const cobertura = calcularCoberturaFiscal(resumo)
  return {
    emAndamento,
    requeremAtencao,
    valorMes: cobertura.valorPedidos,
    notasMes: resumo.notas.atual,
    gapValor: cobertura.gapValor,
  }
}

export function funilIntegracao(pedidos: readonly PedidoLista[], mesFoco: string): FaixaFunil[] {
  const noMes = pedidosNoMes(pedidos, mesFoco)
  const ativos = noMes.filter((p) => !p.cancelado)
  const comNumero = ativos.filter((p) => Boolean(p.erpNumero?.trim())).length
  const soRecusa = ativos.filter((p) => !p.erpNumero?.trim() && Boolean(p.erpRecusa?.trim())).length
  const semNumero = ativos.filter((p) => !p.erpNumero?.trim() && !p.erpRecusa?.trim()).length
  const cancelados = noMes.filter((p) => p.cancelado).length
  return [
    { id: "erp_ok", rotulo: "Com número no ERP", quantidade: comNumero, cor: CORES_FUNIL[0], meta: "Integração confirmada na réplica" },
    { id: "recusa", rotulo: "Com recusa no ERP", quantidade: soRecusa, cor: CORES_FUNIL[1], meta: "Exige tratamento comercial/fiscal" },
    { id: "sem_erp", rotulo: "Sem número no ERP", quantidade: semNumero, cor: CORES_FUNIL[2], meta: "Ainda não refletido no ERP" },
    { id: "cancelados", rotulo: "Cancelados no mês", quantidade: cancelados, cor: CORES_FUNIL[3], meta: "Contam no volume, não no ERP" },
  ].filter((f) => f.quantidade > 0)
}

export function pontosAtencao(
  pedidos: readonly PedidoLista[],
  mesFoco: string,
  limite = 5,
  agora = Date.now(),
  pendencias?: readonly PendenciaLista[],
): PontoAtencao[] {
  const mapaPendencias = pendencias ? pendenciasPorPedido(pendencias) : new Map<number, PendenciaLista[]>()
  const noMes = pedidosNoMes(pedidos, mesFoco)
  const candidatos: { score: number; item: PontoAtencao }[] = []

  for (const pedido of noMes) {
    const codigo = pedido.codigo ?? String(pedido.id)
    if (pedidoParado(pedido, agora)) {
      candidatos.push({
        score: 400,
        item: {
          id: pedido.id,
          titulo: "Pedido sem atualização",
          texto: `${codigo} · sem evento há mais de 4 horas`,
          href: `/pedidos/${pedido.id}`,
          severidade: "alta",
          tom: "amber",
          simbolo: "◷",
        },
      })
    }
    if (pedido.erpRecusa?.trim()) {
      candidatos.push({
        score: 350,
        item: {
          id: pedido.id,
          titulo: "Recusa no ERP",
          texto: `${codigo} · ${pedido.erpRecusa.trim().slice(0, 80)}`,
          href: `/pedidos/${pedido.id}`,
          severidade: "alta",
          tom: "red",
          simbolo: "!",
        },
      })
    } else if (!pedido.erpNumero?.trim()) {
      candidatos.push({
        score: 200,
        item: {
          id: pedido.id,
          titulo: "Sem número no ERP",
          texto: `${codigo} · aguardando integração`,
          href: `/pedidos/${pedido.id}`,
          severidade: "media",
          tom: "blue",
          simbolo: "↔",
        },
      })
    }
    const status = pedido.status?.toUpperCase() ?? ""
    if (status.includes("ANÁLISE") || status.includes("ANALISE")) {
      const abertas = mapaPendencias.get(pedido.id)
      const pendencia = abertas?.[0]
      candidatos.push({
        score: 280,
        item: {
          id: pedido.id,
          titulo: pendencia ? "Pendência de aprovação" : "Em análise no Sellent",
          texto: pendencia ? `${codigo} · ${rotuloPendencia(pendencia)}` : `${codigo} · ${nomeStatus(pedido)}`,
          href: `/pedidos/${pedido.id}`,
          severidade: "media",
          tom: "amber",
          simbolo: "◷",
        },
      })
    } else if (mapaPendencias.has(pedido.id)) {
      const pendencia = mapaPendencias.get(pedido.id)![0]
      candidatos.push({
        score: 260,
        item: {
          id: pedido.id,
          titulo: "Pendência aberta",
          texto: `${codigo} · ${rotuloPendencia(pendencia)}`,
          href: `/pedidos/${pedido.id}`,
          severidade: "media",
          tom: "amber",
          simbolo: "◷",
        },
      })
    }
  }

  candidatos.sort((a, b) => b.score - a.score || a.item.id - b.item.id)
  const vistos = new Set<number>()
  const lista: PontoAtencao[] = []
  for (const { item } of candidatos) {
    if (vistos.has(item.id)) continue
    vistos.add(item.id)
    lista.push(item)
    if (lista.length >= limite) break
  }
  return lista
}

export function composicaoStatus(pedidos: readonly PedidoLista[], mesFoco: string): { total: number; fatias: FatiaComposicao[] } {
  const noMes = pedidosNoMes(pedidos, mesFoco)
  const mapa = new Map<string, { quantidade: number; cor: string | null }>()
  for (const pedido of noMes) {
    const nome = nomeStatus(pedido)
    const atual = mapa.get(nome)
    if (atual) atual.quantidade += 1
    else mapa.set(nome, { quantidade: 1, cor: pedido.corStatus })
  }
  const ordenado = [...mapa.entries()].sort((a, b) => b[1].quantidade - a[1].quantidade)
  const total = noMes.length
  if (total === 0) return { total: 0, fatias: [] }

  const top = ordenado.slice(0, 3)
  const resto = ordenado.slice(3).reduce((s, [, v]) => s + v.quantidade, 0)
  const fatias: FatiaComposicao[] = top.map(([rotulo, info], indice) => ({
    rotulo,
    quantidade: info.quantidade,
    percentual: (info.quantidade / total) * 100,
    cor: corDonut(info.cor, indice),
  }))
  if (resto > 0) {
    fatias.push({
      rotulo: "Outros",
      quantidade: resto,
      percentual: (resto / total) * 100,
      cor: CORES_DONUT[3],
    })
  }
  return { total, fatias }
}

export function notasRecentes(notas: readonly Nota[], pedidos: readonly PedidoLista[], limite = 3): NotaRecente[] {
  const mapaPedido = new Map(pedidos.map((p) => [p.id, p]))
  const ordenadas = [...notas]
    .filter((n) => n.data)
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
    .slice(0, limite)

  return ordenadas.map((nota) => {
    const pedido = mapaPedido.get(nota.pedidoId)
    return {
      id: nota.id,
      pedidoId: nota.pedidoId,
      pedidoRotulo: pedido?.codigo ?? String(nota.pedidoId),
      numero: nota.numero,
      valor: nota.valor,
      meta: nota.data ? `Emitida em ${formatarDataNota(nota.data)}` : "—",
    }
  })
}

export function acoesPrioritarias(fila: ItemFilaOperacional[]): AcaoPrioritaria[] {
  const mapa: Record<string, Omit<AcaoPrioritaria, "texto"> & { texto: (n: number) => string }> = {
    recusa: {
      id: "recusa",
      titulo: "Recusas no ERP",
      texto: (n) => `${n} pedido${n === 1 ? "" : "s"} com recusa registrada no mês.`,
      href: "",
      cta: "Ver recusas",
      tom: "red",
      simbolo: "!",
    },
    parados: {
      id: "parados",
      titulo: "Pedidos parados",
      texto: (n) => `${n} pedido${n === 1 ? "" : "s"} sem atualização há mais de 4 horas.`,
      href: "",
      cta: "Ver pedidos parados",
      tom: "amber",
      simbolo: "◷",
    },
    sem_erp: {
      id: "sem_erp",
      titulo: "Sem número no ERP",
      texto: (n) => `${n} pedido${n === 1 ? "" : "s"} ainda sem número no ERP.`,
      href: "",
      cta: "Investigar pendências",
      tom: "red",
      simbolo: "!",
    },
    analise: {
      id: "analise",
      titulo: "Em análise",
      texto: (n) => `${n} pedido${n === 1 ? "" : "s"} em análise no Sellent.`,
      href: "",
      cta: "Ver em análise",
      tom: "blue",
      simbolo: "▧",
    },
    gap: {
      id: "gap",
      titulo: "Gap pedido × nota",
      texto: (n) => `Cobertura fiscal em ${n}% no mês — valor de notas abaixo dos pedidos.`,
      href: "",
      cta: "Ver faturamento",
      tom: "blue",
      simbolo: "▧",
    },
    sem_nota_fiscal: {
      id: "sem_nota_fiscal",
      titulo: "Status faturado sem nota",
      texto: (n) => `${n} pedido${n === 1 ? "" : "s"} INVOICE-ATIVO sem nota na réplica.`,
      href: "",
      cta: "Revisar lista",
      tom: "red",
      simbolo: "!",
    },
    pendencias: {
      id: "pendencias",
      titulo: "Pendências Sellent",
      texto: (n) => `${n} pedido${n === 1 ? "" : "s"} com pendência de aprovação aberta no mês.`,
      href: "",
      cta: "Ver pendências",
      tom: "blue",
      simbolo: "▧",
    },
  }

  const ordem = ["sem_nota_fiscal", "recusa", "pendencias", "parados", "sem_erp", "analise", "gap"]
  const acoes: AcaoPrioritaria[] = []
  for (const id of ordem) {
    const item = fila.find((f) => f.id === id)
    if (!item) continue
    const cfg = mapa[id as keyof typeof mapa]
    if (!cfg) continue
    acoes.push({
      id: cfg.id,
      titulo: cfg.titulo,
      texto: cfg.texto(item.contagem),
      href: item.href,
      cta: cfg.cta,
      tom: cfg.tom,
      simbolo: cfg.simbolo,
    })
    if (acoes.length >= 3) break
  }
  return acoes
}

export function pedidosRevisao(pedidos: readonly PedidoLista[], mesFoco: string, limite = 8, agora = Date.now()) {
  return pedidosNoMes(pedidos, mesFoco)
    .filter((p) => pedidoExigeAtencao(p, agora))
    .sort((a, b) => (a.atualizadoEm ?? "").localeCompare(b.atualizadoEm ?? "") || a.id - b.id)
    .slice(0, limite)
}

function pedidoExigeAtencao(pedido: PedidoLista, agora = Date.now()) {
  if (pedidoParado(pedido, agora)) return true
  if (pedido.erpRecusa?.trim()) return true
  if (!pedido.erpNumero?.trim() && !pedido.erpRecusa?.trim()) return true
  const s = pedido.status?.toUpperCase() ?? ""
  return s.includes("ANÁLISE") || s.includes("ANALISE")
}

function corDonut(corStatus: string | null, indice: number) {
  if (corStatus && corStatus.startsWith("#") && corStatus.length >= 4) return corStatus
  return CORES_DONUT[indice % CORES_DONUT.length]
}

function formatarDataNota(data: string) {
  const [ano, mes, dia] = data.split("-")
  if (!dia) return data
  return `${dia}/${mes}/${String(ano).slice(2)}`
}
