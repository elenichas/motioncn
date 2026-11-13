/**
 * The Actions tab: three ways to fix (Manual edit, Autofix, AI fix), the versions you can step between
 * (undo / redo), and applying an approved fix to the repo. Decisions themselves are made on the canvas.
 */
import { useEffect, useState } from "react"
import { Check, ChevronDown, ClipboardCopy, ExternalLink, GitBranch, LoaderCircle, MousePointerClick, Redo2, Sparkles, Trash2, Undo2, Wand2 } from "lucide-react"
import { draftKey } from "@/projects"
import { cn } from "@/lib/utils"
import { DECISIONS, type Decision } from "./types"
import { repoApi } from "./draft-api"
import { actionable, autofixBlocked, recommendedFix, type Applied, type FixType } from "./review-model"
import { AiTab, Btn, ManualTab, type AiFixer, type AutofixReport, type FixProps } from "./fix-step"

type Props = FixProps & {
  fixer: AiFixer
  runAutofix: () => void
  autofixBusy: boolean
  autofixReport: AutofixReport | null
  autofixError: string | null
  applied?: Applied
  onAppliedChanged: () => void
  showOriginal: boolean
  setShowOriginal: (on: boolean) => void
}

const TOOLS: Array<{ id: FixType; label: string; sub: string; icon: typeof Wand2 }> = [
  { id: "manual", label: "Manual edit", sub: "Change colours, sizes and spacing yourself", icon: MousePointerClick },
  { id: "autofix", label: "Autofix", sub: "Standard fixes with the app's own styles. Instant, no AI", icon: Wand2 },
  { id: "ai", label: "AI fix", sub: "Claude, for redesigns and anything that needs judgment", icon: Sparkles },
]

export function ActionsTab(p: Props) {
  const { entry, a11y, tab: tool, setTab: setTool, fixer, autofixBusy } = p
  const rec = recommendedFix(entry, a11y)
  const fixable = entry.confidence !== "not-rendered" && import.meta.env.DEV
  const blocked = autofixBlocked(entry)

  return (
    <div className="space-y-6">
      {fixable ? (
        <section>
          <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">Fix it on the canvas</h3>
          <div className="grid grid-cols-3 gap-2">
            {TOOLS.map((t) => {
              const busy = (t.id === "autofix" && autofixBusy) || (t.id === "ai" && fixer.busy)
              const on = tool === t.id
              return (
                <button
                  key={t.id}
                  aria-pressed={on}
                  disabled={(t.id === "autofix" && (autofixBusy || !!blocked)) || (t.id === "ai" && fixer.cli === false)}
                  title={t.id === "autofix" && blocked ? blocked : undefined}
                  onClick={() => {
                    setTool(t.id)
                    if (t.id === "autofix") p.runAutofix()
                    if (t.id === "manual") p.setInspect(true)
                    else p.setInspect(false)
                  }}
                  className={cn(
                    "relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors disabled:opacity-50",
                    on ? "border-foreground bg-foreground text-background" : "hover:bg-accent",
                  )}
                >
                  {t.id === rec && <span className={cn("absolute top-2 right-2 rounded-full px-1.5 text-[10px] font-semibold", on ? "bg-background/20" : "bg-emerald-500/15 text-emerald-700")}>start here</span>}
                  {busy ? <LoaderCircle className="size-4 animate-spin" /> : <t.icon className="size-4" />}
                  <span className="text-[13px] font-semibold">{t.label}</span>
                  <span className={cn("text-[11px] leading-snug", on ? "opacity-75" : "text-muted-foreground")}>{t.sub}</span>
                </button>
              )
            })}
          </div>

          {blocked && <p className="text-muted-foreground mt-2 text-xs leading-snug">Autofix is off: {blocked}</p>}
          <div className="mt-3">
            {tool === "manual" && <ManualTab {...p} />}
            {tool === "autofix" && <AutofixResult {...p} />}
            {tool === "ai" && <AiTab {...p} />}
          </div>
        </section>
      ) : (
        <p className="text-muted-foreground text-[13px]">This one is not rendered on the canvas, so it cannot be fixed here. Approve or remove it on the canvas.</p>
      )}

      {fixable && <Versions {...p} />}

      <RepoSection {...p} />
    </div>
  )
}

/* ── autofix result ── */

