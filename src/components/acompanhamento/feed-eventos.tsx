import type { Notificacao } from "@/domain/notificacoes"
import { hrefPedidosMovimentoDesdeColeta } from "@/domain/recorte-pedidos"
import { Panel } from "@/components/premium"
import { dataHora } from "@/lib/format"
import Link from "next/link"

export function FeedEventos({ itens }: { itens: Notificacao[] }) {
  return (
    <Panel
      titulo="O que mudou na réplica"
      subtitulo="Inclui pedidos novos e alterações de status, ERP, valor ou cancelamento"
      acao="Ver movimento desde coleta ↗"
      acaoHref={hrefPedidosMovimentoDesdeColeta()}
      className="mb-5"
    >
      {itens.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">Nenhum evento recente na réplica.</p>
      ) : (
        <ul className="divide-y px-5 pb-3">
          {itens.map((item) => (
            <li key={item.id} className="py-3 first:pt-0">
              <Link href={item.href} className="text-sm font-semibold hover:text-brand-strong hover:underline">
                {item.titulo}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.texto}</p>
              <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">{dataHora(item.quando)}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
