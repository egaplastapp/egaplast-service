import type { Notificacao } from "@/domain/notificacoes"

export type DadosCasca = {
  email: string
  admin: boolean
  notificacoes: Notificacao[]
  emAnalise: number | null
  coletaComFalha: boolean
  ultimaColeta: string | null
}

export type Tela = { href: string; rotulo: string }

export const TELAS_BASICAS: Tela[] = [
  { href: "/painel", rotulo: "Painel" },
  { href: "/calendario", rotulo: "Calendário" },
  { href: "/relatorios", rotulo: "Relatórios" },
  { href: "/acompanhamento", rotulo: "Acompanhamento" },
  { href: "/pedidos", rotulo: "Pedidos" },
  { href: "/faturamento", rotulo: "Faturamento" },
  { href: "/clientes", rotulo: "Clientes" },
  { href: "/operacao", rotulo: "Operação" },
]

export const TELAS_ADMIN: Tela[] = [
  { href: "/coleta", rotulo: "Coleta" },
  { href: "/cadastros/etapas", rotulo: "Etapas" },
]

export function tituloDaRota(caminho: string) {
  if (caminho.startsWith("/painel")) return "Painel"
  if (caminho.startsWith("/acompanhamento")) return "Acompanhamento"
  if (caminho.startsWith("/calendario")) return "Calendário"
  if (caminho.startsWith("/faturamento")) return "Faturamento"
  if (caminho.startsWith("/clientes")) return "Clientes"
  if (caminho.startsWith("/relatorios")) return "Relatórios"
  if (caminho.startsWith("/pedidos/")) return "Pedido"
  if (caminho.startsWith("/pedidos")) return "Pedidos"
  if (caminho.startsWith("/operacao")) return "Operação"
  if (caminho.startsWith("/coleta")) return "Coleta"
  if (caminho.startsWith("/cadastros/etapas")) return "Etapas"
  return "EGAPLAST Service"
}
