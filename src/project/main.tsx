import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@/index.css"
import { projects } from "@/projects"
import { useState } from "react"
import { ProjectCanvas } from "./project-canvas"
import { FlowsCanvas } from "./flows-canvas"
import type { CanvasId } from "./canvas-switch"
import { withFound } from "./flows"
import { autoId, type Project } from "@/projects"
import type { Page } from "./types"

// A new or changed draft makes Tailwind ask Vite for a full reload of every page. The preview frames
// reload themselves; the canvas has nothing to reload for, and would lose your place. Vite skips the reload
// when the path names another HTML page, so point it at one.
import.meta.hot?.on("vite:beforeFullReload", (payload: { path?: string; triggeredBy?: string }) => {
  const cause = payload.triggeredBy ?? payload.path ?? ""
  if (/[\\/]projects[\\/][\w-]+[\\/](drafts[\\/]|preview\.css)/.test(cause)) payload.path = "/__canvas-skip-reload.html"
})

const id = new URLSearchParams(location.search).get("p") ?? Object.keys(projects)[0]
const project = projects[id]
document.title = project ? `${project.manifest.name} · project canvas` : "Project canvas"

/**
 * A project holds two canvases: its components, and its user flows. They link both ways: a component in a
 * flow screen opens on the Components canvas, and a component lists the flow screens it appears in.
 */
type Focus = { entry?: string; screen?: string; tab?: "checks" | "actions"; from?: { key: string; title: string } }

function Workspace({ project }: { project: Project }) {
  const [canvas, setCanvasState] = useState<CanvasId>(() => (new URLSearchParams(location.search).get("c") === "flows" ? "flows" : "components"))
  const [focus, setFocus] = useState<Focus>({})
  const go = (c: CanvasId, f: Focus = {}) => {
    const q = new URLSearchParams(location.search)
    if (c === "flows") q.set("c", "flows")
    else q.delete("c")
    history.replaceState(null, "", `?${q}${c === "flows" ? "" : location.hash}`)
    setFocus(f)
    setCanvasState(c)
  }
  if (canvas === "flows") {
    // Components the flows can link to: everything in the manifest, plus new code from main.
    const pages: Page[] = withFound(project, [
      ...project.manifest.pages,
      { id: "__incoming", title: "", kind: "review", blurb: "", sections: [{ title: "", entries: project.changes.added.map((a) => ({ id: autoId(a.file, a.name), title: a.name, where: `${a.file}:${a.line}`, confidence: "assumed" as const })) }] },
    ])
    return <FlowsCanvas project={project} pages={pages} focusScreen={focus.screen} openEntry={(entry, tab, from) => go("components", { entry, tab, from })} setCanvas={go} />
  }
  return <ProjectCanvas project={project} focusEntry={focus.entry} focusTab={focus.tab} focusFrom={focus.from} key={focus.entry ?? "all"} openScreen={(screen) => go("flows", { screen })} setCanvas={go} />
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {project ? (
      <Workspace project={project} />
    ) : (
      <div className="p-8">
        <h1 className="text-lg font-semibold">No project “{id}”</h1>
        <ul className="mt-3 list-disc pl-5">
          {Object.keys(projects).map((p) => (
            <li key={p}>
              <a className="underline" href={`?p=${p}`}>{projects[p].manifest.name}</a>
            </li>
          ))}
        </ul>
      </div>
    )}
  </StrictMode>,
)
