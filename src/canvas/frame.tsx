import { useEffect, useRef, useState } from "react"
import { LayoutGroup } from "motion/react"
import { CircleCheck, CircleX, TriangleAlert } from "lucide-react"
import { DemoStateProvider, type DemoState } from "@/components/motion/demo-state"
import { registry, type FrameData } from "@/registry"
import { themeById, themeVars, type Mode } from "@/lib/themes"
import { scan, type Finding } from "@/lib/a11y"
import { cn } from "@/lib/utils"

type Props = {
  frame: FrameData
  zoom: number
  selected: boolean
  globalTheme: string
  globalMode: Mode
  globalState: DemoState
  a11y: boolean
  onSelect: () => void
  onChange: (patch: Partial<FrameData>) => void
  onFocus: () => void
}

export const SELECT = "#0d99ff" // canvas chrome colour, independent of the component theme

/** A canvas frame: label (drag to move, double-click to zoom) + a themed, stateful body. */
export function Frame({ frame, zoom, selected, globalTheme, globalMode, globalState, a11y, onSelect, onChange, onFocus }: Props) {
  const entry = registry[frame.kind]
  const Comp = entry.component
  const theme = frame.theme ?? globalTheme
  const mode = frame.mode ?? globalMode
  const state: DemoState = frame.state ?? globalState
  const [hover, setHover] = useState(false)
  const drag = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null)
  const body = useRef<HTMLDivElement>(null)
  const [audit, setAudit] = useState<{ issues: number; warnings: number; findings: Finding[] } | null>(null)

  // Accessibility mode: re-scan this frame periodically (content animates and changes)
  useEffect(() => {
    if (!a11y || frame.kind === "intro") return setAudit(null)
    const run = () => body.current && setAudit(scan(body.current))
    const t = setTimeout(run, 400)
    const id = setInterval(run, 2500)
    return () => (clearTimeout(t), clearInterval(id))
  }, [a11y, frame.kind, theme, mode, state, frame.radius])

  const onHeaderDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    onSelect()
    drag.current = { x: e.clientX, y: e.clientY, fx: frame.x, fy: frame.y }
    ;try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* synthetic pointer */ }
  }
  const onHeaderMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    onChange({ x: Math.round(d.fx + (e.clientX - d.x) / zoom), y: Math.round(d.fy + (e.clientY - d.y) / zoom) })
  }
  const end = () => (drag.current = null)

  return (
    <div
      data-frame={frame.id}
      className="absolute"
      style={{ left: frame.x, top: frame.y, width: frame.w }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onPointerDownCapture={onSelect}
    >
      {/* Label row: counter-scaled so it stays readable at any zoom, like Figma */}
      <div
        className="absolute bottom-full left-0 flex origin-bottom-left items-center gap-1 pb-1.5"
        style={{ width: frame.w * zoom, transform: `scale(${1 / zoom})`, opacity: zoom < 0.3 && !hover && !selected && !a11y ? 0 : 1, transition: "opacity .2s" }}
      >
        <div
          className="text-muted-foreground flex min-w-0 flex-1 cursor-move items-center gap-1.5 truncate text-xs font-medium"
          style={selected ? { color: SELECT } : undefined}
          onPointerDown={onHeaderDown}
          onPointerMove={onHeaderMove}
          onPointerUp={end}
          onPointerCancel={end}
          onDoubleClick={onFocus}
          title="Drag to move · double-click to zoom to this frame"
        >
          <span className="max-w-full shrink-0 truncate">{entry.title}</span>
          {entry.base !== "—" && <span className="min-w-0 truncate opacity-60">· {entry.base}</span>}
          {frame.theme && <span className="shrink-0 opacity-60">· {themeById(frame.theme).name}</span>}
          {frame.mode && <span className="shrink-0 capitalize opacity-60">· {frame.mode}</span>}
          {frame.state && <span className="shrink-0 capitalize opacity-60">· {frame.state}</span>}
          {frame.radius !== undefined && <span className="shrink-0 opacity-60">· r{frame.radius}</span>}
        </div>
        {audit && (
          <span
            data-a11y-findings={JSON.stringify(audit.findings)}
            title={audit.findings.length ? audit.findings.map((f) => `${f.level === "fail" ? "✗" : "!"} ${f.check} ${f.value} — ${f.what}`).join("\n") : "All checked elements pass WCAG AA. Hover elements for details."}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              audit.issues ? "bg-red-500/15 text-red-600" : audit.warnings ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600",
            )}
          >
            {audit.issues ? <CircleX className="size-3" /> : audit.warnings ? <TriangleAlert className="size-3" /> : <CircleCheck className="size-3" />}
            {audit.issues ? `${audit.issues} issue${audit.issues > 1 ? "s" : ""}` : audit.warnings ? `${audit.warnings} warning${audit.warnings > 1 ? "s" : ""}` : "AA pass"}
          </span>
        )}
      </div>

      {/* Body: theme tokens are scoped here via inline CSS variables */}
      <div
        ref={body}
        data-frame-body
        className={cn(
          "bg-background text-foreground relative flex min-h-72 items-center justify-center rounded-xl border p-8 shadow-sm transition-shadow",
          mode === "dark" && "dark",
          a11y && "cursor-help",
        )}
        style={{
          ...(themeVars(theme, mode) as React.CSSProperties),
          colorScheme: mode,
          // let the browser skip rendering frames that are far off-screen
          contentVisibility: "auto",
          containIntrinsicSize: "auto 320px",
          ...(frame.radius !== undefined ? ({ "--radius": `${frame.radius}rem` } as React.CSSProperties) : {}),
          boxShadow: selected ? `0 0 0 2px ${SELECT}` : undefined,
        }}
      >
        <DemoStateProvider value={state}>
          <fieldset disabled={state === "disabled"} data-force-hover={state === "hover" ? "" : undefined} className="contents">
            <LayoutGroup id={frame.id}>
              <Comp key={state} />
            </LayoutGroup>
          </fieldset>
        </DemoStateProvider>
      </div>
    </div>
  )
}
