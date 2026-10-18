"use client"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { hrefPedidosHoje, hrefPedidosMovimentoDesdeColeta } from "@/domain/recorte-pedidos"
import { dataHora } from "@/lib/format"
import { CircleHelp, ClipboardList, Download, Info, RefreshCw, Search, Unplug } from "lucide-react"
import Link from "next/link"

export function Ajuda({ ultimaColeta, admin }: { ultimaColeta: string | null; admin: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-10 cursor-pointer items-center justify-center rounded-full border bg-card text-muted-foreground hover:bg-muted hover:text-foreground sm:size-11 data-[state=open]:bg-muted"
        >
          <CircleHelp className="size-[18px]" aria-hidden />
          <span className="sr-only">Precisa de ajuda?</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[min(20rem,calc(100vw-2rem))] p-0">
        <p className="px-4 pt-3 pb-2 text-xs font-semibold text-muted-foreground uppercase">Precisa de ajuda?</p>
        <ul className="space-y-3 px-4 pb-3 text-sm">
          <Linha icone={Info}>O status mostrado é o do Sellent. Ele não prova a etapa real no ERP nem na expedição.</Linha>
          <Linha icone={Unplug}>SIFN e Monday ainda não estão ligados ao Service.</Linha>
          <Linha icone={Search}>
            A busca aceita o número do Sellent e o do ERP. Atalho <kbd className="rounded border bg-background px-1 text-[11px]">Ctrl K</kbd>.
          </Linha>
          <Linha icone={Search}>
            Em Pedidos: setas movem a linha, Enter abre o painel, <kbd className="rounded border bg-background px-1 text-[11px]">Ctrl+Enter</kbd> ou duplo-clique abre a página completa, Esc fecha o painel.
          </Linha>
          <Linha icone={Download}>
            Última coleta concluída: <span className="tabular font-medium text-foreground">{ultimaColeta ? dataHora(ultimaColeta) : "nenhuma"}</span>.
          </Linha>
        </ul>
        <DropdownMenuSeparator className="mx-0 my-0" />
        <DropdownMenuItem asChild className="rounded-none px-4 py-2.5 font-medium text-brand-strong">
          <Link href={hrefPedidosHoje()}>
            <ClipboardList className="mr-2 size-4" aria-hidden />
            Pedidos de hoje (Sellent)
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-none px-4 py-2.5 font-medium text-brand-strong">
          <Link href={hrefPedidosMovimentoDesdeColeta()}>
            <RefreshCw className="mr-2 size-4" aria-hidden />
            Movimento desde a última coleta
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-none px-4 py-2.5 text-muted-foreground">
          <Link href="/acompanhamento">Entrada do dia (Acompanhamento)</Link>
        </DropdownMenuItem>
        {admin ? (
          <>
            <DropdownMenuSeparator className="mx-0 my-0" />
            <DropdownMenuItem asChild className="rounded-none px-4 py-2.5 font-medium text-brand-strong">
              <Link href="/coleta">Abrir a coleta</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-none px-4 py-2.5 text-muted-foreground">
              <Link href="/coleta">Ver histórico de execuções (hoje)</Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Linha({ icone: Icone, children }: { icone: typeof Info; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-muted-foreground">
      <Icone className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
      <span>{children}</span>
    </li>
  )
}
