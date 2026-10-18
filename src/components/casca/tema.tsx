"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function Tema() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex size-10 cursor-pointer items-center justify-center rounded-full border bg-card text-muted-foreground hover:bg-muted hover:text-foreground sm:size-11"
    >
      <Sun className="size-[18px] dark:hidden" aria-hidden />
      <Moon className="hidden size-[18px] dark:block" aria-hidden />
      <span className="sr-only">Alternar tema claro e escuro</span>
    </button>
  )
}
