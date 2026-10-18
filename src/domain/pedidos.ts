import type { AcaoPrioritaria } from "@/domain/acompanhamento"
import { pedidoSemNotaNaReplica } from "@/domain/fiscal"
import { diaDentroDoFiltroUi } from "@/domain/intervalo-datas"

export const PAGINA_LISTA = 1000
export const TETO_LISTA = 5000
export const LIMITE_VISTA_OPERACIONAL = 50
export const COR_MARCA = "#0785c5"

export type VistaPedidos = "operacional" | "completa"
export type ErpFiltroView = "todos" | "numero" | "recusa" | "sem"
export type MotivoFilaPedido = "pendencia" | "sem_nota" | "recusa_erp" | "analise"

export type PedidoLista = {
  id: number
  codigo: string | null
  erpNumero: string | null
  erpRecusa: string | null
  valor: number | null
  cancelado: boolean
  apagadoEm: string | null
  atualizadoEm: string | null
  dataPedido: string | null
  uf: string | null
  cliente: string | null
  status: string | null
  corStatus: string | null
  loja: string | null
  vendedor: string | null
}

export type CampoOrdem = "codigo" | "erp" | "cliente" | "loja" | "vendedor" | "status" | "uf" | "valor" | "atualizado"

export type FiltroPedidos = {
  texto: string
  status: string[]
  vendedor: string
  uf: string
  de: string
  ate: string
  incluirApagados: boolean
  soCancelados: boolean
  soRecusa: boolean
  soParados: boolean
  semErp: boolean
  comPendencia: boolean
  semNotaFiscal: boolean
  ordem: CampoOrdem
  direcao: "asc" | "desc"
}

export type ContextoFiltroPedidos = {
  pedidosComNota?: ReadonlySet<number>
  pedidosComPendencia?: ReadonlySet<number>
}

export const PARADO_MS = 4 * 60 * 60 * 1000

/** Sem evento há pelo menos 4 horas (pela data de atualização na réplica). */
export function pedidoParado(pedido: PedidoLista, agora = Date.now()) {
  if (pedido.apagadoEm) return false
  if (!pedido.atualizadoEm) return false
  const instante = new Date(pedido.atualizadoEm).getTime()
  return Number.isFinite(instante) && agora - instante >= PARADO_MS
}

export type TotaisPedidos = {
  quantidade: number
  soma: number
  ticket: number | null
  comErp: number
  comRecusa: number
}

export type RecortePedidos = {
  linhas: PedidoLista[]
  totais: TotaisPedidos
}

export type ContagemStatus = {
  nome: string
  cor: string | null
  quantidade: number
}

const CAMPOS: CampoOrdem[] = ["codigo", "erp", "cliente", "loja", "vendedor", "status", "uf", "valor", "atualizado"]
const DIA = /^\d{4}-\d{2}-\d{2}$/

export function filtroInicial(): FiltroPedidos {
  return {
    texto: "",
    status: [],
    vendedor: "",
    uf: "",
    de: "",
    ate: "",
    incluirApagados: false,
    soCancelados: false,
    soRecusa: false,
    soParados: false,
    semErp: false,
    comPendencia: false,
    semNotaFiscal: false,
    ordem: "atualizado",
    direcao: "desc",
  }
}

export function nomeStatus(pedido: PedidoLista) {
  const nome = pedido.status?.trim()
  return nome ? nome : "Sem status"
}

/** Status Sellent considerado “em análise” (menu, prioridades, painel). */
export function statusEmAnaliseNome(nome: string | null | undefined) {
  if (!nome?.trim()) return false
  const up = nome.toUpperCase()
  return up.includes("ANÁLISE") || up.includes("ANALISE")
}

export function filtrarPedidos(
  pedidos: readonly PedidoLista[],
  filtro: FiltroPedidos,
  contexto: ContextoFiltroPedidos = {},
): RecortePedidos {
  const linhas = selecionar(pedidos, filtro, contexto)
  linhas.sort((a, b) => comparar(a, b, filtro))
  return { linhas, totais: somar(linhas) }
}

