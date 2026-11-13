/**
 * Consolidation: turning many hand-written buttons into a few library components.
 *
 * The scanner reads every <button> written outside the library: its label, the classes that are always on,
 * the classes that depend on a condition (its states), and the nearest library component. Here they are
 * grouped by type and by look, and the reviewer decides what each becomes. The plan lives in this browser
 * and goes to the repo through the agent brief.
 */
import { useCallback, useEffect, useState } from "react"
import type { Project } from "@/projects"
import type { Entry, Note, Page } from "./types"

export type RawButton = Project["scan"]["rawButtons"][number]
export type LibraryButton = Project["scan"]["libraryButtons"][number]
type Look = RawButton["looks"][number]

/** A match's props as plain strings (the scan's JSON types them per button). */
export const matchProps = (b: RawButton) => ({ ...(b.match?.props ?? {}) }) as Record<string, string>
export const buttonKey = (b: { file: string; line: number }) => `${b.file}:${b.line}`
export const groupId = (kind: string) => `buttons~${kind.toLowerCase().replace(/\W+/g, "-")}`
export const isGroup = (id: string) => id.startsWith("buttons~")

/** What a hand-written button becomes. */
export type Choice =
  /** Use a library component as it is. `variant` names a variant to add to it when none has this look. */
  | { action: "replace"; component: string; props: Record<string, string>; addVariant?: string }
  /** Part of a new library component, as one of its variants. */
  | { action: "new"; name: string; variant: string }
  | { action: "keep" }
  | { action: "remove" }
export type Plan = { choices: Record<string, Choice>; rules: Record<string, string> }
const EMPTY: Plan = { choices: {}, rules: {} }

const storeKey = (projectId: string) => `motioncn:consolidate:${projectId}`
export function readPlan(projectId: string): Plan {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(storeKey(projectId)) ?? "{}") }
  } catch {
    return EMPTY
  }
}
export type Consolidation = ReturnType<typeof useConsolidation>
export function useConsolidation(projectId: string) {
  const [plan, setPlan] = useState<Plan>(() => readPlan(projectId))
  useEffect(() => {
    try {
      localStorage.setItem(storeKey(projectId), JSON.stringify(plan))
    } catch {
      /* storage blocked: the plan lasts for this session */
    }
  }, [projectId, plan])
  const choose = useCallback((picks: Record<string, Choice | null>) => {
    setPlan((p) => {
      const choices = { ...p.choices }
      for (const [k, c] of Object.entries(picks)) c ? (choices[k] = c) : delete choices[k]
      return { ...p, choices }
    })
  }, [])
  const setRule = useCallback((kind: string, text: string) => setPlan((p) => ({ ...p, rules: { ...p.rules, [kind]: text } })), [])
  return { plan, choose, setRule }
}

/* ───────────────────────── reading the scan ───────────────────────── */

