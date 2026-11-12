import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { MotionConfig } from "motion/react"
import { Canvas, fitView, zoomAt, type View } from "@/canvas/canvas"
import { Frame } from "@/canvas/frame"
import { Sections } from "@/canvas/sections"
import { Toolbar } from "@/canvas/toolbar"
import { A11yInspector } from "@/canvas/a11y-inspector"
import { CodePanel } from "@/canvas/code-panel"
import { AnimatePresence } from "motion/react"
import { ListView } from "@/canvas/list-view"
import { A11yReportDialog, ImportThemeDialog, ShareDialog, type ReportRow } from "@/canvas/dialogs"
import { categories, initialFrames, registry, type FrameData } from "@/registry"
import { registerCustomTheme, themeById, themes, themeVars, type Mode } from "@/lib/themes"
import { clearLocal, loadInitial, saveLocal, type Layout } from "@/lib/layout-store"
import { scan } from "@/lib/a11y"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { DemoState } from "@/components/motion/demo-state"

let uid = 0
const newId = (kind: string) => `${kind}-${Date.now().toString(36)}-${uid++}`
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]
const RADII = [0, 0.25, 0.5, 0.625, 0.75, 1, 1.25]

/** Restore a saved/shared layout, keeping only frames whose component still exists
 *  and adding any components that are new since it was saved. */
function restore(l: Layout | null) {
  if (!l) return null
  if (l.custom) registerCustomTheme(l.custom.name, l.custom)
  const known = l.frames.filter((f) => registry[f.kind])
  const ids = new Set(known.map((f) => f.id))
  return { ...l, frames: [...known, ...initialFrames().filter((f) => !ids.has(f.id))] }
}
const saved = restore(loadInitial())