/** Contagem por status do Sellent, sem aplicar o filtro de status, para a faixa continuar navegável. */
export function distribuicaoStatus(pedidos: readonly PedidoLista[], filtro: FiltroPedidos): ContagemStatus[] {
  const linhas = selecionar(pedidos, { ...filtro, status: [] }, {})
  const mapa = new Map<string, ContagemStatus>()
  for (const pedido of linhas) {
    const nome = nomeStatus(pedido)
    const atual = mapa.get(nome)
    if (atual) atual.quantidade += 1
    else mapa.set(nome, { nome, cor: pedido.corStatus, quantidade: 1 })
  }
  return [...mapa.values()].sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR"))
}

export function opcoesLista(pedidos: readonly PedidoLista[]) {
  const vendedores = new Set<string>()
  const ufs = new Set<string>()
  for (const pedido of pedidos) {
    const vendedor = pedido.vendedor?.trim()
    const uf = pedido.uf?.trim()
    if (vendedor) vendedores.add(vendedor)
    if (uf) ufs.add(uf.toUpperCase())
  }
  const porNome = (a: string, b: string) => a.localeCompare(b, "pt-BR")
  return { vendedores: [...vendedores].sort(porNome), ufs: [...ufs].sort(porNome) }
}

/** Filtros de negócio (exclui só ordenação customizada). */
export function filtroNegocioAtivo(filtro: FiltroPedidos) {
  return (
    filtro.texto.trim() !== ""
    || filtro.status.length > 0
    || filtro.vendedor !== ""
    || filtro.uf !== ""
    || filtro.de !== ""
    || filtro.ate !== ""
    || filtro.incluirApagados
    || filtro.soCancelados
    || filtro.soRecusa
    || filtro.soParados
    || filtro.semErp
    || filtro.comPendencia
    || filtro.semNotaFiscal
  )
}

export function filtroAtivo(filtro: FiltroPedidos) {
  const base = filtroInicial()
  return filtroNegocioAtivo(filtro) || filtro.ordem !== base.ordem || filtro.direcao !== base.direcao
}

export function vistaDaBusca(busca: string): VistaPedidos {
  const params = new URLSearchParams(busca.startsWith("?") ? busca.slice(1) : busca)
  return params.get("vista") === "completa" ? "completa" : "operacional"
}

export function erpDaBusca(busca: string): ErpFiltroView {
  const params = new URLSearchParams(busca.startsWith("?") ? busca.slice(1) : busca)
  const erp = params.get("erp")
  if (erp === "numero" || erp === "recusa" || erp === "sem") return erp
  if (params.get("recusa") === "1") return "recusa"
  if (params.get("sem_erp") === "1") return "sem"
  return "todos"
}

export function filtrarErpView(linhas: readonly PedidoLista[], view: ErpFiltroView) {
  if (view === "todos") return [...linhas]
  if (view === "numero") return linhas.filter((p) => Boolean(p.erpNumero?.trim()))
  if (view === "recusa") return linhas.filter((p) => Boolean(p.erpRecusa?.trim()))
  return linhas.filter((p) => !p.erpNumero?.trim() && !p.erpRecusa?.trim())
}

export function aplicarLimiteVista(
  linhas: readonly PedidoLista[],
  vista: VistaPedidos,
  filtroNegocio: boolean,
) {
  if (vista === "completa" || filtroNegocio) return [...linhas]
  return linhas.slice(0, LIMITE_VISTA_OPERACIONAL)
}

export function statusAnaliseNoRecorte(pedidos: readonly PedidoLista[]) {
  const nomes = new Set<string>()
  for (const pedido of pedidos) {
    if (pedido.apagadoEm) continue
    const nome = pedido.status?.trim()
    if (!nome) continue
    if (statusEmAnaliseNome(nome)) nomes.add(nome)
  }
  return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"))
}

