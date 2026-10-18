/**
 * Credenciais do Supabase no servidor.
 * A integração Vercel+Supabase preenche SUPABASE_* de outro projeto legado;
 * NEXT_PUBLIC_* (egaplast / hdfiitvuzroelorwmguk) é a fonte correta neste app.
 */
export function chavePublicaSupabase(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY
  )
}

export function urlSupabase(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
}
