import { useEffect, useState } from "react"
import { motion, useReducedMotionConfig } from "motion/react"
import { ChevronLeft, ChevronRight, Quote } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDemoState, useHover } from "./demo-state"

// Placeholder copy for the demo: swap in real, attributed quotes from your customers.
const QUOTES = [
  { text: "Your customer’s words go here: what changed for them after switching.", name: "Customer name", role: "Role, Company" },
  { text: "Keep quotes short and specific. One concrete result beats three adjectives.", name: "Customer name", role: "Role, Company" },
  { text: "Rotate three to five quotes. The stack shows there are more without a long page.", name: "Customer name", role: "Role, Company" },
]

/**
 * Testimonial stack for landing pages: the top card flips to the back every few seconds,
 * the stack re-settles with springs, and dots track the position. Built on shadcn Card and Button.
 * Ships with placeholder copy. Hover: auto-play pauses and the stack fans out.
 * Disabled (or reduced motion): auto-play stops; disabled also disables the arrows.
 */
export function TestimonialStack() {
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const reduced = useReducedMotionConfig()
  const [top, setTop] = useState(0)
  const next = (d: number) => setTop((t) => (t + d + QUOTES.length) % QUOTES.length)

  useEffect(() => {
    if (hovered || disabled || reduced) return
    const id = window.setInterval(() => next(1), 3800)
    return () => clearInterval(id)
  }, [hovered, disabled, reduced])

  return (
    <div className={cn("flex w-80 flex-col items-center gap-4", disabled && "opacity-60")} {...hoverProps}>
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Sample testimonials</p>
      <div className="relative h-48 w-full" aria-live="polite">
        {QUOTES.map((q, i) => {
          const depth = (i - top + QUOTES.length) % QUOTES.length
          return (
            <motion.div
              key={i}
              className="absolute inset-0"
              style={{ zIndex: QUOTES.length - depth }}
              initial={false}
              animate={{
                y: depth * (hovered ? 16 : 10),
                scale: 1 - depth * 0.05,
                rotate: hovered ? depth * (i % 2 ? 2.5 : -2.5) : 0,
                opacity: depth > 2 ? 0 : 1,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              aria-hidden={depth !== 0}
            >
              <Card className="h-full justify-between gap-3 p-5 shadow-md">
                <Quote className="text-primary size-5" />
                <p className="text-sm leading-relaxed">{q.text}</p>
                <div className="flex items-center gap-2">
                  <span className="bg-secondary text-secondary-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">CN</span>
                  <div>
                    <p className="text-sm font-medium">{q.name}</p>
                    <p className="text-muted-foreground text-xs">{q.role}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 pt-3">
        <Button variant="ghost" size="icon" className="size-8" onClick={() => next(-1)} disabled={disabled} aria-label="Previous testimonial">
          <ChevronLeft />
        </Button>
        <div className="flex gap-1.5" aria-hidden>
          {QUOTES.map((_, i) => (
            <motion.span key={i} className="bg-primary h-1.5 rounded-full" animate={{ width: i === top ? 18 : 6, opacity: i === top ? 1 : 0.3 }} />
          ))}
        </div>
        <Button variant="ghost" size="icon" className="size-8" onClick={() => next(1)} disabled={disabled} aria-label="Next testimonial">
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
