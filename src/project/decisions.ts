import { useCallback, useEffect, useState } from "react"
import { draftKey, type Project } from "@/projects"
import { DECISIONS, type Decision, type Entry } from "./types"
import { draftApi, type DraftFile } from "./draft-api"
import { consolidationBrief, readPlan } from "./consolidate"

export type DecisionRecord = { status: Decision | null; note: string; at: string; /** For merge / variant: the component it goes with. */ target?: string }
export type Decisions = ReturnType<typeof useDecisions>

/** Review decisions for one project, kept in this browser until exported. */
export function useDecisions(projectId: string) {
  const key = `motioncn:decisions:${projectId}`
  const [map, setMap] = useState<Record<string, DecisionRecord>>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "{}")
    } catch {
      return {}
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(map))
    } catch {
      /* storage blocked: decisions last for this session only */
    }
  }, [key, map])
  const set = useCallback((id: string, status: Decision | null, note?: string, target?: string) => {
    setMap((m) => {
      const prev = m[id]
      const next = { status, note: note ?? prev?.note ?? "", at: new Date().toISOString(), ...(target ? { target } : {}) }
      if (!next.status && !next.note) {
        const rest = { ...m }
        delete rest[id]
        return rest
      }
      return { ...m, [id]: next }
    })
  }, [])
  return { map, get: (id: string) => map[id] as DecisionRecord | undefined, set, count: Object.values(map).filter((d) => d.status).length }
}

/** Draft sources for the decided entries that have one, so the export carries the actual fix. */
export async function collectDrafts(project: Project, ids: string[], have: Set<string>) {
  const out: Record<string, DraftFile> = {}
  await Promise.all(ids.filter((id) => have.has(draftKey(id))).map(async (id) => (out[id] = await draftApi(project.manifest.id, draftKey(id)).get())))
  return out
}

/** The decisions file an agent reads: what was decided, where it lives, what the canvas found, and the drafted fix. */
export function decisionsFile(project: Project, entries: Entry[], map: Record<string, DecisionRecord>, drafts: Record<string, DraftFile> = {}) {
  return {
    project: project.manifest.id,
    repo: project.config.repo,
    commit: project.scan.commit,
    exportedAt: new Date().toISOString(),
    consolidation: readPlan(project.manifest.id),
    decisions: entries
      .filter((e) => (map[e.id]?.status || map[e.id]?.note) && !e.id.startsWith("buttons~"))
      .map((e) => ({
        id: e.id,
        title: e.title,
        where: e.where ?? null,
        proposal: !!e.proposal,
        decision: map[e.id].status,
        note: map[e.id].note || null,
        findings: (e.findings ?? []).map((f) => `${f.level}: ${f.text}`),
        draft: drafts[e.id] ? { file: drafts[e.id].file, code: drafts[e.id].code } : null,
      })),
  }
}

/** The same decisions as a brief to paste into an agent session. */
export function agentBrief(project: Project, entries: Entry[], map: Record<string, DecisionRecord>, drafts: Record<string, DraftFile> = {}) {
  const file = decisionsFile(project, entries, map, drafts)
  const label = (d: Decision | null) => DECISIONS.find((x) => x.id === d)?.label ?? "Note only"
  const lines = [
    `# Design system changes for ${project.manifest.name}`,
    "",
    `Repo: ${project.config.repo} (scanned at commit ${file.commit}). Decisions were made on the motioncn project canvas.`,
    "Apply each decision below, keep the brand tokens, then rerun `npm run scan " + project.manifest.id + "` in motioncn and report what changed on the canvas.",
    "",
  ]
  for (const d of file.decisions) {
    lines.push(`## ${d.title} — ${label(d.decision)}`)
    if (d.where) lines.push(`Where: ${d.where}`)
    if (d.proposal) lines.push("This is a proposal drawn on the canvas, not code that exists yet.")
    if (d.note) lines.push(`Note: ${d.note}`)
    for (const f of d.findings) lines.push(`- ${f}`)
    if (d.draft) {
      lines.push("", `The approved version, drafted on the canvas (${d.draft.file}). Make the repo component match it, then update every place it is used:`, "", "```tsx", d.draft.code.trim(), "```")
    }
    lines.push("")
  }
  // hand-written buttons the reviewer consolidated, one instruction per button
  lines.push(...consolidationBrief(project, readPlan(project.manifest.id)))
  return lines.join("\n")
}
