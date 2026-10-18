"use client"

import { FlutuarDica, PainelDicaBucket } from "@/components/painel/dica-grafico"
import { agregarSerie, detalharBucket, rotuloSerie, type GranularidadeSerie, type Mes } from "@/domain/painel"
import { moeda } from "@/lib/format"
import { cn } from "cn"
import { useMemo, useState } from "react"

export function BarrasMes({ meses, semanal }: { meses: Mes[]; semanal?: boolean }) {
  const max = Math.max(1, ...meses.map((item) => item.quantidade))
  const [ativo, setAtivo] = useState<number | null>(null)

  const detalhe = ativo != null ? detalharBucket(meses[ativo], meses[ativo - 1]) : null

  return (
    <div>
      <div className="flex h-52 items-end gap-1 sm:gap-2">
        {meses.map((item, indice) => (
          <div key={item.mes} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <button
              type="button"
              className="flex h-40 w-full cursor-pointer items-end justify-center rounded-t-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${rotuloSerie(item.mes)}: ${item.quantidade} pedidos`}
              onMouseEnter={() => setAtivo(indice)}
              onMouseLeave={() => setAtivo(null)}
              onFocus={() => setAtivo(indice)}
              onBlur={() => setAtivo(null)}
            >
              <div
                className={cn("min-h-[6px] w-2 rounded-t-md transition-all sm:w-3", ativo === indice && "ring-2 ring-brand/40 ring-offset-1")}
                style={{
                  height: `${Math.max(item.quantidade ? 6 : 0, (item.quantidade / max) * 100)}%`,
                  background: `var(--chart-${(indice % 5) + 1})`,
                  opacity: ativo == null || ativo === indice ? 1 : 0.45,
                }}
              />
            </button>
            <span className="text-[10px] text-muted-foreground capitalize sm:text-[11px]">
              {semanal ? rotuloSerie(item.mes) : rotuloSerie(item.mes).split("/")[0]}
            </span>
          </div>
        ))}
      </div>
      {detalhe ? (
        <FlutuarDica className="relative mt-3 w-full shadow-md">
          <PainelDicaBucket detalhe={detalhe} />
        </FlutuarDica>
      ) : (
        <p className="mt-3 text-center text-[10px] text-muted-foreground">Passe o mouse sobre uma barra para ver pedidos, notas e cobertura.</p>
      )}
    </div>
  )
}

type Integracao = {
  total: number
  comNumero: number
  comRecusa: number
  semNumero: number
  percentual: number | null
}

