/**
 * User flows: the second canvas of a project. A flow is a row of screens joined by the action that leads
 * from one to the next. Screens are the real app (never images), reached by replaying those actions.
 */
import { placeId, type Project } from "@/projects"
import type { Entry, Page } from "./types"

/** The state change in the repo that makes a step happen: 'setStage("trip")' in a file. */
export type Via = { file: string; call: string }
export type FlowScreen = {
  id: string
  title: string
  /** Preview id the screen starts from. */
  base: string
  /** Controls pressed, in order, to get from the base preview to this screen. */
  drive: string[]
  /** The repo component that is this screen. */
  component?: string
  /** What the user does on the previous screen to get here. */
  action?: string
  via?: Via
  note?: string
}
/** A way out of the flow's main line: another flow, a sheet, or something the canvas cannot show. */
export type FlowExit = { from: string; label: string; to: string; /** "<flow id>/<screen id>" */ toScreen?: string; via?: Via }
export type Flow = { id: string; title: string; goal: string; screens: FlowScreen[]; exits?: FlowExit[] }

export const screenKey = (flow: string, screen: string) => `${flow}/${screen}`

type Nav = Project["scan"]["navigation"][number]
const literal = (call: string) => /"|\(true\)$|^event /.test(call)
const cites = (n: Nav, via: Via) => n.file === via.file && n.call === via.call

/**
 * Does the latest scan still find the state change a step cites?
 * "changed" means the repo no longer has it there: the flow needs tracing again.
 * Calls with a variable argument (setEntry(k)) cannot be matched by the scanner and are left unchecked.
 */
export function viaState(project: Project, via?: Via): "traced" | "changed" | "unchecked" {
  if (!via || !literal(via.call)) return "unchecked"
  return project.scan.navigation.some((n) => cites(n, via)) ? "traced" : "changed"
}

/** Transitions the scanner found that no flow cites: parts of the app the flows do not cover yet. */
export function untraced(project: Project): Nav[] {
  const vias = project.flows.flatMap((f) => [...f.screens, ...(f.exits ?? [])]).map((s) => s.via).filter((v): v is Via => !!v)
  return project.scan.navigation.filter((n) => !/Provider$/.test(n.inside ?? "") && !vias.some((v) => cites(n, v)))
}

/* ───────────── components ↔ canvas entries ↔ screens ───────────── */

/** The repo component an entry shows, when it points at exactly one. */
export function componentOf(project: Project, entry: Entry): string | null {
  if (/^(auto|place)~/.test(entry.id)) return entry.id.split("~")[2]
  const m = entry.where?.match(/^([\w./-]+):(\d+)$/)
  if (!m) return null
  return project.scan.components.find((c) => c.file === m[1] && c.line === Number(m[2]))?.name ?? null
}

/** Component name → the entry that shows it on the Components canvas (library pages win over Review). */
export function entriesByComponent(project: Project, pages: Page[]): Record<string, Entry> {
  const out: Record<string, Entry> = {}
  const ordered = [...pages].sort((a, b) => Number(a.kind === "review") - Number(b.kind === "review"))
  for (const p of ordered)
    for (const s of p.sections)
      for (const e of s.entries) {
        const name = componentOf(project, e)
        if (name && !e.proposal && !out[name]) out[name] = e
      }
  return out
}

/** Everything a component is built from, directly or through what it uses. */
function builtFrom(project: Project, name: string): Set<string> {
  const seen = new Set<string>([name])
  const queue = [name]
  while (queue.length) {
    const cur = queue.pop()!
    for (const u of project.scan.usage) if (u.inside === cur && !seen.has(u.name)) (seen.add(u.name), queue.push(u.name))
  }
  return seen
}

