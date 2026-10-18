import { BarraNavegacaoPedido } from "@/app/(app)/pedidos/barra-navegacao-pedido"
import { CopiarTexto } from "@/app/(app)/pedidos/copiar-texto"
import { IndiceSecoesPedido } from "@/app/(app)/pedidos/indice-secoes"
import { Folha, type FolhaPedido, type LinhaItem } from "@/app/(app)/pedidos/[id]/folha"
import { abrirOperacao, moverEtapa } from "@/app/acoes"
import { PageHead } from "@/components/premium/page-head"
import { voltarPedidosUrl } from "@/domain/pedidos"
import { comercialDoPayload, impostosDoItem, ordemDosItens, ordenarItens, previsaoExibivel, valorItemNota, type EnderecoComercial } from "@/domain/comercial"
import { CAMPOS_EVENTO } from "@/domain/notificacoes"
import { pedidoProntoParaConferencia, etapaFinal } from "@/domain/operacao"
import { montarPassosRastreabilidade } from "@/domain/rastreabilidade"
import { RastreabilidadeStepper } from "@/components/premium/rastreabilidade-stepper"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { dataHora, diaGravado, documento, moeda } from "@/lib/format"
import { numero, texto } from "@/lib/sellent/mapear"
import { SemPapel } from "@/components/pagina"
import { exigirPapel } from "@/lib/supabase/servidor"
import { ArrowLeft } from "lucide-react"
import { connection } from "next/server"
import Link from "next/link"
import { notFound } from "next/navigation"

const ERROS: Record<string, string> = {
  motivo: "Informe o motivo da mudança de etapa.",
  etapa: "Cadastre uma etapa antes de abrir a operação.",
  abrir: "Não foi possível abrir a operação deste pedido.",
  mover: "Não foi possível mover a etapa.",
  igual: "O SKU já está nessa etapa.",
}

