/**
 * Draft fix for AskNefeli.
 * Copied from components/aspra/tabs/today.tsx:498. Edit it here: the canvas shows it next to the current version
 * and runs the same accessibility checks on both. Approve it to hand it to an agent.
 */
import * as React from "react"
import { motion } from "framer-motion"
import {
  ArrowRight,
  BedDouble,
  Box,
  Car,
  ChevronDown,
  Coffee,
  Phone,
  Plane,
  Plus,
  Ship,
  Sparkles,
  Sunset,
  Waves,
  Wind,
} from "lucide-react"
import { cn } from "@repo/aspra/lib/utils"
import { useAspra } from "@repo/aspra/components/aspra/store"
import {
  IMG,
  bookingTotal,
  conditions,
  currentDay,
  dayLabel,
  euro,
  experienceCost,
  daysUntil,
  experienceById,
  flowerOptions,
  priceLabel,
  formatDate,
  greekPhrases,
  hotel,
  packingList,
  pillowOptions,
  reasonFor,
  scentOptions,
  suggestFor,
  suiteById,
  type Phase,
} from "@repo/aspra/components/aspra/data"
import { Button, EASE, Photo, Segmented, SectionTitle, TextLink } from "@repo/aspra/components/aspra/ui"
import { Keepsakes } from "@repo/aspra/components/aspra/tabs/journal"

export function AskNefeli({ title, prompts, onAsk, className }: { title: string; prompts: string[]; onAsk: (t: string) => void; className?: string }) {
  return (
    <section className={cn("px-5", className)}>
      <div className="on-dark rounded-3xl bg-sea p-5 text-white">
        <div className="flex items-center gap-2 text-[13.5px] text-white/70">
          <Sparkles className="size-4" aria-hidden /> Nefeli, AI concierge, 24 hours
        </div>
        <h2 className="mt-2 font-display text-[26px] leading-tight">{title}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {prompts.map((p) => (
            <button
              key={p}
              onClick={() => onAsk(p)}
              className="min-h-11 rounded-full border border-white/25 bg-white/15 px-4 text-left text-[14px] backdrop-blur-md transition-colors hover:bg-white/25 disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Components this draft replaces in the canvas preview. */
export const parts = { AskNefeli }