export function filtroHrefAnalise(pedidos: readonly PedidoLista[]): Partial<FiltroPedidos> {
  const status = statusAnaliseNoRecorte(pedidos)
  return { ...filtroInicial(), status }
}

export function motivosFilaPedido(pedido: PedidoLista, contexto: ContextoFiltroPedidos): MotivoFilaPedido[] {
  const motivos: MotivoFilaPedido[] = []
  if (contexto.pedidosComPendencia?.has(pedido.id)) motivos.push("pendencia")
  if (pedidoSemNotaNaReplica(pedido, contexto.pedidosComNota ?? new Set())) motivos.push("sem_nota")
  if (pedido.erpRecusa?.trim()) motivos.push("recusa_erp")
  if (statusEmAnaliseNome(pedido.status)) motivos.push("analise")
  return motivos
}

const ROTULO_MOTIVO_FILA: Record<MotivoFilaPedido, string> = {
  pendencia: "Pendência",
  sem_nota: "Sem nota BI",
  recusa_erp: "Recusa ERP",
  analise: "Em análise",
}

export function rotuloMotivosFila(motivos: readonly MotivoFilaPedido[]) {
  if (motivos.length === 0) return null
  return motivos.map((m) => ROTULO_MOTIVO_FILA[m]).join(" · ")
}

/** Filtro “só parados” sem mais critério — fila enorme de histórico, não serve como landing. */
export function filtroSoParadosIsolado(filtro: FiltroPedidos) {
  const base = filtroInicial()
  return (
    filtro.soParados
    && filtro.texto.trim() === ""
    && filtro.status.length === 0
    && filtro.vendedor === ""
    && filtro.uf === ""
    && filtro.de === ""
    && filtro.ate === ""
    && !filtro.incluirApagados
    && !filtro.soCancelados
    && !filtro.soRecusa
    && !filtro.semErp
    && !filtro.comPendencia
    && !filtro.semNotaFiscal
    && filtro.ordem === base.ordem
  )
}

/** Lê a URL da mesa; descarta filtro legado que abria quase a base inteira ordenada do mais antigo. */
export function filtroEntradaPedidos(busca: string): FiltroPedidos {
  const filtro = filtroDaBusca(busca)
  if (filtroSoParadosIsolado(filtro)) return filtroInicial()
  if (filtro.soParados && filtro.direcao === "asc" && filtro.ordem === "atualizado") {
    return { ...filtro, direcao: "desc" }
  }
  return filtro
}

export function filtroDaBusca(busca: string): FiltroPedidos {
  const params = new URLSearchParams(busca.startsWith("?") ? busca.slice(1) : busca)
  const ordem = params.get("ordem")
  const direcao = params.get("dir")
  const de = params.get("de") ?? ""
  const ate = params.get("ate") ?? ""
  return {
    texto: params.get("q") ?? "",
    status: params.getAll("status").map((item) => item.trim()).filter(Boolean),
    vendedor: params.get("vendedor") ?? "",
    uf: params.get("uf") ?? "",
    de: DIA.test(de) ? de : "",
    ate: DIA.test(ate) ? ate : "",
    incluirApagados: params.get("apagados") === "1",
    soCancelados: params.get("cancelados") === "1",
    soRecusa: params.get("recusa") === "1",
    soParados: params.get("parados") === "1",
    semErp: params.get("sem_erp") === "1",
    comPendencia: params.get("pendencia") === "1",
    semNotaFiscal: params.get("sem_nota_fiscal") === "1",
    ordem: CAMPOS.includes(ordem as CampoOrdem) ? (ordem as CampoOrdem) : "atualizado",
    direcao: direcao === "asc" ? "asc" : "desc",
  }
}

