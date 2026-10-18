"use client"

import {
  LIMITE_VISTA_OPERACIONAL,
  buscaDoFiltro,
  filtroHrefAnalise,
  filtroInicial,
  type ContagensExcecaoPedidos,
  type FiltroPedidos,
  type PedidoLista,
} from "@/domain/pedidos"
import { cn } from "cn"
import Link from "next/link"

function hrefExcecao(filtro: Partial<FiltroPedidos>) {
  const base = buscaDoFiltro({ ...filtroInicial(), ...filtro })
  return `/pedidos${base ? `${base}&vista=completa` : "?vista=completa"}`
}

export function PrioridadesPedidos({
  contagens,
  pedidos,
  filtro,
  filtroNegocio,
  vistaCompleta,
  contagensGlobais = false,
}: {
  contagens: ContagensExcecaoPedidos
  contagensGlobais?: boolean
  pedidos: readonly PedidoLista[]
  filtro: FiltroPedidos
  filtroNegocio: boolean
  vistaCompleta: boolean
}) {
  const analiseAtivo = filtro.status.some((s) => {
    const up = s.toUpperCase()
    return up.includes("ANÁLISE") || up.includes("ANALISE")
  })

  const pills = [
    {
      id: "pendencia",
      cor: "#d99b36",
      valor: contagens.comPendencia,
      rotulo: "pendência aberta",
      href: hrefExcecao({ comPendencia: true }),
      ativo: filtro.comPendencia,
    },
    {
      id: "sem_nota",
      cor: "#c64d53",
      valor: contagens.semNotaFiscal,
      rotulo: "faturado sem nota",
      href: hrefExcecao({ semNotaFiscal: true }),
      ativo: filtro.semNotaFiscal,
    },
    {
      id: "recusa",
      cor: "#b43b42",
      valor: contagens.comRecusaErp,
      rotulo: "recusa no ERP",
      href: hrefExcecao({ soRecusa: true }),
      ativo: filtro.soRecusa,
    },
    {
      id: "analise",
      cor: "#4b88d8",
      valor: contagens.emAnalise,
      rotulo: "em análise (Sellent)",
      href: hrefExcecao(filtroHrefAnalise(pedidos)),
      ativo: analiseAtivo,
    },
  ]

  const verOperacionalHref = "/pedidos"

  return (
    <section aria-label="Prioridades operacionais" className="flex flex-wrap items-center gap-2">
      {contagensGlobais ? (
        <span className="w-full text-[11px] text-muted-foreground">Contagens na réplica inteira (Postgres), não só na lista carregada.</span>
      ) : null}
      {pills.map((pill) =>
        pill.valor > 0 || pill.ativo ? (
          <Link
            key={pill.id}
            href={pill.ativo && filtroNegocio ? verOperacionalHref : pill.href}
            className={cn("priority-chip transition-shadow hover:shadow-sm", pill.ativo && "ring-2 ring-brand/35")}
          >
            <span className="mini-dot shrink-0" style={{ background: pill.cor }} aria-hidden />
            <span>
              <b className="tabular-nums">{pill.valor.toLocaleString("pt-BR")}</b> {pill.rotulo}
            </span>
          </Link>
        ) : null,
      )}
      {!vistaCompleta && !filtroNegocio ? (
        <Link href="/pedidos?vista=completa" className="priority-chip text-brand-strong hover:shadow-sm">
          Ver todos os pedidos →
        </Link>
      ) : vistaCompleta && !filtroNegocio ? (
        <Link href={verOperacionalHref} className="priority-chip hover:shadow-sm">
          Vista operacional ({LIMITE_VISTA_OPERACIONAL} recentes)
        </Link>
      ) : null}
    </section>
  )
}
