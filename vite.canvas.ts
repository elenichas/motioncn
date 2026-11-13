/**
 * Dev-server side of project canvases (scanned repos shown on their own canvas):
 * - externalRepos(): runs a scanned repo's code inside this app without installing that repo
 * - canvasApi(): draft fixes on disk, and a watcher that follows each repo's main branch
 */
import fs from "node:fs"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import type { Plugin, ViteDevServer } from "vite"
import { autofixCode, restyleByRole, type AutofixConfig } from "./vite.autofix.ts"

const run = promisify(execFile)
const root = import.meta.dirname

export type ProjectConfig = {
  id: string
  name?: string
  repo: string
  publicDir?: string
  stubs?: Record<string, string>
  watch?: { branch?: string; intervalSec?: number }
}
export type LoadedProject = ProjectConfig & { abs: string }

/** src/projects/<id>/config.json for every project whose repo is checked out. */
export function loadProjects(): LoadedProject[] {
  const dir = path.join(root, "src/projects")
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .map((d) => path.join(dir, d, "config.json"))
    .filter((f) => fs.existsSync(f))
    .map((f) => JSON.parse(fs.readFileSync(f, "utf8")) as ProjectConfig)
    .map((p) => ({ ...p, abs: path.resolve(root, p.repo) }))
    .filter((p) => fs.existsSync(p.abs))
}

/* ───────────────────────── swapping fixes into the app ───────────────────────── */

/**
 * Makes every component declared in a scanned repo replaceable at runtime: `function Button(` becomes a thin
 * `Button` that renders the original, or its fixed version when a preview frame has one (src/preview/swap.ts).
 * This is what lets a real screen show a component's fix, local (non-exported) components included.
 * The rewrite keeps every line where it was, so source locations still match the repo.
 */
export function canvasSwap(projects: LoadedProject[]): Plugin {
  const swap = path.join(root, "src/preview/swap.ts")
  return {
    name: "canvas-swap",
    enforce: "pre",
    transform(code, id) {
      const file = id.split("?")[0]
      if (!/\.(tsx|jsx)$/.test(file) || !projects.some((p) => file.startsWith(p.abs + path.sep)) || file.includes("node_modules")) return null
      let n = 0
      const out = code.replace(/^(export (?:default )?)?function ([A-Z]\w*)(?=[<(])/gm, (_m, exp: string | undefined, name: string) => {
        n++
        // called with more than props (a plain function with a capital name): pass straight through
        return `${exp ?? ""}function ${name}(props, ...rest) { return rest.some((x) => x !== undefined) ? ${name}__orig(props, ...rest) : __canvasRender(${JSON.stringify(name)}, ${name}__orig, props) } function ${name}__orig`
      })
      if (!n) return null
      return { code: `${out}\nimport { __canvasRender } from ${JSON.stringify(swap)}\n`, map: null }
    },
  }
}

/* ───────────────────────── running repo code ───────────────────────── */

/**
 * - "@/" is this app's src, except inside a scanned repo where it is that repo's root
 * - bare imports from repo files resolve from this app's node_modules, so there is one React
 * - modules listed in config.stubs (3D scenes, server-only code) are swapped for a stand-in
 * - files in the repo's public folder are served at the same URLs as in the repo
 */
export function externalRepos(projects: LoadedProject[]): Plugin {
  const src = path.join(root, "src")
  const anchor = path.join(src, "main.tsx")
  const owner = (file?: string) => (file ? projects.find((p) => file.startsWith(p.abs + path.sep)) : undefined)
  const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".avif": "image/avif", ".glb": "model/gltf-binary" }
  return {
    name: "external-repos",
    enforce: "pre",
    async resolveId(source, importer) {
      const p = owner(importer)
      if (source.startsWith("@/")) return this.resolve(path.join(p ? p.abs : src, source.slice(2)), importer, { skipSelf: true })
      if (!p) return null
      if (!source.startsWith(".") && !path.isAbsolute(source) && !source.startsWith("\0") && !source.startsWith("/"))
        return this.resolve(source, anchor, { skipSelf: true })
      if (p.stubs) {
        const r = await this.resolve(source, importer, { skipSelf: true })
        const stub = r && Object.entries(p.stubs).find(([from]) => r.id.split("?")[0] === path.join(p.abs, from))
        if (stub) return path.resolve(root, stub[1])
        return r
      }
      return null
    },
    configureServer(server) {
      // Files outside the app root are not watched by default: new components in a repo should show up live.
      for (const p of projects) server.watcher.add(path.join(p.abs, "components"))
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? "").split("?")[0])
        for (const p of projects) {
          const pub = path.join(p.abs, p.publicDir ?? "public")
          const file = path.join(pub, url)
          if (file.startsWith(pub) && /\.\w+$/.test(url) && fs.existsSync(file) && fs.statSync(file).isFile()) {
            res.setHeader("Content-Type", MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream")
            res.setHeader("Cache-Control", "max-age=3600")
            fs.createReadStream(file).pipe(res)
            return
          }
        }
        next()
      })
    },
  }
}

