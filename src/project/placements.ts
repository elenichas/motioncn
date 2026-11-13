/**
 * Placements: where an approved component lives on the canvas (page › section). Approving a component in
 * Review moves it to the library; the placement is saved in the project (placements.json) so it stays put
 * whatever later scans of the repo say.
 */
import { useCallback, useEffect, useState } from "react"
import type { Entry, Page } from "./types"

export type Placement = {
  /** The entry's id (a manifest id, or "auto~<file>~<export>" for a component that came from main). */
  id: string
  title: string
  where?: string
  page: string
  section: string
  placedAt: string
}

export function usePlacements(project: string) {
  const [list, setList] = useState<Placement[]>([])
  const load = useCallback(() => fetch(`/__canvas/placements?project=${encodeURIComponent(project)}`).then((r) => (r.ok ? r.json() : [])).then(setList, () => {}), [project])
  useEffect(() => {
    load()
    const hot = import.meta.hot
    const on = (d: { project: string }) => d.project === project && load()
    hot?.on("canvas:placements", on)
    return () => hot?.off("canvas:placements", on)
  }, [project, load])
  const save = (next: Placement[]) => {
    setList(next)
    return fetch(`/__canvas/placements?project=${encodeURIComponent(project)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placements: next }) })
  }
  return {
    list,
    get: (id: string) => list.find((p) => p.id === id),
    place: (p: Omit<Placement, "placedAt">) => save([...list.filter((x) => x.id !== p.id), { ...p, placedAt: new Date().toISOString() }]),
    unplace: (id: string) => save(list.filter((x) => x.id !== id)),
  }
}
export type Placements = ReturnType<typeof usePlacements>

/** Every library page › section a component can go to. */
export const targets = (pages: Page[]) =>
  pages.filter((p) => p.kind !== "review").flatMap((p) => p.sections.map((s) => ({ page: p.id, pageTitle: p.title, section: s.title })))

/**
 * A first guess at where a component belongs, from what it is: full screens and flows → Screens;
 * tokens and type → Foundations; everything else → the closest Components section.
 */
export function suggestPlacement(entry: Entry, pages: Page[]): { page: string; section: string } {
  const all = targets(pages)
  const name = (entry.title.split("·")[0] + " " + (entry.where ?? "")).toLowerCase()
  const pick = (page: string, sectionRe: RegExp) => {
    const t = all.find((x) => x.page === page && sectionRe.test(x.section.toLowerCase())) ?? all.find((x) => x.page === page)
    return t ? { page: t.page, section: t.section } : null
  }
  const rules: Array<[RegExp, string, RegExp]> = [
    [/screen|page|view|flow|gate|entry|tab\b|app\b|layout/, "screens", /./],
    [/token|colou?r|type|font|radius|surface|theme/, "foundations", /colou?r|type|surface/],
    [/form|field|input|picker|calendar|feedback|survey|rating|review/, "components", /form|picker/],
    [/button|link|action|cta/, "components", /action/],
    [/chip|toggle|segment|option|select|switch|radio|check/, "components", /selection/],
    [/photo|image|media|brand|logo|wordmark|avatar/, "components", /media|brand/],
    [/pill|badge|status|tag|label/, "components", /status/],
    [/card|sheet|header|panel|dialog|modal|section|list/, "components", /structure/],
  ]
  for (const [re, page, section] of rules) if (re.test(name)) {
    const t = pick(page, section)
    if (t) return t
  }
  return pick("components", /./) ?? { page: all[0]?.page ?? "components", section: all[0]?.section ?? "Components" }
}
