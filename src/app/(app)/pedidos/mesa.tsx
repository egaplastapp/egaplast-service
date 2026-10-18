"use client"

import { EVENTO_BUSCA } from "@/components/casca/busca"
import { PainelRapido } from "@/app/(app)/pedidos/painel-rapido"
import { PrioridadesPedidos } from "@/app/(app)/pedidos/prioridades-pedidos"
import { OrigemPill, StatusBadge, TempoSemEvento } from "@/components/pedidos/badges"
import { NoticeBar } from "@/components/premium/notice-bar"
import { PageHead } from "@/components/premium/page-head"
import { Cartao, Indicador } from "@/components/pagina"
import { Button } from "@/components/ui/button"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ContagensGlobaisPedidos } from "@/lib/pedidos/contagens"
import {
  LIMITE_VISTA_OPERACIONAL,
  TETO_LISTA,
  aplicarLimiteVista,
  buscaLista,
  contagensExcecaoPedidos,
  corLegivel,
  distribuicaoStatus,
  erpDaBusca,
  filtrarErpView,
  filtrarPedidos,
  filtroNegocioAtivo,
  filtroEntradaPedidos,
  filtroInicial,
  fromParaDetalhe,
  motivosFilaPedido,
  rotuloFiltroPedidos,
  rotuloMotivosFila,
  opcoesLista,
  selDaBusca,
  vistaDaBusca,
  type CampoOrdem,
  type ContextoFiltroPedidos,
  type ErpFiltroView,
  type FiltroPedidos,
  type PedidoLista,
  type VistaPedidos,
} from "@/domain/pedidos"
import { gravarRecorteNavegacao } from "@/lib/pedidos/navegacao"
import { dataCurta, dataHora, moeda } from "@/lib/format"
import { cn } from "cn"
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, ClipboardList, Receipt, Search, Wallet, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { memo, useEffect, useMemo, useRef, useState } from "react"

const ALTURA = 52
const CABECALHO = 44
const FOLGA = 8

const COLUNAS: { campo: CampoOrdem | null; rotulo: string; direita?: boolean }[] = [
  { campo: "codigo", rotulo: "Pedido" },
  { campo: "cliente", rotulo: "Cliente" },
  { campo: "erp", rotulo: "ERP" },
  { campo: "status", rotulo: "Situação" },
  { campo: "valor", rotulo: "Valor", direita: true },
  { campo: "atualizado", rotulo: "Última atualização" },
  { campo: null, rotulo: "Prioridade" },
  { campo: null, rotulo: "Idade na réplica" },
  { campo: null, rotulo: "Origem" },
  { campo: null, rotulo: "" },
]

