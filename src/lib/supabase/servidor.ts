import { chavePublicaSupabase, urlSupabase } from "@/lib/supabase/config"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { cache } from "react"

export type Papel = "admin" | "operador"

export async function criarClienteServidor() {
  const url = urlSupabase()
  const chave = chavePublicaSupabase()
  if (!url || !chave) throw new Error("Supabase não está configurado no servidor.")
  const cookieStore = await cookies()
  return createServerClient(url, chave, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
        } catch {
          // Em Server Component o cookie é renovado pelo proxy.
        }
      },
    },
  })
}

// getClaims valida o JWT com a chave pública (ES256) sem ir ao servidor de autenticação.
// connection() vem antes porque a checagem de expiração usa Date.now().
export const papelAtual = cache(async () => {
  await connection()
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const user = claims?.sub ? { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null } : null
  const bruto = (claims?.app_metadata as { papel?: unknown } | undefined)?.papel
  const papel: Papel | null = bruto === "admin" || bruto === "operador" ? bruto : null
  return { supabase, user, papel }
})

// a página decide o que mostrar a quem tem sessão e não tem papel
export async function exigirPapel() {
  const atual = await papelAtual()
  if (!atual.user) redirect("/login")
  return atual
}
