import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Download, RefreshCw, Sparkles, Wand2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useDemoState, useHover } from "./demo-state"

/** Deterministic abstract "artwork" from a seed, drawn only with theme tokens. */
function Art({ seed, className }: { seed: number; className?: string }) {
  const blobs = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => {
        const r = (n: number) => ((Math.sin(seed * 9.1 + i * 7.3 + n) + 1) / 2)
        return { x: r(1) * 100, y: r(2) * 100, s: 30 + r(3) * 50, o: 0.25 + r(4) * 0.6, fg: i % 2 === 1 }
      }),
    [seed],
  )
  return (
    <svg viewBox="0 0 100 100" className={cn("bg-muted", className)} preserveAspectRatio="xMidYMid slice" role="img" aria-label="Generated illustration (illustrative)">
      {blobs.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={b.s / 2} fill={b.fg ? "var(--foreground)" : "var(--primary)"} fillOpacity={b.fg ? b.o * 0.35 : b.o} />
      ))}
      <path d={`M0 ${70 + (seed % 7) * 2} Q 50 ${50 + (seed % 5) * 6} 100 ${72 - (seed % 3) * 4} V100 H0Z`} fill="var(--primary)" fillOpacity={0.35} />
    </svg>
  )
}

/**
 * Image generation card for the AI category: a blurred noise field slowly resolves into the
 * result with a progress ring, then variations pop in below. The art is illustrative:
 * drawn from the prompt with theme tokens, no model involved.
 * Built on shadcn Card, Input and Button. Hover: the image tilts and its actions slide up.
 * Disabled: prompt and buttons disabled.
 */
export function ImageGeneration() {
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const [prompt, setPrompt] = useState("a calm spring landscape")
  const [progress, setProgress] = useState(1)
  const [seed, setSeed] = useState(7)
  const [variant, setVariant] = useState(0)
  const timer = useRef(0)
  const generating = progress < 1

  const generate = () => {
    const s = [...prompt].reduce((a, c) => a + c.charCodeAt(0), 0) + Math.floor(Math.random() * 50)
    setSeed(s)
    setVariant(0)
    setProgress(0)
  }
  useEffect(() => {
    if (!generating) return
    timer.current = window.setInterval(() => setProgress((p) => Math.min(1, p + 0.04)), 80)
    return () => clearInterval(timer.current)
  }, [generating])

  return (
    <Card className="w-[320px] gap-3 p-4" {...hoverProps}>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!generating) generate()
        }}
      >
        <label htmlFor="img-prompt" className="sr-only">
          Prompt
        </label>
        <Input id="img-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={disabled} className="h-9" />
        <Button type="submit" disabled={disabled || generating || !prompt.trim()} aria-label="Generate image" data-hover-target>
          <motion.span className="flex" animate={generating ? { rotate: [0, 20, -20, 0] } : {}} transition={{ duration: 0.6, repeat: generating ? Infinity : 0 }}>
            <Wand2 />
          </motion.span>
          Generate
        </Button>
      </form>

      <motion.div className="relative aspect-square overflow-hidden rounded-lg" style={{ perspective: 800 }} animate={{ rotateX: hovered && !generating ? 4 : 0, rotateY: hovered && !generating ? -6 : 0 }}>
        <motion.div className="size-full" animate={{ filter: `blur(${(1 - progress) * 24}px) saturate(${0.4 + progress * 0.6})`, scale: 1 + (1 - progress) * 0.15 }} transition={{ type: "tween", duration: 0.1 }}>
          <Art seed={seed + variant * 13} className="size-full" />
        </motion.div>
        <AnimatePresence>
          {generating && (
            <motion.div className="bg-background/30 absolute inset-0 flex flex-col items-center justify-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <svg viewBox="0 0 40 40" className="text-primary size-12 -rotate-90" aria-hidden>
                <circle cx="20" cy="20" r="17" fill="none" stroke="var(--muted)" strokeWidth="3" />
                <motion.circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ pathLength: progress }} />
              </svg>
              <span className="bg-background/90 rounded px-2 py-0.5 text-xs font-medium tabular-nums" role="status">
                Generating… {Math.round(progress * 100)}%
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {hovered && !generating && (
            <motion.div className="absolute inset-x-2 bottom-2 flex justify-end gap-1.5" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}>
              <Button size="sm" variant="secondary" className="h-7" onClick={generate} disabled={disabled}>
                <RefreshCw /> Vary
              </Button>
              <Button size="sm" variant="secondary" className="h-7" disabled={disabled} aria-label="Download image">
                <Download />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex items-center gap-2">
        {[0, 1, 2].map((v) => (
          <motion.button
            key={`${seed}-${v}`}
            className={cn("focus-visible:ring-ring/50 overflow-hidden rounded-md border-2 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed", variant === v ? "border-primary" : "border-transparent")}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: generating ? 0.3 : 1, scale: 1 }}
            transition={{ delay: generating ? 0 : 0.1 + v * 0.08, type: "spring", bounce: 0.4 }}
            onClick={() => setVariant(v)}
            disabled={disabled || generating}
            aria-label={`Variation ${v + 1}`}
            aria-pressed={variant === v}
          >
            <Art seed={seed + v * 13} className="size-12" />
          </motion.button>
        ))}
        <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
          <Sparkles className="size-3" /> Illustrative
        </span>
      </div>
    </Card>
  )
}