export default function App() {
  const worldRef = useRef<HTMLDivElement>(null)
  const [view, setViewState] = useState<View>({ x: 80, y: 120, z: 0.6 })
  const setView = useCallback((fn: (v: View) => View) => setViewState(fn), [])
  const [frames, setFrames] = useState<FrameData[]>(() => saved?.frames ?? initialFrames())
  const [selectedId, setSelected] = useState<string | null>(null)
  const [theme, setTheme] = useState(() => (saved && themes.some((t) => t.id === saved.theme) ? saved.theme : "violet"))
  const [mode, setMode] = useState<Mode>(saved?.mode ?? "light")
  const [radius, setRadius] = useState(saved?.radius ?? 0.625)
  const [state, setState] = useState<DemoState>(saved?.state ?? "enabled")
  const [custom, setCustom] = useState<Layout["custom"]>(saved?.custom)
  const [listView, setListView] = useState(() => window.innerWidth < 720)
  const [dialog, setDialog] = useState<null | "import" | "share" | "report">(null)
  const [report, setReport] = useState<ReportRow[]>([])
  const [reduced, setReduced] = useState(false)
  const [a11y, setA11y] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const selected = frames.find((f) => f.id === selectedId) ?? null
  const selectedEntry = selected ? registry[selected.kind] : null
  useEffect(() => {
    if (!selectedId) setCodeOpen(false)
  }, [selectedId])

  // Global theme → <html>. Frames without an override inherit it.
  useLayoutEffect(() => {
    const root = document.documentElement
    for (const [k, v] of Object.entries(themeVars(theme, mode))) root.style.setProperty(k, v)
    root.style.setProperty("--radius", `${radius}rem`)
    root.classList.toggle("dark", mode === "dark")
    root.style.colorScheme = mode
  }, [theme, mode, radius])

  const layout: Layout = { v: 1, theme, mode, radius, state, frames, custom }
  useEffect(() => {
    const t = setTimeout(() => saveLocal(layout), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, mode, radius, state, frames, custom])
  const applyLayout = (l: Layout) => {
    const r = restore(l)!
    setFrames(r.frames)
    setTheme(themes.some((t) => t.id === r.theme) ? r.theme : "violet")
    setMode(r.mode)
    setRadius(r.radius)
    setState(r.state)
    setCustom(r.custom)
    setSelected(null)
    setTimeout(() => fit(), 50)
  }

  const fit = useCallback((ids?: string[], reserveRight = 0) => {
    const v = fitView(worldRef.current, window.innerWidth - reserveRight, window.innerHeight, ids)
    if (v) setViewState({ ...v, y: v.y + 30 }) // leave room for the toolbar
  }, [])
  // when the code panel opens, move the frame out from under it
  useEffect(() => {
    if (codeOpen && selectedId) fit([selectedId], Math.min(500, window.innerWidth - 24))
  }, [codeOpen, selectedId, fit])
  useEffect(() => {
    const t = setTimeout(() => fit(["intro", ...categories[0].built, ...categories[1].built]), 50)
    return () => clearTimeout(t)
  }, [fit])

  const center = () => [window.innerWidth / 2, window.innerHeight / 2] as const
  const zoomBy = (f: number) => setView((v) => zoomAt(v, f, ...center()))
  const zoomReset = () => setView((v) => zoomAt(v, 1 / v.z, ...center()))

  const update = (id: string, patch: Partial<FrameData>) => setFrames((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  const remove = (id: string) => {
    setFrames((fs) => fs.filter((f) => f.id !== id))
    setSelected(null)
  }
  const resetLayout = () => {
    setFrames(initialFrames())
    setSelected(null)
    clearLocal()
    setTimeout(() => fit(), 30)
  }
  const remixSelected = () => {
    if (!selected) return
    update(selected.id, { theme: pick(themes).id, mode: pick(["light", "dark"] as const), radius: pick(RADII), state: selected.kind === "intro" || selected.kind === "springlab" ? undefined : pick(["enabled", "hover", "enabled"] as const) })
  }
  const remixCanvas = () => {
    setTheme(pick(themes.filter((t) => t.id !== theme)).id)
    setMode(pick(["light", "dark"] as const))
    setRadius(pick(RADII))
  }
  const openReport = () => {
    // scan before the dialog opens: the overlay would hide the frames from the scanner
    const rows: ReportRow[] = []
    for (const c of categories)
      for (const kind of c.built) {
        const el = worldRef.current?.querySelector(`[data-frame="${kind}"] [data-frame-body]`)
        if (!el) continue
        const r = scan(el)
        rows.push({ title: registry[kind].title, category: c.title, ...r })
      }
    setReport(rows)
    setDialog("report")
  }
  const clearComparison = () => {
    setFrames((fs) => fs.filter((f) => f.group !== "compare"))
    setTimeout(() => fit(), 30)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable) return
      if (e.shiftKey && e.code === "Digit1") fit()
      else if (e.shiftKey && e.code === "Digit0") zoomReset()
      else if ((e.key === "=" || e.key === "+") && !e.metaKey && !e.ctrlKey) zoomBy(1.2)
      else if (e.key === "-" && !e.metaKey && !e.ctrlKey) zoomBy(1 / 1.2)
      else if (e.key === "Escape") codeOpen ? setCodeOpen(false) : setSelected(null)
      else if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey && selectedEntry?.file) setCodeOpen((o) => !o)
      else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) remove(selectedId)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const bottomOf = (keep: FrameData[]) =>
    Math.max(
      ...[...(worldRef.current?.querySelectorAll<HTMLElement>("[data-frame]") ?? [])]
        .filter((e) => keep.some((r) => r.id === e.dataset.frame))
        .map((e) => e.offsetTop + e.offsetHeight),
    )

  const duplicate = (f: FrameData) => {
    const rs = [...(worldRef.current?.querySelectorAll<HTMLElement>("[data-frame]") ?? [])].map((el) => ({
      x: el.offsetLeft, y: el.offsetTop - 40, w: el.offsetWidth, h: el.offsetHeight + 40,
    }))
    const el = worldRef.current?.querySelector<HTMLElement>(`[data-frame="${f.id}"]`)
    const h = (el?.offsetHeight ?? 320) + 40
    const nextTheme = themes[(themes.findIndex((t) => t.id === (f.theme ?? theme)) + 1) % themes.length].id
    for (let k = 1; k < 40; k++) {
      const x = f.x + (k % 8) * (f.w + 40)
      const y = f.y + Math.floor(k / 8) * (h + 40)
      if (rs.every((r) => x + f.w < r.x || x > r.x + r.w || y + h < r.y || y > r.y + r.h)) {
        const id = newId(f.kind)
        setFrames((fs) => [...fs, { ...f, id, x, y, theme: nextTheme, group: undefined }])
        setSelected(id)
        return
      }
    }
  }

  const showStates = (f: FrameData) => {
    const rest = frames.filter((x) => x.group !== "compare")
    const y = bottomOf(rest) + 280
    const row = (["enabled", "hover", "disabled"] as const).map((st, i) => ({ ...f, id: newId(`state-${f.kind}-${st}`), x: i * (f.w + 40), y, state: st, group: "compare" as const }))
    setFrames([...rest, ...row])
    setTimeout(() => fit(row.map((r) => r.id)), 30)
  }

  const compare = (f: FrameData) => {
    const rest = frames.filter((x) => x.group !== "compare")
    const el = worldRef.current?.querySelector<HTMLElement>(`[data-frame="${f.id}"]`)
    const h = (el?.offsetHeight ?? 320) + 110
    const y = bottomOf(rest) + 280
    const row = themes.flatMap((t, i) =>
      (["light", "dark"] as const).map((m, j) => ({
        id: newId(`cmp-${t.id}-${m}`), kind: f.kind, w: f.w, x: i * (f.w + 40), y: y + j * h, theme: t.id, mode: m, state: f.state, group: "compare" as const,
      })),
    )
    setFrames([...rest, ...row])
    setTimeout(() => fit(row.map((r) => r.id)), 30)
  }

  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"}>
      <TooltipProvider delayDuration={250}>
        <div className="relative h-full w-full">
          {listView ? (
            <ListView
              theme={theme}
              mode={mode}
              state={state}
              onOpenCode={(kind) => {
                setListView(false)
                setSelected(kind)
                setTimeout(() => setCodeOpen(true), 80)
              }}
            />
          ) : (
          <Canvas view={view} setView={setView} worldRef={worldRef} onBackgroundClick={() => setSelected(null)}>
            <Sections zoom={view.z} />
            {frames.map((f) => (
              <Frame
                key={f.id}
                frame={f}
                zoom={view.z}
                selected={selectedId === f.id}
                globalTheme={theme}
                globalMode={mode}
                globalState={state}
                a11y={a11y}
                onSelect={() => setSelected(f.id)}
                onFocus={() => fit([f.id])}
                onChange={(p) => update(f.id, p)}
              />
            ))}
          </Canvas>
          )}

          <Toolbar
            theme={theme}
            setTheme={setTheme}
            mode={mode}
            setMode={setMode}
            radius={radius}
            setRadius={setRadius}
            state={state}
            setState={setState}
            reduced={reduced}
            setReduced={setReduced}
            a11y={a11y}
            setA11y={setA11y}
            zoom={view.z}
            zoomIn={() => zoomBy(1.2)}
            zoomOut={() => zoomBy(1 / 1.2)}
            zoomReset={zoomReset}
            fit={() => fit()}
            resetLayout={resetLayout}
            comparing={frames.some((f) => f.group === "compare")}
            clearComparison={clearComparison}
            selected={selected}
            updateSelected={(p) => selected && update(selected.id, p)}
            focusSelected={() => selected && fit([selected.id])}
            statesSelected={() => selected && showStates(selected)}
            compareSelected={() => selected && compare(selected)}
            duplicateSelected={() => selected && duplicate(selected)}
            removeSelected={() => selected && remove(selected.id)}
            deselect={() => setSelected(null)}
            codeOpen={codeOpen}
            toggleCode={() => setCodeOpen((o) => !o)}
            remixSelected={remixSelected}
            remixCanvas={remixCanvas}
            openImport={() => setDialog("import")}
            openShare={() => setDialog("share")}
            openReport={() => {
              if (listView) {
                setListView(false)
                setTimeout(openReport, 300)
              } else openReport()
            }}
            listView={listView}
            toggleListView={() => {
              setListView((v) => !v)
              setSelected(null)
              setTimeout(() => fit(), 60)
            }}
          />

          <ImportThemeDialog
            open={dialog === "import"}
            onOpenChange={(o) => setDialog(o ? "import" : null)}
            onImport={(name, parsed) => {
              const id = registerCustomTheme(name, parsed)
              setCustom({ name, light: parsed.light, dark: parsed.dark })
              if (selected) update(selected.id, { theme: id })
              else setTheme(id)
              if (parsed.radius?.endsWith("rem")) setRadius(parseFloat(parsed.radius))
            }}
          />
          <ShareDialog open={dialog === "share"} onOpenChange={(o) => setDialog(o ? "share" : null)} layout={layout} onLoad={applyLayout} />
          <A11yReportDialog
            open={dialog === "report"}
            onOpenChange={(o) => setDialog(o ? "report" : null)}
            rows={report}
            context={`${themeById(theme).name} theme, ${mode} mode, ${state} state`}
          />

          <AnimatePresence>
            {codeOpen && selectedEntry?.file && (
              <CodePanel
                key="code"
                file={selectedEntry.file}
                title={selectedEntry.title}
                category={categories.find((c) => c.built.includes(selectedEntry.kind))?.title ?? ""}
                onClose={() => setCodeOpen(false)}
              />
            )}
          </AnimatePresence>

          <A11yInspector enabled={a11y} />
          <span className="sr-only">{Object.keys(registry).length} components</span>
        </div>
      </TooltipProvider>
    </MotionConfig>
  )
}
