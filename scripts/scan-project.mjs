#!/usr/bin/env node
/**
 * Scans a React + Tailwind repo and writes src/projects/<id>/scan.json for the project canvas.
 *
 *   node scripts/scan-project.mjs aspra
 *
 * Reads src/projects/<id>/config.json. Regex based on purpose: it only needs class strings,
 * CSS custom properties and component signatures, not a full parse.
 */
import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"

const id = process.argv[2]
if (!id) {
  console.error("usage: node scripts/scan-project.mjs <project-id>")
  process.exit(1)
}
const root = path.resolve(import.meta.dirname, "..")
const projectDir = path.join(root, "src/projects", id)
const config = JSON.parse(fs.readFileSync(path.join(projectDir, "config.json"), "utf8"))
const repo = path.resolve(root, config.repo)
const rel = (f) => path.relative(repo, f)

/* ---------- files ---------- */

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name)
    if (d.isDirectory()) return d.name === "node_modules" ? [] : walk(p)
    return /\.(tsx|ts)$/.test(d.name) ? [p] : []
  })
const excluded = (f) => (config.exclude ?? []).some((e) => rel(f).startsWith(e))
const files = config.sourceDirs.flatMap((d) => walk(path.join(repo, d))).filter((f) => !excluded(f))
const isLibrary = (f) => config.library.includes(rel(f))
const src = Object.fromEntries(files.map((f) => [f, fs.readFileSync(f, "utf8")]))
const lineOf = (text, index) => text.slice(0, index).split("\n").length

/* ---------- tokens from :root ---------- */

const css = fs.readFileSync(path.join(repo, config.css), "utf8")
const rootBlock = css.match(/:root\s*{([\s\S]*?)\n}/)?.[1] ?? ""
const tokens = [...rootBlock.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => ({ name, value: value.trim() }))
const utilities = [...css.matchAll(/\/\*\s*([^*]+?)\s*\*\/\s*@utility\s+([\w-]+)\s*{([\s\S]*?)\n}/g)].map(([, note, name, body]) => ({
  name,
  note,
  body: body.trim(),
}))

/* ---------- class strings ---------- */

// Every string literal in a .tsx file that looks like a class list.
const classStrings = []
for (const [f, text] of Object.entries(src)) {
  if (!f.endsWith(".tsx")) continue
  for (const m of text.matchAll(/"([^"\n]{3,400})"/g)) {
    const s = m[1]
    if (!/(^|\s)(flex|grid|rounded|text-|bg-|p[xy]?-|border|glass|h-|w-|gap-|inline)/.test(s)) continue
    classStrings.push({ file: rel(f), line: lineOf(text, m.index), cls: s, library: isLibrary(f) })
  }
}

const tally = (re) => {
  const map = new Map()
  for (const c of classStrings)
    for (const m of c.cls.matchAll(re)) {
      const e = map.get(m[0]) ?? { value: m[0], count: 0, at: [] }
      e.count++
      if (e.at.length < 8) e.at.push(`${c.file}:${c.line}`)
      map.set(m[0], e)
    }
  return [...map.values()].sort((a, b) => b.count - a.count)
}
const typeSizes = tally(/(?<![\w-])text-\[[\d.]+px\]/g).map((t) => ({ ...t, px: parseFloat(t.value.slice(6)) }))
const radii = tally(/(?<![\w-])rounded(-(?:t|b|l|r|tl|tr|bl|br))?(-\[[\d.]+px\]|-(?:none|sm|md|lg|xl|2xl|3xl|full))?(?![\w-])/g)

/* ---------- surfaces (card-like containers) ---------- */

const SURFACE = /(?<![\w-])(glass(-strong|-dark|-smoke)?|bg-white(\/\d+)?|bg-obsidian(\/\d+)?|bg-sea-wash|border-dashed)(?![\w-])/
const surfaces = classStrings.filter(
  (c) => /(?<![\w-])rounded-(?!full)/.test(c.cls) && SURFACE.test(c.cls) && !/(?<![\w-])(h-\d+|size-\d+|min-h-1[12])(?![\w-])/.test(c.cls),
)
const sig = (cls) => {
  const t = cls.split(/\s+/)
  const radius = t.find((x) => /^rounded-(?!full)/.test(x)) ?? "—"
  const pad = t.filter((x) => /^p[xytrbl]?-/.test(x)).sort().join(" ") || "no padding"
  const fill = t.find((x) => SURFACE.test(x)) ?? "—"
  return { radius, pad, fill }
}
const surfaceGroups = new Map()
for (const s of surfaces) {
  const g = sig(s.cls)
  const key = `${g.fill} · ${g.radius} · ${g.pad}`
  const e = surfaceGroups.get(key) ?? { key, ...g, count: 0, instances: [] }
  e.count++
  e.instances.push({ file: s.file, line: s.line, cls: s.cls })
  surfaceGroups.set(key, e)
}

