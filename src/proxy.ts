import { chavePublicaSupabase, urlSupabase } from "@/lib/supabase/config"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request })
  const url = urlSupabase()
  const chave = chavePublicaSupabase()
  if (!url || !chave) return resposta

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        resposta = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) resposta.cookies.set(name, value, options)
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const logado = Boolean(data?.claims?.sub)
  const caminho = request.nextUrl.pathname
  const publico = caminho === "/login"
  if (!logado && !publico) {
    const destino = request.nextUrl.clone()
    destino.pathname = "/login"
    return NextResponse.redirect(destino)
  }
  if (logado && publico) {
    const destino = request.nextUrl.clone()
    destino.pathname = "/painel"
    return NextResponse.redirect(destino)
  }
  return resposta
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
