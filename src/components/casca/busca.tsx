"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useArmazenado } from "@/components/casca/armazenado"
import { TELAS_ADMIN, TELAS_BASICAS, type DadosCasca, type Tela } from "@/components/casca/dados"
import { ArrowRight, Clock, Search } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { Suspense, use, useEffect, useState } from "react"

const CHAVE = "buscas-recentes"

// a mesa de pedidos guarda o filtro em estado; na própria /pedidos a busca chega por evento
export const EVENTO_BUSCA = "egaplast-busca"

export function Busca({ dados }: { dados: Promise<DadosCasca> }) {
  const router = useRouter()
  const caminho = usePathname()
  const [aberta, setAberta] = useState(false)
  const [texto, setTexto] = useState("")
  const [salvas, setSalvas] = useArmazenado(CHAVE)
  const recentes = lerRecentes(salvas)

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault()
        setAberta((atual) => !atual)
      }
    }
    window.addEventListener("keydown", aoTeclar)
    return () => window.removeEventListener("keydown", aoTeclar)
  }, [])

  function ir(href: string) {
    setAberta(false)
    setTexto("")
    router.push(href)
  }

  function buscar(valor: string) {
    const limpo = valor.trim()
    if (!limpo) return ir("/pedidos")
    setSalvas(JSON.stringify([limpo, ...recentes.filter((item) => item !== limpo)].slice(0, 5)))
    if (caminho === "/pedidos") {
      setAberta(false)
      setTexto("")
      window.dispatchEvent(new CustomEvent(EVENTO_BUSCA, { detail: limpo }))
      return
    }
    ir(`/pedidos?q=${encodeURIComponent(limpo)}`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center gap-3 rounded-full border bg-card text-muted-foreground hover:text-foreground sm:h-11 sm:w-full sm:max-w-md sm:justify-start sm:rounded-lg sm:px-4"
        title="Buscar (Ctrl+K)"
      >
        <Search className="size-5 shrink-0" aria-hidden />
        <span className="hidden flex-1 truncate text-left text-sm sm:inline">Buscar pedido ou tela…</span>
        <kbd className="hidden rounded-md border bg-muted px-1.5 py-0.5 text-[11px] font-medium sm:inline">Ctrl K</kbd>
        <span className="sr-only">Buscar pedido</span>
      </button>
      <Dialog open={aberta} onOpenChange={setAberta}>
        <DialogContent showCloseButton={false} className="top-24 translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogTitle className="sr-only">Buscar pedido</DialogTitle>
          <form
            onSubmit={(evento) => {
              evento.preventDefault()
              buscar(texto)
            }}
            className="flex items-center gap-3 border-b px-4"
          >
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              placeholder="Número do Sellent, número do ERP, cliente ou loja"
              aria-label="Número do Sellent, número do ERP, cliente ou loja"
              className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline">Esc</kbd>
          </form>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto p-3">
            {recentes.length ? (
              <section>
                <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase">Buscas recentes</h3>
                <ul>
                  {recentes.map((item) => (
                    <li key={item}>
                      <button type="button" onClick={() => buscar(item)} className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-left text-sm hover:bg-background">
                        <Clock className="size-4 text-muted-foreground" aria-hidden />
                        <span className="truncate">{item}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section>
              <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase">Telas</h3>
              <Suspense fallback={<ListaTelas telas={TELAS_BASICAS} ir={ir} />}>
                <TelasDaConta dados={dados} ir={ir} />
              </Suspense>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function TelasDaConta({ dados, ir }: { dados: Promise<DadosCasca>; ir: (href: string) => void }) {
  const { admin } = use(dados)
  return <ListaTelas telas={admin ? [...TELAS_BASICAS, ...TELAS_ADMIN] : TELAS_BASICAS} ir={ir} />
}

function ListaTelas({ telas, ir }: { telas: Tela[]; ir: (href: string) => void }) {
  return (
    <ul>
      {telas.map((tela) => (
        <li key={tela.href}>
          <button type="button" onClick={() => ir(tela.href)} className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-left text-sm hover:bg-muted">
            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
            {tela.rotulo}
          </button>
        </li>
      ))}
    </ul>
  )
}

function lerRecentes(valor: string | null): string[] {
  if (!valor) return []
  try {
    const lista = JSON.parse(valor)
    return Array.isArray(lista) ? lista.filter((item): item is string => typeof item === "string").slice(0, 5) : []
  } catch {
    return []
  }
}
