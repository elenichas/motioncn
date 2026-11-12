/**
 * Lightweight WCAG 2.2 checks run on live DOM elements.
 * - 1.4.3 / 1.4.6  text contrast (AA 4.5:1, AAA 7:1; large text 3:1 / 4.5:1)
 * - 1.4.11         non-text contrast for icons (3:1)
 * - 2.5.8 / 2.5.5  target size (AA 24×24, AAA 44×44 CSS px)
 * - 4.1.2          interactive elements have an accessible name
 * - 2.1.1          interactive elements are keyboard focusable
 * Plus a readability hint for text under 12px.
 * Disabled / inactive controls are exempt from contrast, as WCAG allows.
 */

export type RGBA = [number, number, number, number]
export type Level = "pass" | "warn" | "fail" | "info"
export type Check = { id: string; label: string; value: string; level: Level; note?: string }
export type Report = {
  tag: string
  role: string
  name: string
  checks: Check[]
  fg?: RGBA
  bg?: RGBA
  ratio?: number
}

/* ---------- colour ---------- */

let ctx: CanvasRenderingContext2D | null = null
const cache = new Map<string, RGBA>()

/** Any CSS colour (oklch, color-mix, rgb…) → sRGB via a 1px canvas. */
export function toRGBA(css: string): RGBA {
  const hit = cache.get(css)
  if (hit) return hit
  if (!ctx) {
    const c = document.createElement("canvas")
    c.width = c.height = 1
    ctx = c.getContext("2d", { willReadFrequently: true })!
  }
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = "#000"
  ctx.fillStyle = css
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  const out: RGBA = [r, g, b, a / 255]
  cache.set(css, out)
  return out
}

const over = (top: RGBA, bottom: RGBA): RGBA => {
  const a = top[3] + bottom[3] * (1 - top[3])
  if (a === 0) return [0, 0, 0, 0]
  const mix = (i: number) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a
  return [mix(0), mix(1), mix(2), a]
}

const lum = ([r, g, b]: RGBA) => {
  const f = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
export const contrast = (a: RGBA, b: RGBA) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}
export const hex = ([r, g, b]: RGBA) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")

/** Effective background behind an element: composite ancestor backgrounds until opaque. */
function effectiveBackground(el: Element): { bg: RGBA; uncertain: boolean } {
  const layers: RGBA[] = []
  let uncertain = false
  for (let n: Element | null = el; n; n = n.parentElement) {
    const cs = getComputedStyle(n)
    if (cs.backgroundImage && cs.backgroundImage !== "none") uncertain = true
    const c = toRGBA(cs.backgroundColor)
    if (c[3] > 0) layers.push(c)
    if (c[3] >= 1) break
  }
  let bg: RGBA = [255, 255, 255, 1]
  for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg)
  return { bg, uncertain }
}

/** Multiply opacity of the element and its ancestors (within the frame). */
function effectiveOpacity(el: Element) {
  let o = 1
  for (let n: Element | null = el; n && !n.hasAttribute("data-frame-body"); n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
  return o
}

/* ---------- semantics ---------- */

const INTERACTIVE = 'button, a[href], input, select, textarea, [role="button"], [role="slider"], [role="radio"], [role="switch"], [role="checkbox"], [role="tab"], [role="link"], [tabindex]:not([tabindex="-1"]):not([role="tablist"]):not([role="radiogroup"])'

export const interactiveOf = (el: Element) => el.closest(INTERACTIVE) as HTMLElement | null

function isDisabled(el: Element) {
  return !!el.closest(':disabled, [aria-disabled="true"], [data-disabled]')
}

function roleOf(el: Element) {
  const r = el.getAttribute("role")
  if (r) return r
  const t = el.tagName.toLowerCase()
  if (t === "button") return "button"
  if (t === "a") return "link"
  if (t === "input") return (el as HTMLInputElement).type === "range" ? "slider" : "textbox"
  if (/^h[1-6]$/.test(t)) return "heading"
  if (t === "svg") return "graphic"
  return t === "span" || t === "div" || t === "p" ? "text" : t
}

function accessibleName(el: HTMLElement): string {
  const label = el.getAttribute("aria-label")
  if (label) return label.trim()
  const by = el.getAttribute("aria-labelledby")
  if (by) return by.split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim()
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    const lbl = el.labels?.[0]?.textContent
    if (lbl) return lbl.trim()
    if ("placeholder" in el && el.placeholder) return el.placeholder
  }
  const text = (el.innerText ?? el.textContent ?? "").replace(/\s+/g, " ").trim()
  if (text) return text
  return el.getAttribute("title")?.trim() ?? ""
}

