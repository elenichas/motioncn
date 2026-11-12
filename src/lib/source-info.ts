// Reads component source (bundled as raw text) and derives what the code panel shows.
// Mirrors scripts/build-registry.mjs so the panel and the registry agree.

export const REGISTRY_URL: string = (import.meta.env.VITE_REGISTRY_URL as string | undefined)?.replace(/\/$/, "") ?? "https://motioncn.example.com"
export const REGISTRY_IS_PLACEHOLDER = !import.meta.env.VITE_REGISTRY_URL

const sources = import.meta.glob("../components/motion/*.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>

export function sourceOf(file: string): string {
  return sources[`../components/motion/${file}.tsx`] ?? ""
}

export type SourceInfo = {
  file: string
  exportName: string
  description: string
  shadcn: string[]
  local: string[]
  npm: string[]
  source: string
}

export function infoFor(file: string): SourceInfo {
  const source = sourceOf(file)
  const shadcn = new Set<string>()
  const local = new Set<string>()
  const npm = new Set<string>()
  for (const [, spec] of source.matchAll(/from "([^"]+)"/g)) {
    if (spec.startsWith("@/components/ui/")) shadcn.add(spec.replace("@/components/ui/", ""))
    else if (spec.startsWith("./")) local.add(spec.slice(2))
    else if (spec === "@/lib/themes") local.add("themes")
    else if (!spec.startsWith("@/") && spec !== "react") npm.add(spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0])
  }
  const docs = [...source.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*export function (\w+)/g)]
  const last = docs.at(-1)
  const description = (last?.[1] ?? "")
    .split("\n")
    .map((l) => l.replace(/^\s*\* ?/, "").trim())
    .filter(Boolean)
    .join(" ")
  return { file, exportName: last?.[2] ?? "Component", description, shadcn: [...shadcn], local: [...local], npm: [...npm], source }
}

/* ---------- tiny TSX highlighter (no dependency) ---------- */

export type Token = { t: string; k?: "kw" | "str" | "com" | "num" | "tag" }
const KW = new Set("import from export function const let return if else for of in new type as await async default true false null undefined typeof extends".split(" "))
const RE = /(\/\/.*$|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|(<\/?[A-Z][\w.]*|<\/?[a-z][\w-]*(?=[\s>/]))|(\b[A-Za-z_]\w*\b)/gm

export function highlight(line: string): Token[] {
  const out: Token[] = []
  let last = 0
  for (const m of line.matchAll(RE)) {
    if (m.index! > last) out.push({ t: line.slice(last, m.index) })
    if (m[1]) out.push({ t: m[0], k: "com" })
    else if (m[2]) out.push({ t: m[0], k: "str" })
    else if (m[3]) out.push({ t: m[0], k: "num" })
    else if (m[4]) out.push({ t: m[0], k: "tag" })
    else out.push({ t: m[0], k: KW.has(m[0]) ? "kw" : undefined })
    last = m.index! + m[0].length
  }
  if (last < line.length) out.push({ t: line.slice(last) })
  return out
}
