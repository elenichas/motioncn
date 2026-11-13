import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { GitCommitHorizontal, LoaderCircle, X } from "lucide-react"
import type { Changes } from "@/projects"

/**
 * Shown when the last rescan brought in commits from main that have not been looked at yet,
 * and while a pull or rescan is in flight (the canvas reloads with the new scan when it lands).
 */
export function UpdateBanner({ project, changes, onReview }: { project: string; changes: Changes; onReview: () => void }) {
  const key = `motioncn:seen:${project}`
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  })
  const [incoming, setIncoming] = useState<string | null>(null)
  useEffect(() => {
    const hot = import.meta.hot
    const onPulled = (d: { project: string; subjects: string[] }) => d.project === project && setIncoming(d.subjects[0] ?? "New commits")
    const onScan = (d: { project: string }) => d.project === project && setIncoming((s) => s ?? "Rescanning")
    hot?.on("canvas:pulled", onPulled)
    hot?.on("canvas:scanning", onScan)
    return () => {
      hot?.off("canvas:pulled", onPulled)
      hot?.off("canvas:scanning", onScan)
    }
  }, [project])

  const dismiss = () => {
    try {
      localStorage.setItem(key, changes.to)
    } catch {
      /* storage blocked: shows again next load */
    }
    setSeen(changes.to)
  }

  if (incoming)
    return (
      <Shell>
        <LoaderCircle className="size-4 shrink-0 animate-spin text-sky-600" />
        <span>
          <b>main moved:</b> “{incoming}”. Pulling and rescanning…
        </span>
      </Shell>
    )
  if (!changes.commits.length || seen === changes.to) return null
  const first = changes.commits[0]
  const n = changes.added.length
  return (
    <Shell>
      <GitCommitHorizontal className="size-4 shrink-0 text-sky-600" />
      <span className="min-w-0">
        <b>{changes.commits.length === 1 ? "New commit on main" : `${changes.commits.length} new commits on main`}</b> · “{first.subject}” by {first.author}
        <span className="text-muted-foreground"> · {n ? `${n} new component${n > 1 ? "s" : ""} to review` : `${changes.changedFiles.length} files changed`}</span>
      </span>
      <button
        onClick={() => {
          onReview()
          dismiss()
        }}
        className="bg-primary text-primary-foreground ml-1 h-7 shrink-0 rounded-md px-2.5 text-xs font-medium"
      >
        Review
      </button>
      <button onClick={dismiss} aria-label="Dismiss" className="text-muted-foreground hover:bg-accent flex size-7 shrink-0 items-center justify-center rounded-md">
        <X className="size-4" />
      </button>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      role="status"
      className="bg-background pointer-events-auto absolute inset-x-0 top-16 z-20 mx-auto flex w-fit max-w-[min(720px,calc(100%-24px))] items-center gap-2.5 rounded-xl border border-sky-300 px-3 py-2 text-sm shadow-lg"
    >
      {children}
    </motion.div>
  )
}
