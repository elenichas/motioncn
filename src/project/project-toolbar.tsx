import { useEffect, useRef, useState, type ReactNode } from "react"
import { Accessibility, Check, GitBranch, ClipboardCopy, Columns3, Download, ListChecks, Maximize, Minus, Monitor, PanelLeft, Plus, Smartphone, Tablet, Trash2 } from "lucide-react"
import type { Project } from "@/projects"
import { cn } from "@/lib/utils"
import type { Entry, Page, ProjectTheme } from "./types"
import { agentBrief, collectDrafts, decisionsFile, type Decisions } from "./decisions"
import { CanvasSwitch, type CanvasId } from "./canvas-switch"
import { readPlan } from "./consolidate"

export type ViewportMode = "phone" | "tablet" | "desktop" | "all"

type Props = {
  project: Project
  pages: Page[]
  page: Page
  setPage: (id: string) => void
  /** Items on the Review page still waiting for a decision. */
  reviewCount: number
  sidebarOpen: boolean
  toggleSidebar: () => void
  themes: ProjectTheme[]
  theme: ProjectTheme
  setTheme: (id: string) => void
  viewport: ViewportMode
  setViewport: (v: ViewportMode) => void
  showA11y: boolean
  setShowA11y: (v: boolean) => void
  onlyMain: boolean
  setOnlyMain: (v: boolean) => void
  zoom: number
  zoomIn: () => void
  zoomOut: () => void
  fit: () => void
  decisions: Decisions
  entries: Entry[]
  drafts: Set<string>
  setCanvas: (c: CanvasId) => void
}

const bar = "bg-background/90 pointer-events-auto flex items-center gap-1 rounded-xl border p-1 shadow-sm backdrop-blur"

