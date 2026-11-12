import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react"
import { hex, inspect, interactiveOf, type Level, type Report } from "@/lib/a11y"
import { cn } from "@/lib/utils"

const icon: Record<Level, React.ReactNode> = {
  pass: <CircleCheck className="size-3.5 text-emerald-500" />,
  fail: <CircleX className="size-3.5 text-red-500" />,
  warn: <TriangleAlert className="size-3.5 text-amber-500" />,
  info: <Info className="size-3.5 text-sky-500" />,
}

/**
 * Accessibility check mode: hover anything inside a frame to outline it and
 * see its WCAG checks. Rendered in canvas chrome (fixed, not themed by frames).
 */
export function A11yInspector({ enabled }: { enabled: boolean }) {
  const [hit, setHit] = useState<{ rect: DOMRect; report: Report; x: number; y: number } | null>(null)
  const raf = useRef(0)

  useEffect(() => {
    if (!enabled) {
      setHit(null)
      return
    }
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(() => {
        const t = e.target as Element | null
        if (!t || !t.closest("[data-frame-body]") || t.closest("[data-a11y-ignore]")) return setHit(null)
        const subject = interactiveOf(t) ?? t
        setHit({ rect: subject.getBoundingClientRect(), report: inspect(t), x: e.clientX, y: e.clientY })
      })
    }
    window.addEventListener("pointermove", onMove)
    return () => {
      window.removeEventListener("pointermove", onMove)
      cancelAnimationFrame(raf.current)
    }
  }, [enabled])

  if (!enabled) return null
  const r = hit?.report
  const fails = r?.checks.filter((c) => c.level === "fail").length ?? 0
  // keep the card on screen
  const cardX = hit ? Math.min(hit.x + 18, window.innerWidth - 300) : 0
  const cardY = hit ? (hit.y + 260 > window.innerHeight ? hit.y - 250 : hit.y + 18) : 0

  return (
    <div className="pointer-events-none fixed inset-0 z-40" data-a11y-ignore>
      <AnimatePresence>
        {hit && r && (
          <>
            <motion.div
              key="outline"
              className={cn("absolute rounded-sm border-2", fails ? "border-red-500 bg-red-500/10" : "border-emerald-500 bg-emerald-500/10")}
              initial={false}
              animate={{ left: hit.rect.left - 2, top: hit.rect.top - 2, width: hit.rect.width + 4, height: hit.rect.height + 4, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 40 }}
            />
            <motion.div
              key="card"
              className="bg-popover text-popover-foreground absolute w-72 rounded-xl border p-3 text-xs shadow-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, left: cardX, top: cardY }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    <span className="text-muted-foreground font-mono">&lt;{r.tag}&gt;</span> {r.role}
                  </p>
                  {r.name && <p className="text-muted-foreground truncate">{r.name}</p>}
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", fails ? "bg-red-500/15 text-red-600" : "bg-emerald-500/15 text-emerald-600")}>
                  {fails ? `${fails} issue${fails > 1 ? "s" : ""}` : "Passes"}
                </span>
              </div>
              {r.fg && r.bg && (
                <div className="bg-muted mb-2 flex items-center gap-2 rounded-lg p-1.5">
                  <span className="flex size-8 items-center justify-center rounded-md border text-sm font-semibold" style={{ background: hex(r.bg), color: hex(r.fg) }}>
                    Aa
                  </span>
                  <div className="font-mono text-[10px] leading-tight">
                    <p>fg {hex(r.fg)}</p>
                    <p>bg {hex(r.bg)}</p>
                  </div>
                  <span className="ml-auto text-base font-semibold tabular-nums">{r.ratio?.toFixed(2)}:1</span>
                </div>
              )}
              <ul className="space-y-1.5">
                {r.checks.map((c) => (
                  <li key={c.id} className="flex gap-2">
                    <span className="mt-px">{icon[c.level]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="flex justify-between gap-2">
                        <span className="font-medium">{c.label}</span>
                        <span className="tabular-nums">{c.value}</span>
                      </p>
                      {c.note && <p className="text-muted-foreground">{c.note}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
