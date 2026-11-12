import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { BookOpen, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useDemoState } from "./demo-state"
import { cn } from "@/lib/utils"

type Book = { id: number; title: string; author: string; tone: string; h: number; w: number; blurb: string }
const books: Book[] = [
  { id: 1, title: "The Spring Curve", author: "I. Stiffness", tone: "bg-primary text-primary-foreground border-transparent", h: 150, w: 34, blurb: "A coming-of-age story about a damping ratio that learns to let go." },
  { id: 2, title: "Easing In", author: "C. Bezier", tone: "bg-secondary text-secondary-foreground", h: 136, w: 28, blurb: "Slow starts, strong finishes: essays on cubic curves." },
  { id: 3, title: "Layout Shift", author: "F. Lip", tone: "bg-foreground text-background border-transparent", h: 160, w: 38, blurb: "A thriller in which every element knows where it came from." },
  { id: 4, title: "Keyframes", author: "T. Weener", tone: "bg-muted text-foreground", h: 128, w: 26, blurb: "Poems written at 60 frames per second." },
  { id: 5, title: "Reduced Motion", author: "A. Ccessible", tone: "bg-card text-card-foreground", h: 144, w: 30, blurb: "A quiet book. Nothing moves, and that is the point." },
  { id: 6, title: "Bounce", author: "O. Vershoot", tone: "bg-foreground/85 text-background border-transparent", h: 132, w: 32, blurb: "One ball, one floor, many feelings." },
]

/**
 * Soft-skeuomorphic bookshelf in shadcn tokens: spines are buttons; the opened page is a shadcn Card with shadcn Buttons.
 * Hover: the spine lifts and tilts out of the shelf. Disabled: books can't be pulled out, shelf dims.
 */
export function Bookshelf() {
  const [open, setOpen] = useState<Book | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const { disabled, forceHover } = useDemoState()
  const hoverId = disabled ? null : forceHover ? 3 : over

  return (
    <div className={"relative flex w-[340px] flex-col items-center transition-[filter,opacity] " + (disabled ? "opacity-60 grayscale-[.6]" : "")}>
      <div className="relative w-full" style={{ perspective: 900 }}>
        {/* back panel */}
        <div className="bg-muted/60 absolute inset-x-0 top-0 bottom-0 rounded-xl border" />
        <div className="relative flex h-48 items-end justify-center gap-1.5 px-4 pb-3.5">
          {books.map((b, i) => (
            <motion.button
              key={b.id}
              aria-label={`${b.title} by ${b.author}`}
              onClick={() => setOpen(b)}
              onPointerEnter={() => setOver(b.id)}
              onPointerLeave={() => setOver(null)}
              className={cn(
                "relative flex shrink-0 items-center justify-center rounded-md border shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed",
                b.tone,
              )}
              style={{ width: b.w, height: b.h, transformOrigin: "bottom center" }}
              animate={{
                y: open?.id === b.id ? -170 : hoverId === b.id ? -12 : 0,
                rotate: hoverId === b.id ? (i === 4 ? 1 : -3) : i === 4 ? 4 : 0,
                opacity: open?.id === b.id ? 0 : 1,
                boxShadow: hoverId === b.id ? "0 8px 16px -6px rgb(0 0 0 / .25)" : "0 1px 2px rgb(0 0 0 / .05)",
              }}
              whileTap={disabled ? undefined : { y: -16 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <span className="absolute inset-x-1.5 top-2 h-1 rounded-full bg-current opacity-25" />
              <span className="text-xs font-medium whitespace-nowrap" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                {b.title}
              </span>
            </motion.button>
          ))}
        </div>
        {/* shelf plank */}
        <div className="bg-border absolute inset-x-3 bottom-2.5 h-1 rounded-full" />
      </div>
      <p className="text-muted-foreground mt-4 text-xs">{disabled ? "Disabled" : "Hover a spine · click to pull it out"}</p>

      <AnimatePresence>
        {open && (
          <motion.div
            key={open.id}
            className="absolute inset-0 z-20 flex items-center justify-center"
            style={{ perspective: 1000 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div className="bg-background/60 absolute inset-[-24px] rounded-xl backdrop-blur-sm" onClick={() => setOpen(null)} />
            <motion.div
              className="relative flex"
              initial={{ y: -60, rotateX: 25, scale: 0.6 }}
              animate={{ y: 0, rotateX: 0, scale: 1 }}
              exit={{ y: -60, scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* page (revealed as the cover swings open) */}
              <Card className="h-52 w-36 justify-between gap-0 rounded-l-none rounded-r-md p-3 shadow-xl">
                <p className="text-xs leading-relaxed">{open.blurb}</p>
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 flex-1 text-xs">
                    <BookOpen className="size-3" /> Read
                  </Button>
                  <Button size="icon" variant="outline" className="size-7" onClick={() => setOpen(null)} aria-label="Close">
                    <X className="size-3" />
                  </Button>
                </div>
              </Card>
              {/* cover, hinged on its left edge */}
              <motion.div
                className={cn("absolute inset-y-0 left-0 flex w-36 flex-col justify-between rounded-r-md border p-3 shadow-xl", open.tone)}
                style={{ transformOrigin: "left center", backfaceVisibility: "hidden" }}
                initial={{ rotateY: 0 }}
                animate={{ rotateY: -160 }}
                exit={{ rotateY: 0 }}
                transition={{ delay: 0.35, type: "spring", stiffness: 90, damping: 16 }}
              >
                <p className="text-lg leading-tight font-semibold">{open.title}</p>
                <p className="text-xs opacity-80">{open.author}</p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
