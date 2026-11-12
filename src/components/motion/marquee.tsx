import { useEffect, useRef } from "react"
import { motion, useAnimationFrame, useMotionValue, useReducedMotionConfig, useSpring, type MotionValue } from "motion/react"
import { Atom, Braces, Component, Layers, Orbit, Shapes, Wind, Zap, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useDemoState, useHover } from "./demo-state"

const rowA: [LucideIcon, string][] = [
  [Atom, "React 19"], [Braces, "TypeScript"], [Wind, "Tailwind v4"], [Component, "shadcn/ui"],
]
const rowB: [LucideIcon, string][] = [
  [Orbit, "Motion"], [Layers, "Radix"], [Zap, "Vite"], [Shapes, "Lucide"],
]

function Row({ items, speed, direction }: { items: [LucideIcon, string][]; speed: MotionValue<number>; direction: 1 | -1 }) {
  const x = useMotionValue(0)
  const track = useRef<HTMLDivElement>(null)

  useAnimationFrame((_, delta) => {
    const half = (track.current?.scrollWidth ?? 0) / 2
    if (!half) return
    let next = x.get() - direction * speed.get() * delta
    // wrap seamlessly between -half and 0
    next = ((next % half) - half) % half
    x.set(next)
  })

  return (
    <div className="overflow-hidden" style={{ maskImage: "linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)" }}>
      <motion.div ref={track} className="flex w-max gap-2 py-1" style={{ x }}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex gap-2" aria-hidden={copy === 1}>
            {items.map(([Icon, label]) => (
              <motion.span key={label} whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                <Badge variant="outline" className="bg-background h-8 gap-1.5 rounded-full px-3 text-sm [&>svg]:size-4">
                  <Icon className="text-primary" /> {label}
                </Badge>
              </motion.span>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

/**
 * Infinite logo / tech marquee in two directions with faded edges
 * (Magic UI Marquee / Motion Primitives InfiniteSlider). Built on shadcn Badge.
 * Hover: the belt eases down to a crawl so items can be read. Disabled or reduced motion: paused.
 */
export function Marquee() {
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const reduced = useReducedMotionConfig()
  const target = disabled || reduced ? 0 : hovered ? 0.008 : 0.045 // px per ms
  const speed = useSpring(target, { stiffness: 60, damping: 20 })
  useEffect(() => speed.set(target), [target, speed])

  return (
    <div className={cn("w-80 space-y-3", disabled && "opacity-60")} {...hoverProps}>
      <div className="text-center">
        <p className="text-sm font-semibold">Built with</p>
        <p className="text-muted-foreground text-xs">{disabled ? "Paused (disabled)" : hovered ? "Slowed down so you can read" : "Hover to slow down"}</p>
      </div>
      <Row items={rowA} speed={speed} direction={1} />
      <Row items={rowB} speed={speed} direction={-1} />
    </div>
  )
}