/* ---------- hand-written buttons outside the library ---------- */

/* Reading a button's className: what is always on, and what depends on a condition (its states). */

/** End of the opening tag that starts at `start` (the ">" that is not inside braces or a string). */
function openTagEnd(text, start) {
  let depth = 0
  let quote = null
  for (let i = start; i < Math.min(text.length, start + 4000); i++) {
    const ch = text[i]
    if (quote) {
      if (ch === quote && text[i - 1] !== "\\") quote = null
    } else if (ch === '"' || ch === "'" || ch === "`") quote = ch
    else if (ch === "{") depth++
    else if (ch === "}") depth--
    else if (ch === ">" && depth === 0) return i
  }
  return -1
}
/** Split on a separator at the top level only (outside brackets and strings). */
function splitTop(expr, sep) {
  const out = []
  let depth = 0
  let quote = null
  let from = 0
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]
    if (quote) {
      if (ch === quote && expr[i - 1] !== "\\") quote = null
    } else if (ch === '"' || ch === "'" || ch === "`") quote = ch
    else if ("([{".includes(ch)) depth++
    else if (")]}".includes(ch)) depth--
    else if (depth === 0 && expr.startsWith(sep, i) && !(sep === "?" && (expr[i + 1] === "." || expr[i + 1] === "?" || expr[i - 1] === "?"))) {
      out.push(expr.slice(from, i))
      from = i + sep.length
      i += sep.length - 1
    }
  }
  out.push(expr.slice(from))
  return out.map((x) => x.trim()).filter(Boolean)
}
const unwrap = (e) => {
  e = e.trim()
  while (e.startsWith("(") && e.endsWith(")") && splitTop(e.slice(1, -1), "\u0000").length === 1 && openClose(e)) e = e.slice(1, -1).trim()
  return e
}
// "(a) && (b)" starts and ends with brackets but is not one bracketed expression
const openClose = (e) => {
  let depth = 0
  for (let i = 0; i < e.length; i++) {
    if (e[i] === "(") depth++
    else if (e[i] === ")" && --depth === 0) return i === e.length - 1
  }
  return false
}
const literal = (e) => (/^(["'`])[^"'`$]*\1$/.test(e) ? e.slice(1, -1) : null)
const tidyCond = (c) => unwrap(c).replace(/\s+/g, " ")
const negate = (c) => (/^!\w[\w.]*$/.test(c) ? c.slice(1) : /^[\w.]+$/.test(c) ? `not ${c}` : `not (${c})`)

/** One className argument → classes that are always on, and classes per condition. */
function readArg(arg, when, out) {
  const e = unwrap(arg)
  const lit = literal(e)
  if (lit !== null) return void (when.length ? out.states.push({ when: when.join(" and "), cls: lit }) : out.base.push(lit))
  const q = splitTop(e, "?")
  if (q.length >= 2) {
    const cond = tidyCond(q[0])
    const rest = e.slice(e.indexOf("?", q[0].length) + 1)
    // the ":" that belongs to this "?": nested ternaries in the "yes" branch bring their own
    let depth = 0, quote = null, nested = 0, cut = -1
    for (let i = 0; i < rest.length && cut < 0; i++) {
      const ch = rest[i]
      if (quote) {
        if (ch === quote && rest[i - 1] !== "\\") quote = null
      } else if (ch === '"' || ch === "'" || ch === "`") quote = ch
      else if ("([{".includes(ch)) depth++
      else if (")]}".includes(ch)) depth--
      else if (depth === 0 && ch === "?" && rest[i + 1] !== "." && rest[i + 1] !== "?" && rest[i - 1] !== "?") nested++
      else if (depth === 0 && ch === ":") nested ? nested-- : (cut = i)
    }
    readArg(cut < 0 ? rest : rest.slice(0, cut), [...when, cond], out)
    if (cut >= 0) readArg(rest.slice(cut + 1), [...when, negate(cond)], out)
    return
  }
  const and = splitTop(e, "&&")
  if (and.length >= 2) return readArg(and[and.length - 1], [...when, and.slice(0, -1).map(tidyCond).join(" and ")], out)
  const call = e.match(/^\w+\(([\s\S]*)\)$/)
  if (call) for (const a of splitTop(call[1], ",")) readArg(a, when, out)
  // anything else (a className prop passed through, a variable) cannot be read statically
}
function readClassName(tag) {
  const out = { base: [], states: [] }
  const at = tag.search(/\bclassName=/)
  if (at < 0) return out
  const rest = tag.slice(at + 10)
  if (rest[0] === '"') out.base.push(rest.slice(1, rest.indexOf('"', 1)))
  else if (rest[0] === "{") {
    let depth = 0
    let end = 0
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === "{") depth++
      else if (rest[i] === "}" && --depth === 0) {
        end = i
        break
      }
    }
    const expr = rest.slice(1, end).trim()
    if (expr.startsWith("`")) {
      // a template string: the fixed text is always on, each ${…} is read like an argument
      out.base.push(expr.slice(1, -1).replace(/\$\{[^}]*\}/g, " "))
      for (const m of expr.matchAll(/\$\{([^}]*)\}/g)) readArg(m[1], [], out)
    } else readArg(expr, [], out)
  }
  return out
}

