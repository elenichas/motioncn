import { useState } from "react"
import { motion } from "motion/react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { useDemoState, useHover } from "./demo-state"

/**
 * Retro wall light switch (shadcn Switch's Radix primitive, flat token styling): the lever
 * flips with a springy click, the bulb above warms up and casts a soft glow.
 * Hover: the lever wiggles as if about to flip. Disabled: dimmed and it won't flip.
 */
export function LightSwitch() {
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const [on, setOn] = useState(false)

  return (
    <div className="flex flex-col items-center gap-5" {...hoverProps}>
      {/* bulb */}
      <div className="relative flex h-24 w-24 items-end justify-center" aria-hidden>
        <motion.div className="bg-primary absolute top-2 size-20 rounded-full blur-2xl" initial={false} animate={{ opacity: on ? 0.45 : 0, scale: on ? 1.2 : 0.6 }} transition={{ duration: 0.4 }} />
        <span className="bg-border absolute top-0 h-6 w-px" />
        <motion.span
          className="relative mb-4 size-12 rounded-full border-2"
          initial={false}
          animate={{ backgroundColor: on ? "var(--primary)" : "var(--muted)", borderColor: on ? "var(--primary)" : "var(--border)", y: on ? [0, 3, 0] : 0 }}
          transition={{ duration: 0.35 }}
        />
        <span className="bg-muted-foreground absolute bottom-2 h-3 w-5 rounded-sm" />
      </div>

      {/* switch plate */}
      <div className={cn("bg-card flex h-36 w-24 items-center justify-center rounded-2xl border shadow-sm", disabled && "opacity-50")}>
        <SwitchPrimitive.Root
          checked={on}
          onCheckedChange={setOn}
          disabled={disabled}
          aria-label="Light"
          className="bg-muted focus-visible:ring-ring/50 relative h-20 w-10 rounded-lg border shadow-inner outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed"
          style={{ perspective: 300 }}
          data-hover-target
        >
          <SwitchPrimitive.Thumb asChild>
            <motion.span
              className="bg-background absolute inset-x-1 h-9 rounded-md border shadow-md"
              style={{ transformOrigin: "50% 50%" }}
              initial={false}
              animate={{
                top: on ? 4 : 36,
                rotateX: on ? [-30, 10, 0] : [30, -10, 0],
                rotate: hovered && !disabled ? [0, -3, 3, 0] : 0,
              }}
              transition={{ top: { type: "spring", stiffness: 500, damping: 22 }, rotateX: { duration: 0.35 }, rotate: { duration: 0.6, repeat: hovered ? Infinity : 0, repeatDelay: 0.6 } }}
            >
              <span className={cn("absolute inset-x-2 h-1 rounded-full transition-colors", on ? "bg-primary top-1.5" : "bg-border bottom-1.5")} />
            </motion.span>
          </SwitchPrimitive.Thumb>
        </SwitchPrimitive.Root>
      </div>
      <p className="text-sm font-medium" aria-live="polite">
        {disabled ? "Switch disabled" : on ? "Lights on" : "Lights off"}
      </p>
    </div>
  )
}
