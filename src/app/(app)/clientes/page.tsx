import { Cabecalho, SemPapel } from "@/components/pagina"
import { agruparClientesDosPedidos } from "@/domain/clientes"
import { dataCurta, moeda } from "@/lib/format"
import { lerPedidos } from "@/lib/pedidos/ler"
import { exigirPapel } from "@/lib/supabase/servidor"
import Link from "next/link"

export default async function ClientesPage() {
  const { supabase, papel } = await exigirPapel()
  if (!papel) return <SemPapel />
  const { pedidos, truncado, erro } = await lerPedidos(supabase)
  if (erro) {
    return (
      <div className="space-y-5">
        <Cabecalho titulo="Clientes" subtitulo="Carteira agregada a partir dos pedidos na réplica (comprador/loja)." />
        <p className="rounded-2xl border border-destructive/40 bg-danger-soft px-4 py-3 text-sm text-destructive" role="alert">
          Não foi possível carregar os clientes. {erro}
        </p>
      </div>
    )
  }

  const clientes = agruparClientesDosPedidos(pedidos)

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Clientes"
        subtitulo="Visão leve por comprador/loja — sem duplicar cadastro master. Use Pedidos para o detalhe."
      />
      {truncado ? (
        <p className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-2 text-sm text-warning">
          Recorte truncado pelo teto de leitura; totais podem estar incompletos.
        </p>
      ) : null}
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-[var(--cabecalho-tabela)] text-[10px] font-bold tracking-wide text-[#738095] uppercase">
              <tr>
                <th className="px-4 py-3">Cliente / loja</th>
                <th className="px-4 py-3 text-right">Pedidos</th>
                <th className="px-4 py-3 text-right">Em aberto</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Último pedido</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.chave} className="border-t border-[#edf0f4]">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{cliente.nome}</p>
                    {cliente.loja && cliente.loja !== cliente.nome ? (
                      <p className="text-xs text-muted-foreground">{cliente.loja}</p>
                    ) : null}
                  </td>
                  <td className="tabular px-4 py-3 text-right">{cliente.pedidos}</td>
                  <td className="tabular px-4 py-3 text-right">{cliente.emAberto}</td>
                  <td className="tabular px-4 py-3 text-right font-medium">{moeda(cliente.valorTotal)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{dataCurta(cliente.ultimoPedido) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {clientes.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum pedido na base para agregar.</p>
        ) : null}
      </section>
      <p className="text-sm text-muted-foreground">
        <Link href="/pedidos" className="font-medium text-brand hover:underline">
          Abrir central de pedidos ↗
        </Link>
      </p>
    </div>
  )
}
