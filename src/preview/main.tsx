/**
 * Runs inside each preview frame on a project canvas: renders one preview at a real viewport width,
 * applies theme overrides, and reports its height and accessibility scan to the canvas.
 */
import { Component, StrictMode, type ComponentType, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { draftKey, projects, type PreviewModule } from "@/projects"
import { loadDraft } from "@/projects/drafts"
import { hex, inspect, scan } from "@/lib/a11y"
import { manualApi, manualCss, type ManualEdit } from "@/project/manual"
import type { FromPreview, LayoutMetrics, ToPreview } from "@/project/types"
import { ownership, rootOf, rootsOf, setKnown, trail } from "./owners"
import { drive } from "./drive"
import { overrides } from "./swap"
import { ButtonGroupSpecimen } from "./button-groups"
import { isGroup } from "@/project/consolidate"

const params = new URLSearchParams(location.search)
const project = projects[params.get("p") ?? ""]
const id = params.get("id") ?? ""
const post = (m: FromPreview) => parent !== window && parent.postMessage({ ...m, __preview: true }, location.origin)

// Each frame gets its own storage, so frames never read each other's saved sessions
// and nothing is written to the canvas's real localStorage.
const mem = new Map<string, string>()
const memory: Storage = {
  get length() {
    return mem.size
  },
  clear: () => mem.clear(),
  getItem: (k) => mem.get(k) ?? null,
  key: (i) => [...mem.keys()][i] ?? null,
  removeItem: (k) => void mem.delete(k),
  setItem: (k, v) => void mem.set(k, String(v)),
}
Object.defineProperty(window, "localStorage", { value: memory, configurable: true })

let applied: string[] = []
function applyTheme(vars: Record<string, string>) {
  const root = document.documentElement
  for (const k of applied) root.style.removeProperty(`--${k}`)
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(`--${k}`, v)
  applied = Object.keys(vars)
  audit(400)
}

/**
 * Responsive check: at this frame's width, does anything scroll sideways or stick out past the screen?
 * (Things inside their own scrolling area, like a carousel, are fine.)
 */
function fitsTheScreen() {
  const vw = document.documentElement.clientWidth
  const out: Array<{ what: string; check: string; value: string; level: "fail" }> = []
  const scrolls = (el: Element | null) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) if (/(auto|scroll|hidden)/.test(getComputedStyle(n).overflowX)) return true
    return false
  }
  const seen = new Set<Element>()
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.right <= vw + 1 || scrolls(el.parentElement)) continue
    if ([...seen].some((s) => s.contains(el))) continue
    seen.add(el)
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 24)
    out.push({ check: "Fits the screen", value: `${Math.round(r.right - vw)}px too wide`, what: `${el.tagName.toLowerCase()}${text ? ` “${text}”` : ""}`, level: "fail" })
    if (out.length >= 3) break
  }
  return out
}

/**
 * Layout measurements at this frame's width, for comparing widths on the canvas: how wide the content is
* (the span of all visible text), how big the type is, how long lines get, and stretched images.
 */
function measureLayout(): LayoutMetrics {
  const vw = document.documentElement.clientWidth
  let left = Infinity
  let right = -Infinity
  const fonts: number[] = []
  let maxLine = 0
  let maxLineText = ""
  for (const el of document.body.querySelectorAll("*")) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent!.trim()).map((n) => n.textContent!.trim()).join(" ")
    if (!own) continue
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    if (r.width < 2 || r.height < 2 || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue
    // only text you can see: on screen, and not covered by something on top of it (a full-screen layer, a sheet)
    if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= vw) continue
    const hit = document.elementFromPoint(Math.min(vw - 1, Math.max(0, r.left + Math.min(r.width, 40) / 2)), Math.min(innerHeight - 1, r.top + r.height / 2))
    if (hit && hit !== el && !el.contains(hit) && !hit.contains(el)) continue
    // where the text actually is, not the element's box: a full-width paragraph with a short line is short
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.textContent!.trim()) continue
      const range = document.createRange()
      range.selectNodeContents(n)
      const t = range.getBoundingClientRect()
      if (t.width < 1) continue
      left = Math.min(left, Math.max(0, t.left))
      right = Math.max(right, Math.min(t.right, vw))
    }
    const size = parseFloat(cs.fontSize)
    fonts.push(size)
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim()
    const lh = parseFloat(cs.lineHeight) || size * 1.4
    const lines = Math.max(1, Math.round(r.height / lh))
    if (text.length > 60) {
      const perLine = Math.round(text.length / lines)
      if (perLine > maxLine) (maxLine = perLine), (maxLineText = text.slice(0, 32))
    }
  }
  const stretched = [...document.images]
    .filter((img) => img.naturalWidth > 0 && img.getBoundingClientRect().width > img.naturalWidth * 1.3)
    .map((img) => ({ alt: img.alt || img.src.split("/").pop() || "image", ratio: Math.round((img.getBoundingClientRect().width / img.naturalWidth) * 10) / 10 }))
  fonts.sort((a, b) => a - b)
  return {
    vw,
    content: Number.isFinite(left) ? { left: Math.round(left), width: Math.round(right - left) } : { left: 0, width: 0 },
    heading: fonts.length ? fonts[fonts.length - 1] : 0,
    body: fonts.length ? fonts[Math.floor(fonts.length / 2)] : 0,
    maxLine,
    maxLineText,
    stretched,
  }
}

