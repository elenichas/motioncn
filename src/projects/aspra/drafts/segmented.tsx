/**
 * Fixed Segmented.
 * - Segments are now 44px tall (was 36px) so they meet the touch-target minimum.
 * - Real radiogroup keyboard model: roving tabindex (one Tab stop), Arrow keys/Home/End move and select.
 * - The "dark" tone sits on a solid obsidian track with white text; the old translucent white/10 track
 *   inherited the light page behind it and gave 1.27:1 contrast on "Day". Inactive light text is ink-2 (AA).
 * - Selected state is no longer colour/fill only: it also shows a check mark and a heavier weight.
 * - Label text is 14px (was 13.5px), buttons have type="button", and focus uses the token ring
 *   (sea on light, sulphur on dark) with an offset that stays visible inside the pill.
 * - Animated pill respects reduced motion.
 */
import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Check } from "lucide-react"
import { cn } from "@repo/aspra/lib/utils"
import { EASE } from "@repo/aspra/components/aspra/ui"

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  tone = "light",
}: {
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (v: T) => void
  label: string
  tone?: "light" | "dark"
}) {
  const groupId = React.useId()
  const reduce = useReducedMotion()
  const refs = React.useRef<Array<HTMLButtonElement | null>>([])
  const dark = tone === "dark"

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = options.length - 1
    let next: number | null = null
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = index === last ? 0 : index + 1
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = index === 0 ? last : index - 1
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = last
    if (next === null) return
    e.preventDefault()
    onChange(options[next].id)
    refs.current[next]?.focus()
  }

  const activeIndex = Math.max(0, options.findIndex((o) => o.id === value))

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative grid rounded-full p-1",
        dark ? "on-dark bg-obsidian-2" : "border border-white/70 bg-white/70 backdrop-blur-md",
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o, i) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={i === activeIndex ? 0 : -1}
            onClick={() => onChange(o.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "relative min-h-11 rounded-full px-3 text-[14px] transition-colors",
              active ? "font-semibold" : "font-medium",
              dark ? (active ? "text-obsidian" : "text-white/85") : active ? "text-ink" : "text-ink-2",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${groupId}`}
                transition={reduce ? { duration: 0 } : { duration: 0.35, ease: EASE }}
                className={cn(
                  "absolute inset-0 rounded-full",
                  dark ? "bg-sulphur" : "bg-white shadow-[0_1px_3px_rgb(0_0_0/0.12)]",
                )}
              />
            )}
            <span className="relative inline-flex items-center justify-center gap-1.5">
              {active && <Check aria-hidden className="size-3.5" strokeWidth={3} />}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Components this draft replaces in the canvas preview. */
export const parts = { Segmented }

export default function Draft() {
  const [when, setWhen] = React.useState<"day" | "evening" | "night">("day")
  const [view, setView] = React.useState<"list" | "map">("list")
  const [guests, setGuests] = React.useState<"one" | "two" | "three">("two")

  return (
    <div className="ambient min-h-full p-5">
      <div className="mx-auto flex max-w-sm flex-col gap-6">
        <section className="flex flex-col gap-2">
          <h2 className="text-[14px] font-medium text-ink-2">Light, first option selected</h2>
          <Segmented
            label="Time of day"
            value={when}
            onChange={setWhen}
            options={[
              { id: "day", label: "Day" },
              { id: "evening", label: "Evening" },
              { id: "night", label: "Night" },
            ]}
          />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-[14px] font-medium text-ink-2">Two options</h2>
          <Segmented
            label="View"
            value={view}
            onChange={setView}
            options={[
              { id: "list", label: "List" },
              { id: "map", label: "Map" },
            ]}
          />
        </section>

        <section className="flex flex-col gap-2 rounded-2xl bg-obsidian p-4">
          <h2 className="text-[14px] font-medium text-white/85">Dark tone on a dark surface</h2>
          <Segmented
            tone="dark"
            label="Guests"
            value={guests}
            onChange={setGuests}
            options={[
              { id: "one", label: "1 guest" },
              { id: "two", label: "2 guests" },
              { id: "three", label: "3 guests" },
            ]}
          />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-[14px] font-medium text-ink-2">Dark tone on a light page (now readable)</h2>
          <Segmented
            tone="dark"
            label="Time of day, dark"
            value={when}
            onChange={setWhen}
            options={[
              { id: "day", label: "Day" },
              { id: "evening", label: "Evening" },
              { id: "night", label: "Night" },
            ]}
          />
        </section>
      </div>
    </div>
  )
}