export function Semicirculo({ percentual, integracao }: { percentual: number | null; integracao?: Integracao }) {
  const raio = 80
  const comprimento = Math.PI * raio
  const valor = percentual ?? 0
  const preenchido = (Math.min(100, Math.max(0, valor)) / 100) * comprimento
  const preocupante = percentual != null && percentual < 70

  return (
    <div className="relative">
      <svg viewBox="0 0 200 120" className="mx-auto w-full max-w-[16rem]" role="img" aria-label={percentual == null ? "Sem pedidos no mês" : `${percentual.toFixed(1)} por cento com número no ERP`}>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--muted)" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={preocupante ? "var(--chart-4)" : "var(--chart-1)"}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${preenchido} ${comprimento}`}
        />
        <text x="100" y="88" textAnchor="middle" fill="currentColor" fontSize="28" fontWeight="700">
          {percentual == null ? "—" : `${percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
        </text>
      </svg>
      {integracao && percentual != null ? (
        <div
          className={cn(
            "mx-auto mt-2 max-w-xs rounded-lg border px-3 py-2 text-[11px]",
            preocupante ? "border-warning/40 bg-warning-soft/60 text-warning" : "border-border bg-muted/50 text-muted-foreground",
          )}
        >
          {preocupante ? (
            <p>
              <strong className="text-foreground">Atenção:</strong> {integracao.semNumero.toLocaleString("pt-BR")} pedidos do mês sem número ERP
              {integracao.comRecusa > 0 ? ` · ${integracao.comRecusa.toLocaleString("pt-BR")} com recusa` : ""}.
            </p>
          ) : (
            <p>
              {integracao.comNumero.toLocaleString("pt-BR")} com número · {integracao.comRecusa.toLocaleString("pt-BR")} recusas ·{" "}
              {integracao.semNumero.toLocaleString("pt-BR")} pendentes.
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

const MODOS: { id: GranularidadeSerie; rotulo: string }[] = [
  { id: "semana", rotulo: "Semanal" },
  { id: "mes", rotulo: "Mensal" },
  { id: "trimestre", rotulo: "Trimestral" },
  { id: "semestre", rotulo: "Semestral" },
  { id: "ano", rotulo: "Anual" },
]

export function PedidoFaturado({ meses, padrao }: { meses: Mes[]; padrao?: GranularidadeSerie }) {
  const soSemana = meses.some((item) => item.mes.includes("-S"))
  const modos = soSemana ? MODOS.filter((item) => item.id === "semana" || item.id === "mes") : MODOS.filter((item) => item.id !== "semana")
  const [periodo, setPeriodo] = useState<GranularidadeSerie>(padrao ?? (soSemana ? "semana" : "mes"))
  const [ativo, setAtivo] = useState<number | null>(null)
  const serie = useMemo(() => agregarSerie(meses, periodo), [meses, periodo])
  const max = Math.max(1, ...serie.flatMap((item) => [item.valor, item.faturado]))
  const largura = 640
  const altura = 260
  const margem = { esquerda: 52, direita: 12, topo: 16, baixo: 36 }
  const internoW = largura - margem.esquerda - margem.direita
  const internoH = altura - margem.topo - margem.baixo

  function coord(indice: number, valor: number) {
    const x = margem.esquerda + (serie.length <= 1 ? internoW / 2 : (indice / (serie.length - 1)) * internoW)
    const y = margem.topo + internoH - (valor / max) * internoH
    return { x, y }
  }

  function ponto(indice: number, valor: number) {
    const { x, y } = coord(indice, valor)
    return `${x},${y}`
  }

  const detalhe = ativo != null ? detalharBucket(serie[ativo], serie[ativo - 1]) : null
  const grades = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="relative">
      {detalhe ? (
        <FlutuarDica className="absolute right-0 top-0 max-w-[18rem]">
          <PainelDicaBucket detalhe={detalhe} />
          <p className="mt-2 border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
            Linha verde = valor dos pedidos · azul = notas emitidas. Gap alto pode indicar faturamento pendente.
          </p>
        </FlutuarDica>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <div className="inline-flex max-w-full flex-wrap rounded-xl bg-muted/80 p-1 text-sm">
          {modos.map((modo) => (
            <button
              key={modo.id}
              type="button"
              className={cn(
                "h-8 cursor-pointer rounded-lg px-2.5 font-medium sm:px-3",
                periodo === modo.id ? "bg-card text-foreground shadow-sm ring-1 ring-border/60" : "text-muted-foreground",
              )}
              onClick={() => {
                setPeriodo(modo.id)
                setAtivo(null)
              }}
            >
              {modo.rotulo}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${largura} ${altura}`} className="mt-4 w-full touch-none" role="img" aria-label="Valor dos pedidos e das notas no período">
        {grades.map((parte) => {
          const y = margem.topo + internoH * (1 - parte)
          return (
            <g key={parte}>
              <line x1={margem.esquerda} x2={largura - margem.direita} y1={y} y2={y} stroke="var(--border)" />
              <text x={margem.esquerda - 8} y={y + 4} textAnchor="end" fill="var(--muted-foreground)" fontSize="11">
                {eixo(max * parte)}
              </text>
            </g>
          )
        })}
        {ativo != null ? (
          <line
            x1={coord(ativo, 0).x}
            x2={coord(ativo, 0).x}
            y1={margem.topo}
            y2={margem.topo + internoH}
            stroke="var(--brand)"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity={0.5}
          />
        ) : null}
        <polyline fill="none" stroke="var(--chart-1)" strokeWidth="2.5" points={serie.map((item, indice) => ponto(indice, item.valor)).join(" ")} />
        <polyline fill="none" stroke="var(--chart-2)" strokeWidth="2.5" points={serie.map((item, indice) => ponto(indice, item.faturado)).join(" ")} />
        {serie.map((item, indice) => {
          const ped = coord(indice, item.valor)
          const fat = coord(indice, item.faturado)
          const ativoAqui = ativo === indice
          return (
            <g key={item.mes}>
              <circle
                cx={ped.x}
                cy={ped.y}
                r={ativoAqui ? 6 : 4}
                fill="var(--chart-1)"
                stroke="var(--card)"
                strokeWidth="2"
                className="cursor-pointer"
                onMouseEnter={() => setAtivo(indice)}
                onMouseLeave={() => setAtivo(null)}
              />
              <circle
                cx={fat.x}
                cy={fat.y}
                r={ativoAqui ? 6 : 4}
                fill="var(--chart-2)"
                stroke="var(--card)"
                strokeWidth="2"
                className="cursor-pointer"
                onMouseEnter={() => setAtivo(indice)}
                onMouseLeave={() => setAtivo(null)}
              />
              <rect
                x={coord(indice, 0).x - 16}
                y={margem.topo}
                width={32}
                height={internoH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setAtivo(indice)}
                onMouseLeave={() => setAtivo(null)}
              />
              <text x={coord(indice, 0).x} y={altura - 10} textAnchor="middle" fill="var(--muted-foreground)" fontSize="11">
                {rotuloSerie(item.mes)}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-chart-1" /> Pedidos ({moeda(serie.reduce((s, i) => s + i.valor, 0))} no recorte)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-chart-2" /> Notas ({moeda(serie.reduce((s, i) => s + i.faturado, 0))})
        </span>
        <span className="text-[10px]">Passe o mouse nos pontos para detalhes e comparação.</span>
      </p>
    </div>
  )
}

function eixo(valor: number) {
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
  if (valor >= 1_000) return `${(valor / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
}
