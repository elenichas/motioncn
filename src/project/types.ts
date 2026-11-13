/** Shared shapes for project canvases (a scanned repo shown on its own canvas). */

/** How sure the canvas is that a preview looks like the real thing. */
export type Confidence = "rendered" | "assumed" | "not-rendered"
export type Level = "issue" | "warn" | "info"
export type Note = { level: Level; text: string; where?: string }

export type Entry = {
  /** Preview id: matches a key in the project's previews module. */
  id: string
  title: string
  /** Source location, repo-relative: "components/aspra/ui.tsx:45". */
  where?: string
  confidence: Confidence
  /** What the preview had to make up to render (sample data, stubs, missing context). */
  assumptions?: string[]
  findings?: Note[]
  /** Rendered at phone, tablet and desktop widths, at device heights. */
  responsive?: boolean
  /** Width for non-responsive specimens (default 420). */
  w?: number
  /** Not in the repo: a proposal drawn from existing tokens and parts. */
  proposal?: boolean
  /** Rendered inside the whole running app: a fixed copy of one part cannot be swapped in, so Autofix is off. */
  inApp?: boolean
  /**
   * A component that cannot be rendered alone (it is not exported): shown where it lives, on a flow screen,
   * outlined, with the checks limited to it. The screens are tried in order until one shows it.
   */
  inPlace?: { component: string; screens: Array<{ title: string; base: string; drive: string[] }> }
}

export type Section = { title: string; blurb?: string; entries: Entry[] }
/** "library" pages show what exists; the "review" page holds everything that needs a decision. */
export type Page = { id: string; title: string; kind?: "library" | "review"; blurb: string; sections: Section[] }

/** A theme is a set of overrides for the repo's own CSS variables. Empty = the repo's theme. */
export type ProjectTheme = { id: string; name: string; note?: string; vars: Record<string, string> }

export type Manifest = {
  id: string
  name: string
  summary: string
  pages: Page[]
  themes: ProjectTheme[]
}

export type Viewport = { id: "phone" | "tablet" | "desktop"; label: string; w: number; h: number }
export const VIEWPORTS: Viewport[] = [
  { id: "phone", label: "Phone", w: 390, h: 844 },
  { id: "tablet", label: "Tablet", w: 768, h: 1024 },
  { id: "desktop", label: "Desktop", w: 1280, h: 800 },
]

export type Decision = "apply-fix" | "approved" | "variant" | "merge" | "deprecate" | "needs-design" | "flag"
export const DECISIONS: Array<{ id: Decision; label: string; hint: string }> = [
  { id: "apply-fix", label: "Apply this fix", hint: "The draft becomes the component; update every place it is used" },
  { id: "approved", label: "Approve", hint: "This is the canonical version" },
  { id: "variant", label: "Keep as variant", hint: "Valid, but a named variant of another component" },
  { id: "merge", label: "Merge", hint: "Replace with the canonical version" },
  { id: "deprecate", label: "Remove", hint: "Delete it and its uses" },
]

/** Messages between the canvas and a preview frame. */
export type ToPreview =
  | { type: "theme"; vars: Record<string, string> }
  | { type: "manual"; edits: import("./manual").ManualEdit[] }
  | { type: "inspect"; on: boolean }
  | { type: "pick"; selector: string }
  | { type: "locate"; on: boolean }
  | { type: "consolidate"; plan: import("./consolidate").Plan }

/** A component from the repo found around an element on screen, innermost first. */
export type Located = { name: string; file: string; line: number; library: boolean }
/**
 * Where a finding's fix belongs, worked out from who wrote the element:
 * - "component": the markup is `owner`'s own. Fix it there, and every use gets the fix.
 * - "usage": `owner` is a library component, but the caller `via` overrides its classes or places it on a surface
 *   it was not made for. The fix is in `via`.
 */
export type Ownership = { owner?: Located; via?: Located; scope?: "component" | "usage"; why?: string }
export type LiveFinding = { what: string; check: string; value: string; level: string } & Ownership

export type FromPreview =
  | { type: "size"; h: number }
  | { type: "a11y"; issues: number; warnings: number; findings: LiveFinding[] }
  | { type: "driven"; ok: boolean; done: number; wanted?: string }
  | { type: "focus"; found: boolean }
  | { type: "located"; chain: Located[]; label: string; open: boolean }
  | { type: "error"; message: string }
  | ({ type: "picked" } & import("./manual").Picked)
  | { type: "layout"; metrics: LayoutMetrics }

/** One frame's layout at its width (measured in the preview), used to judge responsiveness across widths. */
export type LayoutMetrics = {
  vw: number
  /** The box around everything with text. */
  content: { left: number; width: number }
  /** Largest and median font size, px. */
  heading: number
  body: number
  /** Longest line in a text block, in characters, and where. */
  maxLine: number
  maxLineText: string
  /** Images shown larger than their resolution. */
  stretched: Array<{ alt: string; ratio: number }>
}