function IconBtn({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn("flex size-8 items-center justify-center rounded-md transition-colors [&_svg]:size-4", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
    >
      {children}
    </button>
  )
}

const VIEWPORT_OPTIONS: Array<{ id: ViewportMode; label: string; icon: typeof Monitor }> = [
  { id: "phone", label: "Phone 390", icon: Smartphone },
  { id: "tablet", label: "Tablet 768", icon: Tablet },
  { id: "desktop", label: "Desktop 1280", icon: Monitor },
  { id: "all", label: "All three widths", icon: Columns3 },
]

export function ProjectToolbar(p: Props) {
  const counts = (pg: Page) => pg.sections.reduce((n, s) => n + s.entries.length, 0)
  const library = p.pages.filter((pg) => pg.kind !== "review")
  const review = p.pages.find((pg) => pg.kind === "review")
  const tab = (pg: Page, badge: ReactNode) => (
    <button
      key={pg.id}
      onClick={() => p.setPage(pg.id)}
      aria-current={pg.id === p.page.id ? "page" : undefined}
      className={cn("flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors", pg.id === p.page.id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}
    >
      {pg.title}
      {badge}
    </button>
  )
  return (
    <div className="pointer-events-none absolute top-3 right-3 flex flex-wrap items-start justify-between gap-2 transition-[left] duration-200" style={{ left: p.sidebarOpen ? 284 : 12 }}>
      <div className={bar}>
        <IconBtn label={p.sidebarOpen ? "Hide canvases" : "Show canvases"} active={p.sidebarOpen} onClick={p.toggleSidebar}>
          <PanelLeft />
        </IconBtn>
        {!p.sidebarOpen && <div className="px-1.5 text-sm font-semibold">{p.project.manifest.name}</div>}
        {!!p.project.flows.length && <CanvasSwitch current="components" set={p.setCanvas} />}
        <span className="bg-border mx-1 h-6 w-px" />
        <nav className="flex items-center gap-0.5" aria-label="Pages">
          <span className="text-muted-foreground px-1 text-[10px] font-semibold tracking-wider uppercase">Library</span>
          {library.map((pg) => tab(pg, <span className="text-muted-foreground text-[11px] tabular-nums">{counts(pg)}</span>))}
          {review && (
            <>
              <span className="bg-border mx-1 h-6 w-px" />
              {tab(
                review,
                <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular-nums", p.reviewCount ? "bg-red-500 text-white" : "bg-muted text-muted-foreground")} title={`${p.reviewCount} waiting for a decision`}>
                  {p.reviewCount}
                </span>,
              )}
            </>
          )}
        </nav>
      </div>

      <div className={bar}>
        <label className="flex items-center gap-1.5 pl-1.5 text-sm">
          <span className="text-muted-foreground text-xs">Theme</span>
          <select value={p.theme.id} onChange={(e) => p.setTheme(e.target.value)} className="hover:bg-accent h-8 rounded-md bg-transparent px-1.5 text-sm font-medium outline-none" title={p.theme.note}>
            {p.themes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <span className="bg-border mx-0.5 h-5 w-px" />
        {VIEWPORT_OPTIONS.map((v) => (
          <IconBtn key={v.id} label={`${v.label} (screens and sheets)`} active={p.viewport === v.id} onClick={() => p.setViewport(v.id)}>
            <v.icon />
          </IconBtn>
        ))}
        <span className="bg-border mx-0.5 h-5 w-px" />
        <IconBtn label={p.onlyMain ? "Showing only what is in main" : "Show only what is in main (hide approved changes the repo does not have yet)"} active={p.onlyMain} onClick={() => p.setOnlyMain(!p.onlyMain)}>
          <GitBranch />
        </IconBtn>
        <IconBtn label="Accessibility badges" active={p.showA11y} onClick={() => p.setShowA11y(!p.showA11y)}>
          <Accessibility />
        </IconBtn>
        <span className="bg-border mx-0.5 h-5 w-px" />
        <IconBtn label="Zoom out" onClick={p.zoomOut}><Minus /></IconBtn>
        <span className="text-muted-foreground w-11 text-center text-xs tabular-nums">{Math.round(p.zoom * 100)}%</span>
        <IconBtn label="Zoom in" onClick={p.zoomIn}><Plus /></IconBtn>
        <IconBtn label="Fit page (Shift+1)" onClick={p.fit}><Maximize /></IconBtn>
        <span className="bg-border mx-0.5 h-5 w-px" />
        <DecisionsMenu {...p} />
      </div>
    </div>
  )
}

function DecisionsMenu({ project, decisions, entries, drafts }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener("pointerdown", close)
    return () => window.removeEventListener("pointerdown", close)
  }, [open])
  const withDrafts = () => collectDrafts(project, Object.keys(decisions.map), drafts)
  const download = async () => {
    const file = decisionsFile(project, entries, decisions.map, await withDrafts())
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `${project.manifest.id}-decisions.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const copy = async () => {
    await navigator.clipboard.writeText(agentBrief(project, entries, decisions.map, await withDrafts()))
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  const n = decisions.count + Object.keys(readPlan(project.manifest.id).choices).length
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="bg-primary text-primary-foreground flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium">
        <ListChecks className="size-4" /> Decisions
        <span className="bg-primary-foreground/20 rounded px-1 text-[11px] tabular-nums">{n}</span>
      </button>
      {open && (
        <div className="bg-popover text-popover-foreground absolute top-full right-0 z-10 mt-2 w-80 rounded-xl border p-2 shadow-lg">
          <p className="text-muted-foreground px-2 py-1.5 text-xs">
            {n ? `${n} decision${n > 1 ? "s" : ""} made.` : "No decisions yet. Select a frame to approve, fix, merge or flag it."} They stay in this browser until you export them. Approved fixes are exported with their draft code.
          </p>
          {[
            { label: "Download decisions.json", hint: "The file an agent reads", icon: Download, run: download },
            { label: copied ? "Copied" : "Copy agent brief", hint: "Markdown to paste into a session", icon: copied ? Check : ClipboardCopy, run: copy },
          ].map((a) => (
            <button key={a.hint} disabled={!n} onClick={a.run} className="hover:bg-accent flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left disabled:opacity-40">
              <a.icon className="size-4 shrink-0" />
              <span>
                <span className="block text-sm font-medium">{a.label}</span>
                <span className="text-muted-foreground block text-xs">{a.hint}</span>
              </span>
            </button>
          ))}
          <button
            disabled={!n}
            onClick={() => {
              if (confirm(`Clear all ${n} decisions for ${project.manifest.name}? This cannot be undone.`)) for (const id of Object.keys(decisions.map)) decisions.set(id, null, "")
            }}
            className="text-destructive hover:bg-destructive/10 mt-1 flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm disabled:opacity-40"
          >
            <Trash2 className="size-4" /> Clear decisions
          </button>
        </div>
      )}
    </div>
  )
}
