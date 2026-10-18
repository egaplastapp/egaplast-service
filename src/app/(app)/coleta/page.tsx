import { AgendaHoje } from "@/app/(app)/coleta/agenda-hoje"
import { AtualizaColeta } from "@/app/(app)/coleta/atualiza"
import { HistoricoColeta, HISTORICO_POR_PAGINA, type ExecucaoHistorico } from "@/app/(app)/coleta/historico"
import { ResumoDia } from "@/app/(app)/coleta/resumo-dia"
import { Cabecalho, Indicador } from "@/components/pagina"
import { diaCalendarioSp, intervaloDiaColeta, percentualColeta, validarDiaColeta } from "@/domain/coleta"
import { NOMES_FONTE } from "@/domain/notificacoes"
import { dataHora } from "@/lib/format"
import { preflightPedidos } from "@/lib/sellent/preflight"
import { exigirPapel, type papelAtual } from "@/lib/supabase/servidor"
import { Database, FileCheck2 } from "lucide-react"
import { connection } from "next/server"
import Link from "next/link"
import { redirect } from "next/navigation"

const FASES: Record<string, string> = {
  downloading: "Baixando",
  staging: "Gravando",
  promoting: "Fechando",
}

type Coleta = {
  id: number
  source: string
  quantity: number
  skipped: number
  started_at: string
  finished_at: string | null
  status: string
  error: string | null
  phase: string | null
  seen: number
  expected: number | null
  api_total: number | null
  cursor?: string | null
  stats?: Record<string, unknown> | null
}

function numero(valor: number) {
  return valor.toLocaleString("pt-BR")
}

