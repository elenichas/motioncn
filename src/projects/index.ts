import type { ComponentType, ReactNode, Context } from "react"
import type { Manifest, Note } from "@/project/types"
import type { Flow } from "@/project/flows"
import { flows as aspraFlows } from "./aspra/flows"
import { manifest as aspra } from "./aspra/manifest"
import aspraScan from "./aspra/scan.json"
import aspraChanges from "./aspra/changes.json"
import aspraConfig from "./aspra/config.json"

export type Scan = typeof aspraScan
export type ProjectConfig = typeof aspraConfig
export type AddedComponent = { name: string; file: string; line: number; props: string; findings: Note[] }
/** What the last rescan found new since the scan before it (written by scripts/scan-project.mjs). */
export type Changes = {
  from: string | null
  to: string
  at: string
  commits: Array<{ sha: string; author: string; date: string; subject: string }>
  changedFiles: string[]
  added: AddedComponent[]
  removed: Array<{ name: string; file: string }>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>

/** What a project's previews module exports (loaded only inside preview frames). */
export type PreviewModule = {
  previews: Record<string, () => ReactNode>
  /** The library components specimens use, so a draft can swap one for its fixed version. */
  parts: Record<string, AnyComponent>
  Parts: Context<Record<string, AnyComponent>>
  /** Lazy loaders for every component file in the repo, for previews of code the manifest does not know yet. */
  modules: Record<string, () => Promise<Record<string, unknown>>>
  AutoFrame: ComponentType<{ children: ReactNode }>
}
/** What a draft fix exports: replacements for library parts, or a whole preview of its own. */
export type DraftModule = { parts?: Record<string, AnyComponent>; default?: ComponentType }

export type Project = {
  manifest: Manifest
  scan: Scan
  changes: Changes
  config: ProjectConfig
  /** User flows, traced from the app's navigation (the second canvas). */
  flows: Flow[]
  previews: () => Promise<PreviewModule>
}

export const projects: Record<string, Project> = {
  aspra: { manifest: aspra, scan: aspraScan, changes: aspraChanges as Changes, config: aspraConfig, flows: aspraFlows, previews: () => import("./aspra/previews") },
}

/** Entry ids for components that only the scanner knows about: "auto~<file>~<export>". */
export const autoId = (file: string, name: string) => `auto~${file}~${name}`

/** Draft file name for an entry: its id, or "new-<kebab name>" for components that arrived from main. */
export const draftKey = (id: string) =>
  /^(auto|place)~/.test(id)
    ? (id.startsWith("auto~") ? "new-" : "in-") + id.split("~")[2].replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
    : id

/** Entry ids for components shown in place on a flow screen: "place~<file>~<name>". */
export const placeId = (file: string, name: string) => `place~${file}~${name}`
