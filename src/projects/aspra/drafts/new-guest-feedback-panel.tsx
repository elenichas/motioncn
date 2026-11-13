/**
 * Redesign of GuestFeedbackPanel (components/aspra/guest-feedback-panel.tsx:6).
 * - Rebuilt on the Aspra library (Button, Chip, Segmented, OptionRow, Photo) so buttons, focus and theme changes come for free.
 * - Removed every hard-coded colour and inline style; only token classes (ink, ink-2, ink-3, sea, clay, glass) remain.
 * - Dropped Comic Sans: text inherits the brand fonts, headings use font-display.
 * - All text is 14px or larger (was 8 to 11px) and ink on glass or white, so contrast is AA.
 * - Rating is a real radiogroup of buttons with labels ("4 of 5") and a written rating word, so state is not colour alone.
 * - Comment field has a visible label and a 3:1 border (was placeholder only).
 * - Submit is a semantic Button, 44px or taller, disabled until a rating is chosen, with a visible hint explaining why.
 * - After sending, the form is replaced by a confirmation announced with role="status".
 * - Photo has real alt text; "!!!" copy and the "agree to everything" line are removed (it implied a policy we cannot know).
 */
import * as React from "react"
import { Check, Star } from "lucide-react"
import { Button, Chip, OptionRow, Photo, Segmented } from "@repo/aspra/components/aspra/ui"

const RATING_WORDS = ["Poor", "Fair", "Good", "Very good", "Excellent"] as const
// ASSUMPTION: topic names are neutral placeholders; replace with the hotel's real feedback categories.
const TOPICS = ["Room", "Food and drink", "Service", "Location"]

type Initial = { rating?: number; comment?: string; sent?: boolean; topics?: string[] }

function useFeedback(initial: Initial = {}) {
  const [rating, setRating] = React.useState(initial.rating ?? 0)
  const [comment, setComment] = React.useState(initial.comment ?? "")
  const [topics, setTopics] = React.useState<string[]>(initial.topics ?? [])
  const [sent, setSent] = React.useState(initial.sent ?? false)
  const toggleTopic = (t: string) =>
    setTopics((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  return { rating, setRating, comment, setComment, topics, toggleTopic, sent, setSent }
}

function CommentField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = React.useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-medium text-ink">
        Anything you would like to add
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="Optional"
        className="min-h-24 w-full resize-none rounded-xl border border-ink-3 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 focus-visible:border-sea focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea"
      />
    </div>
  )
}

function SubmitRow({ rating, onSend }: { rating: number; onSend: () => void }) {
  return (
    <div className="space-y-2">
      <Button variant="primary" block disabled={rating === 0} onClick={onSend}>
        Send feedback
      </Button>
      {rating === 0 && <p className="text-center text-[14px] text-ink-3">Choose a rating to send.</p>}
    </div>
  )
}

function Thanks() {
  return (
    <div role="status" className="flex items-start gap-3 py-2">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-sea text-white">
        <Check className="size-4" strokeWidth={2.6} />
      </span>
      <div>
        <h2 className="font-display text-[22px] text-ink">Thank you</h2>
        <p className="mt-1 text-[15px] text-ink-2">Your feedback has been sent.</p>
      </div>
    </div>
  )
}

/* ─── Option A: star rating, comment, one button ─────────────── */

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {RATING_WORDS.map((word, i) => {
          const n = i + 1
          return (
            <button
              key={word}
              type="button"
              role="radio"
              aria-checked={n === value}
              aria-label={`${n} of 5, ${word}`}
              onClick={() => onChange(n)}
              className="grid size-11 place-items-center rounded-full transition-colors hover:bg-ink/5"
            >
              <Star
                aria-hidden
                className={n <= value ? "size-7 fill-sea text-sea" : "size-7 text-ink-3"}
                strokeWidth={1.8}
              />
            </button>
          )
        })}
      </div>
      <p aria-live="polite" className="mt-1 min-h-6 text-[15px] font-medium text-ink">
        {value ? `${value} of 5, ${RATING_WORDS[value - 1]}` : "No rating yet"}
      </p>
    </div>
  )
}

function PanelA({ initial }: { initial?: Initial }) {
  const f = useFeedback(initial)
  return (
    <section aria-labelledby="gfp-a" className="glass w-full max-w-[360px] space-y-4 rounded-2xl p-4 text-ink md:max-w-[440px] md:p-5">
      {f.sent ? (
        <Thanks />
      ) : (
        <>
          <div>
            <h2 id="gfp-a" className="font-display text-[26px] text-ink">Rate your stay</h2>
            <p className="mt-1.5 text-[15px] text-ink-2">Tell us how your stay was.</p>
          </div>
          <StarRating value={f.rating} onChange={f.setRating} />
          <CommentField value={f.comment} onChange={f.setComment} />
          <SubmitRow rating={f.rating} onSend={() => f.setSent(true)} />
        </>
      )}
    </section>
  )
}