function AutofixResult(p: Props) {
  const { autofixReport: r, autofixBusy, autofixError, a11y } = p
  if (autofixBusy) return <p className="text-muted-foreground flex items-center gap-2 text-[13px]"><LoaderCircle className="size-3.5 animate-spin" /> Autofixing…</p>
  if (autofixError) return <p className="text-[13px] text-red-600">{autofixError}</p>
  if (!r) return null
  const byRule = [...new Set(r.changes.map((c) => c.rule))].map((rule) => ({ rule, items: r.changes.filter((c) => c.rule === rule) }))
  const left = a11y?.draft
  return (
    <div className="rounded-lg border p-3 text-xs">
      <div className="mb-2 flex items-center gap-2 text-[13px] font-medium">
        {r.changes.length ? `${r.changes.length} change${r.changes.length > 1 ? "s" : ""}` : "Nothing left that the rules can fix."}
        {left && <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold", left.issues ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/15 text-emerald-700")}>{left.issues ? `${left.issues} still open` : "passes the checks"}</span>}
      </div>
      {byRule.map((g) => (
        <details key={g.rule} className="group mb-1">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium">
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" /> {g.rule} <span className="text-muted-foreground font-normal">{g.items.length}</span>
          </summary>
          <ul className="text-muted-foreground mt-1 space-y-0.5 pl-5">
            {g.items.map((c, i) => (
              <li key={i}>{c.detail}</li>
            ))}
          </ul>
        </details>
      ))}
      {!!left?.issues && <p className="mt-2 text-amber-700">Rules cannot fix the rest. Use Manual edit or AI fix.</p>}
    </div>
  )
}

/* ── versions (undo / redo) ── */

type HistoryView = { index: number; versions: Array<{ label: string; at: string; original: boolean }> }

