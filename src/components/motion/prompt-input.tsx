import { useEffect, useId, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react"
import { ArrowUp, Check, ChevronDown, Paperclip, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Shimmer } from "./text-shimmer"
import { useDemoState, useHover } from "./demo-state"

const SUGGESTIONS = ["Animate a pricing card", "Make my tabs feel springy", "Add a hover state"]
const MODELS = ["Spark 2", "Spark mini"]
type Status = "idle" | "streaming"

/**
 * Extends shadcn's Prompt Input + Suggestion patterns (AI Elements):
 * suggestion chips cascade in and type themselves into the box, the model picker
 * springs open, and the submit button morphs into a stop button with a progress ring.
 * Built on shadcn Textarea and Button. Hover: the input glows and the send button perks up.
 * Disabled: input and actions disabled.
 */
export function PromptInput() {
  const id = useId()
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const reduced = useReducedMotionConfig()
  const [text, setText] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [sent, setSent] = useState<string | null>(null)
  const [model, setModel] = useState(MODELS[0])
  const [picker, setPicker] = useState(false)
  const typing = useRef<number>(0)
  const done = useRef<number>(0)
  useEffect(() => () => (clearInterval(typing.current), clearTimeout(done.current)), [])

  const typeIn = (s: string) => {
    clearInterval(typing.current)
    if (reduced) return setText(s)
    let i = 0
    setText("")
    typing.current = window.setInterval(() => {
      i++
      setText(s.slice(0, i))
      if (i >= s.length) clearInterval(typing.current)
    }, 22)
  }

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (status === "streaming") {
      clearTimeout(done.current)
      return setStatus("idle")
    }
    if (!text.trim()) return
    setSent(text.trim())
    setText("")
    setStatus("streaming")
    done.current = window.setTimeout(() => setStatus("idle"), 2800)
  }

  const canSend = !disabled && (status === "streaming" || !!text.trim())

  return (
    <div className="flex w-[340px] flex-col gap-3" {...hoverProps}>
      {/* mini conversation */}
      <div className="flex min-h-[72px] flex-col justify-end gap-2">
        <AnimatePresence mode="popLayout">
          {sent && (
            <motion.div key={sent} className="flex flex-col gap-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <span className="bg-primary text-primary-foreground ml-auto max-w-[85%] rounded-2xl rounded-br-sm px-3 py-1.5 text-sm">{sent}</span>
              <span className="text-sm" aria-live="polite">
                {status === "streaming" ? <Shimmer active={!reduced}>{`${model} is writing…`}</Shimmer> : <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Here’s a spring config to start: stiffness 300, damping 24.</motion.span>}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {!sent && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Suggestions">
            {SUGGESTIONS.map((s, i) => (
              <motion.li key={s} initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.1 + i * 0.07, type: "spring", bounce: 0.3 }}>
                <Button size="sm" variant="outline" className="h-7 rounded-full px-3 text-xs" disabled={disabled} onClick={() => typeIn(s)}>
                  {s}
                </Button>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {/* the prompt input */}
      <motion.form
        onSubmit={submit}
        className={cn("bg-card relative rounded-2xl border shadow-sm transition-colors", hovered && "border-ring")}
        animate={{ boxShadow: hovered ? "0 0 0 4px color-mix(in oklab, var(--ring) 25%, transparent)" : "0 1px 2px rgb(0 0 0 / .05)" }}
      >
        <label htmlFor={`${id}-prompt`} className="sr-only">
          Message
        </label>
        <Textarea
          id={`${id}-prompt`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e)
          }}
          placeholder="Ask anything…"
          disabled={disabled}
          className="min-h-14 resize-none border-0 bg-transparent px-3.5 pt-3 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="flex items-center gap-1 px-2 pb-2">
          <Button type="button" variant="ghost" size="icon" className="text-muted-foreground size-8" disabled={disabled} aria-label="Attach a file">
            <Paperclip />
          </Button>
          <div className="relative">
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground h-8 gap-1 px-2" disabled={disabled} onClick={() => setPicker((p) => !p)} aria-expanded={picker} aria-haspopup="listbox">
              {model}
              <motion.span className="flex" animate={{ rotate: picker ? 180 : 0 }}>
                <ChevronDown />
              </motion.span>
            </Button>
            <AnimatePresence>
              {picker && (
                <motion.ul
                  role="listbox"
                  aria-label="Model"
                  className="bg-popover text-popover-foreground absolute bottom-full left-0 z-20 mb-1 w-36 origin-bottom-left rounded-lg border p-1 shadow-lg"
                  initial={{ opacity: 0, scale: 0.9, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  transition={{ type: "spring", bounce: 0.25, duration: 0.3 }}
                >
                  {MODELS.map((m) => (
                    <li key={m}>
                      <button type="button" role="option" aria-selected={m === model} onClick={() => (setModel(m), setPicker(false))} className="hover:bg-accent flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm">
                        {m} {m === model && <Check className="text-primary size-4" />}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
          <motion.div className="ml-auto" animate={{ scale: hovered && canSend && status === "idle" ? 1.08 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
            <Button type="submit" size="icon" className="relative size-8 rounded-full" disabled={!canSend} aria-label={status === "streaming" ? "Stop generating" : "Send message"}>
              {status === "streaming" && (
                <svg className="absolute -inset-1 size-10 -rotate-90" viewBox="0 0 40 40" aria-hidden>
                  <motion.circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.8, ease: "linear" }} />
                </svg>
              )}
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={status} className="flex" initial={{ scale: 0.3, rotate: -90, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.3, rotate: 90, opacity: 0 }} transition={{ type: "spring", bounce: 0.4, duration: 0.35 }}>
                  {status === "streaming" ? <Square className="fill-current" /> : <ArrowUp />}
                </motion.span>
              </AnimatePresence>
            </Button>
          </motion.div>
        </div>
      </motion.form>
    </div>
  )
}
