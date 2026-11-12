import { useEffect, useId, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react"
import { Brain, Check, ChevronDown, Copy, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Shimmer } from "./text-shimmer"
import { useDemoState, useHover } from "./demo-state"

const THOUGHTS = [
  "The user wants interactions that feel natural.",
  "Springs model mass and friction, so motion overshoots and settles.",
  "Recommend springs for direct manipulation, tweens for loops.",
]
const ANSWER =
  "Use springs for anything the user touches: drags, toggles, menus. They follow the hand, overshoot a little and settle naturally. Keep tweens for loops like loaders."

/**
 * Extends shadcn's Reasoning pattern (AI Elements): the thinking panel opens while the
 * model thinks with a shimmering title and streaming thoughts, auto-collapses to
 * "Thought for 2s", then the answer streams and message actions pop in.
 * Built on shadcn Card and Button. Hover: shimmer speeds up, chevron nudges.
 * Disabled: static answer, actions disabled.
 */
export function Reasoning() {
  const id = useId()
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const reduced = useReducedMotionConfig()
  const [phase, setPhase] = useState<"thinking" | "answer">(disabled ? "answer" : "thinking")
  const [open, setOpen] = useState(!disabled)
  const [shown, setShown] = useState(disabled ? THOUGHTS.length : 0)
  const [run, setRun] = useState(0)
  const [copied, setCopied] = useState(false)
  const [vote, setVote] = useState<"up" | "down" | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => {
    if (disabled) return
    const t = timers.current
    setPhase("thinking")
    setOpen(true)
    setShown(0)
    setVote(null)
    THOUGHTS.forEach((_, i) => t.push(window.setTimeout(() => setShown(i + 1), 500 + i * 650)))
    t.push(window.setTimeout(() => (setPhase("answer"), setOpen(false)), 2600))
    return () => {
      t.forEach(clearTimeout)
      timers.current = []
    }
  }, [run, disabled])

  const copy = () => {
    try {
      navigator.clipboard?.writeText(ANSWER).catch(() => {})
    } catch {
      /* sandboxed */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1300)
  }

  return (
    <Card className="w-[340px] gap-3 p-5" {...hoverProps}>
      {/* reasoning trigger */}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground -ml-2 w-fit gap-2 px-2"
        aria-expanded={open}
        aria-controls={`${id}-thoughts`}
        onClick={() => setOpen((o) => !o)}
        data-hover-target
      >
        <Brain className={cn(phase === "thinking" && "text-primary")} />
        {phase === "thinking" ? <Shimmer active={!reduced} fast={hovered}>Thinking…</Shimmer> : <span>Thought for 2 seconds</span>}
        <motion.span className="flex" animate={{ rotate: open ? 180 : 0, y: hovered && !open ? 2 : 0 }}>
          <ChevronDown />
        </motion.span>
      </Button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-thoughts`}
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
          >
            <ul className="text-muted-foreground border-l-2 pl-3 text-sm">
              {THOUGHTS.slice(0, shown).map((t) => (
                <motion.li key={t} className="py-0.5" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
                  {t}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="min-h-[80px] text-sm leading-relaxed" aria-live="polite">
        {phase === "answer" &&
          ANSWER.split(" ").map((w, i) => (
            <motion.span
              key={`${run}-${i}`}
              className="inline-block"
              initial={disabled ? false : { opacity: 0, y: 4, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
            >
              {w}&nbsp;
            </motion.span>
          ))}
      </p>

      {/* message actions */}
      <AnimatePresence>
        {phase === "answer" && (
          <motion.div className="-ml-2 flex items-center gap-0.5" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: disabled ? 0 : 0.9 } }}>
            <Button variant="ghost" size="icon" className="text-muted-foreground size-8" onClick={copy} disabled={disabled} aria-label={copied ? "Copied" : "Copy answer"}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={String(copied)} className="flex" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
                  {copied ? <Check className="text-primary" /> : <Copy />}
                </motion.span>
              </AnimatePresence>
            </Button>
            {(["up", "down"] as const).map((v) => {
              const Icon = v === "up" ? ThumbsUp : ThumbsDown
              return (
                <Button key={v} variant="ghost" size="icon" className={cn("size-8", vote === v ? "text-primary" : "text-muted-foreground")} onClick={() => setVote(vote === v ? null : v)} disabled={disabled} aria-pressed={vote === v} aria-label={v === "up" ? "Good response" : "Bad response"}>
                  <motion.span key={`${v}${vote === v}`} className="flex" initial={vote === v ? { scale: 0.5, rotate: v === "up" ? -20 : 20 } : false} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 12 }}>
                    <Icon className={cn(vote === v && "fill-primary/20")} />
                  </motion.span>
                </Button>
              )
            })}
            <Button variant="ghost" size="sm" className="text-muted-foreground ml-auto" onClick={() => setRun((r) => r + 1)} disabled={disabled}>
              <RefreshCw /> Regenerate
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
