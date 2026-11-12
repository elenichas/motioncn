import { useEffect, useRef, useState } from "react"
import { animate, motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react"
import { Check, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { SlotNumber } from "./slot-number"
import { useDemoState } from "./demo-state"

const features = ["Unlimited canvases", "Every component", "Theme & state compare"]

/**
 * Pricing card with a cursor-following spotlight and glowing border
 * (the Magic UI "Magic Card" / Aceternity "Spotlight" idea, in shadcn tokens).
 * Built on shadcn Card, Badge, Switch and Button.
 * Hover: the spotlight follows the pointer (or drifts by itself in the Hover state).
 * Disabled: no light, controls disabled.
 */
export function SpotlightCard() {
  const { disabled, forceHover } = useDemoState()
  const [over, setOver] = useState(false)
  const [yearly, setYearly] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(70)
  const my = useMotionValue(25)
  const x = useSpring(mx, { stiffness: 260, damping: 28 })
  const y = useSpring(my, { stiffness: 260, damping: 28 })
  const active = !disabled && (over || forceHover)

  // In the forced Hover state the light drifts on its own
  useEffect(() => {
    if (!forceHover || disabled) return
    const a = animate(mx, [20, 80, 20], { duration: 5, repeat: Infinity, ease: "easeInOut" })
    const b = animate(my, [20, 70, 20], { duration: 3.5, repeat: Infinity, ease: "easeInOut" })
    return () => (a.stop(), b.stop())
  }, [forceHover, disabled, mx, my])

  const glow = useMotionTemplate`radial-gradient(260px circle at ${x}% ${y}%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%)`
  const ring = useMotionTemplate`radial-gradient(200px circle at ${x}% ${y}%, var(--primary), transparent 70%)`
  const price = yearly ? 120 : 12

  return (
    <div
      ref={ref}
      className={cn("relative w-80 rounded-xl p-px", disabled && "opacity-60")}
      onPointerEnter={() => setOver(true)}
      onPointerLeave={() => setOver(false)}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect()
        mx.set(((e.clientX - r.left) / r.width) * 100)
        my.set(((e.clientY - r.top) / r.height) * 100)
      }}
    >
      {/* glowing border: a gradient behind a 1px inset card */}
      <div className="bg-border absolute inset-0 rounded-xl" />
      <motion.div className="absolute inset-0 rounded-xl" style={{ background: ring }} animate={{ opacity: active ? 1 : 0 }} transition={{ duration: 0.3 }} />
      <Card className="relative gap-4 overflow-hidden border-0">
        <motion.div className="pointer-events-none absolute inset-0" style={{ background: glow }} animate={{ opacity: active ? 1 : 0 }} transition={{ duration: 0.3 }} />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Pro</CardTitle>
            <Badge variant="secondary">
              <Sparkles /> Popular
            </Badge>
          </div>
          <CardDescription>Everything you need to ship motion.</CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight">
              £<SlotNumber value={String(price)} />
            </span>
            <span className="text-muted-foreground text-sm">/{yearly ? "year" : "month"}</span>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={yearly} onCheckedChange={setYearly} disabled={disabled} aria-label="Bill yearly" />
            Bill yearly <span className="text-muted-foreground">(2 months free)</span>
          </label>
          <ul className="space-y-2 text-sm">
            {features.map((f, i) => (
              <motion.li key={f} className="flex items-center gap-2" animate={{ x: active ? 2 : 0 }} transition={{ delay: i * 0.04 }}>
                <Check className="text-primary size-4" /> {f}
              </motion.li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="relative">
          <Button className="w-full" disabled={disabled} data-hover-target>
            Upgrade to Pro
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
