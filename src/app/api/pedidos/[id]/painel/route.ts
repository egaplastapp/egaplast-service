import { carregarPainelPedido } from "@/lib/pedidos/painel"
import { exigirPapel } from "@/lib/supabase/servidor"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const pedidoId = Number(id)
  if (!Number.isFinite(pedidoId)) {
    return Response.json({ erro: "Pedido inválido." }, { status: 400 })
  }

  const { supabase, papel } = await exigirPapel()
  if (!papel) {
    return Response.json({ erro: "Não autenticado." }, { status: 401 })
  }

  const painel = await carregarPainelPedido(supabase, pedidoId)
  if (!painel) {
    return Response.json({ erro: "Pedido não encontrado." }, { status: 404 })
  }

  return Response.json(painel)
}
