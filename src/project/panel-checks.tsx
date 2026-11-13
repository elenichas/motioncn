/**
 * The Checks tab: only what the canvas found, grouped, with a hint of which fix suits each group.
 * With a fix on screen it re-checks the fix (scanner rules on the fixed code, live scan on the fixed render).
 */
import { useEffect, useState } from "react"
import { ArrowRight, Check, ChevronDown, Columns3, Sparkles, Wand2 } from "lucide-react"
import { draftKey, type Project } from "@/projects"
import { cn } from "@/lib/utils"
import type { Entry, Note } from "./types"
import { CONFIDENCE, LEVEL_ICON, type A11yResult, type FrameA11y } from "./project-frame"
import { KIND_FIX, KIND_LABEL, actionable, autofixBlocked, groupFindings, type FixType } from "./review-model"
import { VERDICT, type ResponsiveResult } from "./responsive"
import { Routing, routeFindings } from "./routing"
import type { Reach } from "./flows"

export type RoutingInfo = {
  /** The repo component this entry shows, when it is exactly one. */
  self: string | null
  entries: Record<string, Entry>
  uses: (name: string) => number
  reach: Reach | null
  openEntry: (id: string) => void
  openScreen: (key: string) => void
}

/** How far a change here reaches: what it is built from, where it is used, and the flow screens it appears in. */
function ReachSection({ r }: { r: RoutingInfo }) {
  const reach = r.reach
  if (!reach || !r.self) return null
  const link = (name: string) =>
    r.entries[name] ? (
      <button key={name} onClick={() => r.openEntry(r.entries[name].id)} className="bg-accent rounded-full px-2 py-0.5 text-[12px] font-medium hover:bg-zinc-200" title={`Open ${name}`}>
        {name}
      </button>
    ) : (
      <span key={name} className="text-muted-foreground rounded-full border border-dashed px-2 py-0.5 text-[12px]" title="Not on the canvas">
        {name}
      </span>
    )
  const row = "flex flex-wrap items-center gap-1"
  const label = "text-muted-foreground mr-1 w-full text-[11.5px]"
  return (
    <details className="group" open={reach.uses > 0 || reach.parts.length > 0}>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" /> Reach · {reach.uses} use{reach.uses === 1 ? "" : "s"}, {reach.screens.length} flow screen{reach.screens.length === 1 ? "" : "s"}
      </summary>
      <div className="mt-2 space-y-3">
        {!!reach.parts.length && (
          <div className={row}>
            <span className={label}>Built from these library components. A problem inside one is fixed there, not here.</span>
            {reach.parts.map(link)}
          </div>
        )}
        {!!reach.usedIn.length && (
          <div className={row}>
            <span className={label}>Used {reach.uses} times, in these components. A fix here reaches all of them.</span>
            {reach.usedIn.slice(0, 14).map(link)}
            {reach.usedIn.length > 14 && <span className="text-muted-foreground text-[12px]">+{reach.usedIn.length - 14}</span>}
          </div>
        )}
        {!!reach.screens.length && (
          <div>
            <span className={label}>Appears in these flow screens (open one to see it in place).</span>
            <ul className="mt-1 space-y-0.5">
              {reach.screens.slice(0, 8).map((s) => (
                <li key={s.key}>
                  <button onClick={() => r.openScreen(s.key)} className="flex w-full items-baseline gap-1.5 rounded-md px-1.5 py-1 text-left text-[12.5px] hover:bg-accent">
                    <span className="font-medium">{s.title}</span>
                    <span className="text-muted-foreground truncate text-[11.5px]">{s.flow}</span>
                    <ArrowRight className="text-muted-foreground ml-auto size-3 shrink-0" />
                  </button>
                </li>
              ))}
              {reach.screens.length > 8 && <li className="text-muted-foreground px-1.5 text-[11.5px]">and {reach.screens.length - 8} more</li>}
            </ul>
          </div>
        )}
      </div>
    </details>
  )
}