/* ───────────────────────── drafts ───────────────────────── */

const draftPath = (id: string, entry: string) => path.join(root, "src/projects", id, "drafts", `${entry}.tsx`)

/**
 * A draft starts as a copy of the component's source: its function, the file's imports
 * (rewritten to "@repo/<id>/..."), and imports for anything else the function uses from the same file.
 */
function draftFromSource(p: LoadedProject, where: string, title: string): string {
  const [file, lineStr] = where.split(":")
  const abs = path.join(p.abs, file)
  if (!/\.(tsx|jsx)$/.test(file) || !fs.existsSync(abs)) throw new Error(`Cannot fix this automatically: "${where}" is not a single component file in ${p.repo}.`)
  const text = fs.readFileSync(abs, "utf8")
  const lines = text.split("\n")
  const start = Math.max(0, Number(lineStr) - 1)
  // Formatted code closes top-level declarations with "}" or "})" at column 0.
  let end = start
  while (end < lines.length - 1 && !/^\}\)?;?\s*$/.test(lines[end])) end++
  let body = lines.slice(start, end + 1).join("\n")
  if (!body.startsWith("export ")) body = "export " + body
  const name = body.match(/^export (?:const (\w+)|function (\w+))/)?.slice(1).find(Boolean) ?? "Component"

  const toRepo = (spec: string) => {
    if (spec.startsWith("@/")) return `@repo/${p.id}/${spec.slice(2)}`
    if (spec.startsWith(".")) return `@repo/${p.id}/${path.posix.join(path.posix.dirname(file), spec)}`
    return spec
  }
  const imports = [...text.matchAll(/^import\s[\s\S]*?from\s+["']([^"']+)["'];?$/gm)].map((m) => m[0].replace(m[1], toRepo(m[1])))
  const sibling = [...text.matchAll(/^export (?:const|function|class) (\w+)/gm)]
    .map((m) => m[1])
    .filter((n) => n !== name && new RegExp(`\\b${n}\\b`).test(body))
  const modulePath = `@repo/${p.id}/${file.replace(/\.tsx?$/, "")}`
  // Non-exported types and constants in the same file that the component uses (e.g. its props type).
  const balanced = (l: string) => [..."{(["].every((o, i) => l.split(o).length === l.split(")}]"[i]).length)
  const locals: string[] = []
  for (const m of text.matchAll(/^(?:type|interface|const|function) (\w+)/gm)) {
    if (m[1] === name || !new RegExp(`\\b${m[1]}\\b`).test(body)) continue
    const from = text.slice(0, m.index).split("\n").length - 1
    if (from >= start && from <= end) continue
    let to = from
    if (!balanced(lines[from])) while (to < lines.length - 1 && !/^[})\]]/.test(lines[to + 1] ?? "")) to++
    locals.push(lines.slice(from, balanced(lines[from]) ? from + 1 : to + 2).join("\n"))
  }
  return [
    `/**`,
    ` * Draft fix for ${title}.`,
    ` * Copied from ${where}. Edit it here: the canvas shows it next to the current version`,
    ` * and runs the same accessibility checks on both. Approve it to hand it to an agent.`,
    ` */`,
    ...imports,
    ...(sibling.length ? [`import { ${sibling.join(", ")} } from "${modulePath}"`] : []),
    "",
    ...locals.flatMap((l) => [l, ""]),
    body,
    "",
    `/** Components this draft replaces in the canvas preview. */`,
    `export const parts = { ${name} }`,
    "",
  ].join("\n")
}

function draftTemplate(title: string): string {
  return [
    `/**`,
    ` * Draft for ${title}. There is no single source component to copy, so this starts empty.`,
    ` * Export a default component to show it next to the current version on the canvas.`,
    ` */`,
    `export default function Draft() {`,
    `  return <div className="ambient min-h-full p-5 text-ink">Draft for ${title.replace(/[<>{}]/g, "")}</div>`,
    `}`,
    "",
  ].join("\n")
}

/* ───────────────────────── auto-fix ───────────────────────── */

