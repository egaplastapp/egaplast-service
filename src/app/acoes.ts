"use server"

import { etapaFinal } from "@/domain/operacao"
import { criarClienteServidor, papelAtual } from "@/lib/supabase/servidor"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function entrar(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const senha = String(formData.get("senha") ?? "")
  const supabase = await criarClienteServidor()
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) redirect("/login?erro=credencial")
  redirect("/painel")
}

export async function sair() {
  const supabase = await criarClienteServidor()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function abrirOperacao(formData: FormData) {
  const { supabase, user, papel } = await papelAtual()
  if (!user || !papel) redirect("/login")
  const pedidoId = Number(formData.get("pedido"))
  if (!Number.isFinite(pedidoId)) redirect("/pedidos")

  const { data: etapas } = await supabase.from("stages").select("id, code, position").order("position")
  const primeira = etapas?.[0]
  if (!primeira) redirect(`/pedidos/${pedidoId}?erro=etapa`)

  const { data: itens } = await supabase.from("order_items").select("id").eq("order_id", pedidoId)
  if (!itens?.length) redirect(`/pedidos/${pedidoId}?erro=abrir`)
  const { data: existentes } = await supabase.from("order_item_progress").select("order_item_id").in(
    "order_item_id",
    (itens ?? []).map((item) => item.id),
  )
  const jaAbertos = new Set((existentes ?? []).map((item) => Number(item.order_item_id)))
  const novos = (itens ?? [])
    .filter((item) => !jaAbertos.has(Number(item.id)))
    .map((item) => ({
      order_item_id: item.id,
      stage_id: primeira.id,
      status: "open",
      trigger: "manual",
    }))
  if (novos.length > 0) {
    const { error } = await supabase.from("order_item_progress").insert(novos)
    if (error) redirect(`/pedidos/${pedidoId}?erro=abrir`)
    const { data: criados } = await supabase.from("order_item_progress").select("id").in(
      "order_item_id",
      novos.map((item) => item.order_item_id),
    )
    if (criados && criados.length > 0) {
      await supabase.from("order_item_progress_events").insert(
        criados.map((progresso) => ({
          progress_id: progresso.id,
          from_stage_id: null,
          to_stage_id: primeira.id,
          reason: "Operação aberta a partir do pedido.",
          author: user.id,
        })),
      )
    }
  }
  revalidatePath(`/pedidos/${pedidoId}`)
  revalidatePath("/operacao")
  redirect(`/pedidos/${pedidoId}`)
}

export async function moverEtapa(formData: FormData) {
  const { supabase, user, papel } = await papelAtual()
  if (!user || !papel) redirect("/login")
  const progressoId = Number(formData.get("progresso"))
  const etapaId = Number(formData.get("etapa"))
  const pedidoId = Number(formData.get("pedido"))
  const motivo = String(formData.get("motivo") ?? "").trim()
  const volta = Number.isFinite(pedidoId) ? `/pedidos/${pedidoId}` : "/operacao"
  if (!motivo) redirect(`${volta}?erro=motivo`)
  if (!Number.isFinite(progressoId) || !Number.isFinite(etapaId)) redirect(volta)

  const { data: progresso } = await supabase.from("order_item_progress").select("id, stage_id").eq("id", progressoId).maybeSingle()
  const { data: etapas } = await supabase.from("stages").select("id, code, position")
  const destino = (etapas ?? []).find((etapa) => Number(etapa.id) === etapaId)
  if (!progresso || !destino) redirect(`${volta}?erro=etapa`)
  if (Number(progresso.stage_id) === etapaId) redirect(`${volta}?erro=igual`)

  const ultima = etapaFinal((etapas ?? []).map((etapa) => ({ codigo: etapa.code, ordem: etapa.position })))
  const { error } = await supabase.from("order_item_progress").update({
    stage_id: etapaId,
    status: ultima && destino.code === ultima.codigo ? "done" : "open",
    updated_at: new Date().toISOString(),
  }).eq("id", progressoId)
  if (error) redirect(`${volta}?erro=mover`)
  await supabase.from("order_item_progress_events").insert({
    progress_id: progressoId,
    from_stage_id: progresso.stage_id,
    to_stage_id: etapaId,
    reason: motivo,
    author: user.id,
  })
  revalidatePath(volta)
  revalidatePath("/operacao")
  redirect(volta)
}

export async function salvarEtapa(formData: FormData) {
  const { supabase, papel } = await papelAtual()
  if (papel !== "admin") redirect("/pedidos")
  const id = Number(formData.get("id"))
  const nome = String(formData.get("nome") ?? "").trim()
  const ordem = Number(formData.get("ordem"))
  if (!nome || !Number.isFinite(id) || !Number.isFinite(ordem)) redirect("/cadastros/etapas?erro=dados")
  const { error } = await supabase.from("stages").update({ name: nome, position: ordem, is_provisional: false }).eq("id", id)
  if (error) redirect("/cadastros/etapas?erro=salvar")
  revalidatePath("/cadastros/etapas")
  redirect("/cadastros/etapas")
}

export async function criarEtapa(formData: FormData) {
  const { supabase, papel } = await papelAtual()
  if (papel !== "admin") redirect("/pedidos")
  const codigo = String(formData.get("codigo") ?? "").trim().toLowerCase().replace(/\s+/g, "_")
  const nome = String(formData.get("nome") ?? "").trim()
  const ordem = Number(formData.get("ordem"))
  if (!codigo || !nome || !Number.isFinite(ordem)) redirect("/cadastros/etapas?erro=dados")
  const { data: area } = await supabase.from("areas").select("id").order("id").limit(1).maybeSingle()
  const { error } = await supabase.from("stages").insert({
    code: codigo,
    name: nome,
    position: ordem,
    is_provisional: false,
    area_id: area?.id ?? null,
  })
  if (error) redirect("/cadastros/etapas?erro=salvar")
  revalidatePath("/cadastros/etapas")
  redirect("/cadastros/etapas")
}
