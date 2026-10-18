import { intervaloSqlDeFiltroUi } from "@/domain/intervalo-datas"
import type { RecortePedidosUrl } from "@/domain/recorte-pedidos"
import { execucaoColeta, ultimaColetaPedidosOk } from "@/lib/coleta/ultima"
import { dataHora } from "@/lib/format"
import { lerPedidos, lerPedidosComEventos, type Supabase } from "@/lib/pedidos/ler"

export type ResultadoListaPedidos = Awaited<ReturnType<typeof lerPedidos>> & {
  rotuloRecorte: string | null
}

export async function carregarListaPedidos(supabase: Supabase, recorte: RecortePedidosUrl, desdeColetaFlag: boolean) {
  if (recorte.tipo === "data_pedido") {
    const intervalo = intervaloSqlDeFiltroUi(recorte.de, recorte.ate)
    const resultado = await lerPedidos(supabase, intervalo)
    const rotulo =
      recorte.de === recorte.ate
        ? `Data do pedido (Sellent): ${recorte.de}`
        : `Data do pedido (Sellent): ${recorte.de} a ${recorte.ate}`
    return { ...resultado, rotuloRecorte: rotulo }
  }

  if (recorte.tipo === "movimento") {
    let exec = recorte.coletaExecId != null ? await execucaoColeta(supabase, recorte.coletaExecId) : null
    if (!exec && (desdeColetaFlag || recorte.coletaExecId == null)) exec = await ultimaColetaPedidosOk(supabase)
    if (!exec?.started_at) {
      return {
        pedidos: [],
        truncado: false,
        erro: null,
        rotuloRecorte: "Movimento na réplica: nenhuma coleta de pedidos concluída ainda",
      }
    }
    const janela =
      recorte.coletaExecId != null
        ? { desde: exec.started_at, ate: exec.finished_at }
        : { desde: exec.started_at, ate: null as string | null }
    const resultado = await lerPedidosComEventos(supabase, janela)
    const rotulo = exec
      ? recorte.coletaExecId != null
        ? `Movimento na réplica: execução #${exec.id} (${exec.source})`
        : `Movimento na réplica: desde início da última coleta de pedidos (${dataHora(exec.started_at)})`
      : "Movimento na réplica"
    return { ...resultado, rotuloRecorte: rotulo }
  }

  const resultado = await lerPedidos(supabase)
  return {
    ...resultado,
    rotuloRecorte: "Ordenado por última atualização na réplica (até 5.000 pedidos)",
  }
}
