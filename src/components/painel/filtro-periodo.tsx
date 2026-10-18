import { deslocarMes, rotuloMes, type VistaPainel } from "@/domain/painel"
import { cn } from "cn"
import { Download } from "lucide-react"
import Link from "next/link"

type Consulta = {
  vista?: string
  ano?: string
  mes?: string
  trimestre?: string
  semestre?: string
}

type Props = {
  vista: VistaPainel
  rotuloVista: string
  mesFoco: string
  consulta: Consulta
  base?: string
}

export function FiltroPeriodoPainel({ vista, rotuloVista, mesFoco, consulta, base = "/painel" }: Props) {
  const anoAtual = Number(mesFoco.slice(0, 4))
  const mesAnterior = deslocarMes(mesFoco, -1)
  const trimestreAtual = Math.ceil(Number(mesFoco.slice(5)) / 3)
  const semestreAtual = Number(mesFoco.slice(5)) <= 6 ? 1 : 2
  const exportQuery = queryExport(consulta)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-muted/80 p-1 text-sm">
        <Pill href={`${base}?mes=${mesFoco}`} ativo={vista === "mes"}>
          Mês {rotuloMes(mesFoco)}
        </Pill>
        <Pill href={`${base}?vista=12m`} ativo={vista === "12m"}>
          12 meses
        </Pill>
        <Pill href={`${base}?trimestre=${anoAtual}-T${trimestreAtual}`} ativo={vista === "trimestre"}>
          T{trimestreAtual}/{String(anoAtual).slice(2)}
        </Pill>
        <Pill href={`${base}?semestre=${anoAtual}-S${semestreAtual}`} ativo={vista === "semestre"}>
          S{semestreAtual}/{String(anoAtual).slice(2)}
        </Pill>
        <Pill href={`${base}?ano=${anoAtual}`} ativo={vista === "ano"}>
          Ano {anoAtual}
        </Pill>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Período: <span className="font-medium text-foreground">{rotuloVista}</span>
          {vista === "mes" ? (
            <>
              {" "}
              · <Link href={`${base}?mes=${mesAnterior}`} className="text-brand-strong hover:underline">Mês anterior</Link>
            </>
          ) : null}
        </p>
        <Link
          href={`/api/painel/export${exportQuery}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-muted/80"
        >
          <Download className="size-3.5" aria-hidden />
          Exportar CSV
        </Link>
      </div>
    </div>
  )
}

function queryExport(consulta: Consulta) {
  const params = new URLSearchParams()
  if (consulta.mes) params.set("mes", consulta.mes)
  else if (consulta.vista === "12m") params.set("vista", "12m")
  else if (consulta.ano) params.set("ano", consulta.ano)
  else if (consulta.trimestre) params.set("trimestre", consulta.trimestre)
  else if (consulta.semestre) params.set("semestre", consulta.semestre)
  const texto = params.toString()
  return texto ? `?${texto}` : ""
}

function Pill({ href, ativo, children }: { href: string; ativo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-3 py-1.5 font-medium transition-colors",
        ativo ? "bg-card text-foreground shadow-sm ring-1 ring-border/60" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  )
}
