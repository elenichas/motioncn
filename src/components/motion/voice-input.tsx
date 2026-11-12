import { useEffect, useId, useRef, useState } from "react"
import { AnimatePresence, motion, useMotionValue, useReducedMotionConfig, useSpring, useTransform, type MotionValue } from "motion/react"
import { ArrowUp, Keyboard, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Shimmer } from "./text-shimmer"
import { useDemoState, useHover } from "./demo-state"

const HEARD = "make the save button a little bouncier please"
const BLOB = [
  "60% 40% 30% 70% / 60% 30% 70% 40%",
  "30% 60% 70% 40% / 50% 60% 30% 60%",
  "50% 50% 40% 60% / 40% 50% 60% 50%",
  "60% 40% 30% 70% / 60% 30% 70% 40%",
]

/** A little blob with a face. `level` (0–1) opens its mouth and squishes it. */
function Blob({ level, size, mood, look }: { level: MotionValue<number>; size: number; mood: "awake" | "sleepy" | "excited"; look?: number }) {
  const reduced = useReducedMotionConfig()
  const mouth = useTransform(level, [0, 1], [0.15, 1])
  const squash = useTransform(level, [0, 1], [1, 1.12])
  const eye = size * 0.14
  return (
    <motion.div
      className="bg-primary relative flex items-center justify-center shadow-lg"
      style={{
        width: size,
        height: size,
        scale: squash,
        backgroundImage: "radial-gradient(circle at 30% 25%, color-mix(in oklab, var(--primary-foreground) 35%, transparent), transparent 55%)",
      }}
      animate={reduced ? { borderRadius: "50%" } : { borderRadius: BLOB }}
      transition={{ duration: mood === "excited" ? 2.2 : 5, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden
    >
      {/* eyes */}
      <div className="absolute flex" style={{ top: size * 0.32, gap: size * 0.16 }}>
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            className="bg-primary-foreground relative block rounded-full"
            style={{ width: eye, height: eye }}
            animate={mood === "sleepy" ? { scaleY: 0.12 } : reduced ? { scaleY: 1 } : { scaleY: [1, 1, 0.1, 1, 1] }}
            transition={mood === "sleepy" ? { duration: 0.3 } : { duration: 3.2, repeat: Infinity, times: [0, 0.9, 0.93, 0.96, 1], delay: i * 0.02 }}
          >
            {mood !== "sleepy" && (
              <motion.span
                className="bg-primary absolute rounded-full"
                style={{ width: eye * 0.5, height: eye * 0.5, top: eye * 0.25, left: eye * 0.25 }}
                animate={{ x: (look ?? 0) * eye * 0.2, y: mood === "excited" ? -eye * 0.12 : 0 }}
              />
            )}
          </motion.span>
        ))}
      </div>
      {/* mouth */}
      <motion.span
        className="bg-primary-foreground absolute rounded-full"
        style={{ top: size * 0.58, width: size * 0.2, height: size * 0.14, scaleY: mood === "sleepy" ? 0.15 : mouth, originY: 0 }}
      />
      {/* blush */}
      {mood === "excited" && (
        <>
          <span className="bg-primary-foreground/30 absolute rounded-full" style={{ top: size * 0.52, left: size * 0.14, width: size * 0.14, height: size * 0.08 }} />
          <span className="bg-primary-foreground/30 absolute rounded-full" style={{ top: size * 0.52, right: size * 0.14, width: size * 0.14, height: size * 0.08 }} />
        </>
      )}
    </motion.div>
  )
}

/**
 * Whimsical voice ↔ text input for the AI category. Type in a shadcn Input, or tap the
 * mic: the field morphs into a listening blob that bounces to the (simulated) sound,
 * puffs out little notes, transcribes what it heard and drops it back into the field.
 * Built on shadcn Input and Button. Hover: the mini blob on the mic button wakes up and waves.
 * Disabled: the blob falls asleep and controls are disabled.
 */
