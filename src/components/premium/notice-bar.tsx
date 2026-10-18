import { cn } from "cn"

export function NoticeBar({
  tom = "ok",
  children,
}: {
  tom?: "ok" | "aviso"
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "mb-5 flex items-start gap-2.5 rounded-[10px] border px-4 py-3 text-xs",
        tom === "ok" && "border-[#d8e9e2] bg-[#f0faf5] text-[#386554]",
        tom === "aviso" && "border-warning/35 bg-warning-soft text-[#79551d]",
      )}
      role="status"
    >
      <span
        className={cn("mt-1 size-1.5 shrink-0 rounded-full", tom === "ok" ? "bg-[#1c9b70]" : "bg-warning")}
        aria-hidden
      />
      <div>{children}</div>
    </div>
  )
}
