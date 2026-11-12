import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Pause, Play, RotateCcw } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { SlotNumber } from "./slot-number"
import { useDemoState, useHover } from "./demo-state"

const MODES = { focus: { label: "Focus", mins: 25 }, break: { label: "Break", mins: 5 } } as const
type ModeKey = keyof typeof MODES
const SPEED = 60 // demo: one real second = one timer minute
const R = 54
const CIRC = 2 * Math.PI * R

/**
 * Pomodoro timer on a shadcn Card with Tabs and Buttons: a ring drains as time passes,
 * digits roll, Play morphs into Pause, and a tomato squishes and sparkles when time's up.
 * Runs 60× faster in the demo. Hover: the ring glows and the tomato wobbles.
 * Disabled: controls disabled, ring greyed.
 */
export function PomodoroTimer() {
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const [mode, setMode] = useState<ModeKey>("focus")
  const total = MODES[mode].mins * 60
  const [left, setLeft] = useState(total)
  const [running, setRunning] = useState(false)
  const done = left === 0

  useEffect(() => {
    if (!running || disabled) return
    const id = window.setInterval(() => setLeft((l) => Math.max(0, l - SPEED / 10)), 100)
    return () => clearInterval(id)
  }, [running, disabled])
  useEffect(() => {
    if (done) setRunning(false)
  }, [done])

  const switchMode = (m: string) => {
    setMode(m as ModeKey)
    setLeft(MODES[m as ModeKey].mins * 60)
    setRunning(false)
  }
  const mm = String(Math.floor(left / 60)).padStart(2, "0")
  const ss = String(Math.floor(left % 60)).padStart(2, "0")

  return (
    <Card className="w-72 items-center gap-4 p-5" {...hoverProps}>
      <Tabs value={mode} onValueChange={switchMode} className="w-full">
        <TabsList className="w-full" aria-label="Timer mode">
          {(Object.keys(MODES) as ModeKey[]).map((k) => (
            <TabsTrigger key={k} value={k} disabled={disabled}>
              {MODES[k].label} · {MODES[k].mins}m
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative size-40">
        <svg viewBox="0 0 120 120" className={cn("size-full -rotate-90", disabled ? "text-muted-foreground" : "text-primary")} aria-hidden>
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--muted)" strokeWidth="8" />
          <motion.circle
            cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={CIRC}
            animate={{ strokeDashoffset: CIRC * (1 - left / total), filter: hovered ? "drop-shadow(0 0 6px var(--primary))" : "drop-shadow(0 0 0 transparent)" }}
            transition={{ strokeDashoffset: { type: "tween", ease: "linear", duration: 0.1 }, filter: { duration: 0.3 } }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" role="timer" aria-label={`${mm} minutes ${ss} seconds left`}>
          <AnimatePresence mode="popLayout" initial={false}>
            {done ? (
              <motion.div key="done" className="flex flex-col items-center" initial={{ scale: 0.3 }} animate={{ scale: [0.3, 1.25, 0.9, 1] }} transition={{ duration: 0.6 }}>
                <Tomato wobble />
                <p className="text-sm font-semibold">Time’s up!</p>
              </motion.div>
            ) : (
              <motion.div key="time" className="flex flex-col items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <motion.span animate={hovered ? { rotate: [0, -8, 8, -4, 0] } : { rotate: 0 }} transition={{ duration: 0.8, repeat: hovered ? Infinity : 0, repeatDelay: 0.5 }}>
                  <Tomato />
                </motion.span>
                <span className="text-3xl font-semibold tabular-nums">
                  <SlotNumber value={`${mm}:${ss}`} />
                </span>
                <span className="text-muted-foreground text-xs">{running ? MODES[mode].label : "Paused"}</span>
              </motion.div>
            )}
          </AnimatePresence>
          {done &&
            Array.from({ length: 8 }, (_, i) => (
              <motion.span
                key={i}
                className="bg-primary absolute size-1.5 rounded-full"
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ x: Math.cos((i / 8) * Math.PI * 2) * 58, y: Math.sin((i / 8) * Math.PI * 2) * 58, opacity: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                aria-hidden
              />
            ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => (setLeft(total), setRunning(false))} disabled={disabled} aria-label="Reset timer">
          <RotateCcw />
        </Button>
        <Button asChild size="icon" className="size-12 rounded-full">
          <motion.button whileTap={{ scale: 0.9 }} disabled={disabled} onClick={() => (done ? (setLeft(total), setRunning(true)) : setRunning((r) => !r))} aria-label={running ? "Pause" : "Start"} data-hover-target>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={String(running)} className="flex" initial={{ scale: 0.3, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.3, rotate: 90 }}>
                {running ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </Button>
        <span className="w-9" />
      </div>
      <p className="text-muted-foreground -mt-2 text-xs">{disabled ? "Disabled" : "Demo runs 60× faster"}</p>
    </Card>
  )
}

function Tomato({ wobble }: { wobble?: boolean }) {
  return (
    <motion.svg viewBox="0 0 24 24" className="mb-1 size-7" animate={wobble ? { scaleX: [1, 1.2, 0.9, 1], scaleY: [1, 0.8, 1.1, 1] } : {}} transition={{ duration: 0.6 }} aria-hidden>
      <circle cx="12" cy="14" r="8" className="fill-primary" />
      <path d="M12 6c-1-2-3-2.5-4-2 1.5.5 2.5 1.5 3 3M12 6c1-2 3-2.5 4-2-1.5.5-2.5 1.5-3 3" className="stroke-foreground" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </motion.svg>
  )
}