/** The Claude Code binary bundled with the Claude desktop app on macOS (newest version; the path changes on update). */
function desktopAppClaude(home: string): string[] {
  const base = path.join(home, "Library/Application Support/Claude/claude-code")
  try {
    return fs
      .readdirSync(base)
      .flatMap((v) => fs.readdirSync(path.join(base, v)).map((h) => path.join(base, v, h, "claude.app/Contents/MacOS/claude")))
      .filter((f) => fs.existsSync(f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  } catch {
    return []
  }
}

/** Claude Code CLI: $CANVAS_CLAUDE_BIN, then PATH, then the usual install locations, then the desktop app's copy. */
function findClaude(): string | null {
  const home = process.env.HOME ?? ""
  const candidates = [
    process.env.CANVAS_CLAUDE_BIN,
    ...(process.env.PATH ?? "").split(path.delimiter).map((d) => path.join(d, "claude")),
    path.join(home, ".claude/local/claude"),
    path.join(home, ".local/bin/claude"),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    ...desktopAppClaude(home),
  ]
  for (const c of candidates) {
    if (!c) continue
    try {
      fs.accessSync(c, fs.constants.X_OK)
      return c
    } catch {
      /* not here */
    }
  }
  return null
}

export type AutofixJob = { state: "running" | "done" | "error"; startedAt: string; endedAt?: string; summary?: string; error?: string }

/** A manual style edit made on the canvas (see src/project/manual.ts). */
export type ManualEdit = { selector: string; label: string; styles: Record<string, string> }

/** AI fix: findings + the reviewer's instruction + their manual edits → a rewritten draft. */
function autofixPrompt(p: LoadedProject, o: { entry: string; title: string; where?: string; findings: string[]; draft: string; hasDraft: boolean; instruction?: string; options?: boolean; manual: ManualEdit[]; attempt: number }) {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, "src/projects", p.id, "config.json"), "utf8")) as { css?: string; library?: string[]; rules?: string }
  const rel = (f: string) => path.join(p.abs, f)
  return [
    `You are fixing a UI component for the design system of the repo at ${p.abs}.`,
    `Component: ${o.title}${o.where ? ` (source: ${rel(o.where.split(":")[0])}, line ${o.where.split(":")[1]})` : ""}.`,
    "",
    ...(o.instruction ? ["What the reviewer wants (this comes first):", o.instruction, ""] : []),
    o.attempt > 1
      ? `Attempt ${o.attempt}: the canvas re-checked your previous draft and these problems are STILL failing. Fix them without undoing the rest:`
      : "Problems the canvas found:",
    ...o.findings.map((f) => `- ${f}`),
    ...(o.manual.length
      ? [
          "",
          "The reviewer already adjusted these elements by hand on the canvas. Keep their choices and write them into the code properly (token classes where a value is a token):",
          ...o.manual.map((m) => `- ${m.label}: ${Object.entries(m.styles).map(([k, v]) => `${k} ${v}`).join("; ")}`),
        ]
      : []),
    ...(o.options
      ? ["", "Show 2 or 3 clearly different options in the Draft default export, side by side, each labelled (Option A, B, C) with a one-line rationale. Export your recommended option under the component's original name."]
      : []),
    "",
    "Do not invent product behaviour or promises (response times, prices, policies). If the design needs copy you cannot know, keep it neutral and add a // ASSUMPTION: comment next to it.",
    "",
    "Read these first:",
    ...(cfg.library ?? []).map((f) => `- ${rel(f)}: the component library. Reuse its components instead of writing new buttons, inputs or cards.`),
    ...(cfg.css ? [`- ${rel(cfg.css)}: the theme tokens and utilities. Use token classes (bg-ink, text-ink-2, bg-sea, glass, rounded-2xl…), never hard-coded colours.`] : []),
    ...(cfg.rules ? [`- ${rel(cfg.rules)}: the product's design and accessibility rules.`] : []),
    `- Existing drafts in ${path.join(root, "src/projects", p.id, "drafts")} show the expected file shape.`,
    ...(o.hasDraft ? [`- ${o.draft}: the current draft. Improve it rather than starting over, unless the reviewer asks for a redesign.`] : []),
    "",
    `Write the fixed component to ${o.draft} and do not create or change any other file. Never edit the repo itself.`,
    "The draft file must:",
    `- start with a doc comment that lists, as short bullets, what you changed and why`,
    `- import repo modules as "@repo/${p.id}/<path without extension>" (for example "@repo/${p.id}/components/aspra/ui"), and npm packages normally`,
    `- export the fixed component under its original name, keeping its props so callers do not change`,
    `- export const parts = { <ComponentName> }`,
    `- export default function Draft() that renders the fixed component on <div className="ambient min-h-full p-5">, showing its main states (empty, filled, after submit, disabled if it has one) with realistic sample content`,
    "Fix accessibility (semantic buttons and labels, 12px minimum text, 44px touch targets, AA contrast, visible focus, alt text, state not by colour alone) and make it match the brand.",
    "When done, reply with one sentence summarising the fix.",
  ].join("\n")
}

/* ───────────────────────── fix history (undo / redo) ───────────────────────── */

/**
 * Each fix (autofix, AI fix) records a version of the draft, starting from "Original" (no draft).
 * Undo and redo move between versions by rewriting the draft, or removing it to show the original.
 * Kept in .canvas/history/<project>/<entry>.json (git-ignored).
 */
