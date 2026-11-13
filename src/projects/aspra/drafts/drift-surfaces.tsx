/**
 * Draft: a Card component to replace the 28 hand-written card styles (43 uses).
 * Not copied from source: Aspra has no Card. Built from the surfaces already in use.
 *
 * - tone: glass (the common one), wash (selected or highlighted), dark (night, on photos), dashed (empty or "add")
 * - padding: sm (p-3, dense lists) or md (p-4, everything else). p-5 and px-only cards move to md.
 * - one radius: rounded-2xl (the most used), no arbitrary 20/26/28px values
 * - text colours come with the tone, so secondary text keeps AA contrast on every surface
 */
import * as React from "react"
import { cn } from "@repo/aspra/lib/utils"

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: "glass" | "wash" | "dark" | "dashed"
  padding?: "none" | "sm" | "md"
}

export function Card({ tone = "glass", padding = "md", className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        tone === "glass" && "glass text-ink",
        tone === "wash" && "border border-sea/20 bg-sea-wash text-ink",
        tone === "dark" && "on-dark bg-obsidian text-white",
        tone === "dashed" && "border border-dashed border-ink/30 text-ink",
        padding === "sm" && "p-3",
        padding === "md" && "p-4",
        className,
      )}
      {...props}
    />
  )
}

/** Secondary line inside a Card: the tone decides the colour, so contrast is right everywhere. */
export function CardMeta({ dark, children }: { dark?: boolean; children: React.ReactNode }) {
  return <div className={cn("text-[14px]", dark ? "text-white/80" : "text-ink-2")}>{children}</div>
}

export const parts = { Card }

const Sample = ({ dark }: { dark?: boolean }) => (
  <>
    <div className="text-[15px] font-medium">Sunset at the Kastro</div>
    <CardMeta dark={dark}>Day 3 · 19:40 · 12 min walk</CardMeta>
  </>
)

/** All tones and paddings, replacing the grid of 28 variants. */
export default function Draft() {
  const tones = ["glass", "wash", "dark", "dashed"] as const
  return (
    <div className="ambient min-h-full p-6">
      <p className="mb-5 max-w-2xl text-[15px] text-ink-2">
        One <code className="font-mono text-[14px]">Card</code> with 4 tones and 2 paddings replaces 28 surface styles. Every card is rounded-2xl.
      </p>
      <div className="grid grid-cols-4 gap-5">
        {tones.map((tone) =>
          (["md", "sm"] as const).map((padding) => (
            <div key={tone + padding}>
              <div className="mb-1.5 font-mono text-[12px] font-semibold text-ink">
                tone="{tone}" padding="{padding}"
              </div>
              <Card tone={tone} padding={padding}>
                <Sample dark={tone === "dark"} />
              </Card>
            </div>
          )),
        )}
      </div>
    </div>
  )
}
