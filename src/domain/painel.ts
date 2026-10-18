import { calcularCoberturaFiscal } from "@/domain/cobertura-fiscal"
import { pedidoParado, statusEmAnaliseNome, type PedidoLista } from "@/domain/pedidos"
import type { Intervalo } from "@/lib/pedidos/ler"

export const FUSO = "America/Sao_Paulo"

export type VistaPainel = "12m" | "ano" | "mes" | "trimestre" | "semestre"
export type GranularidadeSerie = "semana" | "mes" | "trimestre" | "semestre" | "ano"

export type ConfigPainel = {
  vista: VistaPainel
  mesFoco: string
  buckets: string[]
  bucketTipo: "mes" | "semana"
  intervalo: Intervalo
  rotuloVista: string
}

export type NotaPainel = { data: string | null; valor: number | null }

export type Comparacao = { atual: number; anterior: number; variacao: number | null }

export type Mes = { mes: string; quantidade: number; valor: number; faturado: number }

export type ResumoPainel = {
  mes: string
  pedidos: Comparacao
  valor: Comparacao
  notas: Comparacao
  recusas: Comparacao
  porMes: Mes[]
  integracao: { total: number; comNumero: number; comRecusa: number; semNumero: number; percentual: number | null }
  porUf: { uf: string; quantidade: number; percentual: number }[]
  ultimos: PedidoLista[]
  semData: number
}

const formatoDia = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" })
const formatoMes = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })

/** Dia `AAAA-MM-DD` em São Paulo. */
export function diaLocal(valor: string | Date | null | undefined) {
  if (!valor) return null
  const data = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(data.getTime())) return null
  return formatoDia.format(data)
}

export function mesLocal(valor: string | Date | null | undefined) {
  return diaLocal(valor)?.slice(0, 7) ?? null
}

