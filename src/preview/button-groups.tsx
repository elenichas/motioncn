/**
 * The specimen for one group of hand-written buttons: one row per button, with every look it has in code
 * (its states) on the left, and what the reviewer's decision turns it into on the right.
 * Buttons are rebuilt from their class lists with their real labels; the "after" is the real library component.
 */
import { useEffect, useState, type ComponentType, type CSSProperties, type ReactNode } from "react"
import type { Project } from "@/projects"
import { buttonGroups, buttonKey, describe, groupId, lookName, mainLook, type Choice, type Plan, type RawButton } from "@/project/consolidate"

// Positioning and outer spacing belong to where the button sits, not to what it looks like.
const tidy = (cls: string) =>
  cls
    .split(/\s+/)
    .filter((c) => !/^(absolute|fixed|sticky|relative|inset-|top-|bottom-|left-|right-|z-|m[trblxy]?-|-m[trblxy]?-|pointer-events-|md:|lg:|sm:|w-\[|h-full|w-full|min-h-full|max-w-|flex-1|shrink-0|mx-auto)/.test(c))
    .join(" ")

/** Light text, or a see-through fill: the button was made for a dark surface. */
const onDark = (l: { fill: string; text: string }) => /text-(white|sulphur)/.test(l.text) ? !/^bg-(obsidian|ink|sea)(?![-/\w])|^bg-(obsidian|ink|sea)$/.test(l.fill) : /^(bg-white\/(1|2)\d?$|glass-smoke|glass-dark)/.test(l.fill)

const mono: CSSProperties = { font: "12px/1.35 ui-monospace, SFMono-Regular, monospace", color: "#6b7280" }
const cell: CSSProperties = { padding: "12px 14px", verticalAlign: "top", borderTop: "1px solid #e5e7eb" }

/** The words on the button. A label that is an expression in code ({p.title}) gets a stand-in. */
const words = (b: RawButton) => (/^\{.*\}$/.test(b.label) ? "Label" : / icon$/.test(b.label) ? (b.kind === "Icon button" ? b.label[0] : "Label") : b.kind === "Icon button" ? b.label[0] : b.label === "(no text)" ? "14" : b.label.length > 26 ? b.label.slice(0, 25) + "…" : b.label)

function Swatch({ dark, children }: { dark: boolean; children: ReactNode }) {
  return <div style={{ display: "inline-flex", alignItems: "center", minHeight: 56, maxWidth: 300, padding: 8, borderRadius: 12, background: dark ? "#14161c" : "transparent", color: dark ? "#fff" : undefined }}>{children}</div>
}

function Before({ b }: { b: RawButton }) {
  const stateful = b.states.length > 0
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
      {b.looks.map((l, i) => (
        <div key={i}>
          <Swatch dark={onDark(l)}>
            <button type="button" tabIndex={-1} className={tidy(l.cls)}>{words(b)}</button>
          </Swatch>
          <div style={{ ...mono, marginTop: 4, maxWidth: 220 }}>{stateful ? (l.when ? `when ${l.when}` : "default") : lookName(l)}</div>
        </div>
      ))}
      {b.disabled && (
        <div>
          <Swatch dark={onDark(mainLook(b))}>
            <button type="button" tabIndex={-1} disabled className={tidy(mainLook(b).cls)}>{words(b)}</button>
          </Swatch>
          <div style={{ ...mono, marginTop: 4 }}>disabled</div>
        </div>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function After({ b, choice, parts }: { b: RawButton; choice?: Choice; parts: Record<string, ComponentType<any>> }) {
  const note = (text: string, color = "#6b7280") => <div style={{ ...mono, color, marginTop: 4, maxWidth: 260 }}>{text}</div>
  if (!choice) return <div style={{ ...mono, paddingTop: 18 }}>Not decided</div>
  if (choice.action === "keep") return <div style={{ ...mono, paddingTop: 18, color: "#111827" }}>Kept as it is</div>
  if (choice.action === "remove") return <div style={{ ...mono, paddingTop: 18, color: "#b91c1c", textDecoration: "line-through" }}>{words(b)} · removed</div>
  const look = mainLook(b)
  if (choice.action === "new")
    return (
      <div>
        <Swatch dark={onDark(look)}>
          <button type="button" tabIndex={-1} className={tidy(look.cls)}>{words(b)}</button>
        </Swatch>
        {note(`<${choice.name} variant="${choice.variant}"> · new library component`, "#7c3aed")}
      </div>
    )
  const C = parts[choice.component]
  if (!C) return <div style={{ ...mono, paddingTop: 18 }}>{describe(choice)}</div>
  // A variant the library does not have yet is shown with this button's own colours passed in.
  const colours = choice.addVariant ? look.cls.split(/\s+/).filter((c) => /^(?:hover:)?(bg-|text-(?!\[)|glass|border|ring|backdrop)/.test(c)).join(" ") : undefined
  return (
    <div>
      <Swatch dark={onDark(look) && (!!choice.addVariant || !choice.props.variant)}>
        <C {...choice.props} label={b.label} onClick={() => {}} className={colours} tabIndex={-1}>{words(b)}</C>
      </Swatch>
      {note(describe(choice), choice.addVariant ? "#7c3aed" : "#047857")}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ButtonGroupSpecimen({ project, id, parts }: { project: Project; id: string; parts: Record<string, ComponentType<any>> }) {
  // The reviewer's plan is posted by the canvas (frames have their own storage).
  const [plan, setPlan] = useState<Plan>({ choices: {}, rules: {} })
  useEffect(() => {
    const on = (e: MessageEvent) => e.origin === location.origin && e.data?.type === "consolidate" && setPlan(e.data.plan)
    window.addEventListener("message", on)
    return () => window.removeEventListener("message", on)
  }, [])
  const g = buttonGroups(project).find((x) => groupId(x.kind) === id)
  if (!g) return <p style={{ padding: 16 }}>No button group “{id}”.</p>
  const th: CSSProperties = { ...mono, textAlign: "left", padding: "10px 14px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }
  return (
    <div style={{ background: "#f6f7f9", padding: 20 }}>
      {g.looks.map((l) => (
        <div key={l.sig} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", font: "600 13px/1.3 ui-sans-serif, system-ui, sans-serif", color: "#111827", display: "flex", gap: 8, alignItems: "baseline" }}>
            Look: {l.name}
            <span style={{ fontWeight: 400, color: "#6b7280" }}>
              {l.buttons.length} button{l.buttons.length > 1 ? "s" : ""}
              {l.buttons.length > 1 ? " that look the same: one component would do" : ""}
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 210 }}>Where</th>
                <th style={th}>In the repo now</th>
                <th style={{ ...th, width: 300 }}>After your decision</th>
              </tr>
            </thead>
            <tbody>
              {l.buttons.map((b) => (
                <tr key={buttonKey(b)} data-button={buttonKey(b)}>
                  <td style={cell}>
                    <div style={{ font: "500 13px/1.3 ui-sans-serif, system-ui, sans-serif", color: "#111827" }}>{b.label}</div>
                    <div style={{ ...mono, marginTop: 2 }}>{b.file.split("/").slice(-2).join("/")}:{b.line}</div>
                    {b.states.length > 0 && <div style={{ ...mono, marginTop: 6, color: "#0369a1" }}>{b.looks.length} states of one button</div>}
                  </td>
                  <td style={cell}><Before b={b} /></td>
                  <td style={{ ...cell, background: "#fafafa" }}><After b={b} choice={plan.choices[buttonKey(b)]} parts={parts} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