/** Which scanner rule a finding comes from, so a fix can be re-checked rule by rule. */
function ruleOf(text: string): string | null {
  if (/hard-coded colou?r/i.test(text)) return "hex"
  if (/inline style object/i.test(text)) return "inline"
  if (/sets its own font/i.test(text)) return "font"
  if (/under the 12px minimum/i.test(text)) return "tiny"
  if (/to the type scale/i.test(text)) return "scale"
  if (/clickable div/i.test(text)) return "click"
  if (/without alt text/i.test(text)) return "alt"
  if (/none of the theme'?s tokens/i.test(text)) return "tokens"
  if (/imports nothing from the component library/i.test(text)) return "library"
  return null
}

function NoteList({ notes, limit = 5, struck }: { notes: Note[]; limit?: number; struck?: boolean }) {
  const [all, setAll] = useState(false)
  return (
    <>
      <ul className="space-y-1.5">
        {(all ? notes : notes.slice(0, limit)).map((f, i) => {
          const L = struck ? { icon: Check, className: "text-emerald-600" } : LEVEL_ICON[f.level]
          return (
            <li key={i} className="flex gap-2 text-[13px] leading-snug">
              <L.icon className={cn("mt-0.5 size-3.5 shrink-0", L.className)} />
              <span className={cn(struck && "text-muted-foreground line-through decoration-zinc-300")}>{f.text.replace(/^Accessibility: /, "")}</span>
            </li>
          )
        })}
      </ul>
      {notes.length > limit && (
        <button onClick={() => setAll((x) => !x)} className="text-muted-foreground hover:text-foreground mt-1.5 text-xs underline underline-offset-2">
          {all ? "Show fewer" : `Show ${notes.length - limit} more`}
        </button>
      )}
    </>
  )
}

const SUGGEST: Record<FixType, { label: string; icon: typeof Wand2 }> = {
  autofix: { label: "Autofix can fix", icon: Wand2 },
  ai: { label: "Best for AI fix", icon: Sparkles },
  manual: { label: "Manual", icon: Wand2 },
}

function Grouped({ notes, onSuggest, blocked }: { notes: Note[]; onSuggest?: (t: FixType) => void; blocked?: boolean }) {
  return (
    <div className="space-y-4">
      {groupFindings(notes).map((g) => {
        const fix = KIND_FIX[g.kind] === "autofix" && blocked ? "ai" : KIND_FIX[g.kind]
        const S = fix ? SUGGEST[fix] : null
        return (
          <section key={g.kind}>
            <header className="mb-1.5 flex items-center gap-2">
              <h4 className="text-[13px] font-semibold">{KIND_LABEL[g.kind]}</h4>
              <span className="text-muted-foreground text-xs tabular-nums">{g.notes.length}</span>
              {S && (
                <button
                  onClick={() => fix && onSuggest?.(fix)}
                  className={cn("ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", fix === "ai" ? "bg-fuchsia-500/10 text-fuchsia-700 hover:bg-fuchsia-500/20" : "bg-sky-500/10 text-sky-700 hover:bg-sky-500/20")}
                  title="Go to Actions"
                >
                  <S.icon className="size-3" /> {S.label}
                </button>
              )}
            </header>
            <NoteList notes={g.notes} />
          </section>
        )
      })}
    </div>
  )
}

/** Live scan of what is on the canvas, per screen width. */
function ScanByWidth({ r, before }: { r?: A11yResult; before?: A11yResult }) {
  if (!r) return <p className="text-muted-foreground text-xs">Scanning…</p>
  const widths = [...new Set(r.findings.map((f) => f.viewport).filter((v): v is string => !!v && v !== "Frame"))]
  const per = (vp?: string) => new Set(r.findings.filter((f) => f.level === "fail" && (!vp || f.viewport === vp)).map((f) => `${f.check}${f.what}`)).size
  const chip = (label: string, n: number) => (
    <span key={label} className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", n ? "bg-red-500/15 text-red-600" : "bg-emerald-500/15 text-emerald-700")}>
      {label}: {n ? `${n} issue${n > 1 ? "s" : ""}` : "pass"}
    </span>
  )
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {before && (
        <>
          <span className="text-muted-foreground text-xs">was {before.issues ? `${before.issues} issue${before.issues > 1 ? "s" : ""}` : "passing"}</span>
          <ArrowRight className="text-muted-foreground size-3" />
        </>
      )}
      {widths.length ? widths.map((vp) => chip(vp, per(vp))) : chip("Result", per())}
    </div>
  )
}