export function buscaDoFiltro(filtro: FiltroPedidos) {
  const params = new URLSearchParams()
  if (filtro.texto) params.set("q", filtro.texto)
  for (const status of filtro.status) params.append("status", status)
  if (filtro.vendedor) params.set("vendedor", filtro.vendedor)
  if (filtro.uf) params.set("uf", filtro.uf)
  if (filtro.de) params.set("de", filtro.de)
  if (filtro.ate) params.set("ate", filtro.ate)
  if (filtro.incluirApagados) params.set("apagados", "1")
  if (filtro.soCancelados) params.set("cancelados", "1")
  if (filtro.soRecusa) params.set("recusa", "1")
  if (filtro.soParados) params.set("parados", "1")
  if (filtro.semErp) params.set("sem_erp", "1")
  if (filtro.comPendencia) params.set("pendencia", "1")
  if (filtro.semNotaFiscal) params.set("sem_nota_fiscal", "1")
  if (filtro.ordem !== "atualizado") params.set("ordem", filtro.ordem)
  if (filtro.direcao !== "desc") params.set("dir", filtro.direcao)
  const texto = params.toString()
  return texto ? `?${texto}` : ""
}

export function selDaBusca(busca: string): number | null {
  const params = new URLSearchParams(busca.startsWith("?") ? busca.slice(1) : busca)
  const bruto = params.get("sel")
  if (!bruto) return null
  const id = Number(bruto)
  return Number.isFinite(id) && id > 0 ? id : null
}

export type NavegacaoMesaPedidos = {
  vista?: VistaPedidos
  erp?: ErpFiltroView
}

/** Query da lista com filtro, vista, ERP e pedido selecionado no painel rápido. */
export function buscaLista(filtro: FiltroPedidos, sel: number | null = null, navegacao?: NavegacaoMesaPedidos) {
  const params = new URLSearchParams(buscaDoFiltro(filtro).replace(/^\?/, ""))
  if (navegacao?.vista === "completa") params.set("vista", "completa")
  const erp = navegacao?.erp ?? "todos"
  if (erp !== "todos") params.set("erp", erp)
  if (sel) params.set("sel", String(sel))
  const texto = params.toString()
  return texto ? `?${texto}` : ""
}

/** Encoda a busca atual para voltar da página de detalhe (`from`). */
export function fromParaDetalhe(busca: string) {
  const q = busca.startsWith("?") ? busca.slice(1) : busca
  const params = new URLSearchParams(q)
  params.delete("sel")
  const limpo = params.toString()
  return encodeURIComponent(limpo ? `?${limpo}` : "")
}

export function voltarPedidosUrl(from: string | null | undefined) {
  if (!from) return "/pedidos"
  try {
    const decodificado = decodeURIComponent(from)
    return decodificado.startsWith("?") ? `/pedidos${decodificado}` : `/pedidos?${decodificado}`
  } catch {
    return "/pedidos"
  }
}

export function vizinhosLista(ids: readonly number[], idAtual: number) {
  const indice = ids.indexOf(idAtual)
  if (indice < 0) return { indice: -1, anterior: null, proximo: null, total: ids.length }
  return {
    indice,
    anterior: indice > 0 ? ids[indice - 1]! : null,
    proximo: indice < ids.length - 1 ? ids[indice + 1]! : null,
    total: ids.length,
  }
}

export type ContagensExcecaoPedidos = {
  parados: number
  comPendencia: number
  semNotaFiscal: number
  emAnalise: number
  comRecusaErp: number
}

export function contagensExcecaoPedidos(pedidos: readonly PedidoLista[], contexto: ContextoFiltroPedidos): ContagensExcecaoPedidos {
  let parados = 0
  let comPendencia = 0
  let semNotaFiscal = 0
  let emAnalise = 0
  let comRecusaErp = 0
  const comNota = contexto.pedidosComNota ?? new Set<number>()
  for (const pedido of pedidos) {
    if (pedido.apagadoEm) continue
    if (pedidoParado(pedido)) parados += 1
    if (contexto.pedidosComPendencia?.has(pedido.id)) comPendencia += 1
    if (pedidoSemNotaNaReplica(pedido, comNota)) semNotaFiscal += 1
    if (pedido.erpRecusa?.trim()) comRecusaErp += 1
    if (statusEmAnaliseNome(pedido.status)) emAnalise += 1
  }
  return { parados, comPendencia, semNotaFiscal, emAnalise, comRecusaErp }
}

