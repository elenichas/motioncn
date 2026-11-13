/**
 * Which repo component an element on screen belongs to, read from React's own records (dev builds keep,
 * for every element, the component whose code created it). Used for two things:
 * - locating: click something in a flow screen and get the trail of components around it
 * - ownership: deciding where the fix for a finding belongs (the primitive, or the composite using it)
 */
import type { Located, Ownership } from "@/project/types"

type Fiber = { type: unknown; return: Fiber | null; alternate?: Fiber | null; _debugOwner?: Fiber | null; memoizedProps?: Record<string, unknown> | null }
type Author = { loc: Located; fiber: Fiber }

let known = new Map<string, Located>()
export function setKnown(components: Array<{ name: string; file: string; line: number; library: boolean }>) {
  known = new Map()
  // The first declaration of a name wins; library ones first, so a primitive is never shadowed by a local helper.
  for (const c of [...components].sort((a, b) => Number(b.library) - Number(a.library))) if (!known.has(c.name)) known.set(c.name, { name: c.name, file: c.file, line: c.line, library: c.library })
}

function fiberOf(el: Element): Fiber | null {
  for (const k in el) if (k.startsWith("__reactFiber$")) return (el as unknown as Record<string, Fiber>)[k]
  return null
}
function nameOf(type: unknown): string | null {
  if (typeof type === "function") return (type as { displayName?: string }).displayName || type.name || null
  if (type && typeof type === "object") {
    const t = type as { displayName?: string; render?: unknown; type?: unknown }
    return t.displayName ?? nameOf(t.render ?? t.type)
  }
  return null
}
const same = (a: Fiber, b: Fiber) => a === b || a.alternate === b

/** The nearest repo component whose code created this fiber's element. */
function authorOf(f: Fiber | null): Author | null {
  for (let o = f?._debugOwner ?? null, i = 0; o && i < 200; o = o._debugOwner ?? null, i++) {
    const loc = known.get(nameOf(o.type) ?? "")
    if (loc) return { loc, fiber: o }
  }
  return null
}

/** Components around an element, innermost first: who wrote it, who used that, and so on up to the app. */
export function trail(el: Element): Located[] {
  const out: Located[] = []
  for (let a = authorOf(fiberOf(el)); a && out.length < 12; a = authorOf(a.fiber)) out.push(a.loc)
  return out
}

/** The outermost element a library component drew around `el`; for a composite's own markup, `el` itself. */
export function rootOf(el: Element): Element {
  const a = authorOf(fiberOf(el))
  if (!a?.loc.library) return el
  let root = el
  for (let p = el.parentElement; p && p.id !== "root"; p = p.parentElement) {
    const pa = authorOf(fiberOf(p))
    if (!pa || !same(pa.fiber, a.fiber)) break
    root = p
  }
  return root
}

/** Every outermost element written by the named component that is on screen. */
export function rootsOf(name: string): Element[] {
  const out: Element[] = []
  const is = (el: Element | null) => !!el && authorOf(fiberOf(el))?.loc.name === name
  for (const el of document.querySelectorAll("#root *")) {
    if (!is(el) || out.some((r) => r.contains(el))) continue
    const r = el.getBoundingClientRect()
    if (r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== "hidden" && !el.closest("[hidden], [aria-hidden='true']")) out.push(el)
  }
  return out
}

/** The element whose background the text at `el` is read against. */
function surfaceOf(el: Element): Element | null {
  for (let n: Element | null = el; n && n.id !== "root"; n = n.parentElement) {
    const cs = getComputedStyle(n)
    const bg = cs.backgroundColor
    // "rgba(r, g, b, a)" or "color(... / a)" carry an alpha; anything else that is not transparent is solid
    const a = bg === "transparent" ? 0 : Number(bg.match(/(?:,|\/)\s*([\d.]+)\s*\)$/)?.[1] ?? 1)
    if (a > 0.5 || cs.backgroundImage !== "none") return n
  }
  return null
}

const COLOUR = /(^|\s)(?:[\w-]+:)*(?:text|bg)-(?!\[?\d|xs|sm|base|lg|xl|left|right|center)/
const SIZE = /(^|\s)(?:[\w-]+:)*(?:h|size|min-h|p|px|py)-/

/**
 * Where the fix for a failed check on `el` belongs.
 * A library component's own markup is fixed in the library (every use gets it), unless the caller restyled it
 * or put it on a surface it was not made for: then the fix is in the caller.
 */
export function ownership(el: Element, check: { label: string }): Ownership {
  const a = authorOf(fiberOf(el))
  if (!a) return {}
  if (!a.loc.library) return { owner: a.loc, scope: "component" }
  const caller = authorOf(a.fiber)
  if (!caller) return { owner: a.loc, scope: "component" }
  const cls = String(a.fiber.memoizedProps?.className ?? "")
  const contrast = /contrast/i.test(check.label)
  if (contrast && COLOUR.test(cls)) return { owner: a.loc, via: caller.loc, scope: "usage", why: `${caller.loc.name} passes its own colours to ${a.loc.name}: “${cls}”` }
  if (/target size/i.test(check.label) && SIZE.test(cls)) return { owner: a.loc, via: caller.loc, scope: "usage", why: `${caller.loc.name} passes its own size to ${a.loc.name}: “${cls}”` }
  if (contrast) {
    const surface = surfaceOf(el)
    const sa = surface && authorOf(fiberOf(surface))
    if (sa && !same(sa.fiber, a.fiber)) return { owner: a.loc, via: caller.loc, scope: "usage", why: `${a.loc.name} sits on a background drawn by ${sa.loc.name}` }
  }
  return { owner: a.loc, scope: "component" }
}