export default async function PedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ erro?: string; from?: string }>
}) {
  const { id } = await params
  await connection()
  const { erro, from } = await searchParams
  const pedidoId = Number(id)
  if (!Number.isFinite(pedidoId)) notFound()
  const { supabase, papel } = await exigirPapel()
  if (!papel) return <SemPapel />

  const { data: pedido, error } = await supabase
    .from("orders")
    .select(`id, code, erp_number, erp_rejection, amount, amount_final, total_products,
      buyer_name, buyer_email, buyer_phone, buyer_mobile, doc_type, doc_number,
      address_city, address_state, address_zipcode, address_street, address_number, address_district,
      sales_office, prevision, tracking, updated_at, order_date,
      is_canceled, is_integrated, deleted_at, payload,
      order_statuses(name, color),
      customers(name, code, erp_id, doc_number, email, phone, segments(name)),
      sellers(code, name),
      sellent_users(name),
      order_types(name),
      payment_methods(name),
      payment_terms(name),
      partners(name),
      origins(name),
      document_types(name)`)
    .eq("id", pedidoId)
    .maybeSingle()
  if (error) {
    return (
      <p className="rounded-2xl border border-destructive/40 bg-danger-soft px-4 py-3 text-sm text-destructive">
        Não foi possível ler este pedido.
      </p>
    )
  }
  if (!pedido) notFound()

  const [{ data: itens }, { data: pendencias }, { data: faturas }, { data: eventos }, { data: etapas }] = await Promise.all([
    supabase.from("order_items").select("id, code, name, quantity, unit_price, total_price, measure_unit, notes, payload").eq("order_id", pedidoId),
    supabase.from("pendencies").select("id, approval_type, profile_approval, status, reason, created_at").eq("order_id", pedidoId).order("created_at", { ascending: false }),
    supabase.from("invoices").select("id, invoice_number, date, value, credit_status, erp_number").eq("order_id", pedidoId).order("date", { ascending: false }),
    supabase.from("order_events").select("id, field, previous_value, new_value, observed_at").eq("order_id", pedidoId).order("observed_at", { ascending: false }).limit(30),
    supabase.from("stages").select("id, code, name, position, is_provisional").order("position"),
  ])

  const idsFaturas = (faturas ?? []).map((fatura) => fatura.id)
  const { data: itensFatura } = idsFaturas.length
    ? await supabase.from("invoice_items").select("id, invoice_id, product_name, qty, net_value, payload").in("invoice_id", idsFaturas)
    : { data: [] }

  const linhas = ordenarItens(
    (itens ?? []).map((item) => {
      const impostos = impostosDoItem(item.payload)
      const linha: LinhaItem = {
        id: Number(item.id),
        codigo: texto(item.code),
        nome: texto(item.name),
        quantidade: numero(item.quantity),
        unidade: texto(item.measure_unit),
        preco: numero(item.unit_price),
        total: numero(item.total_price),
        desconto: impostos.descontoPercentual,
        icms: impostos.icms,
        ipi: impostos.ipi,
        substituicao: impostos.substituicao,
        deposito: impostos.deposito,
        notas: texto(item.notes),
      }
      return linha
    }),
    ordemDosItens(pedido.payload),
  )

  const idsItens = linhas.map((item) => item.id)
  const { data: progressos } = idsItens.length
    ? await supabase.from("order_item_progress").select("id, order_item_id, status, stage_id, stages(code, name)").in("order_item_id", idsItens)
    : { data: [] }

  const progressoPorItem = new Map((progressos ?? []).map((progresso) => [Number(progresso.order_item_id), progresso]))
  const etapasOp = (etapas ?? []).map((etapa) => ({ ...etapa, codigo: etapa.code, ordem: etapa.position }))
  const ultima = etapaFinal(etapasOp)
  const codigos = linhas.map((item) => {
    const progresso = progressoPorItem.get(item.id)
    const etapa = um(progresso?.stages) as { code?: string } | null
    return etapa?.code ?? null
  })
  const pronto = ultima ? pedidoProntoParaConferencia(codigos, ultima.codigo) : false
  const status = um(pedido.order_statuses) as { name: string | null; color: string | null } | null
  const loja = um(pedido.customers) as {
    name: string | null
    code: string | null
    erp_id: string | null
    doc_number: string | null
    email: string | null
    phone: string | null
    segments: { name: string | null } | { name: string | null }[] | null
  } | null
  const segmento = um(loja?.segments) as { name: string | null } | null
  const vendedor = um(pedido.sellers) as { code: string | null; name: string | null } | null
  const usuario = um(pedido.sellent_users) as { name: string | null } | null
  const tipo = um(pedido.order_types) as { name: string | null } | null
  const forma = um(pedido.payment_methods) as { name: string | null } | null
  const prazo = um(pedido.payment_terms) as { name: string | null } | null
  const parceiro = um(pedido.partners) as { name: string | null } | null
  const origem = um(pedido.origins) as { name: string | null } | null
  const documentoTipo = um(pedido.document_types) as { name: string | null } | null
  const comercial = comercialDoPayload(pedido.payload)
  const endereco: EnderecoComercial = {
    rua: texto(pedido.address_street),
    numero: texto(pedido.address_number),
    complemento: null,
    bairro: texto(pedido.address_district),
    cidade: texto(pedido.address_city),
    uf: texto(pedido.address_state),
    cep: texto(pedido.address_zipcode),
  }
  const folha: FolhaPedido = {
    codigo: texto(pedido.code),
    erpNumero: texto(pedido.erp_number),
    erpRecusa: texto(pedido.erp_rejection),
    status: texto(status?.name),
    corStatus: texto(status?.color),
    integrado: pedido.is_integrated === true,
    cancelado: pedido.is_canceled === true,
    apagado: pedido.deleted_at != null,
    dataPedido: pedido.order_date,
    atualizadoEm: pedido.updated_at,
    valor: numero(pedido.amount),
    valorFinal: numero(pedido.amount_final),
    totalProdutos: numero(pedido.total_products),
    loja: texto(loja?.name),
    lojaCodigo: texto(loja?.code),
    lojaErp: texto(loja?.erp_id),
    lojaDocumento: texto(loja?.doc_number),
    lojaEmail: texto(loja?.email),
    lojaTelefone: texto(loja?.phone),
    segmento: texto(segmento?.name),
    vendedor: texto(vendedor?.name),
    vendedorCodigo: texto(vendedor?.code),
    usuario: texto(usuario?.name),
    tipo: texto(tipo?.name),
    prazo: texto(prazo?.name),
    forma: texto(forma?.name),
    escritorio: texto(pedido.sales_office),
    comprador: texto(pedido.buyer_name),
    compradorEmail: texto(pedido.buyer_email),
    compradorTelefone: [texto(pedido.buyer_phone), texto(pedido.buyer_mobile)].filter(Boolean).join(" · ") || null,
    compradorDocumento: documentoComprador(texto(pedido.doc_type), texto(pedido.doc_number)),
    endereco,
    previsao: previsaoExibivel(pedido.prevision),
    rastreio: texto(pedido.tracking),
    notas: faturas?.length ?? 0,
    comercial,
    itens: linhas,
  }
  const itensPorFatura = new Map<number, ItemNota[]>()
  for (const item of itensFatura ?? []) {
    const notaId = Number(item.invoice_id)
    const lista = itensPorFatura.get(notaId) ?? []
    const valores = valorItemNota(item.payload)
    lista.push({
      id: Number(item.id),
      product_name: item.product_name,
      qty: item.qty,
      unitario: valores.unitario,
      total: valores.total ?? numero(item.net_value),
    })
    itensPorFatura.set(notaId, lista)
  }

  const passosRastreio = montarPassosRastreabilidade({
    statusSellent: folha.status,
    erpNumero: folha.erpNumero,
    erpRecusa: folha.erpRecusa,
    temNota: (faturas ?? []).length > 0,
    temOperacaoInterna: (progressos ?? []).length > 0,
  })

  const voltar = voltarPedidosUrl(from ?? null)
  const tituloPagina = folha.codigo ? `Pedido ${folha.codigo}` : `Pedido #${pedido.id}`

  return (
    <div className="space-y-5">
      <Link className="inline-flex h-9 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground" href={voltar}>
        <ArrowLeft className="size-4" aria-hidden />
        Voltar aos pedidos
      </Link>
      <PageHead
        titulo={tituloPagina}
        subtitulo="Dados do Sellent na réplica. Status aqui não prova etapa no ERP nem na expedição."
        acoes={
          <>
            <CopiarTexto rotulo="Copiar Sellent" valor={folha.codigo} />
            <CopiarTexto rotulo="Copiar ERP" valor={folha.erpNumero} />
          </>
        }
      />
      <BarraNavegacaoPedido idAtual={pedidoId} from={from ?? null} />
      <IndiceSecoesPedido />
      {erro && ERROS[erro] ? <p className="rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive">{ERROS[erro]}</p> : null}
      <div id="sec-rastreio" className="scroll-mt-24 space-y-2">
        <p className="text-xs text-muted-foreground">
          Rastreio heurístico: cruza status Sellent, notas do BI na réplica e progresso interno por SKU. Não confirma WMS, expedição nem etapa no ERP SIFN.
        </p>
        <RastreabilidadeStepper passos={passosRastreio} />
      </div>
      <Folha pedido={folha} />

      <section id="sec-operacao" className="scroll-mt-24 space-y-3 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Operação interna</h2>
            <p className="text-sm text-muted-foreground">A etapa de cada SKU é deste sistema. Ela não altera o Sellent nem o ERP.</p>
          </div>
          <form action={abrirOperacao}>
            <input name="pedido" type="hidden" value={pedido.id} />
            <Button type="submit" size="sm">Abrir operação</Button>
          </form>
        </div>
        {pronto ? (
          <p className="rounded-lg border px-3 py-2 text-sm">Todos os SKUs estão na última etapa. O ERP ainda não é atualizado por aqui.</p>
        ) : null}
        {linhas.length === 0 ? <Vazio texto="Sem itens, não há etapa para abrir." /> : (
          <div className="space-y-3">
            {linhas.map((item) => {
              const progresso = progressoPorItem.get(item.id)
              const etapa = um(progresso?.stages) as { name?: string } | null
              return (
                <article key={item.id} className="rounded-lg border bg-background p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{item.codigo ?? "SKU"} <span className="font-normal text-muted-foreground">{item.nome}</span></p>
                    <p className="text-sm text-muted-foreground">
                      {etapa?.name ?? "sem operação"}{progresso?.status === "done" ? " · concluído" : ""}
                    </p>
                  </div>
                  {progresso ? (
                    <form action={moverEtapa} className="mt-3 flex flex-wrap items-end gap-2">
                      <input name="progresso" type="hidden" value={progresso.id} />
                      <input name="pedido" type="hidden" value={pedido.id} />
                      <label className="text-xs text-muted-foreground">
                        Nova etapa
                        <select name="etapa" className="mt-1 block h-8 rounded-lg border bg-background px-2 text-sm text-foreground" defaultValue={String(progresso.stage_id)}>
                          {(etapas ?? []).map((opcao) => (
                            <option key={opcao.id} value={opcao.id}>{opcao.name}{opcao.is_provisional ? " (provisória)" : ""}</option>
                          ))}
                        </select>
                      </label>
                      <label className="min-w-56 flex-1 text-xs text-muted-foreground">
                        Motivo
                        <Input className="mt-1" name="motivo" required />
                      </label>
                      <Button type="submit" size="sm" variant="outline">Mover</Button>
                    </form>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {(parceiro?.name || origem?.name || documentoTipo?.name) ? (
        <p className="text-sm text-muted-foreground">
          {[parceiro?.name ? `Parceiro ${parceiro.name}` : null, origem?.name ? `Origem ${origem.name}` : null, documentoTipo?.name ? `Documento ${documentoTipo.name}` : null].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      <Secao id="sec-pendencias" titulo="Pendências" vazio="Nenhuma pendência gravada para este pedido.">
        {(pendencias ?? []).map((pendencia) => (
          <li key={pendencia.id}>
            <span className="font-medium">{pendencia.approval_type ?? "pendência"}</span>
            {" · "}{pendencia.profile_approval ?? "sem perfil"}
            {" · "}{pendencia.status ?? "sem status"}
            {pendencia.reason ? ` — ${pendencia.reason}` : ""}
          </li>
        ))}
      </Secao>

      <section id="sec-notas" className="scroll-mt-24 space-y-2 rounded-2xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Faturas no BI</h2>
        {(faturas ?? []).length > 0 && folha.valorFinal != null && Math.round((somaNotas(faturas ?? []) - folha.valorFinal) * 100) !== 0 ? (
          <p className="text-sm text-muted-foreground">
            As notas do BI somam {moeda(somaNotas(faturas ?? []))}. O valor final deste pedido no Sellent é {moeda(folha.valorFinal)}.
          </p>
        ) : null}
        {(faturas ?? []).length === 0 ? <Vazio texto="Nenhuma fatura gravada para este pedido." /> : (
          <div className="space-y-3">
            {(faturas ?? []).map((fatura) => (
              <article key={fatura.id} className="rounded-lg border p-3 text-sm">
                <p>
                  Nota {fatura.invoice_number ?? "—"} · {diaGravado(fatura.date) ?? "sem data"} · {moeda(numero(fatura.value))} · {fatura.credit_status ?? "sem crédito"}
                </p>
                <ItensNota itens={itensPorFatura.get(Number(fatura.id)) ?? []} />
              </article>
            ))}
          </div>
        )}
      </section>

      <Secao id="sec-eventos" titulo="Linha do tempo da coleta" vazio="Ainda não há mudança registrada entre coletas.">
        {(eventos ?? []).map((evento) => (
          <li key={evento.id}>
            {dataHora(evento.observed_at)} · {CAMPOS_EVENTO[evento.field] ?? evento.field}: {evento.previous_value ?? "—"} → {evento.new_value ?? "—"}
          </li>
        ))}
      </Secao>
    </div>
  )
}

type ItemNota = {
  id: number
  product_name: string | null
  qty: number | string | null
  unitario: number | null
  total: number | null
}

function ItensNota({ itens }: { itens: ItemNota[] }) {
  if (itens.length === 0) return <p className="mt-2 text-muted-foreground">Esta nota não tem itens gravados.</p>
  return (
    <ul className="mt-2 space-y-1 text-muted-foreground">
      {itens.map((item) => (
        <li key={item.id}>
          {item.product_name ?? "Item sem nome"} · {item.qty ?? "—"} · {moeda(item.unitario)} · {moeda(item.total)}
        </li>
      ))}
    </ul>
  )
}

function somaNotas(faturas: { value: number | string | null }[]) {
  return faturas.reduce((soma, fatura) => soma + (numero(fatura.value) ?? 0), 0)
}

function documentoComprador(tipo: string | null, numeroDoc: string | null) {
  if (!numeroDoc) return null
  const mascarado = documento(numeroDoc)
  return tipo ? `${tipo.toUpperCase()} ${mascarado}` : mascarado
}

function um<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null
  return valor ?? null
}

function Vazio({ texto }: { texto: string }) {
  return <p className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">{texto}</p>
}

function Secao({ id, titulo, vazio, children }: { id?: string; titulo: string; vazio: string; children: React.ReactNode[] }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-2 rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {children.length === 0 ? <Vazio texto={vazio} /> : <ul className="space-y-1 text-sm">{children}</ul>}
    </section>
  )
}
