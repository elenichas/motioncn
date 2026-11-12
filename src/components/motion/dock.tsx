import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useAnimationControls, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react"
import { Calendar, Camera, House, Mail, Music, Settings, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDemoState } from "./demo-state"

const apps: { icon: LucideIcon; label: string }[] = [
  { icon: House, label: "Home" },
  { icon: Mail, label: "Mail" },
  { icon: Calendar, label: "Calendar" },
  { icon: Music, label: "Music" },
  { icon: Camera, label: "Camera" },
  { icon: Settings, label: "Settings" },
]
const FORCED_INDEX = 2

function DockIcon({ mouseX, icon: Icon, label, index }: { mouseX: MotionValue<number>; icon: LucideIcon; label: string; index: number }) {
  const ref = useRef<HTMLButtonElement>(null)
  const { disabled, forceHover } = useDemoState()
  const [over, setOver] = useState(false)
  const [open, setOpen] = useState(false)
  const bounce = useAnimationControls()

  const distance = useTransform(mouseX, (x) => {
    if (forceHover) return Math.abs(index - FORCED_INDEX) * 52
    const el = ref.current
    if (!el || disabled) return 999
    const b = el.getBoundingClientRect()
    // divide by the canvas zoom so magnification feels the same at any zoom level
    const zoom = b.width / (el.offsetWidth || 1)
    return (x - b.left - b.width / 2) / zoom
  })
  const size = useSpring(useTransform(distance, [-120, 0, 120], [40, 68, 40], { clamp: true }), { stiffness: 260, damping: 18, mass: 0.2 })
  const iconSize = useTransform(size, (s) => s * 0.45)
  useEffect(() => mouseX.set(mouseX.get() + 0.0001), [forceHover, mouseX]) // re-evaluate distance on state change
  const showLabel = !disabled && (over || (forceHover && index === FORCED_INDEX))

  return (
    <Button asChild variant="secondary" size="icon" className="relative shrink-0 rounded-2xl border p-0 disabled:opacity-40">
      <motion.button
        ref={ref}
        aria-label={label}
        disabled={disabled}
        style={{ width: size, height: size }}
        animate={bounce}
        onPointerEnter={() => setOver(true)}
        onPointerLeave={() => setOver(false)}
        onClick={() => {
          setOpen(true)
          bounce.start({ y: [0, -22, 0, -10, 0], transition: { duration: 0.7 } })
        }}
      >
        <motion.span style={{ width: iconSize, height: iconSize }} className="flex">
          <Icon className="size-full" />
        </motion.span>
        <AnimatePresence>
          {showLabel && (
            <motion.span
              initial={{ opacity: 0, y: 6, x: "-50%", scale: 0.9 }}
              animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
              exit={{ opacity: 0, y: 4, x: "-50%" }}
              className="bg-popover text-popover-foreground pointer-events-none absolute -top-9 left-1/2 rounded-md border px-2 py-1 text-xs whitespace-nowrap shadow-md"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
        {open && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-primary absolute -bottom-2 size-1 rounded-full" />}
      </motion.button>
    </Button>
  )
}

/**
 * macOS-style dock of shadcn Buttons.
 * Hover: icons magnify by cursor distance and show a label. Disabled: no magnify, dimmed.
 */
export function Dock() {
  const mouseX = useMotionValue(Infinity)
  const { disabled } = useDemoState()
  return (
    <div className="flex flex-col items-center gap-6 pt-10">
      <motion.div
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="bg-card/80 flex h-[72px] items-end gap-2.5 rounded-3xl border px-3 pb-3 shadow-lg backdrop-blur"
      >
        {apps.map((a, i) => (
          <DockIcon key={a.label} mouseX={mouseX} index={i} {...a} />
        ))}
      </motion.div>
      <p className="text-muted-foreground text-xs">{disabled ? "Disabled" : "Hover to magnify · click to launch"}</p>
    </div>
  )
}
