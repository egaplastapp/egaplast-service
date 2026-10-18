/**
 * Credenciais do Supabase no servidor.
 * Preferimos variáveis sem NEXT_PUBLIC_* para não depender do valor inlined no build da Vercel.
 */
export function chavePublicaSupabase(): string | undefined {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function urlSupabase(): string | undefined {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
}
