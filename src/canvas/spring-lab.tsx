import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Check, Copy, Pause, Play } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PRESETS = {
  Snappy: { stiffness: 400, damping: 30, mass: 1 },
  Gentle: { stiffness: 180, damping: 20, mass: 1 },
  Bouncy: { stiffness: 260, damping: 10, mass: 1 },
  Heavy: { stiffness: 120, damping: 18, mass: 2.5 },
} as const
type P = { stiffness: number; damping: number; mass: number }

/** Integrate a 0 → 1 spring; returns samples and the time it settles. */
function simulate({ stiffness, damping, mass }: P) {
  const dt = 1 / 240
  let x = 0
  let v = 0
  const pts: number[] = []
  let settled = 2
  for (let t = 0; t < 2; t += dt) {
    const a = (-stiffness * (x - 1) - damping * v) / mass
    v += a * dt
    x += v * dt
    pts.push(x)
    if (settled === 2 && t > 0.05 && Math.abs(x - 1) < 0.002 && Math.abs(v) < 0.01) settled = t
  }
  const peak = Math.max(...pts)
  return { pts, settled, overshoot: Math.max(0, (peak - 1) * 100) }
}

/**
 * Spring Lab: tune stiffness, damping and mass, watch a live preview and the curve,
 * then copy the Motion transition. Every component on this canvas uses these same springs.
 */
export function SpringLab() {
  const [p, setP] = useState<P>(PRESETS.Gentle)
  const [side, setSide] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [copied, setCopied] = useState(false)
  const sim = useMemo(() => simulate(p), [p])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setSide((s) => !s), Math.max(900, sim.settled * 1000 + 500))
    return () => clearInterval(id)
  }, [playing, sim.settled])

  const step = Math.ceil(sim.pts.length / 120)
  const lo = Math.min(0, ...sim.pts)
  const hi = Math.max(1.05, ...sim.pts)
  const path = sim.pts
    .filter((_, i) => i % step === 0)
    .map((y, i, arr) => `${i ? "L" : "M"} ${(i / (arr.length - 1)) * 280} ${88 - ((y - lo) / (hi - lo)) * 80}`)
    .join(" ")
  const code = `transition={{ type: "spring", stiffness: ${p.stiffness}, damping: ${p.damping}, mass: ${p.mass} }}`

  const field = (key: keyof P, label: string, min: number, max: number, stepSize: number) => (
    <label className="grid grid-cols-[72px_1fr_44px] items-center gap-3 text-sm">
      <span>{label}</span>
      <Slider value={[p[key]]} min={min} max={max} step={stepSize} onValueChange={([v]) => setP((o) => ({ ...o, [key]: v }))} aria-label={label} />
      <span className="text-right tabular-nums">{p[key]}</span>
    </label>
  )

  return (
    <div className="w-full space-y-4">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Tool</p>
        <h2 className="text-xl font-semibold tracking-tight">Spring Lab</h2>
        <p className="text-muted-foreground text-sm">Tune a spring, watch it move, copy the code.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => {
          const on = PRESETS[k].stiffness === p.stiffness && PRESETS[k].damping === p.damping && PRESETS[k].mass === p.mass
          return (
            <Button key={k} size="sm" variant={on ? "default" : "outline"} className="h-7 rounded-full px-3 text-xs" onClick={() => setP(PRESETS[k])} aria-pressed={on}>
              {k}
            </Button>
          )
        })}
      </div>

      {/* preview */}
      <div className="bg-muted relative h-14 rounded-lg border">
        <motion.span
          className="bg-primary absolute top-2 left-2 size-10 rounded-full shadow-md"
          animate={{ x: side ? 228 : 0 }}
          transition={{ type: "spring", ...p }}
        />
      </div>

      {/* curve */}
      <svg viewBox="0 0 280 92" className="text-primary h-24 w-full overflow-visible" role="img" aria-label={`Spring curve: settles in ${sim.settled.toFixed(2)} seconds with ${sim.overshoot.toFixed(0)}% overshoot`}>
        <line x1="0" x2="280" y1={88 - ((1 - lo) / (hi - lo)) * 80} y2={88 - ((1 - lo) / (hi - lo)) * 80} stroke="var(--border)" strokeDasharray="4 4" />
        <motion.path d={path} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" initial={false} animate={{ d: path }} transition={{ duration: 0.25 }} />
      </svg>
      <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
        <span>Settles in {sim.settled >= 2 ? "2s+" : `${sim.settled.toFixed(2)}s`}</span>
        <span>Overshoot {sim.overshoot.toFixed(0)}%</span>
      </div>

      <div className="space-y-3">
        {field("stiffness", "Stiffness", 20, 800, 10)}
        {field("damping", "Damping", 2, 80, 1)}
        {field("mass", "Mass", 0.2, 4, 0.1)}
      </div>

      <div className="bg-muted flex items-center gap-2 rounded-lg border py-1 pr-1 pl-3">
        <code className="min-w-0 flex-1 overflow-x-auto py-1.5 font-mono text-xs whitespace-nowrap">{code}</code>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          aria-label={copied ? "Copied" : "Copy transition"}
          onClick={() => {
            try {
              navigator.clipboard?.writeText(code).catch(() => {})
            } catch {
              /* sandbox */
            }
            setCopied(true)
            setTimeout(() => setCopied(false), 1300)
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={String(copied)} className="flex" initial={{ scale: 0.4 }} animate={{ scale: 1 }}>
              {copied ? <Check className="text-emerald-600 dark:text-emerald-400" /> : <Copy />}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
      <Button variant="outline" size="sm" onClick={() => setPlaying((v) => !v)} className={cn("w-full")}>
        {playing ? <Pause /> : <Play />} {playing ? "Pause preview" : "Play preview"}
      </Button>
    </div>
  )
}