/** What a class list looks like, reduced to the parts people compare: fill, text colour, outline, height. */
const SIZE_WORD = /^text-(\[|xs|sm|base|lg|xl|\d|left|right|center)/
function lookOf(cls) {
  const t = cls.split(/\s+/).filter((x) => x && !x.includes(":"))
  const fill = t.find((x) => /^(bg-|glass)/.test(x)) ?? "none"
  const text = t.find((x) => /^text-/.test(x) && !SIZE_WORD.test(x)) ?? "inherit"
  const outline = t.filter((x) => /^(border|ring)(-|$)/.test(x) && !/^border-[trblxy]$/.test(x)).join(" ") || "none"
  const h = t.find((x) => /^(h|min-h|size)-/.test(x)) ?? ""
  const px = h.match(/\[(\d+)px\]/)?.[1] ?? (h.match(/-(\d+(?:\.\d+)?)$/) ? Number(h.match(/-(\d+(?:\.\d+)?)$/)[1]) * 4 : 0)
  return { fill, text, outline, height: Number(px) || 0 }
}
const sameLook = (a, b) => a.fill === b.fill && a.text === b.text && a.outline === b.outline

/** The label a button shows: its aria-label, its own text, or the expression or icon it renders. */
function labelOf(open, inner) {
  const aria = open.match(/aria-label="([^"]+)"/)?.[1]
  if (aria) return aria
  // drop every {…} block (conditions, nested markup), then the tags: what is left is the words on the button
  let plain = ""
  for (let i = 0, depth = 0; i < inner.length; i++) {
    if (inner[i] === "{") depth++
    else if (inner[i] === "}") depth--
    else if (!depth) plain += inner[i]
  }
  const text = plain.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  if (text && /[a-zA-Z]{2}/.test(text)) return text.slice(0, 40)
  const expr = inner.match(/\{([a-zA-Z_][\w.]*)\}/)?.[1]
  if (expr) return `{${expr}}`
  const icon = inner.match(/<([A-Z]\w+)/)?.[1]
  return icon ? `${icon} icon` : "(no text)"
}

