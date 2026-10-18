"use client"

import {
  filtrarLinhasFaturamento,
  filtroFaturamentoDaBusca,
  filtroFaturamentoInicial,
  rotuloCredito,
  rotuloSituacao,
  type LinhaPedidoFatura,
} from "@/domain/faturamento"
import { dataCurta, moeda } from "@/lib/format"
import { cn } from "cn"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"

const ALTURA = 52

const BADGE_SITUACAO = {
  sem_nota: "bg-[#fff2dc] text-[#a76512]",
  com_nota: "bg-[#e5f5ed] text-[#187552]",
  gap: "bg-[#ffeaeb] text-[#b43b42]",
} as const

const BADGE_CREDITO = {
  success: "bg-[#e5f5ed] text-[#187552]",
  warning: "bg-[#fff2dc] text-[#a76512]",
  danger: "bg-[#ffeaeb] text-[#b43b42]",
  neutral: "bg-[#edf0f4] text-[#64748b]",
} as const

export function MesaFaturamento({
  linhas,
  creditos,
}: {
  linhas: LinhaPedidoFatura[]
  creditos: string[]
}) {
  const [filtro, setFiltro] = useState(() => filtroFaturamentoInicial())
  const pronto = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewport, setViewport] = useState(480)

  const filtradas = useMemo(() => filtrarLinhasFaturamento(linhas, filtro), [linhas, filtro])

  useEffect(() => {
    if (!pronto.current) {
      pronto.current = true
      setFiltro(filtroFaturamentoDaBusca(window.location.search))
      return
    }
    const proxima = `${window.location.pathname}${buscaComPeriodo(filtro)}`
    if (`${window.location.pathname}${window.location.search}` !== proxima) {
      window.history.replaceState(null, "", proxima)
    }
  }, [filtro])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observador = new ResizeObserver(() => setViewport(el.clientHeight || 480))
    observador.observe(el)
    return () => observador.disconnect()
  }, [filtradas.length])

  const { inicio, fim, antes, depois } = janela(filtradas.length, scrollTop, viewport)
  const visiveis = filtradas.slice(inicio, fim)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-5 pb-4">
        <label className="relative min-w-[180px] flex-1">
          <span className="pointer-events-none absolute top-2.5 left-2.5 text-muted-foreground">⌕</span>
          <input
            type="search"
            placeholder="Buscar por pedido ou cliente..."
            className="h-10 w-full rounded-lg border border-border bg-card py-2 pr-3 pl-8 text-sm outline-none focus-visible:border-ring"
            value={filtro.texto}
            onChange={(e) => setFiltro((atual) => ({ ...atual, texto: e.target.value }))}
          />
        </label>
        <select
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-[#485569] outline-none"
          value={filtro.situacao}
          onChange={(e) =>
            setFiltro((atual) => ({ ...atual, situacao: e.target.value as typeof filtro.situacao }))
          }
          aria-label="Situação fiscal"
        >
          <option value="">Todas as situações</option>
          <option value="sem_nota">Sem nota</option>
          <option value="com_nota">Com nota</option>
          <option value="gap">Gap de valor</option>
        </select>
        <select
          className="h-10 max-w-[12rem] truncate rounded-lg border border-border bg-card px-3 text-sm text-[#485569] outline-none"
          value={filtro.credito}
          onChange={(e) => setFiltro((atual) => ({ ...atual, credito: e.target.value }))}
          aria-label="Status de crédito"
        >
          <option value="">Todo crédito</option>
          {creditos.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="h-10 cursor-pointer rounded-lg border border-border bg-card px-3 text-sm font-semibold text-[#3c4859] hover:bg-muted/80"
          onClick={() => setFiltro(filtroFaturamentoInicial())}
        >
          Limpar filtros
        </button>
      </div>

      <div ref={scrollRef} className="max-h-[min(520px,60vh)] overflow-auto border-t border-border" onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[var(--cabecalho-tabela)]">
            <tr className="text-[10px] font-bold tracking-wide text-[#738095] uppercase">
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Situação fiscal</th>
              <th className="px-4 py-3">Última nota</th>
              <th className="px-4 py-3 text-right">Valor pedido</th>
              <th className="px-4 py-3 text-right">Valor notas</th>
              <th className="px-4 py-3">Crédito</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {antes > 0 ? (
              <tr aria-hidden="true">
                <td colSpan={8} style={{ height: antes, padding: 0, border: 0 }} />
              </tr>
            ) : null}
            {visiveis.map((linha) => (
              <Linha key={linha.pedidoId} linha={linha} />
            ))}
            {depois > 0 ? (
              <tr aria-hidden="true">
                <td colSpan={8} style={{ height: depois, padding: 0, border: 0 }} />
              </tr>
            ) : null}
          </tbody>
        </table>
        {filtradas.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum pedido neste recorte.</p>
        ) : null}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
        <span>
          Exibindo <strong className="text-foreground">{filtradas.length.toLocaleString("pt-BR")}</strong> pedido
          {filtradas.length === 1 ? "" : "s"}
        </span>
        <span className="tabular">{linhas.length.toLocaleString("pt-BR")} no mês · lista virtualizada</span>
      </footer>
    </div>
  )
}

function Linha({ linha }: { linha: LinhaPedidoFatura }) {
  const href = `/pedidos/${linha.pedidoId}`
  const credito = rotuloCredito(linha.credito)
  return (
    <tr className="border-b border-[#edf0f4] transition-colors hover:bg-[#f8fbfa]">
      <td className="px-4 py-3.5 whitespace-nowrap">
        <Link href={href} className="block">
          <span className="font-bold text-[#1c5c4d] tabular">{linha.codigo}</span>
        </Link>
      </td>
      <td className="max-w-48 truncate px-4 py-3.5 text-xs font-semibold">{linha.cliente ?? "—"}</td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className={cn("inline-flex rounded-md px-2 py-1 text-[10px] font-bold", BADGE_SITUACAO[linha.situacao])}>
          {rotuloSituacao(linha.situacao)}
        </span>
      </td>
      <td className="px-4 py-3.5 text-xs whitespace-nowrap text-muted-foreground">{dataCurta(linha.ultimaNota) || "—"}</td>
      <td className="tabular px-4 py-3.5 text-right text-xs font-bold whitespace-nowrap">{moeda(linha.valorPedido)}</td>
      <td className="tabular px-4 py-3.5 text-right text-xs font-bold whitespace-nowrap">{moeda(linha.valorNotas)}</td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className={cn("inline-flex rounded-md px-2 py-1 text-[10px] font-bold", BADGE_CREDITO[credito.tom])}>{credito.rotulo}</span>
      </td>
      <td className="px-4 py-3.5">
        <Link href={href} className="text-muted-foreground hover:text-brand">
          ↗
        </Link>
      </td>
    </tr>
  )
}

function buscaComPeriodo(filtro: ReturnType<typeof filtroFaturamentoInicial>) {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")
  params.delete("q")
  params.delete("situacao")
  params.delete("credito")
  if (filtro.texto) params.set("q", filtro.texto)
  if (filtro.situacao) params.set("situacao", filtro.situacao)
  if (filtro.credito) params.set("credito", filtro.credito)
  const texto = params.toString()
  return texto ? `?${texto}` : ""
}

function janela(total: number, scrollTop: number, viewport: number) {
  const folga = 4
  const inicio = Math.max(0, Math.floor(scrollTop / ALTURA) - folga)
  const visiveis = Math.ceil(viewport / ALTURA) + folga * 2
  const fim = Math.min(total, inicio + visiveis)
  return { inicio, fim, antes: inicio * ALTURA, depois: (total - fim) * ALTURA }
}
