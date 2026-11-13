/**
 * Is a component responsive? Judged by comparing its layout at phone, tablet and desktop width
 * (measured in each preview frame), not by reading its code:
 * - fits: nothing sticks out past the screen at any width                      (else: not responsive)
 * - adapts: it is not the same size at every width                             (else: not responsive)
 * - readable: lines stay under ~90 characters on wide screens                  (else: partly)
 * - sharp: images are not stretched past their resolution                       (else: partly)
 * - keeps adapting: desktop does not just reuse the tablet layout with empty space (a note: a design call)
 */
import type { LayoutMetrics, Note } from "./types"

export type Verdict = "responsive" | "partly" | "not"
export type ResponsiveResult = {
  verdict: Verdict
  notes: Note[]
  rows: Array<{ vp: string; vw: number; width: number; share: number; heading: number; body: number; maxLine: number; overflow: number }>
}

export const VERDICT: Record<Verdict, { label: string; className: string }> = {
  responsive: { label: "Responsive", className: "bg-emerald-500/15 text-emerald-700" },
  partly: { label: "Partly responsive", className: "bg-amber-500/15 text-amber-700" },
  not: { label: "Not responsive", className: "bg-red-500/15 text-red-600" },
}

/** Same width, give or take padding changes: within 6% (at least 4px). */
const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(4, 0.06 * Math.max(a, b))

/** Needs at least two widths; `overflow` counts the "fits the screen" failures per width. */
export function judgeResponsive(byVp: Record<string, LayoutMetrics>, overflow: Record<string, number>): ResponsiveResult | null {
  const list = Object.entries(byVp).sort(([, a], [, b]) => a.vw - b.vw)
  if (list.length < 2) return null
  const rows = list.map(([vp, m]) => ({ vp, vw: m.vw, width: m.content.width, share: m.vw ? m.content.width / m.vw : 0, heading: m.heading, body: m.body, maxLine: m.maxLine, overflow: overflow[vp] ?? 0 }))
  const notes: Note[] = []

  for (const r of rows) if (r.overflow) notes.push({ level: "issue", text: `Sticks out past the screen on ${r.vp} (${r.vw}px wide).` })

  // Compare the two widest: does the layout keep growing, and does it use the screen it is on?
  const [prev, last] = rows.slice(-2)
  const pct = (n: number) => `${Math.round(n * 100)}%`
  const typeFixed = rows.every((r) => r.heading === rows[0].heading)
  if (near(prev.width, last.width) && prev.share < 0.6) {
    // stops at a small width already on the middle screen: it is a fixed-size block, not a responsive one
    notes.push({
      level: "issue",
      text: `Does not adapt: it stays ${last.width}px wide from ${prev.vp} up (${pct(prev.share)} of a ${prev.vp.toLowerCase()}, ${pct(last.share)} of a ${last.vp.toLowerCase()})${typeFixed ? `, and its type is the same size (${rows[0].heading}px) at every width` : ""}.`,
    })
  } else if (near(prev.width, last.width) && last.share < 0.55) {
    notes.push({ level: "info", text: `${last.vp} reuses the ${prev.vp} layout: the content stays ${last.width}px wide (${pct(last.share)} of the screen) and the rest is empty or background. Fine if intended; otherwise give ${last.vp} its own layout.` })
  }

  for (const [vp, m] of list) if (m.maxLine > 90) notes.push({ level: "warn", text: `Lines up to ${m.maxLine} characters on ${vp} (“${m.maxLineText}…”). Aim for 45–75 so text stays easy to read.` })
  for (const [vp, m] of list) for (const img of m.stretched) notes.push({ level: "warn", text: `Image “${img.alt}” is shown at ${img.ratio}× its resolution on ${vp}: it will look soft.` })

  const verdict: Verdict = notes.some((n) => n.level === "issue") ? "not" : notes.some((n) => n.level === "warn") ? "partly" : "responsive"
  return { verdict, notes, rows }
}
