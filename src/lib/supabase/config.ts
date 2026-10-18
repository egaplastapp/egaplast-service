/** Projeto Supabase operacional (docs/negocio/contexto.md). */
const REF = "hdfiitvuzroelorwmguk"
const URL_EGAPLAST = `https://${REF}.supabase.co`

/** Anon publicável do projeto egaplast (fallback se a Vercel injetar chave de outro projeto). */
const ANON_EGAPLAST =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZmlpdHZ1enJvZWxvcndtZ3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMjMyOTYsImV4cCI6MjEwNzc5OTI5Nn0.S6F_xu6MHX80Ii7NCS9N7zl--gsq17s0JcpWvKF8nIo"

function urlEgoplast(candidato: string | undefined): string | undefined {
  if (candidato?.includes(REF)) return candidato
  return undefined
}

function chaveEgoplast(candidato: string | undefined): string | undefined {
  if (!candidato) return undefined
  if (candidato.startsWith("sb_publishable_sjst")) return candidato
  if (candidato.includes(REF)) return candidato
  return undefined
}

export function urlSupabase(): string {
  return (
    urlEgoplast(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
    urlEgoplast(process.env.SUPABASE_URL) ??
    URL_EGAPLAST
  )
}

export function chavePublicaSupabase(): string {
  const candidatos = [
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
  ]
  for (const c of candidatos) {
    const ok = chaveEgoplast(c)
    if (ok) return ok
  }
  return ANON_EGAPLAST
}
