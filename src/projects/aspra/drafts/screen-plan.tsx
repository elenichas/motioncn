/**
 * Draft fix for Plan.
 * Copied from components/aspra/tabs/plan.tsx:24. Edit it here: the canvas shows it next to the current version
 * and runs the same accessibility checks on both. Approve it to hand it to an agent.
 */
import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Plus, Sparkles, Trash2 } from "lucide-react"
import { cn } from "@repo/aspra/lib/utils"
import { useAspra } from "@repo/aspra/components/aspra/store"
import {
  addDays,
  bookingTotal,
  currentDay,
  euro,
  experienceById,
  experienceCost,
  planCost,
  priceLabel,
  experiences,
  reasonFor,
  suggestFor,
} from "@repo/aspra/components/aspra/data"
import { Button, EASE, IconButton, Photo, SectionTitle, Sheet } from "@repo/aspra/components/aspra/ui"
import { StatusPill } from "@repo/aspra/components/aspra/tabs/today"

export function PlanTab() {
  const store = useAspra()
  const { booking, plan, prefs, phase } = store
  // On Milos the plan opens on today, not on arrival day.
  const todayIndex = booking && phase === "during" ? currentDay(bookingTotal(booking).nights) : -1
  const [picked, setPicked] = React.useState<{ phase: string; day: number } | null>(null)
  const day = picked && picked.phase === phase ? picked.day : Math.max(0, todayIndex)
  const setDay = (d: number) => setPicked({ phase, day: d })
  const [adding, setAdding] = React.useState(false)

  if (!booking) {
    return (
      <div className="pb-nav px-5 pt-4">
        <h1 className="font-display text-[38px]">Your plan</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Once you book, this is where you plan each day on Milos: boats, dinners, the spa and the walks Nefeli suggests.
        </p>
        <Button size="lg" className="mt-6" onClick={() => window.dispatchEvent(new Event("aspra:rebook"))}>
          Book a stay
        </Button>
      </div>
    )
  }

  const t = bookingTotal(booking)
  const days = Array.from({ length: t.nights + 1 }, (_, i) => i)
  const items = plan.filter((p) => p.day === day).sort((a, b) => a.time.localeCompare(b.time))
  const ranked = suggestFor(prefs, plan)
  const others = experiences.filter((e) => !ranked.includes(e) && !plan.some((p) => p.experienceId === e.id))
  const experiencesCost = planCost(plan, booking)

  const dayName = (i: number) =>
    new Date(addDays(booking.checkIn, i) + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className="pb-nav">
      <div className="px-5 pt-2">
        <h1 className="font-display text-[38px]">Your plan</h1>
        <p className="mt-1 text-[15px] text-ink-2">
          {t.nights} nights. {plan.length} {plan.length === 1 ? "thing" : "things"} planned
          {experiencesCost > 0 ? `, ${euro(experiencesCost)} so far` : ""}. Leave space for doing nothing.
        </p>
      </div>

      <div role="tablist" aria-label="Days of your stay" className="no-scrollbar sticky top-[60px] z-[var(--z-nav)] lg:top-0 lg:rounded-full mt-5 flex gap-2 overflow-x-auto bg-white/40 px-5 py-2 backdrop-blur-xl">
        {days.map((i) => {
          const d = new Date(addDays(booking.checkIn, i) + "T12:00:00")
          const active = i === day
          const count = plan.filter((p) => p.day === i).length
          return (
            <button
              key={i}
              role="tab"
              aria-selected={active}
              aria-label={`${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}${i === todayIndex ? ", today" : ""}${count ? `, ${count} planned` : ""}`}
              onClick={() => setDay(i)}
              className={cn(
                "flex h-[68px] w-[56px] shrink-0 flex-col items-center justify-center rounded-xl border transition-colors",
                active ? "border-ink bg-ink text-white" : i === todayIndex ? "border-sea bg-white/70 text-ink backdrop-blur-md" : "border-white/80 bg-white/60 text-ink backdrop-blur-md",
              )}
            >
              <span className={cn("text-[12px]", active ? "text-white/75" : i === todayIndex ? "font-semibold text-sea-deep" : "text-ink-3")}>
                {i === todayIndex ? "Today" : d.toLocaleDateString("en-GB", { weekday: "short" })}
              </span>
              <span className="text-[19px] font-semibold tabular-nums">{d.getDate()}</span>
              <span className={cn("mt-0.5 size-1.5 rounded-full", count ? (active ? "bg-sulphur" : "bg-sea") : "bg-transparent")} aria-hidden />
            </button>
          )
        })}
      </div>

      <div className="lg:grid lg:grid-cols-[1.15fr_1fr] lg:items-start">
      <section className="px-5 pt-5" aria-live="polite">
        <h2 className="text-[17px] font-semibold">
          {dayName(day)}
          <span className="ml-2 font-normal text-ink-3">
            {day === todayIndex ? "Today" : day === 0 ? "Arrival" : day === t.nights ? "Departure" : `Day ${day + 1}`}
          </span>
        </h2>

        <ul className="mt-4 space-y-3">
          <AnimatePresence initial={false}>
            {items.map((p) => {
              const e = experienceById(p.experienceId)
              return (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="flex gap-3 rounded-2xl glass p-3"
                >
                  <Photo src={e.image} alt="" className="size-20 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 py-0.5">
                    <div className="flex items-center gap-2 text-[13.5px] font-semibold tabular-nums text-sea">
                      {p.time} <StatusPill status={p.status} />
                    </div>
                    <div className="mt-1 text-[15px] font-medium leading-snug">{e.name}</div>
                    <div className="text-[13px] text-ink-3">
                      {e.duration} · {experienceCost(e, booking) > 0 ? euro(experienceCost(e, booking)) : priceLabel(e)}
                    </div>
                  </div>
                  <IconButton label={`Remove ${e.name}`} onClick={() => {
                      store.removeFromPlan(p.id)
                      store.notify(`${e.name} removed from your plan.`, { label: "Undo", run: () => store.restoreToPlan(p) })
                    }}
                    className="self-center text-ink-3 hover:bg-ink/5"
                  >
                    <Trash2 className="size-[18px]" />
                  </IconButton>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>

        {items.length === 0 && (
          <p className="rounded-2xl glass p-4 text-[14.5px] leading-relaxed text-ink-2">
            {day === 0
              ? "An open first evening. Most guests swim, then eat at Thalami."
              : prefs.pace === "slow"
                ? "Nothing planned. That suits a slow pace."
                : "Nothing planned yet."}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden /> Add
          </Button>
          <Button variant="dark" className="flex-1" onClick={() => store.askConcierge(`Plan ${dayName(day)} for me`)}>
            <Sparkles className="size-4 text-sulphur" aria-hidden /> Plan it for me
          </Button>
        </div>
      </section>

      <section className="mt-12 px-5 lg:mt-5">
        <SectionTitle>Your stay</SectionTitle>
        <div className="rounded-2xl glass p-4">
          <dl className="space-y-2 text-[14.5px]">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-2">Suite and extras</dt>
              <dd className="tabular-nums">{euro(t.total)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-2">Planned experiences</dt>
              <dd className="tabular-nums">{euro(experiencesCost)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2 text-[16px] font-semibold">
              <dt>Total so far</dt>
              <dd className="tabular-nums">{euro(t.total + experiencesCost)}</dd>
            </div>
          </dl>
          <Button variant="outline" block className="mt-4" onClick={() => store.setStayOpen(true)}>
            Manage your stay
          </Button>
          <p className="mt-3 text-[13px] leading-snug text-ink-3">Dates, extras and how your suite is set up are all in one place.</p>
        </div>
      </section>
      </div>

      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title={`Add to ${new Date(addDays(booking.checkIn, day) + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long" })}`}
      >
        <p className="mb-4 text-[14px] text-ink-2">Ordered by what you told us you like.</p>
        <ul className="space-y-3">
          {[...ranked, ...others].map((e) => (
            <li key={e.id} className="flex gap-3 rounded-2xl glass p-3">
              <Photo src={e.image} alt="" className="size-20 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-sea">{reasonFor(e, prefs)}</div>
                <div className="text-[15px] font-medium leading-snug">{e.name}</div>
                <div className="mt-0.5 text-[13px] text-ink-3">
                  {e.defaultTime}, {e.duration} · {priceLabel(e)}
                  {e.per === "person" && booking.adults + booking.children > 1 ? `, ${euro(experienceCost(e, booking))} for ${booking.adults + booking.children}` : ""}
                </div>
                {e.windSensitive && <div className="mt-1 text-[12.5px] text-clay">Runs only when the wind allows</div>}
              </div>
              <IconButton
                label={`Add ${e.name}`}
                onClick={() => {
                  const planId = store.addToPlan(e.id, day)
                  const cost = experienceCost(e, booking)
                  store.notify(
                    e.per === "included" ? `${e.name} is confirmed.` : `${e.name} requested${cost > 0 ? `, ${euro(cost)}` : ""}. We confirm within the hour.`,
                    { label: "Undo", run: () => store.removeFromPlan(planId) },
                  )
                  setAdding(false)
                }}
                className="self-center bg-sea text-white hover:bg-sea-deep"
              >
                <Plus className="size-5" />
              </IconButton>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  )
}

/** Components this draft replaces in the canvas preview. */
export const parts = { PlanTab }
