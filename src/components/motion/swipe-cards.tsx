import { useState } from "react"
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react"
import { Heart, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card as UICard } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useDemoState, useHover } from "./demo-state"
import { themes, themeVars } from "@/lib/themes"

type Card = { id: string; name: string }
const deck: Card[] = themes.slice(2).map((t) => ({ id: t.id, name: t.name }))

type Dir = -1 | 1

function SwipeCard({ card, top, depth, onSwipe, hovered, disabled }: { card: Card; top: boolean; depth: number; onSwipe: (d: Dir) => void; hovered: boolean; disabled: boolean }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-18, 18])
  const like = useTransform(x, [20, 110], [0, 1])
  const nope = useTransform(x, [-110, -20], [1, 0])

  return (
    <motion.div
      className={cn("absolute inset-0 touch-none", top && !disabled && "cursor-grab active:cursor-grabbing")}
      style={{ x, rotate, zIndex: 10 - depth, ...(themeVars(card.id, "light") as React.CSSProperties) }}
      drag={top && !disabled ? "x" : false}
      dragSnapToOrigin
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        const d = info.offset.x + info.velocity.x * 0.2
        if (Math.abs(d) > 120) onSwipe(d > 0 ? 1 : -1)
      }}
      variants={{
        enter: { scale: 0.9, y: 30, opacity: 0 },
        stack: {
          scale: 1 - depth * 0.05 + (top && hovered ? 0.02 : 0),
          y: depth * 12 + (top && hovered ? -8 : 0),
          rotateZ: top && hovered ? -3 : 0,
          opacity: depth > 2 ? 0 : 1,
        },
        // `custom` comes from AnimatePresence, so the exit always uses the latest direction
        fly: (d: Dir) => ({ x: d * 420, rotate: d * 30, opacity: 0, transition: { duration: 0.35 } }),
      }}
      initial="enter"
      animate="stack"
      exit="fly"
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
    >
      <UICard className="h-full gap-0 overflow-hidden rounded-2xl py-0 shadow-lg">
      <div className="bg-primary relative flex h-40 items-end p-4">
        <div className="bg-primary-foreground/20 absolute top-4 right-4 size-16 rounded-full" />
        <div className="bg-primary-foreground/10 absolute top-14 right-14 size-10 rounded-full" />
        <p className="text-primary-foreground text-2xl font-semibold">{card.name}</p>
      </div>
      <div className="space-y-2 p-4">
        <p className="text-sm font-medium">Would you ship this theme?</p>
        <div className="flex gap-1.5">
          <span className="bg-primary h-6 flex-1 rounded-md" />
          <span className="bg-secondary h-6 flex-1 rounded-md border" />
          <span className="bg-muted h-6 flex-1 rounded-md" />
        </div>
      </div>
      </UICard>
      <motion.span style={{ opacity: like }} className="absolute top-5 left-4 -rotate-12 rounded-md border-2 border-emerald-500 bg-white/90 px-2 py-0.5 text-lg font-black text-emerald-500">
        LIKE
      </motion.span>
      <motion.span style={{ opacity: nope }} className="absolute top-5 right-4 rotate-12 rounded-md border-2 border-rose-500 bg-white/90 px-2 py-0.5 text-lg font-black text-rose-500">
        NOPE
      </motion.span>
    </motion.div>
  )
}

/**
 * Tinder-style deck of shadcn Cards with shadcn Buttons; cards fly out by direction.
 * Hover: the top card lifts and tilts, inviting a drag. Disabled: no drag, buttons disabled.
 */
export function SwipeCards() {
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const [cards, setCards] = useState(deck)
  const [liked, setLiked] = useState<Card[]>([])
  const [history, setHistory] = useState<{ card: Card; dir: Dir }[]>([])
  const [exitDir, setExitDir] = useState<Dir>(1)
  const [pulse, setPulse] = useState<Dir | null>(null)

  const swipe = (dir: Dir) => {
    const top = cards[0]
    if (!top) return
    setExitDir(dir)
    setPulse(dir)
    setTimeout(() => setPulse(null), 250)
    setCards((c) => c.slice(1))
    setHistory((h) => [...h, { card: top, dir }])
    if (dir === 1) setLiked((l) => [...l, top])
  }
  const undo = () => {
    const last = history.at(-1)
    if (!last) return
    setHistory((h) => h.slice(0, -1))
    setCards((c) => [last.card, ...c])
    if (last.dir === 1) setLiked((l) => l.filter((x) => x.id !== last.card.id))
  }
  const reset = () => {
    setCards(deck)
    setLiked([])
    setHistory([])
  }

  return (
    <div className="flex w-64 flex-col items-center gap-5">
      <div className={cn("relative h-64 w-full transition-opacity", disabled && "opacity-60")} {...hoverProps}>
        <AnimatePresence custom={exitDir}>
          {cards.slice(0, 3).map((c, i) => (
            <SwipeCard key={c.id} card={c} top={i === 0} depth={i} onSwipe={swipe} hovered={hovered} disabled={disabled} />
          ))}
        </AnimatePresence>
        {cards.length === 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-4 text-center">
            <p className="text-sm font-semibold">You liked {liked.length}</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {liked.map((l, i) => (
                <motion.span key={l.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.06 }} className="bg-secondary rounded-full px-2 py-0.5 text-xs">
                  {l.name}
                </motion.span>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={reset}>
              Start over
            </Button>
          </motion.div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <motion.div animate={pulse === -1 ? { scale: [1, 1.2, 1] } : {}}>
          <Button size="icon" variant="outline" className="size-12 rounded-full text-rose-500" onClick={() => swipe(-1)} aria-label="Nope" disabled={disabled || !cards.length}>
            <X className="size-5" />
          </Button>
        </motion.div>
        <Button size="icon" variant="ghost" className="rounded-full" onClick={undo} aria-label="Undo" disabled={disabled || !history.length}>
          <RotateCcw />
        </Button>
        <motion.div animate={pulse === 1 ? { scale: [1, 1.2, 1] } : {}}>
          <Button size="icon" variant="outline" className="size-12 rounded-full text-emerald-600" onClick={() => swipe(1)} aria-label="Like" disabled={disabled || !cards.length}>
            <Heart className="size-5" />
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
