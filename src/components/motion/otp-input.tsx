import { useContext, useRef, useState } from "react"
import { AnimatePresence, motion, useAnimationControls } from "motion/react"
import { OTPInputContext, REGEXP_ONLY_DIGITS } from "input-otp"
import { InputOTP, InputOTPGroup } from "@/components/ui/input-otp"
import { cn } from "@/lib/utils"
import { useDemoState, useHover } from "./demo-state"

const LENGTH = 4
const CODE = "1234"
type Status = "idle" | "error" | "success"

/** Animated version of shadcn's InputOTPSlot: digits pop, caret blinks, slots wave. */
function AnimatedSlot({ index, status, hovered }: { index: number; status: Status; hovered: boolean }) {
  const ctx = useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = ctx.slots[index]
  return (
    <motion.div
      className={cn(
        "border-input bg-background relative flex size-14 items-center justify-center rounded-lg border-2 text-2xl font-semibold shadow-xs transition-colors",
        isActive && status === "idle" && "border-ring ring-ring/40 ring-[3px]",
        hovered && !isActive && "border-ring/50",
        status === "error" && "border-destructive text-destructive",
        status === "success" && "border-emerald-500 bg-emerald-500/10 text-emerald-600",
      )}
      animate={
        status === "success"
          ? { y: [0, -10, 0], scale: [1, 1.08, 1] }
          : hovered
            ? { y: [0, -4, 0] }
            : { y: 0, scale: 1 }
      }
      transition={{
        delay: index * 0.07,
        duration: status === "success" ? 0.45 : 1.2,
        repeat: hovered && status === "idle" ? Infinity : 0,
        repeatDelay: 0.4,
      }}
    >
      <AnimatePresence mode="popLayout">
        {char && (
          <motion.span
            key={char + index}
            initial={{ scale: 0.3, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
          >
            {char}
          </motion.span>
        )}
      </AnimatePresence>
      {hasFakeCaret && <span className="animate-caret-blink bg-foreground absolute h-6 w-0.5" />}
    </motion.div>
  )
}

/**
 * shadcn <InputOTP> with animated slots: wrong code shakes, right code celebrates.
 * Hover: slots ripple in a wave. Disabled: input disabled and dimmed.
 */
export function OtpInput() {
  const [value, setValue] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const controls = useAnimationControls()
  const timer = useRef<number>(0)

  const onChange = (v: string) => {
    clearTimeout(timer.current)
    if (status === "success") return
    setValue(v)
    setStatus("idle")
    if (v.length < LENGTH) return
    if (v === CODE) {
      setStatus("success")
      timer.current = window.setTimeout(() => (setValue(""), setStatus("idle")), 2200)
    } else {
      setStatus("error")
      controls.start({ x: [0, -12, 12, -9, 9, -4, 4, 0], transition: { duration: 0.45 } })
      timer.current = window.setTimeout(() => (setValue(""), setStatus("idle")), 750)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4" {...hoverProps}>
      <motion.div animate={controls}>
        <InputOTP maxLength={LENGTH} value={value} onChange={onChange} pattern={REGEXP_ONLY_DIGITS} disabled={disabled} aria-label="One-time code">
          <InputOTPGroup className="gap-2">
            {Array.from({ length: LENGTH }, (_, i) => (
              <AnimatedSlot key={i} index={i} status={status} hovered={hovered && !value} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </motion.div>
      <p className={cn("text-xs", status === "error" ? "text-destructive" : "text-muted-foreground")}>
        {disabled ? "Disabled" : status === "error" ? "Wrong code, try again" : status === "success" ? "Verified!" : `Type the code (hint: ${CODE})`}
      </p>
    </div>
  )
}