/** Everything the scanner can say about one <button> written in JSX. */
function readButton(text, index) {
  const openEnd = openTagEnd(text, index)
  const open = text.slice(index, openEnd + 1)
  const close = text.slice(openEnd + 1).search(/<\/(?:motion\.)?button>/)
  const inner = open.endsWith("/>") || close < 0 ? "" : text.slice(openEnd + 1, openEnd + 1 + close)
  const { base, states } = readClassName(open)
  const baseCls = base.join(" ").replace(/\s+/g, " ").trim()
  // each look: what is always on plus one condition's classes. A lone "cond && x" also has its plain look.
  const looks = states.length ? states.map((s) => ({ when: s.when, cls: `${baseCls} ${s.cls}`.trim() })) : [{ when: null, cls: baseCls }]
  const conds = new Set(states.map((s) => s.when.replace(/^not \(?|\)$/g, "")))
  if (states.length && states.every((s) => !s.when.startsWith("not ")) && conds.size === states.length) looks.unshift({ when: null, cls: baseCls })
  return {
    label: labelOf(open, inner),
    base: baseCls,
    states,
    looks: looks.map((l) => ({ ...l, ...lookOf(l.cls) })),
    disabled: /\bdisabled(=|\s|>)/.test(open) || /disabled:/.test(baseCls),
    cls: [baseCls, ...states.map((s) => s.cls)].join(" ").trim(),
  }
}

const rawButtons = []
for (const [f, text] of Object.entries(src)) {
  if (isLibrary(f) || !f.endsWith(".tsx")) continue
  for (const m of text.matchAll(/<(?:motion\.)?button\b/g)) rawButtons.push({ file: rel(f), line: lineOf(text, m.index), ...readButton(text, m.index) })
}

/* ---------- the library's own buttons, and the nearest one for each hand-written button ---------- */

// Library components that render a <button>, with their variants read from the same kind of className.
const libraryButtons = []
for (const [f, text] of Object.entries(src)) {
  if (!isLibrary(f)) continue
  const decls = [...text.matchAll(/^(?:export )?(?:const (\w+)\s*=\s*React\.forwardRef|function (\w+))/gm)].map((m) => ({ name: m[1] ?? m[2], at: m.index }))
  decls.forEach((d, i) => {
    const body = text.slice(d.at, decls[i + 1]?.at ?? text.length)
    const b = body.search(/<(?:motion\.)?button\b/)
    if (b < 0 || !/^[A-Z]/.test(d.name)) return
    const r = readButton(body, b)
    // 'variant === "dark"' → prop "variant", value "dark"
    const props = {}
    for (const s of r.states) {
      const m = s.when.match(/^(\w+) === "([\w-]+)"$/)
      if (m) (props[m[1]] ??= {})[m[2]] = { cls: s.cls, ...lookOf(`${r.base} ${s.cls}`) }
    }
    libraryButtons.push({ name: d.name, file: rel(f), line: lineOf(text, d.at), base: r.base, props })
  })
}

/**
 * The library component a hand-written button should have been, if there is one:
 * by shape first (a text link, an icon circle, a pill), then the variant with the same fill and text colour,
 * then the nearest size. `exact` is false when the shape fits but no variant has this look.
 */
