/**
 * The User flows canvas: every flow as a row of live screens joined by arrows, one flow under the other.
 * Select a screen and point at anything in it to see which component it is; click to pin the trail,
 * double-click to open that component on the Components canvas.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Wand2, Accessibility, ArrowUpRight, CircleCheck, CircleX, CornerDownRight, FileCode2, Maximize, Minus, Monitor, MousePointerClick, PanelLeft, Plus, Smartphone, Tablet, TriangleAlert, X } from "lucide-react"
import { Canvas, zoomAt, type View } from "@/canvas/canvas"
import type { Project } from "@/projects"
import { cn } from "@/lib/utils"
import { VIEWPORTS, type Entry, type FromPreview, type LiveFinding, type Located, type Page, type ProjectTheme, type Viewport } from "./types"
import { entriesByComponent, screenKey, untraced, viaState, type Flow, type FlowScreen } from "./flows"
import { Routing, routeFindings } from "./routing"
import { Sidebar } from "./sidebar"
import { useRepoStatus } from "./repo-status"
import { CanvasSwitch, type CanvasId } from "./canvas-switch"
import { SELECT } from "./project-frame"
import { useDecisions } from "./decisions"
import { listDrafts } from "./draft-api"
import { draftKey } from "@/projects"

const SIDEBAR = 272
const ARROW = 260
const clampZ = (z: number) => Math.min(3, Math.max(0.06, z))
const labelScale = (zoom: number) => Math.min(1 / zoom, 2.4)
type ScreenState = { a11y?: { issues: number; warnings: number; findings: LiveFinding[] }; driven?: { ok: boolean; done: number; wanted?: string }; error?: string }
type Pinned = { key: string; chain: Located[]; label: string }

type Props = {
  project: Project
  pages: Page[]
  /** "<flow>/<screen>" to select and zoom to when the canvas opens. */
  focusScreen?: string
  openEntry: (id: string, tab?: "checks" | "actions", from?: { key: string; title: string }) => void
  setCanvas: (c: CanvasId) => void
}

