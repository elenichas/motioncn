import { useRef, useState } from "react"
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotionConfig, useTransform } from "motion/react"
import { ChevronsRight, Check, Lock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Shimmer } from "./text-shimmer"
import { useDemoState, useHover } from "./demo-state"

const TRACK = 272
const THUMB = 48
const MAX = TRACK - THUMB - 8

/**
 * "Slide to pay" control: drag the thumb to the end (or press Enter on it) to confirm.
 * Let go early and it springs back; reach the end and it morphs into a success state.
 * Built on shadcn Card and Button. Hover: the thumb nudges forward and the arrows pulse.
 * Disabled: locked and dimmed.
 */
export function SlideToConfirm() {
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const reduced = useReducedMotionConfig()
  const [done, setDone] = useState(false)
  const x = useMotionValue(0)
  const fill = useTransform(x, [0, MAX], [THUMB + 8, TRACK])
  const labelOpacity = useTransform(x, [0, MAX * 0.6], [1, 0])
  const constraints = useRef<HTMLDivElement>(null)

  const confirm = () => {
    animate(x, MAX, { type: "spring", stiffness: 400, damping: 30 })
    setDone(true)
  }
  const reset = () => {
    setDone(false)
    animate(x, 0, { type: "spring", stiffness: 300, damping: 25 })
  }

  return (
    <Card className={cn("w-80 items-center gap-4 p-5", disabled && "opacity-60")} {...hoverProps}>
      <div className="w-full">
        <p className="text-muted-foreground text-xs">Total</p>
        <p className="text-2xl font-semibold">£24.00</p>
      </div>

      <div ref={constraints} className="bg-muted relative h-14 overflow-hidden rounded-full border" style={{ width: TRACK }}>
        <motion.div className="bg-primary/15 absolute inset-y-0 left-0 rounded-full" style={{ width: fill }} />
        <motion.span className="absolute inset-0 flex items-center justify-center pl-10 text-sm font-medium" style={{ opacity: labelOpacity }} aria-hidden>
          {disabled ? (
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Lock className="size-3.5" /> Locked
            </span>
          ) : (
            <Shimmer active={!reduced && !done}>Slide to pay</Shimmer>
          )}
        </motion.span>
        <AnimatePresence>
          {done && (
            <motion.span className="text-primary absolute inset-0 flex items-center justify-center pr-12 text-sm font-semibold" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} role="status">
              Paid
            </motion.span>
          )}
        </AnimatePresence>
        <motion.button
          className="bg-primary text-primary-foreground focus-visible:ring-ring/50 absolute top-1 left-1 flex size-12 touch-none items-center justify-center rounded-full shadow-md outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed"
          style={{ x }}
          drag={disabled || done ? false : "x"}
          dragConstraints={{ left: 0, right: MAX }}
          dragElastic={0.05}
          dragMomentum={false}
          onDragEnd={() => (x.get() > MAX * 0.85 ? confirm() : animate(x, 0, { type: "spring", stiffness: 500, damping: 30 }))}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !done) (e.preventDefault(), confirm())
          }}
          animate={!done && hovered ? { x: [0, 14, 0] } : undefined}
          transition={{ duration: 1, repeat: hovered && !done ? Infinity : 0, repeatDelay: 0.4 }}
          disabled={disabled}
          aria-label={done ? "Payment confirmed" : "Slide or press Enter to pay £24"}
          data-hover-target
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={String(done)} className="flex" initial={{ scale: 0.3, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}>
              {done ? (
                <Check className="size-5" />
              ) : (
                <motion.span className="flex" animate={hovered ? { x: [0, 3, 0] } : {}} transition={{ duration: 0.6, repeat: hovered ? Infinity : 0 }}>
                  <ChevronsRight className="size-5" />
                </motion.span>
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      <div className="h-8">
        {done && (
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset demo
          </Button>
        )}
      </div>
    </Card>
  )
}