export type Reach = {
  /** JSX uses in the repo, and the components they are in. */
  uses: number
  usedIn: string[]
  /** Library components this one renders. */
  parts: string[]
  /** Flow screens whose component is, or is built from, this one. */
  screens: Array<{ key: string; flow: string; title: string }>
}
/** How far a change to a component reaches. */
export function reachOf(project: Project, name: string): Reach {
  const uses = project.scan.usage.filter((u) => u.name === name)
  const lib = new Set(project.scan.components.filter((c) => c.library).map((c) => c.name))
  const screens: Reach["screens"] = []
  const seen = new Set<string>()
  for (const f of project.flows)
    for (const s of f.screens) {
      if (!s.component || !builtFrom(project, s.component).has(name)) continue
      // the same screen appears in several flows (Gate, Today): list each title once per flow
      const k = `${f.id}:${s.title}`
      if (!seen.has(k)) (seen.add(k), screens.push({ key: screenKey(f.id, s.id), flow: f.title, title: s.title }))
    }
  return {
    uses: uses.length,
    usedIn: [...new Set(uses.map((u) => u.inside).filter((x): x is string => !!x && x !== name))],
    parts: [...new Set(project.scan.usage.filter((u) => u.inside === name && lib.has(u.name) && u.name !== name).map((u) => u.name))],
    screens,
  }
}

/* ───────────── components the flows found that the canvas does not show ───────────── */

export const FOUND_SECTION = "Found in screens · not exported"

/**
 * Components that are on flow screens but have no entry: local helpers inside screen files (a card, a tab bar),
 * which cannot be imported and rendered alone. Each becomes an entry shown in place on a screen that has it.
 * Wrappers that only hold a whole screen (the app shell) are left out: the Screens page already shows those.
 */
export function withFound(project: Project, pages: Page[]): Page[] {
  if (!project.flows.length) return pages
  const have = entriesByComponent(project, pages)
  const screens = project.flows.flatMap((f) => f.screens.map((s) => ({ ...s, flow: f.title })))
  const screenComponents = new Set(screens.map((s) => s.component).filter(Boolean))
  const used = new Set(project.scan.usage.map((u) => u.name))
  const seen = new Set<string>()
  const entries: Entry[] = []
  for (const c of project.scan.components) {
    if (c.library || have[c.name] || seen.has(c.name) || !used.has(c.name) || /Provider$/.test(c.name)) continue
    seen.add(c.name)
    const made = builtFrom(project, c.name)
    if ([...screenComponents].some((s) => made.has(s!))) continue
    // Screens built from it come first; for app chrome (a tab bar) any screen may have it, so try a few.
    const sure = screens.filter((s) => s.component && builtFrom(project, s.component).has(c.name))
    // (the ones reached in fewest presses first: they are the app's main states)
    const tryThese = sure.length ? sure : [...screens].sort((a, b) => a.drive.length - b.drive.length)
    const distinct = tryThese.filter((s, i) => tryThese.findIndex((x) => x.base === s.base && x.drive.join() === s.drive.join()) === i).slice(0, 8)
    const uses = project.scan.usage.filter((u) => u.name === c.name).length
    entries.push({
      id: placeId(c.file, c.name),
      title: c.name,
      where: `${c.file}:${c.line}`,
      confidence: "assumed",
      responsive: true,
      inApp: true,
      inPlace: { component: c.name, screens: distinct.map((s) => ({ title: `${s.title} (${s.flow})`, base: s.base, drive: s.drive })) },
      assumptions: ["Shown in place on a flow screen, outlined: it is not exported, so it cannot be rendered alone", "The accessibility checks cover this component only, not the rest of the screen"],
      findings: [{ level: "info", text: `A local component in ${c.file.split("/").pop()}, used ${uses} time${uses === 1 ? "" : "s"}. Not part of the library: approve it as it is, fix it, or merge it into a library component.` }],
    })
  }
  if (!entries.length) return pages
  const target = pages.find((p) => p.id === "components") ?? [...pages].reverse().find((p) => p.kind !== "review") ?? pages[0]
  const blurb = "Local components inside screen files. Each is shown on a screen that uses it, with the checks limited to it."
  return pages.map((p) => (p.id !== target.id ? p : { ...p, sections: [...p.sections.filter((s) => s.title !== FOUND_SECTION), { title: FOUND_SECTION, blurb, entries }] }))
}
