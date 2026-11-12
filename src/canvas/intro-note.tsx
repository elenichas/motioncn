import { motion } from "motion/react"
import { Copy, Hand, MousePointer2, Palette, ZoomIn } from "lucide-react"

const tips = [
  { icon: Hand, text: "Drag the background (or hold Space) to pan" },
  { icon: ZoomIn, text: "Pinch, or Ctrl/⌘ + scroll, to zoom" },
  { icon: MousePointer2, text: "Drag a frame’s title to move it; double-click to zoom in" },
  { icon: Palette, text: "Click a frame and the toolbar edits just that frame" },
  { icon: Copy, text: "Turn on A11y check and hover anything to audit it" },
]

export function IntroNote() {
  return (
    <div className="w-full space-y-4">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">motioncn</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Animated shadcn, on a canvas.</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          38 live React + Tailwind + shadcn components with Motion on top, in 8 categories.
        </p>
      </div>
      <ul className="space-y-2.5">
        {tips.map((t, i) => (
          <motion.li
            key={t.text}
            className="flex items-center gap-3 text-sm"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.07 }}
          >
            <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md">
              <t.icon className="size-3.5" />
            </span>
            {t.text}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