function Versions(p: Props) {
  const { project, entry, onDraftsChanged, hasDraft } = p
  const key = draftKey(entry.id)
  const [h, setH] = useState<HistoryView>({ index: 0, versions: [] })
  const load = () => fetch(`/__canvas/history?project=${encodeURIComponent(project.manifest.id)}&entry=${encodeURIComponent(key)}`).then((r) => r.json()).then(setH, () => {})
  useEffect(() => {
    load()
    const hot = import.meta.hot
    const on = (d: { project: string; entry: string }) => d.project === project.manifest.id && d.entry === key && load()
    hot?.on("canvas:history", on)
    return () => hot?.off("canvas:history", on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.manifest.id, key])
  const go = async (body: { action: "undo" | "redo" | "goto"; to?: number }) => {
    const next = await fetch("/__canvas/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project: project.manifest.id, entry: key, ...body }) }).then((r) => r.json())
    setH(next)
    p.setShowOriginal(false)
    onDraftsChanged()
  }
  if (!h.versions.length && !hasDraft) return null
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">Versions</h3>
      <div className="flex items-center gap-2">
        <Btn disabled={h.index <= 0} onClick={() => go({ action: "undo" })} title="Undo the last fix">
          <Undo2 className="size-3.5" /> Undo
        </Btn>
        <Btn disabled={h.index >= h.versions.length - 1} onClick={() => go({ action: "redo" })} title="Redo">
          <Redo2 className="size-3.5" /> Redo
        </Btn>
        {hasDraft && (
          <label className="ml-auto flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={p.showOriginal} onChange={(e) => p.setShowOriginal(e.target.checked)} className="accent-fuchsia-600" />
            Peek at the original
          </label>
        )}
      </div>
      {!!h.versions.length && (
        <ol className="mt-2.5 flex flex-wrap items-center gap-1">
          {h.versions.map((v, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground text-xs">→</span>}
              <button
                onClick={() => go({ action: "goto", to: i })}
                aria-current={i === h.index ? "step" : undefined}
                title={new Date(v.at).toLocaleString()}
                className={cn("rounded-full border px-2 py-0.5 text-[11.5px]", i === h.index ? "border-foreground bg-foreground text-background" : "hover:bg-accent", i > h.index && "opacity-50")}
              >
                {v.label}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/* ── apply to the repo ── */

const APPROVING: Decision[] = ["apply-fix", "approved", "variant", "merge", "deprecate"]

function RepoSection(p: Props) {
  const { project, entry, status, hasDraft, applied, decision, onAppliedChanged } = p
  const key = draftKey(entry.id)
  const repo = project.config.repo.replace(/^\.\.\//, "")
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (what: string, text: string) => navigator.clipboard.writeText(text).then(() => (setCopied(what), setTimeout(() => setCopied(null), 1500)))
  const approved = !!decision?.status && APPROVING.includes(decision.status)
  const findings = actionable(entry, p.a11y)
  const label = DECISIONS.find((d) => d.id === decision?.status)?.label
  const brief = `Apply the canvas decision for ${entry.title}${entry.where ? ` (${entry.where})` : ""} in ${repo}: ${label ?? "review"}.${decision?.note ? ` ${decision.note}` : ""}${hasDraft ? ` The approved version is in motioncn/src/projects/${project.manifest.id}/drafts/${key}.tsx.` : ""}\n${findings.map((f) => `- ${f.text}`).join("\n")}`

  return (
    <section>
      <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">Apply to the repo</h3>
      <p className="text-muted-foreground mb-2 text-xs">Changes {repo} on a local branch. Nothing is pushed.</p>
      {!approved ? (
        <p className="bg-muted/60 rounded-lg p-2.5 text-[12.5px]">Approve it on the canvas first: select the component and press <b>Approve</b> above it.</p>
      ) : applied?.state === "done" || applied?.state === "running" ? (
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 text-[13px] font-medium">
            {applied.state === "running" ? <LoaderCircle className="size-4 animate-spin text-amber-600" /> : <GitBranch className="size-4" />}
            <span className="font-mono text-xs">{applied.branch}</span>
            {applied.sha && <span className="text-muted-foreground font-mono text-xs">@ {applied.sha}</span>}
            {applied.merged && <span className="ml-auto rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">Merged</span>}
          </div>
          {applied.state === "running" ? (
            <p className="text-muted-foreground mt-1.5 text-xs">Claude is editing the branch in its own worktree. Your clone and main are not touched.</p>
          ) : (
            <>
              {applied.summary && <p className="mt-1.5 text-xs">{applied.summary}</p>}
              <ul className="text-muted-foreground mt-1.5 font-mono text-[11px]">
                {applied.files.map((f) => (
                  <li key={f} className="truncate">{f}</li>
                ))}
              </ul>
              {!applied.merged && <pre className="bg-muted mt-2 overflow-x-auto rounded-md p-2 font-mono text-[11px] leading-relaxed">{`cd ${applied.worktree}\ngit push -u origin ${applied.branch}\ngh pr create --fill`}</pre>}
              <div className="mt-2 flex flex-wrap gap-2">
                {!applied.merged && (
                  <Btn onClick={() => copy("push", `cd "${applied.worktree}" && git push -u origin ${applied.branch} && gh pr create --fill`)}>
                    {copied === "push" ? <Check className="size-3.5" /> : <ClipboardCopy className="size-3.5" />} Copy commands
                  </Btn>
                )}
                <a href={`vscode://file${applied.worktree}`} className="hover:bg-accent flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px]">
                  <ExternalLink className="size-3.5" /> Open branch
                </a>
                <Btn
                  danger
                  className="ml-auto"
                  onClick={() => confirm(`Delete the local branch ${applied.branch} and its worktree? Commits that were not pushed are lost.`) && repoApi.discard(project.manifest.id, key).then(onAppliedChanged, (e) => setErr(String(e)))}
                >
                  <Trash2 className="size-3.5" /> Discard branch
                </Btn>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Btn
              primary
              disabled={!hasDraft}
              onClick={() => repoApi.apply({ project: project.manifest.id, entry: key, title: entry.title, where: entry.where, note: decision?.note || undefined }).then(onAppliedChanged, (e) => setErr(String((e as Error).message)))}
            >
              <GitBranch className="size-3.5" /> Apply in repo
            </Btn>
            <Btn onClick={() => copy("brief", brief)}>
              {copied === "brief" ? <Check className="size-3.5" /> : <ClipboardCopy className="size-3.5" />} Copy brief
            </Btn>
          </div>
          <p className="text-muted-foreground text-xs">{hasDraft ? `Claude edits branch canvas/${key} and updates every use, then the canvas commits it.` : "There is no fix to apply; copy the brief for an agent instead."}</p>
          {applied?.state === "error" && <p className="text-xs text-red-600">Last attempt failed: {applied.error}</p>}
        </div>
      )}
      {status === "verified" && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <Check className="size-3.5" /> Merged to main and verified by a rescan.
        </p>
      )}
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </section>
  )
}

