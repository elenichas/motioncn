import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { FileCode2, Lightbulb, ListChecks, Wrench, X } from "lucide-react"
import { draftKey, type Project } from "@/projects"
import { cn } from "@/lib/utils"
import type { Decision, Entry } from "./types"
import type { FrameA11y } from "./project-frame"
import type { DecisionRecord } from "./decisions"
import { autofixCodeApi } from "./draft-api"
import { useAiFixer, type AutofixReport } from "./fix-step"
import { STATUS, actionable, type Applied, type FixType, type Status } from "./review-model"
import type { ManualEdit, Picked } from "./manual"
import { ChecksTab } from "./panel-checks"
import { ActionsTab } from "./panel-actions"
import type { ResponsiveResult } from "./responsive"
import type { RoutingInfo } from "./panel-checks"

type Props = {
  project: Project
  entry: Entry
  status: Status
  a11y?: FrameA11y
  hasDraft: boolean
  applied?: Applied
  onDraftsChanged: () => void
  onAppliedChanged: () => void
  decision?: DecisionRecord
  setDecision: (status: Decision | null, note?: string) => void
  onClose: () => void
  manual: ManualEdit[]
  setManual: (edits: ManualEdit[]) => void
  inspect: boolean
  setInspect: (on: boolean) => void
  picked: Picked | null
  tab: FixType | null
  setTab: (t: FixType | null) => void
  /** Turns the sparkly cloud on the frame on or off. */
  setFixing: (kind: "autofix" | "ai" | null) => void
  showOriginal: boolean
  setShowOriginal: (on: boolean) => void
  /** Which tab of the panel is open; kept by the canvas so it survives selecting another component. */
  panelTab: "checks" | "actions"
  setPanelTab: (t: "checks" | "actions") => void
  responsive: ResponsiveResult | null
  allWidths: boolean
  showAllWidths: () => void
  /** Where each fix belongs, and how far this component reaches. */
  routing: RoutingInfo
}

/**
 * The panel for the selected component: a header with its status, then two tabs.
 * Checks: only what the canvas found. Actions: the three ways to fix, versions, and applying to the repo.
 * Approving, removing and choosing between components happen on the canvas itself.
 */
export function DetailPanel(p: Props) {
  const { project, entry, status, a11y, hasDraft, panelTab, setPanelTab } = p
  const fixer = useAiFixer(p)

  // Autofix: rule-based and instant; the cloud stays for a moment so the change is visible.
  const [autofixReport, setAutofixReport] = useState<AutofixReport | null>(null)
  const [autofixError, setAutofixError] = useState<string | null>(null)
  const [autofixBusy, setAutofixBusy] = useState(false)
  useEffect(() => (setAutofixReport(null), setAutofixError(null)), [entry.id])
  const runAutofix = async () => {
    setAutofixBusy(true)
    setAutofixError(null)
    p.setShowOriginal(false)
    p.setFixing("autofix")
    const started = Date.now()
    try {
      const report = await autofixCodeApi({ project: project.manifest.id, entry: draftKey(entry.id), where: entry.where, title: entry.title })
      await new Promise((r) => setTimeout(r, Math.max(0, 1400 - (Date.now() - started))))
      setAutofixReport(report)
      p.onDraftsChanged()
    } catch (e) {
      setAutofixError(String((e as Error).message))
    } finally {
      setAutofixBusy(false)
      p.setFixing(null)
    }
  }
  // AI fix: the cloud stays while Claude writes and while the canvas re-checks (and retries).
  useEffect(() => {
    if (fixer.busy) p.setShowOriginal(false)
    p.setFixing(fixer.busy ? "ai" : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixer.busy])

  const fixed = hasDraft && !p.showOriginal
  const open = fixed ? (a11y?.draft?.issues ?? 0) : actionable(entry, a11y).filter((n) => n.level !== "info").length

  return (
    <motion.aside
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 24, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-background absolute top-16 right-3 bottom-3 flex w-[420px] flex-col overflow-hidden rounded-xl border shadow-lg"
      aria-label={`${entry.title} details`}
    >
      <header className="p-4 pb-0">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">{entry.title}</h2>
            {entry.where && (
              <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 font-mono text-xs">
                <FileCode2 className="size-3.5 shrink-0" />
                <span className="truncate">{entry.where}</span>
              </p>
            )}
          </div>
          <button onClick={p.onClose} aria-label="Close details" className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS[status].className)} title={STATUS[status].hint}>
            {STATUS[status].label}
          </span>
          {entry.proposal && (
            <span className="flex items-center gap-1 rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[11px] font-medium text-fuchsia-700">
              <Lightbulb className="size-3" /> Proposal
            </span>
          )}
          {hasDraft && p.showOriginal && <span className="rounded-full border border-dashed px-2 py-0.5 text-[11px]">Showing the original</span>}
        </div>
        <div role="tablist" aria-label="Panel" className="mt-3 -mb-px flex gap-4 border-b">
          {(
            [
              { id: "checks", label: "Checks", icon: ListChecks, badge: open },
              { id: "actions", label: "Actions", icon: Wrench, badge: 0 },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={panelTab === t.id}
              onClick={() => setPanelTab(t.id)}
              className={cn("flex items-center gap-1.5 border-b-2 pb-2 text-[13px] font-medium", panelTab === t.id ? "border-foreground text-foreground" : "text-muted-foreground hover:text-foreground border-transparent")}
            >
              <t.icon className="size-3.5" /> {t.label}
              {!!t.badge && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white tabular-nums">{t.badge}</span>}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {panelTab === "checks" ? (
          <ChecksTab
            project={project}
            entry={entry}
            a11y={a11y}
            fixed={fixed}
            responsive={p.responsive}
            allWidths={p.allWidths}
            showAllWidths={p.showAllWidths}
            routing={p.routing}
            onSuggest={(t) => {
              // Autofix runs when you press it; AI fix and Manual open their tools
              p.setTab(t === "autofix" ? null : t)
              setPanelTab("actions")
            }}
          />
        ) : (
          <ActionsTab {...p} fixer={fixer} runAutofix={runAutofix} autofixBusy={autofixBusy} autofixReport={autofixReport} autofixError={autofixError} />
        )}
      </div>
      <footer className="text-muted-foreground border-t px-4 py-2 text-[11px]">
        Scanned {new Date(project.scan.scannedAt).toLocaleString()} at {project.scan.commit}
      </footer>
    </motion.aside>
  )
}