function matchLibrary(b, kind) {
  const has = (re) => re.test(b.base)
  const shaped = (re) => libraryButtons.find((l) => re.test(l.base))
  const iconish = has(/(?<![\w-])size-\d/) || (has(/place-items-center/) && has(/rounded-full/))
  const candidate = has(/underline/) ? shaped(/underline/) : iconish ? shaped(/place-items-center/) : kind === "Pill button" ? libraryButtons.find((l) => Object.keys(l.props).length) : null
  if (!candidate) return null
  // a button with states is matched on the state a variant covers (its "on" look), else on its first look
  const covered = (l) => Object.values(candidate.props).some((values) => Object.values(values).some((v) => v.fill === l.fill && v.text === l.text && v.fill !== "none"))
  const look = b.looks.find(covered) ?? b.looks[0]
  const props = {}
  let exact = true
  const notes = []
  for (const [prop, values] of Object.entries(candidate.props)) {
    const coloured = Object.values(values).some((v) => /(?<![\w:-])(bg-|text-(?!\[))/.test(v.cls))
    if (coloured) {
      const hit = Object.entries(values).find(([, v]) => sameLook(v, look) || (v.fill === look.fill && v.text === look.text))
      if (hit) props[prop] = hit[0]
      else {
        exact = false
        notes.push(`no ${prop} with ${look.fill === "none" ? "no fill" : look.fill} and ${look.text}`)
      }
    } else if (look.height) {
      const near = Object.entries(values).map(([k, v]) => [k, lookOf(v.cls).height]).filter(([, h]) => h).sort((x, y) => Math.abs(x[1] - look.height) - Math.abs(y[1] - look.height))[0]
      if (near) {
        props[prop] = near[0]
        if (near[1] !== look.height) notes.push(`${look.height}px tall here, ${near[1]}px as ${prop} ${near[0]}`)
      }
    }
  }
  if (!Object.keys(candidate.props).length) {
    const own = lookOf(candidate.base)
    if (look.fill !== "none" && look.fill !== own.fill) notes.push(`its ${look.fill} fill would be passed in by the caller`)
  }
  return { component: candidate.name, props, exact, notes }
}
const buttonKind = (cls) =>
  /underline/.test(cls)
    ? "Text link"
    : /(size-\d+|place-items-center)/.test(cls) && /rounded-full/.test(cls)
      ? "Icon button"
      : /rounded-full/.test(cls) && /(h-\d+|min-h-1\d|px-)/.test(cls) && !/w-full/.test(cls)
        ? "Pill button"
        : /(w-full|flex-1)/.test(cls) && /(text-left|justify-between)/.test(cls)
          ? "List row"
          : /aspect-square|tabular-nums/.test(cls)
            ? "Calendar day"
            : "Other"

/* ---------- components ---------- */

const components = []
for (const [f, text] of Object.entries(src)) {
  for (const m of text.matchAll(/^(export )?(?:const (\w+)\s*=\s*React\.forwardRef|function (\w+))/gm)) {
    const name = m[2] ?? m[3]
    if (!/^[A-Z]/.test(name)) continue
    // Props type: the text between "}: " and the ") {" that opens the body.
    const head = text.slice(m.index, m.index + 1500)
    const body = head.search(/\)\s*(:\s*[\w.<>[\]| ]+)?\s*\{\n/)
    const sigText = body > 0 ? head.slice(0, body) : ""
    const props = sigText.match(/\}\s*:\s*([\s\S]+)$/)?.[1] ?? ""
    components.push({
      name,
      file: rel(f),
      line: lineOf(text, m.index),
      exported: !!m[1],
      library: isLibrary(f),
      props: props.replace(/\s+/g, " ").trim(),
    })
  }
}
// Same props type in different files: likely the same component written twice.
const byProps = new Map()
for (const c of components) {
  if (!c.props.startsWith("{") || c.props.length < 20) continue
  byProps.set(c.props, [...(byProps.get(c.props) ?? []), c])
}
const duplicates = [...byProps.values()]
  .filter((g) => new Set(g.map((c) => c.file)).size > 1)
  .map((g) => g.map((c) => ({ name: c.name, file: c.file, line: c.line, props: c.props })))

/* ---------- who uses what, and where the app moves between screens ---------- */

/** The component a line of a file sits in: the last one declared above it. */
const insideOf = (file, line) => components.filter((c) => c.file === file && c.line <= line).pop()?.name ?? null
const names = new Set(components.map((c) => c.name))

// Every JSX use of a known component: how far a change to it reaches, and what each composite is built from.
const usage = []
for (const [f, text] of Object.entries(src)) {
  if (!f.endsWith(".tsx")) continue
  for (const m of text.matchAll(/<([A-Z]\w*)[\s/>]/g)) {
    if (!names.has(m[1])) continue
    const line = lineOf(text, m.index)
    usage.push({ name: m[1], file: rel(f), line, inside: insideOf(rel(f), line) })
  }
}

// State changes that move the user somewhere: a setter called with a named state ("trip", "journal"),
// something opened (setStayOpen(true)), or an app event. The flows canvas cites these, so a rescan can tell
// which steps of a flow changed and which transitions no flow covers yet.
const openers = (config.navigation?.also ?? []).join("|")
const NAV = new RegExp(`\\b(set[A-Z]\\w*)\\(\\s*"([\\w-]+)"\\s*\\)|\\b(set\\w*Open${openers ? "|" + openers : ""})\\(true\\)|new Event\\("([\\w:-]+)"\\)`, "g")
const navigation = []
for (const [f, text] of Object.entries(src)) {
  if (!f.endsWith(".tsx")) continue
  for (const m of text.matchAll(NAV)) {
    const line = lineOf(text, m.index)
    const call = m[1] ? `${m[1]}("${m[2]}")` : m[3] ? `${m[3]}(true)` : `event ${m[4]}`
    navigation.push({ call, file: rel(f), line, inside: insideOf(rel(f), line) })
  }
}