type History = { versions: Array<{ label: string; at: string; code: string | null }>; index: number }
const historyFile = (id: string, entry: string) => path.join(root, ".canvas/history", id, `${entry}.json`)
function readHistory(id: string, entry: string): History | null {
  try {
    return JSON.parse(fs.readFileSync(historyFile(id, entry), "utf8"))
  } catch {
    return null
  }
}
function writeHistory(id: string, entry: string, h: History) {
  fs.mkdirSync(path.dirname(historyFile(id, entry)), { recursive: true })
  fs.writeFileSync(historyFile(id, entry), JSON.stringify(h))
}
const draftNow = (id: string, entry: string) => (fs.existsSync(draftPath(id, entry)) ? fs.readFileSync(draftPath(id, entry), "utf8") : null)
/** Call before a fix writes the draft: starts the history with the state before it. */
function beforeFix(id: string, entry: string) {
  if (readHistory(id, entry)) return
  const code = draftNow(id, entry)
  writeHistory(id, entry, { versions: [{ label: code === null ? "Original" : "Before", at: new Date().toISOString(), code }], index: 0 })
}
/** Call after a fix wrote the draft: records it as the newest version (dropping anything you had undone). */
function afterFix(id: string, entry: string, label: string) {
  const h = readHistory(id, entry) ?? { versions: [{ label: "Original", at: new Date().toISOString(), code: null }], index: 0 }
  const code = draftNow(id, entry)
  if (h.versions[h.index]?.code === code) return
  h.versions = [...h.versions.slice(0, h.index + 1), { label, at: new Date().toISOString(), code }]
  h.index = h.versions.length - 1
  writeHistory(id, entry, h)
}
/** The history, or for a fix made before history existed: Original → that fix, so it can still be undone. */
function historyOf(id: string, entry: string): History | null {
  const h = readHistory(id, entry)
  if (h) return h
  const code = draftNow(id, entry)
  return code === null ? null : { versions: [{ label: "Original", at: "", code: null }, { label: "Current fix", at: new Date().toISOString(), code }], index: 1 }
}
function moveHistory(id: string, entry: string, to: number): History | null {
  const h = historyOf(id, entry)
  if (!h || to < 0 || to >= h.versions.length) return h
  h.index = to
  const code = h.versions[to].code
  if (code === null) fs.rmSync(draftPath(id, entry), { force: true })
  else {
    fs.mkdirSync(path.dirname(draftPath(id, entry)), { recursive: true })
    fs.writeFileSync(draftPath(id, entry), code)
  }
  writeHistory(id, entry, h)
  return h
}

/* ───────────────────────── manual edits ───────────────────────── */

/** Manual edits: style overrides per element, drafts/<entry>.manual.json, applied live in the fix frames. */
const manualPath = (id: string, entry: string) => path.join(root, "src/projects", id, "drafts", `${entry}.manual.json`)
function readManual(id: string, entry: string): ManualEdit[] {
  try {
    return JSON.parse(fs.readFileSync(manualPath(id, entry), "utf8"))
  } catch {
    return []
  }
}

/* ───────────────────────── applying to the repo ───────────────────────── */

/** Fixes applied to a repo branch: .canvas/applied/<project>.json (git-ignored), keyed by draft key. */
export type AppliedRecord = { entry: string; branch: string; sha: string; worktree: string; at: string; files: string[]; state: "running" | "done" | "error"; summary?: string; error?: string }
const appliedFile = (id: string) => path.join(root, ".canvas/applied", `${id}.json`)
function readApplied(id: string): Record<string, AppliedRecord> {
  try {
    return JSON.parse(fs.readFileSync(appliedFile(id), "utf8"))
  } catch {
    return {}
  }
}
function writeApplied(id: string, records: Record<string, AppliedRecord>) {
  fs.mkdirSync(path.dirname(appliedFile(id)), { recursive: true })
  fs.writeFileSync(appliedFile(id), JSON.stringify(records, null, 2))
}

/* ───────────────────────── watcher ───────────────────────── */

export type RepoStatus = {
  branch: string
  watch: string
  local: string
  remote: string | null
  dirty: boolean
  /** Remote main has commits the local clone could not fast-forward to (local changes or another branch). */
  behind: boolean
  lastCheck: string
  lastPull?: { from: string; to: string; at: string; subjects: string[] }
  error?: string
}

const git = async (cwd: string, ...args: string[]) => (await run("git", args, { cwd, timeout: 30_000 })).stdout.trim()

function readBody(req: import("node:http").IncomingMessage): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    let data = ""
    req.on("data", (c) => (data += c))
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch (e) {
        reject(e)
      }
    })
  })
}

