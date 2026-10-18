"use client"

import type { DadosCasca } from "@/components/casca/dados"
import { Usuario } from "@/components/casca/usuario"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "cn"
import {
  Activity,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Download,
  FileBarChart,
  FolderCog,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Users,
  Workflow,
  X,
} from "lucide-react"
import Link, { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"
import { Suspense, use, useState } from "react"

type Item = {
  href: string
  rotulo: string
  icone: typeof ClipboardList
  contador?: boolean
  alerta?: boolean
  filhos?: { href: string; rotulo: string }[]
}

const ANALISE: Item[] = [
  { href: "/painel", rotulo: "Painel", icone: LayoutGrid },
  { href: "/calendario", rotulo: "Calendário", icone: CalendarDays },
  { href: "/relatorios", rotulo: "Relatórios", icone: FileBarChart },
]

const OPERACAO: Item[] = [
  { href: "/acompanhamento", rotulo: "Acompanhamento", icone: Activity },
  { href: "/pedidos", rotulo: "Pedidos", icone: ClipboardList, contador: true },
  { href: "/faturamento", rotulo: "Faturamento", icone: Receipt },
  { href: "/clientes", rotulo: "Clientes", icone: Users },
  { href: "/operacao", rotulo: "Operação", icone: Workflow },
]

function itensBase(coletaComFalha: boolean): Item[] {
  return [
    { href: "/coleta", rotulo: "Coleta", icone: Download, alerta: coletaComFalha },
    { href: "/cadastros", rotulo: "Cadastros", icone: FolderCog, filhos: [{ href: "/cadastros/etapas", rotulo: "Etapas" }] },
  ]
}

type Contexto = { dados: Promise<DadosCasca>; caminho: string; expandido: boolean; aoNavegar: () => void }

export function MenuLateral({
  dados,
  expandido,
  gaveta = false,
  aoNavegar,
  aoAlternarMenu,
}: {
  dados: Promise<DadosCasca>
  expandido: boolean
  gaveta?: boolean
  aoNavegar: () => void
  aoAlternarMenu?: () => void
}) {
  const contexto: Contexto = { dados, caminho: usePathname(), expandido, aoNavegar }

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-x-hidden overflow-y-auto bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out motion-reduce:transition-none",
        expandido ? "w-[248px]" : "w-[88px]",
      )}
    >
      <div className="flex h-16 shrink-0 items-center gap-2 px-4 pt-1">
        <Link href="/painel" onClick={aoNavegar} className="flex min-w-0 flex-1 items-center gap-3" aria-label="EGAPLAST Service">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#3ab18a] to-brand text-base font-bold text-primary-foreground shadow-[0_5px_14px_#0a4b3d66]">
            E
          </span>
          <span className={cn("min-w-0 transition-opacity duration-200", expandido ? "opacity-100" : "pointer-events-none opacity-0")}>
            <span className="block truncate text-[15px] font-extrabold tracking-[0.12em] text-white">EGAPLAST</span>
            <span className="mt-0.5 block truncate text-[10px] tracking-[0.16em] text-[#9eafbf] uppercase">Service Platform</span>
          </span>
        </Link>
        {gaveta ? (
          <button type="button" onClick={aoNavegar} className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-sidebar-foreground hover:bg-white/10">
            <X className="size-4" strokeWidth={1.75} aria-hidden />
            <span className="sr-only">Fechar menu</span>
          </button>
        ) : aoAlternarMenu ? (
          <>
            <span className="hidden h-6 w-px shrink-0 bg-white/15 md:block" aria-hidden />
            <button
              type="button"
              onClick={aoAlternarMenu}
              aria-expanded={expandido}
              className="hidden size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-sidebar-foreground hover:bg-white/10 hover:text-white md:flex"
            >
              {expandido ? <PanelLeftClose className="size-[18px]" strokeWidth={1.75} aria-hidden /> : <PanelLeftOpen className="size-[18px]" strokeWidth={1.75} aria-hidden />}
              <span className="sr-only">{expandido ? "Recolher menu" : "Expandir menu"}</span>
            </button>
          </>
        ) : null}
      </div>

      {expandido ? (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-[11px] border border-white/10 bg-white/5 px-3 py-3">
          <span className="size-2 shrink-0 rounded-full bg-[#43c79b] shadow-[0_0_0_4px_#43c79b33]" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">Ambiente operacional</p>
            <p className="truncate text-[11px] text-sidebar-foreground">Rastreio Sellent · ERP · operação</p>
          </div>
        </div>
      ) : null}

      <nav className="flex-1 space-y-6 px-3 py-4" aria-label="Principal">
        <Grupo titulo="Análise" itens={ANALISE} contexto={contexto} />
        <Grupo titulo="Operação" itens={OPERACAO} contexto={contexto} />
        <Suspense fallback={null}>
          <GrupoBase contexto={contexto} />
        </Suspense>
      </nav>

      <div className="mt-auto space-y-0 border-t border-white/10 p-3">
        {expandido ? (
          <Suspense fallback={null}>
            <Integracoes dados={dados} />
          </Suspense>
        ) : null}
        <Suspense fallback={null}>
          <RodapeConta dados={dados} expandido={expandido || gaveta} />
        </Suspense>
      </div>
    </div>
  )
}

