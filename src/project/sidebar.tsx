import { useState } from "react"
import { motion } from "motion/react"
import { Check, ClipboardCopy, FolderGit2, LoaderCircle, Plus, RefreshCw, Sparkles } from "lucide-react"
import { projects } from "@/projects"
import { cn } from "@/lib/utils"
import { ago, type RepoStatus } from "./repo-status"
import { CANVASES, type CanvasId } from "./canvas-switch"

type Props = {
  current: string
  status: Record<string, RepoStatus>
  scanning: string | null
  checkNow: () => void
  /** The open canvas of the current project, and how to switch. */
  canvas?: CanvasId
  setCanvas?: (c: CanvasId) => void
}

function Dot({ s, busy }: { s?: RepoStatus; busy?: boolean }) {
  if (busy) return <LoaderCircle className="size-3 shrink-0 animate-spin text-sky-600" />
  const color = !s ? "bg-zinc-300" : s.error ? "bg-red-500" : s.behind ? "bg-amber-500" : "bg-emerald-500"
  return (
    <span className="relative flex size-2.5 shrink-0">
      {s && !s.error && !s.behind && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-40", color)} />}
      <span className={cn("relative size-2.5 rounded-full", color)} />
    </span>
  )
}

const describe = (s?: RepoStatus) =>
  !s
    ? "Connecting…"
    : s.error
      ? s.error
      : s.behind
        ? `${s.watch} has new commits; the local clone has changes or is on ${s.branch}, so pull by hand`
        : `${s.watch} @ ${s.local} · checked ${ago(s.lastCheck)}`

/** Left rail: every canvas, with a live connection dot for project repos. */
export function Sidebar({ current, status, scanning, checkNow, canvas, setCanvas }: Props) {
  const [adding, setAdding] = useState(false)
  const [copied, setCopied] = useState(false)
  const prompt = "Clone <repo URL> next to motioncn and set it up as a project canvas: scan it, write its manifest and previews, and watch its main branch."
  const s = status[current]
  return (
    <motion.aside
      initial={{ x: -16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -16, opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="bg-background/95 absolute top-3 bottom-3 left-3 z-10 flex w-[260px] flex-col rounded-xl border shadow-sm backdrop-blur"
      aria-label="Canvases"
    >
      <div className="px-4 pt-4 pb-2">
        <div className="text-sm font-semibold">motioncn</div>
        <div className="text-muted-foreground text-xs">Canvases</div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        <a href="./" className="hover:bg-accent flex items-start gap-2.5 rounded-lg px-2 py-2">
          <Sparkles className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-medium">Animated components</span>
            <span className="text-muted-foreground block text-xs">The motioncn playground</span>
          </span>
        </a>
        <div className="text-muted-foreground px-2 pt-4 pb-1 text-[10px] font-semibold tracking-wider uppercase">Projects</div>
        {Object.entries(projects).map(([id, p]) => (
          <div key={id}>
          <a
            href={`project.html?p=${id}`}
            aria-current={id === current ? "page" : undefined}
            className={cn("flex items-start gap-2.5 rounded-lg px-2 py-2", id === current ? "bg-accent" : "hover:bg-accent")}
          >
            <FolderGit2 className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{p.manifest.name}</span>
                <Dot s={status[id]} busy={scanning === id} />
              </span>
              <span className="text-muted-foreground block truncate font-mono text-[11px]">{p.config.repo.replace(/^\.\.\//, "")}</span>
              <span className="text-muted-foreground mt-0.5 block text-[11px] leading-snug">{scanning === id ? "Rescanning…" : describe(status[id])}</span>
            </span>
          </a>
          {/* the canvases nested in the open project */}
          {id === current && setCanvas && (
            <ul className="mt-0.5 mb-1 ml-4 space-y-0.5 border-l pl-2">
              {CANVASES.filter((c) => c.id !== "flows" || p.flows.length).map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setCanvas(c.id)}
                    aria-current={c.id === canvas ? "page" : undefined}
                    className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px]", c.id === canvas ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                  >
                    <c.icon className="size-3.5 shrink-0" />
                    <span className="flex-1">{c.label}</span>
                    <span className="text-[11px] tabular-nums opacity-70">{c.id === "flows" ? p.flows.length : p.manifest.pages.reduce((n, pg) => n + pg.sections.reduce((m, s) => m + s.entries.length, 0), 0)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          </div>
        ))}
        <button onClick={() => setAdding((a) => !a)} aria-expanded={adding} className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm">
          <Plus className="size-4" /> Add a project
        </button>
        {adding && (
          <div className="bg-muted/60 mx-2 rounded-lg p-3 text-xs">
            <p>A canvas needs the repo cloned next to motioncn, a scan, and preview renderers for its components. Ask Claude in this project:</p>
            <p className="bg-background mt-2 rounded-md border p-2 font-mono text-[11px] leading-relaxed">{prompt}</p>
            <button
              onClick={() => navigator.clipboard.writeText(prompt).then(() => (setCopied(true), setTimeout(() => setCopied(false), 1500)))}
              className="hover:bg-background mt-2 flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium"
            >
              {copied ? <Check className="size-3.5" /> : <ClipboardCopy className="size-3.5" />} {copied ? "Copied" : "Copy prompt"}
            </button>
          </div>
        )}
      </nav>
      {projects[current] && (
        <div className="border-t p-3 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <Dot s={s} busy={scanning === current} /> {s?.error ? "Not connected" : "Live: following " + (s?.watch ?? "main")}
          </div>
          <p className="text-muted-foreground mt-1 leading-snug">
            New commits on {s?.watch ?? "main"} are pulled (fast-forward only), rescanned and shown under Review. Checked every {projects[current].config.watch?.intervalSec ?? 30}s.
          </p>
          <button onClick={checkNow} className="hover:bg-accent mt-2 flex h-7 items-center gap-1.5 rounded-md border px-2 font-medium">
            <RefreshCw className="size-3.5" /> Check now
          </button>
        </div>
      )}
    </motion.aside>
  )
}