export function canvasApi(projects: LoadedProject[]): Plugin {
  const status: Record<string, RepoStatus> = {}
  const scanning = new Set<string>()
  const jobs: Record<string, AutofixJob> = {}

  const scan = (id: string) => run(process.execPath, [path.join(root, "scripts/scan-project.mjs"), id], { cwd: root, timeout: 60_000 })
  const scannedCommit = (id: string) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(root, "src/projects", id, "scan.json"), "utf8")).commit as string
    } catch {
      return ""
    }
  }

  async function check(server: ViteDevServer, p: LoadedProject) {
    const watch = p.watch?.branch ?? "main"
    try {
      const branch = await git(p.abs, "rev-parse", "--abbrev-ref", "HEAD")
      await git(p.abs, "fetch", "--quiet", "origin", watch).catch((e) => {
        throw new Error(`fetch failed: ${String(e.message ?? e).split("\n")[0]}`)
      })
      const remote = await git(p.abs, "rev-parse", "--short", `origin/${watch}`)
      let local = await git(p.abs, "rev-parse", "--short", "HEAD")
      const dirty = (await git(p.abs, "status", "--porcelain", "--untracked-files=no")) !== ""
      let behind = false
      let pulled: RepoStatus["lastPull"]
      if (local !== remote) {
        const fastForward = await git(p.abs, "merge-base", "--is-ancestor", "HEAD", `origin/${watch}`).then(() => true, () => false)
        if (branch === watch && !dirty && fastForward) {
          const subjects = (await git(p.abs, "log", "--format=%s", `HEAD..origin/${watch}`)).split("\n").filter(Boolean)
          await git(p.abs, "merge", "--ff-only", "--quiet", `origin/${watch}`)
          pulled = { from: local, to: remote, at: new Date().toISOString(), subjects }
          local = remote
        } else behind = fastForward
      }
      status[p.id] = { branch, watch, local, remote, dirty, behind, lastCheck: new Date().toISOString(), lastPull: pulled ?? status[p.id]?.lastPull }
      if (pulled) server.ws.send({ type: "custom", event: "canvas:pulled", data: { project: p.id, ...pulled } })
      // Rescan whenever the checked-out code differs from the last scan (a pull here, or a pull by hand).
      const short = local.slice(0, 7)
      if (!scannedCommit(p.id).startsWith(short) && !scanning.has(p.id)) {
        scanning.add(p.id)
        server.ws.send({ type: "custom", event: "canvas:scanning", data: { project: p.id } })
        try {
          await scan(p.id)
        } finally {
          scanning.delete(p.id)
        }
      }
    } catch (e) {
      status[p.id] = { ...(status[p.id] ?? { branch: "?", watch, local: "?", remote: null, dirty: false, behind: false }), lastCheck: new Date().toISOString(), error: String((e as Error).message ?? e) }
    }
    server.ws.send({ type: "custom", event: "canvas:status", data: status })
  }

  return {
    name: "canvas-api",
    apply: "serve",
    configureServer(server) {
      // Tailwind only generates classes it has seen. When a draft appears or changes (autofix, AI fix,
      // you in an editor), reload the project's preview CSS so its new classes exist in the frames.
      server.watcher.on("all", (event, file) => {
        const m = file.match(/src[\\/]projects[\\/]([\w-]+)[\\/]drafts[\\/][^\\/]+\.tsx$/)
        if (!m || event === "unlinkDir" || event === "addDir") return
        const css = path.join(root, "src/projects", m[1], "preview.css")
        for (const mod of server.moduleGraph.getModulesByFile(css) ?? []) server.reloadModule(mod)
      })
      const checkAll = () => Promise.all(projects.map((p) => check(server, p)))
      const first = setTimeout(checkAll, 1500)
      const timers = projects.map((p) => setInterval(() => check(server, p), (p.watch?.intervalSec ?? 30) * 1000))
      server.httpServer?.on("close", () => {
        clearTimeout(first)
        timers.forEach(clearInterval)
      })

      server.middlewares.use("/__canvas", async (req, res) => {
        const send = (code: number, body: unknown) => {
          res.statusCode = code
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify(body))
        }
        try {
          const url = new URL(req.url ?? "/", "http://x")
          if (url.pathname === "/status") return send(200, status)
          if (url.pathname === "/autofix") {
            if (req.method === "GET") {
              const job = jobs[`${url.searchParams.get("project")}/${url.searchParams.get("entry")}`]
              return send(200, { cli: !!findClaude(), job: job ?? null })
            }
            const body = (await readBody(req)) as unknown as { project: string; entry: string; title?: string; where?: string; findings?: string[]; instruction?: string; options?: boolean; attempt?: number }
            const p = projects.find((x) => x.id === body.project)
            if (!p || !/^[\w-]+$/.test(body.entry ?? "")) return send(400, { error: "unknown project or entry" })
            const bin = findClaude()
            if (!bin) return send(501, { error: "claude-cli-missing" })
            const jobKey = `${p.id}/${body.entry}`
            if (jobs[jobKey]?.state === "running") return send(409, { error: "already running" })
            const draft = draftPath(p.id, body.entry)
            const manual = readManual(p.id, body.entry)
            const prompt = autofixPrompt(p, { entry: body.entry, title: body.title ?? body.entry, where: body.where, findings: body.findings ?? [], draft, hasDraft: fs.existsSync(draft), instruction: body.instruction, options: !!body.options, manual, attempt: body.attempt ?? 1 })
            fs.mkdirSync(path.dirname(draft), { recursive: true })
            beforeFix(p.id, body.entry)
            const existed = fs.existsSync(draft)
            const before = existed ? fs.statSync(draft).mtimeMs : 0
            jobs[jobKey] = { state: "running", startedAt: new Date().toISOString() }
            const notify = () => server.ws.send({ type: "custom", event: "canvas:autofix", data: { project: p.id, entry: body.entry, job: jobs[jobKey] } })
            notify()
            // Headless Claude Code: may read anything, may only edit this project's drafts, never runs commands.
            run(bin, ["-p", prompt, "--add-dir", p.abs, "--allowedTools", "Read", "Glob", "Grep", `Edit(src/projects/${p.id}/drafts/**)`, "--disallowedTools", "Bash"], { cwd: root, timeout: 600_000, maxBuffer: 10 * 1024 * 1024 })
              .then(({ stdout }) => {
                const wrote = fs.existsSync(draft) && fs.statSync(draft).mtimeMs > before
                const reply = stdout.trim()
                const endedAt = new Date().toISOString()
                // Improving an existing draft can rightly end with "nothing to change"; only a missing draft is a failure.
                // Claude wrote the manual edits into the code, so the canvas overlay is no longer needed.
                if (wrote && manual.length) fs.rmSync(manualPath(p.id, body.entry), { force: true })
                if (wrote) {
                  afterFix(p.id, body.entry, body.attempt && body.attempt > 1 ? `AI fix (attempt ${body.attempt})` : "AI fix")
                  server.ws.send({ type: "custom", event: "canvas:history", data: { project: p.id, entry: body.entry } })
                }
                const baked = manual.length ? ` (Your ${manual.length} manual edit${manual.length > 1 ? "s are" : " is"} now in the code.)` : ""
                jobs[jobKey] = wrote
                  ? { ...jobs[jobKey], state: "done", endedAt, summary: reply + baked }
                  : existed
                    ? { ...jobs[jobKey], state: "done", endedAt, summary: `No changes made. ${reply}` }
                    : { ...jobs[jobKey], state: "error", endedAt, error: reply.slice(0, 600) || "Claude finished without writing the draft." }
              })
              .catch((e) => (jobs[jobKey] = { ...jobs[jobKey], state: "error", endedAt: new Date().toISOString(), error: String(e.stderr || e.message).slice(-400) }))
              .finally(notify)
            return send(202, jobs[jobKey])
          }
          if (url.pathname === "/placements") {
            // Where approved components live on the canvas: src/projects/<id>/placements.json (kept in git,
            // so a placed component stays on its page whatever later scans say).
            const p = projects.find((x) => x.id === url.searchParams.get("project"))
            if (!p) return send(400, { error: "unknown project" })
            const file = path.join(root, "src/projects", p.id, "placements.json")
            if (req.method === "GET") return send(200, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [])
            if (req.method === "PUT") {
              const body = (await readBody(req)) as unknown as { placements: unknown[] }
              if (!Array.isArray(body.placements)) return send(400, { error: "placements required" })
              fs.writeFileSync(file, JSON.stringify(body.placements, null, 2) + "\n")
              server.ws.send({ type: "custom", event: "canvas:placements", data: { project: p.id } })
              return send(200, { ok: true })
            }
          }
          if (url.pathname === "/history") {
            const body = req.method === "GET" ? Object.fromEntries(url.searchParams) : await readBody(req)
            const p = projects.find((x) => x.id === body.project)
            if (!p || !/^[\w-]+$/.test(body.entry ?? "")) return send(400, { error: "unknown project or entry" })
            const view = (h: History | null) => (h ? { index: h.index, versions: h.versions.map((v) => ({ label: v.label, at: v.at, original: v.code === null })) } : { index: 0, versions: [] })
            if (req.method === "GET") return send(200, view(historyOf(p.id, body.entry)))
            const h = historyOf(p.id, body.entry)
            if (!h) return send(200, view(null))
            const to = body.action === "undo" ? h.index - 1 : body.action === "redo" ? h.index + 1 : Number(body.to)
            const next = moveHistory(p.id, body.entry, to)
            server.ws.send({ type: "custom", event: "canvas:history", data: { project: p.id, entry: body.entry } })
            return send(200, view(next))
          }
          if (url.pathname === "/draft-findings") {
            // Re-check a draft fix with the same off-brand rules the scanner used on the original.
            const p = projects.find((x) => x.id === url.searchParams.get("project"))
            const entry = url.searchParams.get("entry") ?? ""
            if (!p || !/^[\w-]+$/.test(entry)) return send(400, { error: "unknown project or entry" })
            const file = draftPath(p.id, entry)
            if (!fs.existsSync(file)) return send(404, { error: "no draft" })
            const { stdout } = await run(process.execPath, [path.join(root, "scripts/scan-project.mjs"), p.id, "--check", file], { cwd: root, timeout: 30_000 })
            return send(200, JSON.parse(stdout.trim().split("\n").pop() ?? "[]"))
          }
          if (url.pathname === "/manuals") {
            const dir = path.join(root, "src/projects", url.searchParams.get("project") ?? "", "drafts")
            return send(200, fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".manual.json")).map((f) => f.slice(0, -".manual.json".length)) : [])
          }
          if (url.pathname === "/manual") {
            const body = req.method === "GET" || req.method === "DELETE" ? Object.fromEntries(url.searchParams) : await readBody(req)
            const p = projects.find((x) => x.id === body.project)
            if (!p || !/^[\w-]+$/.test(body.entry ?? "")) return send(400, { error: "unknown project or entry" })
            if (req.method === "GET") return send(200, readManual(p.id, body.entry))
            if (req.method === "DELETE") {
              fs.rmSync(manualPath(p.id, body.entry), { force: true })
              return send(200, { ok: true })
            }
            if (req.method === "PUT") {
              const edits = (body as unknown as { edits: ManualEdit[] }).edits
              if (!Array.isArray(edits)) return send(400, { error: "edits required" })
              fs.mkdirSync(path.dirname(manualPath(p.id, body.entry)), { recursive: true })
              if (edits.length) fs.writeFileSync(manualPath(p.id, body.entry), JSON.stringify(edits, null, 2))
              else fs.rmSync(manualPath(p.id, body.entry), { force: true })
              return send(200, { ok: true })
            }
          }
          if (url.pathname === "/autofix-code" && req.method === "POST") {
            // Rule-based fixes on the draft (made from the source first if there is none). No AI.
            const body = await readBody(req)
            const p = projects.find((x) => x.id === body.project)
            if (!p || !/^[\w-]+$/.test(body.entry ?? "")) return send(400, { error: "unknown project or entry" })
            const cfgFile = JSON.parse(fs.readFileSync(path.join(root, "src/projects", p.id, "config.json"), "utf8")) as { autofix?: AutofixConfig }
            if (!cfgFile.autofix) return send(400, { error: "This project has no autofix settings in its config.json." })
            const file = draftPath(p.id, body.entry)
            const created = !fs.existsSync(file)
            // copy the source first: if it cannot be read, fail before recording anything in the history
            const copied = created ? (body.where && /:\d+$/.test(body.where) ? draftFromSource(p, body.where, body.title ?? body.entry) : null) : null
            if (created && !copied) return send(400, { error: "Autofix needs the component's source location." })
            beforeFix(p.id, body.entry)
            if (created && copied) {
              fs.mkdirSync(path.dirname(file), { recursive: true })
              fs.writeFileSync(file, copied)
            }
            const scanJson = JSON.parse(fs.readFileSync(path.join(root, "src/projects", p.id, "scan.json"), "utf8")) as { tokens: Array<{ name: string; value: string }> }
            const before = fs.readFileSync(file, "utf8")
            const first = autofixCode(before, scanJson.tokens, cfgFile.autofix)
            // then give each element the app's own styling for its role (card, heading, field, Button, Photo…)
            const second = cfgFile.autofix.recipes ? restyleByRole(first.code, cfgFile.autofix.recipes, p.id) : { code: first.code, changes: [] }
            const result = { code: second.code, changes: [...first.changes, ...second.changes] }
            if (result.code !== before) fs.writeFileSync(file, result.code)
            // nothing to fix by rule: do not leave a copy behind that would mark the component as fixed
            else if (created) fs.rmSync(file)
            afterFix(p.id, body.entry, "Autofix")
            server.ws.send({ type: "custom", event: "canvas:history", data: { project: p.id, entry: body.entry } })
            return send(200, { created: created && result.code !== before, changes: result.changes })
          }
          if (url.pathname === "/applied") {
            const p = projects.find((x) => x.id === url.searchParams.get("project"))
            if (!p) return send(400, { error: "unknown project" })
            const records = readApplied(p.id)
            if (req.method === "DELETE") {
              // Discard a canvas branch: only branches this canvas made (canvas/<entry>) in its own worktrees.
              const entry = url.searchParams.get("entry") ?? ""
              const r = records[entry]
              if (!r) return send(404, { error: "no branch for this entry" })
              await git(p.abs, "worktree", "remove", "--force", r.worktree).catch(() => {})
              await git(p.abs, "branch", "-D", r.branch).catch(() => {})
              delete records[entry]
              writeApplied(p.id, records)
              return send(200, { ok: true })
            }
            const watchRef = `origin/${p.watch?.branch ?? "main"}`
            const list = await Promise.all(
              Object.values(records).map(async (r) => ({
                ...r,
                merged: r.state === "done" && !!r.sha && (await git(p.abs, "merge-base", "--is-ancestor", r.sha, watchRef).then(() => true, () => false)),
              })),
            )
            return send(200, list)
          }
          if (url.pathname === "/apply" && req.method === "POST") {
            const body = (await readBody(req)) as unknown as { project: string; entry: string; title?: string; where?: string; note?: string }
            const p = projects.find((x) => x.id === body.project)
            if (!p || !/^[\w-]+$/.test(body.entry ?? "")) return send(400, { error: "unknown project or entry" })
            const draft = draftPath(p.id, body.entry)
            if (!fs.existsSync(draft)) return send(400, { error: "There is no draft to apply. Fix it on the canvas first." })
            const bin = findClaude()
            if (!bin) return send(501, { error: "claude-cli-missing" })
            const records = readApplied(p.id)
            if (records[body.entry]?.state === "running") return send(409, { error: "already applying" })
            const watch = p.watch?.branch ?? "main"
            const branch = `canvas/${body.entry}`
            const worktree = path.join(root, ".canvas/worktrees", `${p.id}-${body.entry}`)
            if (!fs.existsSync(worktree)) {
              fs.mkdirSync(path.dirname(worktree), { recursive: true })
              await git(p.abs, "fetch", "--quiet", "origin", watch)
              await git(p.abs, "worktree", "add", "--quiet", "-B", branch, worktree, `origin/${watch}`)
            }
            const at = new Date().toISOString()
            records[body.entry] = { entry: body.entry, branch, sha: records[body.entry]?.sha ?? "", worktree, at, files: [], state: "running" }
            writeApplied(p.id, records)
            const notify = () => server.ws.send({ type: "custom", event: "canvas:applied", data: { project: p.id, entry: body.entry } })
            notify()
            const cfg = JSON.parse(fs.readFileSync(path.join(root, "src/projects", p.id, "config.json"), "utf8")) as { library?: string[] }
            const prompt = [
              `Apply an approved design change to this repository (a working copy on branch ${branch}).`,
              `The approved version of "${body.title ?? body.entry}" is in ${draft}. It was drafted in a separate canvas app: it imports this repo as "@repo/${p.id}/<path>", which here is just the repo path ("@/<path>" or a relative import).`,
              body.where ? `The component lives at ${body.where.split(":")[0]} (line ${body.where.split(":")[1]}). Make it match the approved version.` : `It is a new library component: add it to ${cfg.library?.[0] ?? "the component library"}.`,
              "Then update every place it is used so callers keep working with the new props and behaviour. Ignore the draft's default export: it is only a preview for the canvas.",
              ...(body.note ? [`Note from the reviewer: ${body.note}`] : []),
              "Change only what this requires. Follow the repo's code style. Do not add dependencies. Do not touch files unrelated to this component.",
              "When done, reply with one sentence listing what you changed.",
            ].join("\n")
            run(bin, ["-p", prompt, "--add-dir", path.dirname(draft), "--allowedTools", "Read", "Glob", "Grep", "Edit(**)", "--disallowedTools", "Bash"], { cwd: worktree, timeout: 900_000, maxBuffer: 10 * 1024 * 1024 })
              .then(async ({ stdout }) => {
                await git(worktree, "add", "-A")
                const staged = await git(worktree, "diff", "--cached", "--name-only")
                if (!staged) throw new Error(`Claude made no changes in the repo. ${stdout.trim().slice(0, 300)}`)
                await git(worktree, "commit", "--quiet", "-m", `Apply canvas fix: ${body.title ?? body.entry}`, "-m", `Approved on the motioncn project canvas.${body.note ? `\n\n${body.note}` : ""}`)
                const sha = await git(worktree, "rev-parse", "--short", "HEAD")
                const recs = readApplied(p.id)
                recs[body.entry] = { ...recs[body.entry], sha, files: staged.split("\n"), state: "done", summary: stdout.trim().split("\n").pop() }
                writeApplied(p.id, recs)
              })
              .catch((e) => {
                const recs = readApplied(p.id)
                recs[body.entry] = { ...recs[body.entry], state: "error", error: String(e.stderr || e.message).slice(0, 600) }
                writeApplied(p.id, recs)
              })
              .finally(notify)
            return send(202, records[body.entry])
          }
          if (url.pathname === "/drafts") {
            const dir = path.join(root, "src/projects", url.searchParams.get("project") ?? "", "drafts")
            return send(200, fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".tsx")).map((f) => f.slice(0, -4)) : [])
          }
          if (url.pathname === "/check" && req.method === "POST") {
            await checkAll()
            return send(200, status)
          }
          if (url.pathname === "/draft") {
            const body = req.method === "GET" || req.method === "DELETE" ? Object.fromEntries(url.searchParams) : await readBody(req)
            const p = projects.find((x) => x.id === body.project)
            if (!p || !/^[\w-]+$/.test(body.entry ?? "")) return send(400, { error: "unknown project or entry" })
            const file = draftPath(p.id, body.entry)
            const rel = path.relative(root, file)
            if (req.method === "GET") return fs.existsSync(file) ? send(200, { file: rel, abs: file, code: fs.readFileSync(file, "utf8") }) : send(404, { error: "no draft" })
            if (req.method === "DELETE") {
              if (fs.existsSync(file)) fs.rmSync(file)
              return send(200, { ok: true })
            }
            if (req.method === "POST") {
              if (!fs.existsSync(file)) {
                fs.mkdirSync(path.dirname(file), { recursive: true })
                const code = body.where && /:\d+$/.test(body.where) ? draftFromSource(p, body.where, body.title ?? body.entry) : draftTemplate(body.title ?? body.entry)
                fs.writeFileSync(file, code)
              }
              return send(200, { file: rel, abs: file, code: fs.readFileSync(file, "utf8") })
            }
            if (req.method === "PUT") {
              if (typeof body.code !== "string") return send(400, { error: "code required" })
              fs.mkdirSync(path.dirname(file), { recursive: true })
              fs.writeFileSync(file, body.code)
              return send(200, { ok: true })
            }
          }
          send(404, { error: "not found" })
        } catch (e) {
          send(500, { error: String((e as Error).message ?? e) })
        }
      })
    },
  }
}