function Integracoes({ dados }: { dados: Promise<DadosCasca> }) {
  const { ultimaColeta, coletaComFalha, admin } = use(dados)
  const hora = ultimaColeta ? formatarHora(ultimaColeta) : "—"
  return (
    <div className="mb-3 rounded-[11px] border border-white/10 bg-white/5 p-3">
      <p className="mb-2 text-[11px] text-sidebar-foreground uppercase">Status das integrações</p>
      <LinhaIntegracao rotulo="Sellent" status="Réplica local" ok />
      <LinhaIntegracao rotulo="Coleta" status={coletaComFalha ? "Falha recente" : "OK"} ok={!coletaComFalha} />
      {admin ? <LinhaIntegracao rotulo="Atualização" status={hora} ok={Boolean(ultimaColeta)} /> : null}
    </div>
  )
}

function LinhaIntegracao({ rotulo, status, ok }: { rotulo: string; status: string; ok: boolean }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-xs first:mt-0">
      <span className="text-sidebar-foreground" aria-hidden>
        ●
      </span>
      <span className="text-white/90">{rotulo}</span>
      <span className={cn("ml-auto text-[11px]", ok ? "text-[#5dd5a9]" : "text-danger")}>{status}</span>
    </div>
  )
}

function formatarHora(iso: string) {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return "—"
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

function RodapeConta({ dados, expandido }: { dados: Promise<DadosCasca>; expandido: boolean }) {
  const { email, admin } = use(dados)
  if (!expandido) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center py-1">
            <Usuario email={email} admin={admin} variante="icone" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">{email}</TooltipContent>
      </Tooltip>
    )
  }
  return <Usuario email={email} admin={admin} variante="menu" />
}

function GrupoBase({ contexto }: { contexto: Contexto }) {
  const { admin, coletaComFalha } = use(contexto.dados)
  if (!admin) return null
  return <Grupo titulo="Base" itens={itensBase(coletaComFalha)} contexto={contexto} />
}

function Grupo({ titulo, itens, contexto }: { titulo: string; itens: Item[]; contexto: Contexto }) {
  return (
    <div>
      <h3 className="mb-2 h-4 px-3 text-[10px] font-medium tracking-[0.14em] text-[#718198] uppercase">
        {contexto.expandido ? titulo : <span aria-hidden className="block text-center">•••</span>}
        {contexto.expandido ? null : <span className="sr-only">{titulo}</span>}
      </h3>
      <ul className="space-y-1">
        {itens.map((item) => (
          <Entrada key={item.href} item={item} contexto={contexto} />
        ))}
      </ul>
    </div>
  )
}

