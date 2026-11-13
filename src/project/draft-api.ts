import type { Applied } from "./review-model"

/** Client for the dev server's draft endpoints (vite.canvas.ts). Drafts only exist while running `npm run dev`. */
export type DraftFile = { file: string; abs: string; code: string }

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? res.statusText)
  return data as T
}

export type AutofixJob = { state: "running" | "done" | "error"; startedAt: string; endedAt?: string; summary?: string; error?: string }

/** Auto-fix: the dev server asks Claude Code (headless) to write the draft from the findings. */
export const autofix = {
  status: (project: string, entry: string) =>
    call<{ cli: boolean; job: AutofixJob | null }>("GET", `/__canvas/autofix?project=${encodeURIComponent(project)}&entry=${encodeURIComponent(entry)}`),
  start: (body: { project: string; entry: string; title: string; where?: string; findings: string[]; instruction?: string; options?: boolean; attempt: number }) =>
    call<AutofixJob>("POST", "/__canvas/autofix", body),
}

/** Autofix: rule-based code fixes on the draft (created from the source if needed). No AI. */
export const autofixCodeApi = (body: { project: string; entry: string; where?: string; title: string }) =>
  call<{ created: boolean; changes: Array<{ rule: string; detail: string }> }>("POST", "/__canvas/autofix-code", body)

/** Apply in repo: Claude edits a local branch (canvas/<entry>) in its own worktree; the server commits. Never pushes. */
export const repoApi = {
  list: (project: string) => call<Applied[]>("GET", `/__canvas/applied?project=${encodeURIComponent(project)}`).catch(() => [] as Applied[]),
  apply: (body: { project: string; entry: string; title: string; where?: string; note?: string }) => call<Applied>("POST", "/__canvas/apply", body),
  discard: (project: string, entry: string) => call<{ ok: true }>("DELETE", `/__canvas/applied?project=${encodeURIComponent(project)}&entry=${encodeURIComponent(entry)}`),
}

export const listDrafts = (project: string) => call<string[]>("GET", `/__canvas/drafts?project=${encodeURIComponent(project)}`).catch(() => [] as string[])

export function draftApi(project: string, entry: string) {
  const q = `/__canvas/draft?project=${encodeURIComponent(project)}&entry=${encodeURIComponent(entry)}`
  return {
    get: () => call<DraftFile>("GET", q),
    create: (where: string | undefined, title: string) => call<DraftFile>("POST", "/__canvas/draft", { project, entry, where, title }),
    put: (code: string) => call<{ ok: true }>("PUT", "/__canvas/draft", { project, entry, code }),
    remove: () => call<{ ok: true }>("DELETE", q),
  }
}
