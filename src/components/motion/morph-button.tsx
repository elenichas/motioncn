import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Check, LoaderCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDemoState, useHover } from "./demo-state"

type State = "idle" | "loading" | "success"

/**
 * shadcn <Button> that morphs idle → loading → success.
 * Hover: lifts, glows and the paper plane leans forward. Disabled: native disabled, no motion.
 */
export function MorphButton() {
  const [state, setState] = useState<State>("idle")
  const timers = useRef<number[]>([])
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const run = () => {
    if (state !== "idle") return
    setState("loading")
    timers.current.push(window.setTimeout(() => setState("success"), 1500))
    timers.current.push(window.setTimeout(() => setState("idle"), 3100))
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Button asChild size="lg" className={cn("overflow-hidden", state === "success" && "bg-emerald-600 text-white hover:bg-emerald-600")}>
        <motion.button
          layout
          data-hover-target
          disabled={disabled}
          onClick={run}
          {...hoverProps}
          whileTap={disabled ? undefined : { scale: 0.94 }}
          animate={{
            y: hovered ? -2 : 0,
            boxShadow: hovered ? "0 10px 24px -8px color-mix(in oklab, var(--primary) 70%, transparent)" : "0 0 0 0 transparent",
          }}
          transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}
          style={{ borderRadius: 999 }}
          aria-live="polite"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={state}
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: -18, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 18, filter: "blur(4px)" }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.45 }}
            >
              {state === "idle" && (
                <>
                  <motion.span className="flex" animate={hovered ? { x: 3, y: -2, rotate: -12 } : { x: 0, y: 0, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                    <Send />
                  </motion.span>
                  Send message
                </>
              )}
              {state === "loading" && <LoaderCircle className="animate-spin" aria-label="Sending" />}
              {state === "success" && (
                <>
                  <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", bounce: 0.6 }}>
                    <Check />
                  </motion.span>
                  Sent!
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </Button>
      <p className="text-muted-foreground text-xs">{disabled ? "Disabled" : "Click to send"}</p>
    </div>
  )
}
