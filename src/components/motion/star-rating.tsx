import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useDemoState } from "./demo-state"

const labels = ["Tap to rate", "Hated it", "Didn’t like it", "It was fine", "Liked it", "Loved it!"]

/**
 * Star rating built from shadcn ghost icon Buttons.
 * Hover: stars preview-fill in a spring wave with the matching label. Disabled: buttons disabled.
 */
export function StarRating() {
  const [rating, setRating] = useState(0)
  const [over, setOver] = useState(0)
  const { disabled, forceHover } = useDemoState()
  const hover = disabled ? 0 : forceHover ? 3 : over
  const shown = hover || rating

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setOver(0)}>
        {Array.from({ length: 5 }, (_, i) => {
          const n = i + 1
          const on = n <= shown
          return (
            <Button key={n} asChild variant="ghost" size="icon" className="size-auto p-1 hover:bg-transparent">
            <motion.button
              disabled={disabled}
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onMouseEnter={() => setOver(n)}
              onClick={() => setRating(n)}
              animate={{ scale: hover === n ? 1.2 : 1, rotate: hover === n ? -8 : 0 }}
              whileTap={disabled ? undefined : { scale: 0.85 }}
              className="relative"
            >
              <motion.span
                className="block"
                initial={false}
                animate={on ? { scale: [1, 1.35, 1], rotate: [0, 15, 0] } : { scale: 1 }}
                transition={{ delay: on ? i * 0.05 : 0, duration: 0.35 }}
              >
                <Star className={cn("size-8 transition-colors", on ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
              </motion.span>
              <AnimatePresence>
                {rating === 5 && n === 5 && !hover && (
                  <span className="pointer-events-none absolute inset-0">
                    {Array.from({ length: 6 }, (_, k) => {
                      const a = (k / 6) * Math.PI * 2
                      return (
                        <motion.span
                          key={k}
                          className="absolute top-1/2 left-1/2 text-amber-400"
                          initial={{ x: -4, y: -4, scale: 0, opacity: 1 }}
                          animate={{ x: Math.cos(a) * 26 - 4, y: Math.sin(a) * 26 - 4, scale: 1, opacity: 0 }}
                          transition={{ duration: 0.7, delay: 0.25 }}
                        >
                          <Star className="size-2 fill-current" />
                        </motion.span>
                      )
                    })}
                  </span>
                )}
              </AnimatePresence>
            </motion.button>
            </Button>
          )
        })}
      </div>
      <div className="relative h-6 w-40 overflow-hidden text-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={shown}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            className={cn("text-sm font-medium", !shown && "text-muted-foreground")}
          >
            {disabled ? "Rating disabled" : labels[shown]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
