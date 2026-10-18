import { configPainel } from "@/domain/painel"
import { nomeStatus } from "@/domain/pedidos"
import { lerPedidos } from "@/lib/pedidos/ler"
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
  const { pedidos, truncado, erro } = await lerPedidos(supabase, cfg.intervalo)
  if (erro) return NextResponse.json({ erro }, { status: 502 })

  const linhas = pedidos.filter((p) => !p.apagadoEm)
  const cabecalho = ["id", "codigo", "data_pedido", "cliente", "loja", "uf", "status", "erp_numero", "erp_recusa", "valor", "atualizado_em"]
  const corpo = linhas.map((p) =>
    [
      p.id,
      p.codigo ?? "",
      p.dataPedido ?? "",
      p.cliente ?? "",
      p.loja ?? "",
      p.uf ?? "",
      nomeStatus(p),
      p.erpNumero ?? "",
      p.erpRecusa ?? "",
      p.valor ?? "",
      p.atualizadoEm ?? "",
    ]
      .map(csvCelula)
      .join(","),
  )
  const aviso = truncado ? "# Recorte truncado pelo teto da leitura\n" : ""
  const csv = aviso + [cabecalho.join(","), ...corpo].join("\n")
  const nome = `pedidos-painel-${cfg.mesFoco}.csv`

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
