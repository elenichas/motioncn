import { useEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  Accessibility,
  ClipboardList,
  Ellipsis,
  LayoutList,
  Paintbrush,
  Share2,
  Shuffle,
  CircleHelp,
  Code2,
  Copy,
  Crosshair,
  Hand,
  Layers,
  LayoutGrid,
  Maximize,
  Minus,
  MousePointerClick,
  Moon,
  Plus,
  RotateCcw,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  X,
  ZoomIn,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { themes, type Mode } from "@/lib/themes"
import { registry, type FrameData } from "@/registry"
import type { DemoState } from "@/components/motion/demo-state"
import { cn } from "@/lib/utils"
import { SELECT } from "./frame"

/* ---------- building blocks ---------- */

/** Every toolbar control is wrapped in a shadcn Tooltip: a title plus what it does. */
function Tip({ title, desc, children }: { title: string; desc?: ReactNode; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="font-semibold">{title}</p>
        {desc && <div className="opacity-75">{desc}</div>}
      </TooltipContent>
    </Tooltip>
  )
}

function IconButton({ label, onClick, children, active, danger }: { label: string; onClick: () => void; children: ReactNode; active?: boolean; danger?: boolean }) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-colors [&_svg]:size-4",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
        danger && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  )
}

const Divider = () => <span className="bg-border mx-0.5 h-5 w-px shrink-0" />
const Label = ({ children }: { children: ReactNode }) => <span className="text-muted-foreground hidden px-1 text-[11px] font-medium tracking-wide uppercase min-[1700px]:inline">{children}</span>

const stateInfo: Record<DemoState, string> = {
  enabled: "fully interactive",
  hover: "playing its hover animation without a pointer",
  disabled: "showing its disabled look and ignoring input",
}

/* ---------- toolbar ---------- */

type Props = {
  theme: string
  setTheme: (t: string) => void
  mode: Mode
  setMode: (m: Mode) => void
  radius: number
  setRadius: (r: number) => void
  state: DemoState
  setState: (s: DemoState) => void
  reduced: boolean
  setReduced: (r: boolean) => void
  a11y: boolean
  setA11y: (v: boolean) => void
  zoom: number
  zoomIn: () => void
  zoomOut: () => void
  zoomReset: () => void
  fit: () => void
  resetLayout: () => void
  comparing: boolean
  clearComparison: () => void
  selected: FrameData | null
  updateSelected: (p: Partial<FrameData>) => void
  focusSelected: () => void
  statesSelected: () => void
  compareSelected: () => void
  duplicateSelected: () => void
  removeSelected: () => void
  deselect: () => void
  codeOpen: boolean
  toggleCode: () => void
  remixSelected: () => void
  remixCanvas: () => void
  openImport: () => void
  openShare: () => void
  openReport: () => void
  listView: boolean
  toggleListView: () => void
}

/**
 * One toolbar, one set of controls. Theme, mode, radius and state edit
 * every frame by default; when a frame is selected the same controls edit
 * only that frame (shown by the scope chip), and frame actions appear.
 */
