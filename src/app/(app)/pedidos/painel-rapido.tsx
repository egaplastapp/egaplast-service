"use client"

import { CopiarTexto } from "@/app/(app)/pedidos/copiar-texto"
import { StatusBadge } from "@/components/pedidos/badges"
import { RastreabilidadeStepper } from "@/components/premium/rastreabilidade-stepper"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { fromParaDetalhe, rotuloMotivosFila, type MotivoFilaPedido } from "@/domain/pedidos"
import type { PainelPedido } from "@/lib/pedidos/painel"
import { gravarRecorteNavegacao } from "@/lib/pedidos/navegacao"
import { dataHora, moeda } from "@/lib/format"
import { cn } from "cn"
import { ArrowUpRight, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

export function PainelRapido({
  pedidoId,
  idsRecorte,
  buscaAtual,
  mobile,
  motivosFila,
  onFechar,
}: {
  pedidoId: number | null
  idsRecorte: number[]
  buscaAtual: string
  mobile: boolean
  motivosFila: readonly MotivoFilaPedido[] | null
  onFechar: () => void
}) {
  const router = useRouter()
  const [dados, setDados] = useState<PainelPedido | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const abrirCompleto = useCallback(() => {
    if (!pedidoId) return
    gravarRecorteNavegacao(idsRecorte, pedidoId)
    const from = fromParaDetalhe(buscaAtual)
    router.push(`/pedidos/${pedidoId}?from=${from}`)
  }, [buscaAtual, idsRecorte, pedidoId, router])

  useEffect(() => {
    if (!pedidoId) {
      setDados(null)
      return
    }
    let ativo = true
    setCarregando(true)
    setErro(null)
    fetch(`/api/pedidos/${pedidoId}/painel`, { cache: "no-store" })
      .then(async (resposta) => {
        if (!resposta.ok) {
          const json = (await resposta.json().catch(() => ({}))) as { erro?: string }
          throw new Error(json.erro ?? "Não foi possível carregar o pedido.")
        }
        return resposta.json() as Promise<PainelPedido>
      })
      .then((json) => {
        if (ativo) setDados(json)
      })
      .catch((falha) => {
        if (ativo) setErro(falha instanceof Error ? falha.message : "Erro ao carregar.")
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [pedidoId])

  useEffect(() => {
    if (!pedidoId) return
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") onFechar()
      if (evento.key === "o" && !evento.ctrlKey && !evento.metaKey && !(evento.target instanceof HTMLInputElement)) {
        evento.preventDefault()
        abrirCompleto()
      }
      if (evento.key === "Enter" && evento.ctrlKey) {
        evento.preventDefault()
        abrirCompleto()
      }
    }
    window.addEventListener("keydown", tecla)
    return () => window.removeEventListener("keydown", tecla)
  }, [abrirCompleto, onFechar, pedidoId])

  const corpo = (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          {carregando ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
          {dados ? (
            <>
              <p className="text-xs text-muted-foreground">Sellent · réplica local</p>
              <p className="truncate text-lg font-semibold tabular">{dados.codigo ?? dados.id}</p>
              <p className="truncate text-sm text-muted-foreground">
                {dados.loja ?? "—"}
                {dados.vendedor ? ` · ${dados.vendedor}` : ""}
              </p>
            </>
          ) : null}
        </div>
        <button type="button" className="rounded-lg p-1 text-muted-foreground hover:bg-muted xl:hidden" onClick={onFechar} aria-label="Fechar painel">
          <X className="size-4" />
        </button>
      </div>

      {dados ? (
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge
              pedido={{
                id: dados.id,
                status: dados.status,
                corStatus: dados.corStatus,
                codigo: dados.codigo,
                erpNumero: dados.erpNumero,
                erpRecusa: dados.erpRecusa,
                valor: dados.valor,
                cancelado: false,
                apagadoEm: null,
                atualizadoEm: null,
                dataPedido: null,
                uf: null,
                cliente: null,
                loja: dados.loja,
                vendedor: dados.vendedor,
              }}
            />
            <p className="text-lg font-semibold tabular">{moeda(dados.valor)}</p>
          </div>
          {dados.erpRecusa ? <p className="text-sm text-destructive">Recusa ERP: {dados.erpRecusa}</p> : null}
          {motivosFila && motivosFila.length > 0 ? (
            <p className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-[#79551d]">
              <span className="font-semibold">Na fila de trabalho:</span> {rotuloMotivosFila(motivosFila)}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {dados.pendenciasAbertas} pendência(s) na réplica · {dados.notas} nota(s) no BI
          </p>
          <p className="text-[11px] text-muted-foreground">
            Rastreio abaixo cruza Sellent, nota no BI e progresso interno (Monday). Não substitui confirmação no ERP SIFN.
          </p>
          <div className="[&_.premium-panel]:mb-0 [&_ol]:grid-cols-1">
            <RastreabilidadeStepper passos={dados.passos} />
          </div>
          {dados.eventos.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Últimas mudanças (coleta)</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {dados.eventos.map((evento) => (
                  <li key={evento.id}>
                    {dataHora(evento.quando)} · {evento.rotulo}: {evento.anterior ?? "—"} → {evento.novo ?? "—"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {dados ? (
        <footer className="flex flex-wrap gap-2 border-t px-4 py-3">
          <CopiarTexto rotulo="Copiar Sellent" valor={dados.codigo} />
          <CopiarTexto rotulo="Copiar ERP" valor={dados.erpNumero} />
          <Button type="button" size="sm" className="ml-auto gap-1" onClick={abrirCompleto}>
            Abrir completo
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Button>
        </footer>
      ) : null}
    </div>
  )

  if (!pedidoId) return null

  if (mobile) {
    return (
      <Sheet open onOpenChange={(aberto) => !aberto && onFechar()}>
        <SheetContent side="right" className="w-full max-w-md p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Pedido {dados?.codigo ?? pedidoId}</SheetTitle>
          </SheetHeader>
          {corpo}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside className={cn("hidden h-[min(42rem,calc(100dvh-14rem))] shrink-0 overflow-hidden rounded-2xl border bg-card shadow-card xl:flex xl:flex-col xl:w-[min(24rem,38vw)]")}>
      {corpo}
    </aside>
  )
}
