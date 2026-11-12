// Generates registry.json (shadcn registry schema) from the component sources.
// Everything is derived from the files themselves, so the registry can't drift:
//   - "@/components/ui/x" imports  → registryDependencies "x" (stock shadcn)
//   - "./x" / "@/lib/themes"       → registryDependencies on our own items (by URL)
//   - bare package imports         → npm dependencies
//   - the JSDoc above the main export → description; titles/categories from src/registry.tsx
// Then run `shadcn build` to emit public/r/<name>.json.
//
// REGISTRY_URL must be the public origin where /r/*.json is served, e.g.
//   REGISTRY_URL=https://motioncn.vercel.app npm run registry
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")
const REGISTRY_URL = (process.env.REGISTRY_URL || process.env.VITE_REGISTRY_URL || "https://motioncn.example.com").replace(/\/$/, "")
const motionDir = path.join(root, "src/components/motion")
const read = (p) => fs.readFileSync(p, "utf8")

// --- titles + categories from the canvas registry ---------------------------
const canvas = read(path.join(root, "src/registry.tsx"))
const fileOf = {} // ExportName -> file
for (const m of canvas.matchAll(/import \{ (\w+) \} from "@\/components\/motion\/([\w-]+)"/g)) fileOf[m[1]] = m[2]
const meta = {} // file -> { title, kind, base }
for (const m of canvas.matchAll(/(\w+): \{ kind: "(\w+)", title: "([^"]+)", base: "([^"]+)", component: (\w+)(?:, file: "[\w-]+")? \}/g)) {
  const file = fileOf[m[5]]
  if (file) meta[file] = { kind: m[2], title: m[3], base: m[4] }
}
const categoryOf = {} // kind -> category title
const catBlock = canvas.slice(canvas.indexOf("export const categories"))
for (const m of catBlock.matchAll(/title: "([^"]+)",[\s\S]*?built: \[([^\]]*)\]/g)) {
  for (const k of m[2].matchAll(/"(\w+)"/g)) categoryOf[k[1]] = m[1]
}

// --- helpers ----------------------------------------------------------------
const NPM_IGNORE = new Set(["react", "react-dom"])
const url = (name) => `${REGISTRY_URL}/r/${name}.json`

function analyse(source) {
  const registryDependencies = new Set()
  const dependencies = new Set()
  for (const [, spec] of source.matchAll(/from "([^"]+)"/g)) {
    if (spec.startsWith("@/components/ui/")) registryDependencies.add(spec.replace("@/components/ui/", ""))
    else if (spec.startsWith("./")) registryDependencies.add(url(spec.slice(2)))
    else if (spec === "@/lib/themes") registryDependencies.add(url("themes"))
    else if (spec === "@/lib/utils") registryDependencies.add("utils")
    else if (!spec.startsWith("@/") && !NPM_IGNORE.has(spec)) dependencies.add(spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0])
  }
  return { registryDependencies: [...registryDependencies], dependencies: [...dependencies] }
}

function mainExport(source) {
  const all = [...source.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*export function (\w+)/g)]
  const last = all.at(-1)
  if (!last) return { name: null, doc: "" }
  const doc = last[1]
    .split("\n")
    .map((l) => l.replace(/^\s*\* ?/, "").trim())
    .filter(Boolean)
    .join(" ")
  return { name: last[2], doc }
}

// --- items ------------------------------------------------------------------
const items = []
const helpers = {
  "demo-state": { title: "Demo state", description: "Hover/disabled showcase state used by motioncn components. Safe to keep: outside the playground every component is simply enabled." },
  "slot-number": { title: "Slot Number", description: "Rolling slot-machine digits used by several motioncn components." },
  "text-shimmer": { title: "Shimmer", description: "Accessible text shimmer: a highlight sweeps over an aria-hidden copy, so the real text keeps its contrast." },
}

for (const file of fs.readdirSync(motionDir).filter((f) => f.endsWith(".tsx")).sort()) {
  const name = file.replace(/\.tsx$/, "")
  const source = read(path.join(motionDir, file))
  const { registryDependencies, dependencies } = analyse(source)
  const { doc } = mainExport(source)
  const m = meta[name]
  const helper = helpers[name]
  if (!m && !helper) continue
  const item = {
    name,
    type: "registry:component",
    title: m?.title ?? helper.title,
    description: helper?.description ?? doc.replace(/\s+/g, " "),
    dependencies,
    registryDependencies,
    files: [{ path: `src/components/motion/${file}`, type: "registry:component" }],
    ...(m ? { categories: [categoryOf[m.kind] ?? "Other"] } : {}),
  }
  if (name === "text-shimmer") {
    item.css = {
      ".shimmer-mask": {
        "mask-image": "linear-gradient(90deg, transparent 0%, #000 50%, transparent 100%)",
        "mask-size": "40% 100%",
        "mask-repeat": "no-repeat",
        animation: "shimmer var(--shimmer-duration, 1.6s) linear infinite",
      },
      "@keyframes shimmer": {
        from: { "mask-position": "-60% 0" },
        to: { "mask-position": "160% 0" },
      },
      "@media (prefers-reduced-motion: reduce)": { ".shimmer-mask": { animation: "none", opacity: "0" } },
    }
  }
  items.push(item)
}

items.push({
  name: "themes",
  type: "registry:lib",
  title: "motioncn themes",
  description: "shadcn theme tokens (OKLCH) and a themeVars() helper for scoping a theme to one element.",
  files: [{ path: "src/lib/themes.ts", type: "registry:lib" }],
})

const components = items.filter((i) => i.categories)
items.push({
  name: "all",
  type: "registry:block",
  title: "All motioncn components",
  description: `Installs all ${components.length} motioncn components.`,
  registryDependencies: components.map((i) => url(i.name)),
  files: [],
})

if (components.length === 0) throw new Error("No components found — did the entry format in src/registry.tsx change?")

const registry = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "motioncn",
  homepage: REGISTRY_URL,
  items,
}
fs.writeFileSync(path.join(root, "registry.json"), JSON.stringify(registry, null, 2) + "\n")
console.log(`registry.json: ${components.length} components + ${items.length - components.length} helpers → ${REGISTRY_URL}/r/`)
