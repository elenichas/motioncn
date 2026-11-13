/**
 * The panel for a group of hand-written buttons: what the code says about them, and what each becomes.
 * Decide for the whole group, for every button with the same look, or one by one; the frame on the canvas
 * shows the result next to the original as you go.
 */
import { useState } from "react"
import { motion } from "motion/react"
import { Check, ClipboardCopy, Combine, Eraser, Sparkles, X } from "lucide-react"
import type { Project } from "@/projects"
import { cn } from "@/lib/utils"
import type { Entry } from "./types"
import { matchProps, buttonKey, consolidationBrief, describe, lookName, mainLook, outcome, primitiveName, suggest, type ButtonGroup, type Choice, type Consolidation, type RawButton } from "./consolidate"

type Props = {
  project: Project
  entry: Entry
  group: ButtonGroup
  consolidation: Consolidation
  /** The plan is confirmed: the group counts as decided on the canvas. */
  confirmed: boolean
  setConfirmed: (on: boolean, note: string) => void
  onClose: () => void
}

const h = "mb-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase"
const same = (a?: Choice, b?: Choice) => JSON.stringify(a) === JSON.stringify(b)

/** Everything a button could become, most likely first. */
function optionsFor(project: Project, b: RawButton, g: ButtonGroup, name: string): Choice[] {
  const out: Choice[] = [suggest(b, g)]
  const add = (c: Choice) => !out.some((x) => same(x, c)) && out.push(c)
  const size: Record<string, string> = matchProps(b).size ? { size: matchProps(b).size } : {}
  // the library component of the same shape first, then the others
  const libs = [...project.scan.libraryButtons].sort((x, y) => Number(y.name === b.match?.component) - Number(x.name === b.match?.component))
  for (const lib of libs) {
    // only the library's button primitives: ones with colour variants, icon circles, text links, or the match itself
    if (lib.name !== b.match?.component && !Object.keys(lib.props).length && !/place-items-center|underline/.test(lib.base)) continue
    const props = lib.props as Record<string, Record<string, unknown>>
    const coloured = Object.keys(props).find((p) => Object.values(props[p]).some((v) => /(^|\s)bg-/.test((v as { cls: string }).cls)))
    if (coloured) for (const v of Object.keys(props[coloured])) add({ action: "replace", component: lib.name, props: { ...(lib.name === b.match?.component ? size : {}), [coloured]: v } })
    else add({ action: "replace", component: lib.name, props: {} })
    if (lib.name === b.match?.component && coloured) add({ action: "replace", component: lib.name, props: size, addVariant: lookName(mainLook(b)) })
  }
  add({ action: "new", name, variant: lookName(mainLook(b)) })
  add({ action: "keep" })
  add({ action: "remove" })
  return out
}

function Pick({ value, options, onChange, label }: { value?: Choice; options: Choice[]; onChange: (c: Choice | null) => void; label: string }) {
  const i = options.findIndex((o) => same(o, value))
  return (
    <select
      aria-label={label}
      value={value ? (i >= 0 ? i : "custom") : ""}
      onChange={(e) => onChange(e.target.value === "" ? null : options[Number(e.target.value)])}
      className={cn("h-8 w-full rounded-md border bg-transparent px-1.5 text-[12px]", value ? "border-emerald-500/60 font-medium" : "text-muted-foreground")}
    >
      <option value="">Not decided</option>
      {value && i < 0 && <option value="custom">{describe(value)}</option>}
      {options.map((o, n) => (
        <option key={n} value={n}>
          {n === 0 ? "Suggested: " : ""}
          {describe(o)}
        </option>
      ))}
    </select>
  )
}

