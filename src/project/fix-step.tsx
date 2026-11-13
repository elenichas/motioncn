/**
 * The fix tools used by the Actions tab: Manual (style edits on picked elements), the Autofix report,
 * and AI fix (Claude, re-checked by the canvas). All of them change the component on the canvas, never the repo.
 */
import { useEffect, useRef, useState } from "react"
import { ChevronDown, LoaderCircle, MousePointerClick, RotateCcw, Sparkles, Trash2, Wand2 } from "lucide-react"
import { draftKey, type Project } from "@/projects"
import { cn } from "@/lib/utils"
import type { Decision, Entry } from "./types"
import type { FrameA11y } from "./project-frame"
import type { DecisionRecord } from "./decisions"
import { autofix, type AutofixJob } from "./draft-api"
import { actionable, needsRedesign, type FixType, type Status } from "./review-model"
import { setStyle, type ManualEdit, type Picked } from "./manual"

export const MAX_ATTEMPTS = 3

export type FixProps = {
  project: Project
  entry: Entry
  status: Status
  a11y?: FrameA11y
  hasDraft: boolean
  decision?: DecisionRecord
  setDecision: (status: Decision | null, note?: string) => void
  onDraftsChanged: () => void
  manual: ManualEdit[]
  setManual: (edits: ManualEdit[]) => void
  inspect: boolean
  setInspect: (on: boolean) => void
  picked: Picked | null
  tab: FixType | null
  setTab: (t: FixType | null) => void
}

export const Btn = ({ primary, danger, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; danger?: boolean }) => (
  <button
    {...props}
    className={cn(
      "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors disabled:opacity-40",
      primary ? "bg-primary text-primary-foreground hover:bg-primary/90" : danger ? "text-destructive hover:bg-destructive/10" : "hover:bg-accent border",
      className,
    )}
  />
)

/* ───────────────────────── AI fix with the canvas re-check ───────────────────────── */

type Phase = "idle" | "running" | "checking" | "passed" | "failed" | "error"
export type AiFixer = ReturnType<typeof useAiFixer>

/**
 * Claude writes the draft; then the canvas judges it: once the fix frame has been re-scanned at every width,
 * anything still failing goes back to Claude, up to MAX_ATTEMPTS. Claude's own word is never the check.
 */
