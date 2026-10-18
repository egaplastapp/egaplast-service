import Link from "next/link"
import {
  duracaoLegivel,
  rotuloDiaColeta,
  significadoPulados,
  significadoQuantidade,
  type Fonte,
} from "@/domain/coleta"
import { NOMES_FONTE } from "@/domain/notificacoes"
import { dataHora } from "@/lib/format"
import { cn } from "cn"

export type ExecucaoHistorico = {
  id: number
  source: string
  quantity: number
  skipped: number
  started_at: string
  finished_at: string | null
  status: string
  error: string | null
  seen: number
  expected: number | null
  api_total: number | null
  cursor: string | null
  stats: Record<string, unknown> | null
}

const POR_PAGINA = 25

export function HistoricoColeta({
  execucoes,
  total,
  pagina,
  fonteFiltro,
  statusFiltro,
  diaFiltro,
  hojeSp,
  verTodosOsDias,
}: {
  execucoes: ExecucaoHistorico[]
  total: number
  pagina: number
  fonteFiltro: string
  statusFiltro: string
  diaFiltro: string | null
  hojeSp: string
  verTodosOsDias: boolean
}) {
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const base = "/coleta"

  function hrefCom(extra: Record<string, string> = {}) {
    const q = new URLSearchParams()
    if (fonteFiltro) q.set("fonte", fonteFiltro)
    if (statusFiltro) q.set("status", statusFiltro)
    if ("dia" in extra) {
      if (extra.dia) q.set("dia", extra.dia)
    } else if (verTodosOsDias) {
      q.set("dia", "todos")
    } else if (diaFiltro) {
      q.set("dia", diaFiltro)
    }
    for (const [chave, valor] of Object.entries(extra)) {
      if (chave !== "dia") q.set(chave, valor)
    }
    const texto = q.toString()
    return texto ? `${base}?${texto}` : base
  }

  const contador = verTodosOsDias
    ? `${total.toLocaleString("pt-BR")} registros na base (todos os dias)`
    : diaFiltro
      ? `${total.toLocaleString("pt-BR")} execuções em ${rotuloDiaColeta(diaFiltro)}`
      : `${total.toLocaleString("pt-BR")} registros na base`

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Histórico</p>
          <h2 className="text-lg font-semibold">Execuções anteriores</h2>
          <p className="mt-1 text-sm text-muted-foreground">{contador}</p>
        </div>
        <form className="flex flex-wrap items-center gap-2" method="get" action={base}>
          <input
            type="date"
            name="dia"
            defaultValue={verTodosOsDias ? "" : (diaFiltro ?? hojeSp)}
            className="h-9 rounded-lg border bg-background px-2 text-sm"
            aria-label="Dia da coleta"
          />
          <select
            name="fonte"
            defaultValue={fonteFiltro}
            className="h-9 rounded-lg border bg-background px-2 text-sm"
            aria-label="Filtrar fonte"
          >
            <option value="">Todas as fontes</option>
            {Object.entries(NOMES_FONTE).map(([code, nome]) => (
              <option key={code} value={code}>{nome}</option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={statusFiltro}
            className="h-9 rounded-lg border bg-background px-2 text-sm"
            aria-label="Filtrar status"
          >
            <option value="">Todos os status</option>
            <option value="succeeded">Concluída</option>
            <option value="failed">Falhou</option>
            <option value="running">Rodando</option>
          </select>
          <button type="submit" className="h-9 rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted">
            Filtrar
          </button>
        </form>
      </header>

      <p className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link
          className="rounded-lg border px-3 py-1.5 hover:bg-muted"
          href={hrefCom({ dia: hojeSp, pagina: "1" })}
        >
          Hoje
        </Link>
        {verTodosOsDias ? (
          <Link className="rounded-lg border px-3 py-1.5 text-muted-foreground hover:bg-muted" href={hrefCom({ dia: hojeSp, pagina: "1" })}>
            Voltar ao dia de hoje
          </Link>
        ) : (
          <Link className="rounded-lg border px-3 py-1.5 text-muted-foreground hover:bg-muted" href={hrefCom({ dia: "todos", pagina: "1" })}>
            Ver todos os dias
          </Link>
        )}
      </p>

      {execucoes.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhuma execução neste filtro.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">ID</th>
                <th className="pb-2 pr-2 font-medium">Fonte</th>
                <th className="pb-2 pr-2 font-medium">Início</th>
                <th className="pb-2 pr-2 font-medium">Duração</th>
                <th className="pb-2 pr-2 font-medium">Status</th>
                <th className="pb-2 pr-2 font-medium" title="Significado varia por fonte">Gravados</th>
                <th className="pb-2 pr-2 font-medium">Pulados</th>
                <th className="pb-2 pr-2 font-medium">Lidos</th>
                <th className="pb-2 font-medium">Erro</th>
              </tr>
            </thead>
            <tbody>
              {execucoes.map((linha) => (
                <tr key={linha.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="py-2.5 pr-2">
                    <Link className="font-medium text-brand-strong hover:underline tabular-nums" href={`/coleta/${linha.id}`}>
                      {linha.id}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-2">{NOMES_FONTE[linha.source] ?? linha.source}</td>
                  <td className="py-2.5 pr-2 tabular-nums whitespace-nowrap">{dataHora(linha.started_at)}</td>
                  <td className="py-2.5 pr-2 tabular-nums">{duracaoLegivel(linha.started_at, linha.finished_at)}</td>
                  <td className="py-2.5 pr-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        linha.status === "succeeded" && "bg-success-soft text-success",
                        linha.status === "failed" && "bg-danger-soft text-destructive",
                        linha.status === "running" && "bg-brand-soft text-brand-strong",
                      )}
                    >
                      {linha.status === "succeeded" ? "OK" : linha.status === "failed" ? "Falhou" : "Rodando"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2 tabular-nums" title={significadoQuantidade(linha.source as Fonte)}>
                    {linha.quantity.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-2.5 pr-2 tabular-nums" title={significadoPulados(linha.source as Fonte)}>
                    {linha.skipped.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-2.5 pr-2 tabular-nums text-muted-foreground">
                    {linha.seen > 0 ? `${linha.seen.toLocaleString("pt-BR")}${linha.expected ? ` / ${linha.expected.toLocaleString("pt-BR")}` : ""}` : "—"}
                  </td>
                  <td className="max-w-[12rem] truncate py-2.5 text-destructive" title={linha.error ?? undefined}>
                    {linha.error ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paginas > 1 ? (
        <nav className="mt-4 flex flex-wrap items-center gap-2 text-sm" aria-label="Paginação do histórico">
          {pagina > 1 ? (
            <Link className="rounded-lg border px-3 py-1.5 hover:bg-muted" href={hrefCom({ pagina: String(pagina - 1) })}>
              Anterior
            </Link>
          ) : null}
          <span className="text-muted-foreground">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? (
            <Link className="rounded-lg border px-3 py-1.5 hover:bg-muted" href={hrefCom({ pagina: String(pagina + 1) })}>
              Próxima
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  )
}

export { POR_PAGINA as HISTORICO_POR_PAGINA }
