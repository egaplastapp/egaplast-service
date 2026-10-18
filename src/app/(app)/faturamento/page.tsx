import { MesaFaturamento } from "@/components/faturamento/mesa-faturamento"
import { FiltroPeriodoPainel } from "@/components/painel/filtro-periodo"
import {
  BotaoPrimario,
  BotaoSecundario,
  DateChip,
  DonutComposicao,
  InvoiceList,
  MetricCard,
  MetricGrid,
  NoticeBar,
  PageHead,
  Panel,
} from "@/components/premium"
import { SemPapel } from "@/components/pagina"
import {
  agregarNotasPorPedido,
  composicaoCredito,
  faturasRecentes,
  linhasPedidoFatura,
  opcoesCredito,
  resumirFaturamento,
} from "@/domain/faturamento"
import {
  configPainel,
  inicioMes,
  mesLocal,
  resumirPainel,
  rotuloMes,
  temPeriodoExplicito,
  ultimoDiaMes,
} from "@/domain/painel"
import { buscaDoFiltro, filtroInicial } from "@/domain/pedidos"
import { dataHora, moeda } from "@/lib/format"
import { ultimaColetaOk } from "@/lib/coleta/ultima"
import { lerFaturas, lerPedidos } from "@/lib/pedidos/ler"
import { exigirPapel } from "@/lib/supabase/servidor"
import { FileCheck2, Receipt, RefreshCw, Wallet, AlertTriangle } from "lucide-react"
import { redirect } from "next/navigation"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function FaturamentoPage({ searchParams }: Props) {
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
    redirect(`/faturamento?mes=${mesLocal(hoje)}`)
  }

  const cfg = configPainel(consulta, hoje)
  const { supabase, papel } = await exigirPapel()
  if (!papel) return <SemPapel />

  const [{ pedidos, truncado, erro }, { faturas, truncado: truncadoFaturas, erro: erroFaturas }, ultimaColeta] =
    await Promise.all([lerPedidos(supabase, cfg.intervalo), lerFaturas(supabase, cfg.intervalo), ultimaColetaOk(supabase)])

  const falha = erro ?? erroFaturas
  const truncadoGeral = truncado || truncadoFaturas
  if (falha) {
    return (
      <div className="space-y-5">
        <PageHead eyebrow="Documentos fiscais" titulo="Faturamento" subtitulo="Documentos fiscais e situação financeira." />
        <p className="rounded-2xl border border-destructive/40 bg-danger-soft px-4 py-3 text-sm text-destructive" role="alert">
          Não foi possível carregar o faturamento. {falha}
        </p>
      </div>
    )
  }

  const resumo = resumirPainel(pedidos, faturas, hoje, cfg)
  const rf = resumirFaturamento(pedidos, faturas, cfg.mesFoco, resumo)
  const agregado = agregarNotasPorPedido(faturas)
  const linhas = linhasPedidoFatura(pedidos, agregado, cfg.mesFoco)
  const creditos = opcoesCredito(faturas)
  const recentes = faturasRecentes(faturas, pedidos, 5)
  const composicao = composicaoCredito(faturas)
  const qsMes = buscaDoFiltro({
    ...filtroInicial(),
    de: inicioMes(cfg.mesFoco),
    ate: ultimoDiaMes(cfg.mesFoco),
  })
  const exportQuery = queryExport(consulta)

  return (
    <div className="mx-auto max-w-[1700px] space-y-0 pb-10">
      <PageHead
        eyebrow="Documentos fiscais"
        titulo="Faturamento"
        subtitulo="Documentos fiscais e situação financeira no recorte selecionado."
        acoes={
          <>
            <DateChip>
              <Receipt className="size-4 text-muted-foreground" aria-hidden />
              <span>
                {rotuloMes(cfg.mesFoco)} · {cfg.rotuloVista}
              </span>
            </DateChip>
            <BotaoSecundario href={`/faturamento?${new URLSearchParams(consulta as Record<string, string>).toString() || `mes=${cfg.mesFoco}`}`}>
              <RefreshCw className="size-3.5" aria-hidden /> Atualizar
            </BotaoSecundario>
            <BotaoPrimario href={`/api/faturamento/export${exportQuery}`}>↓ Exportar recorte</BotaoPrimario>
          </>
        }
      />

      <FiltroPeriodoPainel base="/faturamento" vista={cfg.vista} rotuloVista={cfg.rotuloVista} mesFoco={cfg.mesFoco} consulta={consulta} />

      <NoticeBar tom={truncadoGeral ? "aviso" : "ok"}>
        <strong>Dados da réplica Sellent</strong>
        {ultimaColeta ? ` · última coleta concluída ${dataHora(ultimaColeta)}` : " · coleta ainda não registrada"}
        {truncadoGeral ? " · recorte truncado pelo teto de leitura" : ""}
      </NoticeBar>

      <MetricGrid>
        <MetricCard
          tom="green"
          rotulo="Notas no recorte"
          icone={FileCheck2}
          valor={rf.quantidadeNotas.toLocaleString("pt-BR")}
          detalhe="Quantidade de documentos fiscais carregados"
        />
        <MetricCard tom="blue" rotulo="Valor faturado" icone={Wallet} valor={moeda(rf.valorFaturado)} detalhe="Soma dos valores das notas no intervalo" />
        <MetricCard
          tom="amber"
          rotulo="Cobertura vs pedidos"
          icone={Receipt}
          valor={rf.coberturaPercentual != null ? `${rf.coberturaPercentual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%` : "—"}
          detalhe={rf.gapValor > 0 ? `Gap ${moeda(rf.gapValor)} em relação ao valor dos pedidos` : "Valor notas vs valor pedidos no mês"}
        />
        <MetricCard
          tom="red"
          rotulo="Pedidos sem nota"
          icone={AlertTriangle}
          valor={rf.pedidosSemNota.toLocaleString("pt-BR")}
          detalhe="No mês de referência, com data de pedido no mês"
        />
      </MetricGrid>

      <Panel
        titulo="Pedidos relacionados a faturas"
        subtitulo="Situação fiscal por pedido no mês — crédito conforme Sellent"
        acao="Abrir central completa ↗"
        acaoHref={`/pedidos${qsMes}`}
        className="mb-5"
        corpoClassName="p-0"
      >
        <MesaFaturamento linhas={linhas} creditos={creditos} />
      </Panel>

      <div className="premium-bottom-grid">
        <Panel titulo="Faturas recentes" subtitulo="Últimas notas no recorte — status de crédito real" acao="Ver acompanhamento ↗" acaoHref={`/acompanhamento?mes=${cfg.mesFoco}`}>
          <InvoiceList notas={recentes} />
        </Panel>
        <Panel titulo="Composição de crédito" subtitulo="Distribuição por credit_status no recorte" acao="Ver pedidos ↗" acaoHref={`/pedidos${qsMes}`}>
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
  const textoParams = params.toString()
  return textoParams ? `?${textoParams}` : ""
}
