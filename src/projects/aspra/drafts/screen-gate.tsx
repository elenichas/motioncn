/**
 * Draft fix for Gate.
 * Copied from components/aspra/entry/gate.tsx:72.
 * - Photo fallback is now bg-obsidian (was the light bg-sea-wash), so white text keeps AA contrast when the image is slow, missing or bright.
 * - Scrim darkened across the text area (obsidian/45 to obsidian/90) so the wordmark, heading and body text stay above 4.5:1 on any photo.
 * - Path list uses glass-smoke instead of the faint glass-dark, so button text sits on a darker pane.
 * - Secondary text raised from white/75-90 to white/90-100 for AA contrast.
 * - Path buttons get min-h-[44px] and an explicit focus-visible ring (sulphur on dark).
 * - Season note is 12px minimum and keeps its text; the decorative arrow circle stays aria-hidden.
 */
import * as React from "react"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { IMG, hotel, type GuestKind } from "@repo/aspra/components/aspra/data"
import { ArchMark, EASE, Photo, Wordmark } from "@repo/aspra/components/aspra/ui"

const paths: Array<{ kind: GuestKind; title: string; detail: string }> = [
  { kind: "new", title: "Plan a stay", detail: "See the suites, pick dates and shape the trip" },
  { kind: "booked", title: "I have a booking", detail: "Prepare your suite and arrival" },
  { kind: "returning", title: "I have stayed before", detail: "Your preferences and last trip are saved" },
]

export function Gate({ onChoose }: { onChoose: (k: GuestKind) => void }) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="on-dark fixed inset-0 z-[var(--z-overlay)] flex w-full flex-col overflow-y-auto bg-obsidian text-white"
    >
      <Photo
        src={IMG.hero}
        alt="Aspra's white suites cut into the cliffs above a turquoise cove at sunset"
        className="absolute inset-0 size-full bg-obsidian"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-b from-obsidian/45 via-obsidian/30 to-obsidian/90 lg:bg-gradient-to-r lg:from-obsidian/85 lg:via-obsidian/45 lg:to-obsidian/20" />

      <div className="relative mx-auto flex min-h-full w-full max-w-[1200px] flex-1 flex-col px-4 pb-[max(env(safe-area-inset-bottom),18px)] pt-[max(env(safe-area-inset-top),20px)] md:px-10 md:pb-12 md:pt-8">
        <Wordmark tone="light" className="px-2" />
        <div className="flex-1" />
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
          className="max-w-[560px] px-2 font-display text-[40px] leading-[0.98] text-white md:text-[56px] lg:text-[64px]"
        >
          Seven suites in the white rock of Milos.
        </motion.h1>
        <p className="mt-3 max-w-[32ch] px-2 text-[15px] leading-relaxed text-white md:max-w-[40ch] md:text-[17px]">
          This app looks after you from the day you book to long after you fly home.
        </p>

        <nav aria-label="How would you like to start?" className="mt-6 md:max-w-[480px]">
          <ul className="glass-smoke divide-y divide-white/20 overflow-hidden rounded-3xl">
            {paths.map((p, i) => (
              <motion.li
                key={p.kind}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + i * 0.08, ease: EASE }}
              >
                <button
                  type="button"
                  onClick={() => onChoose(p.kind)}
                  className="flex min-h-[44px] w-full items-center gap-4 px-5 py-4 text-left text-white transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sulphur"
                >
                  <span className="flex-1">
                    <span className="block text-[17px] font-semibold">{p.title}</span>
                    <span className="mt-0.5 block text-[14px] text-white/90">{p.detail}</span>
                  </span>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-obsidian">
                    <ArrowRight className="size-4" aria-hidden />
                  </span>
                </button>
              </motion.li>
            ))}
          </ul>
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-[12px] text-white/90 md:justify-start md:px-2">
            <ArchMark className="size-4" /> {hotel.season}. Sample guests, no real bookings.
          </p>
        </nav>
      </div>
    </motion.section>
  )
}

export const parts = { Gate }

export default function Draft() {
  const [chosen, setChosen] = React.useState<GuestKind | null>(null)
  return (
    <div className="ambient min-h-full p-5">
      <div className="space-y-3">
        <p className="text-[14px] text-ink-2" aria-live="polite">
          {chosen ? `Chosen path: ${paths.find((p) => p.kind === chosen)?.title}` : "No path chosen yet. Select one below."}
        </p>
        {/* transform makes the component's fixed positioning relative to this frame */}
        <div className="relative h-[760px] max-w-[420px] overflow-hidden rounded-3xl [transform:translateZ(0)]">
          <Gate onChoose={setChosen} />
        </div>
      </div>
    </div>
  )
}