/** A short name for a look, from its fill (or its text colour when it has no fill): "obsidian", "glass-smoke", "plain". */
export function lookName(l: Pick<Look, "fill" | "text" | "outline">): string {
  const clean = (s: string) => s.replace(/^(bg|text|border)-/, "").replace(/\//g, "-")
  if (l.fill !== "none") return clean(l.fill)
  if (/dashed/.test(l.outline)) return "dashed"
  if (l.text !== "inherit") return `${clean(l.text)}-text`
  return "plain"
}
const sig = (l: Look) => `${l.fill}|${l.text}|${l.outline}`
/** The look a button has when nothing special is going on: its unconditional one, else its "on" state. */
export const mainLook = (b: RawButton): Look => b.looks.find((l) => !l.when) ?? b.looks.find((l) => !l.when!.startsWith("not ")) ?? b.looks[0]

export type ButtonGroup = {
  kind: string
  buttons: RawButton[]
  /** Buttons that look the same, by fill, text colour and outline of their main look. */
  looks: Array<{ name: string; sig: string; buttons: RawButton[] }>
  /** Buttons whose look changes with a condition in code: these are states, not different buttons. */
  stateful: RawButton[]
}
export function buttonGroups(project: Project): ButtonGroup[] {
  const kinds = [...new Set(project.scan.rawButtons.map((b) => b.kind))]
  return kinds.map((kind) => {
    const buttons = project.scan.rawButtons.filter((b) => b.kind === kind)
    const looks: ButtonGroup["looks"] = []
    for (const b of buttons) {
      const s = sig(mainLook(b))
      const hit = looks.find((l) => l.sig === s)
      if (hit) hit.buttons.push(b)
      else looks.push({ name: lookName(mainLook(b)), sig: s, buttons: [b] })
    }
    return { kind, buttons, looks: looks.sort((a, b) => b.buttons.length - a.buttons.length), stateful: buttons.filter((b) => b.states.length > 0) }
  })
}

/** A component name for a new primitive made from a group: "List row" → "ListRow". */
export const primitiveName = (kind: string) =>
  kind
    .split(/\W+/)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join("")

/** What the canvas would do with a button if you asked it: the library match, else a new primitive for the group. */
export function suggest(b: RawButton, g: ButtonGroup): Choice {
  const m = b.match
  if (m) return m.exact ? { action: "replace", component: m.component, props: matchProps(b) } : { action: "replace", component: m.component, props: matchProps(b), addVariant: lookName(mainLook(b)) }
  if (g.kind === "Other") return { action: "keep" }
  return { action: "new", name: primitiveName(g.kind), variant: lookName(mainLook(b)) }
}

export function describe(c: Choice | undefined): string {
  if (!c) return "Not decided"
  if (c.action === "keep") return "Keep as it is"
  if (c.action === "remove") return "Remove"
  if (c.action === "new") return `New ${c.name}, variant "${c.variant}"`
  const props = Object.entries({ ...c.props, ...(c.addVariant ? { variant: c.addVariant } : {}) }).map(([k, v]) => ` ${k}="${v}"`).join("")
  return `<${c.component}${props}>${c.addVariant ? ` (add variant "${c.addVariant}")` : ""}`
}

/** What the plan leaves the repo with, for one group: "9 buttons → ListRow with 4 variants". */
export function outcome(g: ButtonGroup, plan: Plan) {
  const picks = g.buttons.map((b) => plan.choices[buttonKey(b)])
  const decided = picks.filter(Boolean).length
  const targets = new Map<string, Set<string>>()
  for (const c of picks) {
    if (c?.action === "replace") targets.set(c.component, (targets.get(c.component) ?? new Set()).add(c.addVariant ?? c.props.variant ?? "default"))
    else if (c?.action === "new") targets.set(`${c.name} (new)`, (targets.get(`${c.name} (new)`) ?? new Set()).add(c.variant))
  }
  return {
    decided,
    total: g.buttons.length,
    removed: picks.filter((c) => c?.action === "remove").length,
    kept: picks.filter((c) => c?.action === "keep").length,
    newVariants: picks.filter((c) => c?.action === "replace" && c.addVariant).map((c) => (c as { addVariant: string }).addVariant).filter((v, i, a) => a.indexOf(v) === i),
    targets: [...targets].map(([name, variants]) => ({ name, variants: [...variants] })),
  }
}

/* ───────────────────────── canvas entries ───────────────────────── */

export const GROUPS_SECTION = "Hand-written buttons · by type"

/** One Review entry per button type, in place of a single wall of every button. */
export function withButtonGroups(project: Project, pages: Page[]): Page[] {
  const groups = buttonGroups(project)
  if (!groups.length) return pages
  const entries: Entry[] = groups.map((g) => {
    const matched = g.buttons.filter((b) => b.match?.exact).length
    const near = g.buttons.filter((b) => b.match && !b.match.exact).length
    const lib = [...new Set(g.buttons.map((b) => b.match?.component).filter(Boolean))].join(", ")
    const findings: Note[] = [
      g.looks.length > 1
        ? { level: "issue", text: `${g.buttons.length} buttons written by hand in ${g.looks.length} different looks (${g.looks.map((l) => `${l.name} ×${l.buttons.length}`).join(", ")}). Decide which are real variants and which are copies.` }
        : { level: "warn", text: `${g.buttons.length} button${g.buttons.length > 1 ? "s" : ""} written by hand, all with the same look.` },
      ...(g.stateful.length ? [{ level: "info" as const, text: `${g.stateful.length} change look with a condition in the code. Those looks are states of one button (shown side by side), not separate buttons.` }] : []),
      ...(matched ? [{ level: "info" as const, text: `${matched} already look like a library ${lib} variant and can be replaced with it as it is.` }] : []),
      ...(near ? [{ level: "info" as const, text: `${near} have the shape of a library ${lib} but a look it has no variant for: pick an existing variant, or add one.` }] : []),
      ...(!lib ? [{ level: "info" as const, text: "The library has no component of this shape. Combining them into a new one would give every screen the same version." }] : []),
    ]
    return { id: groupId(g.kind), title: `${g.kind}s · ${g.buttons.length} hand-written, ${g.looks.length} look${g.looks.length > 1 ? "s" : ""}`, confidence: "rendered", w: 1180, findings }
  })
  const blurb = "Every <button> written outside the library, grouped by type. Each row is one button with its states; the right side shows what your decision turns it into."
  return pages.map((p) =>
    p.kind !== "review"
      ? p
      : {
          ...p,
          sections: [{ title: GROUPS_SECTION, blurb, entries }, ...p.sections.map((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== "drift-buttons") })).filter((s) => s.entries.length)],
        },
  )
}

/* ───────────────────────── for the repo ───────────────────────── */

/** The plan as instructions an agent (or a person) can carry out in the repo. */
export function consolidationBrief(project: Project, plan: Plan): string[] {
  const lines: string[] = []
  for (const g of buttonGroups(project)) {
    const decided = g.buttons.filter((b) => plan.choices[buttonKey(b)])
    const rule = plan.rules[g.kind]?.trim()
    if (!decided.length && !rule) continue
    const o = outcome(g, plan)
    lines.push(`## Consolidate ${g.kind.toLowerCase()}s — ${o.decided} of ${o.total} decided`)
    if (rule) lines.push(`Rule from the reviewer: ${rule}`)
    const news = new Map<string, Set<string>>()
    for (const b of decided) {
      const c = plan.choices[buttonKey(b)]
      if (c.action === "new") news.set(c.name, (news.get(c.name) ?? new Set()).add(c.variant))
    }
    for (const [name, variants] of news) lines.push(`Create ${name} in the component library with variants: ${[...variants].join(", ")}. Take each variant's classes from the buttons below that use it.`)
    for (const v of o.newVariants) lines.push(`Add variant "${v}" to the library component named below, with the classes of the buttons that use it.`)
    for (const b of decided) {
      const c = plan.choices[buttonKey(b)]
      const states = b.states.length ? ` It has states in code (${b.states.map((s) => s.when).join("; ")}): keep them as props or state of the replacement.` : ""
      lines.push(`- ${b.file}:${b.line} "${b.label}" (${lookName(mainLook(b))}): ${c.action === "keep" ? "leave as it is." : c.action === "remove" ? "remove this button and its handler." : `replace with ${describe(c)}.`}${c.action === "keep" || c.action === "remove" ? "" : states}`)
    }
    lines.push("")
  }
  return lines
}