export function FlowsCanvas({ project, pages, focusScreen, openEntry: openOnComponents, setCanvas }: Props) {
  const { manifest, flows } = project
  const key = `motioncn:project:${manifest.id}`
  const worldRef = useRef<HTMLDivElement>(null)
  const [view, setViewState] = useState<View>({ x: 320, y: 120, z: 0.3 })
  const setView = useCallback((fn: (v: View) => View) => setViewState(fn), [])
  const [themeId, setThemeId] = useState(() => localStorage.getItem(`${key}:theme`)?.replace(/"/g, "") ?? manifest.themes[0].id)
  const theme = manifest.themes.find((t) => t.id === themeId) ?? manifest.themes[0]
  const [vpId, setVpId] = useState<Viewport["id"]>("phone")
  const vp = VIEWPORTS.find((v) => v.id === vpId)!
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem("motioncn:sidebar") !== "false")
  const [showA11y, setShowA11y] = useState(true)
  const [selected, setSelected] = useState<string | null>(focusScreen ?? null)
  const [states, setStates] = useState<Record<string, ScreenState>>({})
  const [pinned, setPinned] = useState<Pinned | null>(null)
  const repo = useRepoStatus()
  // Fixes approved on the Components canvas (with draft code) are swapped into every screen here.
  const decisions = useDecisions(manifest.id)
  const [drafts, setDrafts] = useState<Set<string>>(new Set())
  useEffect(() => void listDrafts(manifest.id).then((d) => setDrafts(new Set(d))), [manifest.id])
  const [withFixes, setWithFixes] = useState(true)
  const approved = useMemo(
    () => pages.flatMap((p) => p.sections.flatMap((s) => s.entries)).filter((e) => ["apply-fix", "approved"].includes(decisions.get(e.id)?.status ?? "") && drafts.has(draftKey(e.id))).map((e) => draftKey(e.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pages, decisions.map, drafts],
  )
  const fixes = withFixes ? approved.join(",") : ""
  const entries = useMemo(() => entriesByComponent(project, pages), [project, pages])
  const notMapped = useMemo(() => untraced(project), [project])
  const uses = useCallback((name: string) => project.scan.usage.filter((u) => u.name === name).length, [project])
  const report = useCallback((k: string, s: ScreenState) => setStates((m) => ({ ...m, [k]: { ...m[k], ...s } })), [])
  useEffect(() => setPinned(null), [selected, vpId])

  const fit = useCallback(
    (keys?: string[]) => {
      const world = worldRef.current
      if (!world) return
      const els = [...world.querySelectorAll<HTMLElement>("[data-fit]")].filter((el) => !keys || keys.includes(el.dataset.fit!))
      if (!els.length) return
      setViewState((v) => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
        for (const el of els) {
          const r = el.getBoundingClientRect()
          x0 = Math.min(x0, (r.left - v.x) / v.z)
          y0 = Math.min(y0, (r.top - v.y) / v.z - 80)
          x1 = Math.max(x1, (r.right - v.x) / v.z)
          y1 = Math.max(y1, (r.bottom - v.y) / v.z)
        }
        const left = sidebarOpen ? SIDEBAR : 0
        const vw = window.innerWidth - left - (keys && !keys[0].startsWith("flow:") ? 400 : 0)
        const vh = window.innerHeight
        const flowRow = keys?.length === 1 && keys[0].startsWith("flow:")
        // A whole flow rarely fits at a readable size: show its start, and let the user pan along it.
        const z = clampZ(Math.max(Math.min((vw - 120) / (x1 - x0), (vh - 190) / (y1 - y0), keys ? 0.9 : 0.6), flowRow ? 0.26 : 0))
        const wide = (x1 - x0) * z > vw - 80
        return { z, x: wide ? left + 60 - x0 * z : left + (vw - (x1 - x0) * z) / 2 - x0 * z, y: 90 + Math.max(0, (vh - 90 - (y1 - y0) * z) / 2) - y0 * z }
      })
    },
    [sidebarOpen],
  )
  // Open on the first flow at a readable size (or on the screen another canvas asked for).
  useEffect(() => {
    const t = setTimeout(() => (focusScreen ? fit([focusScreen]) : fit([`flow:${flows[0]?.id}`])), 120)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vpId])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return
      const c = [window.innerWidth / 2, window.innerHeight / 2] as const
      if (e.shiftKey && e.code === "Digit1") fit()
      else if (e.key === "Escape") setSelected(null)
      else if (e.key === "=" || e.key === "+") setView((v) => zoomAt(v, 1.2, ...c))
      else if (e.key === "-") setView((v) => zoomAt(v, 1 / 1.2, ...c))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fit, setView])

  const open = (name: string) => entries[name] && openEntry(entries[name].id)
  const goScreen = (k: string) => (setSelected(k), setTimeout(() => fit([k]), 30))
  const selNow = selected ? flows.flatMap((f) => f.screens.map((s) => ({ k: screenKey(f.id, s.id), title: s.title }))).find((x) => x.k === selected) : undefined
  const openEntry = (id: string, tab?: "checks" | "actions") => openOnComponents(id, tab, selNow ? { key: selNow.k, title: selNow.title } : undefined)
  const sel = selected ? flows.flatMap((f) => f.screens.map((s) => ({ f, s }))).find((x) => screenKey(x.f.id, x.s.id) === selected) : undefined
  const total = flows.reduce((n, f) => n + f.screens.length, 0)

  return (
    <div className="relative h-full w-full">
      <Canvas view={view} setView={setView} worldRef={worldRef} onBackgroundClick={() => setSelected(null)}>
        <div className="flex flex-col gap-72 p-10" style={{ width: "max-content" }}>
          <header data-fit="__header" className="max-w-6xl">
            <div className="text-muted-foreground text-3xl font-medium">{manifest.name}</div>
            <h1 className="mt-2 text-8xl font-semibold tracking-tight">User flows</h1>
            <p className="text-muted-foreground mt-5 text-4xl">
              {flows.length} flows, {total} screens. Each screen is the real app, reached by pressing the controls on the arrows. Select a screen and click anything in it to find its component.
            </p>
          </header>
          {flows.map((f, i) => (
            <FlowRow
              key={`${f.id}-${vpId}-${fixes}`}
              fixes={fixes}
              index={i + 1}
              flow={f}
              {...{ project, vp, theme, zoom: view.z, selected, showA11y, states, report, pinned, entries, open }}
              onSelect={setSelected}
              onFocus={(k) => fit([k])}
              onLocated={(k, d) => (d.open && d.chain[0] && entries[d.chain[0].name] ? open(d.chain[0].name) : setPinned({ key: k, chain: d.chain, label: d.label }))}
              goScreen={goScreen}
            />
          ))}
          {!!notMapped.length && (
            <section className="max-w-5xl">
              <h2 className="text-5xl font-semibold tracking-tight">Not mapped yet · {notMapped.length}</h2>
              <p className="text-muted-foreground mt-3 text-3xl">Places where the code moves the user that no flow above cites. Some are other ways into a mapped screen; some are flows still to trace.</p>
              <ul className="mt-8 grid grid-cols-2 gap-x-12 gap-y-3 font-mono text-2xl">
                {notMapped.map((n) => (
                  <li key={`${n.file}:${n.line}`}>
                    <span className="font-semibold">{n.call}</span> <span className="text-muted-foreground">in {n.inside ?? "?"} · {n.file.split("/").pop()}:{n.line}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Canvas>

      <AnimatePresence>{sidebarOpen && <Sidebar key="sidebar" current={manifest.id} canvas="flows" setCanvas={setCanvas} {...repo} />}</AnimatePresence>

      <div className="pointer-events-none absolute top-3 right-3 flex flex-wrap items-start justify-between gap-2 transition-[left] duration-200" style={{ left: sidebarOpen ? 284 : 12 }}>
        <div className="bg-background/90 pointer-events-auto flex items-center gap-1 rounded-xl border p-1 shadow-sm backdrop-blur">
          <TB label={sidebarOpen ? "Hide canvases" : "Show canvases"} active={sidebarOpen} onClick={() => (localStorage.setItem("motioncn:sidebar", String(!sidebarOpen)), setSidebarOpen(!sidebarOpen))}><PanelLeft /></TB>
          <CanvasSwitch current="flows" set={setCanvas} />
          <span className="bg-border mx-1 h-6 w-px" />
          <select aria-label="Jump to a flow" value="" onChange={(e) => (setSelected(null), fit([`flow:${e.target.value}`]))} className="hover:bg-accent h-8 max-w-56 rounded-md bg-transparent px-1.5 text-sm font-medium outline-none">
            <option value="" disabled>Jump to a flow…</option>
            {flows.map((f, i) => (
              <option key={f.id} value={f.id}>{i + 1}. {f.title}</option>
            ))}
          </select>
        </div>
        <div className="bg-background/90 pointer-events-auto flex items-center gap-1 rounded-xl border p-1 shadow-sm backdrop-blur">
          <label className="flex items-center gap-1.5 pl-1.5 text-sm">
            <span className="text-muted-foreground text-xs">Theme</span>
            <select value={theme.id} onChange={(e) => (localStorage.setItem(`${key}:theme`, JSON.stringify(e.target.value)), setThemeId(e.target.value))} className="hover:bg-accent h-8 rounded-md bg-transparent px-1.5 text-sm font-medium outline-none">
              {manifest.themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <span className="bg-border mx-0.5 h-5 w-px" />
          {([["phone", Smartphone], ["tablet", Tablet], ["desktop", Monitor]] as const).map(([id, Icon]) => (
            <TB key={id} label={`${id} width`} active={vpId === id} onClick={() => setVpId(id)}><Icon /></TB>
          ))}
          <span className="bg-border mx-0.5 h-5 w-px" />
          {!!approved.length && (
            <button onClick={() => setWithFixes(!withFixes)} aria-pressed={withFixes} title={withFixes ? "Screens show the fixes you approved. Click to see the app as the repo has it." : "Screens show the app as the repo has it. Click to show your approved fixes."} className={cn("flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium whitespace-nowrap", withFixes ? "bg-violet-600 text-white" : "text-muted-foreground hover:bg-accent")}>
              <Wand2 className="size-3.5" /> {withFixes ? `With ${approved.length} approved fix${approved.length > 1 ? "es" : ""}` : "As in the repo"}
            </button>
          )}
          <TB label="Accessibility badges" active={showA11y} onClick={() => setShowA11y(!showA11y)}><Accessibility /></TB>
          <span className="bg-border mx-0.5 h-5 w-px" />
          <TB label="Zoom out" onClick={() => setView((v) => zoomAt(v, 1 / 1.2, innerWidth / 2, innerHeight / 2))}><Minus /></TB>
          <span className="text-muted-foreground w-11 text-center text-xs tabular-nums">{Math.round(view.z * 100)}%</span>
          <TB label="Zoom in" onClick={() => setView((v) => zoomAt(v, 1.2, innerWidth / 2, innerHeight / 2))}><Plus /></TB>
          <TB label="Fit all flows (Shift+1)" onClick={() => fit()}><Maximize /></TB>
        </div>
      </div>

      <AnimatePresence>
        {sel && (
          <ScreenPanel
            key="panel"
            project={project}
            flow={sel.f}
            screen={sel.s}
            state={states[selected!] ?? {}}
            pinned={pinned?.key === selected ? pinned : null}
            entries={entries}
            uses={uses}
            onOpen={(e, tab) => openEntry(e.id, tab)}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TB({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} aria-pressed={active} onClick={onClick} className={cn("flex size-8 items-center justify-center rounded-md transition-colors [&_svg]:size-4", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
      {children}
    </button>
  )
}

/* ───────────────────────── one flow ───────────────────────── */

type RowProps = {
  /** Comma-separated draft keys swapped into the screens. */
  fixes: string
  project: Project
  flow: Flow
  index: number
  vp: Viewport
  theme: ProjectTheme
  zoom: number
  selected: string | null
  showA11y: boolean
  states: Record<string, ScreenState>
  report: (k: string, s: ScreenState) => void
  pinned: Pinned | null
  entries: Record<string, Entry>
  open: (name: string) => void
  onSelect: (k: string) => void
  onFocus: (k: string) => void
  onLocated: (k: string, d: { chain: Located[]; label: string; open: boolean }) => void
  goScreen: (k: string) => void
}

function FlowRow({ fixes, project, flow, index, vp, theme, zoom, selected, showA11y, states, report, pinned, entries, open, onSelect, onFocus, onLocated, goScreen }: RowProps) {
  return (
    <section data-fit={`flow:${flow.id}`}>
      <div className="mb-56">
        <div className="text-muted-foreground text-3xl font-medium tabular-nums">Flow {index} · {flow.screens.length} screens</div>
        <h2 className="mt-1 text-7xl font-semibold tracking-tight">{flow.title}</h2>
        <p className="text-muted-foreground mt-3 max-w-5xl text-3xl">{flow.goal}</p>
      </div>
      <div className="flex items-start">
        {flow.screens.map((s, i) => {
          const k = screenKey(flow.id, s.id)
          const exits = (flow.exits ?? []).filter((x) => x.from === s.id)
          const stale = viaState(project, s.via) === "changed"
          return (
            <div key={s.id} className="flex items-start">
              {i > 0 && (
                <div className="flex shrink-0 flex-col items-center px-3" style={{ width: ARROW, marginTop: Math.min(vp.h * 0.36, 300) }}>
                  <span className={cn("mb-3 text-center text-[22px] leading-tight font-medium", stale && "text-red-600")}>{s.action}</span>
                  <svg width={ARROW - 24} height="24" viewBox={`0 0 ${ARROW - 24} 24`} aria-hidden>
                    <path d={`M2 12 H${ARROW - 34}`} stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" className={stale ? "text-red-500" : "text-zinc-400"} strokeDasharray={stale ? "8 8" : undefined} />
                    <path d={`M${ARROW - 46} 3 L${ARROW - 30} 12 L${ARROW - 46} 21`} stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" className={stale ? "text-red-500" : "text-zinc-400"} />
                  </svg>
                  {s.via && <span className="text-muted-foreground mt-3 text-center font-mono text-[15px] leading-tight break-all">{s.via.call}</span>}
                  {stale && <span className="mt-2 rounded-full bg-red-500/15 px-2.5 py-1 text-center text-[15px] font-semibold text-red-700">Changed in the repo: trace again</span>}
                </div>
              )}
              <div>
                <ScreenFrame
                  {...{ project, flow, screen: s, vp, theme, zoom, showA11y, fixes }}
                  step={i + 1}
                  selected={selected === k}
                  state={states[k] ?? {}}
                  report={(st) => report(k, st)}
                  pinned={pinned?.key === k ? pinned : null}
                  entries={entries}
                  open={open}
                  onSelect={() => onSelect(k)}
                  onFocus={() => onFocus(k)}
                  onLocated={(d) => onLocated(k, d)}
                />
                {!!exits.length && (
                  <ul className="mt-5 space-y-2" style={{ width: vp.w }}>
                    {exits.map((x) => (
                      <li key={x.label} className="flex items-start gap-2 text-[19px] leading-snug">
                        <CornerDownRight className="text-muted-foreground mt-1 size-5 shrink-0" />
                        <span>
                          <span className="font-medium">{x.label}</span> <span className="text-muted-foreground">→</span>{" "}
                          {x.toScreen ? (
                            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => goScreen(x.toScreen!)} className="text-sky-700 underline underline-offset-4">
                              {x.to}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">{x.to}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ───────────────────────── one screen ───────────────────────── */

type FrameProps = {
  fixes: string
  project: Project
  flow: Flow
  screen: FlowScreen
  step: number
  vp: Viewport
  theme: ProjectTheme
  zoom: number
  selected: boolean
  showA11y: boolean
  state: ScreenState
  report: (s: ScreenState) => void
  pinned: Pinned | null
  entries: Record<string, Entry>
  open: (name: string) => void
  onSelect: () => void
  onFocus: () => void
  onLocated: (d: { chain: Located[]; label: string; open: boolean }) => void
}

function ScreenFrame({ fixes, project, flow, screen, step, vp, theme, zoom, selected, showA11y, state, report, pinned, entries, open, onSelect, onFocus, onLocated }: FrameProps) {
  const box = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLIFrameElement>(null)
  // Screens load when they come near the viewport: thirty copies of the app at once is a lot.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (mounted || !box.current) return
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setMounted(true), { rootMargin: "600px" })
    io.observe(box.current)
    return () => io.disconnect()
  }, [mounted])
  const [src] = useState(() => `preview.html?p=${project.manifest.id}&id=${encodeURIComponent(screen.base)}&theme=${theme.id}&fixed=1&drive=${encodeURIComponent(JSON.stringify(screen.drive))}${fixes ? `&fixes=${fixes}` : ""}`)
  const cb = useRef({ report, onLocated })
  cb.current = { report, onLocated }
  useEffect(() => {
    const onMsg = (e: MessageEvent<FromPreview & { __preview?: boolean }>) => {
      if (e.source !== ref.current?.contentWindow || !e.data?.__preview) return
      const d = e.data
      if (d.type === "a11y") cb.current.report({ a11y: { issues: d.issues, warnings: d.warnings, findings: d.findings } })
      else if (d.type === "driven") cb.current.report({ driven: d })
      else if (d.type === "error") cb.current.report({ error: d.message })
      else if (d.type === "located") cb.current.onLocated(d)
    }
    window.addEventListener("message", onMsg)
    return () => window.removeEventListener("message", onMsg)
  }, [])
  const first = useRef(true)
  useEffect(() => {
    if (first.current) return void (first.current = false)
    ref.current?.contentWindow?.postMessage({ type: "theme", vars: theme.vars }, location.origin)
  }, [theme])
  // A selected screen is a picture of the app you can point at: clicks find components instead of pressing buttons.
  const sendLocate = () => ref.current?.contentWindow?.postMessage({ type: "locate", on: selected }, location.origin)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(sendLocate, [selected, state.driven])

  const failed = state.driven && !state.driven.ok
  const ready = !!state.driven
  const a = state.a11y
  const k = labelScale(zoom)
  return (
    <div data-frame={screenKey(flow.id, screen.id)} data-fit={screenKey(flow.id, screen.id)} className="relative" style={{ width: vp.w }} onPointerDown={onSelect}>
      <div className="absolute bottom-full left-0 flex origin-bottom-left flex-wrap items-center gap-1.5 pb-2" style={{ width: Math.max(vp.w / k, 640), transform: `scale(${k})` }} onDoubleClick={onFocus} title="Double-click to zoom to this screen">
        {selected && (
          <div className="mb-1.5 w-full" onPointerDown={(e) => e.stopPropagation()}>
            <div className="bg-background inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border p-1 shadow-md">
              {!pinned ? (
                <span className="text-muted-foreground flex items-center gap-1.5 px-2 py-1 text-[12px]">
                  <MousePointerClick className="size-3.5" /> Click anything in the screen to see its component. Double-click opens it.
                </span>
              ) : !pinned.chain.length ? (
                <span className="text-muted-foreground px-2 py-1 text-[12px]">{pinned.label} is not written by a component the scanner knows.</span>
              ) : (
                pinned.chain.slice(0, 5).map((c, i) => {
                  const has = !!entries[c.name]
                  return (
                    <span key={`${c.name}${i}`} className="flex items-center gap-1">
                      {i > 0 && <span className="text-muted-foreground text-[11px]">in</span>}
                      <button
                        disabled={!has}
                        onClick={() => open(c.name)}
                        title={has ? `Open ${c.name} on the Components canvas` : `${c.file}:${c.line} · not on the Components canvas`}
                        className={cn("flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium", has ? (i === 0 ? "bg-[#0d99ff] text-white" : "bg-accent hover:bg-zinc-200") : "text-muted-foreground border border-dashed")}
                      >
                        {c.name}
                        {c.library && <span className="opacity-70">· library</span>}
                        {has && <ArrowUpRight className="size-3.5" />}
                      </button>
                    </span>
                  )
                })
              )}
            </div>
          </div>
        )}
        <span className="w-full truncate text-sm font-semibold" style={selected ? { color: SELECT } : undefined}>
          <span className="text-muted-foreground mr-1.5 tabular-nums">{step}</span>
          {screen.title}
        </span>
        {failed && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-700">Could not reach: no “{state.driven!.wanted?.replace(/^tab:/, "")}” to press</span>}
        {showA11y && ready && !failed && a && (
          <span className={cn("flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", a.issues ? "bg-red-500/15 text-red-600" : a.warnings ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/15 text-emerald-700")}>
            {a.issues ? <CircleX className="size-3" /> : a.warnings ? <TriangleAlert className="size-3" /> : <CircleCheck className="size-3" />}
            {a.issues ? `${a.issues} a11y issue${a.issues > 1 ? "s" : ""}` : a.warnings ? `${a.warnings} a11y warning${a.warnings > 1 ? "s" : ""}` : "AA pass"}
          </span>
        )}
        {screen.component && <span className="text-muted-foreground shrink-0 font-mono text-[11px]">{screen.component}</span>}
      </div>
      <div ref={box} className={cn("bg-background relative overflow-hidden rounded-xl border shadow-sm", (failed || state.error) && "border-2 border-red-400")} style={{ width: vp.w, height: vp.h, boxShadow: selected ? `0 0 0 3px ${SELECT}` : undefined }}>
        {mounted && <iframe ref={ref} src={src} title={`${flow.title}: ${screen.title}`} className="block size-full border-0" onLoad={() => setTimeout(sendLocate, 300)} style={{ pointerEvents: selected ? "auto" : "none" }} />}
        {(!mounted || !ready) && (
          <div className="bg-background/80 text-muted-foreground absolute inset-0 grid place-items-center text-xl backdrop-blur-sm">
            {mounted ? (screen.drive.length ? `Getting there: ${screen.drive.length} step${screen.drive.length > 1 ? "s" : ""}…` : "Opening…") : screen.title}
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────── panel for the selected screen ───────────────────────── */

function ScreenPanel({ project, flow, screen, state, pinned, entries, uses, onOpen, onClose }: { project: Project; flow: Flow; screen: FlowScreen; state: ScreenState; pinned: Pinned | null; entries: Record<string, Entry>; uses: (n: string) => number; onOpen: (e: Entry, tab?: "checks" | "actions") => void; onClose: () => void }) {
  const own = screen.component ? entries[screen.component] : undefined
  const byEye = [...new Set((state.a11y?.findings ?? []).filter((f) => f.level === "warn" && /contrast/i.test(f.check)).map((f) => f.what))]
  const routes = routeFindings(state.a11y?.findings ?? [], screen.component)
  const comp = project.scan.components.find((c) => c.name === screen.component)
  const path = flow.screens.slice(0, flow.screens.findIndex((s) => s.id === screen.id) + 1)
  const h = "mb-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase"
  return (
    <motion.aside initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }} transition={{ duration: 0.2 }} className="bg-background absolute top-16 right-3 bottom-3 flex w-[400px] flex-col overflow-hidden rounded-xl border shadow-lg" aria-label={`${screen.title} details`}>
      <header className="flex items-start gap-2 border-b p-4">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs">{flow.title}</p>
          <h2 className="text-base font-semibold">{screen.title}</h2>
          {comp && (
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 font-mono text-xs">
              <FileCode2 className="size-3.5 shrink-0" />
              <span className="truncate">{comp.name} · {comp.file}:{comp.line}</span>
            </p>
          )}
        </div>
        <button onClick={onClose} aria-label="Close details" className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
          <X className="size-4" />
        </button>
      </header>
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {pinned && !!pinned.chain.length && (
          <section>
            <h3 className={h}>You clicked</h3>
            <p className="text-[13px]">{pinned.label}</p>
            <ol className="mt-2 space-y-1">
              {pinned.chain.map((c, i) => (
                <li key={`${c.name}${i}`} className="flex items-center gap-2 text-[13px]" style={{ paddingLeft: Math.min(i, 5) * 10 }}>
                  <span className="text-muted-foreground text-[11px]">{i === 0 ? "is" : "in"}</span>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground text-[11px]">{c.library ? "library" : c.file.split("/").pop()}</span>
                  {entries[c.name] && (
                    <button onClick={() => onOpen(entries[c.name])} className="ml-auto flex items-center gap-0.5 text-[12px] font-medium text-sky-700 hover:underline">
                      Open <ArrowUpRight className="size-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
        <section>
          <h3 className={h}>Accessibility on this screen · where to fix</h3>
          {!state.a11y ? (
            <p className="text-muted-foreground text-[13px]">Scanning…</p>
          ) : routes.length ? (
            <Routing routes={routes} here="this screen" entries={entries} uses={uses} onOpen={(e) => onOpen(e, "actions")} onFixHere={own ? () => onOpen(own, "actions") : undefined} />
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-700"><CircleCheck className="size-3.5" /> No failed checks.</p>
          )}
          {!!byEye.length && (
            <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50/60 p-2.5">
              <p className="text-[13px] font-semibold">Check by eye <span className="text-muted-foreground font-normal tabular-nums">{byEye.length}</span></p>
              <p className="text-muted-foreground mt-0.5 text-[11.5px] leading-snug">Text or icons over a photo or gradient. The canvas can only estimate the contrast there, so these are not counted as failures. If any is hard to read, darken the scrim under it.</p>
              <p className="mt-1.5 text-[12px] leading-snug">{byEye.slice(0, 6).join(" · ")}{byEye.length > 6 && ` · and ${byEye.length - 6} more`}</p>
            </div>
          )}
          <p className="text-muted-foreground mt-2 text-[11.5px] leading-snug">A problem seen here is fixed where its code lives. Library fixes are made on the Components canvas and reach every screen that uses the component.</p>
        </section>
        <section>
          <h3 className={h}>How the user gets here</h3>
          <ol className="space-y-2">
            {path.map((s, i) => (
              <li key={s.id} className="flex gap-2 text-[13px] leading-snug">
                <span className="text-muted-foreground w-4 shrink-0 tabular-nums">{i + 1}</span>
                <span>
                  {i === 0 ? <>Starts on <span className="font-medium">{s.title}</span></> : <>{s.action} → <span className="font-medium">{s.title}</span></>}
                  {s.via && (
                    <span className={cn("block font-mono text-[11px]", viaState(project, s.via) === "changed" ? "text-red-600" : "text-muted-foreground")}>
                      {s.via.call} · {s.via.file.split("/").pop()}
                      {viaState(project, s.via) === "changed" && " · no longer in the repo"}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          {state.driven && !state.driven.ok && <p className="mt-2 text-[12.5px] text-red-600">The canvas pressed {state.driven.done} of {screen.drive.length} controls, then found no “{state.driven.wanted}”. The app probably changed: trace this flow again.</p>}
          {screen.note && <p className="text-muted-foreground mt-2 text-[12px] leading-snug">{screen.note}</p>}
        </section>
      </div>
    </motion.aside>
  )
}
