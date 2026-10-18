import { criarEtapa, salvarEtapa } from "@/app/acoes"
import { Cabecalho, Cartao } from "@/components/pagina"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { exigirPapel } from "@/lib/supabase/servidor"
import { redirect } from "next/navigation"

function nomeRelacao(valor: unknown) {
  const area = Array.isArray(valor) ? valor[0] : valor
  if (area && typeof area === "object" && "name" in area) return String(area.name ?? "sem área")
  return "sem área"
}

export default async function EtapasPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  const { supabase, papel } = await exigirPapel()
  if (papel !== "admin") redirect("/pedidos")
  const { data: etapas } = await supabase.from("stages").select("id, code, name, position, is_provisional, areas(name)").order("position")

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Etapas"
        subtitulo="Aguardando, Em andamento e Pronto para conferência são marcas provisórias. Salvar um nome tira a marca de provisória."
      />
      {erro ? (
        <p className="rounded-2xl border border-destructive/40 bg-danger-soft px-4 py-3 text-sm text-destructive">
          Não foi possível salvar. Confira código, nome e ordem.
        </p>
      ) : null}
      <Cartao titulo="Etapas cadastradas" descricao={`${(etapas ?? []).length} etapas, na ordem da operação.`} corpo="p-0 pt-3">
        <ul className="divide-y border-t">
          {(etapas ?? []).map((etapa) => (
            <li key={etapa.id}>
              <form action={salvarEtapa} className="flex flex-wrap items-end gap-3 px-5 py-4">
                <input name="id" type="hidden" value={etapa.id} />
                <div className="w-full sm:w-48">
                  <p className="font-mono text-xs text-muted-foreground">{etapa.code}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {nomeRelacao(etapa.areas)}
                    {etapa.is_provisional ? (
                      <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">provisória</span>
                    ) : null}
                  </p>
                </div>
                <label className="block min-w-48 flex-1 text-xs text-muted-foreground">
                  Nome
                  <Input className="mt-1" name="nome" defaultValue={etapa.name} required />
                </label>
                <label className="block text-xs text-muted-foreground">
                  Ordem
                  <Input className="mt-1 w-24" name="ordem" type="number" defaultValue={etapa.position} required />
                </label>
                <Button type="submit" size="sm" variant="outline">Salvar</Button>
              </form>
            </li>
          ))}
        </ul>
      </Cartao>
      <Cartao titulo="Nova etapa" descricao="O código fica fixo. O nome aparece para a operação.">
        <form action={criarEtapa} className="flex flex-wrap gap-2">
          <Input className="sm:w-44" name="codigo" placeholder="codigo" required />
          <Input className="min-w-48 flex-1" name="nome" placeholder="Nome visível" required />
          <Input className="w-24" name="ordem" type="number" placeholder="Ordem" required />
          <Button type="submit" size="sm">Adicionar</Button>
        </form>
      </Cartao>
    </div>
  )
}
