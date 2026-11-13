/**
 * Decisions made on the canvas, in a small bar above the selected component(s).
 * One selected: Approve (or Approve fix) and Remove. Several (shift-click): keep one, keep all as variants,
 * or replace them all with a new component drafted by AI fix.
 */
import { useState } from "react"
import { Check, Copy, GitMerge, Layers, Sparkles, Trash2, Undo2, Wrench } from "lucide-react"
import { draftKey, type Project } from "@/projects"
import { cn } from "@/lib/utils"
import type { Entry, Page } from "./types"
import { suggestPlacement, targets, type Placements } from "./placements"
import type { Decisions } from "./decisions"
import { autofix } from "./draft-api"
import { actionable, type FixType } from "./review-model"

type Props = {
  project: Project
  entry: Entry
  selection: string[]
  entries: Entry[]
  decisions: Decisions
  hasFix: boolean
  setSelected: (id: string | null) => void
  setPanelTab: (t: "checks" | "actions") => void
  setTab: (t: FixType | null) => void
  placements: Placements
  pages: Page[]
  /** The component is on the Review page: approving it also places it in the library. */
  inReview: boolean
}

const pill = "flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium transition-colors"

export function CanvasActions({ project, entry, selection, entries, decisions, hasFix, setSelected, setPanelTab, setTab, placements, pages, inReview }: Props) {
  const d = decisions.get(entry.id)
  const [placing, setPlacing] = useState<string | null>(null)
  const options = targets(pages)
  const value = (t: { page: string; section: string }) => `${t.page}::${t.section}`
  const placement = placements.get(entry.id)
  const bar = (children: React.ReactNode) => <div className="bg-background inline-flex flex-wrap items-center gap-1 rounded-full border p-1 shadow-md">{children}</div>

  if (selection.length < 2) {
    const approveAs = hasFix ? "apply-fix" : "approved"
    const approved = d?.status === "apply-fix" || d?.status === "approved"
    const removed = d?.status === "deprecate"
    const confirmPlace = () => {
      const [page, section] = (placing ?? "").split("::")
      if (!approved) decisions.set(entry.id, approveAs)
      placements.place({ id: entry.id, title: entry.title.replace(/ · new$/, ""), where: entry.where, page, section })
      setPlacing(null)
      setSelected(null)
    }
    if (placing !== null)
      return bar(
        <>
          <span className="px-1.5 text-[12px] font-semibold">Add to</span>
          <select value={placing} onChange={(e) => setPlacing(e.target.value)} className="h-7 rounded-full border bg-transparent px-2 text-[12px]" aria-label="Where it goes in the library">
            {options.map((o) => (
              <option key={value(o)} value={value(o)}>
                {o.pageTitle} › {o.section}
              </option>
            ))}
          </select>
          <button onClick={confirmPlace} className={cn(pill, "bg-emerald-600 text-white")}>
            <Check className="size-3.5" /> Approve and add
          </button>
          <button onClick={() => setPlacing(null)} className={cn(pill, "text-muted-foreground hover:bg-accent")}>
            Cancel
          </button>
        </>,
      )
    return bar(
      <>
        <button
          onClick={() => {
            if (approved) {
              decisions.set(entry.id, null)
              if (placement) placements.unplace(entry.id)
            } else if (inReview) setPlacing(value(suggestPlacement(entry, pages)))
            else decisions.set(entry.id, approveAs)
          }}
          className={cn(pill, approved ? "bg-emerald-600 text-white" : "hover:bg-emerald-50 hover:text-emerald-800")}
          title={approved && placement ? "Undo: un-approve and move it back to Review" : undefined}
        >
          <Check className="size-3.5" /> {approved ? (hasFix ? "Fix approved" : "Approved") : hasFix ? "Approve fix" : "Approve"}
        </button>
        {approved && inReview && !placement && (
          <button onClick={() => setPlacing(value(suggestPlacement(entry, pages)))} className={cn(pill, "bg-foreground text-background")} title="Move it out of Review onto a library page">
            <Layers className="size-3.5" /> Add to library
          </button>
        )}
        {placement && (
          <select
            value={value(placement)}
            onChange={(e) => {
              const [page, section] = e.target.value.split("::")
              placements.place({ ...placement, page, section })
            }}
            className="text-muted-foreground h-7 max-w-44 rounded-full border bg-transparent px-2 text-[12px]"
            aria-label="Move to"
            title="Move to another page or section"
          >
            {options.map((o) => (
              <option key={value(o)} value={value(o)}>
                {o.pageTitle} › {o.section}
              </option>
            ))}
          </select>
        )}
        {placement && (
          <button onClick={() => (placements.unplace(entry.id), decisions.set(entry.id, null))} className={cn(pill, "text-muted-foreground hover:bg-accent")} title="Un-approve and move it back to Review">
            <Undo2 className="size-3.5" /> Back to review
          </button>
        )}
        <button onClick={() => decisions.set(entry.id, removed ? null : "deprecate")} className={cn(pill, removed ? "bg-red-600 text-white" : "hover:bg-red-50 hover:text-red-700")}>
          <Trash2 className="size-3.5" /> {removed ? "Marked for removal" : "Remove"}
        </button>
        <span className="bg-border mx-0.5 h-4 w-px" />
        <button onClick={() => setPanelTab("actions")} className={cn(pill, "text-muted-foreground hover:bg-accent hover:text-foreground")}>
          <Wrench className="size-3.5" /> Fix
        </button>
        <span className="text-muted-foreground px-1.5 text-[11px]">Shift-click another to compare</span>
      </>,
    )
  }

  const picked = selection.map((id) => entries.find((e) => e.id === id)).filter((e): e is Entry => !!e)
  const [first, ...rest] = picked
  const keep = (winner: Entry) => {
    decisions.set(winner.id, "approved")
    for (const e of picked) if (e.id !== winner.id) decisions.set(e.id, "merge", `Merge into ${winner.title}`, winner.id)
  }
  const variants = () => {
    decisions.set(first.id, "approved")
    for (const e of rest) decisions.set(e.id, "variant", `Keep as a variant of ${first.title}`, first.id)
  }
  const replace = async () => {
    for (const e of rest) decisions.set(e.id, "merge", `Replaced by a new version of ${first.title}`, first.id)
    const instruction = [
      `Replace these ${picked.length} components with one new component, in the app's style, that does what they all do:`,
      ...picked.map((e) => `- ${e.title}${e.where ? ` (${e.where})` : ""}`),
      `Keep the name and props of ${first.title} so its callers keep working, and note in the doc comment how the others' uses should change.`,
    ].join("\n")
    await autofix.start({ project: project.manifest.id, entry: draftKey(first.id), title: first.title, where: first.where, findings: actionable(first).map((n) => n.text), instruction, options: true, attempt: 1 }).catch(() => {})
    setSelected(first.id)
    setTab("ai")
    setPanelTab("actions")
  }
  const winner = (e: Entry) => decisions.get(e.id)?.status === "approved" && picked.every((x) => x.id === e.id || decisions.get(x.id)?.target === e.id)
  return bar(
    <>
      <span className="px-1.5 text-[12px] font-semibold">Compare {picked.length}</span>
      {picked.map((e, i) => (
        <button key={e.id} onClick={() => keep(e)} className={cn(pill, winner(e) && decisions.get(rest[0]?.id)?.status === "merge" ? "bg-emerald-600 text-white" : "hover:bg-emerald-50 hover:text-emerald-800")} title={`Keep ${e.title}; merge the others into it`}>
          <GitMerge className="size-3.5" /> Keep {String.fromCharCode(65 + i)}
          <span className="max-w-28 truncate font-normal opacity-70">· {e.title}</span>
        </button>
      ))}
      <button onClick={variants} className={cn(pill, rest.every((e) => decisions.get(e.id)?.status === "variant") ? "bg-sky-600 text-white" : "hover:bg-sky-50 hover:text-sky-800")} title="Keep them all; the others become named variants of A">
        <Layers className="size-3.5" /> Keep all as variants
      </button>
      <button onClick={replace} className={cn(pill, "hover:bg-fuchsia-50 hover:text-fuchsia-800")} title="AI fix drafts one new component that replaces them all">
        <Sparkles className="size-3.5" /> Replace with a new one
      </button>
      <span className="text-muted-foreground flex items-center gap-1 px-1.5 text-[11px]">
        <Copy className="size-3" /> A is {first.title}
      </span>
    </>,
  )
}
