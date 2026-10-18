import { FiltroPeriodoPainel } from "@/components/painel/filtro-periodo"
import { BarrasMes, PedidoFaturado, Semicirculo } from "@/components/painel/graficos"
import { MetricCard, MetricGrid, NoticeBar, PageHead, Panel, BotaoSecundario } from "@/components/premium"
import { SemPapel } from "@/components/pagina"
import { calcularCoberturaFiscal } from "@/domain/cobertura-fiscal"
import {
  configPainel,
  deslocarMes,
  inicioMes,
  mesLocal,
  resumirPainel,
  rotuloMes,
  temPeriodoExplicito,
  ultimoDiaMes,
} from "@/domain/painel"
import { buscaDoFiltro, corLegivel, filtroInicial, nomeStatus } from "@/domain/pedidos"
import { ultimaColetaOk } from "@/lib/coleta/ultima"
import { moeda } from "@/lib/format"
import { lerNotas, lerPedidos } from "@/lib/pedidos/ler"
import { exigirPapel } from "@/lib/supabase/servidor"
import { ClipboardList, FileCheck2, Link2, Wallet } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function PainelPage({ searchParams }: Props) {
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
    redirect(`/painel?mes=${mesLocal(hoje)}`)
  }

  const cfg = configPainel(consulta, hoje)

  const { supabase, papel } = await exigirPapel()
  if (!papel) return <SemPapel />

  const [{ pedidos, truncado, erro }, { notas, erro: erroNotas }, ultimaColeta] = await Promise.all([
    lerPedidos(supabase, cfg.intervalo),
    lerNotas(supabase, cfg.intervalo),
    ultimaColetaOk(supabase),
  ])
  const falha = erro ?? erroNotas
  if (falha) {
    return (
      <div className="mx-auto max-w-[1700px] space-y-5">
        <PageHead eyebrow="Central de operações" titulo="Painel" subtitulo="Indicadores filtrados por período." />
        <p className="rounded-2xl border border-destructive/40 bg-danger-soft px-4 py-3 text-sm text-destructive" role="alert">
          Não foi possível ler o painel. {falha}
        </p>
      </div>
    )
  }
  if (pedidos.length === 0) {
    return (
      <div className="mx-auto max-w-[1700px] space-y-5">
        <PageHead eyebrow="Central de operações" titulo="Painel" subtitulo="Indicadores filtrados por período." />
        <FiltroPeriodoPainel vista={cfg.vista} rotuloVista={cfg.rotuloVista} mesFoco={cfg.mesFoco} consulta={consulta} />
        <p className="rounded-2xl border border-dashed bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          Nenhum pedido neste intervalo. Ajuste o período ou rode <span className="font-mono">npm run coletar</span>.
        </p>
      </div>
    )
  }

  const resumo = resumirPainel(pedidos, notas, hoje, cfg)
  const mes = rotuloMes(resumo.mes)
  const mesAnterior = rotuloMes(deslocarMes(resumo.mes, -1))
  const semanal = cfg.bucketTipo === "semana"
  const comparar = cfg.vista === "mes"
  const coberturaFiscal = calcularCoberturaFiscal(resumo)
  const cobertura = coberturaFiscal.coberturaPercentual
  const gapValor = coberturaFiscal.gapValor
  const qsSemErp = buscaDoFiltro({
    ...filtroInicial(),
    semErp: true,
    de: inicioMes(cfg.mesFoco),
    ate: ultimoDiaMes(cfg.mesFoco),
  })
  const linkAcomp = `/acompanhamento?mes=${cfg.mesFoco}`

  const subtitulo =
    cfg.vista === "mes"
      ? `Referência: ${mes} · comparado a ${mesAnterior}. Volume, fiscal e integração ERP.`
      : `Referência operacional: ${mes} (${cfg.rotuloVista}). Comparativos % só na vista por mês.`

  return (
    <div className="mx-auto max-w-[1700px] space-y-5 pb-10">
      <PageHead
        eyebrow="Central de operações"
        titulo="Painel"
        subtitulo={subtitulo}
        acoes={<BotaoSecundario href={linkAcomp}>Abrir acompanhamento →</BotaoSecundario>}
      />
      <FiltroPeriodoPainel vista={cfg.vista} rotuloVista={cfg.rotuloVista} mesFoco={cfg.mesFoco} consulta={consulta} />

      {truncado || ultimaColeta ? (
        <NoticeBar tom={truncado ? "aviso" : "ok"}>
          {truncado ? (
            <>
              <strong>Recorte truncado.</strong> Os números valem para o teto da leitura.
            </>
          ) : (
            <>
              <strong>Réplica Sellent.</strong> Exceções operacionais ficam em Acompanhamento.
            </>
          )}
        </NoticeBar>
      ) : null}

      {resumo.semData > 0 ? (
        <p className="text-sm text-muted-foreground">
          {resumo.semData.toLocaleString("pt-BR")} pedido{resumo.semData === 1 ? "" : "s"} sem data ficam fora das séries.
        </p>
      ) : null}

      <MetricGrid>
        <MetricCard
          tom="blue"
          rotulo="Pedidos no mês"
          icone={ClipboardList}
          valor={inteiro(resumo.pedidos.atual)}
          variacao={comparar ? resumo.pedidos.variacao : undefined}
          detalhe={comparar ? `vs ${inteiro(resumo.pedidos.anterior)} em ${mesAnterior}` : `Mês de referência ${mes}`}
        />
        <MetricCard
          tom="green"
          rotulo="Valor final no mês"
          icone={Wallet}
          valor={moeda(resumo.valor.atual)}
          variacao={comparar ? resumo.valor.variacao : undefined}
          detalhe={comparar ? `vs ${moeda(resumo.valor.anterior)} em ${mesAnterior}` : "Valor final no Sellent"}
        />
        <MetricCard
          tom="amber"
          rotulo="Integração ERP"
          icone={Link2}
          valor={
            resumo.integracao.percentual != null
              ? `${resumo.integracao.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`
              : "—"
          }
          detalhe={
            <>
              {inteiro(resumo.integracao.semNumero)} sem número ·{" "}
              <Link href={`/pedidos${qsSemErp}`} className="font-medium text-brand hover:underline">
                ver lista
              </Link>
            </>
          }
        />
        <MetricCard
          tom="red"
          rotulo="Cobertura fiscal"
          icone={FileCheck2}
          valor={cobertura != null ? `${cobertura.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%` : "—"}
          variacao={comparar ? resumo.notas.variacao : undefined}
          detalhe={
            gapValor > 0 ? (
              <>
                Notas {moeda(coberturaFiscal.valorFaturado)} vs pedidos {moeda(resumo.valor.atual)} (gap {moeda(gapValor)}) ·{" "}
                <Link href={`/faturamento?mes=${cfg.mesFoco}`} className="font-medium text-brand hover:underline">
                  ver faturamento
                </Link>
              </>
            ) : (
              <>
                {inteiro(resumo.notas.atual)} notas emitidas no mês ·{" "}
                <Link href={`/faturamento?mes=${cfg.mesFoco}`} className="font-medium text-brand hover:underline">
                  ver faturamento
                </Link>
              </>
            )
          }
        />
      </MetricGrid>

      <div className="grid gap-[18px] xl:grid-cols-12">
        <Panel
          titulo={semanal ? "Pedidos por semana" : "Pedidos no período"}
          subtitulo={semanal ? "Semanas do mês selecionado." : "Quantidade pela data do pedido no recorte."}
          className="xl:col-span-7"
          corpoClassName="px-5 pb-5 pt-0"
        >
          <BarrasMes meses={resumo.porMes} semanal={semanal} />
        </Panel>
        <Panel titulo="Integração ao ERP no mês" subtitulo="Pedidos do mês de referência com número no ERP." className="xl:col-span-5" corpoClassName="px-5 pb-5 pt-0">
          <Semicirculo percentual={resumo.integracao.percentual} integracao={resumo.integracao} />
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-center">
            <div>
              <dt className="text-xs text-muted-foreground">Com número</dt>
              <dd className="tabular mt-1 text-lg font-semibold text-chart-1">{inteiro(resumo.integracao.comNumero)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Com recusa</dt>
              <dd className="tabular mt-1 text-lg font-semibold text-chart-4">{inteiro(resumo.integracao.comRecusa)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Sem número</dt>
              <dd className="tabular mt-1 text-lg font-semibold text-chart-5">{inteiro(resumo.integracao.semNumero)}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <Panel titulo="Pedido x faturado" subtitulo="Compare pedidos e notas no recorte." corpoClassName="px-5 pb-5 pt-0">
        <PedidoFaturado meses={resumo.porMes} padrao={semanal ? "semana" : "mes"} />
      </Panel>

      <div className="premium-bottom-grid">
        <Panel titulo="Pedidos por UF" subtitulo="As 6 maiores no mês de referência.">
          {resumo.porUf.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido com data neste mês.</p>
          ) : (
            <ul className="space-y-4">
              {resumo.porUf.map((item, indice) => (
                <li key={item.uf}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.uf}</span>
                    <span className="tabular text-muted-foreground">
                      {inteiro(item.quantidade)} · {item.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
                    </span>
                  </div>
                  <div className="premium-flow-track mt-1.5">
                    <div className="h-full rounded-full" style={{ width: `${item.percentual}%`, background: `var(--chart-${(indice % 5) + 1})` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel
          titulo="Últimos pedidos"
          subtitulo="Os 5 mais recentes no intervalo carregado."
          acao="Ver todos ↗"
          acaoHref="/pedidos"
        >
          <ul className="divide-y divide-[#edf0f4]">
            {resumo.ultimos.map((pedido) => (
              <li key={pedido.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <Link href={`/pedidos/${pedido.id}`} className="font-semibold text-[#1c5c4d] hover:underline">
                    {pedido.codigo ?? pedido.id}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">{pedido.loja ?? "—"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-sm font-medium">{moeda(pedido.valor)}</p>
                  <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-xs font-medium">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: corLegivel(pedido.corStatus) }} aria-hidden />
                    {nomeStatus(pedido)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function inteiro(valor: number) {
  return valor.toLocaleString("pt-BR")
}

function texto(valor: string | string[] | undefined) {
  if (Array.isArray(valor)) return valor[0]
  return valor
}
