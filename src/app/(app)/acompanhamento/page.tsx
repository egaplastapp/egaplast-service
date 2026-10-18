import { EntradaDia } from "@/components/acompanhamento/entrada-dia"
import { FeedEventos } from "@/components/acompanhamento/feed-eventos"
import { FiltroPeriodoPainel } from "@/components/painel/filtro-periodo"
import {
  ActionQueue,
  AlertList,
  BotaoPrimario,
  BotaoSecundario,
  DateChip,
  DonutComposicao,
  FlowBars,
  InvoiceList,
  MetricCard,
  MetricGrid,
  NoticeBar,
  PageHead,
  Panel,
  PriorityStrip,
} from "@/components/premium"
import { SystemFlowColapsavel } from "@/components/premium/system-flow-colapsavel"
import { TabelaRevisao } from "@/components/premium/tabela-revisao"
import { SemPapel } from "@/components/pagina"
import {
  acoesPrioritarias,
  composicaoStatus,
  funilIntegracao,
  metricasAcompanhamento,
  notasRecentes,
  pedidosRevisao,
  pontosAtencao,
} from "@/domain/acompanhamento"
import {
  configPainel,
  filaOperacional,
  inicioMes,
  mesLocal,
  resumirPainel,
  rotuloMes,
  temPeriodoExplicito,
  ultimoDiaMes,
} from "@/domain/painel"
import { intervaloSqlDeFiltroUi } from "@/domain/intervalo-datas"
import { montarFeedEventos } from "@/domain/notificacoes"
import { diaHojeSp } from "@/domain/recorte-pedidos"
import { buscaDoFiltro, filtroInicial } from "@/domain/pedidos"
import { dataHora, moeda } from "@/lib/format"
import { ultimaColetaOk, ultimaColetaPedidosOk } from "@/lib/coleta/ultima"
import { lerEventosRecentes } from "@/lib/pedidos/eventos-recentes"
import { contarPedidosComEventos, contarPedidosPorDataPedido } from "@/lib/pedidos/ler"
import { calcularCoberturaFiscal } from "@/domain/cobertura-fiscal"
import { contarStatusFaturadoSemNota, itemFilaSemNotaFiscal } from "@/domain/fiscal"
import { itemFilaPendencias, resumirPendenciasAbertas } from "@/domain/pendencias"
import { lerPendenciasAbertas } from "@/lib/pendencias/ler"
import { lerIdsPedidosComNota, lerNotas, lerPedidos } from "@/lib/pedidos/ler"
import { exigirPapel } from "@/lib/supabase/servidor"
import { Activity, AlertTriangle, ClipboardList, FileCheck2, RefreshCw, Wallet } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function AcompanhamentoPage({ searchParams }: Props) {
  const params = await searchParams
  const consulta = {
    vista: texto(params.vista),
    ano: texto(params.ano),
    mes: texto(params.mes),
    trimestre: texto(params.trimestre),
    semestre: texto(params.semestre),
  }
  const hoje = new Date()

  if (!temPeriodoExplicito(consulta)) {
    redirect(`/acompanhamento?mes=${mesLocal(hoje)}`)
  }

  const cfg = configPainel(consulta, hoje)
  const { supabase, papel } = await exigirPapel()
  if (!papel) return <SemPapel />

  const hojeSp = diaHojeSp(hoje)
  const intervaloHoje = intervaloSqlDeFiltroUi(hojeSp, hojeSp)

  const [
    { pedidos, truncado, erro },
    { notas, erro: erroNotas },
    ultimaColeta,
    { pendencias, erro: erroPendencias },
    { ids: pedidosComNota, erro: erroNotasIds },
    ultimaColetaPedidos,
    { total: totalPedidosHoje, erro: erroContagemHoje },
    { eventos: eventosRecentes, erro: erroEventos },
    statusLidos,
  ] = await Promise.all([
    lerPedidos(supabase, cfg.intervalo),
    lerNotas(supabase, cfg.intervalo),
    ultimaColetaOk(supabase),
    lerPendenciasAbertas(supabase),
    lerIdsPedidosComNota(supabase),
    ultimaColetaPedidosOk(supabase),
    contarPedidosPorDataPedido(supabase, intervaloHoje.desde, intervaloHoje.ate),
    lerEventosRecentes(supabase, 20),
    supabase.from("order_statuses").select("id, name"),
  ])

  const movimentoColeta = ultimaColetaPedidos?.started_at
    ? await contarPedidosComEventos(supabase, { desde: ultimaColetaPedidos.started_at, ate: null })
    : { total: 0, erro: null as string | null }

  const nomesStatus = new Map((statusLidos.data ?? []).map((item) => [String(item.id), String(item.name ?? "")]))
  const feedEventos = montarFeedEventos(eventosRecentes, nomesStatus, 20)

  const falha =
    erro
    ?? erroNotas
    ?? erroPendencias
    ?? erroNotasIds
    ?? erroContagemHoje
    ?? erroEventos
    ?? movimentoColeta.erro
    ?? statusLidos.error?.message
  if (falha) {
    return (
      <div className="space-y-5">
        <PageHead eyebrow="Central de operações" titulo="Acompanhamento" subtitulo="Histórico de eventos e exceções operacionais." />
        <p className="rounded-2xl border border-destructive/40 bg-danger-soft px-4 py-3 text-sm text-destructive" role="alert">
          Não foi possível carregar o acompanhamento. {falha}
        </p>
      </div>
    )
  }

  const resumo = resumirPainel(pedidos, notas, hoje, cfg)
  const resumoPendencias = resumirPendenciasAbertas(pendencias, pedidos, cfg.mesFoco)
  const semNotaFiscal = contarStatusFaturadoSemNota(pedidos, pedidosComNota, cfg.mesFoco)
  const filaExtra = [itemFilaSemNotaFiscal(semNotaFiscal, cfg.mesFoco), itemFilaPendencias(resumoPendencias, cfg.mesFoco)].filter(
    (item): item is NonNullable<typeof item> => item != null,
  )
  const fila = [...filaExtra, ...filaOperacional(pedidos, cfg.mesFoco, resumo)]
  const agora = hoje.getTime()
  const cobertura = calcularCoberturaFiscal(resumo)
  const metricas = metricasAcompanhamento(pedidos, cfg.mesFoco, resumo, agora)
  const acoes = acoesPrioritarias(fila)
  const pontos = pontosAtencao(pedidos, cfg.mesFoco, 5, agora, pendencias)
  const funil = funilIntegracao(pedidos, cfg.mesFoco)
  const composicao = composicaoStatus(pedidos, cfg.mesFoco)
  const recentes = notasRecentes(notas, pedidos)
  const revisao = pedidosRevisao(pedidos, cfg.mesFoco, 8, agora)
  const qsMes = buscaDoFiltro({
    ...filtroInicial(),
    de: inicioMes(cfg.mesFoco),
    ate: ultimoDiaMes(cfg.mesFoco),
  })
  const exportQuery = queryExport(consulta)

  return (
    <div className="mx-auto max-w-[1700px] space-y-0 pb-10">
      <PageHead
        eyebrow="Central de operações"
        titulo="Acompanhamento"
        subtitulo="Histórico de eventos e exceções operacionais no recorte selecionado."
        acoes={
          <>
            <DateChip>
              <Activity className="size-4 text-muted-foreground" aria-hidden />
              <span>
                {rotuloMes(cfg.mesFoco)} · {cfg.rotuloVista}
              </span>
            </DateChip>
            <BotaoSecundario href={`/acompanhamento?${new URLSearchParams(consulta as Record<string, string>).toString() || `mes=${cfg.mesFoco}`}`}>
              <RefreshCw className="size-3.5" aria-hidden /> Atualizar
            </BotaoSecundario>
            <BotaoPrimario href={`/api/painel/export${exportQuery}`}>↓ Exportar relatório</BotaoPrimario>
          </>
        }
      />

      <EntradaDia
        hoje={hojeSp}
        totalPedidosHoje={totalPedidosHoje}
        totalMovimento={movimentoColeta.total}
        ultimaColetaPedidos={ultimaColetaPedidos}
      />

      <FeedEventos itens={feedEventos} />

      <FiltroPeriodoPainel base="/acompanhamento" vista={cfg.vista} rotuloVista={cfg.rotuloVista} mesFoco={cfg.mesFoco} consulta={consulta} />

      <NoticeBar tom={truncado ? "aviso" : "ok"}>
        <strong>Dados da réplica Sellent</strong>
        {ultimaColeta ? ` · última coleta concluída ${dataHora(ultimaColeta)}` : " · coleta ainda não registrada"}
        {truncado ? " · recorte truncado pelo teto de leitura" : ""}
      </NoticeBar>

      <PriorityStrip
        itens={fila}
        extra={fila.length === 0 ? "Nenhuma exceção automática · regras em evolução" : undefined}
      />

      <MetricGrid>
        <MetricCard tom="blue" rotulo="Pedidos em andamento" icone={ClipboardList} valor={metricas.emAndamento.toLocaleString("pt-BR")} detalhe="No mês de referência, exceto apagados" />
        <MetricCard
          tom="amber"
          rotulo="Requerem atenção"
          icone={AlertTriangle}
          valor={metricas.requeremAtencao.toLocaleString("pt-BR")}
          detalhe="Regra automática (heurística): parado, recusa, sem ERP ou em análise"
        />
        <MetricCard tom="green" rotulo="Valor no mês" icone={Wallet} valor={moeda(metricas.valorMes)} detalhe="Valor final no Sellent" />
        <MetricCard
          tom="red"
          rotulo="Cobertura fiscal"
          icone={FileCheck2}
          valor={
            cobertura.coberturaPercentual != null
              ? `${cobertura.coberturaPercentual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`
              : "—"
          }
          detalhe={
            <>
              {metricas.notasMes.toLocaleString("pt-BR")} notas ·{" "}
              <Link href={`/faturamento?mes=${cfg.mesFoco}`} className="font-medium text-brand hover:underline">
                ver faturamento
              </Link>
              {metricas.gapValor > 0 ? ` · gap ${moeda(metricas.gapValor)}` : ""}
            </>
          }
        />
      </MetricGrid>

      <ActionQueue acoes={acoes} />

      <div className="premium-layout-main mb-5">
        <Panel titulo="Integração ERP no mês" subtitulo="Faixas reais na réplica — não inclui WMS" acao="Ver pedidos ↗" acaoHref={`/pedidos${qsMes}`}>
          <FlowBars faixas={funil} />
        </Panel>
        <Panel
          titulo="Pontos de atenção"
          subtitulo="Ocorrências que podem exigir ação"
          badge={
            pontos.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-warning-soft px-2 py-1 text-[10px] font-bold text-warning">
                {pontos.length} abertas
              </span>
            ) : null
          }
        >
          <AlertList itens={pontos} />
          <div className="px-5 pb-4">
            <Link href={`/pedidos${qsMes}`} className="block w-full rounded-lg border border-border bg-card py-2.5 text-center text-sm font-semibold hover:bg-muted/80">
              Ver todas as ocorrências
            </Link>
          </div>
        </Panel>
      </div>

      <SystemFlowColapsavel />

      <Panel titulo="Pedidos que exigem revisão" subtitulo="Parados, recusa, sem ERP ou em análise no mês" acao="Central de pedidos ↗" acaoHref={`/pedidos${qsMes}`} className="mb-5" corpoClassName="p-0">
        <TabelaRevisao pedidos={revisao} />
      </Panel>

      <div className="premium-bottom-grid">
        <Panel titulo="Notas recentes" subtitulo="Documentos no recorte carregado" acao="Ver faturamento ↗" acaoHref={`/faturamento?mes=${cfg.mesFoco}`}>
          <InvoiceList notas={recentes} />
        </Panel>
        <Panel titulo="Composição da carteira" subtitulo="Distribuição por status Sellent no mês" acao="Detalhar ↗" acaoHref={`/pedidos${qsMes}`}>
          <DonutComposicao total={composicao.total} fatias={composicao.fatias} />
        </Panel>
      </div>
    </div>
  )
}

function texto(valor: string | string[] | undefined) {
  if (Array.isArray(valor)) return valor[0]
  return valor
}

function queryExport(consulta: { vista?: string; ano?: string; mes?: string; trimestre?: string; semestre?: string }) {
  const params = new URLSearchParams()
  if (consulta.mes) params.set("mes", consulta.mes)
  else if (consulta.vista === "12m") params.set("vista", "12m")
  else if (consulta.ano) params.set("ano", consulta.ano)
  else if (consulta.trimestre) params.set("trimestre", consulta.trimestre)
  else if (consulta.semestre) params.set("semestre", consulta.semestre)
  const texto = params.toString()
  return texto ? `?${texto}` : ""
}
