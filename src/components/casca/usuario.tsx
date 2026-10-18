"use client"

import { sair } from "@/app/acoes"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, LogOut } from "lucide-react"

export function Usuario({
  email,
  admin,
  variante = "cabecalho",
}: {
  email: string
  admin: boolean
  variante?: "cabecalho" | "menu" | "icone"
}) {
  const inicial = email.trim().charAt(0).toUpperCase() || "E"
  const noMenu = variante === "menu"
  const soIcone = variante === "icone"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            noMenu
              ? "group flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/5"
              : soIcone
                ? "flex size-9 cursor-pointer items-center justify-center rounded-full bg-brand text-sm font-semibold text-primary-foreground"
                : "group flex h-11 cursor-pointer items-center gap-3 rounded-full pr-1"
          }
        >
          {soIcone ? (
            <span className="flex size-9 items-center justify-center rounded-full bg-[#dce8f4] text-sm font-bold text-[#243c55]">{inicial}</span>
          ) : (
            <span
              className={
                noMenu
                  ? "flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#dce8f4] text-sm font-bold text-[#243c55]"
                  : "flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-primary-foreground"
              }
            >
              {inicial}
            </span>
          )}
          {noMenu ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-white">{email}</span>
              <span className="text-[11px] text-sidebar-foreground">{admin ? "Administrador" : "Operador"}</span>
            </span>
          ) : soIcone ? null : (
            <span className="hidden max-w-48 truncate text-sm font-medium group-hover:text-foreground/80 lg:block">{email}</span>
          )}
          <ChevronDown className={noMenu ? "size-4 shrink-0 text-muted-foreground" : soIcone ? "sr-only" : "hidden size-4 text-muted-foreground sm:block"} aria-hidden />
          <span className="sr-only">Menu da conta</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60 p-0">
        <div className="px-4 pt-3 pb-2">
          <p className="truncate text-sm font-medium">{email}</p>
          <p className="text-xs text-muted-foreground italic">{admin ? "Administrador" : "Operador"}</p>
        </div>
        <DropdownMenuSeparator className="mx-0 my-0" />
        <form action={sair}>
          <DropdownMenuItem asChild className="w-full rounded-none px-4 py-2.5 font-medium text-brand-strong" onSelect={(evento) => evento.preventDefault()}>
            <button type="submit" className="cursor-pointer">
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
