import { chavePublicaSupabase, urlSupabase } from "@/lib/supabase/config"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/** Diagnóstico temporário de auth em produção. Remover após estabilizar login. */
export async function GET() {
  const url = urlSupabase()
  const chave = chavePublicaSupabase()
  if (!url || !chave) {
    return Response.json({
      ok: false,
      reason: "missing_env",
      hasUrl: Boolean(url),
      hasKey: Boolean(chave),
    })
  }
  const cookieStore = await cookies()
  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })
  const { error } = await supabase.auth.signInWithPassword({
    email: "admin@egaplast.com",
    password: "egaplast1!",
  })
  return Response.json({
    ok: !error,
    msg: error?.message ?? null,
    urlTail: url.slice(-24),
    keyKind: chave.startsWith("sb_") ? "publishable" : chave.startsWith("ey") ? "jwt" : "other",
  })
}
