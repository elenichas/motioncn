import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence } from "motion/react"
import { ArrowLeft, ArrowUpRight, ChevronRight, LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"
import { Canvas, zoomAt, type View } from "@/canvas/canvas"
import { autoId, draftKey, type Project } from "@/projects"
import { VIEWPORTS, type Decision, type Entry, type Page, type Section } from "./types"
import { ProjectFrame, type FrameA11y } from "./project-frame"
import { ProjectToolbar, type ViewportMode } from "./project-toolbar"
import { DetailPanel } from "./detail-panel"
import { useDecisions } from "./decisions"
import { Sidebar } from "./sidebar"
import { UpdateBanner } from "./update-banner"
import { useRepoStatus } from "./repo-status"
import { listDrafts, repoApi } from "./draft-api"
import { CanvasActions } from "./canvas-actions"
import { usePlacements } from "./placements"
import type { ResponsiveResult } from "./responsive"
import { PENDING, WAITING, statusOf, type Applied, type FixType, type Status } from "./review-model"
import { manualApi, type ManualEdit, type Picked } from "./manual"
import { componentOf, entriesByComponent, reachOf, withFound } from "./flows"
import type { CanvasId } from "./canvas-switch"
import { buttonGroups, groupId, isGroup, useConsolidation, withButtonGroups } from "./consolidate"
import { ConsolidatePanel } from "./consolidate-panel"

const MIN_Z = 0.06
const MAX_Z = 3
const SIDEBAR = 272
const clampZ = (z: number) => Math.min(MAX_Z, Math.max(MIN_Z, z))
const readLocal = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
const writeLocal = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* storage blocked */
  }
}

/** Components that arrived from main since the scan before last, as Review entries rendered with no props. */
function newFromMain(project: Project): Section | null {
  const c = project.changes
  if (!c.added.length) return null
  const by = c.commits[0]
  return {
    title: "New from main",
    blurb: `${c.commits.length} commit${c.commits.length > 1 ? "s" : ""} since the last review (${c.from} → ${c.to}). New components are rendered with no props, so check what they need.`,
    entries: c.added.map(
      (a): Entry => ({
        id: autoId(a.file, a.name),
        title: `${a.name} · new`,
        where: `${a.file}:${a.line}`,
        confidence: "assumed",
        responsive: true,
        assumptions: ["Rendered with no props: the canvas has no sample data for it yet", ...(a.props ? [`Props: ${a.props}`] : [])],
        findings: [
          ...(by ? [{ level: "info" as const, text: `Added in ${c.commits.map((x) => x.sha).join(", ")}: “${by.subject}” by ${by.author}.` }] : []),
          ...a.findings,
        ],
      }),
    ),
  }
}

type CanvasProps = {
  project: Project
  /** An entry to open on arrival (asked for by the User flows canvas). */
  focusEntry?: string
  /** The panel tab to open it on. */
  focusTab?: "checks" | "actions"
  /** The flow screen the user came from, to go back to. */
  focusFrom?: { key: string; title: string }
  /** Open a flow screen ("<flow>/<screen>") on the User flows canvas. */
  openScreen: (key: string) => void
  setCanvas: (c: CanvasId) => void
}