/** Responsive: the verdict, how the layout changes per width, and what to look at. */
function ResponsiveSection({ entry, r, allWidths, showAllWidths }: { entry: Entry; r: ResponsiveResult | null; allWidths: boolean; showAllWidths: () => void }) {
  if (!entry.responsive) return <p className="text-muted-foreground text-[12.5px]">Shown at one width (a specimen), so responsiveness is not judged here. Check it on the Screens page.</p>
  if (!r)
    return (
      <div className="bg-muted/60 flex items-center gap-2 rounded-lg p-2.5 text-[12.5px]">
        <span className="flex-1">{allWidths ? "Measuring each width…" : "Responsiveness is judged by comparing phone, tablet and desktop."}</span>
        {!allWidths && (
          <button onClick={showAllWidths} className="bg-primary text-primary-foreground flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium">
            <Columns3 className="size-3.5" /> Show all three widths
          </button>
        )}
      </div>
    )
  return (
    <div className="space-y-2.5">
      <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-semibold", VERDICT[r.verdict].className)}>{VERDICT[r.verdict].label}</span>
      <table className="w-full text-[12px] tabular-nums">
        <thead className="text-muted-foreground text-left">
          <tr>
            <th className="py-1 font-medium">Width</th>
            <th className="py-1 font-medium">Content</th>
            <th className="py-1 font-medium">Heading</th>
            <th className="py-1 font-medium">Longest line</th>
            <th className="py-1 font-medium">Fits</th>
          </tr>
        </thead>
        <tbody>
          {r.rows.map((row) => (
            <tr key={row.vp} className="border-t">
              <td className="py-1">{row.vp} <span className="text-muted-foreground">{row.vw}</span></td>
              <td className="py-1">{row.width}px <span className="text-muted-foreground">{Math.round(row.share * 100)}%</span></td>
              <td className="py-1">{row.heading}px</td>
              <td className={cn("py-1", row.maxLine > 90 && "font-semibold text-amber-700")}>{row.maxLine ? `${row.maxLine} ch` : "—"}</td>
              <td className="py-1">{row.overflow ? <span className="font-semibold text-red-600">no</span> : "yes"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {r.notes.length ? <NoteList notes={r.notes} limit={10} /> : <p className="flex items-center gap-1.5 text-[12.5px] text-emerald-700"><Check className="size-3.5" /> Fits every width and adapts its layout.</p>}
    </div>
  )
}

export function ChecksTab({ project, entry, a11y, fixed, onSuggest, responsive, allWidths, showAllWidths, routing }: { project: Project; entry: Entry; a11y?: FrameA11y; fixed: boolean; onSuggest: (t: FixType) => void; responsive: ResponsiveResult | null; allWidths: boolean; showAllWidths: () => void; routing: RoutingInfo }) {
  const [draftNotes, setDraftNotes] = useState<Note[] | null>(null)
  const version = a11y?.draft?.at
  useEffect(() => {
    if (!fixed) return setDraftNotes(null)
    fetch(`/__canvas/draft-findings?project=${encodeURIComponent(project.manifest.id)}&entry=${encodeURIComponent(draftKey(entry.id))}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setDraftNotes, () => setDraftNotes([]))
  }, [fixed, project.manifest.id, entry.id, version])

  const originalA11y = actionable(entry, a11y).filter((n) => n.text.startsWith("Accessibility:"))
  const original = [...(entry.findings ?? []).filter((n) => n.level !== "info"), ...originalA11y]
  const info = (entry.findings ?? []).filter((n) => n.level === "info")

  let body: React.ReactNode
  if (!fixed) {
    body = original.length ? <Grouped notes={original} onSuggest={onSuggest} blocked={!!autofixBlocked(entry)} /> : <p className="text-muted-foreground text-[13px]">Nothing found in the review or the live scan.</p>
  } else {
    const liveOpen: Note[] = [...new Set((a11y?.draft?.findings ?? []).filter((x) => x.level === "fail").map((x) => `Accessibility: ${x.check} ${x.value} on ${x.what}`))].map((text) => ({ level: "issue", text }))
    const open = [...(draftNotes ?? []), ...liveOpen]
    const openRules = new Set(open.map((n) => ruleOf(n.text)).filter(Boolean))
    const liveTexts = new Set(liveOpen.map((n) => n.text))
    const resolved = original.filter((n) => (ruleOf(n.text) ? !openRules.has(ruleOf(n.text)) : n.text.startsWith("Accessibility:") && !liveTexts.has(n.text)))
    const unchecked = original.filter((n) => !ruleOf(n.text) && !n.text.startsWith("Accessibility:"))
    body = (
      <div className="space-y-5">
        <div>
          <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">Still open in the fix · {draftNotes === null ? "…" : open.length}</h3>
          {draftNotes === null ? (
            <p className="text-muted-foreground text-[13px]">Re-checking the fix…</p>
          ) : open.length ? (
            <Grouped notes={open} onSuggest={onSuggest} blocked={!!autofixBlocked(entry)} />
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-700">
              <Check className="size-3.5" /> Nothing open: the fix passes the scanner&apos;s rules and the live checks.
            </p>
          )}
        </div>
        {!!resolved.length && (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" /> Fixed · {resolved.length}
            </summary>
            <div className="mt-2">
              <NoteList notes={resolved} limit={20} struck />
            </div>
          </details>
        )}
        {!!unchecked.length && (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" /> Review notes, not re-checked · {unchecked.length}
            </summary>
            <div className="mt-2">
              <NoteList notes={unchecked} limit={20} />
            </div>
          </details>
        )}
      </div>
    )
  }

  // Where each live failure has to be fixed. Only worth showing when some of it is not simply "here".
  const routes = routeFindings((fixed ? a11y?.draft : a11y?.current)?.findings ?? [], routing.self)
  const elsewhere = routes.length > 0

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">Live scan on the canvas</h3>
        <ScanByWidth r={fixed ? a11y?.draft : a11y?.current} before={fixed ? a11y?.current : undefined} />
        <p className="text-muted-foreground mt-1.5 text-[11.5px] leading-snug">Contrast, target size, names, focus, and whether it fits each screen. Keyboard flow and screen readers still need a person.</p>
      </section>
      {elsewhere && (
        <section>
          <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">Where to fix</h3>
          <Routing routes={routes} here={(entry.inApp && !entry.inPlace) || /^screen-/.test(entry.id) ? "this screen" : "this component"} entries={routing.entries} uses={routing.uses} onOpen={(e) => routing.openEntry(e.id)} onFixHere={() => onSuggest("autofix")} />
        </section>
      )}
      <ReachSection r={routing} />
      <section>
        <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">Responsive</h3>
        <ResponsiveSection entry={entry} r={responsive} allWidths={allWidths} showAllWidths={showAllWidths} />
      </section>
      <section>{body}</section>
      {!!info.length && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" /> Notes · {info.length}
          </summary>
          <div className="mt-2">
            <NoteList notes={info} limit={20} />
          </div>
        </details>
      )}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" /> How it is rendered · {CONFIDENCE[entry.confidence].label.toLowerCase()}
        </summary>
        <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-xs">
          {(entry.assumptions ?? ["Real component with sample data from the repo."]).map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}
