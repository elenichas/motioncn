import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useDemoState, useHover } from "./demo-state"

const PAGES = [
  { title: "Monday", lines: ["Sketch the mood slider", "Try a softer spring", "Ask Maya about tokens"] },
  { title: "Tuesday", lines: ["Swipe cards: add undo", "Fix tab contrast", "Coffee ☕"] },
  { title: "Wednesday", lines: ["Ship the registry", "Write the README", "Celebrate 🎉"] },
]

/**
 * Notebook with pages that turn in 3D around the spine, on lined paper drawn from theme tokens.
 * Built on shadcn Card and Button. Hover: the page corner curls up as a hint.
 * Disabled: page buttons disabled.
 */
export function NotebookFlip() {
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const [[page, dir], setPage] = useState<[number, number]>([0, 1])
  const go = (d: number) => setPage(([p]) => [Math.max(0, Math.min(PAGES.length - 1, p + d)), d])
  const p = PAGES[page]

  return (
    <div className="flex flex-col items-center gap-4" {...hoverProps}>
      <div className="relative" style={{ perspective: 1200 }}>
        <Card className="relative h-60 w-56 gap-0 overflow-visible rounded-l-sm rounded-r-xl p-0 shadow-md">
          {/* spine */}
          <span className="bg-primary absolute inset-y-0 left-0 w-3 rounded-l-sm" aria-hidden />
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={page}
              custom={dir}
              className="bg-card absolute inset-y-0 right-0 left-3 rounded-r-xl px-4 py-3"
              style={{
                transformOrigin: "left center",
                backfaceVisibility: "hidden",
                backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 27px, var(--border) 27px 28px)",
                backgroundPosition: "0 40px",
              }}
              variants={{
                enter: (d: number) => ({ rotateY: d > 0 ? 70 : -70, opacity: 0 }),
                center: { rotateY: 0, opacity: 1 },
                exit: (d: number) => ({ rotateY: d > 0 ? -110 : 110, opacity: 0, zIndex: 2 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            >
              <p className="mb-2 text-sm font-semibold">{p.title}</p>
              <ul className="space-y-[10px] text-sm leading-[18px]">
                {p.lines.map((l, i) => (
                  <motion.li key={l} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }}>
                    {l}
                  </motion.li>
                ))}
              </ul>
              <span className="text-muted-foreground absolute bottom-2 left-4 text-xs tabular-nums">
                {page + 1} / {PAGES.length}
              </span>
            </motion.div>
          </AnimatePresence>
          {/* corner curl hint */}
          <motion.span
            className="from-muted to-background absolute right-0 bottom-0 z-10 rounded-tl-lg rounded-br-xl bg-gradient-to-tl shadow-sm"
            initial={false}
            animate={{ width: hovered && page < PAGES.length - 1 ? 28 : 0, height: hovered && page < PAGES.length - 1 ? 28 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            aria-hidden
          />
        </Card>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => go(-1)} disabled={disabled || page === 0} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon" onClick={() => go(1)} disabled={disabled || page === PAGES.length - 1} aria-label="Next page">
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
