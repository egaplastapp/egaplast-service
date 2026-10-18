import {
  agregarNotasPorPedido,
  linhasPedidoFatura,
  rotuloCredito,
  rotuloSituacao,
} from "@/domain/faturamento"
import { configPainel } from "@/domain/painel"
import { lerFaturas, lerPedidos } from "@/lib/pedidos/ler"
import { exigirPapel } from "@/lib/supabase/servidor"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { supabase, papel } = await exigirPapel()
  if (!papel) return NextResponse.json({ erro: "Sem permissão" }, { status: 403 })

  const url = new URL(request.url)
  const consulta = {
    vista: url.searchParams.get("vista") ?? undefined,
    ano: url.searchParams.get("ano") ?? undefined,
    mes: url.searchParams.get("mes") ?? undefined,
    trimestre: url.searchParams.get("trimestre") ?? undefined,
    semestre: url.searchParams.get("semestre") ?? undefined,
  }
  const cfg = configPainel(consulta)
  const [{ pedidos, truncado, erro }, { faturas, truncado: truncadoFaturas, erro: erroFaturas }] = await Promise.all([
    lerPedidos(supabase, cfg.intervalo),
    lerFaturas(supabase, cfg.intervalo),
  ])
  if (erro ?? erroFaturas) return NextResponse.json({ erro: erro ?? erroFaturas }, { status: 502 })

  const agregado = agregarNotasPorPedido(faturas)
  const linhas = linhasPedidoFatura(pedidos, agregado, cfg.mesFoco)
  const cabecalho = [
    "pedido_id",
    "codigo",
    "cliente",
    "situacao_fiscal",
    "ultima_nota",
    "valor_pedido",
    "valor_notas",
    "credit_status",
  ]
  const corpo = linhas.map((linha) => {
    const credito = rotuloCredito(linha.credito)
    return [
      linha.pedidoId,
      linha.codigo,
      linha.cliente ?? "",
      rotuloSituacao(linha.situacao),
      linha.ultimaNota ?? "",
      linha.valorPedido ?? "",
      linha.valorNotas,
      credito.rotulo,
    ]
      .map(csvCelula)
      .join(",")
  })
  const aviso = truncado || truncadoFaturas ? "# Recorte truncado pelo teto da leitura\n" : ""
  const csv = aviso + [cabecalho.join(","), ...corpo].join("\n")
  const nome = `faturamento-${cfg.mesFoco}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
    },
  })
}

function csvCelula(valor: string | number) {
  const texto = String(valor)
  if (/[",\n]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`
  return texto
}
