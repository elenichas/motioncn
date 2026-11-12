import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useDemoState, useHover } from "./demo-state"

const tracks = [
  { title: "Spring Physics", artist: "The Easing Curves", length: 194 },
  { title: "Layout Shift", artist: "Bezier & Friends", length: 221 },
  { title: "Reduced Motion", artist: "Quiet Frames", length: 168 },
]
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

/**
 * Mini player from shadcn Card, Slider and Buttons: vinyl spins, equalizer dances, tracks slide.
 * Hover: artwork grows and the record peeks out. Disabled: controls and seek bar disabled.
 */
export function MusicPlayer() {
  const [playing, setPlaying] = useState(false)
  const [idx, setIdx] = useState(0)
  const [dir, setDir] = useState(1)
  const [pos, setPos] = useState(42)
  const t = tracks[idx]
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setPos((p) => (p + 1 > t.length ? 0 : p + 1)), 1000)
    return () => clearInterval(id)
  }, [playing, t.length])

  const go = (d: number) => {
    setDir(d)
    setIdx((i) => (i + d + tracks.length) % tracks.length)
    setPos(0)
  }

  return (
    <Card className="w-80 gap-4 p-5" {...hoverProps}>
      <div className="flex items-center gap-4">
        <div className="relative size-20 shrink-0">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: "repeating-radial-gradient(circle, #111 0 2px, #222 2px 4px)" }}
            animate={{ x: playing ? 18 : hovered ? 10 : 0, rotate: playing ? 360 : 0 }}
            transition={{ x: { type: "spring", bounce: 0.3 }, rotate: playing ? { duration: 3, repeat: Infinity, ease: "linear" } : { duration: 0.6 } }}
          >
            <span className="bg-primary absolute inset-[34%] rounded-full" />
          </motion.div>
          <motion.div animate={{ scale: hovered ? 1.06 : 1, rotate: hovered ? -3 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} className="from-primary to-primary/40 relative flex size-20 items-end justify-center gap-1 overflow-hidden rounded-xl bg-gradient-to-br p-3 shadow-lg">
            {Array.from({ length: 5 }, (_, i) => (
              <motion.span
                key={i}
                className="bg-primary-foreground/90 w-1.5 origin-bottom rounded-full"
                style={{ height: 32 }}
                animate={playing ? { scaleY: [0.3, 1, 0.5, 0.85, 0.3] } : { scaleY: 0.15 }}
                transition={playing ? { duration: 0.9 + i * 0.13, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
              />
            ))}
          </motion.div>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden pl-4">
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={idx}
              custom={dir}
              variants={{ in: (d: number) => ({ x: d * 40, opacity: 0 }), c: { x: 0, opacity: 1 }, out: (d: number) => ({ x: d * -40, opacity: 0 }) }}
              initial="in"
              animate="c"
              exit="out"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            >
              <p className="truncate font-semibold">{t.title}</p>
              <p className="text-muted-foreground truncate text-sm">{t.artist}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="space-y-1.5">
        <Slider value={[pos]} max={t.length} onValueChange={([v]) => setPos(v)} aria-label="Seek" disabled={disabled} />
        <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
          <span>{fmt(pos)}</span>
          <span>-{fmt(t.length - pos)}</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => go(-1)} aria-label="Previous">
          <SkipBack />
        </Button>
        <Button asChild size="icon" className="size-12 rounded-full">
          <motion.button data-hover-target whileTap={{ scale: 0.9 }} animate={{ scale: hovered ? 1.08 : 1 }} onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={String(playing)}
                initial={{ scale: 0, rotate: -90, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0, rotate: 90, opacity: 0 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.35 }}
                className="flex"
              >
                {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </Button>
        <Button variant="ghost" size="icon" onClick={() => go(1)} aria-label="Next">
          <SkipForward />
        </Button>
      </div>
    </Card>
  )
}
