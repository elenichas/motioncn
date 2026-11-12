import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Check, CircleCheck, CircleX, Copy, TriangleAlert } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { parseThemeCss, type ParsedTheme } from "@/lib/themes"
import { decodeLayout, encodeLayout, shareLink, type Layout } from "@/lib/layout-store"
import type { Finding } from "@/lib/a11y"
import { cn } from "@/lib/utils"

function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = (text: string) => {
    try {
      navigator.clipboard?.writeText(text).catch(() => {})
    } catch {
      /* sandbox */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return { copied, copy }
}

function CopyLabel({ copied, label }: { copied: boolean; label: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={String(copied)} className="flex items-center gap-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
        {copied ? <Check /> : <Copy />} {copied ? "Copied" : label}
      </motion.span>
    </AnimatePresence>
  )
}

/* ---------- Import theme ---------- */

const EXAMPLE = `:root {
  --radius: 0.75rem;
  --primary: oklch(0.47 0.12 200);
  --primary-foreground: oklch(0.99 0 0);
  --ring: oklch(0.47 0.12 200);
}
.dark {
  --primary: oklch(0.47 0.12 200);
  --primary-foreground: oklch(0.99 0 0);
}`

export function ImportThemeDialog({ open, onOpenChange, onImport }: { open: boolean; onOpenChange: (o: boolean) => void; onImport: (name: string, t: ParsedTheme) => void }) {
  const [css, setCss] = useState("")
  const [name, setName] = useState("My theme")
  const parsed = css.trim() ? parseThemeCss(css) : null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import a theme</DialogTitle>
          <DialogDescription>
            Paste the CSS from ui.shadcn.com/themes or tweakcn (<code>:root</code> and <code>.dark</code> blocks). It's added as a theme you can apply to all frames or to one.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <label htmlFor="theme-name" className="text-sm font-medium">
            Name
          </label>
          <Input id="theme-name" value={name} onChange={(e) => setName(e.target.value)} />
          <label htmlFor="theme-css" className="text-sm font-medium">
            Theme CSS
          </label>
          <Textarea id="theme-css" value={css} onChange={(e) => setCss(e.target.value)} placeholder={EXAMPLE} className="h-56 font-mono text-xs" />
          <p className={cn("text-xs", css.trim() && !parsed ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
            {!css.trim()
              ? "Missing tokens fall back to Neutral, so even a few lines work."
              : parsed
                ? `Found ${parsed.found} tokens${parsed.radius ? ` and radius ${parsed.radius}` : ""}.`
                : "Couldn't find a :root { … } block with shadcn tokens."}
          </p>
          {parsed && (
            <div className="flex gap-2">
              {(["light", "dark"] as const).map((m) => (
                <div key={m} className="flex flex-1 items-center gap-2 rounded-md border p-2 text-xs" style={{ background: parsed[m].background, color: parsed[m].foreground }}>
                  <span className="size-5 rounded-full" style={{ background: parsed[m].primary }} />
                  <span className="rounded px-1.5 py-0.5" style={{ background: parsed[m].primary, color: parsed[m]["primary-foreground"] }}>
                    Button
                  </span>
                  <span className="ml-auto capitalize opacity-70">{m}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setCss(EXAMPLE)}>
            Use example
          </Button>
          <Button disabled={!parsed} onClick={() => parsed && (onImport(name.trim() || "Custom", parsed), onOpenChange(false))}>
            Import theme
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- Share / restore layout ---------- */

export function ShareDialog({ open, onOpenChange, layout, onLoad }: { open: boolean; onOpenChange: (o: boolean) => void; layout: Layout; onLoad: (l: Layout) => void }) {
  const link = shareLink(layout)
  const code = encodeLayout(layout)
  const { copied, copy } = useCopy()
  const [paste, setPaste] = useState("")
  const decoded = paste.trim() ? decodeLayout(paste) : null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this canvas</DialogTitle>
          <DialogDescription>
            Saves the theme, mode, radius, state and every frame's position and settings. Your canvas is also saved in this browser automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <label htmlFor="share-out" className="text-sm font-medium">
            {link ? "Link" : "Layout code"}
          </label>
          <div className="flex gap-2">
            <Input id="share-out" readOnly value={link ?? code} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button onClick={() => copy(link ?? code)} className="shrink-0">
              <CopyLabel copied={copied} label="Copy" />
            </Button>
          </div>
          {!link && <p className="text-muted-foreground text-xs">Links work once the canvas is deployed on its own site. Here, share the code and paste it below.</p>}
        </div>
        <div className="grid gap-2 border-t pt-4">
          <label htmlFor="share-in" className="text-sm font-medium">
            Open a shared layout
          </label>
          <Textarea id="share-in" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste a layout code or link" className="h-20 font-mono text-xs" />
          {paste.trim() && !decoded && <p className="text-destructive text-xs">That code isn't a valid layout.</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={!decoded}
            onClick={() => {
              const fromLink = paste.includes("layout=") ? decodeLayout(paste.split("layout=")[1].split("&")[0]) : decoded
              if (fromLink) (onLoad(fromLink), onOpenChange(false))
            }}
          >
            Open layout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- Accessibility report ---------- */

export type ReportRow = { title: string; category: string; issues: number; warnings: number; checked: number; findings: Finding[] }

export function A11yReportDialog({ open, onOpenChange, rows, context }: { open: boolean; onOpenChange: (o: boolean) => void; rows: ReportRow[]; context: string }) {
  const { copied, copy } = useCopy()
  const pass = rows.filter((r) => !r.issues).length
  const markdown = [
    `# motioncn accessibility report`,
    ``,
    `${context} · ${new Date().toLocaleDateString("en-GB")} · ${pass}/${rows.length} components pass WCAG AA checks`,
    ``,
    `| Component | Category | Elements checked | Result |`,
    `| --- | --- | --- | --- |`,
    ...rows.map((r) => `| ${r.title} | ${r.category} | ${r.checked} | ${r.issues ? `${r.issues} issue(s)` : r.warnings ? `pass, ${r.warnings} warning(s)` : "pass"} |`),
    ``,
    ...rows
      .filter((r) => r.findings.length)
      .flatMap((r) => [`## ${r.title}`, ...r.findings.map((f) => `- ${f.level === "fail" ? "✗" : "!"} ${f.check} ${f.value} — ${f.what}`), ``]),
    `Checks: text contrast (1.4.3), non-text contrast (1.4.11), target size (2.5.8), accessible name (4.1.2), keyboard focus (2.1.1), text under 12px.`,
  ].join("\n")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Accessibility report</DialogTitle>
          <DialogDescription>
            {context}. {pass} of {rows.length} components pass every WCAG AA check run here.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">Component</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 text-right font-medium">Checked</th>
                <th className="px-3 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr key={r.title} className="border-t" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.015 }}>
                  <td className="px-3 py-1.5 font-medium">{r.title}</td>
                  <td className="text-muted-foreground px-3 py-1.5">{r.category}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.checked}</td>
                  <td className="px-3 py-1.5">
                    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", r.issues ? "text-red-600 dark:text-red-400" : r.warnings ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400")}>
                      {r.issues ? <CircleX className="size-3.5" /> : r.warnings ? <TriangleAlert className="size-3.5" /> : <CircleCheck className="size-3.5" />}
                      {r.issues ? `${r.issues} issue${r.issues > 1 ? "s" : ""}` : r.warnings ? "Pass, warnings" : "Pass"}
                    </span>
                    {r.findings.length > 0 && (
                      <ul className="text-muted-foreground mt-0.5 text-xs">
                        {r.findings.slice(0, 3).map((f, j) => (
                          <li key={j}>
                            {f.check} {f.value} · {f.what}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button onClick={() => copy(markdown)}>
            <CopyLabel copied={copied} label="Copy as Markdown" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
