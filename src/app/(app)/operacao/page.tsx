import { Cabecalho, SemPapel } from "@/components/pagina"
import { dataHora } from "@/lib/format"
import { exigirPapel } from "@/lib/supabase/servidor"
import { cn } from "cn"
import { connection } from "next/server"
import Link from "next/link"

type Progresso = {
  id: number
  status: string
  updated_at: string
  stages: { name: string; position: number } | null
  order_items: {
    code: string | null
    name: string | null
    orders: { id: number; code: string | null; buyer_name: string | null } | null
  } | null
}

const SITUACAO: Record<string, { rotulo: string; cor: string }> = {
  open: { rotulo: "aberto", cor: "bg-brand-soft text-brand-strong" },
  done: { rotulo: "concluído", cor: "bg-success-soft text-success" },
}

export default async function OperacaoPage({ searchParams }: { searchParams: Promise<{ etapa?: string }> }) {
  const { etapa } = await searchParams
  await connection()
  const { supabase, papel } = await exigirPapel()
  if (!papel) return <SemPapel />
  const { data: etapas } = await supabase.from("stages").select("id, name, position, is_provisional").order("position")
  let consulta = supabase
    .from("order_item_progress")
    .select("id, status, updated_at, stages(name, position), order_items(code, name, orders(id, code, buyer_name))")
    .order("updated_at", { ascending: false })
  if (etapa && /^\d+$/.test(etapa)) consulta = consulta.eq("stage_id", Number(etapa))
  const { data } = await consulta.limit(200)
  const progressos = ((data ?? []) as unknown[]).map((linha) => {
    const progresso = linha as {
      id: number
      status: string
      updated_at: string
      stages: Progresso["stages"] | NonNullable<Progresso["stages"]>[]
      order_items: Progresso["order_items"] | NonNullable<Progresso["order_items"]>[]
    }
    const item = Array.isArray(progresso.order_items) ? progresso.order_items[0] : progresso.order_items
    const pedido = item && Array.isArray(item.orders) ? item.orders[0] : item?.orders
    return {
      ...progresso,
      stages: Array.isArray(progresso.stages) ? progresso.stages[0] ?? null : progresso.stages,
      order_items: item ? { ...item, orders: pedido ?? null } : null,
    }
  }) as Progresso[]

  return (
    <div className="space-y-5">
      <Cabecalho titulo="Operação" subtitulo="Progresso por SKU. As etapas provisórias valem até os nomes reais dos quadros entrarem no cadastro.">
        <form className="flex w-full items-end gap-2 text-sm sm:w-auto" method="get">
          <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground" htmlFor="etapa">
            Etapa
            <select id="etapa" name="etapa" defaultValue={etapa ?? ""} className="mt-1 block h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground sm:w-60">
              <option value="">Todas</option>
              {(etapas ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.name}{item.is_provisional ? " (provisória)" : ""}</option>
              ))}
            </select>
          </label>
          <button className="h-10 cursor-pointer rounded-lg border bg-card px-4 font-medium hover:bg-muted" type="submit">Filtrar</button>
        </form>
      </Cabecalho>
      {progressos.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          Nenhum SKU em operação. Abra a operação a partir de um pedido.
        </p>
      ) : (
        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-lg font-semibold">SKUs em operação</h2>
            <p className="tabular text-sm text-muted-foreground">{progressos.length}</p>
          </div>
          <div className="overflow-x-auto border-t">
            <table className="w-full text-sm">
              <thead className="bg-(--cabecalho-tabela) text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5">Pedido</th>
                  <th className="px-4 py-2.5">Cliente</th>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5">Etapa</th>
                  <th className="px-4 py-2.5">Situação</th>
                  <th className="px-4 py-2.5">Atualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {progressos.map((progresso) => {
                  const situacao = SITUACAO[progresso.status]
                  return (
                    <tr key={progresso.id} className="hover:bg-muted/50">
                      <td className="px-4 py-2.5">
                        <Link className="font-semibold text-brand-strong underline-offset-4 hover:underline" href={`/pedidos/${progresso.order_items?.orders?.id}`}>
                          {progresso.order_items?.orders?.code ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">{progresso.order_items?.orders?.buyer_name ?? "—"}</td>
                      <td className="px-4 py-2.5">{progresso.order_items?.code} {progresso.order_items?.name}</td>
                      <td className="px-4 py-2.5">{progresso.stages?.name ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", situacao?.cor ?? "bg-muted text-muted-foreground")}>
                          {situacao?.rotulo ?? progresso.status}
                        </span>
                      </td>
                      <td className="tabular px-4 py-2.5 whitespace-nowrap text-muted-foreground">{dataHora(progresso.updated_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