/* ---------- unused kit ---------- */

let unusedKit = null
if (config.unusedKit) {
  const kitDir = path.join(repo, config.unusedKit)
  const kitFiles = fs.existsSync(kitDir) ? walk(kitDir) : []
  const alias = "@/" + config.unusedKit
  const imports = files.filter((f) => src[f].includes(alias)).map(rel)
  unusedKit = { dir: config.unusedKit, files: kitFiles.length, importedBy: imports }
}

let commit = ""
try {
  commit = execSync("git rev-parse --short HEAD", { cwd: repo }).toString().trim()
} catch {
  /* not a git checkout */
}

for (const b of rawButtons) {
  b.kind = buttonKind(b.cls)
  b.match = matchLibrary(b, b.kind)
}

const out = {
  project: config.id,
  repo: config.repo,
  commit,
  scannedAt: new Date().toISOString(),
  files: files.length,
  tokens,
  utilities,
  typeSizes,
  radii,
  surfaces: [...surfaceGroups.values()].sort((a, b) => b.count - a.count),
  rawButtons,
  libraryButtons,
  components,
  duplicates,
  usage,
  navigation,
  unusedKit,
}
/* ---------- what changed since the last scan ---------- */

const scanPath = path.join(projectDir, "scan.json")
const changesPath = path.join(projectDir, "changes.json")
const prev = fs.existsSync(scanPath) ? JSON.parse(fs.readFileSync(scanPath, "utf8")) : null
const gitOut = (...args) => {
  try {
    return execSync(`git ${args.join(" ")}`, { cwd: repo }).toString().trim()
  } catch {
    return ""
  }
}
const knownSizes = new Set((prev ?? out).typeSizes.map((t) => t.value))
const tokenNames = tokens.map((t) => t.name)

