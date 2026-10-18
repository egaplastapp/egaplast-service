import { enderecoPreenchido, fechaValores, type Comercial, type EnderecoComercial } from "@/domain/comercial"
import { corLegivel } from "@/domain/pedidos"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cep, dataCurta, dataHora, documento, medida, moeda, percentual, quantidade } from "@/lib/format"

export type LinhaItem = {
  id: number
  codigo: string | null
  nome: string | null
  quantidade: number | null
  unidade: string | null
  preco: number | null
  total: number | null
  desconto: number | null
  icms: number | null
  ipi: number | null
  substituicao: number | null
  deposito: string | null
  notas: string | null
}

export type FolhaPedido = {
  codigo: string | null
  erpNumero: string | null
  erpRecusa: string | null
  status: string | null
  corStatus: string | null
  integrado: boolean
  cancelado: boolean
  apagado: boolean
  dataPedido: string | null
  atualizadoEm: string | null
  valor: number | null
  valorFinal: number | null
  totalProdutos: number | null
  loja: string | null
  lojaCodigo: string | null
  lojaErp: string | null
  lojaDocumento: string | null
  lojaEmail: string | null
  lojaTelefone: string | null
  segmento: string | null
  vendedor: string | null
  vendedorCodigo: string | null
  usuario: string | null
  tipo: string | null
  prazo: string | null
  forma: string | null
  escritorio: string | null
  comprador: string | null
  compradorEmail: string | null
  compradorTelefone: string | null
  compradorDocumento: string | null
  endereco: EnderecoComercial
  previsao: string | null
  rastreio: string | null
  notas: number
  comercial: Comercial
  itens: LinhaItem[]
}