const hasOwnText = (el: Element) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim().length > 0)

/** The element whose text colour we should test for a hovered node. */
export function textHost(el: Element): Element | null {
  if (hasOwnText(el)) return el
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent!.trim() ? 1 : 2) })
  const t = walker.nextNode()
  return t?.parentElement ?? null
}

/** WCAG 2.5.8 spacing exception: a 24px circle on the target's centre touches no other target. */
function hasSpacing(el: HTMLElement) {
  const frame = el.closest("[data-frame-body]")
  if (!frame) return false
  const zoom = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1
  const r = el.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const radius = 12 * zoom
  return [...frame.querySelectorAll<HTMLElement>(INTERACTIVE)].every((o) => {
    if (o === el || o.contains(el) || el.contains(o)) return true
    const b = o.getBoundingClientRect()
    if (!b.width || !b.height) return true
    const dx = Math.max(b.left - cx, 0, cx - b.right)
    const dy = Math.max(b.top - cy, 0, cy - b.bottom)
    return Math.hypot(dx, dy) >= radius
  })
}

/** Elements faded out (e.g. a stamp at opacity 0 waiting to appear) aren't visible content. */
export const isInvisible = (el: Element) => effectiveOpacity(el) < 0.15

/* ---------- the report ---------- */

export function inspect(target: Element): Report {
  const interactive = interactiveOf(target)
  const subject = (interactive ?? target) as HTMLElement
  const disabled = isDisabled(subject)
  const checks: Check[] = []
  const report: Report = { tag: subject.tagName.toLowerCase(), role: roleOf(subject), name: "", checks }

  // --- text contrast + font
  const host = textHost(target) ?? (interactive ? textHost(interactive) : null)
  if (host) {
    const cs = getComputedStyle(host)
    const size = parseFloat(cs.fontSize)
    const weight = Number(cs.fontWeight) || 400
    const large = size >= 24 || (size >= 18.66 && weight >= 700)
    const { bg, uncertain } = effectiveBackground(host)
    const fgRaw = toRGBA(cs.color)
    const fg: RGBA = [fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * effectiveOpacity(host)]
    const fgOn = over(fg, bg)
    const ratio = contrast(fgOn, bg)
    const aa = large ? 3 : 4.5
    const aaa = large ? 4.5 : 7
    Object.assign(report, { fg: fgOn, bg, ratio })
    checks.push({
      id: "contrast",
      label: "Text contrast",
      value: `${ratio.toFixed(2)}:1`,
      level: disabled ? "info" : ratio >= aaa ? "pass" : ratio >= aa ? "pass" : "fail",
      note: disabled
        ? "Disabled control: exempt from contrast (WCAG 1.4.3)"
        : `${ratio >= aa ? "AA ✓" : "AA ✗"} ${ratio >= aaa ? "AAA ✓" : "AAA ✗"} · needs ${aa}:1 for ${large ? "large" : "normal"} text${uncertain ? " · gradient/image behind: verify by eye" : ""}`,
    })
    checks.push({
      id: "font",
      label: "Font",
      value: `${Math.round(size * 10) / 10}px · ${weight}`,
      level: size < 12 ? "warn" : "pass",
      note: size < 12 ? "Under 12px is hard to read; avoid for body text" : large ? "Counts as large text" : "Normal text",
    })
  } else {
    // icon / graphic: non-text contrast against its background
    const g = target.closest("svg") ?? target
    const cs = getComputedStyle(g)
    const { bg } = effectiveBackground(g)
    const col = toRGBA(cs.color)
    if (col[3] === 0 && interactive?.matches("input")) {
      checks.push({ id: "nontext", label: "Visual", value: "custom", level: "info", note: "Input is visually hidden; its slots render the value (checked separately)" })
    } else {
    const fgOn = over([col[0], col[1], col[2], col[3] * effectiveOpacity(g)], bg)
    const ratio = contrast(fgOn, bg)
    Object.assign(report, { fg: fgOn, bg, ratio })
    checks.push({
      id: "nontext",
      label: "Graphic contrast",
      value: `${ratio.toFixed(2)}:1`,
      level: disabled ? "info" : ratio >= 3 ? "pass" : interactive ? "fail" : "warn",
      note: disabled ? "Disabled: exempt" : `Icons and control boundaries need 3:1 (WCAG 1.4.11)${interactive ? "" : " · decorative graphics are exempt"}`,
    })
    }
  }

  // --- interactive checks
  if (interactive) {
    const name = accessibleName(interactive)
    report.name = name
    checks.push({
      id: "name",
      label: "Accessible name",
      value: name ? `“${name.length > 28 ? name.slice(0, 28) + "…" : name}”` : "missing",
      level: name ? "pass" : "fail",
      note: name ? "Screen readers announce this (WCAG 4.1.2)" : "Add aria-label or visible text (WCAG 4.1.2)",
    })
    const w = interactive.offsetWidth
    const h = interactive.offsetHeight
    const min = Math.min(w, h)
    const spaced = min < 24 && hasSpacing(interactive)
    checks.push({
      id: "target",
      label: "Target size",
      value: `${w}×${h}px`,
      level: min >= 24 || spaced ? "pass" : "fail",
      note:
        min >= 24
          ? `AA ✓ (24px) ${min >= 44 ? "AAA ✓" : "AAA ✗"} (44px) · WCAG 2.5.8`
          : spaced
            ? "Under 24px but passes AA via the spacing exception (no other target within a 24px circle)"
            : "AA ✗: under 24px and too close to another target (WCAG 2.5.8)",
    })
    const focusable = interactive.tabIndex >= 0 || interactive.matches("input, button, a[href], select, textarea")
    checks.push({
      id: "keyboard",
      label: "Keyboard",
      value: disabled ? "disabled" : focusable ? "focusable" : "not focusable",
      level: disabled ? "info" : focusable ? "pass" : "fail",
      note: disabled ? "Removed from tab order while disabled" : focusable ? "Reachable with Tab (WCAG 2.1.1)" : "Can't be reached with a keyboard (WCAG 2.1.1)",
    })
  } else {
    report.name = (textHost(target)?.textContent ?? "").trim().slice(0, 40)
  }

  return report
}

