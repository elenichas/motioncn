/**
 * Autofix: standard, rule-based code fixes for a component draft. No AI: every change follows a rule,
 * so the same input always gives the same output, and each change is reported.
 *
 * It walks the JSX opening and closing tags with a small scanner (not a full parser), keeping a stack so it
 * knows each element's ancestors: the background a text sits on, and which closing tag belongs to a renamed element.
 */

export type AutofixConfig = {
  /** Token names allowed per role. Values come from the scan. */
  text: string[]
  surface: string[]
  border: string[]
  /** Type scale steps in px; text snaps to the nearest step, never below minText. */
  typeScale: number[]
  minText: number
  /** Corner radius steps in px. */
  radius: number[]
  /** Spacing grid in px for inline padding, margin and gap. */
  grid: number
  /** Surface assumed behind the component (the page background token). */
  page: string
  /** How the app styles each role; when set, autofix restyles elements by role (see restyleByRole). */
  recipes?: Recipes
}
export type Change = { rule: string; detail: string }

/** A library component to use for a role, e.g. { component: "Button", from: "components/aspra/ui", props: "block" }. */
export type ComponentRecipe = { component: string; from: string; props?: string; className?: string }
/**
 * How the app styles each role, copied from its own components: the card surface, heading, body and caption
 * text, form fields, repeated choices (and their selected state), the main action and images.
 */
export type Recipes = {
  card?: string
  heading?: string
  body?: string
  caption?: string
  input?: string
  choiceGroup?: string
  choice?: string
  action?: ComponentRecipe
  image?: ComponentRecipe
}

/* ───────────────────────── colour ───────────────────────── */

type RGB = [number, number, number]
const hexToRgb = (h: string): RGB => {
  let x = h.replace("#", "")
  if (x.length === 3) x = [...x].map((c) => c + c).join("")
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)) as RGB
}
const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
export const contrast = (a: RGB, b: RGB) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
/** OKLab, for "nearest colour" that matches what people see. */
const oklab = ([r, g, b]: RGB) => {
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}
const distance = (a: RGB, b: RGB) => {
  const [p, q] = [oklab(a), oklab(b)]
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
}

/* ───────────────────────── JSX scanning ───────────────────────── */

/** Index just past the ">" that ends the opening tag starting at `start`, skipping braces and strings. */
function tagEnd(code: string, start: number): { end: number; selfClosing: boolean } {
  let depth = 0
  let quote: string | null = null
  for (let i = start; i < code.length; i++) {
    const c = code[i]
    if (quote) {
      if (c === quote && code[i - 1] !== "\\") quote = null
      continue
    }
    if (c === '"' || c === "'" || c === "`") quote = c
    else if (c === "{") depth++
    else if (c === "}") depth--
    else if (c === ">" && depth === 0) return { end: i + 1, selfClosing: code[i - 1] === "/" }
  }
  return { end: code.length, selfClosing: false }
}

const TAG = /<(\/?)([a-zA-Z][\w.]*)/g

/* ───────────────────────── the rules ───────────────────────── */

