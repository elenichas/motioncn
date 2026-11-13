/**
 * Where each fix belongs. A failed check is shown where you see it, but the cause lives in one place:
 * - in a library component's own markup: fix it there once and every use gets it
 * - in how a composite uses a library component (its own colours or size passed in, or the surface it is
 *   placed on): fix the composite; the primitive is fine
 * - in the composite's own markup (a title on a photo): fix the composite; no primitive is involved
 */
import { ArrowUpRight, Boxes, CornerDownRight, MapPin, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Entry, LiveFinding, Located } from "./types"

export type Route = {
  key: string
  kind: "here" | "component" | "usage" | "unknown"
  /** The component to fix. */
  target?: Located
  /** For "usage": the library component being used. */
  about?: Located
  why?: string
  findings: LiveFinding[]
}

/** Group failed checks by the component that has to change. `self` is the component the frame shows. */
export function routeFindings(findings: LiveFinding[], self?: string | null): Route[] {
  const routes = new Map<string, Route>()
  const seen = new Set<string>()
  for (const f of findings) {
    if (f.level !== "fail") continue
    const id = `${f.check}|${f.value}|${f.what}|${f.owner?.name}|${f.via?.name}`
    if (seen.has(id)) continue
    seen.add(id)
    const target = f.scope === "usage" ? f.via : f.owner
    const kind: Route["kind"] = !target ? "unknown" : target.name === self ? "here" : f.scope === "usage" ? "usage" : "component"
    const key = `${kind}:${target?.name ?? ""}:${f.scope === "usage" ? f.owner?.name : ""}`
    const r = routes.get(key) ?? { key, kind, target, about: f.scope === "usage" ? f.owner : undefined, why: f.why, findings: [] }
    r.findings.push(f)
    routes.set(key, r)
  }
  const order = { here: 0, usage: 1, component: 2, unknown: 3 }
  return [...routes.values()].sort((a, b) => order[a.kind] - order[b.kind] || b.findings.length - a.findings.length)
}

/** What to change for each kind of failed check, in plain words. */
const HOW: Array<[RegExp, string]> = [
  [/text contrast/i, "Text needs 4.5:1 against what is behind it (3:1 from 24px, or 19px bold). Use a darker or lighter text token, or change the surface under it."],
  [/graphic contrast/i, "Icons and control outlines need 3:1 against what is behind them. Change the icon colour, or give the control a visible fill or border."],
  [/target size/i, "Make the control at least 44 by 44px. Padding counts, so the visible shape can stay small."],
  [/accessible name/i, "Give the control a name: visible text, or an aria-label when it is only an icon."],
  [/keyboard/i, "It must be reachable with Tab and work with Enter or Space: use a real button or link."],
  [/fits the screen/i, "Something is wider than the screen at this width: let it wrap or shrink instead of using a fixed width."],
]
const howFor = (r: Route) => [...new Set(r.findings.map((f) => HOW.find(([re]) => re.test(f.check))?.[1]).filter((x): x is string => !!x))]

type Props = {
  routes: Route[]
  /** Fix what belongs to the thing on screen: opens the tools for it. */
  onFixHere?: () => void
  /** What "here" is called: "this component", "this screen". */
  here: string
  entries: Record<string, Entry>
  uses: (name: string) => number
  onOpen: (entry: Entry) => void
}

export function Routing({ routes, here, entries, uses, onOpen, onFixHere }: Props) {
  if (!routes.length) return null
  return (
    <ul className="space-y-2">
      {routes.map((r) => {
        const entry = r.target ? entries[r.target.name] : undefined
        const n = r.target ? uses(r.target.name) : 0
        const Icon = r.kind === "here" || r.kind === "unknown" ? MapPin : r.kind === "usage" ? CornerDownRight : Boxes
        return (
          <li key={r.key} className={cn("rounded-lg border p-2.5", r.kind === "component" && r.target?.library && "border-sky-300 bg-sky-50/60")}>
            <div className="flex items-start gap-2">
              <Icon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug font-semibold">
                  {r.kind === "here" || r.kind === "unknown"
                    ? `Fix ${here}`
                    : r.kind === "usage"
                      ? `Fix in ${r.target!.name}: how it uses ${r.about?.name}`
                      : `Fix in ${r.target!.name}`}
                  <span className="text-muted-foreground ml-1.5 font-normal tabular-nums">{r.findings.length}</span>
                </p>
                <p className="text-muted-foreground mt-0.5 text-[11.5px] leading-snug">
                  {r.kind === "unknown"
                    ? "Not written by a component the scanner knows."
                    : r.kind === "here"
                      ? r.findings.some((f) => f.scope === "usage")
                        ? `${r.why ?? "It restyles a library component"}. The library component is fine: change it here.`
                        : r.target?.library
                          ? `Its own markup. ${n} use${n === 1 ? "" : "s"} in the repo get the fix.`
                          : "Its own markup: no library component is involved."
                      : r.kind === "usage"
                        ? `${r.why}. ${r.about?.name} itself is fine: use one of its variants, or change the surface.`
                        : r.target?.library
                          ? `Library component. Fix it once and all ${n} uses get it, this one included.`
                          : `${r.target!.name}'s own markup, in ${r.target!.file}:${r.target!.line}.`}
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {r.findings.slice(0, 4).map((f, i) => (
                    <li key={i} className="text-[12px] leading-snug">
                      {f.check} {f.value} <span className="text-muted-foreground">on {f.what}</span>
                    </li>
                  ))}
                  {r.findings.length > 4 && <li className="text-muted-foreground text-[11.5px]">and {r.findings.length - 4} more</li>}
                </ul>
                {howFor(r).map((h) => (
                  <p key={h} className="bg-muted/70 mt-2 rounded-md px-2 py-1.5 text-[11.5px] leading-snug">
                    <span className="font-semibold">How: </span>
                    {h}
                  </p>
                ))}
              </div>
              {(r.kind === "here" || r.kind === "unknown") && onFixHere && (
                <button onClick={onFixHere} className="bg-foreground text-background flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[12px] font-medium" title="Open the fix tools: change it by hand, Autofix, or AI fix">
                  <Wrench className="size-3.5" /> Fix
                </button>
              )}
              {r.kind !== "here" && r.kind !== "unknown" &&
                (entry ? (
                  <button onClick={() => onOpen(entry)} className="bg-foreground text-background flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[12px] font-medium" title={`Open ${entry.title} on the Components canvas, where it can be fixed`}>
                    Fix there <ArrowUpRight className="size-3.5" />
                  </button>
                ) : (
                  <span className="text-muted-foreground shrink-0 rounded-md border border-dashed px-1.5 py-1 text-[11px]" title={`${r.target!.file}:${r.target!.line}`}>
                    Not on the canvas
                  </span>
                ))}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
