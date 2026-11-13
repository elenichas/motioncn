/**
 * Preview renderers for the Aspra canvas. Each key matches an entry id in manifest.ts.
 * Components are imported from the scanned repo as they are; only the sample data is chosen here.
 */
import "./preview.css"
import * as React from "react"
import { ArrowRight, Ban, CalendarClock, Check, ChevronRight, Clock, LoaderCircle, Plus, Share, X } from "lucide-react"
import { ArchMark, Button, Chip, Counter, FlowHeader, FullScreen, IconButton, OptionRow, Photo, SectionTitle, Segmented, Sheet, TextLink, Wordmark } from "@repo/aspra/components/aspra/ui"
import { ExtrasPicker, SuitePrefs, TripPrefs } from "@repo/aspra/components/aspra/shared"
import { StayCalendar } from "@repo/aspra/components/aspra/entry/stay-calendar"
import { Gate } from "@repo/aspra/components/aspra/entry/gate"
import { StatusPill } from "@repo/aspra/components/aspra/tabs/today"
import { AspraApp } from "@repo/aspra/components/aspra/app"
import { IMG, sampleProfiles } from "@repo/aspra/components/aspra/data"
import scan from "./scan.json"

// Repo code is untyped here (see src/projects/repos.d.ts), so the few types the previews need are restated.
type Prefs = Record<string, unknown>
type ExtraId = string
type GuestKind = "new" | "booked" | "returning"
type Phase = "before" | "during" | "after"
type TabId = "today" | "plan" | "concierge" | "journal"

/* ─── parts: the library components specimens use ─────────── */

/** A draft fix can replace any of these; specimens read them from context instead of the imports. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parts: Record<string, React.ComponentType<any>> = { ArchMark, Button, Chip, Counter, FlowHeader, FullScreen, IconButton, OptionRow, Photo, SectionTitle, Segmented, Sheet, StatusPill, TextLink, Wordmark, TripPrefs, SuitePrefs, ExtrasPicker, StayCalendar, Gate }
export const Parts = React.createContext(parts)
const useParts = () => React.useContext(Parts)
/** Render a part by name, so a draft fix of it is what shows. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Part({ name, ...props }: { name: string } & Record<string, any>) {
  const C = useParts()[name]
  return <C {...props} />
}

/** Every component file in the repo, loaded on demand, for previews of code the manifest does not cover yet. */
export const modules = import.meta.glob<Record<string, unknown>>(["@repo/aspra/components/aspra/**/*.tsx", "!@repo/aspra/components/aspra/suite3d/**"])

/** Backdrop for components rendered with no props (new code from main). */
export function AutoFrame({ children }: { children: React.ReactNode }) {
  return <div className="ambient min-h-full p-5">{children}</div>
}

/* ─── helpers ─────────────────────────────────────────────── */

function Sheetish({ children, dark, className }: { children: React.ReactNode; dark?: boolean; className?: string }) {
  return <div className={`${dark ? "ambient-dark on-dark text-white" : "ambient"} min-h-full p-5 ${className ?? ""}`}>{children}</div>
}
function Spec({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-2 font-mono text-[12px] tracking-tight opacity-70">{label}</div>
      {children}
    </div>
  )
}
const noop = () => {}

/* ─── Foundations ─────────────────────────────────────────── */

const SEMANTIC = new Set(["background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "primary", "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground", "accent", "accent-foreground", "destructive", "destructive-foreground", "border", "input", "ring"])

function useComputed(names: string[]) {
  const [vals, setVals] = React.useState<Record<string, string>>({})
  React.useEffect(() => {
    const read = () => {
      const probe = document.createElement("div")
      document.body.appendChild(probe)
      const out: Record<string, string> = {}
      for (const n of names) {
        probe.style.color = `var(--${n})`
        out[n] = getComputedStyle(probe).color
      }
      probe.remove()
      setVals(out)
    }
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] })
    return () => mo.disconnect()
  }, [names])
  return vals
}