/** Automatic findings for new code: the things that show it was not built with the design system. */
function offBrand(file) {
  const text = fs.readFileSync(path.isAbsolute(file) ? file : path.join(repo, file), "utf8")
  const findings = []
  const hex = [...new Set(text.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? [])]
  if (hex.length) findings.push({ level: "issue", text: `${hex.length} hard-coded colour${hex.length > 1 ? "s" : ""} (${hex.slice(0, 5).join(", ")}) instead of brand tokens.` })
  const inline = (text.match(/style=\{\{/g) ?? []).length
  if (inline) findings.push({ level: "warn", text: `${inline} inline style object${inline > 1 ? "s" : ""}: styling the scanner and theme cannot see.` })
  const font = text.match(/font-?[fF]amily:\s*["'`]?([^"'`,;}]+)/)
  if (font) findings.push({ level: "issue", text: `Sets its own font (${font[1].trim()}) instead of the brand fonts.` })
  const sizes = [...new Set([...text.matchAll(/text-\[([\d.]+)px\]|fontSize:\s*["']?([\d.]+)/g)].map((m) => Number(m[1] ?? m[2])))]
  const tiny = sizes.filter((s) => s < 12)
  if (tiny.length) findings.push({ level: "issue", text: `Text at ${tiny.join(", ")}px, under the 12px minimum for readability.` })
  const newSizes = [...text.matchAll(/text-\[[\d.]+px\]/g)].map((m) => m[0]).filter((s) => !knownSizes.has(s))
  if (newSizes.length) findings.push({ level: "warn", text: `Adds ${[...new Set(newSizes)].join(", ")} to the type scale.` })
  const clickDivs = (text.match(/<(div|span)\b[^>]*onClick/g) ?? []).length
  if (clickDivs) findings.push({ level: "issue", text: `${clickDivs} clickable div${clickDivs > 1 ? "s" : ""} or span${clickDivs > 1 ? "s" : ""}: not reachable by keyboard and not announced as buttons.` })
  const imgNoAlt = (text.match(/<img\b(?![^>]*\balt=)[^>]*>/g) ?? []).length
  if (imgNoAlt) findings.push({ level: "issue", text: `${imgNoAlt} image${imgNoAlt > 1 ? "s" : ""} without alt text.` })
  const usesTokens = tokenNames.some((n) => new RegExp(`(?:bg|text|border|ring|fill|stroke)-${n}\\b|var\\(--${n}\\)`).test(text))
  if (!usesTokens) findings.push({ level: "issue", text: "Uses none of the theme's tokens, so a theme change does not reach it." })
  if (!/from\s+["'][^"']*\/ui["']/.test(text) && file !== config.library[0]) findings.push({ level: "warn", text: "Imports nothing from the component library." })
  return findings
}

// Check mode: `node scripts/scan-project.mjs <id> --check <file>` prints the off-brand findings for one file
// (used by the canvas to re-check a draft fix) and changes nothing.
if (process.argv[3] === "--check") {
  console.log(JSON.stringify(offBrand(path.resolve(process.argv[4]))))
  process.exit(0)
}

let changes = fs.existsSync(changesPath) ? JSON.parse(fs.readFileSync(changesPath, "utf8")) : null
if (!prev || !changes) {
  // First scan: nothing counts as new.
  changes = { from: null, to: commit, at: out.scannedAt, commits: [], changedFiles: [], added: [], removed: [] }
} else if (prev.commit !== commit) {
  const key = (c) => `${c.file}#${c.name}`
  const before = new Set(prev.components.map(key))
  const now = new Set(components.map(key))
  const range = `${prev.commit}..${commit}`
  const commits = gitOut("log", "--format=%h%x09%an%x09%aI%x09%s", range)
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [sha, author, date, ...subject] = l.split("\t")
      return { sha, author, date, subject: subject.join("\t") }
    })
  const changedFiles = gitOut("diff", "--name-only", prev.commit, commit).split("\n").filter(Boolean)
  // "New from main" is an inbox: it accumulates across pushes until each component is decided on the canvas.
  // Components still waiting from earlier pushes stay (re-checked against the latest code), unless they were
  // deleted from the repo; this push's new ones join them. Commits and changed files accumulate the same way.
  const waiting = (changes?.added ?? []).filter((c) => now.has(key(c)))
  const waitingKeys = new Set(waiting.map(key))
  const current = (c) => components.find((x) => key(x) === key(c)) ?? c
  const fresh = components.filter((c) => c.exported && !before.has(key(c)) && !waitingKeys.has(key(c)))
  const seenCommits = new Set(commits.map((c) => c.sha))
  changes = {
    from: changes?.added?.length ? (changes.from ?? prev.commit) : prev.commit,
    to: commit,
    at: out.scannedAt,
    commits: [...commits, ...(changes?.added?.length ? (changes.commits ?? []).filter((c) => !seenCommits.has(c.sha)) : [])],
    changedFiles: [...new Set([...changedFiles, ...(changes?.added?.length ? (changes.changedFiles ?? []) : [])])],
    added: [...waiting.map((c) => ({ ...current(c), since: c.since ?? prev.commit, findings: offBrand(c.file) })), ...fresh.map((c) => ({ ...c, since: commit, findings: offBrand(c.file) }))],
    removed: prev.components.filter((c) => c.exported && !now.has(key(c))),
  }
}
fs.writeFileSync(changesPath, JSON.stringify(changes, null, 2) + "\n")
fs.writeFileSync(scanPath, JSON.stringify(out, null, 2) + "\n")

// The repo's theme, ready to load in preview frames: Tailwind itself is imported by preview.css
// (the repo's node_modules are not installed here), and @source points Tailwind at the repo's components.
const fromProject = (p) => path.relative(projectDir, path.join(repo, p)).split(path.sep).join("/")
fs.writeFileSync(
  path.join(projectDir, "theme.css"),
  `/* Generated by scripts/scan-project.mjs from ${config.repo}/${config.css} @ ${commit}. Do not edit: rescan instead. */\n` +
    config.sourceDirs.map((d) => `@source "${fromProject(d)}";`).join("\n") +
    "\n\n" +
    css.replace(/^@import\s+['"](tailwindcss|tw-animate-css)['"];\s*$/gm, "").trimStart(),
)
console.log(
  `${config.name} @ ${commit}: ${files.length} files, ${tokens.length} tokens, ${typeSizes.length} type sizes, ${radii.length} radii, ` +
    `${surfaceGroups.size} surface styles (${surfaces.length} uses), ${rawButtons.length} hand-written buttons, ${components.length} components, ${duplicates.length} duplicate groups`,
)
