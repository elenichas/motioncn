import { useState } from "react"
import { motion } from "motion/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { SlotNumber } from "./slot-number"
import { useDemoState, useHover } from "./demo-state"

const DATA = {
  traffic: { unit: "", items: [["Search", 4820], ["Direct", 2610], ["Social", 1740], ["Email", 830]] },
  revenue: { unit: "£", items: [["Pro", 12400], ["Team", 8200], ["Starter", 3100], ["Add-ons", 1900]] },
} as const
type Key = keyof typeof DATA
// one hue, four strengths: theme-true, and the legend carries the labels
const SHADES = [1, 0.7, 0.45, 0.25]
const R = 46
const C = 2 * Math.PI * R

/**
 * Donut chart on a shadcn Card with Tabs: segments draw in turn, switching data re-draws them,
 * and hovering a segment or legend row thickens it and rolls the centre number to its value.
 * Hover: the first segment pops out. Disabled: tabs disabled and the chart greys out.
 */
export function DonutBreakdown() {
  const { disabled, forceHover } = useDemoState()
  const { hoverProps } = useHover()
  const [key, setKey] = useState<Key>("traffic")
  const [over, setOver] = useState<number | null>(null)
  const active = disabled ? null : forceHover ? 0 : over
  const { unit, items } = DATA[key]
  const total = items.reduce((a, [, v]) => a + v, 0)
  let offset = 0
  const shown = active === null ? total : items[active][1]

  return (
    <Card className={cn("w-80 gap-4", disabled && "grayscale")} {...hoverProps}>
      <CardHeader>
        <CardDescription>{key === "traffic" ? "Visits by source" : "Revenue by plan"}</CardDescription>
        <CardTitle>Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={key} onValueChange={(v) => setKey(v as Key)}>
          <TabsList className="w-full">
            <TabsTrigger value="traffic" disabled={disabled}>Traffic</TabsTrigger>
            <TabsTrigger value="revenue" disabled={disabled}>Revenue</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-5">
          <div className="relative size-32 shrink-0">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90" role="img" aria-label={items.map(([l, v]) => `${l} ${unit}${v.toLocaleString("en-GB")}`).join(", ")}>
              {items.map(([label, v], i) => {
                const len = (v / total) * C
                const seg = (
                  <motion.circle
                    key={key + label}
                    cx="60" cy="60" r={R} fill="none"
                    stroke="var(--primary)" strokeOpacity={SHADES[i]}
                    strokeDasharray={`${len - 2} ${C}`}
                    strokeDashoffset={-offset}
                    initial={{ pathLength: 0, strokeWidth: 14 }}
                    animate={{ pathLength: 1, strokeWidth: active === i ? 20 : 14, opacity: active === null || active === i ? 1 : 0.45 }}
                    transition={{ pathLength: { delay: i * 0.12, duration: 0.5, ease: "easeOut" }, default: { type: "spring", stiffness: 300, damping: 20 } }}
                    onPointerEnter={() => setOver(i)}
                    onPointerLeave={() => setOver(null)}
                  />
                )
                offset += len
                return seg
              })}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold">
                {unit}
                <SlotNumber value={shown.toLocaleString("en-GB")} />
              </span>
              <span className="text-muted-foreground text-xs">{active === null ? "Total" : items[active][0]}</span>
            </div>
          </div>
          <ul className="flex-1 space-y-1.5 text-sm">
            {items.map(([label, v], i) => (
              <motion.li
                key={key + label}
                className={cn("flex items-center gap-2 rounded px-1 py-0.5", active === i && "bg-accent")}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                onPointerEnter={() => setOver(i)}
                onPointerLeave={() => setOver(null)}
              >
                <span className="bg-primary size-2.5 rounded-full" style={{ opacity: SHADES[i] }} />
                <span className="flex-1">{label}</span>
                <span className="tabular-nums">{Math.round((v / total) * 100)}%</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
