import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronRight, LoaderCircle, Play } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDemoState, useHover } from "./demo-state"

const STEPS = [
  { label: "Search the docs", detail: "Queried motion.dev and ui.shadcn.com for spring guidance." },
  { label: "Read 3 pages", detail: "Springs, layout animations and reduced-motion guidance." },
  { label: "Compare presets", detail: "Snappy 400/30, gentle 180/20 and bouncy 260/12." },
  { label: "Write the summary", detail: "Recommended gentle springs for menus, snappy for toggles." },
]
const SOURCES = [
  { short: "M", name: "motion.dev", tone: "bg-primary text-primary-foreground" },
  { short: "S", name: "ui.shadcn.com", tone: "bg-foreground text-background" },
  { short: "W", name: "w3.org/WAI", tone: "bg-secondary text-secondary-foreground" },
]

type S = "pending" | "running" | "done"

function StatusIcon({ s }: { s: S }) {
  return (
    <span className="relative flex size-5 shrink-0 items-center justify-center" aria-hidden>
      <AnimatePresence mode="popLayout" initial={false}>
        {s === "pending" && <motion.span key="p" className="border-muted-foreground/60 size-4 rounded-full border-2 border-dashed" exit={{ scale: 0.5, opacity: 0 }} />}
        {s === "running" && (
          <motion.span key="r" className="text-primary flex" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
            <LoaderCircle className="size-5 animate-spin" />
          </motion.span>
        )}
        {s === "done" && (
          <motion.svg key="d" viewBox="0 0 24 24" className="text-primary size-5" fill="none" stroke="currentColor" strokeWidth={2.5} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 14 }}>
            <circle cx="12" cy="12" r="10" className="fill-primary/15" stroke="none" />
            <motion.path d="M7.5 12.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
          </motion.svg>
        )}
      </AnimatePresence>
    </span>
  )
}

/**
 * Extends shadcn's Task + Sources patterns (AI Elements): an agent's steps go
 * pending → running → done with a drawn tick, steps expand to show what happened,
 * and the cited sources stack fans out. Built on shadcn Card and Button.
 * Hover: rows highlight and the sources fan out. Disabled: the run is frozen and controls disabled.
 */
export function AgentTask() {
  const { disabled, forceHover } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const [progress, setProgress] = useState(disabled ? STEPS.length : 0) // steps completed
  const [run, setRun] = useState(0)
  const [openStep, setOpenStep] = useState<number | null>(null)
  const timer = useRef(0)

  useEffect(() => {
    if (disabled) return
    setProgress(0)
    setOpenStep(null)
    let n = 0
    timer.current = window.setInterval(() => {
      n++
      setProgress(n)
      if (n >= STEPS.length) clearInterval(timer.current)
    }, 1000)
    return () => clearInterval(timer.current)
  }, [run, disabled])

  const status = (i: number): S => (i < progress ? "done" : i === progress && !disabled ? "running" : "pending")
  const finished = progress >= STEPS.length
  const fan = !disabled && (hovered || forceHover)

  return (
    <Card className="w-[340px] gap-3 p-5" {...hoverProps}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Research: spring settings</p>
          <p className="text-muted-foreground text-xs" aria-live="polite">
            {finished ? "Done · 4 steps" : `Step ${Math.min(progress + 1, STEPS.length)} of ${STEPS.length}`}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setRun((r) => r + 1)} disabled={disabled || !finished}>
          <Play /> Run again
        </Button>
      </div>

      <div className="bg-muted h-1 overflow-hidden rounded-full">
        <motion.div className="bg-primary h-full rounded-full" animate={{ width: `${(progress / STEPS.length) * 100}%` }} transition={{ type: "spring", bounce: 0.15 }} />
      </div>

      <ol className="space-y-0.5">
        {STEPS.map((step, i) => {
          const s = status(i)
          const expanded = openStep === i && s === "done"
          return (
            <li key={step.label}>
              <button
                className={cn("hover:bg-accent flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left text-sm transition-colors disabled:cursor-default", s === "pending" && "text-muted-foreground")}
                onClick={() => setOpenStep(expanded ? null : i)}
                disabled={s !== "done"}
                aria-expanded={expanded}
                data-hover-target={i === 1 ? "" : undefined}
              >
                <StatusIcon s={s} />
                <span className="flex-1">{step.label}</span>
                {s === "done" && (
                  <motion.span className="text-muted-foreground flex" animate={{ rotate: expanded ? 90 : 0 }}>
                    <ChevronRight className="size-4" />
                  </motion.span>
                )}
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.p className="text-muted-foreground overflow-hidden pl-9 text-xs" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <span className="block pb-1.5">{step.detail}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ol>

      {/* sources */}
      <AnimatePresence>
        {finished && (
          <motion.div className="flex items-center gap-3 border-t pt-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex" aria-hidden>
              {SOURCES.map((src, i) => (
                <motion.span
                  key={src.name}
                  className={cn("ring-card flex size-7 items-center justify-center rounded-full text-xs font-semibold ring-2", src.tone)}
                  style={{ zIndex: 3 - i }}
                  animate={{ x: fan ? i * 4 : i * -8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                >
                  {src.short}
                </motion.span>
              ))}
            </div>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p key={String(fan)} className="text-muted-foreground text-xs" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                {fan ? SOURCES.map((s) => s.name).join(" · ") : "Used 3 sources"}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
