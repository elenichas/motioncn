import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowDownWideNarrow } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SlotNumber } from "./slot-number"
import { useDemoState } from "./demo-state"

type Range = "week" | "month" | "year"
type Series = "web" | "mobile"

const labels: Record<Range, string[]> = {
  week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  month: ["W1", "W2", "W3", "W4"],
  year: ["Q1", "Q2", "Q3", "Q4"],
}
// deterministic pseudo-data so filters always show the same shape
const value = (range: Range, s: Series, i: number) => {
  const seed = (range.length * 7 + i * 13 + (s === "web" ? 3 : 11)) % 17
  const scale = range === "week" ? 1 : range === "month" ? 6 : 22
  return Math.round((12 + seed * 3 + (s === "web" ? 8 : 0)) * scale)
}

/**
 * Bar chart in a shadcn Card, filtered with shadcn Tabs and Buttons; bars spring and re-order.
 * Hover: the bar highlights, others dim, and a tooltip rises. Disabled: filters disabled.
 */
export function FilterChart() {
  const [range, setRange] = useState<Range>("week")
  const [series, setSeries] = useState<Record<Series, boolean>>({ web: true, mobile: true })
  const [sorted, setSorted] = useState(false)
  const [over, setOver] = useState<string | null>(null)
  const { disabled, forceHover } = useDemoState()

  const bars = useMemo(() => {
    const rows = labels[range].map((label, i) => ({
      label,
      web: series.web ? value(range, "web", i) : 0,
      mobile: series.mobile ? value(range, "mobile", i) : 0,
    }))
    return sorted ? [...rows].sort((a, b) => b.web + b.mobile - (a.web + a.mobile)) : rows
  }, [range, series, sorted])

  const hover = disabled ? null : forceHover ? bars[1]?.label ?? null : over
  const max = Math.max(1, ...bars.map((b) => b.web + b.mobile))
  const total = bars.reduce((a, b) => a + b.web + b.mobile, 0)
  const spring = { type: "spring", stiffness: 260, damping: 24 } as const

  return (
    <Card className="w-[340px] gap-4">
      <CardHeader className="flex items-start justify-between">
        <div className="space-y-1.5">
          <CardDescription>Visitors</CardDescription>
          <CardTitle className="text-3xl">
            <SlotNumber value={total.toLocaleString("en-US")} />
          </CardTitle>
        </div>
        <Button size="icon" variant={sorted ? "default" : "outline"} className="size-8" onClick={() => setSorted((s) => !s)} aria-pressed={sorted} disabled={disabled} aria-label="Sort by value">
          <ArrowDownWideNarrow />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList className="w-full">
            <TabsTrigger value="week" disabled={disabled}>Week</TabsTrigger>
            <TabsTrigger value="month" disabled={disabled}>Month</TabsTrigger>
            <TabsTrigger value="year" disabled={disabled}>Year</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex h-40 items-end gap-2 border-b pb-px">
          <AnimatePresence mode="popLayout" initial={false}>
            {bars.map((b) => {
              const h1 = (b.web / max) * 100
              const h2 = (b.mobile / max) * 100
              return (
                <motion.div
                  key={range + b.label}
                  layout
                  className="relative flex h-full flex-1 flex-col justify-end"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={spring}
                  onHoverStart={() => setOver(b.label)}
                  onHoverEnd={() => setOver(null)}
                >
                  <AnimatePresence>
                    {hover === b.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, x: "-50%" }}
                        className="bg-popover text-popover-foreground absolute left-1/2 z-10 rounded-md border px-2 py-1 text-[11px] whitespace-nowrap shadow-md tabular-nums"
                        style={{ bottom: `calc(${h1 + h2}% + 6px)` }}
                      >
                        {(b.web + b.mobile).toLocaleString("en-US")}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.div className="bg-primary/35 rounded-t-sm" initial={false} animate={{ height: `${h2}%`, opacity: hover && hover !== b.label ? 0.5 : 1 }} transition={spring} />
                  <motion.div
                    className={cn("bg-primary", h2 < 0.5 && "rounded-t-sm")}
                    initial={false}
                    animate={{ height: `${h1}%`, opacity: hover && hover !== b.label ? 0.5 : 1 }}
                    transition={spring}
                  />
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
        <div className="-mt-2 flex gap-2">
          {bars.map((b) => (
            <motion.span layout key={range + b.label} transition={spring} className="text-muted-foreground flex-1 text-center text-xs">
              {b.label}
            </motion.span>
          ))}
        </div>

        <div className="flex gap-2">
          {(["web", "mobile"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => setSeries((x) => ({ ...x, [s]: !x[s] }))}
              aria-pressed={series[s]}
              className={cn("h-7 rounded-full px-3 text-xs capitalize", series[s] ? "bg-secondary" : "text-muted-foreground")}
            >
              <motion.span
                className={cn("size-2.5 rounded-full", s === "web" ? "bg-primary" : "bg-primary/35")}
                animate={{ scale: series[s] ? 1 : 0.4 }}
              />
              {s}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
