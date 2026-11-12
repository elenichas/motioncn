import { motion } from "motion/react"
import { Plus } from "lucide-react"
import { categories, COL, ROW, SECTION_X, W } from "@/registry"

/**
 * Figma-style sections behind each category row, with dashed "coming next"
 * placeholders so the roadmap is visible on the canvas. Sections don't capture
 * pointer events beyond panning (they are not [data-frame]).
 */
export function Sections({ zoom }: { zoom: number }) {
  return (
    <>
      {categories.map((c, r) => {
        const slots = c.built.length + c.next.length
        const width = slots * COL + 40
        return (
          <div key={c.id} className="absolute" style={{ left: SECTION_X - 40, top: r * ROW - 70, width, height: ROW - 130 }}>
            <div className="bg-background/35 border-border absolute inset-0 rounded-[28px] border" />
            {/* title sits above the section and is counter-scaled, like Figma section names */}
            <div
              className="absolute bottom-full left-0 flex origin-bottom-left items-baseline gap-2 pb-2 whitespace-nowrap"
              style={{ transform: `scale(${Math.min(1 / zoom, 4.5)})` }}
            >
              <span className="text-lg font-semibold tracking-tight">{c.title}</span>
              <span className="text-muted-foreground text-sm">{c.blurb}</span>
              <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs tabular-nums">
                {c.next.length ? `${c.built.length} / ${slots}` : c.built.length}
              </span>
            </div>
            {c.next.map((n, i) => (
              <motion.div
                key={n}
                className="text-muted-foreground absolute flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed"
                style={{ left: 40 + (c.built.length + i) * COL, top: 70, width: W, height: 288 }}
                whileHover={{ scale: 1.01 }}
              >
                <Plus className="size-6 opacity-60" />
                <span className="text-sm font-medium">{n}</span>
                <span className="text-xs opacity-70">Coming next</span>
              </motion.div>
            ))}
          </div>
        )
      })}
    </>
  )
}
