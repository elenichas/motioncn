import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Cloud, CloudRain, Snowflake, Sun, type LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDemoState, useHover } from "./demo-state"
import { cn } from "@/lib/utils"
import { SlotNumber } from "./slot-number"

type Condition = "sunny" | "cloudy" | "rainy" | "snowy"
const conditions: Record<Condition, { label: string; icon: LucideIcon; temp: number; hi: number; lo: number }> = {
  sunny: { label: "Sunny", icon: Sun, temp: 24, hi: 27, lo: 16 },
  cloudy: { label: "Cloudy", icon: Cloud, temp: 17, hi: 19, lo: 11 },
  rainy: { label: "Rain", icon: CloudRain, temp: 12, hi: 14, lo: 8 },
  snowy: { label: "Snow", icon: Snowflake, temp: -3, hi: 0, lo: -6 },
}
const order: Condition[] = ["sunny", "cloudy", "rainy", "snowy"]
const days = ["Mon", "Tue", "Wed", "Thu", "Fri"]

function SunArt() {
  return (
    <motion.div className="absolute top-6 left-8" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, opacity: 0 }}>
      <motion.svg width="84" height="84" viewBox="0 0 84 84" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }}>
        {Array.from({ length: 12 }, (_, i) => (
          <motion.line
            key={i}
            x1="42" y1="4" x2="42" y2="14"
            stroke="#fbbf24" strokeWidth="4" strokeLinecap="round"
            transform={`rotate(${i * 30} 42 42)`}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.12 }}
          />
        ))}
      </motion.svg>
      <motion.span
        className="absolute inset-[18px] rounded-full bg-amber-400"
        animate={{ boxShadow: ["0 0 0 0 rgb(251 191 36 / .5)", "0 0 0 14px rgb(251 191 36 / 0)"] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      />
    </motion.div>
  )
}

function CloudShape({ className, delay = 0, drift = 14 }: { className?: string; delay?: number; drift?: number }) {
  return (
    <motion.div
      className={cn("absolute", className)}
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: [0, drift, 0], opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ x: { duration: 6, repeat: Infinity, ease: "easeInOut", delay }, opacity: { duration: 0.4 } }}
    >
      <div className="bg-background relative h-8 w-24 rounded-full shadow-md">
        <div className="bg-background absolute -top-5 left-4 size-10 rounded-full" />
        <div className="bg-background absolute -top-8 left-10 size-12 rounded-full" />
      </div>
    </motion.div>
  )
}

function Precipitation({ kind }: { kind: "rain" | "snow" }) {
  const drops = useMemo(() => Array.from({ length: kind === "rain" ? 16 : 12 }, () => ({ x: 20 + Math.random() * 230, d: Math.random() * 1.5, s: 0.7 + Math.random() * 0.6 })), [kind])
  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {drops.map((p, i) =>
        kind === "rain" ? (
          <motion.span
            key={i}
            className="bg-primary/70 absolute top-14 h-3 w-[2px] rounded-full"
            style={{ left: p.x }}
            animate={{ y: [0, 90], opacity: [0, 1, 0] }}
            transition={{ duration: 0.9 * p.s, repeat: Infinity, delay: p.d, ease: "easeIn" }}
          />
        ) : (
          <motion.span
            key={i}
            className="text-primary absolute top-12"
            style={{ left: p.x }}
            animate={{ y: [0, 100], x: [0, 10, -8, 4], rotate: [0, 180], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3.2 * p.s, repeat: Infinity, delay: p.d * 2, ease: "linear" }}
          >
            <Snowflake className="size-3" />
          </motion.span>
        ),
      )}
    </motion.div>
  )
}

/**
 * Weather on a shadcn Card, conditions picked with shadcn Tabs.
 * Hover: card lifts, the sky zooms in and "feels like" slides in. Disabled: condition tabs off.
 */
export function WeatherWidget() {
  const [cond, setCond] = useState<Condition>("sunny")
  const c = conditions[cond]
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()

  return (
    <motion.div {...hoverProps} animate={{ y: hovered ? -4 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
    <Card className={cn("w-80 gap-0 overflow-hidden py-0 transition-shadow", hovered && "shadow-xl")}>
      <div className="bg-primary/10 relative h-44 overflow-hidden">
        <motion.div className="absolute inset-0 origin-top-left" animate={{ scale: hovered ? 1.08 : 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
        <AnimatePresence>
          {cond === "sunny" && <SunArt key="sun" />}
          {cond !== "sunny" && <CloudShape key="c1" className="top-10 left-6" />}
          {cond !== "sunny" && <CloudShape key="c2" className="top-16 left-32 scale-75" delay={1} drift={-12} />}
          {cond === "sunny" && <CloudShape key="c3" className="top-24 left-44 scale-50" delay={0.5} />}
          {cond === "rainy" && <Precipitation key="rain" kind="rain" />}
          {cond === "snowy" && <Precipitation key="snow" kind="snow" />}
        </AnimatePresence>
        </motion.div>
        <div className="absolute right-5 bottom-4 text-right">
          <div className="flex items-start justify-end text-5xl font-semibold tracking-tight">
            {c.temp < 0 && <span>-</span>}
            <SlotNumber value={String(Math.abs(c.temp))} />
            <span className="text-2xl">°</span>
          </div>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p key={cond} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="text-foreground/75 text-sm">
              {c.label} · H {c.hi}° L {c.lo}°
            </motion.p>
          </AnimatePresence>
          <AnimatePresence>
            {hovered && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs font-medium">
                Feels like {c.temp - 2}°
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <p className="absolute bottom-4 left-5 text-sm font-medium">London</p>
      </div>
      <div className="grid grid-cols-5 gap-1 px-4 pt-4">
        {days.map((d, i) => {
          const dc = conditions[i % 2 ? order[(order.indexOf(cond) + 1) % 4] : cond]
          const hi = c.hi + [0, 1, -2, 2, -1][i]
          return (
            <motion.div
              key={d + cond}
              className="flex flex-col items-center gap-1 text-xs"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: "spring", bounce: 0.4 }}
            >
              <span className="text-muted-foreground">{d}</span>
              <dc.icon className="text-primary size-4" />
              <span className="font-medium tabular-nums">{hi}°</span>
            </motion.div>
          )
        })}
      </div>
      <Tabs value={cond} onValueChange={(v) => setCond(v as Condition)} className="m-4">
        <TabsList className="w-full" aria-label="Weather condition">
          {order.map((k) => {
            const Icon = conditions[k].icon
            return (
              <TabsTrigger key={k} value={k} disabled={disabled} aria-label={conditions[k].label} className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                {cond === k && <motion.span layoutId="weather-pill" className="bg-background absolute inset-0 rounded-md shadow-sm" transition={{ type: "spring", bounce: 0.25 }} />}
                <Icon className="relative" />
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>
    </Card>
    </motion.div>
  )
}
