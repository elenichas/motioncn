import { motion } from "motion/react"
import { cn } from "@/lib/utils"

/**
 * Rolling "slot machine" number. Each digit is a 0–9 column that springs to
 * its value. Non-digits (",", ".", "$", "-") render as static glyphs.
 * Keys are assigned from the right so columns stay stable as length changes.
 */
export function SlotNumber({ value, className }: { value: string; className?: string }) {
  const chars = value.split("")
  return (
    <span className={cn("inline-flex tabular-nums leading-none", className)} aria-label={value}>
      {chars.map((ch, i) => {
        const key = chars.length - i
        if (!/\d/.test(ch)) {
          return (
            <motion.span key={`s${key}${ch}`} layout aria-hidden className="inline-block">
              {ch}
            </motion.span>
          )
        }
        const d = Number(ch)
        return (
          <span key={`d${key}`} aria-hidden className="relative inline-block h-[1em] overflow-hidden" style={{ width: "0.62em" }}>
            <motion.span
              className="absolute inset-x-0 top-0 flex flex-col items-center"
              initial={false}
              animate={{ y: `${-d}em` }}
              transition={{ type: "spring", stiffness: 140, damping: 18, mass: 0.8 }}
            >
              {Array.from({ length: 10 }, (_, n) => (
                <span key={n} className="block h-[1em] leading-none">
                  {n}
                </span>
              ))}
            </motion.span>
          </span>
        )
      })}
    </span>
  )
}
