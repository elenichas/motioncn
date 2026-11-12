import { useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Bell, CalendarDays, GitPullRequest, MessageCircle, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useDemoState, useHover } from "./demo-state"

const pool = [
  { icon: MessageCircle, title: "New comment", body: "Maya: “Love the spring on that tab pill.”" },
  { icon: GitPullRequest, title: "PR merged", body: "feat(slider): mood face morphing" },
  { icon: CalendarDays, title: "Design review", body: "Today at 15:30 · Canvas room" },
  { icon: Bell, title: "Reminder", body: "Test with reduced motion enabled" },
]
type Note = { id: number; icon: (typeof pool)[number]["icon"]; title: string; body: string }

const H = 64
const GAP = 8

/**
 * Sonner-style stack of shadcn Cards: swipe to dismiss, new ones drop in.
 * Hover: the stack fans out. Disabled: stays collapsed, no swipe, dimmed.
 */
export function NotificationStack() {
  const next = useRef(3)
  const [notes, setNotes] = useState<Note[]>(() => pool.slice(0, 3).map((p, i) => ({ ...p, id: i })))
  const { disabled } = useDemoState()
  const { hovered: open, hoverProps } = useHover()

  const add = () => {
    const p = pool[next.current % pool.length]
    setNotes((n) => [{ ...p, id: next.current++ }, ...n].slice(0, 6))
  }
  const remove = (id: number) => setNotes((n) => n.filter((x) => x.id !== id))
  const visible = notes.slice(0, open ? 6 : 3)
  const height = open ? notes.length * (H + GAP) - GAP : H + Math.min(notes.length - 1, 2) * 10

  return (
    <div className="flex w-72 flex-col items-center gap-4">
      <motion.div
        className="relative w-full"
        animate={{ height: Math.max(height, H) }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
        {...hoverProps}
      >
        <AnimatePresence initial={false}>
          {visible.map((n, i) => (
            <motion.div
              key={n.id}
              layout={false}
              drag={disabled ? false : "x"}
              dragSnapToOrigin
              onDragEnd={(_, info) => Math.abs(info.offset.x) > 90 && remove(n.id)}
              className={cn("absolute inset-x-0 top-0 cursor-grab active:cursor-grabbing", disabled && "cursor-not-allowed opacity-60")}
              style={{ height: H, zIndex: 10 - i }}
              initial={{ y: -30, opacity: 0, scale: 0.9 }}
              animate={{
                y: open ? i * (H + GAP) : i * 10,
                scale: open ? 1 : 1 - i * 0.05,
                opacity: open ? 1 : i > 2 ? 0 : 1 - i * 0.15,
              }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
            >
              <Card className="h-full flex-row items-center gap-3 rounded-xl px-3 py-0 shadow-md">
              <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <n.icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{n.title}</p>
                <p className="text-muted-foreground truncate text-xs">{n.body}</p>
              </div>
              <button aria-label="Dismiss" onClick={() => remove(n.id)} className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-50">
                <X className="size-4" />
              </button>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        {notes.length === 0 && <p className="text-muted-foreground pt-5 text-center text-sm">You’re all caught up</p>}
      </motion.div>
      <Button size="sm" variant="outline" onClick={add}>
        <Plus /> Add notification
      </Button>
      <p className="text-muted-foreground text-xs">{disabled ? "Disabled" : "Hover to expand · swipe to dismiss"}</p>
    </div>
  )
}