export function Toolbar(p: Props) {
  const sel = p.selected
  const entry = sel ? registry[sel.kind] : null
  const scope = entry ? entry.title : "all frames"

  // values shown = the selected frame's (falling back to canvas defaults) or the defaults
  const theme = sel?.theme ?? p.theme
  const mode = sel?.mode ?? p.mode
  const radius = sel?.radius ?? p.radius
  const state = sel?.state ?? p.state
  const overridden = !!sel && (sel.theme || sel.mode || sel.radius !== undefined || sel.state)

  const set = {
    theme: (t: string) => (sel ? p.updateSelected({ theme: t }) : p.setTheme(t)),
    mode: (m: Mode) => (sel ? p.updateSelected({ mode: m }) : p.setMode(m)),
    radius: (r: number) => (sel ? p.updateSelected({ radius: r }) : p.setRadius(r)),
    state: (s: DemoState) => (sel ? p.updateSelected({ state: s }) : p.setState(s)),
  }
  const forScope = sel ? `this frame (${scope})` : "every frame"

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
      <motion.div layout className="bg-background/90 pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-xl border p-1.5 shadow-lg backdrop-blur" transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}>
        <Tip title="motioncn" desc="Animated extensions for shadcn/ui on an infinite canvas.">
          <div className="flex items-center gap-1.5 px-2 text-sm font-semibold">
            <Sparkles className="text-primary size-4" /> motioncn
          </div>
        </Tip>
        <Divider />

        {/* scope: what the settings below apply to */}
        <Tip
          title={sel ? `Editing: ${scope}` : "Editing: all frames"}
          desc={sel ? "Theme, mode, radius and state now change only this frame. Deselect (Esc or click the canvas) to edit all frames." : "Theme, mode, radius and state change every frame. Click a frame to edit just that one."}
        >
          <motion.div
            layout
            className={cn("flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium", sel ? "bg-[#0d99ff]/10" : "bg-muted text-muted-foreground")}
            style={sel ? { color: SELECT } : undefined}
          >
            <span className={cn("size-2 rounded-full", sel ? "bg-current" : "border-muted-foreground border border-dashed")} />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={scope} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="max-w-32 truncate">
                {sel ? scope : "All frames"}
              </motion.span>
            </AnimatePresence>
            {sel && (
              <button aria-label="Deselect" onClick={p.deselect} className="-mr-1 rounded p-0.5 hover:bg-[#0d99ff]/15">
                <X className="size-3" />
              </button>
            )}
          </motion.div>
        </Tip>
        <AnimatePresence>
          {overridden && (
            <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden">
              <Tip title="Reset to canvas settings" desc="Clears this frame's own theme, mode, radius and state so it follows the canvas again.">
                <IconButton label="Reset frame settings" onClick={() => p.updateSelected({ theme: undefined, mode: undefined, radius: undefined, state: undefined })}>
                  <Undo2 />
                </IconButton>
              </Tip>
            </motion.span>
          )}
        </AnimatePresence>

        {/* theme */}
        <Label>Theme</Label>
        <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Theme">
          {themes.map((t) => (
            <Tip key={t.id} title={`${t.name} theme`} desc={`Apply the shadcn ${t.name} colours to ${forScope}.`}>
              <button role="radio" aria-checked={theme === t.id} aria-label={`${t.name} theme`} onClick={() => set.theme(t.id)} className="relative flex size-6 items-center justify-center rounded-full">
                {theme === t.id && <motion.span layoutId="theme-ring" className="border-foreground absolute inset-0 rounded-full border-2" transition={{ type: "spring", bounce: 0.3 }} />}
                <span className="size-3.5 rounded-full" style={{ background: t.swatch }} />
              </button>
            </Tip>
          ))}
        </div>
        <Tip title={mode === "light" ? "Switch to dark mode" : "Switch to light mode"} desc={`Toggles light/dark for ${forScope}.`}>
          <button aria-label="Toggle dark mode" onClick={() => set.mode(mode === "light" ? "dark" : "light")} className="hover:bg-accent text-muted-foreground hover:text-foreground relative flex size-8 items-center justify-center overflow-hidden rounded-md">
            <motion.span key={mode} initial={{ y: 20, rotate: -90, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} className="flex">
              {mode === "light" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </motion.span>
          </button>
        </Tip>
        <Tip title={`Corner radius · ${radius}rem`} desc={`Sets shadcn's --radius token for ${forScope}.`}>
          <span className="flex items-center gap-2 px-1">
            <Label>Radius</Label>
            <Slider className="w-16" value={[radius]} min={0} max={1.25} step={0.125} onValueChange={([r]) => set.radius(r)} aria-label="Radius" />
          </span>
        </Tip>
        <Divider />

        {/* component state */}
        <Label>State</Label>
        <div className="bg-muted flex rounded-md p-0.5" role="radiogroup" aria-label="Component state">
          {(["enabled", "hover", "disabled"] as const).map((s) => (
            <Tip key={s} title={s[0].toUpperCase() + s.slice(1)} desc={`Shows ${forScope} ${stateInfo[s]}.`}>
              <button
                role="radio"
                aria-checked={state === s}
                onClick={() => set.state(s)}
                className={cn("relative h-7 rounded-[5px] px-2 text-xs font-medium capitalize", state === s ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {state === s && <motion.span layoutId="state-pill" className="bg-background absolute inset-0 rounded-[5px] shadow-sm" transition={{ type: "spring", bounce: 0.25, duration: 0.4 }} />}
                <span className="relative">{s}</span>
              </button>
            </Tip>
          ))}
        </div>

        {/* frame actions: only when a frame is selected */}
        <AnimatePresence initial={false}>
          {sel && (
            <motion.div
              key="frame-actions"
              className="flex items-center gap-0.5 overflow-hidden"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ type: "spring", bounce: 0.1, duration: 0.35 }}
            >
              <Divider />
              {entry?.file && (
                <Tip title={p.codeOpen ? "Hide code" : "View code"} desc="Install command, usage, dependencies and full source for this component. Shortcut: C">
                  <IconButton label="View code" onClick={p.toggleCode} active={p.codeOpen}>
                    <Code2 />
                  </IconButton>
                </Tip>
              )}
              <Tip title="Zoom to frame" desc="Centres and zooms the canvas on this frame. Also: double-click its title.">
                <IconButton label="Zoom to frame" onClick={p.focusSelected}>
                  <Crosshair />
                </IconButton>
              </Tip>
              {sel.kind !== "intro" && (
                <Tip title="Show all states" desc="Lays out Enabled, Hover and Disabled side by side below the canvas.">
                  <IconButton label="Show all states" onClick={p.statesSelected}>
                    <Layers />
                  </IconButton>
                </Tip>
              )}
              <Tip title="Compare themes" desc="Lays this component out in every theme, light and dark.">
                <IconButton label="Compare themes" onClick={p.compareSelected}>
                  <LayoutGrid />
                </IconButton>
              </Tip>
              <Tip title="Remix" desc="Gives this frame a random theme, mode, radius and state. Click again for another combination.">
                <IconButton label="Remix frame" onClick={p.remixSelected}>
                  <Shuffle />
                </IconButton>
              </Tip>
              <Tip title="Duplicate" desc="Adds a copy next to it using the next theme.">
                <IconButton label="Duplicate" onClick={p.duplicateSelected}>
                  <Copy />
                </IconButton>
              </Tip>
              <Tip title="Remove frame" desc="Deletes this frame. Reset layout brings it back. Shortcut: Delete">
                <IconButton label="Remove frame" onClick={p.removeSelected} danger>
                  <Trash2 />
                </IconButton>
              </Tip>
            </motion.div>
          )}
        </AnimatePresence>
        <Divider />

        {/* canvas-wide view options */}
        <Tip title="Reduce motion" desc="Turns animations down to simple fades, as a user with reduced-motion settings would see them. Applies to the whole canvas.">
          <label className="text-muted-foreground flex items-center gap-2 px-1 text-xs">
            <Switch checked={p.reduced} onCheckedChange={p.setReduced} aria-label="Reduce motion" />
            <span className="hidden 2xl:inline">Reduce motion</span>
          </label>
        </Tip>
        <Tip title={p.a11y ? "Accessibility check: on" : "Accessibility check"} desc="Hover any element in a frame to see its WCAG checks: contrast, font size, target size, accessible name and keyboard access. Each frame shows a summary badge.">
          <IconButton label="Accessibility check" onClick={() => p.setA11y(!p.a11y)} active={p.a11y}>
            <Accessibility />
          </IconButton>
        </Tip>
        {!p.listView && (
          <>
        <Divider />
        <Tip title="Zoom out" desc="Shortcut: −">
          <IconButton label="Zoom out" onClick={p.zoomOut}>
            <Minus />
          </IconButton>
        </Tip>
        <Tip title="Zoom to 100%" desc="Shows components at their real size. Shortcut: Shift+0">
          <button onClick={p.zoomReset} className="hover:bg-accent h-8 w-12 rounded-md text-xs font-medium tabular-nums">
            {Math.round(p.zoom * 100)}%
          </button>
        </Tip>
        <Tip title="Zoom in" desc="Shortcut: +">
          <IconButton label="Zoom in" onClick={p.zoomIn}>
            <Plus />
          </IconButton>
        </Tip>
        <Tip title="Fit to screen" desc="Zooms out to show every frame. Shortcut: Shift+1">
          <IconButton label="Fit to screen" onClick={p.fit}>
            <Maximize />
          </IconButton>
        </Tip>
          </>
        )}
        <MoreMenu
          items={[
            { icon: Paintbrush, label: "Import theme…", desc: "Paste CSS from ui.shadcn.com/themes or tweakcn.", onSelect: p.openImport },
            { icon: Share2, label: "Share layout…", desc: "Copy a link or code for this exact canvas.", onSelect: p.openShare },
            { icon: ClipboardList, label: "Accessibility report…", desc: "Scan every component and export the results.", onSelect: p.openReport },
            { icon: Shuffle, label: "Remix canvas", desc: "Random theme, mode and radius for every frame.", onSelect: p.remixCanvas },
            { icon: LayoutList, label: p.listView ? "Canvas view" : "List view", desc: p.listView ? "Back to the infinite canvas." : "All components in a scrolling list. Easier on phones.", onSelect: p.toggleListView },
            { icon: RotateCcw, label: "Reset layout", desc: "Frames back in place; copies and per-frame settings removed.", onSelect: p.resetLayout },
          ]}
        />
        <Tip
          title="How to use the canvas"
          desc={
            <span className="mt-1 block space-y-0.5">
              <span className="flex items-center gap-1.5"><Hand className="size-3" /> Drag the background or hold Space to pan</span>
              <span className="flex items-center gap-1.5"><ZoomIn className="size-3" /> Mouse wheel, pinch or Ctrl/⌘ + scroll to zoom</span>
              <span className="flex items-center gap-1.5"><MousePointerClick className="size-3" /> Click a frame to edit just that one; drag its title to move it</span>
              <span className="flex items-center gap-1.5"><Crosshair className="size-3" /> Double-click a frame title to zoom to it</span>
            </span>
          }
        >
          <IconButton label="Help" onClick={() => {}}>
            <CircleHelp />
          </IconButton>
        </Tip>
        <AnimatePresence>
          {p.comparing && (
            <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <Tip title="Clear comparison" desc="Removes the theme or state comparison frames and returns to the full canvas.">
                <button onClick={p.clearComparison} className="bg-primary text-primary-foreground flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium">
                  <X className="size-3.5" /> Clear comparison
                </button>
              </Tip>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

/* ---------- More menu ---------- */

type MenuItem = { icon: typeof Share2; label: string; desc: string; onSelect: () => void }

/** Overflow menu: each item shows what it does right under its label. */
function MoreMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("pointerdown", close)
    window.addEventListener("keydown", esc)
    return () => (window.removeEventListener("pointerdown", close), window.removeEventListener("keydown", esc))
  }, [open])
  return (
    <div ref={ref} className="relative">
      <Tip title="More" desc="Import a theme, share the layout, export an accessibility report, remix, list view, reset.">
        <IconButton label="More options" onClick={() => setOpen((o) => !o)} active={open}>
          <Ellipsis />
        </IconButton>
      </Tip>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="bg-popover text-popover-foreground absolute top-full right-0 z-50 mt-2 w-72 origin-top-right rounded-xl border p-1.5 shadow-xl"
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
          >
            {items.map((it, i) => (
              <motion.button
                key={it.label}
                role="menuitem"
                className="hover:bg-accent focus-visible:bg-accent flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left outline-none"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => (setOpen(false), it.onSelect())}
              >
                <it.icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="block text-sm font-medium">{it.label}</span>
                  <span className="text-muted-foreground block text-xs">{it.desc}</span>
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
