"use client"

import { useArmazenado } from "@/components/casca/armazenado"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { naoVistas, type Notificacao } from "@/domain/notificacoes"
import { dataHora } from "@/lib/format"
import { cn } from "cn"
import { Ban, Bell, BadgeCheck, CircleAlert, DatabaseZap, Hash, PackagePlus, RefreshCw } from "lucide-react"
import Link from "next/link"

const ICONES: Record<Notificacao["tipo"], { icone: typeof Bell; cor: string }> = {
  status: { icone: RefreshCw, cor: "bg-brand-soft text-brand-strong" },
  erp: { icone: Hash, cor: "bg-success-soft text-success" },
  recusa: { icone: CircleAlert, cor: "bg-danger-soft text-danger" },
  cancelado: { icone: Ban, cor: "bg-warning-soft text-warning" },
  valor: { icone: BadgeCheck, cor: "bg-brand-soft text-brand-strong" },
  coleta: { icone: DatabaseZap, cor: "bg-danger-soft text-danger" },
  novo: { icone: PackagePlus, cor: "bg-success-soft text-success" },
}

export function Notificacoes({ itens }: { itens: Notificacao[] }) {
  const [vistasEm, setVistasEm] = useArmazenado("notificacoes-vistas-em")
  const novas = naoVistas(itens, vistasEm)
  const maisRecente = itens[0]?.quando ?? null

  return (
    <DropdownMenu
      onOpenChange={(aberto) => {
        if (aberto && maisRecente) setVistasEm(maisRecente)
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex size-10 cursor-pointer items-center justify-center rounded-full border bg-card text-muted-foreground hover:bg-muted hover:text-foreground sm:size-11 data-[state=open]:bg-muted"
        >
          <Bell className="size-[18px]" aria-hidden />
          {novas > 0 ? <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger ring-2 ring-background" aria-hidden /> : null}
          <span className="sr-only">Notificações{novas > 0 ? `, ${novas} novas` : ""}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <p className="px-4 pt-3 pb-2 text-xs font-semibold text-muted-foreground uppercase">Notificações</p>
        {itens.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">Nenhuma mudança de pedido nos últimos 7 dias.</p>
        ) : (
          <ul>
            {itens.map((item) => {
              const { icone: Icone, cor } = ICONES[item.tipo]
              const nova = !vistasEm || item.quando > vistasEm
              return (
                <li key={item.id} className="border-t">
                  <DropdownMenuItem asChild className="items-start gap-3 rounded-none px-4 py-3">
                    <Link href={item.href}>
                      <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", cor)}>
                        <Icone className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                          {item.titulo}
                          {nova ? <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-label="nova" /> : null}
                        </span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">{item.texto}</span>
                        <span className="mt-1 block text-xs font-medium text-muted-foreground/80">{dataHora(item.quando)}</span>
                      </span>
                    </Link>
                  </DropdownMenuItem>
                </li>
              )
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