/** Quick scan of a whole frame: counts failing checks. */
export type Finding = { what: string; check: string; value: string; level: Level }
export function scan(root: Element): { issues: number; warnings: number; checked: number; findings: Finding[] } {
  let issues = 0
  let warnings = 0
  let checked = 0
  const findings: Finding[] = []
  const seen = new Set<Element>()
  const candidates: Element[] = []
  root.querySelectorAll("*").forEach((el) => {
    if (hasOwnText(el) || el.matches(INTERACTIVE)) candidates.push(el)
  })
  for (const el of candidates) {
    const key = interactiveOf(el) ?? el
    if (seen.has(key)) continue
    seen.add(key)
    const rect = (el as HTMLElement).getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0 || getComputedStyle(el).visibility === "hidden" || isInvisible(el)) continue
    // skip content covered by something on top (e.g. cards lower in a stack)
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    if (top && !el.contains(top) && !top.contains(el) && !(interactiveOf(top) && interactiveOf(top) === interactiveOf(el))) continue
    checked++
    const rep = inspect(el)
    for (const c of rep.checks) {
      if (c.level === "fail") issues++
      else if (c.level === "warn") warnings++
      if (c.level === "fail" || c.level === "warn") findings.push({ what: `${rep.role}${rep.name ? ` “${rep.name.slice(0, 24)}”` : ""}`, check: c.label, value: c.value, level: c.level })
    }
  }
  return { issues, warnings, checked, findings }
}
