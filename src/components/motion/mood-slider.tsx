import { useEffect, useState } from "react"
import { AnimatePresence, motion, useMotionValueEvent, useSpring, useTransform } from "motion/react"
import { Slider } from "@/components/ui/slider"
import { useDemoState, useHover } from "./demo-state"

const moods = [
  { max: 20, label: "Awful" },
  { max: 40, label: "Not great" },
  { max: 60, label: "Okay" },
  { max: 80, label: "Good" },
  { max: 101, label: "Fantastic" },
]

const bandOf = (v: number) => Math.min(4, Math.max(0, Math.floor(v / 20)))

/**
 * shadcn <Slider> driving a face that morphs with the value.
 * Hover: the face perks up and bobs. Disabled: slider disabled, face greys out.
 */
export function MoodSlider() {
  const [value, setValue] = useState(65)
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()
  const mood = useSpring(value, { stiffness: 180, damping: 20 })
  useEffect(() => mood.set(value), [value, mood])

  // Every facial feature is keyed to the centre of each mood band (10, 30, 50, 70, 90),
  // and the label is derived from the same spring value, so face and word always agree.
  const C = [0, 10, 30, 50, 70, 90, 100]
  const [band, setBand] = useState(() => bandOf(value))
  useMotionValueEvent(mood, "change", (v) => setBand(bandOf(v)))
  const low = band === 0

  const fill = useTransform(mood, C, ["#60a5fa", "#60a5fa", "#a5b4fc", "#fde68a", "#fcd34d", "#fbbf24", "#fbbf24"])
  const curve = useTransform(mood, C, [-20, -20, -9, 0, 12, 24, 26]) // − frown, 0 flat, + smile
  const mouth = useTransform(curve, (c) => {
    const width = c > 12 ? 22 + (c - 12) * 0.5 : 20
    return `M ${60 - width} 78 Q 60 ${78 + c} ${60 + width} 78`
  })
  const eyeRy = useTransform(mood, C, [6, 6, 7, 8, 7, 3.5, 3])
  // k > 0 lifts the inner ends of the brows (worried/sad); lift raises both (happy)
  const browK = useTransform(mood, C, [5, 5, 2.5, 0, 0, 0, 0])
  const browLift = useTransform(mood, C, [0, 0, 0, 0, 2, 5, 5])
  const browL = useTransform(() => { const k = browK.get(), y = 34 - browLift.get(); return `M 32 ${y + k} L 50 ${y - k}` })
  const browR = useTransform(() => { const k = browK.get(), y = 34 - browLift.get(); return `M 70 ${y - k} L 88 ${y + k}` })
  const cheeks = useTransform(mood, [55, 70, 90], [0, 0.35, 0.75])
  const tilt = useTransform(mood, C, [-5, -5, -2, 0, 2, 5, 5])
  const label = moods[band].label

  return (
    <div className="flex w-72 flex-col items-center gap-5" {...hoverProps}>
      <motion.svg
        viewBox="0 0 120 120"
        className="size-32 drop-shadow-lg"
        style={{ rotate: tilt }}
        animate={{ y: hovered ? [0, -6, 0] : 0, scale: hovered ? 1.06 : 1, filter: disabled ? "grayscale(1) opacity(.5)" : "grayscale(0) opacity(1)" }}
        transition={{ y: { duration: 1, repeat: hovered ? Infinity : 0 }, scale: { type: "spring", stiffness: 300, damping: 18 } }}
      >
        <motion.circle cx="60" cy="60" r="54" style={{ fill }} />
        <motion.ellipse cx="34" cy="74" rx="9" ry="5" fill="#fb7185" style={{ opacity: cheeks }} />
        <motion.ellipse cx="86" cy="74" rx="9" ry="5" fill="#fb7185" style={{ opacity: cheeks }} />
        <motion.ellipse cx="42" cy="50" rx="6" style={{ ry: eyeRy }} fill="#1f2937" />
        <motion.ellipse cx="78" cy="50" rx="6" style={{ ry: eyeRy }} fill="#1f2937" />
        <motion.path d={browL} stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
        <motion.path d={browR} stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
        <motion.path d={mouth} fill="none" stroke="#1f2937" strokeWidth="5" strokeLinecap="round" />
        <AnimatePresence>
          {low && (
            <motion.ellipse
              cx="42" rx="3" ry="5" fill="#bfdbfe"
              initial={{ cy: 58, opacity: 0 }}
              animate={{ cy: [58, 96], opacity: [1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeIn" }}
            />
          )}
        </AnimatePresence>
      </motion.svg>

      <div className="relative h-7 w-full overflow-hidden text-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={label}
            className="text-lg font-semibold"
            initial={{ y: 24, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.45 }}
          >
            {label}
          </motion.p>
        </AnimatePresence>
      </div>

      <Slider value={[value]} onValueChange={([v]) => setValue(v)} max={100} step={1} aria-label="Mood" disabled={disabled} />
      <div className="text-muted-foreground flex w-full justify-between text-xs">
        <span>Rough day</span>
        <span>Best day ever</span>
      </div>
    </div>
  )
}