export function Folha({ pedido }: { pedido: FolhaPedido }) {
  const somaItens = pedido.itens.reduce((soma, item) => soma + (item.total ?? 0), 0)
  const itensComTotal = pedido.itens.filter((item) => item.total != null).length
  const conta = fechaValores({
    mercadoria: pedido.comercial.mercadoria,
    substituicao: pedido.comercial.substituicao,
    ipi: pedido.comercial.ipi,
    frete: pedido.comercial.frete,
    valorFinal: pedido.valorFinal,
  })
  const faturadoSemNota = pedido.status === "INVOICE-ATIVO" && pedido.notas === 0
  const titulo = pedido.erpNumero ?? pedido.codigo ?? "Pedido"

  return (
    <article id="sec-comercial" className="overflow-hidden rounded-2xl border bg-card scroll-mt-24">
      <header className="border-b bg-brand-soft/60 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{pedido.erpNumero ? "Número no ERP" : "Pedido no Sellent"}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight tabular">{titulo}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {pedido.codigo ? <>Pedido Sellent <span className="tabular text-foreground">{pedido.codigo}</span></> : "O Sellent não trouxe o código do pedido."}
              {" · "}
              {dataCurta(pedido.dataPedido)}
              {" · "}
              atualizado {dataHora(pedido.atualizadoEm)}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm font-medium">
              <span className="size-2 rounded-full" style={{ backgroundColor: corLegivel(pedido.corStatus) }} aria-hidden />
              {pedido.status ?? "Status ausente no Sellent"}
            </p>
            <p className="mt-3 text-2xl font-semibold tabular">{moeda(pedido.valorFinal)}</p>
            <p className="text-xs text-muted-foreground">Valor final no Sellent</p>
          </div>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2 text-xs">
          <Selo texto={pedido.integrado ? "Integrado ao ERP" : "Ainda sem integração no Sellent"} />
          {pedido.cancelado ? <Selo texto="Cancelado no Sellent" alerta /> : null}
          {pedido.apagado ? <Selo texto="Apagado no Sellent" alerta /> : null}
          <Selo texto={pedido.notas > 0 ? `${pedido.notas} ${pedido.notas === 1 ? "nota" : "notas"} no BI` : "Sem nota no BI"} />
        </ul>
      </header>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        {pedido.erpRecusa ? (
          <p className="rounded-lg border border-destructive/40 bg-danger-soft px-3 py-2 text-sm text-destructive">
            Recusa do ERP: {pedido.erpRecusa}
          </p>
        ) : null}
        {faturadoSemNota ? (
          <p className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm">
            O Sellent marca este pedido como faturado, e nenhuma nota do BI está ligada a ele.
          </p>
        ) : null}
        <p className="text-sm leading-6 text-muted-foreground">
          Os valores desta folha são os do Sellent. A cópia impressa do ERP não é lida aqui: CFOP, natureza e o total do SIFN podem divergir.
          {pedido.previsao || pedido.rastreio
            ? ` Previsão ${pedido.previsao ?? "ausente"}. Rastreio ${pedido.rastreio ?? "ausente"}.`
            : " Previsão e rastreio não vieram do BI."}
        </p>

        <div className="grid gap-4 lg:grid-cols-3">
          <Cartao titulo="Loja">
            <Nome valor={pedido.loja} ausente="O pedido não tem loja no Sellent." />
            <Meta rotulo="Código" valor={pedido.lojaCodigo} />
            <Meta rotulo="Código no ERP" valor={pedido.lojaErp} />
            <Meta rotulo="Documento" valor={pedido.lojaDocumento ? documento(pedido.lojaDocumento) : null} />
            <Meta rotulo="Segmento" valor={pedido.segmento} />
            <Meta rotulo="E-mail" valor={pedido.lojaEmail} />
            <Meta rotulo="Telefone" valor={pedido.lojaTelefone} />
            <EnderecoBloco titulo="Endereço no pedido" endereco={pedido.endereco} ausente="O Sellent não trouxe o endereço do pedido." />
          </Cartao>
          <Cartao titulo="Entrega e comprador">
            <Nome valor={pedido.comprador} ausente="O Sellent não trouxe o comprador." />
            <Meta rotulo="Documento" valor={pedido.compradorDocumento ? documento(pedido.compradorDocumento) : null} />
            <Meta rotulo="E-mail" valor={pedido.compradorEmail} />
            <Meta rotulo="Telefone" valor={pedido.compradorTelefone} />
            <EnderecoBloco titulo="Entrega" endereco={pedido.comercial.entrega} ausente="O Sellent não trouxe endereço de entrega." />
            {pedido.comercial.transportadora ? <Meta rotulo="Transportadora" valor={pedido.comercial.transportadora} /> : <Meta rotulo="Transportadora" valor={null} />}
          </Cartao>
          <Cartao titulo="Vendedor">
            <Nome valor={pedido.vendedor} ausente="O pedido não tem vendedor no Sellent." />
            <Meta rotulo="Código" valor={pedido.vendedorCodigo} />
            <Meta rotulo="Registrado por" valor={pedido.usuario} />
            <Meta rotulo="Escritório" valor={pedido.escritorio} />
            <Meta rotulo="Tipo" valor={pedido.tipo} />
            <Meta rotulo="Prazo" valor={pedido.prazo} />
            <Meta rotulo="Forma" valor={pedido.forma} />
            <Meta rotulo="Tabela" valor={pedido.comercial.tabela} />
          </Cartao>
        </div>

        {pedido.comercial.parcelas.length > 0 ? (
          <p className="text-sm">
            <span className="text-muted-foreground">Parcelas no Sellent: </span>
            {pedido.comercial.parcelas.map((parcela, indice) => (
              <span key={`${parcela.numero ?? indice}-${parcela.prazo ?? ""}`}>
                {indice > 0 ? " · " : ""}
                {parcela.prazo ? `${parcela.prazo} dias` : "prazo ausente"} {moeda(parcela.valor)}
              </span>
            ))}
          </p>
        ) : null}

        {pedido.comercial.observacao ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Observação: </span>
            {pedido.comercial.observacao}
          </p>
        ) : null}

        <div id="sec-itens" className="scroll-mt-24 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">Itens</h2>
              <p className="text-xs text-muted-foreground">
                {pedido.itens.length} {pedido.itens.length === 1 ? "linha" : "linhas"}
                {pedido.totalProdutos != null && pedido.totalProdutos !== pedido.itens.length
                  ? ` · o Sellent informa ${pedido.totalProdutos}`
                  : ""}
              </p>
            </div>
            {pedido.itens.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">Este pedido não tem itens gravados.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead>Un</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Desc.</TableHead>
                    <TableHead className="text-right">ICMS</TableHead>
                    <TableHead className="text-right">IPI</TableHead>
                    <TableHead className="text-right">ST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedido.itens.map((item, indice) => (
                    <TableRow key={item.id}>
                      <TableCell className="tabular text-muted-foreground">{indice + 1}</TableCell>
                      <TableCell className="tabular font-medium">{item.codigo ?? "—"}</TableCell>
                      <TableCell className="whitespace-normal">
                        {item.nome ?? "Sem nome no Sellent"}
                        {item.deposito ? <span className="mt-0.5 block text-xs text-muted-foreground">Depósito {item.deposito}</span> : null}
                        {item.notas ? <span className="mt-0.5 block text-xs text-muted-foreground">{item.notas}</span> : null}
                      </TableCell>
                      <TableCell className="text-right tabular">{quantidade(item.quantidade)}</TableCell>
                      <TableCell>{item.unidade ?? "—"}</TableCell>
                      <TableCell className="text-right tabular">{moeda(item.preco)}</TableCell>
                      <TableCell className="text-right tabular">{moeda(item.total)}</TableCell>
                      <TableCell className="text-right tabular">{percentual(item.desconto)}</TableCell>
                      <TableCell className="text-right tabular">{moeda(item.icms)}</TableCell>
                      <TableCell className="text-right tabular">{moeda(item.ipi)}</TableCell>
                      <TableCell className="text-right tabular">{moeda(item.substituicao)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <aside className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Fechamento no Sellent</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Tot rotulo="Mercadoria" valor={moeda(pedido.comercial.mercadoria)} />
              <Tot rotulo="Substituição" valor={moeda(pedido.comercial.substituicao)} />
              <Tot rotulo="IPI" valor={moeda(pedido.comercial.ipi)} />
              <Tot rotulo="Frete" valor={pedido.comercial.freteTexto ? `${moeda(pedido.comercial.frete)} · ${pedido.comercial.freteTexto}` : moeda(pedido.comercial.frete)} />
              <Tot rotulo="Soma das linhas" valor={itensComTotal === 0 ? "—" : moeda(somaItens)} />
              {pedido.valor != null && pedido.valorFinal != null && pedido.valor !== pedido.valorFinal ? (
                <Tot rotulo="Valor antes do ajuste" valor={moeda(pedido.valor)} />
              ) : null}
              <div className="flex items-baseline justify-between gap-3 border-t pt-2">
                <dt className="text-muted-foreground">Valor final</dt>
                <dd className="font-semibold tabular">{moeda(pedido.valorFinal)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {conta == null
                ? "Falta mercadoria, substituição, IPI ou frete, então esta conta não fecha."
                : conta === 0
                  ? "Mercadoria, substituição, IPI e frete fecham o valor final."
                  : `Mercadoria, substituição, IPI e frete diferem ${moeda(Math.abs(conta))} do valor final.`}
            </p>
            <dl className="mt-4 space-y-2 border-t pt-3 text-sm">
              <Tot rotulo="Comissão" valor={pedido.comercial.comissao == null ? "—" : `${moeda(pedido.comercial.comissao)} · ${percentual(pedido.comercial.comissaoPercentual)}`} />
              <Tot rotulo="Peso bruto" valor={medida(pedido.comercial.pesoBruto)} />
              <Tot rotulo="Peso líquido" valor={medida(pedido.comercial.pesoLiquido)} />
              <Tot rotulo="Cubagem" valor={medida(pedido.comercial.cubagem)} />
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">Peso e cubagem vêm sem unidade no Sellent.</p>
          </aside>
        </div>
      </div>
    </article>
  )
}

function Selo({ texto, alerta = false }: { texto: string; alerta?: boolean }) {
  return (
    <li className={alerta ? "rounded-full border border-destructive/40 bg-danger-soft px-2.5 py-1 text-destructive" : "rounded-full border bg-card px-2.5 py-1"}>
      {texto}
    </li>
  )
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border px-4 py-3">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{titulo}</h2>
      <div className="mt-2 space-y-1.5">{children}</div>
    </section>
  )
}

function Nome({ valor, ausente }: { valor: string | null; ausente: string }) {
  return <p className="text-base font-semibold">{valor || <span className="font-normal text-muted-foreground">{ausente}</span>}</p>
}

function Meta({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{rotulo}: </span>
      <span className="tabular">{valor || "—"}</span>
    </p>
  )
}

function EnderecoBloco({ titulo, endereco, ausente }: { titulo: string; endereco: EnderecoComercial; ausente: string }) {
  if (!enderecoPreenchido(endereco)) {
    return <p className="pt-1 text-sm text-muted-foreground">{ausente}</p>
  }
  const linha = [endereco.rua, endereco.numero].filter(Boolean).join(", ")
  const meio = [endereco.complemento, endereco.bairro].filter(Boolean).join(" · ")
  const cidade = [[endereco.cidade, endereco.uf].filter(Boolean).join(" / "), endereco.cep ? cep(endereco.cep) : null].filter(Boolean).join(" · ")
  return (
    <div className="pt-1 text-sm leading-5">
      <p className="text-muted-foreground">{titulo}</p>
      {linha ? <p>{linha}</p> : null}
      {meio ? <p>{meio}</p> : null}
      {cidade ? <p>{cidade}</p> : null}
    </div>
  )
}

function Tot({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="text-right tabular">{valor}</dd>
    </div>
  )
}