/** Texto curto do filtro ativo para o operador. */
export function rotuloFiltroPedidos(filtro: FiltroPedidos) {
  const partes: string[] = []
  if (filtro.texto.trim()) partes.push(`busca “${filtro.texto.trim()}”`)
  if (filtro.status.length) partes.push(`situação ${filtro.status.join(", ")}`)
  if (filtro.comPendencia) partes.push("com pendência")
  if (filtro.semNotaFiscal) partes.push("faturado sem nota no BI")
  if (filtro.soParados) partes.push("sem mudança na coleta há +4h")
  if (filtro.soRecusa) partes.push("recusa no ERP")
  if (filtro.soCancelados) partes.push("só cancelados")
  if (filtro.semErp) partes.push("sem número no ERP")
  if (filtro.vendedor) partes.push(`vendedor ${filtro.vendedor}`)
  if (filtro.uf) partes.push(`UF ${filtro.uf}`)
  if (filtro.de || filtro.ate) partes.push(`período ${filtro.de || "…"} – ${filtro.ate || "…"}`)
  return partes.length ? partes.join(" · ") : null
}

export function filasExcecaoPedidos(contagens: ContagensExcecaoPedidos, totalCarregado: number): AcaoPrioritaria[] {
  const acoes: AcaoPrioritaria[] = []
  if (contagens.comPendencia > 0) {
    acoes.push({
      id: "pendencia",
      titulo: "Pendência aberta",
      texto: `${contagens.comPendencia.toLocaleString("pt-BR")} pedido(s) com pendência na réplica.`,
      href: `/pedidos${buscaDoFiltro({ ...filtroInicial(), comPendencia: true })}`,
      cta: "Ver fila",
      tom: "amber",
      simbolo: "!",
    })
  }
  if (contagens.semNotaFiscal > 0) {
    acoes.push({
      id: "sem_nota",
      titulo: "Faturado sem nota",
      texto: `${contagens.semNotaFiscal.toLocaleString("pt-BR")} pedido(s) INVOICE-ATIVO sem nota no BI.`,
      href: `/pedidos${buscaDoFiltro({ ...filtroInicial(), semNotaFiscal: true })}`,
      cta: "Ver fila",
      tom: "red",
      simbolo: "◎",
    })
  }
  const paradosSaoMaioria = totalCarregado > 0 && contagens.parados / totalCarregado > 0.35
  if (contagens.parados > 0 && !paradosSaoMaioria) {
    acoes.push({
      id: "parados",
      titulo: "Sem mudança recente",
      texto: `${contagens.parados.toLocaleString("pt-BR")} pedido(s) sem alteração na coleta há +4h (exceção, não a lista inteira).`,
      href: `/pedidos${buscaDoFiltro({ ...filtroInicial(), soParados: true, ordem: "atualizado", direcao: "desc" })}`,
      cta: "Ver exceções",
      tom: "blue",
      simbolo: "⏱",
    })
  }
  return acoes.slice(0, 3)
}

/** Cor do Sellent só entra como marca. Fundo claro demais volta para o azul da EGAPLAST. */
export function corLegivel(cor: string | null) {
  const rgb = cor ? hexParaRgb(cor) : null
  if (!rgb) return COR_MARCA
  const [r, g, b] = rgb.map(canalLinear)
  const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminancia > 0.7 ? COR_MARCA : cor!.trim()
}

