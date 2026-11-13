/**
 * The review model: what state a component is in, what kind of fixes it needs, and what to do next.
 * Pure functions over what the canvas already knows (findings, a11y scans, drafts, decisions, repo branches).
 */
import type { Decision, Entry, Note } from "./types"
import type { FrameA11y } from "./project-frame"
import type { DecisionRecord } from "./decisions"

/* ───────────────────────── fix types ───────────────────────── */

/**
 * The three ways to fix a component:
 * - manual: you change its look on the canvas (colour, opacity, border, radius, size, position)
 * - autofix: standard code rules, no AI (tokens, type scale, contrast-safe colours, buttons, labels, alt text)
 * - ai: Claude, for anything that needs judgment (missing states, merging duplicates, redesigns)
 */
export type FixType = "manual" | "autofix" | "ai"
export type FindingKind = "layout" | "a11y" | "tokens" | "states" | "duplicate" | "structure" | "other"

export const KIND_LABEL: Record<FindingKind, string> = {
  layout: "Responsive",
  a11y: "Accessibility",
  tokens: "Tokens and brand",
  states: "States and variants",
  duplicate: "Duplicates",
  structure: "Library use",
  other: "Other notes",
}
/** Which fix handles each kind of finding best. Manual can touch any of them. */
export const KIND_FIX: Record<FindingKind, FixType | null> = {
  layout: "autofix",
  a11y: "autofix",
  tokens: "autofix",
  states: "ai",
  duplicate: "ai",
  structure: "ai",
  other: null,
}

/** Sort a finding into a kind by what it talks about. */
export function kindOf(n: Note): FindingKind {
  const t = n.text.toLowerCase()
  if (/fits the screen|too wide|scrolls sideways|fixed width|responsive/.test(t)) return "layout"
  if (/contrast|touch target|target size|44px|focus|keyboard|arrow-key|arrow key|tab stop|label|alt text|aria|role=|radiogroup|clickable div|screen reader|announced|12px minimum|accessib/.test(t)) return "a11y"
  if (/duplicate|same props|merge|written by hand|hand-written|repeat|copy in|copies|two versions|surface styles/.test(t)) return "duplicate"
  if (/loading|disabled state|no disabled|pending|declined|cancelled|missing state|no .* state|only knows|states the code/.test(t)) return "states"
  if (/colou?r|token|font|type scale|px|radius|rounded|hard-coded|inline style|theme/.test(t)) return "tokens"
  if (/library|imports nothing|lives in a screen file|caller|variants/.test(t)) return "structure"
  return "other"
}

export type Grouped = Array<{ kind: FindingKind; notes: Note[] }>
export function groupFindings(notes: Note[]): Grouped {
  const map = new Map<FindingKind, Note[]>()
  for (const n of notes) map.set(kindOf(n), [...(map.get(kindOf(n)) ?? []), n])
  const order: FindingKind[] = ["layout", "a11y", "tokens", "states", "duplicate", "structure", "other"]
  return order.filter((k) => map.has(k)).map((k) => ({ kind: k, notes: map.get(k)! }))
}

/** Findings worth fixing: issues and warnings from the review, plus failed checks from the live scan. */
export function actionable(entry: Entry, a11y?: FrameA11y): Note[] {
  const review = (entry.findings ?? []).filter((f) => f.level !== "info")
  // The same failure at phone, tablet and desktop is one finding, not three.
  const byIssue = new Map<string, string[]>()
  for (const f of a11y?.current?.findings ?? []) {
    if (f.level !== "fail") continue
    const k = `${f.check} ${f.value} on ${f.what}`
    byIssue.set(k, [...(byIssue.get(k) ?? []), ...(f.viewport && f.viewport !== "Frame" ? [f.viewport] : [])])
  }
  const scan = [...byIssue].map(([k, vps]): Note => ({ level: "issue", text: `Accessibility: ${k}${vps.length === 1 ? ` (${vps[0]})` : ""}` }))
  const seen = new Set<string>()
  return [...review, ...scan].filter((n) => (seen.has(n.text) ? false : (seen.add(n.text), true)))
}

/** The one component file and line an entry points to, or null (several places, a CSS file, a description). */
export function sourceOf(entry: Entry): { file: string; line: number } | null {
  const m = entry.where?.match(/^([\w./-]+\.(?:tsx|jsx)):(\d+)$/)
  return m ? { file: m[1], line: Number(m[2]) } : null
}

/** Why Autofix cannot run on an entry, or null when it can. */
export function autofixBlocked(entry: Entry): string | null {
  if (entry.inApp && !entry.inPlace) return "This screen renders the whole app, so a fixed copy of one part cannot be shown here. Fix its components on the Components page, or use AI fix."
  if (!entry.where) return "There is no source file for this one. Use AI fix."
  if (/·/.test(entry.where)) return "This points to more than one component (duplicates). Merging them takes judgment: use AI fix."
  if (!sourceOf(entry)) return "This is not a single component file (it is a stylesheet or a summary). Use AI fix or Manual edit."
  return null
}