export default async function ColetaPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; fonte?: string; status?: string; dia?: string }>
}) {
  await connection()
  const { supabase, papel } = await exigirPapel()
  if (papel !== "admin") redirect("/pedidos")

  const params = await searchParams
  const pagina = Math.max(1, Number(params.pagina) || 1)
  const fonteFiltro = params.fonte?.trim() ?? ""
  const statusFiltro = params.status?.trim() ?? ""
  const hoje = diaCalendarioSp(null)
  const verTodosOsDias = params.dia === "todos"
  const diaFiltro = verTodosOsDias ? null : validarDiaColeta(params.dia, hoje)

  const [
    { data: fontes },
    { data: coletasRecentes },
    pedidosNaBase,
    statusFaturado,
    historicoQuery,
    historicoCount,
    resumoDiaQuery,
    cursorRow,
  ] = await Promise.all([
    supabase.from("sources").select("code, schedule, position").order("position"),
    supabase
      .from("collections")
      .select("id, source, quantity, skipped, started_at, finished_at, status, error, phase, seen, expected, api_total, cursor, stats")
      .order("id", { ascending: false })
      .limit(80),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("order_statuses").select("id").eq("name", "INVOICE-ATIVO").maybeSingle(),
    consultarHistorico(supabase, pagina, fonteFiltro, statusFiltro, diaFiltro),
    contarHistorico(supabase, fonteFiltro, statusFiltro, diaFiltro),
    consultarResumoDia(supabase, diaFiltro),
    supabase
      .from("collections")
      .select("cursor")
      .eq("source", "orders_full")
      .eq("status", "succeeded")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const linhas = (coletasRecentes ?? []) as Coleta[]
  const totalApi = linhas.find((item) => item.source === "orders_full" && item.api_total != null)?.api_total ?? null
  const naBase = pedidosNaBase.count ?? 0
  const idsFaturados = statusFaturado.data ? await listarIds(supabase, "orders", "id", "status_id", statusFaturado.data.id) : []
  const idsComNota = new Set(await listarIds(supabase, "invoices", "order_id"))
  const semNota = idsFaturados.filter((id) => !idsComNota.has(id)).length
  const rodando = linhas.find((item) => item.status === "running") ?? null
  const posicaoRodando = (fontes ?? []).find((fonte) => fonte.code === rodando?.source)?.position ?? null

  const ultimaPorFonte = new Map<string, { source: string; status: string; finished_at: string | null }>()
  const ultimaOkPorFonte = new Map<string, { finished_at: string | null; cursor?: string | null }>()
  for (const item of linhas) {
    if (!ultimaPorFonte.has(item.source)) {
      ultimaPorFonte.set(item.source, { source: item.source, status: item.status, finished_at: item.finished_at })
    }
    if (item.status === "succeeded" && !ultimaOkPorFonte.has(item.source)) {
      ultimaOkPorFonte.set(item.source, { finished_at: item.finished_at, cursor: item.cursor ?? null })
    }
  }

  const pipelineFalhou = [...ultimaPorFonte.values()].some((item) => item.status === "failed")
  const cursorPedidos = cursorRow.data?.cursor ? String(cursorRow.data.cursor) : null
  const preflight = await preflightPedidos(cursorPedidos)

  const mapearExecucao = (item: Record<string, unknown>): ExecucaoHistorico => ({
    id: Number(item.id),
    source: String(item.source),
    quantity: Number(item.quantity),
    skipped: Number(item.skipped),
    started_at: String(item.started_at),
    finished_at: item.finished_at ? String(item.finished_at) : null,
    status: String(item.status),
    error: item.error ? String(item.error) : null,
    seen: Number(item.seen),
    expected: item.expected == null ? null : Number(item.expected),
    api_total: item.api_total == null ? null : Number(item.api_total),
    cursor: item.cursor ? String(item.cursor) : null,
    stats: item.stats as Record<string, unknown> | null,
  })

  const execucoes: ExecucaoHistorico[] = (historicoQuery.data ?? []).map((item) => mapearExecucao(item as Record<string, unknown>))
  const execucoesResumo: ExecucaoHistorico[] = (resumoDiaQuery.data ?? []).map((item) => mapearExecucao(item as Record<string, unknown>))

  return (
    <div className="space-y-5">
      <AtualizaColeta ativo={rodando != null} />
      <Cabecalho
        titulo="Coleta"
        subtitulo={rodando
          ? "A tela acompanha sozinha. Cada fonte grava tudo ou não grava nada."
          : "Veja o que falta rodar hoje, execute npm run coletar e consulte o histórico abaixo."}
      />

      <AgendaHoje
        fontes={fontes ?? []}
        ultimaPorFonte={ultimaPorFonte}
        ultimaOkPorFonte={ultimaOkPorFonte}
        hojeSp={hoje}
        posicaoRodando={posicaoRodando}
        pipelineFalhou={pipelineFalhou}
        preflight={preflight}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Indicador
          rotulo="Pedidos na base"
          icone={Database}
          valor={numero(naBase)}
          detalhe={totalApi == null
            ? "A coleta ainda não guardou o total informado pela API."
            : naBase === totalApi
              ? `${numero(totalApi)} na API. A carga fecha.`
              : `${numero(totalApi)} na API. A carga não fecha.`}
        />
        <Indicador
          rotulo="Faturados sem nota no BI"
          icone={FileCheck2}
          valor={numero(semNota)}
          detalhe={`${numero(idsFaturados.length)} estão como faturados no Sellent. ${numero(idsFaturados.length - semNota)} têm nota.`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(fontes ?? []).map((fonte) => {
          const ultima = linhas.find((item) => item.source === fonte.code) ?? null
          const ultimaOk = linhas.find((item) => item.source === fonte.code && item.status === "succeeded") ?? null
          const naFila = posicaoRodando != null && fonte.position > posicaoRodando && ultima?.status !== "running"
          const atrasada = !naFila && ultima?.status !== "running" && (!ultimaOk?.finished_at || diaCalendarioSp(ultimaOk.finished_at) < hoje)
          const falhou = ultima?.status === "failed" && !naFila
          const emCurso = ultima?.status === "running"
          const fase = emCurso ? ultima.phase : null
          const percentual = naFila ? null : emCurso && fase === "downloading"
            ? percentualColeta(ultima.seen, ultima.expected, "running")
            : ultima?.status === "succeeded" ? 100 : falhou
              ? percentualColeta(ultima?.seen ?? 0, ultima?.expected ?? null, "failed")
              : null
          const rotulo = naFila
            ? "Na fila"
            : emCurso
              ? FASES[fase ?? ""] ?? "Em andamento"
              : ultima?.status === "succeeded"
                ? "Concluída"
                : ultima?.status === "failed"
                  ? "Falhou"
                  : "Sem execução"
          return (
            <article key={fonte.code} className={`rounded-2xl border bg-card p-5 ${falhou ? "border-destructive" : ""}`}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold">{NOMES_FONTE[fonte.code] ?? fonte.code}</h2>
                <p className={`flex items-center gap-2 text-sm ${falhou ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                  {emCurso ? <span className="inline-block size-2 animate-pulse rounded-full bg-brand" /> : null}
                  {percentual != null ? <span className="tabular-nums">{percentual}%</span> : null}
                  {rotulo}
                </p>
              </div>
              <Barra percentual={emCurso && percentual == null ? null : percentual} ativa={emCurso && percentual == null} falhou={falhou} />
              <p className="mt-3 text-sm text-muted-foreground">
                {naFila
                  ? "Aguardando a fonte anterior terminar."
                  : emCurso && fase === "downloading"
                    ? ultima.expected
                      ? `${numero(ultima.seen)} de ${numero(ultima.expected)} lidos`
                      : `${numero(ultima.seen)} lidos`
                    : emCurso && fase === "staging"
                      ? `${numero(ultima.seen)} linhas gravadas na espera`
                      : emCurso
                        ? "Fechando a gravação. A fonte inteira entra junta."
                        : ultima
                          ? `${numero(ultima.quantity)} gravados · ${numero(ultima.skipped)} pulados · ${dataHora(ultima.finished_at ?? ultima.started_at)}`
                          : "Ainda não rodou."}
              </p>
              {ultima && ultima.status === "succeeded" ? (
                <p className="mt-1 text-xs">
                  <Link className="text-brand-strong hover:underline" href={`/coleta/${ultima.id}`}>Ver execução #{ultima.id}</Link>
                </p>
              ) : null}
              {atrasada ? <p className="mt-2 text-sm">Atrasada em relação ao ritmo diário.</p> : null}
              {falhou && ultima?.error ? <p className="mt-2 text-sm text-destructive">{ultima.error}</p> : null}
            </article>
          )
        })}
      </div>

      {diaFiltro ? <ResumoDia dia={diaFiltro} execucoes={execucoesResumo} /> : null}

      <HistoricoColeta
        execucoes={execucoes}
        total={historicoCount.count ?? 0}
        pagina={pagina}
        fonteFiltro={fonteFiltro}
        statusFiltro={statusFiltro}
        diaFiltro={diaFiltro}
        hojeSp={hoje}
        verTodosOsDias={verTodosOsDias}
      />
    </div>
  )
}

function aplicarFiltroDia<T extends { gte: (col: string, val: string) => T; lt: (col: string, val: string) => T }>(
  consulta: T,
  dia: string | null,
) {
  if (!dia) return consulta
  const { desde, ate } = intervaloDiaColeta(dia)
  return consulta.gte("started_at", desde).lt("started_at", ate)
}

async function consultarHistorico(
  supabase: Awaited<ReturnType<typeof papelAtual>>["supabase"],
  pagina: number,
  fonte: string,
  status: string,
  dia: string | null,
) {
  const inicio = (pagina - 1) * HISTORICO_POR_PAGINA
  const fim = inicio + HISTORICO_POR_PAGINA - 1
  let q = supabase
    .from("collections")
    .select("id, source, quantity, skipped, started_at, finished_at, status, error, seen, expected, api_total, cursor, stats")
    .order("id", { ascending: false })
    .range(inicio, fim)
  if (fonte) q = q.eq("source", fonte)
  if (status) q = q.eq("status", status)
  q = aplicarFiltroDia(q, dia)
  return q
}

async function contarHistorico(
  supabase: Awaited<ReturnType<typeof papelAtual>>["supabase"],
  fonte: string,
  status: string,
  dia: string | null,
) {
  let q = supabase.from("collections").select("id", { count: "exact", head: true })
  if (fonte) q = q.eq("source", fonte)
  if (status) q = q.eq("status", status)
  q = aplicarFiltroDia(q, dia)
  return q
}

async function consultarResumoDia(
  supabase: Awaited<ReturnType<typeof papelAtual>>["supabase"],
  dia: string | null,
) {
  if (!dia) return { data: [] as Record<string, unknown>[] }
  const { desde, ate } = intervaloDiaColeta(dia)
  return supabase
    .from("collections")
    .select("id, source, quantity, skipped, started_at, finished_at, status, error, seen, expected, api_total, cursor, stats")
    .gte("started_at", desde)
    .lt("started_at", ate)
    .order("id", { ascending: false })
    .limit(100)
}

async function listarIds(
  supabase: Awaited<ReturnType<typeof papelAtual>>["supabase"],
  tabela: "orders" | "invoices",
  coluna: "id" | "order_id",
  filtro?: "status_id",
  valor?: number,
) {
  const ids: number[] = []
  let inicio = 0
  for (;;) {
    let consulta = supabase.from(tabela).select(coluna).range(inicio, inicio + 999)
    if (filtro && valor != null) consulta = consulta.eq(filtro, valor)
    const { data } = await consulta
    for (const linha of data ?? []) {
      const valorLinha = "id" in linha ? linha.id : linha.order_id
      ids.push(Number(valorLinha))
    }
    if (!data || data.length < 1000) break
    inicio += 1000
  }
  return ids
}

function Barra({ percentual, ativa, falhou }: { percentual: number | null; ativa: boolean; falhou: boolean }) {
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
      {ativa ? <div className="h-full w-1/3 animate-pulse bg-brand" /> : null}
      {percentual != null ? (
        <div className={`h-full ${falhou ? "bg-destructive" : "bg-brand"}`} style={{ width: `${percentual}%` }} />
      ) : null}
    </div>
  )
}
