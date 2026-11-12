import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SlotNumber } from "./slot-number"
import { useDemoState, useHover } from "./demo-state"
import { cn } from "@/lib/utils"

const series = () => Array.from({ length: 12 }, (_, i) => 30 + Math.sin(i / 1.6) * 12 + Math.random() * 22)

/**
 * shadcn Card + Badge with a rolling number ticker and a sparkline that redraws.
 * Hover: card lifts, the latest point pulses and shows its value. Disabled: refresh off, chart muted.
 */
export function StatCard() {
  const [data, setData] = useState(() => [48, 52, 45, 55, 61, 57, 63, 59, 66, 64, 70, 74])
  const [spin, setSpin] = useState(0)
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const total = Math.round(data.reduce((a, b) => a + b, 0) * 31)
  const change = ((data[11] - data[0]) / data[0]) * 100
  const up = change >= 0

  const { path, endY } = useMemo(() => {
    const max = Math.max(...data)
    const min = Math.min(...data)
    const y = (v: number) => 56 - ((v - min) / (max - min || 1)) * 48
    return { path: data.map((v, i) => `${i ? "L" : "M"} ${(i / 11) * 240} ${y(v)}`).join(" "), endY: y(data[11]) }
  }, [data])

  return (
    <motion.div {...hoverProps} animate={{ y: hovered ? -4 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
    <Card className={cn("w-80 gap-4 transition-shadow", hovered && "shadow-lg")}>
      <CardHeader className="flex items-start justify-between">
        <div className="space-y-1.5">
          <CardDescription>Monthly revenue</CardDescription>
          <CardTitle className="text-3xl">
            <SlotNumber value={`$${total.toLocaleString("en-US")}`} />
          </CardTitle>
        </div>
        <Badge variant={up ? "secondary" : "destructive"} className="tabular-nums">
          {up ? <TrendingUp /> : <TrendingDown />}
          {up ? "+" : ""}
          {change.toFixed(1)}%
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <svg viewBox="0 0 240 60" className={cn("h-16 w-full overflow-visible", disabled ? "text-muted-foreground" : "text-primary")}>
          <motion.path
            key={path}
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0.4 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          />
          <AnimatePresence>
            {hovered && (
              <motion.g initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} style={{ originX: "240px", originY: `${endY}px` }}>
                <motion.circle cx={240} cy={endY} r={9} fill="currentColor" opacity={0.2} animate={{ r: [5, 11, 5] }} transition={{ duration: 1.4, repeat: Infinity }} />
                <circle cx={240} cy={endY} r={4} fill="currentColor" stroke="var(--card)" strokeWidth={2} />
                <g transform={`translate(${200} ${endY - 30})`}>
                  <rect width="44" height="20" rx="5" fill="var(--popover)" stroke="var(--border)" />
                  <text x="22" y="14" textAnchor="middle" fontSize="11" fill="var(--popover-foreground)" fontWeight="600">
                    {Math.round(data[11] * 31)}
                  </text>
                </g>
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          disabled={disabled}
          onClick={() => {
            setData(series())
            setSpin((s) => s + 1)
          }}
        >
          <motion.span animate={{ rotate: spin * 360 }} transition={{ type: "spring", bounce: 0.3 }}>
            <RefreshCw />
          </motion.span>
          Refresh data
        </Button>
      </CardContent>
    </Card>
    </motion.div>
  )
}
