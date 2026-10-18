"use client"

import { SystemFlow } from "@/components/premium/system-flow"
import { useState } from "react"

export function SystemFlowColapsavel() {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="mb-5">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between rounded-[14px] border border-border bg-card px-5 py-3 text-left text-sm font-semibold text-[#485569] hover:bg-muted/60"
        aria-expanded={aberto}
        onClick={() => setAberto((atual) => !atual)}
      >
        <span>Referência do fluxo entre plataformas (ilustrativo)</span>
        <span aria-hidden>{aberto ? "▴" : "▾"}</span>
      </button>
      {aberto ? <SystemFlow /> : null}
    </div>
  )
}
