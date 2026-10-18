/**
 * Conferência read-only: amostra Sellent (GET orders_full) vs réplica Postgres.
 * Uso: npm run conferir [-- --amostra=20]
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import {
  conferirSellentReplica,
  conferenciaOk,
  imprimirConferencia,
} from "./lib/conferir-core"

function lerEnv() {
  const pares = Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((linha) => linha && !linha.startsWith("#") && linha.includes("="))
      .map((linha) => {
        const indice = linha.indexOf("=")
        return [linha.slice(0, indice).trim(), linha.slice(indice + 1).trim()]
      }),
  )
  const url = pares.NEXT_PUBLIC_SUPABASE_URL
  const chave = pares.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const token = pares.SELLENT_API_TOKEN
  const email = pares.SERVICE_ADMIN_EMAIL
  const senha = pares.SERVICE_ADMIN_PASSWORD
  if (!url || !chave || !token || !email || !senha) {
    throw new Error("Faltam variáveis em .env.local para a conferência.")
  }
  return { url, chave, token, email, senha }
}

function amostraArg() {
  const bruto = process.argv.find((item) => item.startsWith("--amostra="))?.split("=")[1]
  const n = bruto ? Number(bruto) : 15
  return Number.isFinite(n) && n > 0 ? Math.min(100, Math.floor(n)) : 15
}

async function main() {
  const env = lerEnv()
  const limite = amostraArg()
  const cliente = createClient(env.url, env.chave, { auth: { persistSession: false, autoRefreshToken: false } })
  const acesso = await cliente.auth.signInWithPassword({ email: env.email, password: env.senha })
  if (acesso.error || !acesso.data.session) throw new Error("Falha ao autenticar.")

  const resultado = await conferirSellentReplica(cliente, env.token, limite)
  imprimirConferencia(resultado, limite)
  process.exitCode = conferenciaOk(resultado) ? 0 : 1
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : erro)
  process.exit(1)
})
