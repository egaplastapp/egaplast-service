import { Cabecalho, SemPapel } from "@/components/pagina"
import {
  agruparPorDia,
  DIAS_SEMANA,
  diasDaVista,
  deslocarVista,
  hrefCalendario,
  interpretarData,
  interpretarVista,
  intervaloConsulta,
  montarEventos,
  rotuloPeriodo,
  totaisDoDia,
  type DiaCalendario,
  type EventoCalendario,
  type Vista,
} from "@/domain/calendario"
import { diaLocal } from "@/domain/painel"
import { moeda } from "@/lib/format"
import { lerNotas, lerPedidos } from "@/lib/pedidos/ler"
import { exigirPapel } from "@/lib/supabase/servidor"
import { cn } from "cn"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

const LIMITE = 3

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ vista?: string; data?: string }> }) {
  const { vista: vistaBruta, data: dataBruta } = await searchParams
  const { supabase, papel } = await exigirPapel()
  if (!papel) return <SemPapel />
  const hoje = diaLocal(new Date())!
  const vista = interpretarVista(vistaBruta)
  const data = interpretarData(dataBruta, hoje)
  const intervalo = intervaloConsulta(vista, data)
  const [{ pedidos, erro }, { notas, erro: erroNotas }] = await Promise.all([
    lerPedidos(supabase, intervalo.pedidos),
    lerNotas(supabase, intervalo.notas),
  ])
  const falha = erro ?? erroNotas
  if (falha) {
    return (
      <div className="space-y-5">
        <Cabecalho titulo="Calendário" />
        <p className="rounded-2xl border border-destructive/40 bg-danger-soft px-4 py-3 text-sm text-destructive" role="alert">
          Não foi possível ler o calendário. {falha}
        </p>
      </div>
    )
  }

  const dias = agruparPorDia(diasDaVista(vista, data), montarEventos(pedidos, notas), hoje, data.slice(0, 7))
  const anterior = hrefCalendario(vista, deslocarVista(vista, data, -1), hoje)
  const proximo = hrefCalendario(vista, deslocarVista(vista, data, 1), hoje)

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Calendário"
        subtitulo="Pedidos pela data do pedido e notas pela data da nota. A previsão de entrega não vem do BI."
      />
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-6">
          <div className="flex items-center gap-1">
            <Link href={anterior} className="flex size-10 items-center justify-center rounded-lg border hover:bg-muted" aria-label="Período anterior">
              <ChevronLeft className="size-5" />
            </Link>
            <Link href={proximo} className="flex size-10 items-center justify-center rounded-lg border hover:bg-muted" aria-label="Próximo período">
              <ChevronRight className="size-5" />
            </Link>
            <Link href={hrefCalendario(vista, hoje, hoje)} className="ml-1 h-10 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
              Hoje
            </Link>
          </div>
          <h2 className="flex-1 text-center text-lg font-semibold first-letter:uppercase">{rotuloPeriodo(vista, data)}</h2>
          <div className="inline-flex rounded-lg bg-muted p-0.5 text-sm">
            {(["mes", "semana", "dia"] as Vista[]).map((item) => (
              <Link
                key={item}
                href={hrefCalendario(item, item === "mes" ? `${data.slice(0, 7)}-01` : data, hoje)}
                className={cn("h-8 rounded-md px-3 font-medium capitalize", vista === item ? "bg-card shadow-sm" : "text-muted-foreground")}
              >
                {item === "mes" ? "mês" : item}
              </Link>
            ))}
          </div>
        </div>
        {vista === "mes" ? <GradeMes dias={dias} hoje={hoje} /> : <ListaDias dias={dias} hoje={hoje} />}
      </section>
      <p className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-4 w-0.5 rounded-full bg-brand" /> Pedidos feitos</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-4 w-0.5 rounded-full bg-success" /> Notas emitidas</span>
      </p>
    </div>
  )
}

function GradeMes({ dias, hoje }: { dias: DiaCalendario[]; hoje: string }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[44rem]">
        <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {DIAS_SEMANA.map((dia) => (
            <div key={dia} className="px-2 py-3">{dia}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((dia) => (
            <div
              key={dia.dia}
              className={cn(
                "min-h-28 border-r border-b p-2 sm:min-h-32 nth-[7n]:border-r-0",
                dia.hoje ? "bg-muted/60" : "",
                dia.noMes ? "" : "bg-muted/20",
              )}
            >
              <p className={cn("tabular text-sm", dia.noMes ? "text-foreground" : "text-muted-foreground")}>{Number(dia.dia.slice(8))}</p>
              <ul className="mt-1 space-y-1">
                {dia.eventos.slice(0, LIMITE).map((evento) => (
                  <li key={`${evento.tipo}-${evento.pedidoId}-${evento.rotulo}`}>
                    <Etiqueta evento={evento} />
                  </li>
                ))}
              </ul>
              {dia.eventos.length > LIMITE ? (
                <Link href={hrefCalendario("dia", dia.dia, hoje)} className="mt-1 block text-xs font-medium text-brand-strong hover:underline">
                  +{dia.eventos.length - LIMITE}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ListaDias({ dias, hoje }: { dias: DiaCalendario[]; hoje: string }) {
  return (
    <ul className="divide-y">
      {dias.map((dia) => {
        const totais = totaisDoDia(dia.eventos)
        return (
          <li key={dia.dia} className={cn("px-4 py-4 sm:px-6", dia.hoje ? "bg-muted/40" : "")}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={hrefCalendario("dia", dia.dia, hoje)} className="text-sm font-semibold first-letter:uppercase hover:underline">
                {rotuloPeriodo("dia", dia.dia)}
              </Link>
              <p className="text-sm text-muted-foreground">
                {totais.pedidos} pedido{totais.pedidos === 1 ? "" : "s"} · {moeda(totais.valorPedidos)}
                {totais.notas ? ` · ${totais.notas} nota${totais.notas === 1 ? "" : "s"} · ${moeda(totais.valorNotas)}` : ""}
              </p>
            </div>
            {dia.eventos.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nenhum pedido nem nota neste dia.</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {dia.eventos.map((evento) => (
                  <li key={`${evento.tipo}-${evento.pedidoId}-${evento.rotulo}`}>
                    <Etiqueta evento={evento} ampla />
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Etiqueta({ evento, ampla = false }: { evento: EventoCalendario; ampla?: boolean }) {
  return (
    <Link
      href={`/pedidos/${evento.pedidoId}`}
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium hover:opacity-90",
        ampla ? "py-1.5 text-sm" : "",
      )}
      style={{ backgroundColor: `color-mix(in srgb, ${evento.cor} 16%, transparent)` }}
    >
      <span className="h-3.5 w-0.5 shrink-0 rounded-full" style={{ backgroundColor: evento.cor }} aria-hidden />
      <span className="min-w-0 truncate">{evento.rotulo}</span>
    </Link>
  )
}
