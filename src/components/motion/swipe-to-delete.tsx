import { useRef, useState } from "react"
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react"
import { Archive, Trash2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDemoState, useHover } from "./demo-state"

type Mail = { id: number; from: string; subject: string }
const INBOX: Mail[] = [
  { id: 1, from: "Design team", subject: "New spring presets are in" },
  { id: 2, from: "Calendar", subject: "Motion review moved to 3pm" },
  { id: 3, from: "Billing", subject: "Your invoice for November" },
]
const THRESHOLD = 110

function Row({ mail, onAction, peek }: { mail: Mail; onAction: (m: Mail, a: "archive" | "delete") => void; peek: boolean }) {
  const { disabled } = useDemoState()
  const x = useMotionValue(0)
  const archiveOpacity = useTransform(x, [20, THRESHOLD], [0, 1])
  const deleteOpacity = useTransform(x, [-THRESHOLD, -20], [1, 0])
  const iconScale = useTransform(x, [-THRESHOLD - 20, -THRESHOLD, 0, THRESHOLD, THRESHOLD + 20], [1.2, 1, 0.6, 1, 1.2])

  return (
    <motion.li
      className="relative overflow-hidden rounded-lg"
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
    >
      {/* actions revealed underneath */}
      <motion.div className="bg-primary text-primary-foreground absolute inset-0 flex items-center pl-4" style={{ opacity: archiveOpacity }} aria-hidden>
        <motion.span style={{ scale: iconScale }} className="flex items-center gap-1.5 text-sm font-medium">
          <Archive className="size-4" /> Archive
        </motion.span>
      </motion.div>
      <motion.div className="bg-destructive absolute inset-0 flex items-center justify-end pr-4 text-white" style={{ opacity: deleteOpacity }} aria-hidden>
        <motion.span style={{ scale: iconScale }} className="flex items-center gap-1.5 text-sm font-medium">
          Delete <Trash2 className="size-4" />
        </motion.span>
      </motion.div>

      <motion.div
        className={cn("bg-card group relative flex items-center gap-3 rounded-lg border px-3 py-2.5", !disabled && "cursor-grab active:cursor-grabbing")}
        style={{ x }}
        drag={disabled ? false : "x"}
        dragSnapToOrigin
        dragElastic={0.6}
        animate={peek ? { x: [0, -28, 0] } : {}}
        transition={peek ? { duration: 1.4, repeat: Infinity, repeatDelay: 0.8 } : undefined}
        onDragEnd={(_, info) => {
          const d = info.offset.x + info.velocity.x * 0.15
          if (d > THRESHOLD) onAction(mail, "archive")
          else if (d < -THRESHOLD) onAction(mail, "delete")
        }}
      >
        <span className="bg-secondary text-secondary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">{mail.from[0]}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{mail.from}</p>
          <p className="text-muted-foreground truncate text-xs">{mail.subject}</p>
        </div>
        {/* keyboard / pointer alternatives to swiping */}
        <div className="flex gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => onAction(mail, "archive")} disabled={disabled} aria-label={`Archive ${mail.subject}`}>
            <Archive />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => onAction(mail, "delete")} disabled={disabled} aria-label={`Delete ${mail.subject}`}>
            <Trash2 />
          </Button>
        </div>
      </motion.div>
    </motion.li>
  )
}

/**
 * Inbox rows you swipe right to archive or left to delete, with the action revealed underneath,
 * rows collapsing out and an Undo toast. Buttons appear on hover/focus as a keyboard alternative.
 * Built on shadcn Button. Hover: the first row peeks left to hint at the gesture.
 * Disabled: no swiping, actions disabled.
 */
export function SwipeToDelete() {
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const [mails, setMails] = useState(INBOX)
  const [last, setLast] = useState<{ mail: Mail; action: "archive" | "delete"; index: number } | null>(null)
  const timer = useRef(0)

  const act = (mail: Mail, action: "archive" | "delete") => {
    const index = mails.findIndex((m) => m.id === mail.id)
    setMails((ms) => ms.filter((m) => m.id !== mail.id))
    setLast({ mail, action, index })
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setLast(null), 3500)
  }
  const undo = () => {
    if (!last) return
    setMails((ms) => [...ms.slice(0, last.index), last.mail, ...ms.slice(last.index)])
    setLast(null)
  }

  return (
    <div className={cn("flex w-80 flex-col gap-3", disabled && "opacity-60")} {...hoverProps}>
      <ul className="space-y-2" aria-label="Inbox">
        <AnimatePresence initial={false}>
          {mails.map((m, i) => (
            <Row key={m.id} mail={m} onAction={act} peek={hovered && i === 0} />
          ))}
        </AnimatePresence>
        {mails.length === 0 && (
          <motion.li initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-muted-foreground py-6 text-center text-sm">
            Inbox zero ✨
            <Button variant="link" size="sm" onClick={() => setMails(INBOX)}>
              Refill
            </Button>
          </motion.li>
        )}
      </ul>
      <div className="h-10" aria-live="polite">
        <AnimatePresence>
          {last && (
            <motion.div className="bg-foreground text-background flex items-center justify-between rounded-lg px-3 py-2 text-sm" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}>
              {last.action === "archive" ? "Archived" : "Deleted"} “{last.mail.subject.slice(0, 18)}…”
              <button onClick={undo} className="flex items-center gap-1 rounded px-1.5 py-0.5 font-medium underline-offset-2 hover:underline">
                <Undo2 className="size-3.5" /> Undo
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="text-muted-foreground -mt-2 text-center text-xs">{disabled ? "Disabled" : "Swipe right to archive, left to delete"}</p>
    </div>
  )
}