/* ─── Option B: photo header, 1 to 5 segmented, topic chips ──── */

function PanelB({ initial }: { initial?: Initial }) {
  const f = useFeedback(initial)
  return (
    <section aria-labelledby="gfp-b" className="glass w-full max-w-[360px] overflow-hidden rounded-2xl text-ink md:max-w-[440px]">
      {/* ASSUMPTION: the hero image shows the hotel's coast; alt text is generic. */}
      <Photo src="/images/aspra/hero-cliffs.jpg" alt="Cliffs above the sea on Milos" className="h-28 w-full" />
      <div className="space-y-4 p-4 md:p-5">
        {f.sent ? (
          <Thanks />
        ) : (
          <>
            <h2 id="gfp-b" className="font-display text-[26px] text-ink">How was your stay?</h2>
            <div className="space-y-2">
              <Segmented
                label="Rating from 1 to 5"
                value={String(f.rating || "")}
                options={[1, 2, 3, 4, 5].map((n) => ({ id: String(n), label: String(n) }))}
                onChange={(v) => f.setRating(Number(v))}
              />
              <p aria-live="polite" className="flex justify-between text-[14px] text-ink-2">
                <span>1 is poor</span>
                <span className="font-medium text-ink">{f.rating ? RATING_WORDS[f.rating - 1] : ""}</span>
                <span>5 is excellent</span>
              </p>
            </div>
            <fieldset>
              <legend className="mb-2 text-[14px] font-medium text-ink">What was it about? Optional</legend>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <Chip key={t} selected={f.topics.includes(t)} onClick={() => f.toggleTopic(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </fieldset>
            <CommentField value={f.comment} onChange={f.setComment} />
            <SubmitRow rating={f.rating} onSend={() => f.setSent(true)} />
          </>
        )}
      </div>
    </section>
  )
}

/* ─── Option C: rating as a list of large rows ───────────────── */

function PanelC({ initial }: { initial?: Initial }) {
  const f = useFeedback(initial)
  const ordered = [...RATING_WORDS].map((w, i) => ({ w, n: i + 1 })).reverse()
  return (
    <section aria-labelledby="gfp-c" className="glass w-full max-w-[360px] space-y-4 rounded-2xl p-4 text-ink md:max-w-[440px] md:p-5">
      {f.sent ? (
        <Thanks />
      ) : (
        <>
          <h2 id="gfp-c" className="font-display text-[26px] text-ink">Rate your stay</h2>
          <div role="radiogroup" aria-label="Rating" className="space-y-2">
            {ordered.map(({ w, n }) => (
              <OptionRow
                key={w}
                selected={f.rating === n}
                onClick={() => f.setRating(n)}
                title={w}
                aside={`${n} of 5`}
              />
            ))}
          </div>
          <CommentField value={f.comment} onChange={f.setComment} />
          <SubmitRow rating={f.rating} onSend={() => f.setSent(true)} />
        </>
      )}
    </section>
  )
}

/** Recommended: Option A. Same name and props as the original. */
export function GuestFeedbackPanel() {
  return <PanelA />
}

/** Components this draft replaces in the canvas preview. */
export const parts = { GuestFeedbackPanel }

function Labelled({ label, why, children }: { label: string; why: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-[15px] font-semibold text-ink">{label}</h3>
        <p className="text-[14px] text-ink-2">{why}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function State({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[14px] font-medium text-ink-3">{name}</p>
      {children}
    </div>
  )
}

export default function Draft() {
  const filled: Initial = {
    rating: 4,
    comment: "The terrace at breakfast was a highlight.",
    topics: ["Room", "Service"],
  }
  return (
    <div className="ambient min-h-full p-5">
      <div className="grid gap-8 lg:grid-cols-3">
        <Labelled label="Option A (recommended)" why="Familiar stars with a written rating, the smallest change from the original purpose.">
          <State name="Empty, send disabled"><PanelA /></State>
          <State name="Filled"><PanelA initial={filled} /></State>
          <State name="After submit"><PanelA initial={{ ...filled, sent: true }} /></State>
        </Labelled>
        <Labelled label="Option B" why="Adds a photo and topic chips so guests say what the rating is about.">
          <State name="Empty, send disabled"><PanelB /></State>
          <State name="Filled"><PanelB initial={filled} /></State>
          <State name="After submit"><PanelB initial={{ ...filled, sent: true }} /></State>
        </Labelled>
        <Labelled label="Option C" why="Large labelled rows: easiest to tap and read in sunlight, no icon-only controls.">
          <State name="Empty, send disabled"><PanelC /></State>
          <State name="Filled"><PanelC initial={filled} /></State>
          <State name="After submit"><PanelC initial={{ ...filled, sent: true }} /></State>
        </Labelled>
      </div>
    </div>
  )
}
