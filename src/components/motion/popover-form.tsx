import { useId, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { MessageSquare, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useDemoState, useHover } from "./demo-state"

type Phase = "closed" | "open" | "sent"

/**
 * A button that morphs into a feedback form and back (Cult UI's Popover Form idea).
 * Built on shadcn Button and Textarea. Size and radius animate explicitly
 * (not layoutId), so the morph stays correct at any canvas zoom.
 * Hover: the button lifts and the icon wiggles. Disabled: button disabled.
 */
export function PopoverForm() {
  const id = useId()
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const [phase, setPhase] = useState<Phase>("closed")
  const [text, setText] = useState("")
  const timer = useRef(0)

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setPhase("sent")
    timer.current = window.setTimeout(() => (setPhase("closed"), setText("")), 1600)
  }

  const size = phase === "closed" ? { width: 140, height: 40, borderRadius: 20 } : phase === "open" ? { width: 288, height: 196, borderRadius: 14 } : { width: 288, height: 120, borderRadius: 14 }

  return (
    <div className="flex h-56 items-center justify-center" {...hoverProps}>
      <motion.div
        className="bg-card text-card-foreground relative overflow-hidden border shadow-sm"
        initial={false}
        animate={{ ...size, y: phase === "closed" && hovered ? -2 : 0, boxShadow: phase === "closed" && hovered ? "0 10px 20px -10px rgb(0 0 0 / .35)" : "0 1px 2px rgb(0 0 0 / .06)" }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {phase === "closed" && (
            <motion.div key="btn" className="absolute inset-0" initial={{ opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0, filter: "blur(4px)" }}>
              <Button variant="ghost" className="size-full rounded-none" onClick={() => setPhase("open")} disabled={disabled} data-hover-target aria-expanded={false} aria-controls={id}>
                <motion.span className="flex" animate={hovered ? { rotate: [0, -12, 10, -6, 0] } : { rotate: 0 }} transition={{ duration: 0.6, repeat: hovered ? Infinity : 0, repeatDelay: 0.6 }}>
                  <MessageSquare />
                </motion.span>
                Feedback
              </Button>
            </motion.div>
          )}
          {phase === "open" && (
            <motion.form key="form" id={id} onSubmit={send} className="absolute inset-0 flex flex-col gap-2 p-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.12 } }} exit={{ opacity: 0, y: -8 }}>
              <div className="flex items-center justify-between">
                <label htmlFor={`${id}-msg`} className="text-sm font-semibold">
                  Send feedback
                </label>
                <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => setPhase("closed")} aria-label="Close feedback form">
                  <X />
                </Button>
              </div>
              <Textarea id={`${id}-msg`} value={text} onChange={(e) => setText(e.target.value)} placeholder="What would make this better?" className="flex-1 resize-none" autoFocus />
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setPhase("closed")}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!text.trim()}>
                  <Send /> Send
                </Button>
              </div>
            </motion.form>
          )}
          {phase === "sent" && (
            <motion.div key="sent" className="absolute inset-0 flex flex-col items-center justify-center gap-2" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} role="status">
              <svg viewBox="0 0 24 24" className="text-primary size-9" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <motion.circle cx="12" cy="12" r="10" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }} />
                <motion.path d="M7.5 12.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.3 }} />
              </svg>
              <p className="text-sm font-medium">Thanks for the feedback!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