export function useAiFixer(p: FixProps) {
  const { project, entry, a11y, onDraftsChanged } = p
  const key = draftKey(entry.id)
  const [cli, setCli] = useState<boolean | null>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [attempt, setAttempt] = useState(0)
  const [log, setLog] = useState<string[]>([])
  const doneAt = useRef(0)
  const brief = useRef<{ instruction?: string; options?: boolean }>({})

  useEffect(() => {
    setPhase("idle")
    setAttempt(0)
    setLog([])
    autofix.status(project.manifest.id, key).then((s) => (setCli(s.cli), s.job?.state === "running" && setPhase("running")), () => setCli(false))
  }, [project.manifest.id, key])

  const start = async (n: number, findings: string[]) => {
    setAttempt(n)
    setPhase("running")
    try {
      await autofix.start({ project: project.manifest.id, entry: key, title: entry.title, where: entry.where, findings: findings.slice(0, 40), ...brief.current, attempt: n })
    } catch (e) {
      const msg = String((e as Error).message)
      if (msg.includes("claude-cli-missing")) setCli(false)
      setPhase("error")
      setLog((l) => [...l, msg])
    }
  }

  useEffect(() => {
    const hot = import.meta.hot
    const on = (d: { project: string; entry: string; job: AutofixJob }) => {
      if (d.project !== project.manifest.id || d.entry !== key || d.job.state === "running") return
      if (d.job.state === "error") {
        setPhase("error")
        setLog((l) => [...l, d.job.error ?? "Failed"])
        return
      }
      setLog((l) => [...l, `Claude, attempt ${attempt || 1}: ${d.job.summary ?? "done"}`])
      doneAt.current = Date.now()
      setPhase("checking")
      onDraftsChanged()
    }
    hot?.on("canvas:autofix", on)
    return () => hot?.off("canvas:autofix", on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.manifest.id, key, attempt])

  useEffect(() => {
    if (phase !== "checking") return
    const r = a11y?.draft
    if (!r?.at || r.at < doneAt.current + 1500) return
    const failing = r.findings.filter((f) => f.level === "fail").map((f) => `Accessibility: ${f.check} ${f.value} on ${f.what}`)
    const unique = [...new Set(failing)]
    if (!unique.length) {
      setPhase("passed")
      setLog((l) => [...l, "Canvas re-check: the fix passes the live checks."])
    } else if (attempt < MAX_ATTEMPTS) {
      setLog((l) => [...l, `Canvas re-check: ${unique.length} still failing. Sending back to Claude.`])
      start(attempt + 1, unique)
    } else {
      setPhase("failed")
      setLog((l) => [...l, `Canvas re-check: ${unique.length} still failing after ${MAX_ATTEMPTS} attempts. Needs you.`])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, a11y?.draft?.at])

  const run = (instruction?: string, options?: boolean) => {
    brief.current = { instruction: instruction?.trim() || undefined, options }
    setLog([])
    start(1, actionable(entry, a11y).map((n) => n.text))
  }
  return { cli, phase, attempt, log, run, busy: phase === "running" || phase === "checking" }
}

/* ───────────────────────── step 2 ───────────────────────── */

/* ── manual ── */

type TokenSwatch = { name: string; value: string; css: string }

function useSwatches(project: Project) {
  const cfg = (project.config as { autofix?: { text: string[]; surface: string[]; border: string[]; typeScale: number[]; radius: number[] } }).autofix
  const tokens = new Map(project.scan.tokens.map((t) => [t.name, t.value]))
  tokens.set("white", "#ffffff")
  const list = (names: string[] = []): TokenSwatch[] => names.filter((n) => tokens.has(n)).map((n) => ({ name: n, value: tokens.get(n)!, css: n === "white" ? "white" : `var(--${n})` }))
  return { text: list(cfg?.text), surface: list(cfg?.surface), border: list(cfg?.border), type: cfg?.typeScale ?? [12, 14, 15, 17, 22, 26, 38], radius: cfg?.radius ?? [8, 12, 16, 24] }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  )
}

function Swatches({ list, value, onPick, allowNone }: { list: TokenSwatch[]; value?: string; onPick: (css: string | null) => void; allowNone?: boolean }) {
  const isHex = value && /^#/.test(value)
  return (
    <>
      {allowNone && (
        <button title="none" aria-label="None" onClick={() => onPick("transparent")} className={cn("size-6 rounded-md border bg-[linear-gradient(45deg,transparent_45%,#ef4444_45%,#ef4444_55%,transparent_55%)]", value === "transparent" && "ring-foreground ring-2 ring-offset-1")} />
      )}
      {list.map((t) => (
        <button key={t.name} title={t.name} aria-label={t.name} onClick={() => onPick(t.css)} className={cn("size-6 rounded-md border", value === t.css && "ring-foreground ring-2 ring-offset-1")} style={{ background: t.value }} />
      ))}
      <label title="Custom colour" className={cn("relative size-6 cursor-pointer overflow-hidden rounded-md border bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]", isHex && "ring-foreground ring-2 ring-offset-1")}>
        <input type="color" aria-label="Custom colour" className="absolute inset-0 cursor-pointer opacity-0" value={isHex ? value : "#000000"} onChange={(e) => onPick(e.target.value)} />
      </label>
    </>
  )
}

export function ManualTab(p: FixProps) {
  const { project, picked, manual, setManual, inspect, setInspect } = p
  const sw = useSwatches(project)
  const current = picked ? (manual.find((m) => m.selector === picked.selector)?.styles ?? {}) : {}
  const set = (prop: string, value: string | null) => picked && setManual(setStyle(manual, picked, prop, value))
  const num = (prop: string, unit: string, fallback: number) => parseFloat((current[prop] ?? "").replace(unit, "")) || fallback
  const chip = (on: boolean) => cn("h-6 rounded-md border px-1.5 text-[11px] tabular-nums", on ? "bg-foreground text-background" : "hover:bg-accent")
  const c = picked?.contrast
  const aa = c ? (c.large ? 3 : 4.5) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Btn primary={!inspect} onClick={() => setInspect(!inspect)} className={inspect ? "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-800" : ""}>
          <MousePointerClick className="size-3.5" /> {inspect ? "Picking: click an element in the fix frame" : "Pick an element"}
        </Btn>
      </div>
      {!picked ? (
        <p className="text-muted-foreground text-xs">Pick an element in the fix row (the pink-bordered frame). Your changes show there right away and are re-checked.</p>
      ) : (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-[12px]">{picked.label}</span>
            {c && (
              <span className={cn("ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", c.ratio >= aa ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500/15 text-red-600")} title={`Text ${c.fg} on ${c.bg}`}>
                {c.ratio.toFixed(2)}:1 {c.ratio >= aa ? "AA" : "fails AA"}
              </span>
            )}
          </div>
          <Row label="Text colour">
            <Swatches list={sw.text} value={current.color} onPick={(v) => set("color", v)} />
          </Row>
          <Row label="Background">
            <Swatches list={sw.surface} value={current["background"]} onPick={(v) => set("background", v)} allowNone />
          </Row>
          <Row label="Opacity">
            <input type="range" min={10} max={100} value={Math.round(num("opacity", "", 1) * 100)} onChange={(e) => set("opacity", String(Number(e.target.value) / 100))} className="w-32 accent-fuchsia-600" aria-label="Opacity" />
            <span className="w-9 text-right text-[11px] tabular-nums">{Math.round(num("opacity", "", 1) * 100)}%</span>
          </Row>
          <Row label="Border">
            {["none", "1px", "2px"].map((w) => (
              <button key={w} className={chip((current["border-width"] ?? "") === (w === "none" ? "0px" : w))} onClick={() => (w === "none" ? (setManual(setStyle(setStyle(manual, picked, "border-width", "0px"), picked, "border-style", "none"))) : setManual(setStyle(setStyle(manual, picked, "border-width", w), picked, "border-style", "solid")))}>
                {w}
              </button>
            ))}
            <Swatches list={sw.border} value={current["border-color"]} onPick={(v) => set("border-color", v)} />
          </Row>
          <Row label="Corners">
            {[0, ...sw.radius, 999].map((r) => (
              <button key={r} className={chip(current["border-radius"] === `${r}px`)} onClick={() => set("border-radius", `${r}px`)}>
                {r === 999 ? "full" : r}
              </button>
            ))}
          </Row>
          <Row label="Text size">
            {sw.type.map((s) => (
              <button key={s} className={chip(current["font-size"] === `${s}px`)} onClick={() => set("font-size", `${s}px`)}>
                {s}
              </button>
            ))}
          </Row>
          <Row label="Move">
            {(["x", "y"] as const).map((axis, i) => {
              const parts = (current.translate ?? "0px 0px").split(" ")
              return (
                <label key={axis} className="flex items-center gap-1 text-[11px]">
                  {axis}
                  <input
                    type="number"
                    value={parseFloat(parts[i] ?? "0") || 0}
                    onChange={(e) => {
                      const next = [parseFloat(parts[0]) || 0, parseFloat(parts[1]) || 0]
                      next[i] = Number(e.target.value)
                      set("translate", next.every((v) => v === 0) ? null : `${next[0]}px ${next[1]}px`)
                    }}
                    className="h-6 w-14 rounded-md border bg-transparent px-1 tabular-nums"
                  />
                </label>
              )
            })}
          </Row>
          <Row label="Scale">
            <input type="range" min={50} max={200} value={Math.round(num("scale", "", 1) * 100)} onChange={(e) => set("scale", Number(e.target.value) === 100 ? null : String(Number(e.target.value) / 100))} className="w-32 accent-fuchsia-600" aria-label="Scale" />
            <span className="w-9 text-right text-[11px] tabular-nums">{Math.round(num("scale", "", 1) * 100)}%</span>
          </Row>
          <Row label="Rotate">
            <input type="range" min={-180} max={180} value={num("rotate", "deg", 0)} onChange={(e) => set("rotate", Number(e.target.value) === 0 ? null : `${e.target.value}deg`)} className="w-32 accent-fuchsia-600" aria-label="Rotate" />
            <span className="w-9 text-right text-[11px] tabular-nums">{num("rotate", "deg", 0)}°</span>
          </Row>
          <div className="flex justify-end">
            <Btn danger onClick={() => setManual(manual.filter((m) => m.selector !== picked.selector))}>
              <RotateCcw className="size-3.5" /> Reset this element
            </Btn>
          </div>
        </div>
      )}
      {!!manual.length && (
        <div className="text-xs">
          <div className="text-muted-foreground mb-1 font-medium">
            {manual.length} edited element{manual.length > 1 ? "s" : ""} · kept as data until an AI fix writes them into the code
          </div>
          <ul className="space-y-1">
            {manual.map((m) => (
              <li key={m.selector} className="flex items-start gap-2">
                <span className="min-w-0 flex-1">
                  <span className="font-mono">{m.label}</span>
                  <span className="text-muted-foreground block truncate">{Object.entries(m.styles).map(([k, v]) => `${k}: ${v}`).join("; ")}</span>
                </span>
                <button aria-label={`Remove edits on ${m.label}`} onClick={() => setManual(manual.filter((x) => x.selector !== m.selector))} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ── autofix ── */

export type AutofixReport = { created: boolean; changes: Array<{ rule: string; detail: string }> }

export function AutofixTab(p: FixProps & { runAutofix: () => void; autofixBusy: boolean; autofixReport: AutofixReport | null; autofixError: string | null }) {
  const { autofixReport: r, autofixBusy, autofixError } = p
  const left = p.a11y?.draft
  const byRule = r ? [...new Set(r.changes.map((c) => c.rule))].map((rule) => ({ rule, items: r.changes.filter((c) => c.rule === rule) })) : []
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Btn primary disabled={autofixBusy || !p.entry.where} onClick={p.runAutofix}>
          {autofixBusy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />} {p.hasDraft ? "Run autofix on the draft" : "Run autofix"}
        </Btn>
        <span className="text-muted-foreground text-xs">{p.entry.where ? "Instant. No AI." : "Needs a source file to work on."}</span>
      </div>
      {autofixError && <p className="text-xs text-red-600">{autofixError}</p>}
      {r && (
        <div className="rounded-lg border p-3 text-xs">
          <div className="mb-2 font-medium">{r.changes.length ? `${r.changes.length} change${r.changes.length > 1 ? "s" : ""}${r.created ? " (draft created from the source)" : ""}` : "Nothing left that the rules can fix."}</div>
          {byRule.map((g) => (
            <details key={g.rule} className="group mb-1.5">
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
          {left && (
            <p className={cn("mt-2 font-medium", left.issues ? "text-amber-700" : "text-emerald-700")}>
              {left.issues ? `Still ${left.issues} accessibility issue${left.issues > 1 ? "s" : ""} after the rules: finish with Manual or AI fix.` : "The fix now passes the live checks."}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ── AI ── */

export function AiTab(p: FixProps & { fixer: AiFixer }) {
  const { fixer, entry, a11y, manual } = p
  const redesign = needsRedesign(entry, a11y)
  const [instruction, setInstruction] = useState("")
  const [options, setOptions] = useState(redesign)
  useEffect(() => {
    setInstruction(redesign ? "Redesign it as a proper panel of this app: use the library components and tokens, keep its purpose." : "")
    setOptions(redesign)
  }, [entry.id, redesign])
  const count = actionable(entry, a11y).length
  if (fixer.cli === false)
    return (
      <div className="bg-muted/60 rounded-lg p-3 text-xs leading-relaxed">
        <p className="font-medium">Claude Code is not signed in on this Mac</p>
        <p className="text-muted-foreground mt-1">
          Run <code className="font-mono">claude</code> in a terminal once and sign in.
        </p>
      </div>
    )
  return (
    <div className="space-y-2.5">
      <label className="block">
        <span className="text-muted-foreground mb-1 block text-xs">What should Claude do? Optional: the findings are always sent.</span>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={3}
          placeholder="e.g. Add loading and error states. Match the Card component. Keep the photo."
          className="focus-visible:ring-ring w-full resize-y rounded-md border bg-transparent px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2"
        />
      </label>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={options} onChange={(e) => setOptions(e.target.checked)} className="accent-fuchsia-600" />
        Show 2–3 options to choose from
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Btn primary disabled={fixer.busy} onClick={() => fixer.run(instruction, options)} className="bg-fuchsia-600 text-white hover:bg-fuchsia-700">
          {fixer.busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} {p.hasDraft ? "Improve with AI" : "AI fix"}
        </Btn>
        <span className="text-muted-foreground text-xs">
          {count} finding{count === 1 ? "" : "s"}
          {manual.length ? ` · keeps your ${manual.length} manual edit${manual.length > 1 ? "s" : ""}` : ""} · re-checked, up to {MAX_ATTEMPTS} attempts
        </span>
      </div>
      {!!fixer.log.length && (
        <ol className="bg-muted/40 space-y-1 rounded-lg p-2.5 text-xs leading-snug">
          {fixer.log.map((l, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
              <span>{l}</span>
            </li>
          ))}
          {fixer.busy && (
            <li className="flex items-center gap-1.5 text-fuchsia-700">
              <LoaderCircle className="size-3 animate-spin" /> {fixer.phase === "running" ? `Claude, attempt ${fixer.attempt}…` : "Waiting for the canvas to re-scan the draft…"}
            </li>
          )}
        </ol>
      )}
    </div>
  )
}

