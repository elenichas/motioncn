import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Pause, Play } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useDemoState, useHover } from "./demo-state"

const LENGTH = 184 // seconds
const CHAPTERS = [
  { at: 0, title: "Intro" },
  { at: 42, title: "Springs" },
  { at: 98, title: "Layout" },
  { at: 150, title: "Wrap-up" },
]
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`
const chapterAt = (s: number) => [...CHAPTERS].reverse().find((c) => s >= c.at)!

/**
 * Video timeline: a shadcn Slider over a filmstrip with chapter markers. Hovering the
 * track shows a floating preview with the time and chapter; the playhead glides while playing.
 * Built on shadcn Slider, Button and Card. Hover: the preview appears and the active
 * chapter lifts. Disabled: slider and play disabled.
 */
export function TimelineScrubber() {
  const { disabled, forceHover } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const [t, setT] = useState(30)
  const [playing, setPlaying] = useState(false)
  const [hoverAt, setHoverAt] = useState<number | null>(null)
  const strip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!playing || disabled) return
    const id = window.setInterval(() => setT((v) => (v + 1 > LENGTH ? 0 : v + 1)), 120)
    return () => clearInterval(id)
  }, [playing, disabled])

  const preview = disabled ? null : forceHover ? 110 : hoverAt
  const chapter = chapterAt(t)

  return (
    <Card className="w-[340px] gap-4 p-4" {...hoverProps}>
      {/* "video" */}
      <div className="bg-muted relative flex aspect-video items-center justify-center overflow-hidden rounded-lg">
        <motion.div
          className="bg-primary/25 absolute size-40 rounded-full blur-2xl"
          animate={{ x: Math.sin(t / 12) * 60, y: Math.cos(t / 15) * 20, scale: 1 + (t % 40) / 120 }}
          transition={{ type: "spring", stiffness: 60, damping: 20 }}
        />
        <AnimatePresence mode="popLayout">
          <motion.p key={chapter.title} className="relative text-lg font-semibold" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }}>
            {chapter.title}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* filmstrip + preview */}
      <div
        ref={strip}
        className="relative"
        onPointerMove={(e) => {
          const r = strip.current!.getBoundingClientRect()
          setHoverAt(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * LENGTH)
        }}
        onPointerLeave={() => setHoverAt(null)}
      >
        <AnimatePresence>
          {preview !== null && (
            <motion.div
              className="bg-popover text-popover-foreground pointer-events-none absolute bottom-full z-10 mb-2 w-24 -translate-x-1/2 rounded-md border p-1 text-center shadow-md"
              style={{ left: `${(preview / LENGTH) * 100}%` }}
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4 }}
            >
              <div className="bg-muted mb-1 h-10 rounded" style={{ backgroundImage: `radial-gradient(circle at ${20 + (preview / LENGTH) * 60}% 50%, color-mix(in oklab, var(--primary) 35%, transparent), transparent 70%)` }} />
              <p className="text-xs font-medium tabular-nums">{fmt(preview)}</p>
              <p className="text-muted-foreground truncate text-xs">{chapterAt(preview).title}</p>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mb-2 flex h-6 gap-0.5" aria-hidden>
          {CHAPTERS.map((c, i) => {
            const end = CHAPTERS[i + 1]?.at ?? LENGTH
            const active = chapter === c
            return (
              <motion.div
                key={c.title}
                className={cn("rounded-sm", active ? "bg-primary/40" : "bg-muted")}
                style={{ flex: end - c.at }}
                animate={{ scaleY: active && (hovered || playing) ? 1.25 : 1 }}
              />
            )
          })}
        </div>
        <Slider value={[t]} max={LENGTH} step={1} onValueChange={([v]) => setT(v)} disabled={disabled} aria-label="Seek" />
      </div>

      <div className="flex items-center gap-2">
        <Button size="icon" variant="secondary" className="size-8 rounded-full" onClick={() => setPlaying((p) => !p)} disabled={disabled} aria-label={playing ? "Pause" : "Play"}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={String(playing)} className="flex" initial={{ scale: 0.4 }} animate={{ scale: 1 }}>
              {playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
            </motion.span>
          </AnimatePresence>
        </Button>
        <span className="text-sm tabular-nums">
          {fmt(t)} <span className="text-muted-foreground">/ {fmt(LENGTH)}</span>
        </span>
        <span className="text-muted-foreground ml-auto text-xs">{disabled ? "Disabled" : chapter.title}</span>
      </div>
    </Card>
  )
}