function Entrada({ item, contexto }: { item: Item; contexto: Contexto }) {
  const { caminho, expandido, aoNavegar } = contexto
  const ativo = caminho === item.href || caminho.startsWith(`${item.href}/`)
  const [aberto, setAberto] = useState<boolean | null>(null)
  const mostrarFilhos = expandido && item.filhos && (aberto ?? ativo)
  const Icone = item.icone
  const destino = item.filhos?.[0]?.href ?? item.href
  const comoBotao = Boolean(item.filhos && expandido)

  const conteudo = (
    <>
      <span className="relative shrink-0">
        <Icone className={cn("size-[18px]", ativo ? "text-white" : "text-sidebar-foreground group-hover/item:text-white")} strokeWidth={1.75} aria-hidden />
        {item.alerta ? <span className="absolute -top-1 -right-1 size-2 rounded-full bg-danger ring-2 ring-sidebar" aria-hidden /> : null}
      </span>
      <span className={cn("flex-1 truncate text-sm font-medium transition-opacity duration-200", expandido ? "opacity-100" : "opacity-0")}>
        {item.rotulo}
      </span>
      {item.contador ? (
        <Suspense fallback={null}>
          <Contador dados={contexto.dados} expandido={expandido} />
        </Suspense>
      ) : null}
      {expandido && item.filhos ? (
        <ChevronDown className={cn("size-4 shrink-0 text-sidebar-foreground transition-transform", mostrarFilhos && "rotate-180")} strokeWidth={1.75} aria-hidden />
      ) : null}
      {item.alerta ? <span className="sr-only">, última coleta falhou</span> : null}
      {comoBotao ? null : <Pendente />}
    </>
  )

  const classe = cn(
    "group/item relative flex h-11 w-full items-center gap-3 rounded-[9px] px-3 text-left whitespace-nowrap transition-colors",
    ativo
      ? "bg-[var(--nav-active)] text-white shadow-[inset_3px_0_0_var(--nav-active-accent)]"
      : "text-sidebar-foreground hover:bg-white/5 hover:text-white",
  )

  const gatilho = comoBotao ? (
    <button type="button" className={cn(classe, "cursor-pointer")} aria-expanded={!!mostrarFilhos} onClick={() => setAberto(!mostrarFilhos)}>
      {conteudo}
    </button>
  ) : (
    <Link href={destino} aria-current={ativo ? "page" : undefined} className={classe} onClick={aoNavegar}>
      {conteudo}
    </Link>
  )

  return (
    <li>
      {expandido ? (
        gatilho
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>{gatilho}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.rotulo}
          </TooltipContent>
        </Tooltip>
      )}
      {mostrarFilhos ? (
        <ul className="mt-1 space-y-1 pl-11">
          {item.filhos!.map((filho) => {
            const filhoAtivo = caminho === filho.href || caminho.startsWith(`${filho.href}/`)
            return (
              <li key={filho.href}>
                <Link
                  href={filho.href}
                  aria-current={filhoAtivo ? "page" : undefined}
                  onClick={aoNavegar}
                  className={cn(
                    "relative flex h-9 items-center rounded-lg px-3 text-sm font-medium",
                    filhoAtivo ? "bg-[var(--nav-active)] text-white" : "text-sidebar-foreground hover:bg-white/5 hover:text-white",
                  )}
                >
                  {filho.rotulo}
                  <Pendente />
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
    </li>
  )
}

function Contador({ dados, expandido }: { dados: Promise<DadosCasca>; expandido: boolean }) {
  const { emAnalise } = use(dados)
  if (!emAnalise) return null
  if (!expandido) return <span className="sr-only">, {emAnalise} em análise</span>
  return (
    <span className="tabular ml-auto rounded-md bg-white/10 px-1.5 text-[10px] leading-5 font-medium text-white">
      {emAnalise}
      <span className="sr-only"> em análise</span>
    </span>
  )
}

function Pendente() {
  const { pending } = useLinkStatus()
  return <span aria-hidden className={cn("link-pendente absolute top-1/2 left-1 size-1.5 -translate-y-1/2 rounded-full bg-[#70d4b2]", pending && "is-pending")} />
}
