import { useState } from "react"
import { motion } from "motion/react"
import { Accessibility, Palette, Sparkles, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { themes } from "@/lib/themes"
import { useDemoState } from "./demo-state"

const TILES = [
  { icon: Sparkles, title: "Springs everywhere", body: "Motion that follows your hand.", span: "col-span-2" },
  { icon: Palette, title: "Any theme", body: "Reads only shadcn tokens.", span: "" },
  { icon: Accessibility, title: "AA by default", body: "Checked in every state.", span: "" },
  { icon: Zap, title: "Copy & own", body: "Installs with the shadcn CLI.", span: "col-span-2" },
]

function TileArt({ i, active }: { i: number; active: boolean }) {
  if (i === 0)
    return (
      <div className="flex h-8 items-end gap-1" aria-hidden>
        {[0, 1, 2, 3, 4].map((k) => (
          <motion.span key={k} className="bg-primary w-2 rounded-full" animate={{ height: active ? [8, 28, 14, 22, 8][k] : 8 }} transition={{ type: "spring", stiffness: 300, damping: 8, delay: k * 0.04 }} />
        ))}
      </div>
    )
  if (i === 1)
    return (
      <div className="flex h-8 items-center" aria-hidden>
        {themes.slice(2, 7).map((t, k) => (
          <motion.span key={t.id} className="ring-card size-5 rounded-full ring-2" style={{ background: t.swatch }} animate={{ x: active ? k * 4 : k * -6 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} />
        ))}
      </div>
    )
  if (i === 2)
    return (
      <svg viewBox="0 0 24 24" className="text-primary h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
        <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
        <motion.path d="M7 12.5l3.5 3.5L17 9" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ pathLength: active ? 1 : 0.15 }} transition={{ duration: 0.4 }} />
      </svg>
    )
  return (
    <div className="bg-muted flex h-8 items-center gap-1 rounded-md px-2 font-mono text-xs" aria-hidden>
      <span className="text-foreground/70">$</span>
      <motion.span className="overflow-hidden whitespace-nowrap" animate={{ width: active ? "auto" : 0 }}>
        npx shadcn add
      </motion.span>
      <motion.span className="bg-foreground h-3.5 w-1.5" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} />
    </div>
  )
}

/**
 * Landing-page feature bento of shadcn Cards. Each tile has its own micro-animation that plays
 * on hover: springy bars, fanning theme swatches, a tick that draws itself, a command that types.
 * Hover: the tile lifts and its animation plays. Disabled: tiles are static and dimmed.
 */
export function FeatureBento() {
  const { disabled, forceHover } = useDemoState()
  const [over, setOver] = useState<number | null>(null)
  const active = disabled ? null : forceHover ? 0 : over

  return (
    <div className={cn("grid w-[340px] grid-cols-3 gap-2", disabled && "opacity-60")}>
      {TILES.map((t, i) => (
        <motion.div
          key={t.title}
          className={t.span || "col-span-1"}
          onPointerEnter={() => setOver(i)}
          onPointerLeave={() => setOver(null)}
          animate={{ y: active === i ? -3 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
        >
          <Card className={cn("h-full gap-2 p-3 transition-shadow", active === i && "border-primary/40 shadow-md")}>
            <TileArt i={i} active={active === i} />
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <t.icon className="text-primary size-3.5" /> {t.title}
              </p>
              <p className="text-muted-foreground text-xs">{t.body}</p>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
