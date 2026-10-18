"use client"

const SECOES = [
  { id: "sec-rastreio", rotulo: "Rastreio" },
  { id: "sec-comercial", rotulo: "Comercial" },
  { id: "sec-itens", rotulo: "Itens" },
  { id: "sec-operacao", rotulo: "Operação" },
  { id: "sec-pendencias", rotulo: "Pendências" },
  { id: "sec-notas", rotulo: "Notas" },
  { id: "sec-eventos", rotulo: "Eventos" },
] as const

export function IndiceSecoesPedido() {
  return (
    <nav className="sticky top-[4.625rem] z-10 -mx-1 flex flex-wrap gap-1.5 border-b border-border/80 bg-background/95 py-2 backdrop-blur-sm" aria-label="Seções do pedido">
      {SECOES.map((secao) => (
        <a
          key={secao.id}
          href={`#${secao.id}`}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {secao.rotulo}
        </a>
      ))}
    </nav>
  )
}
