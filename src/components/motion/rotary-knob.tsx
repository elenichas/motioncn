import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useSpring, useTransform } from "motion/react"
import { Volume1, Volume2, VolumeX } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDemoState, useHover } from "./demo-state"

const TICKS = 27
const SWEEP = 270 // degrees, from -135 to +135

/**
 * Hi-fi volume knob synced to a shadcn <Slider> (the accessible control) and a mute Button.
 * Drag the knob up/down, scroll on it, or use the slider. Ticks light up around the dial.
 * Hover: the knob lifts, glows and the lit ticks shimmer. Disabled: no drag, dial greys out.
 */
export function RotaryKnob() {
  const [value, setValue] = useState(45)
  const [muted, setMuted] = useState(false)
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const drag = useRef<{ y: number; v: number } | null>(null)
  const knob = useRef<HTMLDivElement>(null)

  const shown = muted ? 0 : value
  const angle = useSpring(-135 + (shown / 100) * SWEEP, { stiffness: 220, damping: 20 })
  useEffect(() => angle.set(-135 + (shown / 100) * SWEEP), [shown, angle])
  const glow = useTransform(angle, [-135, 135], [0.15, 0.6])

  const set = (v: number) => {
    setMuted(false)
    setValue(Math.max(0, Math.min(100, Math.round(v))))
  }

  useEffect(() => {
    const el = knob.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (disabled || e.ctrlKey || e.metaKey) return
      e.preventDefault()
      e.stopPropagation()
      setMuted(false)
      setValue((v) => Math.max(0, Math.min(100, Math.round(v - e.deltaY * 0.15))))
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [disabled])

  const Icon = shown === 0 ? VolumeX : shown < 50 ? Volume1 : Volume2

  return (
    <div className="flex w-64 flex-col items-center gap-5" {...hoverProps}>
      <div className="relative size-44">
        {/* tick ring */}
        {Array.from({ length: TICKS }, (_, i) => {
          const a = -135 + (i / (TICKS - 1)) * SWEEP
          const lit = (i / (TICKS - 1)) * 100 <= shown && shown > 0
          return (
            <span key={i} className="absolute inset-0 flex justify-center" style={{ transform: `rotate(${a}deg)` }}>
              <motion.span
                className={cn("mt-0.5 h-3 w-1 rounded-full", disabled ? "bg-muted-foreground/30" : lit ? "bg-primary" : "bg-muted")}
                initial={false}
                animate={hovered && lit ? { opacity: [1, 0.45, 1], scaleY: [1, 1.3, 1] } : { opacity: 1, scaleY: lit ? 1.15 : 1 }}
                transition={hovered && lit ? { duration: 1.1, delay: i * 0.04, repeat: Infinity } : { type: "spring", stiffness: 400, damping: 20 }}
              />
            </span>
          )
        })}

        {/* the knob */}
        <motion.div
          ref={knob}
          role="presentation"
          className={cn(
            "absolute inset-6 touch-none rounded-full select-none",
            disabled ? "cursor-not-allowed grayscale" : "cursor-ns-resize",
          )}
          style={{
            background: "radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--background) 92%, white), var(--muted) 70%)",
            boxShadow: "inset 0 2px 2px rgb(255 255 255 / .6), inset 0 -3px 6px rgb(0 0 0 / .15), 0 10px 22px -8px rgb(0 0 0 / .45)",
          }}
          animate={{ scale: hovered ? 1.05 : 1, y: hovered ? -2 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          onPointerDown={(e) => {
            if (disabled) return
            e.stopPropagation()
            drag.current = { y: e.clientY, v: shown }
            try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* synthetic pointer */ }
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d) return
            const el = e.currentTarget as HTMLElement
            const zoom = el.getBoundingClientRect().width / (el.offsetWidth || 1)
            set(d.v + (d.y - e.clientY) / zoom / 1.5)
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          {/* glow follows the level */}
          <motion.span className="bg-primary absolute -inset-2 -z-10 rounded-full blur-xl" style={{ opacity: disabled ? 0 : glow }} />
          {/* grip ridges */}
          <span className="absolute inset-3 rounded-full" style={{ background: "repeating-conic-gradient(rgb(0 0 0 / .05) 0 4deg, transparent 4deg 10deg)" }} />
          <motion.span className="absolute inset-0" style={{ rotate: angle }}>
            <span className={cn("absolute top-3 left-1/2 h-6 w-1.5 -translate-x-1/2 rounded-full", disabled ? "bg-muted-foreground/40" : "bg-primary")} />
          </motion.span>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums">{shown}</span>
            <span className="text-muted-foreground text-xs tracking-wider uppercase">Volume</span>
          </span>
        </motion.div>
      </div>

      <div className="flex w-full items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8" onClick={() => setMuted((m) => !m)} aria-pressed={muted} aria-label={muted ? "Unmute" : "Mute"} disabled={disabled}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={Icon.displayName ?? String(shown === 0) + String(shown < 50)} className="flex" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
              <Icon />
            </motion.span>
          </AnimatePresence>
        </Button>
        <Slider value={[shown]} onValueChange={([v]) => set(v)} max={100} step={1} disabled={disabled} aria-label="Volume" />
      </div>
      <p className="text-muted-foreground text-xs">{disabled ? "Disabled" : "Drag or scroll the knob"}</p>
    </div>
  )
}
