import { useMemo, useState } from "react"
import { motion } from "motion/react"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { SlotNumber } from "./slot-number"
import { useDemoState, useHover } from "./demo-state"

const MIN = 0
const MAX = 500
const BUCKETS = 28
// a lumpy, realistic-looking price distribution (deterministic)
const histogram = Array.from({ length: BUCKETS }, (_, i) => {
  const x = i / (BUCKETS - 1)
  const peak = Math.exp(-((x - 0.32) ** 2) / 0.02) * 0.9 + Math.exp(-((x - 0.7) ** 2) / 0.015) * 0.5
  return Math.round(4 + peak * 60 + ((i * 37) % 11))
})

/**
 * Two-thumb shadcn <Slider> over a histogram: bars inside the range light up,
 * the result count and prices roll.
 * Hover: bars ripple in a wave and thumbs show their ring. Disabled: slider disabled, histogram greyed.
 */
export function PriceRange() {
  const [range, setRange] = useState<[number, number]>([80, 320])
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const [lo, hi] = range

  const results = useMemo(
    () =>
      histogram.reduce((sum, n, i) => {
        const price = (i / BUCKETS) * MAX
        return price >= lo && price <= hi ? sum + n : sum
      }, 0),
    [lo, hi],
  )

  return (
    <Card className="w-80 gap-4" {...hoverProps}>
      <CardHeader>
        <CardDescription>Price per night</CardDescription>
        <CardTitle className="flex items-baseline gap-1.5 text-2xl">
          <span>£</span>
          <SlotNumber value={String(lo)} />
          <span className="text-muted-foreground px-1 text-lg">–</span>
          <span>£</span>
          <SlotNumber value={String(hi)} />
          {hi === MAX && <span className="text-lg">+</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-20 items-end gap-[3px] px-2">
          {histogram.map((n, i) => {
            const price = (i / BUCKETS) * MAX
            const inside = price >= lo && price <= hi
            return (
              <motion.span
                key={i}
                className={cn("flex-1 origin-bottom rounded-t-[2px]", disabled ? "bg-muted-foreground/25" : inside ? "bg-primary" : "bg-muted-foreground/20")}
                style={{ height: `${(n / 70) * 100}%` }}
                initial={false}
                animate={
                  hovered
                    ? { scaleY: [1, 1.25, 1], opacity: inside ? 1 : 0.7 }
                    : { scaleY: inside ? 1 : 0.85, opacity: inside ? 1 : 0.7 }
                }
                transition={
                  hovered
                    ? { duration: 0.9, delay: i * 0.03, repeat: Infinity, repeatDelay: 0.6 }
                    : { type: "spring", stiffness: 300, damping: 22 }
                }
              />
            )
          })}
        </div>
        <Slider
          value={range}
          onValueChange={(v) => setRange([v[0], v[1]] as [number, number])}
          min={MIN}
          max={MAX}
          step={10}
          minStepsBetweenThumbs={2}
          disabled={disabled}
          aria-label="Price range"
        />
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>£0</span>
          <span className="text-foreground font-medium">
            <SlotNumber value={String(results)} /> stays
          </span>
          <span>£500+</span>
        </div>
      </CardContent>
    </Card>
  )
}