export function autofixCode(code: string, tokens: Array<{ name: string; value: string }>, cfg: AutofixConfig): { code: string; changes: Change[] } {
  const hex = new Map(tokens.filter((t) => /^#[0-9a-f]{3,6}$/i.test(t.value)).map((t) => [t.name, hexToRgb(t.value)]))
  hex.set("white", [255, 255, 255])
  const pal = (names: string[]) => names.filter((n) => hex.has(n)).map((n) => ({ name: n, rgb: hex.get(n)! }))
  const TEXT = pal(cfg.text)
  const SURFACE = pal(cfg.surface)
  const BORDER = pal(cfg.border)
  const nearest = (rgb: RGB, list: typeof TEXT) => list.reduce((a, b) => (distance(rgb, b.rgb) < distance(rgb, a.rgb) ? b : a))
  const changes: Change[] = []
  const note = (rule: string, detail: string) => changes.push({ rule, detail })
  const cssVar = (name: string) => (name === "white" ? "white" : `var(--${name})`)

  /**
   * Text colour: the token closest to the original that reaches AA on every surface it can sit on
   * (a ternary background has several); if none does, the one whose worst case is most legible.
   */
  const worst = (t: RGB, bgs: RGB[]) => Math.min(...bgs.map((b) => contrast(t, b)))
  const textOn = (rgb: RGB, bgs: RGB[]) => {
    const ok = TEXT.filter((t) => worst(t.rgb, bgs) >= 4.5)
    return ok.length ? nearest(rgb, ok) : TEXT.reduce((a, b) => (worst(b.rgb, bgs) > worst(a.rgb, bgs) ? b : a))
  }
  const snapType = (px: number) => cfg.typeScale.filter((s) => s >= cfg.minText).reduce((a, b) => (Math.abs(b - px) < Math.abs(a - px) ? b : a))
  const snapRadius = (px: number) => cfg.radius.reduce((a, b) => (Math.abs(b - px) < Math.abs(a - px) ? b : a))
  const snapGrid = (px: number) => Math.max(cfg.grid, Math.round(px / cfg.grid) * cfg.grid)

  type Frame = { name: string; rename?: string; bg: RGB }
  const stack: Frame[] = []
  const pageBg = hex.get(cfg.page) ?? [255, 255, 255]
  let out = ""
  let last = 0

  for (const m of code.matchAll(TAG)) {
    const at = m.index!
    if (at < last) continue
    const [, closing, name] = m
    if (closing) {
      // closing tag: rename it if its opening tag was renamed
      const idx = stack.map((f) => f.name).lastIndexOf(name)
      if (idx >= 0) {
        const f = stack[idx]
        stack.length = idx
        if (f.rename) {
          out += code.slice(last, at) + `</${f.rename}`
          last = at + 2 + name.length
        }
      }
      continue
    }
    // TypeScript generics like Array<string> or useState<number>: not JSX
    if (/[\w)\]]$/.test(code.slice(Math.max(0, at - 1), at))) continue
    const { end, selfClosing } = tagEnd(code, at)
    let attrs = code.slice(at + 1 + name.length, end - (selfClosing ? 2 : 1))
    const host = /^[a-z]/.test(name)
    const parentBg = stack.length ? stack[stack.length - 1].bg : pageBg
    let bg = parentBg
    const own: RGB[] = []
    const surfaces = () => (own.length ? own : [parentBg])
    let rename: string | undefined
    const label = `<${name}>`

    if (host) {
      /* brand: gradients become one surface token */
      attrs = attrs.replace(/(background(?:Image)?)\s*:\s*(["'])linear-gradient\(([^)]*)\)\2/g, (_s, prop, q, inner) => {
        const first = inner.match(/#[0-9a-f]{3,6}\b/i)?.[0]
        const tok = first ? nearest(hexToRgb(first), SURFACE) : SURFACE[0]
        bg = tok.rgb
        own.push(tok.rgb)
        note("Tokens and brand", `${label} gradient → solid ${tok.name}`)
        return `${prop === "backgroundImage" ? "background" : prop}: ${q}${cssVar(tok.name)}${q}`
      })
      /* brand: hex colours in inline styles, by the property they belong to */
      const styleHex = /(\w+)\s*:\s*([^,{}]*?)(["'])(#[0-9a-f]{3,6})\3/gi
      // Two phases (backgrounds first, so text sees every surface it can sit on), each repeated
      // because a ternary holds several colours for the same property.
      for (const phase of ["surface", "rest"] as const)
        for (let pass = 0; pass < 4 && styleHex.test(attrs); pass++) attrs = attrs.replace(styleHex, (s, prop: string, pre: string, q: string, h: string) => {
        const rgb = hexToRgb(h)
        const isSurface = /^(background|backgroundColor|fill)$/.test(prop)
        if (isSurface !== (phase === "surface")) return s
        if (isSurface) {
          const tok = nearest(rgb, SURFACE)
          own.push(tok.rgb)
          if (pre === "" || bg === parentBg) bg = tok.rgb
          note("Tokens and brand", `${label} background ${h} → ${tok.name}`)
          return `${prop}: ${pre}${q}${cssVar(tok.name)}${q}`
        }
        if (prop === "color") {
          const tok = textOn(rgb, surfaces())
          const ratio = worst(tok.rgb, surfaces())
          note("Accessibility", `${label} text ${h} → ${tok.name} (${ratio.toFixed(1)}:1${ratio < 4.5 ? ", best available, still under AA" : ""})`)
          return `${prop}: ${pre}${q}${cssVar(tok.name)}${q}`
        }
        if (/^(borderColor|outlineColor)$/.test(prop)) {
          const tok = nearest(rgb, BORDER)
          note("Tokens and brand", `${label} border ${h} → ${tok.name}`)
          return `${prop}: ${pre}${q}${cssVar(tok.name)}${q}`
        }
        return s
      })
      /* brand: border shorthands: one thin solid line in a border token */
      attrs = attrs.replace(/border\s*:\s*(["'])(\d+)px\s+(solid|dotted|dashed|double)\s+(#[0-9a-f]{3,6})\1/gi, (_s, q, _w, _style, h) => {
        const tok = nearest(hexToRgb(h), BORDER)
        note("Tokens and brand", `${label} border → 1px solid ${tok.name}`)
        return `border: ${q}1px solid ${cssVar(tok.name)}${q}`
      })
      /* brand: decorative effects the system does not use */
      const strip = (re: RegExp, what: string) => {
        if (re.test(attrs)) {
          attrs = attrs.replace(re, "")
          note("Tokens and brand", `${label} ${what} removed`)
        }
      }
      strip(/\s*textShadow\s*:\s*(["'])[^"']*\1\s*,?/g, "text shadow")
      strip(/\s*boxShadow\s*:\s*(["'])\s*-?\d+px\s+-?\d+px\s+0(px)?\s[^"']*\1\s*,?/g, "hard drop shadow")
      strip(/\s*textTransform\s*:\s*(["'])uppercase\1\s*,?/g, "all caps")
      strip(/\s*letterSpacing\s*:\s*(?:[2-9]|\d{2,})\s*,?/g, "wide letter spacing")
      strip(/\s*fontFamily\s*:\s*(["'])[^"']*\1\s*,?/g, "own font (inherits the brand fonts)")
      if (name === "img") strip(/\s*filter\s*:\s*(["'])[^"']*\1\s*,?/g, "image filter")
      strip(/\s*cursor\s*:\s*(["'])pointer\1\s*,?/g, "cursor style (buttons get it from the theme)")

      /* type scale, radius, spacing in inline styles */
      attrs = attrs.replace(/fontSize\s*:\s*(\d+(?:\.\d+)?)/g, (s, n) => {
        const v = snapType(Number(n))
        if (v === Number(n)) return s
        note(Number(n) < cfg.minText ? "Accessibility" : "Tokens and brand", `${label} font size ${n}px → ${v}px`)
        return `fontSize: ${v}`
      })
      /* responsive: a large fixed width becomes "full width, up to that size", so it fits a phone */
      attrs = attrs.replace(/(?<![\w-])width\s*:\s*(\d{3,})(?=\s*[,}])/g, (s, n) => {
        if (Number(n) < 320) return s
        note("Responsive", `${label} fixed width ${n}px → full width, up to ${n}px`)
        return `width: "100%", maxWidth: ${n}`
      })
      attrs = attrs.replace(/borderRadius\s*:\s*(\d+)/g, (s, n) => {
        const v = snapRadius(Number(n))
        if (v === Number(n)) return s
        note("Tokens and brand", `${label} radius ${n}px → ${v}px`)
        return `borderRadius: ${v}`
      })
      attrs = attrs.replace(/\b(padding|margin|gap|paddingInline|paddingBlock)\s*:\s*(\d+)(?=\s*[,}])/g, (s, prop, n) => {
        const v = Number(n) === 0 ? 0 : snapGrid(Number(n))
        if (v === Number(n)) return s
        note("Tokens and brand", `${label} ${prop} ${n}px → ${v}px (4px grid)`)
        return `${prop}: ${v}`
      })

      /* brand: hex colours in Tailwind arbitrary classes */
      attrs = attrs.replace(/\b(bg|text|border)-\[(#[0-9a-f]{3,6})\]/gi, (_s, kind: string, h: string) => {
        const rgb = hexToRgb(h)
        const tok = kind === "bg" ? nearest(rgb, SURFACE) : kind === "text" ? textOn(rgb, surfaces()) : nearest(rgb, BORDER)
        if (kind === "bg") {
          bg = tok.rgb
          own.push(tok.rgb)
        }
        note(kind === "text" ? "Accessibility" : "Tokens and brand", `${label} ${kind}-[${h}] → ${kind}-${tok.name}`)
        return `${kind}-${tok.name}`
      })
      attrs = attrs.replace(/\btext-\[(\d+(?:\.\d+)?)px\]/g, (s, n) => {
        const v = snapType(Number(n))
        if (v === Number(n)) return s
        note(Number(n) < cfg.minText ? "Accessibility" : "Tokens and brand", `${label} text-[${n}px] → text-[${v}px]`)
        return `text-[${v}px]`
      })

      /* accessibility: things you click are buttons, at least 44px */
      const addClass = (cls: string) => {
        if (/className="/.test(attrs)) attrs = attrs.replace(/className="([^"]*)"/, (_s, c) => `className="${c} ${cls}"`)
        else attrs = ` className="${cls}"` + attrs
      }
      if ((name === "div" || name === "span") && /\bonClick=/.test(attrs) && !/\brole=/.test(attrs)) {
        rename = "button"
        attrs = ` type="button"` + attrs
        addClass("min-h-11 min-w-11")
        note("Accessibility", `clickable <${name}> → <button> with a 44px minimum target`)
      }
      if ((name === "button" || rename === "button") && !/disabled:/.test(attrs)) {
        addClass("disabled:opacity-45 disabled:cursor-not-allowed")
        note("States", `${rename ? "<button>" : label} gets a disabled style`)
      }
      if (name === "img" && !/\balt=/.test(attrs)) {
        attrs = ` alt=""` + attrs
        note("Accessibility", "<img> gets alt=\"\" (decorative). Describe it instead if it carries meaning")
      }
      if (/^(textarea|input|select)$/.test(name) && !/\baria-label|\bid=/.test(attrs)) {
        const ph = attrs.match(/placeholder="([^"]*)"/)?.[1]?.replace(/\.+$/, "")
        const text = ph ? ph.charAt(0).toUpperCase() + ph.slice(1) : "Your answer"
        attrs = ` aria-label="${text}"` + attrs
        note("Accessibility", `<${name}> gets a label: "${text}"`)
      }
      // tidy commas left behind by removals
      attrs = attrs.replace(/\{\{\s*,/g, "{{ ").replace(/,\s*,/g, ",").replace(/,\s*\}\}/g, " }}").replace(/style=\{\{\s*\}\}/g, "")
    }

    out += code.slice(last, at) + `<${rename ?? name}${attrs}${selfClosing ? "/>" : ">"}`
    last = end
    if (!selfClosing) stack.push({ name, rename, bg })
  }
  out += code.slice(last)
  return { code: out, changes }
}

/* ───────────────────────── restyle by role ───────────────────────── */

/** The `style={{ … }}` attribute: its text and where it sits in the attribute string. */
function styleAttr(attrs: string): { start: number; end: number; body: string } | null {
  const at = attrs.search(/\bstyle=\{\{/)
  if (at < 0) return null
  let depth = 0
  for (let i = attrs.indexOf("{", at); i < attrs.length; i++) {
    if (attrs[i] === "{") depth++
    else if (attrs[i] === "}" && --depth === 0) return { start: at, end: i + 1, body: attrs.slice(attrs.indexOf("{{", at) + 2, i - 1) }
  }
  return null
}

/**
 * Second pass: give each element the app's own styling for its role, instead of patched values.
 * Inline styles go; classes come from the project's recipes; the main action and images become the
 * library's components; repeated choices get a real selected state (aria-pressed) styled by the recipe.
 */
export function restyleByRole(code: string, r: Recipes, projectId: string): { code: string; changes: Change[] } {
  const changes: Change[] = []
  const note = (detail: string) => changes.push({ rule: "App styles", detail })
  const imports = new Map<string, Set<string>>()
  const use = (c: ComponentRecipe) => imports.set(c.from, (imports.get(c.from) ?? new Set()).add(c.component))
  const stack: Array<{ name: string; rename?: string }> = []
  let out = ""
  let last = 0
  let rootDone = false

  for (const m of code.matchAll(TAG)) {
    const at = m.index!
    if (at < last) continue
    const [, closing, name] = m
    if (closing) {
      const idx = stack.map((f) => f.name).lastIndexOf(name)
      if (idx >= 0) {
        const f = stack[idx]
        stack.length = idx
        if (f.rename) {
          out += code.slice(last, at) + `</${f.rename}`
          last = at + 2 + name.length
        }
      }
      continue
    }
    if (/[\w)\]]$/.test(code.slice(Math.max(0, at - 1), at))) continue
    const { end, selfClosing } = tagEnd(code, at)
    let attrs = code.slice(at + 1 + name.length, end - (selfClosing ? 2 : 1))
    if (!/^[a-z]/.test(name)) {
      out += code.slice(last, at) + `<${name}${attrs}${selfClosing ? "/>" : ">"}`
      last = end
      if (!selfClosing) stack.push({ name })
      continue
    }
    const style = styleAttr(attrs)
    const s = style?.body ?? ""
    const dropStyle = () => {
      const st = styleAttr(attrs)
      if (st) attrs = attrs.slice(0, st.start).trimEnd() + attrs.slice(st.end)
    }
    const setClass = (cls: string) => {
      attrs = attrs.replace(/\s*className=("[^"]*"|\{[^}]*\})/, "")
      attrs = ` className="${cls}"` + attrs
    }
    const label = `<${name}>`
    let rename: string | undefined
    let tagName = name

    const isRoot = !rootDone && stack.every((f) => !/^[a-z]/.test(f.name))
    if (isRoot) rootDone = true
    const repeated = /\bkey=/.test(attrs)
    // Only restyle what is off the system: inline styles, hard-coded values, or no styling at all.
    // Elements already styled with the app's classes (by you or an AI fix) are left as they are.
    const offSystem = !!style || /\b(?:bg|text|border)-\[#|\btext-\[\d+(?:\.\d+)?px\]/.test(attrs.replace(/text-\[(?:12|13|13\.5|14|14\.5|15|16|17|22|26|38|56|64)px\]/g, "")) || !/\bclassName=/.test(attrs)

    if (!offSystem && name !== "img") {
      // keep it
    } else if (isRoot && r.card && /^(div|section|article|form|aside)$/.test(name)) {
      const max = s.match(/maxWidth\s*:\s*(\d+)/)?.[1]
      dropStyle()
      setClass(max ? r.card.replace(/max-w-\[\d+px\]/, `max-w-[${max}px]`) : r.card)
      note(`${label} → the app's card surface`)
    } else if (/^h[1-4]$/.test(name) && r.heading) {
      dropStyle()
      setClass(r.heading)
      note(`${label} → the app's heading style`)
    } else if (name === "p" && r.body) {
      dropStyle()
      setClass(r.body)
      note(`${label} → the app's body text`)
    } else if (/^(span|small)$/.test(name) && r.caption && /display\s*:\s*["']block|fontSize/.test(s)) {
      dropStyle()
      setClass(r.caption)
      note(`${label} → the app's caption text`)
    } else if (/^(textarea|input)$/.test(name) && r.input) {
      dropStyle()
      setClass(r.input + (name === "textarea" ? " min-h-24" : ""))
      note(`${label} → the app's text field`)
    } else if (name === "img" && r.image) {
      dropStyle()
      attrs = attrs.replace(/\s*className=("[^"]*"|\{[^}]*\})/, "")
      if (r.image.className) attrs += ` className="${r.image.className}"`
      tagName = r.image.component
      use(r.image)
      note(`<img> → the library's ${r.image.component}`)
    } else if (name === "button" && repeated && r.choice) {
      // a repeated toggle: its "selected" background becomes a real state the app styles
      const cond = s.match(/background(?:Color)?\s*:\s*([^?,{}]+?)\s*\?/)?.[1]?.trim()
      dropStyle()
      setClass(r.choice)
      if (cond && !/\baria-pressed=/.test(attrs)) attrs += ` aria-pressed={${cond}}`
      if (!/\btype=/.test(attrs)) attrs = ` type="button"` + attrs
      note(`repeated <button> → the app's choice style${cond ? `, selected when ${cond} (aria-pressed)` : ""}`)
    } else if (name === "button" && !repeated && r.action) {
      dropStyle()
      attrs = attrs.replace(/\s*className=("[^"]*"|\{[^}]*\})/, "").replace(/\s*type="button"/, "")
      if (r.action.props) attrs += ` ${r.action.props}`
      tagName = r.action.component
      rename = r.action.component
      use(r.action)
      note(`<button> → the library's ${r.action.component}`)
    } else if (name === "div" && style) {
      // layout containers keep their layout, as the app's classes
      const cls = [/display\s*:\s*["']flex/.test(s) ? (stack.length && r.choiceGroup && /\.map\(/.test(code.slice(end, end + 400)) ? r.choiceGroup : "flex gap-2") : ""].filter(Boolean).join(" ")
      dropStyle()
      if (cls) setClass(cls)
      note(`${label} inline layout → classes`)
    }

    out += code.slice(last, at) + `<${tagName}${attrs}${selfClosing ? "/>" : ">"}`
    last = end
    if (!selfClosing) stack.push({ name, rename })
  }
  out += code.slice(last)

  // import the library components the recipes used
  for (const [from, names] of imports) {
    const spec = `@repo/${projectId}/${from}`
    const existing = out.match(new RegExp(`import \\{([^}]*)\\} from "${spec.replace(/[/.]/g, "\\$&")}"`))
    if (existing) {
      const have = new Set(existing[1].split(",").map((x) => x.trim()).filter(Boolean))
      for (const n of names) have.add(n)
      out = out.replace(existing[0], `import { ${[...have].join(", ")} } from "${spec}"`)
    } else {
      const lastImport = [...out.matchAll(/^import .*$/gm)].pop()
      const line = `import { ${[...names].join(", ")} } from "${spec}"`
      out = lastImport ? out.slice(0, lastImport.index! + lastImport[0].length) + "\n" + line + out.slice(lastImport.index! + lastImport[0].length) : line + "\n" + out
    }
  }
  return { code: out, changes }
}
