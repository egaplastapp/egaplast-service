import {
  cadenciaTexto,
  modoPedidos,
  proximoPassoFonte,
  rotuloStatusDia,
  statusDiaFonte,
  type Cadencia,
  type Fonte,
} from "@/domain/coleta"
import { NOMES_FONTE } from "@/domain/notificacoes"
import { textoPreflightPedidos, type PreflightPedidos } from "@/lib/sellent/preflight"
import { dataHora } from "@/lib/format"
import { cn } from "cn"

type FonteRow = { code: string; schedule: string; position: number }

type Tentativa = {
  source: string
  status: string
  finished_at: string | null
}

export function AgendaHoje({
  fontes,
  ultimaPorFonte,
  ultimaOkPorFonte,
  hojeSp,
  posicaoRodando,
  pipelineFalhou,
  preflight,
}: {
  fontes: FonteRow[]
  ultimaPorFonte: Map<string, Tentativa>
  ultimaOkPorFonte: Map<string, { finished_at: string | null }>
  hojeSp: string
  posicaoRodando: number | null
  pipelineFalhou: boolean
  preflight: PreflightPedidos
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <header className="mb-4">
        <p className="eyebrow">Hoje</p>
        <h2 className="text-lg font-semibold">Agenda da coleta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ordem fixa: pedidos → pendências → faturas → previsão/rastreio. Comando:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run coletar</code>
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">#</th>
              <th className="pb-2 pr-3 font-medium">Fonte</th>
              <th className="pb-2 pr-3 font-medium">Cadência</th>
              <th className="pb-2 pr-3 font-medium">Última OK</th>
              <th className="pb-2 pr-3 font-medium">Status do dia</th>
              <th className="pb-2 font-medium">Próximo passo</th>
            </tr>
          </thead>
          <tbody>
            {fontes.map((fonte) => {
              const code = fonte.code as Fonte
              const ultima = ultimaPorFonte.get(fonte.code) ?? null
              const ultimaOk = ultimaOkPorFonte.get(fonte.code) ?? null
              const naFila = posicaoRodando != null && fonte.position > posicaoRodando && ultima?.status !== "running"
              const statusDia = statusDiaFonte({
                ultimaTentativa: ultima,
                ultimaSucessoEm: ultimaOk?.finished_at,
                hojeSp,
                naFila,
              })
              const passo = proximoPassoFonte({
                fonte: code,
                posicao: fonte.position,
                posicaoRodando,
                statusDia,
                modoPedidos: code === "orders_full" ? modoPedidos(ultimaOk?.finished_at) : "incremental",
                pipelineFalhou,
              })
              return (
                <tr key={fonte.code} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-3 tabular-nums text-muted-foreground">{fonte.position}</td>
                  <td className="py-3 pr-3 font-medium">{NOMES_FONTE[fonte.code] ?? fonte.code}</td>
                  <td className="py-3 pr-3 text-muted-foreground">
                    {cadenciaTexto(fonte.schedule as Cadencia, code)}
                  </td>
                  <td className="py-3 pr-3 tabular-nums whitespace-nowrap">
                    {ultimaOk?.finished_at ? dataHora(ultimaOk.finished_at) : "—"}
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        statusDia === "ok" && "bg-success-soft text-success",
                        statusDia === "pendente" && "bg-warning-soft text-warning",
                        statusDia === "falhou" && "bg-danger-soft text-destructive",
                        statusDia === "rodando" && "bg-brand-soft text-brand-strong",
                        (statusDia === "na_fila" || statusDia === "sem_execucao") && "bg-muted text-muted-foreground",
                      )}
                    >
                      {rotuloStatusDia(statusDia)}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">{passo}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Pré-voo de pedidos: </span>
        {textoPreflightPedidos(preflight)}
      </p>
    </section>
  )
}