/** True when the component ignores the system almost everywhere: an AI redesign beats patching it. */
export function needsRedesign(entry: Entry, a11y?: FrameA11y) {
  const notes = actionable(entry, a11y)
  const issues = notes.filter((n) => n.level === "issue")
  const offSystem = notes.some((n) => /none of the theme'?s tokens|imports nothing from the component library/i.test(n.text))
  return offSystem && issues.filter((n) => kindOf(n) === "tokens").length >= 2 && issues.length >= 4
}

/** Where to start: autofix whatever rules can handle, then AI for the rest. */
export function recommendedFix(entry: Entry, a11y?: FrameA11y): FixType | null {
  const notes = actionable(entry, a11y)
  if (!notes.length) return null
  if (!autofixBlocked(entry) && notes.some((n) => KIND_FIX[kindOf(n)] === "autofix")) return "autofix"
  return "ai"
}

export const FIX_INFO: Record<FixType, { label: string; short: string; how: string }> = {
  manual: {
    label: "Manual fix",
    short: "Manual",
    how: "Pick an element in the fix frame and change it yourself: colour, background, opacity, border, corners, text size, position, scale, rotation. Contrast updates as you go.",
  },
  autofix: {
    label: "Autofix",
    short: "Autofix",
    how: "Standard code rules, no AI: colours snap to tokens (text keeps AA contrast), sizes to the type scale, clickable divs become buttons, fields get labels, images get alt text. Every change is listed.",
  },
  ai: {
    label: "AI fix",
    short: "AI fix",
    how: "Claude rewrites the draft for anything that needs judgment: missing states, merging duplicates, a redesign. Tell it what you want; your manual edits are kept. The canvas re-checks and sends failures back, up to 3 attempts.",
  },
}

/* ───────────────────────── status ───────────────────────── */

export type Status = "local" | "incoming" | "proposal" | "not-on-canvas" | "needs-fix" | "fix-drafted" | "approved" | "applying" | "in-branch" | "verified" | "in-library" | "flagged"

export const STATUS: Record<Status, { label: string; hint: string; className: string; step: 1 | 2 | 3 | 4 }> = {
  local: { label: "Local · not in library", hint: "A helper inside a screen file with no open issues. Approve it, or merge it into a library component.", className: "bg-zinc-500/15 text-zinc-700", step: 1 },
  incoming: { label: "Incoming", hint: "New from main. Not reviewed yet, not part of the library.", className: "bg-sky-500/15 text-sky-700", step: 1 },
  proposal: { label: "Proposal · not in repo", hint: "Drawn on the canvas from existing parts. Approve it to add it to the library.", className: "bg-fuchsia-500/15 text-fuchsia-700", step: 3 },
  "not-on-canvas": { label: "Not on the canvas", hint: "Code the canvas leaves out. Decide whether it stays.", className: "bg-zinc-500/15 text-zinc-700", step: 3 },
  "needs-fix": { label: "Needs fix", hint: "Reviewed: has issues to resolve.", className: "bg-red-500/15 text-red-700", step: 2 },
  "fix-drafted": { label: "Fix drafted", hint: "A fix exists on the canvas. The repo is unchanged.", className: "bg-fuchsia-500/15 text-fuchsia-700", step: 2 },
  approved: { label: "Approved · not in repo", hint: "You signed off. Nothing has changed in the repo yet.", className: "bg-violet-500/15 text-violet-700", step: 3 },
  applying: { label: "Applying in repo", hint: "Claude is editing a local branch of the repo.", className: "bg-amber-500/15 text-amber-700", step: 4 },
  "in-branch": { label: "In branch · not merged", hint: "Committed on a local branch. Push it and merge it to main to finish.", className: "bg-amber-500/15 text-amber-700", step: 4 },
  verified: { label: "In library · verified", hint: "Merged to main, rescanned, and the live checks pass.", className: "bg-emerald-600 text-white", step: 4 },
  "in-library": { label: "In library", hint: "Part of the library with no open issues.", className: "bg-emerald-500/15 text-emerald-700", step: 1 },
  flagged: { label: "Flagged", hint: "Sent back to the author; not fixed on the canvas.", className: "bg-zinc-800 text-white", step: 3 },
}

export type Applied = { entry: string; branch: string; sha: string; worktree: string; at: string; files: string[]; merged: boolean; state?: "running" | "done" | "error"; error?: string; summary?: string }

const APPROVING: Decision[] = ["apply-fix", "approved", "variant", "merge", "deprecate"]

export function statusOf(o: { entry: Entry; incoming: boolean; hasDraft: boolean; decision?: DecisionRecord; a11y?: FrameA11y; applied?: Applied }): Status {
  const d = o.decision?.status
  if (d === "flag") return "flagged"
  if (o.applied?.state === "running") return "applying"
  if (o.applied?.merged) return "verified"
  if (o.applied?.state === "done") return "in-branch"
  if (d && APPROVING.includes(d)) return o.entry.id.startsWith("auto~") && !o.hasDraft && (d === "approved" || d === "apply-fix") ? "in-library" : "approved"
  if (o.hasDraft) return "fix-drafted"
  if (o.incoming) return "incoming"
  if (o.entry.proposal) return "proposal"
  if (o.entry.confidence === "not-rendered") return "not-on-canvas"
  const issues = actionable(o.entry, o.a11y).filter((n) => n.level === "issue").length
  return issues ? "needs-fix" : o.entry.inPlace ? "local" : "in-library"
}

/** Decided on the canvas, but the repo does not have it yet. */
export const PENDING: Status[] = ["approved", "applying", "in-branch"]

/** Statuses that are waiting on you. */
export const WAITING: Status[] = ["incoming", "proposal", "needs-fix", "fix-drafted"]