export function ConsolidatePanel({ project, entry, group: g, consolidation, confirmed, setConfirmed, onClose }: Props) {
  const { plan, choose, setRule } = consolidation
  const [name, setName] = useState(() => (g.buttons.map((b) => plan.choices[buttonKey(b)]).find((c) => c?.action === "new") as { name: string } | undefined)?.name ?? primitiveName(g.kind))
  const [copied, setCopied] = useState(false)
  const o = outcome(g, plan)
  const all = (pick: (b: RawButton) => Choice | null, list = g.buttons) => choose(Object.fromEntries(list.map((b) => [buttonKey(b), pick(b)])))
  const libMatches = g.buttons.filter((b) => b.match).length
  const summary = o.targets.length || o.removed || o.kept
    ? [...o.targets.map((t) => `${t.name} (${t.variants.length} variant${t.variants.length > 1 ? "s" : ""})`), ...(o.kept ? [`${o.kept} kept`] : []), ...(o.removed ? [`${o.removed} removed`] : [])].join(" · ")
    : ""
  const copy = async () => {
    await navigator.clipboard.writeText(consolidationBrief(project, { choices: Object.fromEntries(g.buttons.map((b) => [buttonKey(b), plan.choices[buttonKey(b)]]).filter(([, c]) => c)), rules: { [g.kind]: plan.rules[g.kind] ?? "" } }).join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const btn = "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium hover:bg-accent disabled:opacity-40"

  return (
    <motion.aside initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }} transition={{ duration: 0.2 }} className="bg-background absolute top-16 right-3 bottom-3 flex w-[420px] flex-col overflow-hidden rounded-xl border shadow-lg" aria-label={`${entry.title} details`}>
      <header className="flex items-start gap-2 border-b p-4">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs">Consolidate</p>
          <h2 className="text-base font-semibold">{g.kind}s</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {g.buttons.length} hand-written · {g.looks.length} look{g.looks.length > 1 ? "s" : ""} · {o.decided} decided
          </p>
        </div>
        <button onClick={onClose} aria-label="Close details" className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
          <X className="size-4" />
        </button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <section>
          <h3 className={h}>What the code says</h3>
          <ul className="space-y-1.5 text-[13px] leading-snug">
            <li>
              <span className="font-medium">{g.looks.length} different look{g.looks.length > 1 ? "s" : ""}</span> across {new Set(g.buttons.map((b) => b.file)).size} files: {g.looks.map((l) => `${l.name} ×${l.buttons.length}`).join(", ")}. These are separate buttons in separate places, so different looks here are either real variants or drift. That is the decision to make.
            </li>
            {g.stateful.length > 0 && (
              <li>
                <span className="font-medium">{g.stateful.length} change look with a condition</span> ({g.stateful.map((b) => `${b.label}: ${[...new Set(b.states.map((s) => s.when.replace(/^not \(?|\)$/g, "")))].join(", ")}`).join("; ")}). Those are states of one button and stay together.
              </li>
            )}
            {g.buttons.some((b) => b.disabled) && <li>{g.buttons.filter((b) => b.disabled).length} can be disabled, shown as an extra “disabled” look.</li>}
          </ul>
        </section>

        <section>
          <h3 className={h}>Decide for the whole group</h3>
          <div className="flex flex-wrap gap-1.5">
            <button className={btn} onClick={() => all((b) => suggest(b, g))} title="The library component of the same shape and look where there is one; otherwise a new component for the group">
              <Sparkles className="size-3.5" /> Use the suggestions{libMatches ? ` · ${libMatches} have a library match` : ""}
            </button>
            <button className={btn} onClick={() => all((b) => ({ action: "new", name, variant: lookName(mainLook(b)) }))} title="One new library component; each distinct look becomes a variant, and buttons that look the same share one">
              <Combine className="size-3.5" /> Combine into one new component
            </button>
            <button className={btn} disabled={!o.decided} onClick={() => (all(() => null), setConfirmed(false, ""))}>
              <Eraser className="size-3.5" /> Clear
            </button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-[12px]">
            <span className="text-muted-foreground shrink-0">New component name</span>
            <input value={name} onChange={(e) => setName(e.target.value.replace(/[^\w]/g, ""))} className="h-7 min-w-0 flex-1 rounded-md border bg-transparent px-2 font-mono" />
          </label>
        </section>

        <section>
          <h3 className={h}>Rule for the repo</h3>
          <textarea
            value={plan.rules[g.kind] ?? ""}
            onChange={(e) => setRule(g.kind, e.target.value)}
            rows={2}
            placeholder="In your words, for whoever writes the next one. For example: a primary action is black, a secondary one is white; never grey."
            className="w-full resize-y rounded-md border bg-transparent p-2 text-[12.5px] leading-snug"
          />
        </section>

        {g.looks.map((l) => {
          const first = l.buttons[0]
          const opts = optionsFor(project, first, g, name)
          const shared = l.buttons.every((b) => same(plan.choices[buttonKey(b)], plan.choices[buttonKey(first)])) ? plan.choices[buttonKey(first)] : undefined
          return (
            <section key={l.sig}>
              <h3 className={h}>
                Look: {l.name} · {l.buttons.length}
              </h3>
              {l.buttons.length > 1 && (
                <div className="bg-muted/60 mb-2 rounded-lg p-2">
                  <p className="mb-1.5 text-[12px]">These {l.buttons.length} look the same. One decision for all of them removes the duplicates:</p>
                  <Pick label={`All ${l.name} buttons`} value={shared} options={opts} onChange={(c) => all(() => c, l.buttons)} />
                </div>
              )}
              <ul className="space-y-2">
                {l.buttons.map((b) => (
                  <li key={buttonKey(b)} className="rounded-lg border p-2">
                    <div className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{b.label}</span>
                      <span className="text-muted-foreground shrink-0 font-mono text-[11px]">{b.file.split("/").pop()}:{b.line}</span>
                    </div>
                    {b.match && !b.match.exact && <p className="text-muted-foreground mt-0.5 text-[11.5px] leading-snug">Shaped like {b.match.component}, but {b.match.notes.join("; ")}.</p>}
                    {b.match?.exact && !!b.match.notes.length && <p className="text-muted-foreground mt-0.5 text-[11.5px] leading-snug">{b.match.notes.join("; ")}.</p>}
                    <div className="mt-1.5">
                      <Pick label={`${b.label} becomes`} value={plan.choices[buttonKey(b)]} options={optionsFor(project, b, g, name)} onChange={(c) => choose({ [buttonKey(b)]: c })} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <footer className="space-y-2 border-t p-3">
        <p className="text-[12.5px] leading-snug">
          <span className="font-semibold">
            {o.decided} of {o.total} decided.
          </span>{" "}
          {summary ? `${g.buttons.length} hand-written buttons become: ${summary}.` : "Nothing changes in the repo until you send the plan."}
        </p>
        <div className="flex gap-1.5">
          <button
            disabled={!o.decided}
            onClick={() => setConfirmed(!confirmed, summary)}
            className={cn("flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-[12.5px] font-medium disabled:opacity-40", confirmed ? "bg-emerald-600 text-white" : "bg-foreground text-background")}
            title="Marks the group as decided. The plan goes to the repo with the other decisions (Decisions menu), or copy it here."
          >
            <Check className="size-3.5" /> {confirmed ? "Plan confirmed" : "Confirm plan"}
          </button>
          <button disabled={!o.decided} onClick={copy} className={cn(btn, "h-8")}>
            {copied ? <Check className="size-3.5" /> : <ClipboardCopy className="size-3.5" />} {copied ? "Copied" : "Copy brief for the repo"}
          </button>
        </div>
      </footer>
    </motion.aside>
  )
}
