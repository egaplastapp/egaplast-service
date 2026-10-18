"use client"

import { useArmazenado } from "@/components/casca/armazenado"
import { Ajuda } from "@/components/casca/ajuda"
import { Busca } from "@/components/casca/busca"
import { tituloDaRota, type DadosCasca } from "@/components/casca/dados"
import { MenuLateral } from "@/components/casca/menu-lateral"
import { Notificacoes } from "@/components/casca/notificacoes"
import { Tema } from "@/components/casca/tema"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "cn"
import { Menu } from "lucide-react"
import { usePathname } from "next/navigation"
import { Suspense, use, useEffect, useState } from "react"

export function Shell({ dados, children }: { dados: Promise<DadosCasca>; children: React.ReactNode }) {
  const [gaveta, setGaveta] = useState(false)
  const [salvo, setSalvo] = useArmazenado("menu-aberto")
  const expandido = salvo === "1"
  const titulo = tituloDaRota(usePathname())

  useEffect(() => {
    document.title = `${titulo} · EGAPLAST Service`
  }, [titulo])

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="sticky top-0 z-30 hidden h-dvh shrink-0 md:block">
        <MenuLateral
          dados={dados}
          expandido={expandido}
          aoNavegar={() => undefined}
          aoAlternarMenu={() => setSalvo(expandido ? "0" : "1")}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-card/85 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75">
          <div className="flex h-[4.625rem] items-center gap-3 px-4 md:px-8">
            <button
              type="button"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted md:hidden"
              aria-expanded={gaveta}
              aria-controls="menu-aplicativo"
              onClick={() => setGaveta(true)}
            >
              <Menu className="size-5" aria-hidden />
              <span className="sr-only">Abrir menu</span>
            </button>
            <p className="hidden min-w-0 truncate text-sm text-muted-foreground md:block">
              EGAPLAST <span className="px-1.5 text-border">/</span>{" "}
              <strong className="font-semibold text-foreground">{titulo}</strong>
            </p>
            <Busca dados={dados} />
            <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
              <Tema />
              <Suspense fallback={<Circulos quantidade={2} />}>
                <Avisos dados={dados} />
              </Suspense>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[106.25rem] min-w-0 flex-1 p-5 md:px-8 md:py-7">{children}</main>
      </div>

      <div className={cn("fixed inset-0 z-40 md:hidden", gaveta ? "" : "pointer-events-none")} aria-hidden={!gaveta}>
        <button
          type="button"
          tabIndex={gaveta ? 0 : -1}
          className={cn("absolute inset-0 bg-foreground/30 transition-opacity duration-200", gaveta ? "opacity-100" : "opacity-0")}
          aria-label="Fechar menu"
          onClick={() => setGaveta(false)}
        />
        <div
          id="menu-aplicativo"
          className={cn(
            "absolute inset-y-0 left-0 border-r shadow-xl transition-transform duration-200 ease-out motion-reduce:transition-none",
            gaveta ? "translate-x-0" : "-translate-x-full",
          )}
          inert={!gaveta}
        >
          <MenuLateral dados={dados} expandido gaveta aoNavegar={() => setGaveta(false)} aoAlternarMenu={() => setGaveta(false)} />
        </div>
      </div>
    </div>
  )
}

function Avisos({ dados }: { dados: Promise<DadosCasca> }) {
  const { notificacoes, ultimaColeta, admin } = use(dados)
  return (
    <>
      <Notificacoes itens={notificacoes} />
      <Ajuda ultimaColeta={ultimaColeta} admin={admin} />
    </>
  )
}

function Circulos({ quantidade }: { quantidade: number }) {
  return (
    <>
      {Array.from({ length: quantidade }, (_, indice) => (
        <Skeleton key={indice} className="size-10 rounded-full sm:size-11" />
      ))}
    </>
  )
}
