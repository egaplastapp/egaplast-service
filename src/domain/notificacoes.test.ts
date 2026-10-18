import { describe, expect, it } from "vitest"
import { montarFeedEventos, montarNotificacoes, naoVistas, type EventoBruto, type FalhaBruta } from "./notificacoes"

const status = new Map([
  ["1", "APROVADO"],
  ["2", "INVOICE-ATIVO"],
])

function evento(parcial: Partial<EventoBruto>): EventoBruto {
  return {
    id: 1,
    field: "status_id",
    previous_value: "1",
    new_value: "2",
    observed_at: "2026-10-17T12:00:00.000Z",
    pedidoId: 10,
    pedidoCodigo: "1952",
    ...parcial,
  }
}

describe("montarNotificacoes", () => {
  it("traduz o id do status para o nome do Sellent", () => {
    const [aviso] = montarNotificacoes([evento({})], [], status)
    expect(aviso.titulo).toBe("Pedido 1952 mudou de status")
    expect(aviso.texto).toBe("APROVADO para INVOICE-ATIVO, no Sellent.")
    expect(aviso.href).toBe("/pedidos/10")
  })

  it("ignora o evento de pedido criado", () => {
    expect(montarNotificacoes([evento({ field: "created", previous_value: null, new_value: "sim" })], [], status)).toEqual([])
  })

  it("mantém o id do status quando o nome não está no cadastro", () => {
    const [aviso] = montarNotificacoes([evento({ new_value: "99" })], [], status)
    expect(aviso.texto).toBe("APROVADO para status 99, no Sellent.")
  })

  it("junta falha de coleta e ordena da mais recente para a mais antiga", () => {
    const falha: FalhaBruta = { id: 7, source: "invoices", finished_at: "2026-10-17T13:00:00.000Z", started_at: "2026-10-17T12:50:00.000Z", error: "timeout" }
    const lista = montarNotificacoes([evento({})], [falha], status)
    expect(lista.map((item) => item.id)).toEqual(["coleta-7", "evento-1"])
    expect(lista[0]).toMatchObject({ titulo: "Coleta de Faturas falhou", texto: "timeout", href: "/coleta" })
  })

  it("respeita o limite", () => {
    const eventos = Array.from({ length: 12 }, (_, indice) => evento({ id: indice, observed_at: `2026-10-${String(indice + 1).padStart(2, "0")}T00:00:00.000Z` }))
    expect(montarNotificacoes(eventos, [], status)).toHaveLength(8)
  })

  it("descreve recusa do ERP com o texto recebido", () => {
    const [aviso] = montarNotificacoes([evento({ field: "erp_rejection", previous_value: null, new_value: "Cliente bloqueado" })], [], status)
    expect(aviso).toMatchObject({ tipo: "recusa", titulo: "Pedido 1952 voltou com recusa do ERP", texto: "Cliente bloqueado" })
  })
})

describe("montarFeedEventos", () => {
  it("inclui pedido criado na réplica", () => {
    const [aviso] = montarFeedEventos([evento({ field: "created", previous_value: null, new_value: "sim" })], status, 5)
    expect(aviso).toMatchObject({ tipo: "novo", titulo: "Pedido 1952 entrou na réplica" })
  })
})

describe("naoVistas", () => {
  const lista = montarNotificacoes(
    [evento({ id: 1, observed_at: "2026-10-17T10:00:00.000Z" }), evento({ id: 2, observed_at: "2026-10-17T14:00:00.000Z" })],
    [],
    status,
  )

  it("conta tudo quando nunca abriu", () => {
    expect(naoVistas(lista, null)).toBe(2)
  })

  it("conta só o que chegou depois da última abertura", () => {
    expect(naoVistas(lista, "2026-10-17T12:00:00.000Z")).toBe(1)
  })
})
