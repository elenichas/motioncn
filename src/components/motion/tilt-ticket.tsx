import { useEffect, useRef, useState } from "react"
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react"
import { Wallet } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDemoState } from "./demo-state"

const bars = Array.from({ length: 34 }, (_, i) => 1 + ((i * 7) % 4))

/**
 * 3D tilting event ticket (Aceternity's 3D Card idea, flattened into shadcn tokens).
 * Built on shadcn Card and Button; layers sit at different depths for parallax.
 * Hover: the ticket tilts toward the pointer with a moving glare. Disabled: flat and dimmed.
 */
export function TiltTicket() {
  const { disabled, forceHover } = useDemoState()
  const ref = useRef<HTMLDivElement>(null)
  const [over, setOver] = useState(false)
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const active = !disabled && (over || forceHover)

  useEffect(() => {
    if (forceHover && !disabled) (px.set(0.85), py.set(0.2))
    else if (!over) (px.set(0.5), py.set(0.5))
  }, [forceHover, disabled, over, px, py])

  const rotateY = useSpring(useTransform(px, [0, 1], [-14, 14]), { stiffness: 180, damping: 18 })
  const rotateX = useSpring(useTransform(py, [0, 1], [10, -10]), { stiffness: 180, damping: 18 })
  const gx = useTransform(px, (v) => v * 100)
  const gy = useTransform(py, (v) => v * 100)
  const glare = useMotionTemplate`radial-gradient(240px circle at ${gx}% ${gy}%, rgb(255 255 255 / .35), transparent 60%)`

  return (
    <div style={{ perspective: 900 }} className={cn(disabled && "opacity-60")}>
      <motion.div
        ref={ref}
        className="relative w-72"
        style={{ rotateX: disabled ? 0 : rotateX, rotateY: disabled ? 0 : rotateY, transformStyle: "preserve-3d" }}
        onPointerEnter={() => setOver(true)}
        onPointerLeave={() => (setOver(false), px.set(0.5), py.set(0.5))}
        onPointerMove={(e) => {
          if (disabled) return
          const r = ref.current!.getBoundingClientRect()
          px.set((e.clientX - r.left) / r.width)
          py.set((e.clientY - r.top) / r.height)
        }}
      >
        <Card className="gap-0 py-0 shadow-lg" style={{ transformStyle: "preserve-3d" }}>
          <div className="space-y-3 p-5" style={{ transformStyle: "preserve-3d" }}>
            <motion.p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase" style={{ translateZ: 30 }}>
              Motion Conf 2026
            </motion.p>
            <motion.p className="text-2xl leading-tight font-semibold" style={{ translateZ: 50 }}>
              Springs &amp; Splines
            </motion.p>
            <motion.div className="grid grid-cols-3 gap-2 text-xs" style={{ translateZ: 25 }}>
              {[["Date", "14 Nov"], ["Row", "B"], ["Seat", "12"]].map(([k, v]) => (
                <div key={k}>
                  <p className="text-muted-foreground">{k}</p>
                  <p className="text-sm font-semibold">{v}</p>
                </div>
              ))}
            </motion.div>
          </div>
          {/* perforation */}
          <div className="relative h-0 border-t-2 border-dashed">
            <span className="bg-background absolute -top-3 -left-3 size-6 rounded-full border" />
            <span className="bg-background absolute -top-3 -right-3 size-6 rounded-full border" />
          </div>
          <div className="flex items-center gap-3 p-5" style={{ transformStyle: "preserve-3d" }}>
            <motion.div className="flex h-10 flex-1 items-stretch gap-[2px]" style={{ translateZ: 20 }} aria-label="Ticket barcode" role="img">
              {bars.map((w, i) => (
                <span key={i} className="bg-foreground" style={{ width: w }} />
              ))}
            </motion.div>
            <motion.div style={{ translateZ: 40 }}>
              <Button size="sm" disabled={disabled} data-hover-target>
                <Wallet /> Add
              </Button>
            </motion.div>
          </div>
        </Card>
        {/* glare */}
        <motion.div className="pointer-events-none absolute inset-0 rounded-xl mix-blend-soft-light" style={{ background: glare }} animate={{ opacity: active ? 1 : 0 }} />
      </motion.div>
    </div>
  )
}