function selecionar(pedidos: readonly PedidoLista[], filtro: FiltroPedidos, contexto: ContextoFiltroPedidos) {
  const texto = normalizar(filtro.texto)
  const status = new Set(filtro.status)
  const uf = filtro.uf.trim().toUpperCase()
  return pedidos.filter((pedido) => {
    if (!filtro.incluirApagados && pedido.apagadoEm) return false
    if (filtro.soCancelados && !pedido.cancelado) return false
    if (filtro.soRecusa && !pedido.erpRecusa?.trim()) return false
    if (filtro.soParados && !pedidoParado(pedido)) return false
    if (filtro.semErp && (pedido.erpNumero?.trim() || pedido.erpRecusa?.trim())) return false
    if (filtro.comPendencia && !contexto.pedidosComPendencia?.has(pedido.id)) return false
    if (filtro.semNotaFiscal && !pedidoSemNotaNaReplica(pedido, contexto.pedidosComNota ?? new Set())) return false
    if (status.size > 0 && !status.has(nomeStatus(pedido))) return false
    if (filtro.vendedor && (pedido.vendedor ?? "") !== filtro.vendedor) return false
    if (uf && (pedido.uf ?? "").trim().toUpperCase() !== uf) return false
    if (filtro.de || filtro.ate) {
      const dia = diaSaoPaulo(pedido.dataPedido)
      if (!diaDentroDoFiltroUi(dia, filtro.de, filtro.ate)) return false
    }
    if (texto) {
      const alvo = [pedido.codigo, pedido.erpNumero, pedido.cliente, pedido.loja].map(normalizar).join("\n")
      if (!alvo.includes(texto)) return false
    }
    return true
  })
}

function somar(linhas: readonly PedidoLista[]): TotaisPedidos {
  let soma = 0
  let comErp = 0
  let comRecusa = 0
  for (const linha of linhas) {
    if (linha.valor != null) soma += linha.valor
    if (linha.erpNumero?.trim()) comErp += 1
    if (linha.erpRecusa?.trim()) comRecusa += 1
  }
  return {
    quantidade: linhas.length,
    soma,
    ticket: linhas.length === 0 ? null : soma / linhas.length,
    comErp,
    comRecusa,
  }
}

function comparar(a: PedidoLista, b: PedidoLista, filtro: FiltroPedidos) {
  const fator = filtro.direcao === "asc" ? 1 : -1
  if (filtro.ordem === "valor") return compararNumero(a.valor, b.valor, fator) || a.id - b.id
  if (filtro.ordem === "atualizado") {
    return compararNumero(marco(a.atualizadoEm), marco(b.atualizadoEm), fator) || a.id - b.id
  }
  const textoA = textoOrdem(a, filtro.ordem)
  const textoB = textoOrdem(b, filtro.ordem)
  if (!textoA && !textoB) return a.id - b.id
  if (!textoA) return 1
  if (!textoB) return -1
  return textoA.localeCompare(textoB, "pt-BR", { numeric: true, sensitivity: "base" }) * fator || a.id - b.id
}

function textoOrdem(pedido: PedidoLista, campo: CampoOrdem) {
  if (campo === "codigo") return pedido.codigo?.trim() || null
  if (campo === "erp") return pedido.erpNumero?.trim() || null
  if (campo === "cliente") return pedido.cliente?.trim() || null
  if (campo === "loja") return pedido.loja?.trim() || null
  if (campo === "vendedor") return pedido.vendedor?.trim() || null
  if (campo === "status") return nomeStatus(pedido)
  if (campo === "uf") return pedido.uf?.trim() || null
  return null
}

function compararNumero(a: number | null, b: number | null, fator: number) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return (a - b) * fator
}

function marco(iso: string | null) {
  if (!iso) return null
  const valor = Date.parse(iso)
  return Number.isFinite(valor) ? valor : null
}

function diaSaoPaulo(iso: string | null) {
  if (!iso) return null
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return null
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data)
}

function normalizar(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
}

function hexParaRgb(cor: string): [number, number, number] | null {
  const limpo = cor.trim().replace(/^#/, "")
  const hex = limpo.length === 3 ? limpo.split("").map((canal) => canal + canal).join("") : limpo
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
}

function canalLinear(canal: number) {
  const s = canal / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