function Tokens() {
  const colours = React.useMemo(() => scan.tokens.filter((t) => !/^(radius|ease|chart|sidebar)/.test(t.name)), [])
  const brand = colours.filter((t) => !SEMANTIC.has(t.name))
  const semantic = colours.filter((t) => SEMANTIC.has(t.name))
  const computed = useComputed(React.useMemo(() => colours.map((t) => t.name), [colours]))
  const Swatch = ({ name, value }: { name: string; value: string }) => (
    <div className="flex items-center gap-3">
      <span className="size-10 shrink-0 rounded-xl border border-ink/10" style={{ background: `var(--${name})` }} />
      <span className="min-w-0">
        <span className="block font-mono text-[12px] font-semibold text-ink">--{name}</span>
        <span className="block truncate font-mono text-[12px] text-ink-3">{value.startsWith("var(") ? `→ ${value.slice(6, -1)}` : computed[name] ?? value}</span>
      </span>
    </div>
  )
  return (
    <div className="bg-white p-6">
      <h3 className="mb-3 text-[13px] font-semibold text-ink-2">Brand tokens · used by components</h3>
      <div className="grid grid-cols-3 gap-x-6 gap-y-3">{brand.map((t) => <Swatch key={t.name} {...t} />)}</div>
      <h3 className="mt-7 mb-3 text-[13px] font-semibold text-ink-2">shadcn semantic tokens · mapped onto brand, used by no component</h3>
      <div className="grid grid-cols-3 gap-x-6 gap-y-3">{semantic.map((t) => <Swatch key={t.name} {...t} />)}</div>
    </div>
  )
}