const controle =
  "h-10 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function Mesa({
  pedidos,
  truncado,
  pedidosComNota = new Set<number>(),
  pedidosComPendencia = new Set<number>(),
  contagensGlobais,
  proveniencia,
}: {
  pedidos: PedidoLista[]
  truncado: boolean
  pedidosComNota?: ReadonlySet<number>
  pedidosComPendencia?: ReadonlySet<number>
  contagensGlobais?: ContagensGlobaisPedidos
  proveniencia?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const buscaNaUrl = searchParams.toString()
  const contextoFiltro: ContextoFiltroPedidos = useMemo(
    () => ({ pedidosComNota, pedidosComPendencia }),
    [pedidosComNota, pedidosComPendencia],
  )
  const [filtro, setFiltro] = useState(filtroInicial)
  const [selId, setSelId] = useState<number | null>(null)
  const [indiceFoco, setIndiceFoco] = useState(-1)
  const [mobile, setMobile] = useState(false)
  const [vista, setVista] = useState<VistaPedidos>("operacional")
  const [erpView, setErpView] = useState<ErpFiltroView>("todos")
  const [filtrosAvancados, setFiltrosAvancados] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const buscaUrlAnterior = useRef(buscaNaUrl)
  const quadro = useRef(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewport, setViewport] = useState(640)

  const recorte = useMemo(() => filtrarPedidos(pedidos, filtro, contextoFiltro), [pedidos, filtro, contextoFiltro])
  const negocioAtivo = useMemo(() => filtroNegocioAtivo(filtro), [filtro])
  const linhasErp = useMemo(() => filtrarErpView(recorte.linhas, erpView), [recorte.linhas, erpView])
  const linhas = useMemo(
    () => aplicarLimiteVista(linhasErp, vista, negocioAtivo),
    [linhasErp, vista, negocioAtivo],
  )
  const totalRecorteErp = linhasErp.length
  const opcoes = useMemo(() => opcoesLista(pedidos), [pedidos])
  const faixa = useMemo(() => {
    const lista = distribuicaoStatus(pedidos, filtro)
    const nomes = new Set(lista.map((item) => item.nome))
    for (const nome of filtro.status) {
      if (!nomes.has(nome)) lista.push({ nome, cor: null, quantidade: 0 })
    }
    return lista
  }, [pedidos, filtro])

  const contagensRecorte = useMemo(() => contagensExcecaoPedidos(pedidos, contextoFiltro), [pedidos, contextoFiltro])
  const contagens = contagensGlobais ?? contagensRecorte
  const rotuloFiltro = useMemo(() => rotuloFiltroPedidos(filtro), [filtro])
  const buscaAtual = useMemo(
    () => buscaLista(filtro, selId, { vista, erp: erpView }),
    [filtro, selId, vista, erpView],
  )
  const idsRecorteNavegacao = useMemo(
    () =>
      negocioAtivo || vista === "completa"
        ? linhasErp.map((item) => item.id)
        : linhas.map((item) => item.id),
    [negocioAtivo, vista, linhasErp, linhas],
  )

  function sincronizarUrl(
    proximoFiltro: FiltroPedidos,
    proximoSel: number | null,
    proximaVista: VistaPedidos = vista,
    proximoErp: ErpFiltroView = erpView,
  ) {
    const proxima = `${window.location.pathname}${buscaLista(proximoFiltro, proximoSel, { vista: proximaVista, erp: proximoErp })}`
    if (`${window.location.pathname}${window.location.search}` !== proxima) {
      window.history.replaceState(null, "", proxima)
    }
  }

  function selecionarPedido(id: number | null) {
    setSelId(id)
    if (id != null) {
      const indice = linhas.findIndex((item) => item.id === id)
      if (indice >= 0) setIndiceFoco(indice)
    }
    sincronizarUrl(filtro, id, vista, erpView)
  }

  function abrirCompleto(id: number) {
    gravarRecorteNavegacao(idsRecorteNavegacao, id)
    const from = fromParaDetalhe(buscaAtual)
    router.push(`/pedidos/${id}?from=${from}`)
  }

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1279px)")
    const atualizar = () => setMobile(mql.matches)
    atualizar()
    mql.addEventListener("change", atualizar)
    return () => mql.removeEventListener("change", atualizar)
  }, [])

  useEffect(() => {
    if (buscaUrlAnterior.current !== buscaNaUrl) {
      buscaUrlAnterior.current = buscaNaUrl
      const busca = buscaNaUrl ? `?${buscaNaUrl}` : ""
      setFiltro(filtroEntradaPedidos(busca))
      setSelId(selDaBusca(busca))
      setVista(vistaDaBusca(busca))
      setErpView(erpDaBusca(busca))
      return
    }
    const esperada = buscaLista(filtro, selId, { vista, erp: erpView })
    if (window.location.search === esperada) return
    window.history.replaceState(null, "", `${pathname}${esperada}`)
  }, [buscaNaUrl, filtro, selId, vista, erpView, pathname])

  useEffect(() => {
    function tecla(evento: KeyboardEvent) {
      if (evento.target instanceof HTMLInputElement || evento.target instanceof HTMLSelectElement || evento.target instanceof HTMLTextAreaElement) {
        return
      }
      if (linhas.length === 0) return
      if (evento.key === "ArrowDown") {
        evento.preventDefault()
        setIndiceFoco((atual) => {
          const proximo = Math.min(linhas.length - 1, atual < 0 ? 0 : atual + 1)
          selecionarPedido(linhas[proximo]!.id)
          return proximo
        })
      }
      if (evento.key === "ArrowUp") {
        evento.preventDefault()
        setIndiceFoco((atual) => {
          const proximo = Math.max(0, atual < 0 ? 0 : atual - 1)
          selecionarPedido(linhas[proximo]!.id)
          return proximo
        })
      }
      if (evento.key === "Escape") {
        evento.preventDefault()
        selecionarPedido(null)
        setIndiceFoco(-1)
      }
      const alvo = indiceFoco >= 0 ? linhas[indiceFoco] : linhas.find((item) => item.id === selId)
      if (!alvo) return
      if (evento.key === "Enter" && !evento.ctrlKey && !evento.metaKey) {
        evento.preventDefault()
        selecionarPedido(alvo.id)
      }
      if ((evento.key === "Enter" && (evento.ctrlKey || evento.metaKey)) || (evento.key.toLowerCase() === "o" && !evento.ctrlKey)) {
        evento.preventDefault()
        abrirCompleto(alvo.id)
      }
    }
    window.addEventListener("keydown", tecla)
    return () => window.removeEventListener("keydown", tecla)
  }, [indiceFoco, linhas, selId, filtro])

  useEffect(() => {
    setErpView((atual) => {
      if (filtro.soRecusa) return "recusa"
      if (filtro.semErp) return "sem"
      if (atual === "recusa" && !filtro.soRecusa) return "todos"
      if (atual === "sem" && !filtro.semErp) return "todos"
      return atual
    })
  }, [filtro.soRecusa, filtro.semErp])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observador = new ResizeObserver(() => setViewport(el.clientHeight || 640))
    observador.observe(el)
    return () => observador.disconnect()
  }, [linhas.length])

  useEffect(() => () => cancelAnimationFrame(quadro.current), [])

  useEffect(() => {
    function aoBuscar(evento: Event) {
      const texto = (evento as CustomEvent<string>).detail
      if (scrollRef.current) scrollRef.current.scrollTop = 0
      setScrollTop(0)
      setFiltro((atual) => ({ ...atual, texto }))
      setVista("completa")
    }
    window.addEventListener(EVENTO_BUSCA, aoBuscar)
    return () => window.removeEventListener(EVENTO_BUSCA, aoBuscar)
  }, [])

  function atualizar(proximo: FiltroPedidos | ((atual: FiltroPedidos) => FiltroPedidos)) {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setScrollTop(0)
    setFiltro(proximo)
  }

  function aoRolar(evento: React.UIEvent<HTMLDivElement>) {
    const topo = evento.currentTarget.scrollTop
    cancelAnimationFrame(quadro.current)
    quadro.current = requestAnimationFrame(() => setScrollTop(topo))
  }

  function ordenar(campo: CampoOrdem) {
    atualizar((atual) => {
      if (atual.ordem === campo) return { ...atual, direcao: atual.direcao === "asc" ? "desc" : "asc" }
      const direcao = campo === "valor" || campo === "atualizado" ? "desc" : "asc"
      return { ...atual, ordem: campo, direcao }
    })
  }

  const { inicio, fim, antes, depois } = janela(linhas.length, scrollTop, viewport)
  const visiveis = linhas.slice(inicio, fim)
  const ativo = negocioAtivo || erpView !== "todos" || vista === "completa"
  const mostrarKpis = negocioAtivo || vista === "completa"
  const statusUnico = filtro.status.length === 1 ? filtro.status[0] : ""
  const motivosSelecionado = useMemo(() => {
    if (selId == null) return null
    const pedido = pedidos.find((p) => p.id === selId)
    return pedido ? motivosFilaPedido(pedido, contextoFiltro) : null
  }, [selId, pedidos, contextoFiltro])

  function vistaPadrao() {
    setErpView("todos")
    setVista("operacional")
    setFiltrosAvancados(false)
    selecionarPedido(null)
    setIndiceFoco(-1)
    atualizar(filtroInicial())
  }

  function mudarErp(valor: ErpFiltroView) {
    setErpView(valor)
    if (valor === "recusa") {
      atualizar((atual) => ({ ...atual, soRecusa: true, soParados: false, semErp: false }))
      setVista("completa")
    } else if (valor === "sem") {
      atualizar((atual) => ({ ...atual, semErp: true, soRecusa: false, soParados: false }))
      setVista("completa")
    } else if (valor === "todos") {
      atualizar((atual) => ({ ...atual, soRecusa: false, semErp: false }))
    } else {
      setVista("completa")
    }
  }

  function limparTudo() {
    vistaPadrao()
  }

  return (
    <div className="space-y-5">
      <p className="sr-only" aria-live="polite">
        {linhas.length} pedidos na lista, soma do recorte {moeda(recorte.totais.soma)}.
      </p>

      <PageHead
        eyebrow="Central de operações"
        titulo="Pedidos"
        subtitulo={
          proveniencia
            ? proveniencia
            : negocioAtivo
              ? "Recorte filtrado — trate exceções ou volte à vista operacional."
              : vista === "completa"
                ? "Todos os pedidos carregados, mais recentes primeiro."
                : `${LIMITE_VISTA_OPERACIONAL} pedidos mais recentes · clique na linha para o painel · Ctrl+Enter abre o detalhe.`
        }
        acoes={
          ativo ? (
            <Button type="button" variant="outline" size="sm" onClick={vistaPadrao}>
              Vista padrão
            </Button>
          ) : null
        }
      />

      {truncado ? (
        <NoticeBar tom="aviso">
          Leitura limitada a {TETO_LISTA.toLocaleString("pt-BR")} pedidos. KPIs da tabela valem para o recorte carregado; pills de prioridade usam a base inteira na réplica.
        </NoticeBar>
      ) : null}

      <PrioridadesPedidos
        contagens={contagens}
        contagensGlobais={Boolean(contagensGlobais)}
        pedidos={pedidos}
        filtro={filtro}
        filtroNegocio={negocioAtivo}
        vistaCompleta={vista === "completa"}
      />

      {!negocioAtivo && vista === "operacional" ? (
        <NoticeBar tom="ok">
          Réplica Sellent · exibindo os {LIMITE_VISTA_OPERACIONAL} pedidos atualizados mais recentemente. Use as prioridades acima ou{" "}
          <Link href="/pedidos?vista=completa" className="font-semibold underline underline-offset-2">
            ver todos
          </Link>
          .
        </NoticeBar>
      ) : null}

      {negocioAtivo && rotuloFiltro ? (
        <NoticeBar tom="aviso">
          <span className="font-semibold">Filtro:</span> {rotuloFiltro}.{" "}
          <button type="button" className="font-semibold underline underline-offset-2" onClick={vistaPadrao}>
            Vista padrão
          </button>
        </NoticeBar>
      ) : null}

      {mostrarKpis ? (
        <section aria-label="Totais do recorte" className="grid gap-3 sm:grid-cols-3">
          <Indicador tom="success" rotulo="Valor final" icone={Wallet} valor={moeda(recorte.totais.soma)} detalhe="Sellent · recorte filtrado" />
          <Indicador tom="info" rotulo="Pedidos" icone={ClipboardList} valor={inteiro(totalRecorteErp)} detalhe="Após filtros de negócio e ERP" />
          <Indicador
            tom="warning"
            rotulo="Ticket médio"
            icone={Receipt}
            valor={recorte.totais.ticket == null ? "—" : moeda(recorte.totais.ticket)}
            detalhe="Valor ÷ quantidade"
          />
        </section>
      ) : null}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <Cartao
        titulo={vista === "operacional" && !negocioAtivo ? "Pedidos recentes" : "Pedidos do recorte"}
        descricao={
          vista === "operacional" && !negocioAtivo
            ? "Triagem diária — expanda filtros avançados se precisar varrer a base."
            : "Lista virtualizada — só renderiza linhas visíveis na rolagem."
        }
        corpo="p-0"
        className="min-w-0 flex-1"
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-4">
          <label className="relative min-w-[180px] flex-1">
            <span className="sr-only">Buscar pedido ou cliente</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              className={cn(controle, "pl-9")}
              value={filtro.texto}
              placeholder="Buscar por pedido, ERP, cliente ou loja…"
              autoComplete="off"
              onChange={(evento) => atualizar((atual) => ({ ...atual, texto: evento.target.value }))}
            />
          </label>
          <select
            className={cn(controle, "w-auto min-w-[10rem]")}
            aria-label="Filtrar por situação"
            value={statusUnico}
            onChange={(evento) => {
              const valor = evento.target.value
              setVista("completa")
              atualizar((atual) => ({ ...atual, status: valor ? [valor] : [] }))
            }}
          >
            <option value="">Todas as situações</option>
            {faixa.map((item) => (
              <option key={item.nome} value={item.nome}>
                {item.nome} ({item.quantidade})
              </option>
            ))}
          </select>
          <select
            className={cn(controle, "w-auto min-w-[9rem]")}
            aria-label="Filtrar por ERP"
            value={erpView}
            onChange={(evento) => mudarErp(evento.target.value as ErpFiltroView)}
          >
            <option value="todos">ERP — todos</option>
            <option value="numero">Com número</option>
            <option value="recusa">Com recusa</option>
            <option value="sem">Sem número</option>
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 shrink-0"
            aria-expanded={filtrosAvancados}
            onClick={() => setFiltrosAvancados((aberto) => !aberto)}
          >
            Mais filtros
          </Button>
          {negocioAtivo || erpView !== "todos" ? (
            <button
              type="button"
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-muted"
              onClick={limparTudo}
            >
              <X className="size-4" aria-hidden />
              Limpar
            </button>
          ) : null}
        </div>

        {filtrosAvancados ? (
          <div className="space-y-3 border-b border-border bg-muted/20 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className={cn(controle, "w-auto min-w-[9rem]")}
                aria-label="Vendedor"
                value={filtro.vendedor}
                onChange={(evento) => {
                  setVista("completa")
                  atualizar((atual) => ({ ...atual, vendedor: evento.target.value }))
                }}
              >
                <option value="">Vendedor</option>
                {opcoes.vendedores.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
              <select
                className={cn(controle, "w-auto min-w-[5rem]")}
                aria-label="UF"
                value={filtro.uf}
                onChange={(evento) => {
                  setVista("completa")
                  atualizar((atual) => ({ ...atual, uf: evento.target.value }))
                }}
              >
                <option value="">UF</option>
                {opcoes.ufs.map((sigla) => (
                  <option key={sigla} value={sigla}>
                    {sigla}
                  </option>
                ))}
              </select>
              <input
                type="date"
                aria-label="Pedido de"
                className={cn(controle, "w-auto")}
                value={filtro.de}
                max={filtro.ate || undefined}
                onChange={(evento) => {
                  setVista("completa")
                  atualizar((atual) => ({ ...atual, de: evento.target.value }))
                }}
              />
              <input
                type="date"
                aria-label="Pedido até"
                className={cn(controle, "w-auto")}
                value={filtro.ate}
                min={filtro.de || undefined}
                onChange={(evento) => {
                  setVista("completa")
                  atualizar((atual) => ({ ...atual, ate: evento.target.value }))
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Interruptor ativo={filtro.incluirApagados} onClick={() => atualizar((atual) => ({ ...atual, incluirApagados: !atual.incluirApagados }))}>
                Apagados
              </Interruptor>
              <Interruptor ativo={filtro.soCancelados} onClick={() => atualizar((atual) => ({ ...atual, soCancelados: !atual.soCancelados }))}>
                Só cancelados
              </Interruptor>
              <Interruptor ativo={filtro.soRecusa} onClick={() => atualizar((atual) => ({ ...atual, soRecusa: !atual.soRecusa }))}>
                Só recusa ERP
              </Interruptor>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Atalhos por status">
              {faixa.slice(0, 8).map((item) => {
                const ligado = filtro.status.includes(item.nome)
                return (
                  <button
                    key={item.nome}
                    type="button"
                    aria-pressed={ligado}
                    className={cn(
                      "inline-flex max-w-[10rem] cursor-pointer items-center gap-1.5 truncate rounded-md border px-2 py-1 text-[10px] font-bold",
                      ligado ? "border-brand/30 bg-brand-soft text-brand" : "border-border bg-card text-muted-foreground hover:bg-muted",
                    )}
                    onClick={() => {
                      setVista("completa")
                      atualizar((atual) => ({
                        ...atual,
                        status: ligado ? atual.status.filter((s) => s !== item.nome) : [...atual.status, item.nome],
                      }))
                    }}
                  >
                    <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: corLegivel(item.cor) }} aria-hidden />
                    {item.nome}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {linhas.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">
            Nenhum pedido neste recorte.
            {negocioAtivo ? (
              <Button type="button" variant="outline" className="mt-3 h-10" onClick={limparTudo}>
                Limpar filtros
              </Button>
            ) : null}
          </div>
        ) : (
          <div ref={scrollRef} className="max-h-[min(42rem,calc(100dvh-14rem))] overflow-auto" onScroll={aoRolar}>
            <table className="w-max min-w-full border-collapse text-left text-xs">
              <caption className="sr-only">
                {linhas.length} pedidos visíveis de {pedidos.length} carregados.
              </caption>
              <TableHeader className="sticky top-0 z-20">
                <TableRow className="border-b border-border hover:bg-transparent">
                  {COLUNAS.map((coluna, indice) => (
                    <TableHead
                      key={`${coluna.rotulo}-${indice}`}
                      scope="col"
                      aria-sort={
                        coluna.campo && filtro.ordem === coluna.campo ? (filtro.direcao === "asc" ? "ascending" : "descending") : "none"
                      }
                      className={cn(
                        "h-11 border-b border-border bg-(--cabecalho-tabela) px-4 py-3 text-[10px] font-bold tracking-[0.07em] text-[#738095] uppercase",
                        coluna.campo === "codigo" && "sticky left-0 z-30",
                        coluna.direita && "text-right",
                      )}
                    >
                      {coluna.campo ? (
                        <button
                          type="button"
                          className={cn("inline-flex w-full cursor-pointer items-center gap-1", coluna.direita && "justify-end")}
                          onClick={() => ordenar(coluna.campo!)}
                        >
                          {coluna.rotulo}
                          <Ordem campo={coluna.campo} filtro={filtro} />
                        </button>
                      ) : (
                        coluna.rotulo
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {antes > 0 ? (
                  <tr aria-hidden="true">
                    <td colSpan={COLUNAS.length} style={{ height: antes, padding: 0, border: 0 }} />
                  </tr>
                ) : null}
                {visiveis.map((pedido, offset) => {
                  const indice = inicio + offset
                  return (
                    <Linha
                      key={pedido.id}
                      pedido={pedido}
                      contexto={contextoFiltro}
                      selecionado={pedido.id === selId}
                      focado={indice === indiceFoco}
                      onSelecionar={() => selecionarPedido(pedido.id)}
                      onAbrirCompleto={() => abrirCompleto(pedido.id)}
                    />
                  )
                })}
                {depois > 0 ? (
                  <tr aria-hidden="true">
                    <td colSpan={COLUNAS.length} style={{ height: depois, padding: 0, border: 0 }} />
                  </tr>
                ) : null}
              </TableBody>
            </table>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
          <span>
            Exibindo <strong className="font-semibold text-foreground">{inteiro(linhas.length)}</strong>
            {vista === "operacional" && !negocioAtivo && totalRecorteErp > linhas.length
              ? ` de ${inteiro(totalRecorteErp)} no recorte (vista operacional)`
              : ` pedido${linhas.length === 1 ? "" : "s"}`}
            {erpView !== "todos" ? " · filtro ERP na URL" : ""}
          </span>
          <span className="tabular">{inteiro(pedidos.length)} carregados na réplica</span>
        </footer>
      </Cartao>

      <PainelRapido
        pedidoId={selId}
        idsRecorte={idsRecorteNavegacao}
        buscaAtual={buscaAtual}
        mobile={mobile}
        motivosFila={motivosSelecionado}
        onFechar={() => selecionarPedido(null)}
      />
      </div>
    </div>
  )
}

const Linha = memo(function Linha({
  pedido,
  contexto,
  selecionado,
  focado,
  onSelecionar,
  onAbrirCompleto,
}: {
  pedido: PedidoLista
  contexto: ContextoFiltroPedidos
  selecionado: boolean
  focado: boolean
  onSelecionar: () => void
  onAbrirCompleto: () => void
}) {
  const motivos = rotuloMotivosFila(motivosFilaPedido(pedido, contexto))
  const codigo = pedido.codigo ?? String(pedido.id)
  return (
    <TableRow
      className={cn(
        "group h-[52px] cursor-pointer border-b border-[#edf0f4] bg-card transition-colors hover:bg-[#f8fbfa]",
        selecionado && "bg-brand-soft/40",
        focado && "ring-2 ring-inset ring-brand/50",
      )}
      onClick={onSelecionar}
      onDoubleClick={onAbrirCompleto}
    >
      <TableCell className="sticky left-0 z-10 h-[52px] bg-inherit px-4 py-3 whitespace-nowrap">
        <span className="block">
          <span className="font-bold text-[#1c5c4d] tabular">{codigo}</span>
          <span className="mt-1 block text-[10px] text-muted-foreground">{dataCurta(pedido.dataPedido) || "—"}</span>
        </span>
        {pedido.cancelado ? <span className="text-[10px] text-danger">Cancelado</span> : null}
      </TableCell>
      <TableCell className="max-w-56 px-4 py-3">
        <p className="truncate font-semibold text-foreground">{pedido.cliente ?? pedido.loja ?? "—"}</p>
        {pedido.loja && pedido.cliente ? <p className="truncate text-[10px] text-muted-foreground">{pedido.loja}</p> : null}
      </TableCell>
      <TableCell className="px-4 py-3 whitespace-nowrap text-[#4b596b]" title={pedido.erpRecusa ?? pedido.erpNumero ?? undefined}>
        {pedido.erpNumero ?? (pedido.erpRecusa ? <span className="font-medium text-danger">{pedido.erpRecusa}</span> : "—")}
      </TableCell>
      <TableCell className="px-4 py-3 whitespace-nowrap">
        <StatusBadge pedido={pedido} />
      </TableCell>
      <TableCell className="tabular px-4 py-3 text-right font-bold whitespace-nowrap">{moeda(pedido.valor)}</TableCell>
      <TableCell className="tabular px-4 py-3 whitespace-nowrap text-foreground">{dataHora(pedido.atualizadoEm)}</TableCell>
      <TableCell className="max-w-[8rem] px-4 py-3">
        {motivos ? (
          <span className="text-[10px] font-semibold text-warning">{motivos}</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3 whitespace-nowrap">
        <TempoSemEvento iso={pedido.atualizadoEm} titulo="Tempo desde updated_at na réplica (não é evento operacional)" />
      </TableCell>
      <TableCell className="px-4 py-3 whitespace-nowrap">
        <OrigemPill pedido={pedido} />
      </TableCell>
      <TableCell className="px-3 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-xs font-semibold text-brand-strong opacity-80 group-hover:opacity-100"
          onClick={(evento) => {
            evento.stopPropagation()
            onAbrirCompleto()
          }}
        >
          Abrir
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Button>
      </TableCell>
    </TableRow>
  )
})

function Interruptor({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      className={cn(
        "inline-flex h-8 cursor-pointer items-center rounded-md border px-2.5 text-[11px] font-semibold transition-colors",
        ativo ? "border-brand/35 bg-brand-soft text-brand" : "border-border bg-card text-muted-foreground hover:bg-muted",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Ordem({ campo, filtro }: { campo: CampoOrdem; filtro: FiltroPedidos }) {
  if (filtro.ordem !== campo) return <ArrowUpDown className="size-3 shrink-0 opacity-50" aria-hidden />
  const Icone = filtro.direcao === "asc" ? ArrowUp : ArrowDown
  return <Icone className="size-3 shrink-0 text-brand" aria-hidden />
}

function janela(total: number, scrollTop: number, viewport: number) {
  const percorrido = Math.max(0, scrollTop - CABECALHO)
  const inicio = Math.max(0, Math.floor(percorrido / ALTURA) - FOLGA)
  const fim = Math.min(total, Math.ceil((percorrido + viewport) / ALTURA) + FOLGA)
  return { inicio, fim, antes: inicio * ALTURA, depois: Math.max(0, (total - fim) * ALTURA) }
}

function inteiro(valor: number) {
  return valor.toLocaleString("pt-BR")
}
