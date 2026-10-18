import { cursorParaApi } from "@/lib/sellent/cursor"
import type { ModoPedidos } from "@/domain/coleta"

const HOST = "https://api.sellentt.com.br/api/v1"
const LIMITE = 50
const TIMEOUT_MS = 8000

export type PreflightPedidos =
  | {
      ok: true
      modo: ModoPedidos
      lidos: number
      paginaCheia: boolean
      cursorIso: string | null
    }
  | { ok: false; motivo: string }

export async function preflightPedidos(cursorIso: string | null): Promise<PreflightPedidos> {
  const token = process.env.SELLENT_API_TOKEN
  if (!token) return { ok: false, motivo: "Token do Sellent não configurado no servidor." }

  const modo: ModoPedidos = cursorIso ? "incremental" : "inicial"
  const extra = cursorIso ? `&after_updated=${encodeURIComponent(cursorParaApi(cursorIso))}` : ""
  const caminho = `${HOST}/orders_full?limit=${LIMITE}&page=1${extra}`

  try {
    const resposta = await fetch(caminho, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    })
    if (!resposta.ok) return { ok: false, motivo: "Pré-voo indisponível (API respondeu com erro)." }
    const json = (await resposta.json()) as { data?: unknown[] }
    const lidos = Array.isArray(json.data) ? json.data.length : 0
    return {
      ok: true,
      modo,
      lidos,
      paginaCheia: lidos >= LIMITE,
      cursorIso,
    }
  } catch {
    return { ok: false, motivo: "Pré-voo indisponível (tempo esgotado ou rede)." }
  }
}

export function textoPreflightPedidos(preflight: PreflightPedidos) {
  if (!preflight.ok) return preflight.motivo
  if (preflight.modo === "inicial") {
    return "Próxima coleta de pedidos será carga cheia. O pré-voo não estima o total."
  }
  if (preflight.lidos === 0) {
    return "Nada novo na API desde a última coleta de pedidos com sucesso."
  }
  const base = `Pelo menos ${preflight.lidos.toLocaleString("pt-BR")} pedido(s) na API desde o cursor`
  return preflight.paginaCheia ? `${base}; pode haver mais.` : `${base}.`
}
