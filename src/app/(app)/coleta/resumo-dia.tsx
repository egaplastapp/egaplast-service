import Link from "next/link"
import {
  agruparExecucoesPorFonte,
  duracaoLegivel,
  FONTES,
  rotuloDiaColeta,
  significadoPulados,
  significadoQuantidade,
  type Fonte,
} from "@/domain/coleta"
import { hrefPedidosMovimentoExecucao } from "@/domain/recorte-pedidos"
import { NOMES_FONTE } from "@/domain/notificacoes"
import { dataHora } from "@/lib/format"
import { cn } from "cn"
import type { ExecucaoHistorico } from "@/app/(app)/coleta/historico"

const ROTULOS_STATS: Record<string, string> = {
  pedidos_lidos: "pedidos lidos",
  itens: "itens",
  eventos_novos: "eventos",
  pendencias: "pendências",
  faturas_lidas: "faturas lidas",
  itens_nota: "itens de nota",
  linhas_lidas: "linhas BI",
  promovidos: "promovidos",
  pulados_promocao: "pulados promoção",
}

const CHAVES_STATS: Record<string, string[]> = {
  orders_full: ["pedidos_lidos", "itens", "eventos_novos"],
  pendency_list: ["pendencias"],
  invoices: ["faturas_lidas", "itens_nota"],
  bi_orders: ["linhas_lidas", "promovidos"],
}

function statsResumo(source: string, stats: Record<string, unknown> | null) {
  if (!stats) return "—"
  const chaves = CHAVES_STATS[source] ?? Object.keys(stats)
  const partes: string[] = []
  for (const chave of chaves) {
    const valor = stats[chave]
    if (valor == null || valor === "") continue
    const rotulo = ROTULOS_STATS[chave] ?? chave
    partes.push(`${rotulo}: ${Number(valor).toLocaleString("pt-BR")}`)
  }
  return partes.length ? partes.join(" · ") : "—"
}

export function ResumoDia({ dia, execucoes }: { dia: string; execucoes: ExecucaoHistorico[] }) {
  const porFonte = agruparExecucoesPorFonte(execucoes, FONTES)

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <header className="mb-4">
        <p className="eyebrow">Preparações</p>
        <h2 className="text-lg font-semibold">Resumo do dia · {rotuloDiaColeta(dia)}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Uma linha por fonte, pela ordem do pipeline. Horários pelo início da execução (São Paulo).
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-2 font-medium">#</th>
              <th className="pb-2 pr-2 font-medium">Fonte</th>
              <th className="pb-2 pr-2 font-medium">Execução</th>
              <th className="pb-2 pr-2 font-medium">Início</th>
              <th className="pb-2 pr-2 font-medium">Duração</th>
              <th className="pb-2 pr-2 font-medium">Status</th>
              <th className="pb-2 pr-2 font-medium">Gravados / Pulados</th>
              <th className="pb-2 font-medium">Leitura (stats)</th>
            </tr>
          </thead>
          <tbody>
            {FONTES.map((code, indice) => {
              const fonte = code as Fonte
              const lista = porFonte.get(code) ?? []
              const principal = lista[0] ?? null
              const extras = lista.slice(1)
              return (
                <tr key={code} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-2 tabular-nums text-muted-foreground">{indice + 1}</td>
                  <td className="py-3 pr-2 font-medium">{NOMES_FONTE[code] ?? code}</td>
                  <td className="py-3 pr-2">
                    {principal ? (
                      <div className="space-y-1">
                        <Link className="font-medium text-brand-strong hover:underline tabular-nums" href={`/coleta/${principal.id}`}>
                          #{principal.id}
                        </Link>
                        {code === "orders_full" && principal.status === "succeeded" ? (
                          <p className="text-xs">
                            <Link className="font-medium text-brand-strong hover:underline" href={hrefPedidosMovimentoExecucao(principal.id)}>
                              Ver pedidos desta extração
                            </Link>
                          </p>
                        ) : null}
                        {extras.length > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            +{extras.length} tentativa(s):{" "}
                            {extras.map((item, i) => (
                              <span key={item.id}>
                                {i > 0 ? ", " : ""}
                                <Link className="text-brand-strong hover:underline" href={`/coleta/${item.id}`}>
                                  #{item.id}
                                </Link>
                              </span>
                            ))}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-2 tabular-nums whitespace-nowrap">
                    {principal ? dataHora(principal.started_at) : "Não rodou"}
                  </td>
                  <td className="py-3 pr-2 tabular-nums">
                    {principal ? duracaoLegivel(principal.started_at, principal.finished_at) : "—"}
                  </td>
                  <td className="py-3 pr-2">
                    {principal ? (
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          principal.status === "succeeded" && "bg-success-soft text-success",
                          principal.status === "failed" && "bg-danger-soft text-destructive",
                          principal.status === "running" && "bg-brand-soft text-brand-strong",
                        )}
                      >
                        {principal.status === "succeeded" ? "OK" : principal.status === "failed" ? "Falhou" : "Rodando"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    className="py-3 pr-2 tabular-nums"
                    title={`${significadoQuantidade(fonte)} · ${significadoPulados(fonte)}`}
                  >
                    {principal
                      ? `${principal.quantity.toLocaleString("pt-BR")} / ${principal.skipped.toLocaleString("pt-BR")}`
                      : "—"}
                  </td>
                  <td className="py-3 text-muted-foreground">{principal ? statsResumo(code, principal.stats) : "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
