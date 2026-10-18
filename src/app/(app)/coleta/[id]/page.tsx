import {
  diaCalendarioSp,
  duracaoLegivel,
  significadoPulados,
  significadoQuantidade,
  type Fonte,
} from "@/domain/coleta"
import { hrefPedidosMovimentoExecucao } from "@/domain/recorte-pedidos"
import { NOMES_FONTE } from "@/domain/notificacoes"
import { dataHora } from "@/lib/format"
import { exigirPapel } from "@/lib/supabase/servidor"
import { connection } from "next/server"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

export const instant = false

const ROTULOS_STATS: Record<string, string> = {
  pedidos_lidos: "Pedidos lidos na API",
  itens: "Itens de pedido",
  eventos_novos: "Eventos novos (coleta)",
  pendencias: "Pendências lidas",
  faturas_lidas: "Faturas lidas",
  itens_nota: "Itens de nota",
  linhas_lidas: "Linhas lidas do BI",
  promovidos: "Registros promovidos (SQL)",
  pulados_promocao: "Pulados na promoção (SQL)",
}

export default async function ExecucaoColetaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await connection()
  const { supabase, papel } = await exigirPapel()
  if (papel !== "admin") redirect("/pedidos")

  const execucaoId = Number(id)
  if (!Number.isFinite(execucaoId)) notFound()

  const { data: linha } = await supabase
    .from("collections")
    .select("id, source, quantity, skipped, started_at, finished_at, status, error, phase, seen, expected, api_total, cursor, stats")
    .eq("id", execucaoId)
    .maybeSingle()

  if (!linha) notFound()

  const stats = (linha.stats && typeof linha.stats === "object" && !Array.isArray(linha.stats)
    ? linha.stats
    : {}) as Record<string, unknown>

  return (
    <div className="space-y-6">
      <Link
        className="text-sm text-brand-strong hover:underline"
        href={`/coleta?dia=${encodeURIComponent(diaCalendarioSp(linha.started_at))}`}
      >
        Voltar à coleta
      </Link>
      <header>
        <p className="eyebrow">Execução #{linha.id}</p>
        <h1 className="mt-1 text-2xl font-semibold">{NOMES_FONTE[linha.source] ?? linha.source}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {dataHora(linha.started_at)}
          {linha.finished_at ? ` → ${dataHora(linha.finished_at)} (${duracaoLegivel(linha.started_at, linha.finished_at)})` : " · em andamento"}
        </p>
      </header>

      {linha.source === "orders_full" && linha.status === "succeeded" ? (
        <p className="rounded-xl border border-brand/30 bg-brand-soft/40 px-4 py-3 text-sm">
          <Link className="font-semibold text-brand-strong hover:underline" href={hrefPedidosMovimentoExecucao(Number(linha.id))}>
            Ver pedidos desta extração
          </Link>
          <span className="text-muted-foreground">
            {" "}
            — lista em Pedidos com movimento na réplica entre início e fim desta execução. O campo Gravados ({linha.quantity}) resume a promoção SQL.
          </span>
        </p>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Campo rotulo="Status" valor={linha.status} />
        <Campo rotulo="Gravados" valor={String(linha.quantity)} detalhe={significadoQuantidade(linha.source as Fonte)} />
        <Campo rotulo="Pulados" valor={String(linha.skipped)} detalhe={significadoPulados(linha.source as Fonte)} />
        <Campo rotulo="Lidos (download)" valor={linha.seen ? String(linha.seen) : "—"} detalhe={linha.expected ? `Esperado: ${linha.expected}` : undefined} />
        <Campo rotulo="Total API (pedidos)" valor={linha.api_total != null ? String(linha.api_total) : "—"} />
        <Campo rotulo="Cursor (pedidos)" valor={linha.cursor ? dataHora(linha.cursor) : "—"} />
        <Campo rotulo="Fase (se interrompida)" valor={linha.phase ?? "—"} />
      </dl>

      {linha.error ? (
        <p className="rounded-lg border border-destructive/40 bg-danger-soft px-3 py-2 text-sm text-destructive">{linha.error}</p>
      ) : null}

      {Object.keys(stats).length > 0 ? (
        <section className="rounded-xl border p-4">
          <h2 className="text-base font-semibold">Contagens da leitura</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {Object.entries(stats).map(([chave, valor]) => (
              <li key={chave}>
                <span className="text-muted-foreground">{ROTULOS_STATS[chave] ?? chave}: </span>
                <span className="tabular-nums font-medium">{String(valor)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">Esta execução não guardou detalhe por entidade (coletas antigas).</p>
      )}
    </div>
  )
}

function Campo({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm font-medium tabular-nums">{valor}</dd>
      {detalhe ? <dd className="mt-0.5 text-xs text-muted-foreground">{detalhe}</dd> : null}
    </div>
  )
}