export function VoiceInput() {
  const id = useId()
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const reduced = useReducedMotionConfig()
  const [mode, setMode] = useState<"text" | "voice">("text")
  const [text, setText] = useState("")
  const [heard, setHeard] = useState("")
  const [notes, setNotes] = useState<number[]>([])
  const [sent, setSent] = useState<string | null>(null)
  const raw = useMotionValue(0)
  const level = useSpring(raw, { stiffness: 300, damping: 18 })
  const timers = useRef<number[]>([])
  const clear = () => {
    timers.current.forEach((t) => (clearInterval(t), clearTimeout(t)))
    timers.current = []
  }
  useEffect(() => clear, [])

  // simulated listening: a wobbly sound level, words arriving, notes floating up
  useEffect(() => {
    if (mode !== "voice") return
    const words = HEARD.split(" ")
    let w = 0
    let n = 0
    setHeard("")
    timers.current.push(window.setInterval(() => raw.set(Math.random() * 0.9 + 0.1), 140))
    timers.current.push(
      window.setInterval(() => {
        w++
        setHeard(words.slice(0, w).join(" "))
        if (w >= words.length) {
          clear()
          raw.set(0)
          timers.current.push(window.setTimeout(() => finish(words.join(" ")), 700))
        }
      }, 330),
    )
    if (!reduced) timers.current.push(window.setInterval(() => setNotes((ns) => [...ns.slice(-5), n++]), 450))
    return clear
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const finish = (s: string) => {
    setMode("text")
    setText(s)
    setNotes([])
  }
  const toggle = () => {
    if (mode === "voice") {
      clear()
      raw.set(0)
      finish(heard)
    } else setMode("voice")
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setSent(text.trim())
    setText("")
  }

  return (
    <div className="flex w-[340px] flex-col items-center gap-4" {...hoverProps}>
      <div className="flex h-8 items-end">
        <AnimatePresence mode="popLayout">
          {sent && (
            <motion.span key={sent} className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-1.5 text-sm" initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}>
              {sent}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <motion.form
        onSubmit={submit}
        className="bg-card relative flex items-center overflow-hidden border shadow-sm"
        initial={false}
        animate={mode === "voice" ? { width: 300, height: 200, borderRadius: 28 } : { width: 320, height: 52, borderRadius: 26 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {mode === "text" ? (
            <motion.div key="text" className="flex w-full items-center gap-1.5 pr-1.5 pl-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
              <label htmlFor={`${id}-msg`} className="sr-only">
                Message
              </label>
              <Input
                id={`${id}-msg`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type, or tap the blob to talk"
                disabled={disabled}
                className="h-9 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              <Button type="button" variant="ghost" size="icon" className="relative size-10 rounded-full" onClick={toggle} disabled={disabled} aria-label="Switch to voice input" data-hover-target>
                <motion.span
                  className="flex"
                  animate={hovered ? { y: [0, -4, 0], rotate: [0, -8, 8, 0] } : { y: 0, rotate: 0 }}
                  transition={{ duration: 0.8, repeat: hovered ? Infinity : 0, repeatDelay: 0.3 }}
                >
                  <Blob level={level} size={30} mood={disabled ? "sleepy" : hovered ? "excited" : "awake"} look={hovered ? 1 : 0} />
                </motion.span>
                {disabled && (
                  <motion.span className="text-muted-foreground absolute -top-1 right-0 text-[10px] font-semibold" animate={{ y: [0, -4], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} aria-hidden>
                    z
                  </motion.span>
                )}
              </Button>
              <Button type="submit" size="icon" className="size-9 rounded-full" disabled={disabled || !text.trim()} aria-label="Send message">
                <ArrowUp />
              </Button>
            </motion.div>
          ) : (
            <motion.div key="voice" className="relative flex h-full w-full flex-col items-center justify-center gap-3" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1, transition: { delay: 0.15 } }} exit={{ opacity: 0, scale: 0.8 }}>
              {/* floating notes */}
              <AnimatePresence>
                {notes.map((n) => (
                  <motion.span
                    key={n}
                    className="text-primary absolute text-lg"
                    style={{ left: `${30 + ((n * 37) % 40)}%`, top: "38%" }}
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 1, 0], y: -60, x: n % 2 ? 14 : -14, scale: 1, rotate: n % 2 ? 20 : -20 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.6, ease: "easeOut" }}
                    aria-hidden
                  >
                    {n % 3 === 0 ? "♪" : n % 3 === 1 ? "♫" : "•"}
                  </motion.span>
                ))}
              </AnimatePresence>
              <Blob level={level} size={76} mood="excited" />
              <div className="flex h-5 items-end gap-1" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Bar key={i} level={level} i={i} />
                ))}
              </div>
              <p className="max-w-[240px] text-center text-sm" aria-live="polite">
                {heard ? heard : <Shimmer active={!reduced}>Listening… (simulated)</Shimmer>}
              </p>
              <Button type="button" variant="outline" size="sm" className="absolute top-3 right-3 h-7 rounded-full px-2.5" onClick={toggle} aria-label="Switch to keyboard">
                <Keyboard /> Type
              </Button>
              <span className="text-muted-foreground absolute top-3 left-4 flex items-center gap-1 text-xs">
                <motion.span className="bg-destructive size-2 rounded-full" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                <Mic className="size-3" /> Rec
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.form>
      <p className="text-muted-foreground text-xs">{disabled ? "The blob is asleep (disabled)" : mode === "voice" ? "Tap Type to stop early" : "Voice is simulated in this demo"}</p>
    </div>
  )
}

function Bar({ level, i }: { level: MotionValue<number>; i: number }) {
  const h = useTransform(level, (v) => 4 + v * (10 + ((i * 7) % 5) * 2) * (i % 2 ? 0.8 : 1))
  return <motion.span className="bg-primary w-1.5 rounded-full" style={{ height: h }} />
}
