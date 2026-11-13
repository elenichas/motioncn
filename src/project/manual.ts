/**
 * Manual fix: style edits you make on the canvas, per element, kept as data
 * (src/projects/<id>/drafts/<entry>.manual.json) and applied live in the fix frames as CSS overrides.
 * They travel with your decision, and an AI fix writes them into the code.
 */

/** One edited element: a CSS selector from the preview root, a readable label, and CSS properties → values. */
export type ManualEdit = { selector: string; label: string; styles: Record<string, string> }

/** What a preview frame reports about the element you clicked in inspect mode. */
export type Picked = {
  selector: string
  label: string
  computed: Record<string, string>
  /** Text contrast against what is behind it, when the element holds text. */
  contrast?: { ratio: number; fg: string; bg: string; large: boolean }
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? res.statusText)
  return data as T
}

export const manualApi = {
  list: (project: string) => call<string[]>("GET", `/__canvas/manuals?project=${encodeURIComponent(project)}`).catch(() => [] as string[]),
  get: (project: string, entry: string) => call<ManualEdit[]>("GET", `/__canvas/manual?project=${encodeURIComponent(project)}&entry=${encodeURIComponent(entry)}`).catch(() => [] as ManualEdit[]),
  put: (project: string, entry: string, edits: ManualEdit[]) => call<{ ok: true }>("PUT", "/__canvas/manual", { project, entry, edits }),
}

/** CSS rules for a set of edits; !important so they win over the component's own classes and inline styles. */
export const manualCss = (edits: ManualEdit[]) =>
  edits
    .map((e) => `${e.selector}{${Object.entries(e.styles).map(([k, v]) => `${k}:${v} !important`).join(";")}}`)
    .join("\n")

/** Set or clear one property on one element's edit, returning the new list. */
export function setStyle(edits: ManualEdit[], pick: { selector: string; label: string }, prop: string, value: string | null): ManualEdit[] {
  const others = edits.filter((e) => e.selector !== pick.selector)
  const current = edits.find((e) => e.selector === pick.selector)?.styles ?? {}
  const styles = { ...current }
  if (value === null || value === "") delete styles[prop]
  else styles[prop] = value
  return Object.keys(styles).length ? [...others, { selector: pick.selector, label: pick.label, styles }] : others
}
