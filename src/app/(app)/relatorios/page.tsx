import { Cabecalho, SemPapel } from "@/components/pagina"
import { configPainel, mesLocal, temPeriodoExplicito } from "@/domain/painel"
import { TETO_LISTA } from "@/domain/pedidos"
import { exigirPapel } from "@/lib/supabase/servidor"
import Link from "next/link"
import { redirect } from "next/navigation"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function RelatoriosPage({ searchParams }: Props) {
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
    redirect(`/relatorios?mes=${mesLocal(hoje)}`)
  }
  const cfg = configPainel(consulta, hoje)
  const { papel } = await exigirPapel()
  if (!papel) return <SemPapel />

  const exportQuery = queryExport(consulta)

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Relatórios"
        subtitulo={`Exportações CSV do recorte ${cfg.rotuloVista.toLowerCase()} · até ${TETO_LISTA.toLocaleString("pt-BR")} linhas por leitura.`}
      />
      <ul className="grid gap-4 md:grid-cols-2">
        <CartaoExport
          titulo="Pedidos do painel"
          descricao="Pedidos no intervalo do filtro de período, com status Sellent e ERP."
          href={`/api/painel/export${exportQuery}`}
        />
        <CartaoExport
          titulo="Faturamento"
          descricao="Situação fiscal por pedido no mês: notas, gap e crédito."
          href={`/api/faturamento/export${exportQuery}`}
        />
      </ul>
      <p className="text-sm text-muted-foreground">
        Ajuste o mês em{" "}
        <Link href={`/painel?mes=${cfg.mesFoco}`} className="font-medium text-brand hover:underline">
          Painel
        </Link>{" "}
        ou{" "}
        <Link href={`/faturamento?mes=${cfg.mesFoco}`} className="font-medium text-brand hover:underline">
          Faturamento
        </Link>
        ; os exports usam o mesmo parâmetro <span className="font-mono">?mes=</span>.
      </p>
    </div>
  )
}

function CartaoExport({ titulo, descricao, href }: { titulo: string; descricao: string; href: string }) {
  return (
    <li className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
      <a
        href={href}
        className="mt-4 inline-flex h-10 items-center rounded-lg border border-brand/35 bg-brand-soft px-4 text-sm font-semibold text-brand hover:bg-brand-soft/80"
      >
        ↓ Baixar CSV
      </a>
      <p className="mt-2 text-[11px] text-muted-foreground">Se o recorte for truncado, a primeira linha do arquivo avisa.</p>
    </li>
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
