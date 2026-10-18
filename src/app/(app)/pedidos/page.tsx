import { Mesa } from "@/app/(app)/pedidos/mesa"
import { Cabecalho, SemPapel } from "@/components/pagina"
import { Suspense } from "react"
import { pedidosComPendenciaAberta } from "@/domain/pendencias"
import { interpretarRecortePedidos, recorteAtivo } from "@/domain/recorte-pedidos"
import { ultimaColetaOk } from "@/lib/coleta/ultima"
import { lerContagensExcecaoGlobais } from "@/lib/pedidos/contagens"
import { carregarListaPedidos } from "@/lib/pedidos/carregar-lista"
import { lerPendenciasAbertas } from "@/lib/pendencias/ler"
import { lerIdsPedidosComNota } from "@/lib/pedidos/ler"
import { exigirPapel } from "@/lib/supabase/servidor"
import { dataHora } from "@/lib/format"
import { connection } from "next/server"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function PedidosPage({ searchParams }: Props) {
  await connection()
  const bruto = await searchParams
  const params = new URLSearchParams()
  for (const [chave, valor] of Object.entries(bruto)) {
    if (typeof valor === "string") params.set(chave, valor)
    else if (Array.isArray(valor)) valor.forEach((item) => params.append(chave, item))
  }
  const recorte = interpretarRecortePedidos(params)
  const desdeColeta = params.get("desde_coleta") === "1"

  const { supabase, papel } = await exigirPapel()
  if (!papel) return <SemPapel />

  const [{ pedidos, truncado, erro, rotuloRecorte }, { pendencias }, { ids: pedidosComNota }, ultimaColeta] =
    await Promise.all([
      carregarListaPedidos(supabase, recorte, desdeColeta),
      lerPendenciasAbertas(supabase),
      lerIdsPedidosComNota(supabase),
      ultimaColetaOk(supabase),
    ])

  const pedidosComPendencia = pedidosComPendenciaAberta(pendencias)
  const { contagens: contagensGlobais } = await lerContagensExcecaoGlobais(supabase, pedidosComNota, truncado)
  const proveniencia = [
    "Réplica Sellent",
    rotuloRecorte,
    ultimaColeta ? `última coleta OK ${dataHora(ultimaColeta)}` : "coleta ainda não registrada",
    truncado ? `lista limitada a ${pedidos.length.toLocaleString("pt-BR")} pedidos no recorte` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  if (erro) {
    return (
      <div className="space-y-5">
        <Cabecalho titulo="Pedidos" subtitulo="Clique na linha para abrir loja, vendedor, itens e valores. O status é o do Sellent." />
        <Erro mensagem={erro} />
      </div>
    )
  }

  if (pedidos.length === 0 && !recorteAtivo(recorte)) {
    return (
      <div className="space-y-5">
        <Cabecalho titulo="Pedidos" subtitulo="Clique na linha para abrir loja, vendedor, itens e valores. O status é o do Sellent." />
        <Vazio />
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="min-h-[40vh] animate-pulse rounded-2xl bg-muted/40" aria-busy="true" />}>
      <Mesa
        pedidos={pedidos}
        truncado={truncado}
        pedidosComNota={pedidosComNota}
        pedidosComPendencia={pedidosComPendencia}
        contagensGlobais={contagensGlobais}
        proveniencia={proveniencia}
      />
    </Suspense>
  )
}

function Erro({ mensagem }: { mensagem: string }) {
  return (
    <p className="rounded-2xl border border-destructive/40 bg-danger-soft px-4 py-3 text-sm text-destructive" role="alert">
      Não foi possível ler os pedidos. {mensagem}
    </p>
  )
}

function Vazio() {
  return (
    <p className="rounded-2xl border border-dashed bg-card px-4 py-12 text-center text-sm text-muted-foreground">
      Nenhum pedido na base. Rode <span className="font-mono">npm run coletar</span> para a carga inicial.
    </p>
  )
}
