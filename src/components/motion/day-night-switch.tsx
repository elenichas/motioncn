import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { useDemoState, useHover } from "./demo-state"

const spring = { type: "spring", stiffness: 380, damping: 26 } as const
const stars = [
  { x: 14, y: 10, s: 3 },
  { x: 26, y: 26, s: 2 },
  { x: 40, y: 12, s: 2.5 },
  { x: 20, y: 36, s: 1.5 },
  { x: 46, y: 30, s: 2 },
]

/**
 * shadcn Switch (same Radix primitive, extended markup) as a day ↔ night toggle.
 * Hover: the thumb peeks towards the other side and the sun glows. Disabled: dimmed, frozen.
 */
export function DayNightSwitch() {
  const [night, setNight] = useState(false)
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  return (
    <div className="flex flex-col items-center gap-5">
      <SwitchPrimitive.Root
        checked={night}
        onCheckedChange={setNight}
        disabled={disabled}
        {...hoverProps}
        aria-label="Night mode"
        className="focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale relative h-14 w-28 cursor-pointer overflow-hidden rounded-full shadow-inner outline-none focus-visible:ring-[3px]"
      >
        <motion.span
          className="absolute inset-0"
          initial={false}
          animate={{ backgroundColor: night ? "#1e1b4b" : "#7dd3fc" }}
          transition={{ duration: 0.5 }}
        />
        {stars.map((s, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-white"
            style={{ left: s.x, top: s.y, width: s.s, height: s.s }}
            initial={false}
            animate={night ? { opacity: [0, 1, 0.6, 1], scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ delay: night ? 0.15 + i * 0.06 : 0, duration: 0.6 }}
          />
        ))}
        {[
          { r: 64, t: 30, w: 30 },
          { r: 50, t: 36, w: 22 },
        ].map((c, i) => (
          <motion.span
            key={i}
            className="absolute h-3 rounded-full bg-white/90"
            style={{ left: c.r, top: c.t, width: c.w }}
            initial={false}
            animate={night ? { x: 40, opacity: 0 } : { x: 0, opacity: 1 }}
            transition={{ ...spring, delay: night ? 0 : 0.15 + i * 0.05 }}
          />
        ))}
        <SwitchPrimitive.Thumb asChild>
          <motion.span
            className="absolute top-1.5 left-1.5 block size-11 rounded-full shadow-md"
            initial={false}
            animate={{
              x: night ? (hovered ? 50 : 56) : hovered ? 6 : 0,
              rotate: night ? 270 : 0,
              backgroundColor: night ? "#e2e8f0" : "#facc15",
              boxShadow: hovered ? (night ? "0 0 14px 3px rgb(226 232 240 / .6)" : "0 0 16px 4px rgb(250 204 21 / .7)") : "0 2px 6px rgb(0 0 0 / .2)",
            }}
            transition={spring}
          >
            {[
              { l: 10, t: 12, s: 9 },
              { l: 24, t: 24, s: 6 },
              { l: 14, t: 28, s: 4 },
            ].map((c, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full bg-slate-400/60"
                style={{ left: c.l, top: c.t, width: c.s, height: c.s }}
                initial={false}
                animate={{ scale: night ? 1 : 0 }}
                transition={{ ...spring, delay: night ? 0.1 + i * 0.05 : 0 }}
              />
            ))}
          </motion.span>
        </SwitchPrimitive.Thumb>
      </SwitchPrimitive.Root>
      <div className="relative h-6 w-40 overflow-hidden text-center text-sm font-medium">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={String(night) + disabled}
            className="absolute inset-0"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
          >
            {disabled ? "Disabled" : night ? "Good night" : "Good morning"}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}
