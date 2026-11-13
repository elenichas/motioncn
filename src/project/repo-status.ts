import { useEffect, useState } from "react"

/** What the dev server's watcher knows about each repo (see canvasApi in vite.canvas.ts). */
export type RepoStatus = {
  branch: string
  watch: string
  local: string
  remote: string | null
  dirty: boolean
  behind: boolean
  lastCheck: string
  lastPull?: { from: string; to: string; at: string; subjects: string[] }
  error?: string
}

/** Live repo status: fetched once, then pushed by the dev server over Vite's websocket. */
export function useRepoStatus() {
  const [status, setStatus] = useState<Record<string, RepoStatus>>({})
  const [scanning, setScanning] = useState<string | null>(null)
  const [, tick] = useState(0)
  useEffect(() => {
    fetch("/__canvas/status")
      .then((r) => (r.ok ? r.json() : {}))
      .then(setStatus, () => {})
    const hot = import.meta.hot
    const onStatus = (s: Record<string, RepoStatus>) => (setStatus(s), setScanning(null))
    const onScan = (d: { project: string }) => setScanning(d.project)
    hot?.on("canvas:status", onStatus)
    hot?.on("canvas:scanning", onScan)
    // keep "checked 12s ago" fresh
    const t = setInterval(() => tick((n) => n + 1), 5000)
    return () => {
      hot?.off("canvas:status", onStatus)
      hot?.off("canvas:scanning", onScan)
      clearInterval(t)
    }
  }, [])
  const checkNow = () =>
    fetch("/__canvas/check", { method: "POST" })
      .then((r) => r.json())
      .then(setStatus, () => {})
  return { status, scanning, checkNow }
}

export const ago = (iso?: string) => {
  if (!iso) return "never"
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : new Date(iso).toLocaleString()
}