const PROPOSED_TYPE = [12, 14, 15, 17, 22, 26, 38, 56, 64]
function TypeScale() {
  const sizes = [...scan.typeSizes].sort((a, b) => a.px - b.px)
  const max = Math.max(...sizes.map((s) => s.count))
  return (
    <div className="bg-white p-6">
      <div className="mb-4 flex items-center gap-4 text-[12px] text-ink-3">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-sea" /> fits the proposed 7-step scale</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-clay" /> would move to the nearest step</span>
      </div>
      <div className="space-y-1.5">
        {sizes.map((s) => {
          const keep = PROPOSED_TYPE.includes(s.px)
          return (
            <div key={s.value} className="flex items-baseline gap-4">
              <span className="w-16 shrink-0 font-mono text-[12px] text-ink-3">{s.px}px</span>
              <span className="w-24 shrink-0">
                <span className={`block h-1.5 rounded-full ${keep ? "bg-sea" : "bg-clay"}`} style={{ width: `${(s.count / max) * 100}%`, minWidth: 4 }} />
              </span>
              <span className="w-10 shrink-0 text-right font-mono text-[12px] text-ink-3">×{s.count}</span>
              <span className={`${s.value} min-w-0 truncate leading-tight ${s.px >= 22 ? "font-display" : ""} ${keep ? "text-ink" : "text-ink-3"}`}>Kleftiko by caique</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Radii() {
  const radii = scan.radii.filter((r) => !/rounded-(t|b|l|r|tl|tr|bl|br)-/.test(r.value))
  return (
    <div className="grid grid-cols-4 gap-5 bg-white p-6">
      {radii.map((r) => (
        <div key={r.value}>
          <div className={`${r.value} h-20 border-2 border-sea bg-sea-wash`} />
          <div className="mt-2 font-mono text-[12px] font-semibold text-ink">{r.value}</div>
          <div className="font-mono text-[12px] text-ink-3">×{r.count}</div>
        </div>
      ))}
    </div>
  )
}

function Surfaces() {
  const light = scan.utilities.filter((u) => ["glass", "glass-strong"].includes(u.name))
  const dark = scan.utilities.filter((u) => ["glass-dark", "glass-smoke"].includes(u.name))
  const card = (u: (typeof scan.utilities)[number], onDark: boolean) => (
    <div key={u.name} className={`${u.name} rounded-2xl p-5 ${onDark ? "text-white" : "text-ink"}`}>
      <div className="font-mono text-[12px] font-semibold">.{u.name}</div>
      <p className={`mt-1 text-[14px] ${onDark ? "text-white/75" : "text-ink-2"}`}>{u.note}</p>
    </div>
  )
  return (
    <div>
      <div className="ambient grid grid-cols-2 gap-4 p-6">{light.map((u) => card(u, false))}</div>
      <div className="ambient-dark grid grid-cols-2 gap-4 p-6">{dark.map((u) => card(u, true))}</div>
    </div>
  )
}

/* ─── Primitives ──────────────────────────────────────────── */

const VARIANTS = ["primary", "dark", "light", "sulphur", "outline", "ghost"] as const
function Buttons() {
  const { Button } = useParts()
  return (
    <Sheetish>
      <div className="space-y-5">
        {(["lg", "md", "sm"] as const).map((size) => (
          <Spec key={size} label={`size="${size}"`}>
            <div className="flex flex-wrap gap-2">
              {VARIANTS.map((v) => (
                <Button key={v} variant={v} size={size}>{v}</Button>
              ))}
            </div>
          </Spec>
        ))}
        <Spec label="disabled">
          <div className="flex flex-wrap gap-2">
            {VARIANTS.map((v) => (
              <Button key={v} variant={v} disabled>{v}</Button>
            ))}
          </div>
        </Spec>
        <Spec label="block, with icon">
          <Button block>
            Book this suite <ArrowRight className="size-4" />
          </Button>
        </Spec>
      </div>
    </Sheetish>
  )
}

function ButtonLoading() {
  const { Button } = useParts()
  return (
    <Sheetish>
      <div className="space-y-5">
        <Spec label="loading · proposed (aria-busy, label kept)">
          <div className="flex flex-wrap gap-2">
            {(["primary", "sulphur", "light"] as const).map((v) => (
              <Button key={v} variant={v} aria-busy disabled className="disabled:opacity-80">
                <LoaderCircle className="size-4 animate-spin" aria-hidden /> Booking…
              </Button>
            ))}
          </div>
        </Spec>
        <Spec label="done · proposed (brief confirmation before moving on)">
          <Button variant="sulphur">
            <Check className="size-4" aria-hidden /> Booked
          </Button>
        </Spec>
      </div>
    </Sheetish>
  )
}

function IconButtons() {
  const { IconButton } = useParts()
  return (
    <Sheetish>
      <div className="space-y-5">
        <Spec label="as used in FlowHeader and Sheet (hover:bg-ink/5)">
          <div className="flex gap-2">
            <IconButton label="Close" className="hover:bg-ink/5"><X className="size-5" /></IconButton>
            <IconButton label="Share" className="hover:bg-ink/5"><Share className="size-5" /></IconButton>
          </div>
        </Spec>
        <Spec label="as used in Counter (border, 40px)">
          <div className="flex gap-2">
            <IconButton label="More" className="size-10 border border-ink/15"><Plus className="size-4" /></IconButton>
            <IconButton label="More" disabled className="size-10 border border-ink/15 disabled:opacity-35"><Plus className="size-4" /></IconButton>
          </div>
        </Spec>
        <Spec label="filled (each caller writes its own)">
          <div className="flex gap-2">
            <IconButton label="Next" className="bg-ink text-white"><ChevronRight className="size-5" /></IconButton>
            <IconButton label="Next" className="glass"><ChevronRight className="size-5" /></IconButton>
          </div>
        </Spec>
      </div>
    </Sheetish>
  )
}

function TextLinks() {
  const { TextLink } = useParts()
  return (
    <Sheetish>
      <div className="space-y-4">
        <Spec label="TextLink (library)">
          <TextLink onClick={noop}>See all experiences</TextLink>
        </Spec>
        <Spec label="hand-written copy · today.tsx:334">
          <button className="-my-2 h-11 shrink-0 px-2 text-[13.5px] font-medium text-sea-deep underline-offset-4 hover:underline">See all experiences</button>
        </Spec>
      </div>
    </Sheetish>
  )
}

function Chips() {
  const { Chip } = useParts()
  const [on, setOn] = React.useState<string[]>(["Sea"])
  const toggle = (x: string) => setOn((s) => (s.includes(x) ? s.filter((y) => y !== x) : [...s, x]))
  const items = ["Sea", "Food", "Wellness", "History"]
  return (
    <div>
      <Sheetish>
        <Spec label='tone="light" · click to toggle'>
          <div className="flex flex-wrap gap-2">{items.map((x) => <Chip key={x} selected={on.includes(x)} onClick={() => toggle(x)}>{x}</Chip>)}</div>
        </Spec>
      </Sheetish>
      <Sheetish dark>
        <Spec label='tone="dark"'>
          <div className="flex flex-wrap gap-2">{items.map((x) => <Chip key={x} tone="dark" selected={on.includes(x)} onClick={() => toggle(x)}>{x}</Chip>)}</div>
        </Spec>
      </Sheetish>
    </div>
  )
}

function OptionRows() {
  const { OptionRow } = useParts()
  const [pick, setPick] = React.useState("ferry")
  const [extras, setExtras] = React.useState<string[]>(["boat"])
  return (
    <Sheetish>
      <div className="space-y-5">
        <Spec label='role="radio"'>
          <div className="space-y-2">
            <OptionRow selected={pick === "ferry"} onClick={() => setPick("ferry")} title="By ferry" detail="Seajets from Piraeus, 3h 40m" aside="Free pickup" />
            <OptionRow selected={pick === "plane"} onClick={() => setPick("plane")} title="By plane" detail="Athens to Milos, 40m" />
          </div>
        </Spec>
        <Spec label='role="checkbox"'>
          <div className="space-y-2">
            {["boat", "dinner"].map((x) => (
              <OptionRow key={x} role="checkbox" selected={extras.includes(x)} onClick={() => setExtras((s) => (s.includes(x) ? s.filter((y) => y !== x) : [...s, x]))} title={x === "boat" ? "Boat transfer" : "Private dinner"} aside={x === "boat" ? "€120" : "€240"} />
            ))}
          </div>
        </Spec>
      </div>
    </Sheetish>
  )
}

function Segments() {
  const { Segmented } = useParts()
  const [a, setA] = React.useState<"before" | "during" | "after">("during")
  const [b, setB] = React.useState<"day" | "night">("day")
  return (
    <div>
      <Sheetish>
        <Spec label='tone="light" · 3 options'>
          <Segmented label="Trip stage" value={a} onChange={setA} options={[{ id: "before", label: "Before" }, { id: "during", label: "During" }, { id: "after", label: "After" }]} />
        </Spec>
      </Sheetish>
      <Sheetish dark>
        <Spec label='tone="dark" · 2 options'>
          <Segmented tone="dark" label="Light" value={b} onChange={setB} options={[{ id: "day", label: "Day" }, { id: "night", label: "Night" }]} />
        </Spec>
      </Sheetish>
    </div>
  )
}

function Counters() {
  const { Counter } = useParts()
  const [n, setN] = React.useState(2)
  return (
    <Sheetish>
      <div className="glass rounded-2xl px-4">
        <Counter label="Adults" value={n} min={1} max={4} onChange={setN} />
        <Counter label="Children" hint="Under 12" value={0} onChange={noop} />
        <Counter label="Nights" hint="At the maximum" value={6} onChange={noop} />
      </div>
    </Sheetish>
  )
}

function FlowHeaders() {
  const { FlowHeader } = useParts()
  return (
    <div>
      <Sheetish className="space-y-4">
        <Spec label="back, close, step 2 of 5">
          <FlowHeader onBack={noop} onClose={noop} title="Your stay" step={1} steps={5} />
        </Spec>
        <Spec label="title only">
          <FlowHeader title="Preferences" />
        </Spec>
      </Sheetish>
      <Sheetish dark>
        <Spec label='tone="dark"'>
          <FlowHeader tone="dark" onBack={noop} onClose={noop} title="Suite tour" step={3} steps={5} />
        </Spec>
      </Sheetish>
    </div>
  )
}

function SectionTitles() {
  const { SectionTitle, TextLink } = useParts()
  return (
    <Sheetish className="space-y-4">
      <SectionTitle>Your days</SectionTitle>
      <SectionTitle action={<TextLink onClick={noop}>See all</TextLink>}>On the island</SectionTitle>
    </Sheetish>
  )
}

function SheetOpen() {
  const { Sheet, Button, OptionRow } = useParts()
  const [pick, setPick] = React.useState("king")
  return (
    <div className="ambient relative h-full">
      <div className="p-5 text-[15px] text-ink-2">The screen behind the sheet.</div>
      <Sheet
        open
        onClose={noop}
        title="Bed setup"
        footer={
          <Button block variant="primary">
            Save
          </Button>
        }
      >
        <div className="space-y-2">
          <OptionRow selected={pick === "king"} onClick={() => setPick("king")} title="One king bed" detail="180 × 200 cm" />
          <OptionRow selected={pick === "twin"} onClick={() => setPick("twin")} title="Two single beds" detail="90 × 200 cm each" />
        </div>
      </Sheet>
    </div>
  )
}

function FullScreens() {
  const { FullScreen, FlowHeader } = useParts()
  return (
    <FullScreen>
      <FlowHeader onBack={noop} onClose={noop} title="Book a suite" step={0} steps={4} />
      <div className="px-5 py-6">
        <h1 className="font-display text-[38px] text-ink">Choose your suite</h1>
        <p className="mt-2 text-[15px] text-ink-2">Seven suites cut into the white rock.</p>
      </div>
    </FullScreen>
  )
}

function Photos() {
  const { Photo } = useParts()
  return (
    <Sheetish className="grid grid-cols-2 gap-3">
      <Spec label="loaded">
        <Photo src={IMG.pool} alt="Pool suite" className="aspect-[4/3] w-full rounded-2xl" />
      </Spec>
      <Spec label="loading / missing image">
        <Photo src="/missing.jpg" alt="" className="aspect-[4/3] w-full rounded-2xl" />
      </Spec>
    </Sheetish>
  )
}

function Brand() {
  const { Wordmark, ArchMark } = useParts()
  return (
    <div>
      <Sheetish className="flex items-center gap-6">
        <Wordmark />
        <ArchMark />
        <ArchMark className="size-12" />
      </Sheetish>
      <Sheetish dark className="flex items-center gap-6">
        <Wordmark tone="light" />
        <ArchMark className="text-white" />
      </Sheetish>
    </div>
  )
}

function StatusPills() {
  const { StatusPill } = useParts()
  return (
    <Sheetish className="flex gap-2">
      <StatusPill status="confirmed" />
      <StatusPill status="requested" />
    </Sheetish>
  )
}

function StatusPillsProposal() {
  const pill = "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium"
  return (
    <Sheetish className="flex flex-wrap gap-2">
      <span className={`${pill} bg-sea-wash text-sea-deep`}><Check className="size-3" aria-hidden /> Confirmed</span>
      <span className={`${pill} bg-sulphur/40 text-ink`}><Clock className="size-3" aria-hidden /> Requested</span>
      <span className={`${pill} border border-dashed border-ink/25 text-ink-2`}><CalendarClock className="size-3" aria-hidden /> Pending approval</span>
      <span className={`${pill} bg-clay-wash text-clay`}><X className="size-3" aria-hidden /> Declined</span>
      <span className={`${pill} bg-chalk-2 text-ink-3 line-through`}><Ban className="size-3" aria-hidden /> Cancelled</span>
    </Sheetish>
  )
}

/* ─── Composites ──────────────────────────────────────────── */

const booked = sampleProfiles.booked

function WithPrefs({ children }: { children: (p: Prefs, set: (x: Partial<Prefs>) => void) => React.ReactNode }) {
  const [prefs, setPrefs] = React.useState<Prefs>(booked.prefs)
  return <Sheetish>{children(prefs, (x) => setPrefs((p) => ({ ...p, ...x })))}</Sheetish>
}

function Extras() {
  const [sel, setSel] = React.useState<ExtraId[]>(booked.booking!.extras as ExtraId[])
  return (
    <Sheetish>
      <Part name="ExtrasPicker" selected={sel} onToggle={(id: ExtraId) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))} />
    </Sheetish>
  )
}

function Calendar() {
  const [d, setD] = React.useState({ in: booked.booking!.checkIn, out: booked.booking!.checkOut })
  return (
    <Sheetish>
      <Part name="StayCalendar" checkIn={d.in} checkOut={d.out} suiteId="pool" onChange={(a: string, b: string) => setD({ in: a, out: b })} />
    </Sheetish>
  )
}

/** The real app, opening where a saved session left off. Storage is per frame (see preview main). */
function Screen({ phase, tab, kind }: { phase?: Phase; tab?: TabId; kind?: GuestKind }) {
  React.useState(() => {
    if (!phase) return
    const p = sampleProfiles.booked
    const saved = { kind: "booked", guest: p.guest, booking: p.booking, prefs: p.prefs, plan: p.plan, pastStay: sampleProfiles.returning.pastStay, phase, tab: tab ?? "today", requests: [], basket: [] }
    localStorage.setItem("aspra-state-v1", JSON.stringify(saved))
  })
  return <AspraApp initialKind={kind ?? null} />
}

/* ─── Inconsistencies ─────────────────────────────────────── */

// Drop positioning and outer spacing so a specimen sits in the grid; keep everything that makes it look the way it does.
const tidy = (cls: string) =>
  cls
    .split(/\s+/)
    .filter((c) => !/^(absolute|fixed|sticky|relative|inset-|top-|bottom-|left-|right-|z-|m[trblxy]?-|-m[trblxy]?-|pointer-events-|md:|lg:|sm:|w-\[|h-full|w-full|min-h-full|max-w-|flex-1|shrink-0|mx-auto)/.test(c))
    .join(" ")
const DARK_FILL = /(bg-obsidian|glass-smoke|glass-dark|bg-ink(?![-/]))/

function DriftSurfaces() {
  return (
    <div className="ambient p-6">
      <div className="grid grid-cols-4 gap-5">
        {scan.surfaces.map((g) => {
          const first = g.instances[0]
          const dark = DARK_FILL.test(g.fill)
          return (
            <div key={g.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2 font-mono text-[12px]">
                <span className="truncate font-semibold text-ink">{g.key}</span>
                <span className={`shrink-0 rounded-full px-1.5 ${g.count > 2 ? "bg-sea text-white" : "bg-ink/10 text-ink-2"}`}>×{g.count}</span>
              </div>
              <div className={dark ? "rounded-2xl bg-obsidian/0" : ""}>
                <div className={`${tidy(first.cls)} min-h-24 ${dark ? "text-white" : "text-ink"}`}>
                  <div className={/p[xy]?-|pl-/.test(g.pad) ? "" : "p-0"}>
                    <div className="text-[15px] font-medium">Sunset at the Kastro</div>
                    <div className={`text-[13.5px] ${dark ? "text-white/70" : "text-ink-3"}`}>Day 3 · 19:40 · 12 min walk</div>
                  </div>
                </div>
              </div>
              <div className="mt-1.5 space-y-0.5 font-mono text-[12px] text-ink-3">
                {g.instances.slice(0, 3).map((i) => (
                  <div key={i.file + i.line} className="truncate">{i.file.replace("components/aspra/", "")}:{i.line}</div>
                ))}
                {g.instances.length > 3 && <div>+{g.instances.length - 3} more</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const KIND_LABEL: Record<string, string> = { "Pill button": "Ask Nefeli", "Icon button": "M", "List row": "Arrival details", "Text link": "See all", "Calendar day": "14", Other: "Today" }
function DriftButtons() {
  const kinds = [...new Set(scan.rawButtons.map((b) => b.kind))]
  return (
    <div className="ambient space-y-6 p-6">
      {kinds.map((k) => {
        const list = scan.rawButtons.filter((b) => b.kind === k)
        return (
          <div key={k}>
            <div className="mb-2 text-[13px] font-semibold text-ink">
              {k} <span className="font-normal text-ink-3">×{list.length}</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {list.map((b) => {
                const dark = DARK_FILL.test(b.cls) || /text-white/.test(b.cls)
                return (
                  <div key={b.file + b.line}>
                    <div className={`flex min-h-16 items-center rounded-xl p-2 ${dark ? "bg-obsidian/0" : ""}`}>
                      <button type="button" tabIndex={-1} className={`${tidy(b.cls)} ${/text-white|text-sulphur/.test(b.cls) && !DARK_FILL.test(b.cls) ? "bg-obsidian" : ""}`}>
                        {k === "List row" ? (
                          <>
                            <span className="flex-1 text-left">{KIND_LABEL[k]}</span>
                            <ChevronRight className="size-4 opacity-60" aria-hidden />
                          </>
                        ) : (
                          KIND_LABEL[k]
                        )}
                      </button>
                    </div>
                    <div className="mt-1 truncate font-mono text-[12px] text-ink-3">{b.file.replace("components/aspra/", "")}:{b.line}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Recreated from source: neither component is exported, so the markup is copied verbatim. */
function RowLine() {
  return (
    <Sheetish className="grid grid-cols-2 gap-4">
      <Spec label="Row · booking-flow.tsx:686">
        <dl className="glass divide-y divide-border rounded-2xl px-4">
          <div className="flex items-baseline justify-between gap-4 py-3 text-[14.5px]"><dt className="text-ink-2">Pool suite, 6 nights</dt><dd className="tabular-nums">€3,240</dd></div>
          <div className="flex items-baseline justify-between gap-4 py-3 text-[14.5px]"><dt className="text-ink-2">Boat transfer</dt><dd className="tabular-nums">€120</dd></div>
          <div className="flex items-baseline justify-between gap-4 py-3 text-[14.5px] text-[16px] font-semibold"><dt>Total</dt><dd className="tabular-nums">€3,360</dd></div>
        </dl>
      </Spec>
      <Spec label="Line · stay-sheet.tsx:110">
        <dl className="glass divide-y divide-border rounded-2xl px-4">
          <div className="flex items-baseline justify-between gap-4 py-3"><dt className="text-ink-2">Pool suite, 6 nights</dt><dd className="tabular-nums">€3,240</dd></div>
          <div className="flex items-baseline justify-between gap-4 py-3"><dt className="text-ink-2">Boat transfer</dt><dd className="tabular-nums">€120</dd></div>
          <div className="flex items-baseline justify-between gap-4 py-3 text-[16px] font-semibold"><dt>Total</dt><dd className="tabular-nums">€3,360</dd></div>
        </dl>
      </Spec>
    </Sheetish>
  )
}

/* ─── registry ────────────────────────────────────────────── */

export const previews: Record<string, () => React.ReactNode> = {
  tokens: () => <Tokens />,
  "type-scale": () => <TypeScale />,
  radii: () => <Radii />,
  surfaces: () => <Surfaces />,

  button: () => <Buttons />,
  "button-loading": () => <ButtonLoading />,
  "icon-button": () => <IconButtons />,
  "text-link": () => <TextLinks />,
  chip: () => <Chips />,
  "option-row": () => <OptionRows />,
  segmented: () => <Segments />,
  counter: () => <Counters />,
  "flow-header": () => <FlowHeaders />,
  "section-title": () => <SectionTitles />,
  sheet: () => <SheetOpen />,
  "full-screen": () => <FullScreens />,
  photo: () => <Photos />,
  wordmark: () => <Brand />,
  "status-pill": () => <StatusPills />,
  "status-pill-proposal": () => <StatusPillsProposal />,

  "trip-prefs": () => <WithPrefs>{(p, set) => <Part name="TripPrefs" prefs={p} onChange={set} />}</WithPrefs>,
  "suite-prefs": () => <WithPrefs>{(p, set) => <Part name="SuitePrefs" compact prefs={p} onChange={set} />}</WithPrefs>,
  "extras-picker": () => <Extras />,
  "stay-calendar": () => <Calendar />,
  "screen-gate": () => <div className="ambient min-h-full"><Part name="Gate" onChoose={noop} /></div>,
  "screen-today-before": () => <Screen phase="before" tab="today" />,
  "screen-today-during": () => <Screen phase="during" tab="today" />,
  "screen-plan": () => <Screen phase="before" tab="plan" />,
  "screen-concierge": () => <Screen phase="during" tab="concierge" />,
  "screen-journal": () => <Screen phase="after" tab="journal" />,
  "screen-app": () => <Screen />,
  "screen-today-after": () => <Screen phase="after" tab="today" />,
  "screen-booking": () => <Screen kind="new" />,
  "screen-returning": () => <Screen kind="returning" />,

  "drift-surfaces": () => <DriftSurfaces />,
  "drift-buttons": () => <DriftButtons />,
  "drift-row-line": () => <RowLine />,
}