export function ProjectCanvas({ project, focusEntry, focusTab, focusFrom, openScreen, setCanvas }: CanvasProps) {
  const { manifest } = project
  const key = `motioncn:project:${manifest.id}`
  const worldRef = useRef<HTMLDivElement>(null)
  const [view, setViewState] = useState<View>({ x: 80, y: 120, z: 0.5 })
  const setView = useCallback((fn: (v: View) => View) => setViewState(fn), [])

  // The Review page gets new components from main on top of what the manifest lists.
  // Approved components are placed on a library page (placements.json); they leave Review and stay put
  // there whatever later scans say. A component from main that is no longer in the inbox is rebuilt from its id.
  const placements = usePlacements(manifest.id)
  const pages: Page[] = useMemo(() => {
    const fresh = newFromMain(project)
    let base = manifest.pages.map((p) => (p.kind === "review" && fresh ? { ...p, sections: [fresh, ...p.sections] } : p))
    base = withButtonGroups(project, base)
    if (!placements.list.length) return withFound(project, base)
    const placed = new Set(placements.list.map((p) => p.id))
    const known = new Map(base.flatMap((p) => p.sections.flatMap((s) => s.entries)).map((e) => [e.id, e]))
    base = base.map((p) => ({
      ...p,
      sections: p.sections.map((s) => ({ ...s, entries: s.entries.filter((e) => !placed.has(e.id)) })).filter((s) => s.entries.length || p.kind !== "review"),
    }))
    for (const pl of placements.list) {
      const found =
        known.get(pl.id) ??
        (pl.id.startsWith("auto~")
          ? ({ id: pl.id, title: pl.title, where: pl.where, confidence: "assumed", responsive: true, assumptions: ["Rendered with no props: the canvas has no sample data for it yet"] } satisfies Entry)
          : undefined)
      if (!found) continue
      const e: Entry = { ...found, title: found.title.replace(/ · new$/, "") }
      base = base.map((p) =>
        p.id !== pl.page
          ? p
          : {
              ...p,
              sections: p.sections.some((s) => s.title === pl.section)
                ? p.sections.map((s) => (s.title === pl.section ? { ...s, entries: [...s.entries, e] } : s))
                : [...p.sections, { title: pl.section, entries: [e] }],
            },
      )
    }
    return withFound(project, base)
  }, [manifest, project, placements.list])
  const pageOf = (id: string) => pages.find((p) => p.sections.some((s) => s.entries.some((e) => e.id === id)))
  const [pageId, setPageId] = useState(() => (focusEntry && pageOf(focusEntry)?.id) || location.hash.slice(1) || pages[0].id)
  /** An entry to select and zoom to once its page is on screen. */
  const pendingFocus = useRef<string | null>(focusEntry ?? null)
  /**
   * Isolation: arriving from a flow screen shows only the component to fix, not the whole page around it.
   * Going on to one of its parts (or to what uses it) adds to the trail, so the way back stays visible.
   */
  const [isolate, setIsolate] = useState<string[]>(focusEntry ? [focusEntry] : [])
  const isolated = isolate[isolate.length - 1] ?? null
  const page: Page = pages.find((p) => p.id === pageId) ?? pages[0]
  const [themeId, setThemeId] = useState<string>(() => readLocal(`${key}:theme`, manifest.themes[0].id))
  const theme = manifest.themes.find((t) => t.id === themeId) ?? manifest.themes[0]
  const [viewport, setViewport] = useState<ViewportMode>(() => readLocal(`${key}:viewport`, "phone"))
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => readLocal("motioncn:sidebar", true))
  const [showA11y, setShowA11y] = useState(true)
  /** Show only what main has: hides things decided on the canvas that the repo has not caught up with, and proposals. */
  const [onlyMain, setOnlyMain] = useState(false)
  // selection: one component opens the panel; shift-click adds more to compare them on the canvas
  const [selection, setSelection] = useState<string[]>([])
  const selected = selection.length === 1 ? selection[0] : null
  const setSelected = (id: string | null) => setSelection(id ? [id] : [])
  const select = (id: string, add: boolean) => setSelection((s) => (add ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]))
  const [panelTab, setPanelTab] = useState<"checks" | "actions">(focusTab ?? "checks")
  const [a11y, setA11y] = useState<Record<string, FrameA11y>>({})
  const [responsive, setResponsive] = useState<Record<string, ResponsiveResult | null>>({})
  const onResponsive = useCallback((id: string, r: ResponsiveResult | null) => setResponsive((m) => ({ ...m, [id]: r })), [])
  const [drafts, setDrafts] = useState<Set<string>>(new Set())
  const decisions = useDecisions(manifest.id)
  const consolidation = useConsolidation(manifest.id)
  const groups = useMemo(() => buttonGroups(project), [project])
  const repo = useRepoStatus()

  const refreshDrafts = useCallback(() => listDrafts(manifest.id).then((d) => setDrafts(new Set(d))), [manifest.id])
  useEffect(() => void refreshDrafts(), [refreshDrafts])

  // Fixes applied to repo branches; re-read when a branch changes or the watcher fetches main (it may now be merged).
  const [applied, setApplied] = useState<Record<string, Applied>>({})
  const refreshApplied = useCallback(() => repoApi.list(manifest.id).then((l) => setApplied(Object.fromEntries(l.map((a) => [a.entry, a])))), [manifest.id])
  useEffect(() => {
    void refreshApplied()
    const hot = import.meta.hot
    const on = () => void refreshApplied()
    hot?.on("canvas:applied", on)
    hot?.on("canvas:status", on)
    return () => {
      hot?.off("canvas:applied", on)
      hot?.off("canvas:status", on)
    }
  }, [refreshApplied])
  // Manual edits per draft key (drafts/<key>.manual.json), the inspect toggle, and the element picked in a fix frame.
  const [manual, setManualState] = useState<Record<string, ManualEdit[]>>({})
  useEffect(() => {
    manualApi.list(manifest.id).then(async (keys) => {
      const all = await Promise.all(keys.map(async (k) => [k, await manualApi.get(manifest.id, k)] as const))
      setManualState(Object.fromEntries(all))
    })
  }, [manifest.id])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const setManual = (key: string, edits: ManualEdit[]) => {
    setManualState((m) => ({ ...m, [key]: edits }))
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => manualApi.put(manifest.id, key, edits), 250)
  }
  // Which components are being fixed right now (the sparkly cloud), and whether to show the original instead of the fix.
  const [fixing, setFixingState] = useState<Record<string, "autofix" | "ai" | null>>({})
  const panelOwns = useRef(new Set<string>())
  const setFixing = useCallback((id: string, kind: "autofix" | "ai" | null, fromPanel = false) => {
    if (fromPanel) kind ? panelOwns.current.add(id) : panelOwns.current.delete(id)
    setFixingState((m) => ({ ...m, [id]: kind }))
  }, [])
  // AI fixes run on the server: show the cloud for them even when the panel is closed.
  useEffect(() => {
    const hot = import.meta.hot
    const on = (d: { project: string; entry: string; job: { state: string } }) => {
      if (d.project !== manifest.id) return
      const e = all.find((x) => draftKey(x.id) === d.entry)
      if (!e || panelOwns.current.has(e.id)) return
      setFixingState((m) => ({ ...m, [e.id]: d.job.state === "running" ? "ai" : null }))
    }
    hot?.on("canvas:autofix", on)
    return () => hot?.off("canvas:autofix", on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest.id])
  const [showOriginal, setShowOriginal] = useState(false)
  useEffect(() => setShowOriginal(false), [selected])
  const [inspect, setInspect] = useState(false)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [fixTab, setFixTab] = useState<FixType | null>(null)
  useEffect(() => {
    setInspect(false)
    setPicked(null)
    setFixTab(null)
  }, [selected])
  // An AI fix writes the manual edits into the code and clears them; re-read when it finishes.
  useEffect(() => {
    const hot = import.meta.hot
    const on = (d: { project: string; entry: string; job: { state: string } }) =>
      d.project === manifest.id && d.job.state === "done" && manualApi.get(manifest.id, d.entry).then((edits) => setManualState((m) => ({ ...m, [d.entry]: edits })))
    hot?.on("canvas:autofix", on)
    return () => hot?.off("canvas:autofix", on)
  }, [manifest.id])
  /** The fix row shows when there is a draft, manual edits, or you are about to make some. */
  const hasFix = (id: string) => drafts.has(draftKey(id)) || !!manual[draftKey(id)]?.length || (selected === id && fixTab === "manual" && inspect)

  const incoming = useMemo(() => new Set((newFromMain(project)?.entries.map((e) => e.id) ?? []).filter((id) => !placements.get(id))), [project, placements])
  const statusFor = (e: Entry): Status =>
    statusOf({ entry: e, incoming: incoming.has(e.id), hasDraft: hasFix(e.id), decision: decisions.get(e.id), a11y: a11y[e.id], applied: applied[draftKey(e.id)] })
  useEffect(() => writeLocal(`${key}:theme`, themeId), [key, themeId])
  useEffect(() => writeLocal(`${key}:viewport`, viewport), [key, viewport])
  useEffect(() => writeLocal("motioncn:sidebar", sidebarOpen), [sidebarOpen])
  useEffect(() => {
    history.replaceState(null, "", `${location.search}#${page.id}`)
  }, [page.id])
  useEffect(() => {
    const onHash = () => setPageId(location.hash.slice(1))
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  /** Fit frames (all on the page, or the given ids) into the area between the sidebar and the detail panel. */
  const fit = useCallback(
    (ids?: string[]) => {
      const world = worldRef.current
      if (!world) return
      const els = [...world.querySelectorAll<HTMLElement>("[data-fit]")].filter((el) => !ids || ids.includes(el.dataset.fit!))
      if (!els.length) return
      setViewState((v) => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
        for (const el of els) {
          const r = el.getBoundingClientRect()
          x0 = Math.min(x0, (r.left - v.x) / v.z)
          y0 = Math.min(y0, (r.top - v.y) / v.z - 40)
          x1 = Math.max(x1, (r.right - v.x) / v.z)
          y1 = Math.max(y1, (r.bottom - v.y) / v.z)
        }
        const left = sidebarOpen ? SIDEBAR : 0
        const vw = window.innerWidth - left - (ids ? 420 : 0)
        const vh = window.innerHeight
        const pad = 60
        const z = clampZ(Math.min((vw - pad * 2) / (x1 - x0), (vh - pad * 2 - 70) / (y1 - y0), ids ? 1 : 0.9))
        return { z, x: left + (vw - (x1 - x0) * z) / 2 - x0 * z, y: 80 + Math.max(0, (vh - 80 - (y1 - y0) * z) / 2) - y0 * z }
      })
    },
    [selected, sidebarOpen],
  )

  // New page or viewport: show the top of the page at a readable zoom
  useEffect(() => {
    const want = pendingFocus.current
    setSelected(want)
    const t = setTimeout(() => {
      pendingFocus.current = null
      if (want) {
        fit([want])
        // once more when the preview has loaded and the frame has its real height
        return void setTimeout(() => fit([want]), 1600)
      }
      fit()
      setViewState((v) => ({ ...v, z: Math.max(v.z, 0.32), y: 96 }))
    }, want ? 350 : 80)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, viewport])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return
      const c = [window.innerWidth / 2, window.innerHeight / 2] as const
      if (e.shiftKey && e.code === "Digit1") fit()
      else if (e.key === "Escape") setSelected(null)
      else if ((e.key === "=" || e.key === "+") && !e.metaKey && !e.ctrlKey) setView((v) => zoomAt(v, 1.2, ...c))
      else if (e.key === "-" && !e.metaKey && !e.ctrlKey) setView((v) => zoomAt(v, 1 / 1.2, ...c))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fit, setView])

  const all = pages.flatMap((p) => p.sections.flatMap((s) => s.entries))
  // Waiting on you: anything incoming, needing a fix, or with a fix to look at, on any page.
  const reviewCount = all.filter((e) => WAITING.includes(statusFor(e))).length
  const selectedEntry: Entry | undefined = all.find((e) => e.id === selected)
  const onA11y = useCallback((id: string, r: FrameA11y) => setA11y((m) => ({ ...m, [id]: { ...m[id], ...r } })), [])
  const widths = viewport === "all" ? VIEWPORTS : VIEWPORTS.filter((v) => v.id === viewport)

  // Fix routing: which entry shows which repo component, and how far a change to it reaches.
  const byComponent = useMemo(() => entriesByComponent(project, pages), [project, pages])
  const openEntry = (id: string) => {
    const target = pageOf(id)
    if (!target) return
    if (isolated) {
      setIsolate((t) => (t.includes(id) ? t.slice(0, t.indexOf(id) + 1) : [...t, id]))
      setSelected(id)
      setTimeout(() => fit([id]), 120)
      setTimeout(() => fit([id]), 1600)
      return
    }
    if (target.id === page.id) {
      setSelected(id)
      setTimeout(() => fit([id]), 60)
    } else {
      pendingFocus.current = id
      setPageId(target.id)
    }
  }
  /** Leave isolation and show the component among its neighbours. */
  const showAll = () => {
    const id = isolated
    setIsolate([])
    if (!id) return
    const target = pageOf(id)
    if (target && target.id !== page.id) {
      pendingFocus.current = id
      setPageId(target.id)
    } else setTimeout(() => fit([id]), 120)
  }
  // Fixes approved on the canvas that have draft code: screens of the real app show them swapped in.
  const approvedFixes = onlyMain ? [] : all.filter((e) => ["apply-fix", "approved"].includes(decisions.get(e.id)?.status ?? "") && drafts.has(draftKey(e.id))).map((e) => draftKey(e.id))
  const fixesKey = approvedFixes.join(",")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fixes = useMemo(() => approvedFixes, [fixesKey])
  const isoEntry = isolated ? all.find((e) => e.id === isolated) : undefined
  const shownSections: Section[] = isoEntry ? [{ title: "", entries: [isoEntry] }] : page.sections
  const selfName = selectedEntry ? componentOf(project, selectedEntry) : null
  const routing = {
    self: selfName,
    entries: byComponent,
    uses: (name: string) => project.scan.usage.filter((u) => u.name === name).length,
    reach: selfName ? reachOf(project, selfName) : null,
    openEntry,
    openScreen,
  }

  return (
    <div className="relative h-full w-full">
      <Canvas view={view} setView={setView} worldRef={worldRef} onBackgroundClick={() => setSelected(null)}>
        <div className="flex flex-col gap-28 p-10" style={{ width: "max-content" }}>
          {!isoEntry && (
            <header data-fit="__header" className="max-w-6xl">
              <div className="text-muted-foreground text-3xl font-medium">{manifest.name}</div>
              <h1 className="mt-2 text-8xl font-semibold tracking-tight">{page.title}</h1>
              <p className="text-muted-foreground mt-5 text-4xl">{page.blurb}</p>
            </header>
          )}
          {shownSections.map((s) => (
            <section key={s.title || isolated}>
              {!isoEntry && (
                <div className="mb-60">
                  <h2 className="text-6xl font-semibold tracking-tight">{s.title}</h2>
                  {s.blurb && <p className="text-muted-foreground mt-3 max-w-5xl text-3xl">{s.blurb}</p>}
                </div>
              )}
              <div className="flex flex-wrap items-start gap-x-16 gap-y-56" style={{ maxWidth: viewport === "all" ? 5200 : viewport === "desktop" ? 4200 : 3000 }}>
                {s.entries.filter((e) => !onlyMain || ![...PENDING, "proposal"].includes(statusFor(e))).map((e) => (
                  <ProjectFrame
                    key={`${e.id}-${viewport}`}
                    project={project}
                    entry={e}
                    widths={widths}
                    theme={theme}
                    zoom={view.z}
                    selected={selection.includes(e.id)}
                    showA11y={showA11y}
                    decision={decisions.get(e.id)?.status}
                    decisionNote={decisions.get(e.id)?.note}
                    hasDraft={hasFix(e.id)}
                    showOriginal={selected === e.id && showOriginal}
                    fixing={fixing[e.id] ?? null}
                    status={statusFor(e)}
                    manual={manual[draftKey(e.id)] ?? []}
                    inspect={selected === e.id && inspect}
                    onPicked={setPicked}
                    fixes={fixes}
                    plan={isGroup(e.id) ? consolidation.plan : undefined}
                    onSelect={(ev) => select(e.id, ev.shiftKey || ev.metaKey)}
                    actions={selection[selection.length - 1] === e.id && !isGroup(e.id) ? <CanvasActions {...{ project, entry: e, selection, entries: all, decisions, hasFix: hasFix(e.id), setSelected, setPanelTab, setTab: setFixTab, placements, pages, inReview: page.kind === "review" }} /> : undefined}
                    onFocus={() => fit([e.id])}
                    onA11y={onA11y}
                    onResponsive={onResponsive}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </Canvas>

      <AnimatePresence>{sidebarOpen && <Sidebar key="sidebar" current={manifest.id} canvas="components" setCanvas={setCanvas} {...repo} />}</AnimatePresence>

      <ProjectToolbar
        project={project}
        pages={pages}
        page={page}
        setPage={(id) => (setIsolate([]), setPageId(id))}
        reviewCount={reviewCount}
        sidebarOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen((o) => !o)}
        themes={manifest.themes}
        theme={theme}
        setTheme={setThemeId}
        viewport={viewport}
        setViewport={setViewport}
        showA11y={showA11y}
        setShowA11y={setShowA11y}
        onlyMain={onlyMain}
        setOnlyMain={setOnlyMain}
        zoom={view.z}
        zoomIn={() => setView((v) => zoomAt(v, 1.2, window.innerWidth / 2, window.innerHeight / 2))}
        zoomOut={() => setView((v) => zoomAt(v, 1 / 1.2, window.innerWidth / 2, window.innerHeight / 2))}
        fit={() => fit()}
        decisions={decisions}
        entries={all}
        drafts={drafts}
        setCanvas={setCanvas}
      />

      {!isoEntry && <UpdateBanner project={manifest.id} changes={project.changes} onReview={() => setPageId("review")} />}

      {isoEntry && (
        <div className="pointer-events-none absolute top-16 right-[444px] flex justify-center transition-[left] duration-200" style={{ left: sidebarOpen ? 284 : 12 }}>
          <nav aria-label="Where you are" className="bg-background pointer-events-auto flex max-w-full flex-wrap items-center gap-1 rounded-xl border p-1.5 text-sm shadow-md">
            {focusFrom && (
              <>
                <button onClick={() => openScreen(focusFrom.key)} className="hover:bg-accent flex h-8 items-center gap-1.5 rounded-md px-2 font-medium" title="Back to this screen on the User flows canvas">
                  <ArrowLeft className="size-4" /> {focusFrom.title}
                </button>
                <ChevronRight className="text-muted-foreground size-4" />
              </>
            )}
            {isolate.map((id, i) => {
              const e = all.find((x) => x.id === id)
              const last = i === isolate.length - 1
              return (
                <span key={id} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="text-muted-foreground size-4" />}
                  <button disabled={last} onClick={() => openEntry(id)} className={cn("h-8 rounded-md px-2 font-medium", last ? "bg-[#0d99ff]/10 text-[#0d99ff]" : "hover:bg-accent")}>
                    {e?.title ?? id}
                  </button>
                </span>
              )
            })}
            <span className="bg-border mx-1 h-5 w-px" />
            {focusFrom && ["apply-fix", "approved"].includes(decisions.get(isolate[0])?.status ?? "") && (
              <button onClick={() => openScreen(focusFrom.key)} className="flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 font-medium text-white" title="The screen now renders with the approved fix">
                See it on the screen <ArrowUpRight className="size-4" />
              </button>
            )}
            <button onClick={showAll} className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-8 items-center gap-1.5 rounded-md px-2" title="Leave this focused view">
              <LayoutGrid className="size-4" /> Show all components
            </button>
          </nav>
        </div>
      )}

      <AnimatePresence>
        {selectedEntry && isGroup(selectedEntry.id) && groups.some((g) => groupId(g.kind) === selectedEntry.id) && (
          <ConsolidatePanel
            key="consolidate"
            project={project}
            entry={selectedEntry}
            group={groups.find((g) => groupId(g.kind) === selectedEntry.id)!}
            consolidation={consolidation}
            confirmed={decisions.get(selectedEntry.id)?.status === "merge"}
            setConfirmed={(on, note) => decisions.set(selectedEntry.id, on ? "merge" : null, on ? note : "")}
            onClose={() => setSelected(null)}
          />
        )}
        {selectedEntry && !isGroup(selectedEntry.id) && (
          <DetailPanel
            key="panel"
            project={project}
            entry={selectedEntry}
            a11y={a11y[selectedEntry.id]}
            hasDraft={hasFix(selectedEntry.id)}
            status={statusFor(selectedEntry)}
            manual={manual[draftKey(selectedEntry.id)] ?? []}
            setManual={(edits) => setManual(draftKey(selectedEntry.id), edits)}
            inspect={inspect}
            setInspect={setInspect}
            picked={picked}
            tab={fixTab}
            setTab={setFixTab}
            setFixing={(kind) => setFixing(selectedEntry.id, kind, true)}
            showOriginal={showOriginal}
            setShowOriginal={setShowOriginal}
            applied={applied[draftKey(selectedEntry.id)]}
            onAppliedChanged={refreshApplied}
            onDraftsChanged={refreshDrafts}
            decision={decisions.get(selectedEntry.id)}
            setDecision={(status: Decision | null, note?: string) => decisions.set(selectedEntry.id, status, note)}
            onClose={() => setSelected(null)}
            panelTab={panelTab}
            setPanelTab={setPanelTab}
            responsive={responsive[selectedEntry.id] ?? null}
            allWidths={viewport === "all"}
            showAllWidths={() => setViewport("all")}
            routing={routing}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
