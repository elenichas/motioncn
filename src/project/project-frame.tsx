import { useEffect, useRef, useState } from "react"
import { AnimatePresence } from "motion/react"
import { SparkleCloud } from "./sparkle-cloud"
import { VERDICT, judgeResponsive, type ResponsiveResult } from "./responsive"
import type { LayoutMetrics, LiveFinding } from "./types"
import { CircleCheck, CircleX, EyeOff, Info, Lightbulb, TriangleAlert } from "lucide-react"
import { draftKey, type Project } from "@/projects"
import { cn } from "@/lib/utils"
import { PENDING, STATUS, type Status } from "./review-model"
import type { ManualEdit, Picked } from "./manual"
import type { Plan } from "./consolidate"

/** Canvas selection colour, independent of the previewed theme (same as the main canvas). */
export const SELECT = "#0d99ff"
const labelScale = (zoom: number) => Math.min(1 / zoom, 2)
import { DECISIONS, type Decision, type Entry, type FromPreview, type Level, type ProjectTheme, type Viewport } from "./types"

/** A live scan result. `at` is when the canvas received it, so a re-check can ignore results from before a new draft. */
export type A11yResult = { issues: number; warnings: number; at?: number; findings: Array<LiveFinding & { viewport?: string }> }

export const CONFIDENCE = {
  rendered: { label: "Rendered", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  assumed: { label: "With assumptions", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  "not-rendered": { label: "Not rendered", className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400" },
} as const

export const LEVEL_ICON: Record<Level, { icon: typeof Info; className: string }> = {
  issue: { icon: CircleX, className: "text-red-600" },
  warn: { icon: TriangleAlert, className: "text-amber-600" },
  info: { icon: Info, className: "text-sky-600" },
}

export const DECISION_STYLE: Record<Decision, string> = {
  flag: "bg-zinc-800 text-white",
  "apply-fix": "bg-fuchsia-600 text-white",
  approved: "bg-emerald-600 text-white",
  variant: "bg-sky-600 text-white",
  merge: "bg-violet-600 text-white",
  deprecate: "bg-red-600 text-white",
  "needs-design": "bg-amber-500 text-white",
}

type Props = {
  project: Project
  entry: Entry
  widths: Viewport[]
  theme: ProjectTheme
  zoom: number
  selected: boolean
  showA11y: boolean
  decision?: Decision | null
  /** e.g. "Merge into Chip": shown instead of the bare decision when there is one */
  decisionNote?: string
  onSelect: (e: React.PointerEvent) => void
  /** Decisions shown on the canvas above the frame (approve, remove, compare). */
  actions?: React.ReactNode
  onFocus: () => void
  /** Whether there is a fix (a draft or manual edits, or you are about to make some): it replaces the original. */
  hasDraft: boolean
  /** Show the original instead of the fix, for comparing. */
  showOriginal?: boolean
  /** A fix is running: the sparkly cloud covers the component until the new version has rendered. */
  fixing?: "autofix" | "ai" | null
  status: Status
  manual?: ManualEdit[]
  inspect?: boolean
  onPicked?: (p: Picked) => void
  /** For a group of hand-written buttons: the reviewer's plan, shown as the "after" column. */
  plan?: Plan
  /** Draft keys of fixes approved on the canvas: screens of the real app render with them swapped in. */
  fixes?: string[]
  onA11y: (id: string, r: FrameA11y) => void
  /** The responsiveness verdict, when the component is shown at two or more widths. */
  onResponsive?: (id: string, r: ResponsiveResult | null) => void
}

/** Accessibility results for a frame: the current version, and the draft fix when there is one. */
export type FrameA11y = { current?: A11yResult; draft?: A11yResult }

const merge = (rs: Record<string, A11yResult>): A11yResult | undefined => {
  const list = Object.entries(rs)
  if (!list.length) return undefined
  return {
    at: Math.min(...list.map(([, r]) => r.at ?? 0)),
    issues: Math.max(...list.map(([, r]) => r.issues)),
    warnings: Math.max(...list.map(([, r]) => r.warnings)),
    findings: list.flatMap(([vp, r]) => r.findings.map((f) => ({ ...f, viewport: vp }))),
  }
}

function A11yBadge({ r, prefix }: { r: A11yResult; prefix?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        r.issues ? "bg-red-500/15 text-red-600" : r.warnings ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/15 text-emerald-700",
      )}
    >
      {r.issues ? <CircleX className="size-3" /> : r.warnings ? <TriangleAlert className="size-3" /> : <CircleCheck className="size-3" />}
      {prefix}
      {r.issues ? `${r.issues} a11y issue${r.issues > 1 ? "s" : ""}` : r.warnings ? `${r.warnings} a11y warning${r.warnings > 1 ? "s" : ""}` : "AA pass"}
    </span>
  )
}

/**
 * One component on the project canvas: label, live preview frame(s), and what the review found.
 * A fix replaces the original in place (the original stays one toggle away); while a fix runs, a sparkly
 * cloud covers it, and it goes poof once the fixed version has rendered.
 */
export function ProjectFrame({ project, entry, widths, theme, zoom, selected, showA11y, decision, decisionNote, onResponsive, hasDraft, showOriginal, fixing, status, manual, inspect, onPicked, fixes, plan, onSelect, onFocus, onA11y, actions }: Props) {
  const frames: Array<{ vp: Viewport | null; w: number; h: number | null }> = entry.responsive
    ? widths.map((vp) => ({ vp, w: vp.w, h: vp.h }))
    : [{ vp: null, w: entry.w ?? 420, h: null }]
  const width = entry.confidence === "not-rendered" ? (entry.w ?? 380) : frames.reduce((s, f) => s + f.w, 0) + (frames.length - 1) * 32
  const kind: "current" | "draft" = hasDraft && !showOriginal ? "draft" : "current"
  const [results, setResults] = useState<{ current: Record<string, A11yResult>; draft: Record<string, A11yResult> }>({ current: {}, draft: {} })
  const shown = merge(results[kind])
  // Responsiveness: layout measured in each width's frame, compared across widths.
  const [layout, setLayout] = useState<{ current: Record<string, LayoutMetrics>; draft: Record<string, LayoutMetrics> }>({ current: {}, draft: {} })
  const responsive = entry.responsive
    ? judgeResponsive(
        layout[kind],
        Object.fromEntries(Object.entries(results[kind]).map(([vp, r]) => [vp, r.findings.filter((x) => x.check === "Fits the screen" && x.level === "fail").length])),
      )
    : null
  const respKey = responsive ? `${responsive.verdict}:${responsive.notes.length}:${responsive.rows.map((r) => r.width).join(",")}` : ""
  useEffect(() => {
    onResponsive?.(entry.id, responsive)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [respKey])

  // Report only the version on screen; the canvas keeps the other one, so "before" survives the swap.
  useEffect(() => {
    if (shown) onA11y(entry.id, { [kind]: shown })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, kind])

  // The cloud: on while fixing, and after that until the fixed version has rendered (or 5s), then poof.
  const [cloud, setCloud] = useState<null | "autofix" | "ai">(null)
  const fixEnded = useRef(0)
  useEffect(() => {
    if (fixing) {
      setCloud(fixing)
      fixEnded.current = 0
      return
    }
    if (!cloud) return
    fixEnded.current = Date.now()
    const t = setTimeout(() => setCloud(null), 5000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixing])
  const onRendered = () => {
    if (cloud && !fixing && fixEnded.current) setTimeout(() => setCloud(null), 350)
  }

  const d = DECISIONS.find((x) => x.id === decision)
  const before = results.current
  const beforeIssues = merge(before)?.issues
  return (
    <div data-frame={entry.id} data-fit={entry.id} className="relative" style={{ width }} onPointerDown={onSelect}>
      {/* Label: counter-scaled so it stays readable when zoomed out (capped, so it never outgrows the frame) */}
      <div
        className="absolute bottom-full left-0 flex origin-bottom-left flex-wrap items-center gap-1.5 pb-2"
        style={{ width: width / labelScale(zoom), transform: `scale(${labelScale(zoom)})` }}
        onDoubleClick={onFocus}
        title="Double-click to zoom to this frame"
      >
        {actions && (
          <div className="mb-1.5 w-full" onPointerDown={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
        <span className="w-full truncate text-sm font-semibold" style={selected ? { color: SELECT } : undefined}>
          {entry.title}
        </span>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS[status].className)} title={STATUS[status].hint}>{STATUS[status].label}</span>
        {hasDraft && showOriginal && <span className="shrink-0 rounded-full border border-dashed border-zinc-400 px-2 py-0.5 text-[11px] font-medium text-zinc-600">Showing the original</span>}
        {entry.inApp && !!fixes?.length && kind === "current" && <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-700" title="Fixes you approved on the canvas are shown here. The repo does not have them yet.">With {fixes.length} approved fix{fixes.length > 1 ? "es" : ""}</span>}
        {entry.confidence !== "rendered" && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", CONFIDENCE[entry.confidence].className)}>{CONFIDENCE[entry.confidence].label}</span>}
        {entry.proposal && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[11px] font-medium text-fuchsia-700">
            <Lightbulb className="size-3" /> Proposal
          </span>
        )}
        {d && d.id !== "apply-fix" && d.id !== "approved" && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", DECISION_STYLE[d.id])}>{(d.id === "merge" || d.id === "variant") && decisionNote ? decisionNote : d.label}</span>}
        {showA11y && shown && <A11yBadge r={shown} />}
        {responsive && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", VERDICT[responsive.verdict].className)} title={responsive.notes.map((n) => n.text).join("\n") || "Fits and adapts at every width"}>{VERDICT[responsive.verdict].label}</span>}
        {showA11y && kind === "draft" && beforeIssues !== undefined && beforeIssues !== shown?.issues && (
          <span className="shrink-0 text-[11px] text-zinc-500">was {beforeIssues ? `${beforeIssues} issue${beforeIssues > 1 ? "s" : ""}` : "AA pass"}</span>
        )}
      </div>

      {entry.confidence === "not-rendered" ? (
        <div className="bg-background text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center" style={{ boxShadow: selected ? `0 0 0 3px ${SELECT}` : undefined }}>
          <EyeOff className="size-7 opacity-60" />
          <span className="text-foreground font-mono text-sm">{entry.where}</span>
        </div>
      ) : (
        <div className={cn("relative", PENDING.includes(status) && "rounded-2xl outline-2 outline-offset-8 outline-amber-400 outline-dashed")} title={PENDING.includes(status) ? "Decided on the canvas; the repo has not caught up yet" : undefined}>
          <div className="flex items-start gap-8">
            {frames.map((f) => (
              <PreviewFrame
                key={`${kind}-${f.vp?.id ?? "one"}`}
                project={project}
                entry={entry}
                draft={kind === "draft"}
                fixes={entry.inApp ? fixes : undefined}
                plan={plan}
                manual={kind === "draft" ? manual : undefined}
                inspect={kind === "draft" && inspect}
                onPicked={kind === "draft" ? onPicked : undefined}
                vp={f.vp}
                w={f.w}
                h={f.h}
                theme={theme}
                selected={selected}
                cloud={cloud}
                onA11y={(r) => {
                  setResults((m) => ({ ...m, [kind]: { ...m[kind], [f.vp?.label ?? "Frame"]: { ...r, at: Date.now() } } }))
                  onRendered()
                }}
                onLayout={(m) => setLayout((x) => ({ ...x, [kind]: { ...x[kind], [f.vp?.label ?? "Frame"]: m } }))}
              />
            ))}
          </div>
        </div>
      )}

      {!!entry.findings?.length && (
        <ul className="mt-5 space-y-2.5" style={{ maxWidth: Math.max(width, 380) }}>
          {entry.findings.map((f, i) => {
            const L = LEVEL_ICON[f.level]
            return (
              <li key={i} className="flex gap-2.5 text-[17px] leading-snug">
                <L.icon className={cn("mt-0.5 size-[18px] shrink-0", L.className)} />
                <span>{f.text}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function PreviewFrame({ project, entry, draft, fixes, plan, vp, w, h, theme, selected, onA11y, onLayout, manual, inspect, onPicked, cloud }: { project: Project; entry: Entry; draft: boolean; fixes?: string[]; plan?: Plan; vp: Viewport | null; w: number; h: number | null; theme: ProjectTheme; selected: boolean; onA11y: (r: A11yResult) => void; onLayout?: (m: LayoutMetrics) => void; manual?: ManualEdit[]; inspect?: boolean; onPicked?: (p: Picked) => void; cloud?: "autofix" | "ai" | null }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [autoH, setAutoH] = useState(160)
  const [error, setError] = useState<string | null>(null)
  // A component shown in place: the screens that may have it are tried in order until one does.
  const place = entry.inPlace
  const [attempt, setAttempt] = useState(0)
  const [missing, setMissing] = useState(false)
  const at = place?.screens[attempt]
  // The theme in the URL is only the starting one; later changes are posted, so frames keep their state.
  const [startTheme] = useState(theme.id)
  const applied = fixes?.length ? `&fixes=${fixes.join(",")}` : ""
  const src = at
    ? `preview.html?p=${project.manifest.id}&id=${encodeURIComponent(at.base)}&theme=${startTheme}&fixed=1&drive=${encodeURIComponent(JSON.stringify(at.drive))}&focus=${encodeURIComponent(place!.component)}${draft ? `&draft=1&key=${draftKey(entry.id)}` : ""}${applied}`
    : `preview.html?p=${project.manifest.id}&id=${encodeURIComponent(entry.id)}&theme=${startTheme}${h ? "&fixed=1" : ""}${draft ? "&draft=1" : ""}${applied}`
  const first = useRef(true)
  const report = useRef(onA11y)
  report.current = onA11y
  const picked = useRef(onPicked)
  picked.current = onPicked
  const layoutRef = useRef(onLayout)
  layoutRef.current = onLayout

  useEffect(() => {
    const onMsg = (e: MessageEvent<FromPreview & { __preview?: boolean }>) => {
      if (e.source !== ref.current?.contentWindow || !e.data?.__preview) return
      if (e.data.type === "size" && !h) setAutoH(e.data.h)
      else if (e.data.type === "a11y") report.current(e.data)
      else if (e.data.type === "error") setError(e.data.message)
      else if (e.data.type === "layout") layoutRef.current?.(e.data.metrics)
      else if (e.data.type === "focus" && !e.data.found) setAttempt((n) => (place && n + 1 < place.screens.length ? n + 1 : (setMissing(true), n)))
      else if (e.data.type === "picked") {
        const { type: _t, ...p } = e.data
        picked.current?.(p as Picked)
      }
    }
    window.addEventListener("message", onMsg)
    return () => window.removeEventListener("message", onMsg)
  }, [h])

  useEffect(() => {
    if (first.current) return void (first.current = false)
    ref.current?.contentWindow?.postMessage({ type: "theme", vars: theme.vars }, location.origin)
  }, [theme])

  // Fix frames: send your manual edits and the inspect toggle (and again whenever the frame reloads).
  const sendFix = () => {
    const win = ref.current?.contentWindow
    if (!win || !draft) return
    if (manual) win.postMessage({ type: "manual", edits: manual }, location.origin)
    win.postMessage({ type: "inspect", on: !!inspect }, location.origin)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(sendFix, [manual, inspect])
  const sendPlan = () => plan && ref.current?.contentWindow?.postMessage({ type: "consolidate", plan }, location.origin)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void sendPlan(), [plan])

  return (
    <div>
      {vp && (
        <div className="text-muted-foreground mb-2 flex items-baseline gap-2 text-sm">
          <span className="text-foreground font-medium">{vp.label}</span>
          <span className="tabular-nums">{vp.w} × {vp.h}</span>
          {at && <span className="truncate">· {missing ? "not visible on any mapped screen at this width" : `on ${at.title}`}</span>}
        </div>
      )}
      <div
        className={cn("bg-background relative overflow-hidden rounded-xl border shadow-sm", draft && "border-2 border-fuchsia-400", error && "border-red-400")}
        style={{ width: w, height: h ?? autoH, boxShadow: selected ? `0 0 0 3px ${SELECT}` : undefined }}
      >
        <iframe
          ref={ref}
          src={src}
          title={`${entry.title}${vp ? ` at ${vp.label}` : ""}`}
          className="block size-full border-0"
          onLoad={() => setTimeout(() => (sendFix(), sendPlan()), 300)}
          style={{ pointerEvents: selected ? "auto" : "none" }}
        />
        <AnimatePresence>{cloud && <SparkleCloud key="cloud" width={w} label={cloud === "ai" ? "Claude is reimagining it…" : "Autofixing…"} />}</AnimatePresence>
      </div>
    </div>
  )
}