const focusName = params.get("focus")
let auditTimer: ReturnType<typeof setTimeout> | undefined
function audit(delay: number) {
  clearTimeout(auditTimer)
  auditTimer = setTimeout(() => {
    // A component shown in place is checked on its own: the rest of the screen belongs to other entries.
    const roots = focusName ? rootsOf(focusName) : []
    if (focusName && !roots.length) return
    const parts = roots.length ? roots.map((el) => scan(el, ownership)) : [scan(document.body, ownership)]
    const r = { issues: parts.reduce((n, p) => n + p.issues, 0), warnings: parts.reduce((n, p) => n + p.warnings, 0), findings: parts.flatMap((p) => p.findings) }
    const layout = focusName ? [] : fitsTheScreen()
    post({ type: "a11y", issues: r.issues + layout.length, warnings: r.warnings, findings: [...r.findings, ...layout] })
    post({ type: "layout", metrics: measureLayout() })
  }, delay)
}

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    post({ type: "error", message: error.message })
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ padding: 16, font: "13px ui-monospace, monospace", color: "#b42318", background: "#fef3f2", minHeight: "100%" }}>
        <strong>Could not render this preview</strong>
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{this.state.error.message}</pre>
      </div>
    )
  }
}

/* ─── manual fix: your style edits, and picking elements to edit ─── */

const isFix = params.get("draft") === "1"
/** The draft this frame is fixing. A component shown in place names its own: the frame's id is the screen's. */
const fixKey = params.get("key") ?? draftKey(id)
/** Draft fixes swapped into the app in this frame: the one being fixed, and those approved on the canvas. */
const fixKeys = [...new Set([...(params.get("fixes") ?? "").split(",").filter(Boolean), ...(isFix ? [fixKey] : [])])]
const manualStyle = document.createElement("style")
const inspectStyle = document.createElement("style")
inspectStyle.textContent =
  "[data-canvas-hover]{outline:2px dashed #d946ef !important;outline-offset:2px;cursor:crosshair !important}" +
  "[data-canvas-picked]{outline:2px solid #d946ef !important;outline-offset:2px}" +
  "[data-canvas-focus]{outline:3px solid #0d99ff !important;outline-offset:3px;border-radius:4px}" +
  "[data-canvas-locate]{outline:2px solid #0d99ff !important;outline-offset:2px;cursor:pointer !important}" +
  "#canvas-locate-tag{position:fixed;z-index:2147483647;pointer-events:none;background:#0d99ff;color:#fff;font:600 11px/1 ui-sans-serif,system-ui,sans-serif;padding:4px 6px;border-radius:4px;white-space:nowrap}"
document.head.append(manualStyle, inspectStyle)

function applyManual(edits: ManualEdit[]) {
  manualStyle.textContent = manualCss(edits)
  audit(400)
  requestAnimationFrame(reportPicked)
}
if (isFix && project) manualApi.get(project.manifest.id, fixKey).then(applyManual)

