import { entrar } from "@/app/acoes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { connection } from "next/server"

export const instant = false

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await connection()
  const { erro } = await searchParams
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">EGAPLAST</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A base operacional dos pedidos. O acesso é por convite.
      </p>
      <form action={entrar} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
        </div>
        {erro === "credencial" ? (
          <p className="text-sm text-destructive">E-mail ou senha não conferem.</p>
        ) : null}
        <Button type="submit" className="h-11 w-full">Entrar</Button>
      </form>
      </div>
    </main>
  )
}