export function deslocarMes(mes: string, quantos: number) {
  const [ano, numero] = mes.split("-").map(Number)
  const total = ano * 12 + (numero - 1) + quantos
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`
}

/** Os `n` meses que terminam em `mesFinal`, do mais antigo ao mais novo. */
export function mesesAte(mesFinal: string, n: number) {
  return Array.from({ length: n }, (_, indice) => deslocarMes(mesFinal, indice - n + 1))
}

/** "out/26" */
export function rotuloMes(mes: string) {
  const [ano, numero] = mes.split("-").map(Number)
  const nome = formatoMes.format(new Date(Date.UTC(ano, numero - 1, 1))).replace(".", "")
  return `${nome}/${String(ano).slice(2)}`
}

/** Variação percentual; sem base no mês anterior não há variação. */
export function variacao(atual: number, anterior: number) {
  if (anterior === 0) return null
  return ((atual - anterior) / anterior) * 100
}

function comparar(atual: number, anterior: number): Comparacao {
  return { atual, anterior, variacao: variacao(atual, anterior) }
}

export function inicioMes(mes: string) {
  return `${mes}-01`
}

/** Primeiro dia do mês seguinte (limite exclusivo em `order_date`). */
export function fimMesExclusivo(mes: string) {
  return inicioMes(deslocarMes(mes, 1))
}

export function semanasDoMes(mes: string) {
  return Array.from({ length: 5 }, (_, indice) => `${mes}-S${indice + 1}`)
}

export function chaveSemanaPedido(valor: string | Date | null | undefined) {
  const dia = diaLocal(valor)
  if (!dia) return null
  const mes = dia.slice(0, 7)
  const numero = Number(dia.slice(8, 10))
  if (!Number.isFinite(numero)) return null
  return `${mes}-S${Math.min(5, Math.ceil(numero / 7))}`
}

export function trimestreDoMes(mes: string) {
  const [ano, numero] = mes.split("-").map(Number)
  return { ano, trimestre: Math.ceil(numero / 3) }
}

export function mesesDoTrimestre(ano: number, trimestre: number) {
  const inicio = (trimestre - 1) * 3 + 1
  return [0, 1, 2].map((offset) => `${ano}-${String(inicio + offset).padStart(2, "0")}`)
}

export function mesesDoSemestre(ano: number, semestre: 1 | 2) {
  const inicio = semestre === 1 ? 1 : 7
  return Array.from({ length: 6 }, (_, indice) => `${ano}-${String(inicio + indice).padStart(2, "0")}`)
}

/** Monta vista, buckets da série e intervalo SQL enxuto para leitura. */
export function temPeriodoExplicito(params: { vista?: string; ano?: string; mes?: string; trimestre?: string; semestre?: string }) {
  return Boolean(params.mes || params.ano || params.trimestre || params.semestre || params.vista === "12m")
}

export function configPainel(
  params: { vista?: string; ano?: string; mes?: string; trimestre?: string; semestre?: string },
  hoje: Date = new Date(),
): ConfigPainel {
  const mesAtual = mesLocal(hoje)!

  if (params.mes && /^\d{4}-\d{2}$/.test(params.mes)) {
    const mesFoco = params.mes
    const anterior = deslocarMes(mesFoco, -1)
    return {
      vista: "mes",
      mesFoco,
      buckets: semanasDoMes(mesFoco),
      bucketTipo: "semana",
      intervalo: { desde: inicioMes(anterior), ate: fimMesExclusivo(mesFoco) },
      rotuloVista: rotuloMes(mesFoco),
    }
  }

  if (params.trimestre && /^(\d{4})-T([1-4])$/.test(params.trimestre)) {
    const [, anoStr, triStr] = params.trimestre.match(/^(\d{4})-T([1-4])$/)!
    const ano = Number(anoStr)
    const trimestre = Number(triStr)
    const meses = mesesDoTrimestre(ano, trimestre)
    const mesFoco = meses.at(-1)!
    let anoAnterior = ano
    let triAnterior = trimestre - 1
    if (triAnterior < 1) {
      triAnterior = 4
      anoAnterior -= 1
    }
    const bucketsAnterior = mesesDoTrimestre(anoAnterior, triAnterior)
    return {
      vista: "trimestre",
      mesFoco,
      buckets: [...bucketsAnterior, ...meses],
      bucketTipo: "mes",
      intervalo: { desde: inicioMes(bucketsAnterior[0]), ate: fimMesExclusivo(mesFoco) },
      rotuloVista: `T${trimestre}/${String(ano).slice(2)}`,
    }
  }

  if (params.semestre && /^(\d{4})-S([12])$/.test(params.semestre)) {
    const [, anoStr, semStr] = params.semestre.match(/^(\d{4})-S([12])$/)!
    const ano = Number(anoStr)
    const semestre = Number(semStr) as 1 | 2
    const meses = mesesDoSemestre(ano, semestre)
    const mesFoco = meses.at(-1)!
    const semAnterior: 1 | 2 = semestre === 1 ? 2 : 1
    const anoAnterior = semestre === 1 ? ano - 1 : ano
    const bucketsAnterior = mesesDoSemestre(anoAnterior, semAnterior)
    return {
      vista: "semestre",
      mesFoco,
      buckets: [...bucketsAnterior, ...meses],
      bucketTipo: "mes",
      intervalo: { desde: inicioMes(bucketsAnterior[0]), ate: fimMesExclusivo(mesFoco) },
      rotuloVista: `S${semestre}/${String(ano).slice(2)}`,
    }
  }

  if (params.ano && /^\d{4}$/.test(params.ano)) {
    const ano = Number(params.ano)
    const meses = Array.from({ length: 12 }, (_, indice) => `${ano}-${String(indice + 1).padStart(2, "0")}`)
    const mesFoco = ano === Number(mesAtual.slice(0, 4)) ? mesAtual : `${ano}-12`
    return {
      vista: "ano",
      mesFoco,
      buckets: meses,
      bucketTipo: "mes",
      intervalo: { desde: `${ano}-01-01`, ate: `${ano + 1}-01-01` },
      rotuloVista: String(ano),
    }
  }

  if (params.vista === "12m") {
    const mesFoco = mesAtual
    const buckets = mesesAte(mesFoco, 12)
    return {
      vista: "12m",
      mesFoco,
      buckets,
      bucketTipo: "mes",
      intervalo: { desde: inicioMes(buckets[0]), ate: fimMesExclusivo(mesFoco) },
      rotuloVista: "Últimos 12 meses",
    }
  }

  const mesFoco = mesAtual
  const anterior = deslocarMes(mesFoco, -1)
  return {
    vista: "mes",
    mesFoco,
    buckets: semanasDoMes(mesFoco),
    bucketTipo: "semana",
    intervalo: { desde: inicioMes(anterior), ate: fimMesExclusivo(mesFoco) },
    rotuloVista: rotuloMes(mesFoco),
  }
}

export type ItemFilaOperacional = {
  id: string
  cor: string
  contagem: number
  rotulo: string
  href: string
}

/** Contagens acionáveis no mês de referência, com links para Pedidos. */
export function filaOperacional(pedidos: readonly PedidoLista[], mesFoco: string, resumo: ResumoPainel): ItemFilaOperacional[] {
  const noMes = pedidos.filter((p) => !p.apagadoEm && mesLocal(p.dataPedido) === mesFoco)
  const parados = noMes.filter((p) => pedidoParado(p)).length
  const comRecusa = noMes.filter((p) => Boolean(p.erpRecusa?.trim())).length
  const semErp = noMes.filter((p) => !p.erpNumero?.trim() && !p.erpRecusa?.trim()).length
  const emAnalise = noMes.filter((p) => statusEmAnaliseNome(p.status)).length
  const statusAnalise = noMes.find((p) => statusEmAnaliseNome(p.status))?.status?.trim()

  const de = inicioMes(mesFoco)
  const ultimoDia = ultimoDiaMes(mesFoco)
  const qsMes = `de=${de}&ate=${ultimoDia}&vista=completa`
  const paradosSaoMaioria = noMes.length > 0 && parados / noMes.length > 0.35

  const itens: ItemFilaOperacional[] = []
  if (parados > 0 && !paradosSaoMaioria) {
    itens.push({
      id: "parados",
      cor: "#d99b36",
      contagem: parados,
      rotulo: "sem mudança na coleta (+4h)",
      href: `/pedidos?parados=1&${qsMes}&ordem=atualizado&dir=desc`,
    })
  }
  if (comRecusa > 0) {
    itens.push({ id: "recusa", cor: "#c64d53", contagem: comRecusa, rotulo: "com recusa no ERP", href: `/pedidos?recusa=1&${qsMes}` })
  }
  if (emAnalise > 0 && statusAnalise) {
    itens.push({
      id: "analise",
      cor: "#4b88d8",
      contagem: emAnalise,
      rotulo: "em análise no Sellent",
      href: `/pedidos?${qsMes}&status=${encodeURIComponent(statusAnalise)}`,
    })
  }
  if (semErp > 0) {
    itens.push({ id: "sem_erp", cor: "#8ca0b7", contagem: semErp, rotulo: "sem número no ERP", href: `/pedidos?sem_erp=1&${qsMes}` })
  }

  const cobertura = calcularCoberturaFiscal(resumo)
  if (cobertura.valorPedidos > 0 && cobertura.gapValor > 0 && (cobertura.coberturaPercentual ?? 100) < 75) {
    itens.push({
      id: "gap",
      cor: "#a76512",
      contagem: Math.round(cobertura.coberturaPercentual ?? 0),
      rotulo: `% notas vs pedidos no mês (gap ${formatarMoedaCurta(cobertura.gapValor)})`,
      href: `/faturamento?mes=${mesFoco}`,
    })
  }

  return itens
}

export function ultimoDiaMes(mes: string) {
  const [ano, numero] = mes.split("-").map(Number)
  const ultimo = new Date(Date.UTC(ano, numero, 0)).getUTCDate()
  return `${mes}-${String(ultimo).padStart(2, "0")}`
}

export function resumirPainel(
  todos: readonly PedidoLista[],
  notas: readonly NotaPainel[],
  hoje: Date,
  config?: Pick<ConfigPainel, "mesFoco" | "buckets" | "bucketTipo">,
): ResumoPainel {
  const mes = config?.mesFoco ?? mesLocal(hoje)!
  const anterior = deslocarMes(mes, -1)
  const chaves = config?.buckets ?? mesesAte(mes, 12)
  const porSemana = config?.bucketTipo === "semana"
  const porMes = new Map<string, Mes>(chaves.map((item) => [item, { mes: item, quantidade: 0, valor: 0, faturado: 0 }]))

  const pedidos = todos.filter((pedido) => !pedido.apagadoEm)
  const contagem = { pedidos: [0, 0], valor: [0, 0], notas: [0, 0], recusas: [0, 0] }
  const integracao = { total: 0, comNumero: 0, comRecusa: 0, semNumero: 0 }
  const ufs = new Map<string, number>()
  let semData = 0

  for (const pedido of pedidos) {
    const mesPedido = mesLocal(pedido.dataPedido)
    if (!mesPedido) {
      semData++
      continue
    }
    const bucket = porSemana ? chaveSemanaPedido(pedido.dataPedido) : mesPedido
    if (!bucket) {
      semData++
      continue
    }
    const linha = porMes.get(bucket)
    if (linha) {
      linha.quantidade++
      linha.valor += pedido.valor ?? 0
    }
    const posicao = mesPedido === mes ? 0 : mesPedido === anterior ? 1 : -1
    if (posicao < 0) continue
    contagem.pedidos[posicao]++
    contagem.valor[posicao] += pedido.valor ?? 0
    if (pedido.erpRecusa) contagem.recusas[posicao]++
    if (posicao === 0) {
      integracao.total++
      if (pedido.erpNumero) integracao.comNumero++
      else if (pedido.erpRecusa) integracao.comRecusa++
      else integracao.semNumero++
      const uf = pedido.uf ?? "Sem UF"
      ufs.set(uf, (ufs.get(uf) ?? 0) + 1)
    }
  }

  for (const nota of notas) {
    const mesNota = nota.data?.slice(0, 7)
    if (!mesNota) continue
    const bucketNota = porSemana ? chaveSemanaPedido(nota.data) : mesNota
    if (bucketNota) {
      const linha = porMes.get(bucketNota)
      if (linha) linha.faturado += nota.valor ?? 0
    }
    if (mesNota === mes) contagem.notas[0]++
    else if (mesNota === anterior) contagem.notas[1]++
  }

  const totalUf = [...ufs.values()].reduce((soma, valor) => soma + valor, 0)
  const porUf = [...ufs.entries()]
    .map(([uf, quantidade]) => ({ uf, quantidade, percentual: totalUf ? (quantidade / totalUf) * 100 : 0 }))
    .sort((a, b) => b.quantidade - a.quantidade || a.uf.localeCompare(b.uf))
    .slice(0, 6)

  const ultimos = [...pedidos]
    .filter((pedido) => pedido.dataPedido)
    .sort((a, b) => (b.dataPedido ?? "").localeCompare(a.dataPedido ?? "") || b.id - a.id)
    .slice(0, 5)

  return {
    mes,
    pedidos: comparar(contagem.pedidos[0], contagem.pedidos[1]),
    valor: comparar(contagem.valor[0], contagem.valor[1]),
    notas: comparar(contagem.notas[0], contagem.notas[1]),
    recusas: comparar(contagem.recusas[0], contagem.recusas[1]),
    porMes: chaves.map((item) => porMes.get(item)!),
    integracao: { ...integracao, percentual: integracao.total ? (integracao.comNumero / integracao.total) * 100 : null },
    porUf,
    ultimos,
    semData,
  }
}

/** Soma os meses por trimestre do calendário. Trimestres nas pontas podem estar incompletos. */
export function porTrimestre(meses: readonly Mes[]): Mes[] {
  const mapa = new Map<string, Mes>()
  for (const item of meses) {
    if (item.mes.includes("-S")) continue
    const [ano, numero] = item.mes.split("-").map(Number)
    const chave = `T${Math.ceil(numero / 3)}/${String(ano).slice(2)}`
    const atual = mapa.get(chave) ?? { mes: chave, quantidade: 0, valor: 0, faturado: 0 }
    atual.quantidade += item.quantidade
    atual.valor += item.valor
    atual.faturado += item.faturado
    mapa.set(chave, atual)
  }
  return [...mapa.values()]
}

export function porSemestre(meses: readonly Mes[]): Mes[] {
  const mapa = new Map<string, Mes>()
  for (const item of meses) {
    if (item.mes.includes("-S")) continue
    const [ano, numero] = item.mes.split("-").map(Number)
    const chave = `S${numero <= 6 ? 1 : 2}/${String(ano).slice(2)}`
    const atual = mapa.get(chave) ?? { mes: chave, quantidade: 0, valor: 0, faturado: 0 }
    atual.quantidade += item.quantidade
    atual.valor += item.valor
    atual.faturado += item.faturado
    mapa.set(chave, atual)
  }
  return [...mapa.values()]
}

export function porAno(meses: readonly Mes[]): Mes[] {
  const mapa = new Map<string, Mes>()
  for (const item of meses) {
    if (item.mes.includes("-S")) continue
    const ano = item.mes.slice(0, 4)
    const chave = ano
    const atual = mapa.get(chave) ?? { mes: chave, quantidade: 0, valor: 0, faturado: 0 }
    atual.quantidade += item.quantidade
    atual.valor += item.valor
    atual.faturado += item.faturado
    mapa.set(chave, atual)
  }
  return [...mapa.values()]
}

/** Rótulo curto para bucket mensal ou semanal. */
export function rotuloSerie(chave: string) {
  if (chave.includes("-S")) {
    const [, sem] = chave.split("-S")
    return `Sem ${sem}`
  }
  if (chave.startsWith("T") || chave.startsWith("S")) return chave
  if (/^\d{4}$/.test(chave)) return chave
  return rotuloMes(chave).split("/")[0]
}

export function agregarSerie(meses: readonly Mes[], granularidade: GranularidadeSerie): Mes[] {
  if (granularidade === "semana") return [...meses]
  if (granularidade === "mes") return meses.filter((item) => !item.mes.includes("-S"))
  if (granularidade === "trimestre") return porTrimestre(meses)
  if (granularidade === "semestre") return porSemestre(meses)
  return porAno(meses)
}

export type DetalheBucket = {
  rotulo: string
  quantidade: number
  valor: number
  faturado: number
  taxaFaturamento: number | null
  gapValor: number
  varQuantidade: number | null
  varValor: number | null
  varFaturado: number | null
  alerta: "critico" | "atencao" | null
}

/** Contexto para tooltip e leitura rápida de um bucket da série. */
export function detalharBucket(atual: Mes, anterior: Mes | undefined): DetalheBucket {
  const taxaFaturamento = atual.valor > 0 ? (atual.faturado / atual.valor) * 100 : null
  const gapValor = atual.valor - atual.faturado
  let alerta: DetalheBucket["alerta"] = null
  if (atual.valor > 0 && taxaFaturamento != null && taxaFaturamento < 55) alerta = "critico"
  else if (atual.valor > 0 && taxaFaturamento != null && taxaFaturamento < 75) alerta = "atencao"
  else if (anterior && anterior.quantidade > 0 && atual.quantidade < anterior.quantidade * 0.7) alerta = "atencao"

  return {
    rotulo: rotuloSerie(atual.mes),
    quantidade: atual.quantidade,
    valor: atual.valor,
    faturado: atual.faturado,
    taxaFaturamento,
    gapValor,
    varQuantidade: anterior ? variacao(atual.quantidade, anterior.quantidade) : null,
    varValor: anterior ? variacao(atual.valor, anterior.valor) : null,
    varFaturado: anterior ? variacao(atual.faturado, anterior.faturado) : null,
    alerta,
  }
}

export type SinalPainel = {
  nivel: "critico" | "atencao" | "info"
  titulo: string
  texto: string
}

/** Sinais automáticos (legado; preferir `filaOperacional`). Só compara mês a mês na vista `mes`. */
export function sinaisPainel(resumo: ResumoPainel, vista: VistaPainel = "mes"): SinalPainel[] {
  const lista: SinalPainel[] = []
  const compararMeses = vista === "mes"
  const erp = resumo.integracao.percentual
  if (erp != null && erp < 45) {
    lista.push({
      nivel: "critico",
      titulo: "Integração ERP crítica",
      texto: `Só ${erp.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% dos pedidos do mês têm número no ERP. ${resumo.integracao.semNumero.toLocaleString("pt-BR")} ainda sem número.`,
    })
  } else if (erp != null && erp < 70) {
    lista.push({
      nivel: "atencao",
      titulo: "Integração ERP abaixo do ideal",
      texto: `${erp.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% com número no ERP · ${resumo.integracao.comRecusa.toLocaleString("pt-BR")} com recusa.`,
    })
  }

  if (compararMeses && resumo.recusas.atual > 0 && resumo.recusas.variacao != null && resumo.recusas.variacao > 0) {
    lista.push({
      nivel: resumo.recusas.variacao >= 50 ? "critico" : "atencao",
      titulo: "Recusas do ERP em alta",
      texto: `${resumo.recusas.atual.toLocaleString("pt-BR")} no mês (${resumo.recusas.variacao.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% vs mês anterior).`,
    })
  }

  const bucketAtual = resumo.porMes.at(-1)
  if (bucketAtual && bucketAtual.valor > 0) {
    const taxa = (bucketAtual.faturado / bucketAtual.valor) * 100
    const gap = bucketAtual.valor - bucketAtual.faturado
    if (taxa < 60 && gap > 0) {
      lista.push({
        nivel: taxa < 45 ? "critico" : "atencao",
        titulo: "Faturamento atrás dos pedidos",
        texto: `No último bucket da série, notas cobrem ${taxa.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% do valor dos pedidos (gap ${formatarMoedaCurta(gap)}).`,
      })
    }
  }

  if (compararMeses && resumo.pedidos.variacao != null && resumo.pedidos.variacao <= -20) {
    lista.push({
      nivel: "atencao",
      titulo: "Queda forte de pedidos",
      texto: `${resumo.pedidos.variacao.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% vs mês anterior (${resumo.pedidos.atual.toLocaleString("pt-BR")} pedidos).`,
    })
  }

  return lista.slice(0, 4)
}

function formatarMoedaCurta(valor: number) {
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
  if (valor >= 1_000) return `R$ ${(valor / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