/** A selector from the preview root, by position: stable while the component's structure stays the same. */
function selectorOf(el: Element): string {
  const parts: string[] = []
  for (let n: Element | null = el; n && n.id !== "root"; n = n.parentElement) {
    const i = n.parentElement ? [...n.parentElement.children].indexOf(n) + 1 : 1
    parts.unshift(`${n.tagName.toLowerCase()}:nth-child(${i})`)
  }
  return ["#root", ...parts].join(" > ")
}
function labelOf(el: Element) {
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim()
  return `<${el.tagName.toLowerCase()}>${text ? ` “${text.length > 36 ? text.slice(0, 35) + "…" : text}”` : ""}`
}

let inspecting = false
let hovered: Element | null = null
let picked: Element | null = null
function reportPicked() {
  if (!picked || !picked.isConnected) return
  const cs = getComputedStyle(picked)
  const report = inspect(picked)
  const props = ["color", "background-color", "opacity", "border-top-width", "border-top-color", "border-radius", "font-size", "translate", "scale", "rotate"]
  post({
    type: "picked",
    selector: selectorOf(picked),
    label: labelOf(picked),
    computed: Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)])),
    contrast:
      report.ratio && report.fg && report.bg
        ? { ratio: report.ratio, fg: hex(report.fg), bg: hex(report.bg), large: parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && Number(cs.fontWeight) >= 700) }
        : undefined,
  })
}
document.addEventListener("mouseover", (e) => {
  if (!inspecting) return
  hovered?.removeAttribute("data-canvas-hover")
  hovered = e.target as Element
  hovered.setAttribute("data-canvas-hover", "")
})
document.addEventListener(
  "click",
  (e) => {
    if (!inspecting) return
    e.preventDefault()
    e.stopPropagation()
    picked?.removeAttribute("data-canvas-picked")
    picked = e.target as Element
    picked.setAttribute("data-canvas-picked", "")
    reportPicked()
  },
  true,
)
function setInspect(on: boolean) {
  inspecting = on
  if (!on) {
    hovered?.removeAttribute("data-canvas-hover")
    picked?.removeAttribute("data-canvas-picked")
    hovered = picked = null
  }
}

/* ─── locate: in a flow screen, pointing at something shows which component it is ─── */

let locating = false
let located: Element | null = null
const tag = document.createElement("div")
tag.id = "canvas-locate-tag"
function showLocated(el: Element | null) {
  located?.removeAttribute("data-canvas-locate")
  located = el
  if (!el) return void tag.remove()
  const chain = trail(el)
  const root = rootOf(el)
  located = root
  root.setAttribute("data-canvas-locate", "")
  const r = root.getBoundingClientRect()
  tag.textContent = chain[0] ? (chain[0].library ? chain[0].name : `${chain[0].name} · own markup`) : "Not a repo component"
  tag.style.left = `${Math.max(2, Math.min(r.left, innerWidth - 160))}px`
  tag.style.top = `${r.top > 24 ? r.top - 22 : r.bottom + 4}px`
  document.body.append(tag)
}
document.addEventListener("mouseover", (e) => locating && showLocated(e.target as Element))
document.addEventListener("mouseleave", () => locating && showLocated(null))
for (const type of ["click", "dblclick"] as const)
  document.addEventListener(
    type,
    (e) => {
      if (!locating) return
      e.preventDefault()
      e.stopPropagation()
      const el = e.target as Element
      post({ type: "located", chain: trail(el), label: labelOf(el), open: type === "dblclick" })
    },
    true,
  )
// In locate mode the app is a picture of itself: nothing in it reacts to the pointer.
for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "submit"] as const)
  document.addEventListener(type, (e) => locating && (e.stopPropagation(), type === "submit" && e.preventDefault()), true)

window.addEventListener("message", (e: MessageEvent<ToPreview>) => {
  if (e.origin !== location.origin || e.source !== parent) return
  if (e.data?.type === "theme") applyTheme(e.data.vars)
  else if (e.data?.type === "manual" && isFix) applyManual(e.data.edits)
  else if (e.data?.type === "inspect") setInspect(e.data.on)
  else if (e.data?.type === "locate") {
    locating = e.data.on
    if (!locating) showLocated(null)
  }
  else if (e.data?.type === "pick") {
    // the panel picked an element by selector (e.g. from the list of edited elements)
    const el = document.querySelector(e.data.selector)
    if (!el) return
    picked?.removeAttribute("data-canvas-picked")
    picked = el
    if (inspecting) el.setAttribute("data-canvas-picked", "")
    reportPicked()
  }
})

/**
 * What to render:
 * - "auto~<file>~<export>": any component in the repo, with no props (new code the manifest does not cover)
 * - draft=1: the entry's specimen with the draft's fixed parts swapped in, or the draft's own preview
 * - otherwise the entry's specimen as the repo has it today
 */
async function content(mod: PreviewModule): Promise<ReactNode> {
  const auto = id.startsWith("auto~") ? id.split("~") : null
  // A fix frame with no draft code (manual edits only) shows the original; the edits are layered on as CSS.
  // In a driven frame (a flow screen, a component in place) the app itself is shown: the fix is swapped into it.
  const draft = isFix && !params.has("drive") ? await loadDraft(project.manifest.id, fixKey) : undefined
  if (draft) {
    const Own = draft.default
    // A draft of a new component with no preview of its own: render its fixed export with no props.
    const Fixed = auto ? (draft.parts?.[auto[2]] as ComponentType | undefined) : undefined
    return (
      <mod.Parts.Provider value={{ ...mod.parts, ...draft.parts }}>
        {Own ? <Own /> : Fixed ? <mod.AutoFrame><Fixed /></mod.AutoFrame> : mod.previews[id]?.()}
      </mod.Parts.Provider>
    )
  }
  if (auto) {
    const [, file, name] = auto
    const load = Object.entries(mod.modules).find(([k]) => k.endsWith("/" + file))?.[1]
    if (!load) return <p style={{ padding: 16 }}>Cannot load {file}.</p>
    const C = (await load())[name] as ComponentType | undefined
    if (!C) return <p style={{ padding: 16 }}>{file} has no export named {name}.</p>
    return (
      <mod.AutoFrame>
        <C />
      </mod.AutoFrame>
    )
  }
  if (isGroup(id)) return <ButtonGroupSpecimen project={project} id={id} parts={mod.parts} />
  const render = mod.previews[id]
  return render ? render() : <p style={{ padding: 16 }}>No preview named “{id}”.</p>
}

async function main() {
  const el = document.getElementById("root")!
  // Device-sized frames (screens, sheets): let the preview fill the viewport like a real page.
  if (params.get("fixed") === "1") for (const n of [document.documentElement, document.body, el]) n.style.height = "100%"
  const root = createRoot(el)
  if (!project) return root.render(<p>Unknown project</p>)
  const theme = project.manifest.themes.find((t) => t.id === params.get("theme"))
  if (theme) applyTheme(theme.vars)
  const mod = await project.previews()
  setKnown(project.scan.components)
  for (const key of fixKeys) Object.assign(overrides, (await loadDraft(project.manifest.id, key))?.parts)
  root.render(
    <StrictMode>
      <Boundary>{await content(mod)}</Boundary>
    </StrictMode>,
  )
  // Height for specimens that size to content; screens use a fixed device height instead.
  const ro = new ResizeObserver(() => post({ type: "size", h: Math.ceil(document.documentElement.scrollHeight) }))
  ro.observe(document.body)
  // A flow screen: press the controls that lead to it, then check what is on screen.
  const steps: string[] = JSON.parse(params.get("drive") ?? "[]")
  if (params.has("drive")) {
    const result = await drive(steps)
    post({ type: "driven", ...result })
    if (focusName) {
      const roots = result.ok ? rootsOf(focusName) : []
      for (const el of roots) el.setAttribute("data-canvas-focus", "")
      roots[0]?.scrollIntoView({ block: "center" })
      post({ type: "focus", found: roots.length > 0 })
      if (!roots.length) return
    }
    audit(200)
    setTimeout(() => audit(0), 2500)
    return
  }
  // Screens open after the app's 1.9s splash, so scan again once they have settled.
  audit(900)
  setTimeout(() => audit(0), 3200)
  // and once more when slower screens (splash, entrance animations) have surely settled
  setTimeout(() => audit(0), 6000)
}
main()

// A new or edited draft reloads only this frame. Without this, Vite reloads every open page, the canvas included.
if (import.meta.hot) {
  import.meta.hot.accept(["@/projects/drafts"], () => location.reload())
  import.meta.hot.accept(() => location.reload())
}
