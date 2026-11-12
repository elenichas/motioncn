import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Check, Copy, FileCode2, Package, Terminal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { highlight, infoFor, REGISTRY_IS_PLACEHOLDER, REGISTRY_URL } from "@/lib/source-info"
import { cn } from "@/lib/utils"

const tokenClass = {
  kw: "text-violet-700 dark:text-violet-300 font-medium",
  str: "text-emerald-700 dark:text-emerald-300",
  com: "text-muted-foreground italic",
  num: "text-amber-700 dark:text-amber-300",
  tag: "text-sky-700 dark:text-sky-300",
} as const

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 shrink-0"
      aria-label={done ? "Copied" : label}
      onClick={() => {
        try {
          navigator.clipboard?.writeText(text).catch(() => {})
        } catch {
          /* clipboard can be unavailable in a sandbox */
        }
        setDone(true)
        setTimeout(() => setDone(false), 1400)
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={String(done)} className="flex" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
          {done ? <Check className="text-emerald-600 dark:text-emerald-400" /> : <Copy />}
        </motion.span>
      </AnimatePresence>
    </Button>
  )
}

function Command({ text, label }: { text: string; label: string }) {
  return (
    <div className="bg-muted flex items-center gap-2 rounded-lg border py-1 pr-1 pl-3 font-mono text-xs">
      <span className="text-muted-foreground select-none">$</span>
      <code className="min-w-0 flex-1 overflow-x-auto py-1.5 whitespace-nowrap">{text}</code>
      <CopyButton text={text} label={label} />
    </div>
  )
}

function CodeBlock({ code, label, numbered, maxH }: { code: string; label: string; numbered?: boolean; maxH?: string }) {
  const lines = useMemo(() => code.replace(/\n$/, "").split("\n"), [code])
  return (
    <div className="bg-muted/50 relative rounded-lg border">
      <div className="absolute top-1.5 right-1.5 z-10">
        <CopyButton text={code} label={label} />
      </div>
      <pre className={cn("overflow-auto py-3 font-mono text-xs leading-5", maxH)} tabIndex={0} aria-label={label}>
        {lines.map((line, i) => (
          <div key={i} className="flex">
            {numbered && <span className="text-muted-foreground w-10 shrink-0 pr-3 text-right select-none">{i + 1}</span>}
            <code className={cn("pr-10 whitespace-pre", !numbered && "pl-3")}>
              {highlight(line).map((tok, j) => (
                <span key={j} className={tok.k ? tokenClass[tok.k] : undefined}>
                  {tok.t}
                </span>
              ))}
              {line === "" && " "}
            </code>
          </div>
        ))}
      </pre>
    </div>
  )
}

const Section = ({ icon: Icon, title, children }: { icon: typeof Terminal; title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h3 className="flex items-center gap-1.5 text-sm font-semibold">
      <Icon className="text-muted-foreground size-4" /> {title}
    </h3>
    {children}
  </section>
)

/**
 * Side panel for the selected frame: install command (shadcn registry), manual steps,
 * usage, dependencies and the full source — all derived from the component file.
 */
export function CodePanel({ file, title, category, onClose }: { file: string; title: string; category: string; onClose: () => void }) {
  const info = useMemo(() => infoFor(file), [file])
  const cli = `npx shadcn@latest add ${REGISTRY_URL}/r/${file}.json`
  const usage = `import { ${info.exportName} } from "@/components/${file}"\n\nexport default function Page() {\n  return <${info.exportName} />\n}\n`
  const npmCmd = `npm install ${info.npm.join(" ")}`
  const shadcnCmd = info.shadcn.length ? `npx shadcn@latest add ${info.shadcn.join(" ")}` : ""

  return (
    <motion.aside
      key="panel"
      role="complementary"
      aria-label={`${title} code`}
      className="bg-background/95 absolute top-20 right-3 bottom-3 z-30 flex w-[min(480px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl border shadow-2xl backdrop-blur"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <header className="flex items-start gap-3 border-b p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold">{title}</h2>
            <Badge variant="secondary">{category}</Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">{info.description}</p>
        </div>
        <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onClose} aria-label="Close code panel">
          <X />
        </Button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <Section icon={Terminal} title="Install">
          <Tabs defaultValue="cli">
            <TabsList className="w-full">
              <TabsTrigger value="cli">shadcn CLI</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
            </TabsList>
            <TabsContent value="cli" className="space-y-2 pt-1">
              <Command text={cli} label="Copy install command" />
              <p className="text-muted-foreground text-xs">
                Adds the component, the shadcn components it builds on and its npm packages.
                {REGISTRY_IS_PLACEHOLDER && " The domain is a placeholder until the registry is deployed (see README)."}
              </p>
            </TabsContent>
            <TabsContent value="manual" className="space-y-2 pt-1">
              <ol className="text-muted-foreground list-decimal space-y-2 pl-5 text-xs">
                <li>
                  Install npm packages
                  <div className="mt-1">
                    <Command text={npmCmd} label="Copy npm command" />
                  </div>
                </li>
                {shadcnCmd && (
                  <li>
                    Add the shadcn components
                    <div className="mt-1">
                      <Command text={shadcnCmd} label="Copy shadcn command" />
                    </div>
                  </li>
                )}
                <li>
                  Copy the source below into <code className="text-foreground">components/{file}.tsx</code>
                  {info.local.length > 0 && (
                    <>
                      , plus {info.local.map((l, i) => (
                        <span key={l}>
                          {i > 0 && ", "}
                          <code className="text-foreground">{l === "themes" ? "lib/themes.ts" : `${l}.tsx`}</code>
                        </span>
                      ))}
                    </>
                  )}
                </li>
              </ol>
            </TabsContent>
          </Tabs>
        </Section>

        <Section icon={FileCode2} title="Usage">
          <CodeBlock code={usage} label="Copy usage example" />
        </Section>

        <Section icon={Package} title="Built on">
          <div className="flex flex-wrap gap-1.5">
            {info.shadcn.map((d) => (
              <Badge key={d} variant="outline" className="capitalize">
                {d.replace("-", " ")}
              </Badge>
            ))}
            {info.local.map((d) => (
              <Badge key={d} variant="secondary">
                {d}
              </Badge>
            ))}
            {info.npm.map((d) => (
              <Badge key={d} variant="outline" className="font-mono">
                {d}
              </Badge>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">Outline: shadcn components and npm packages · filled: motioncn helpers installed with it.</p>
        </Section>

        <Section icon={FileCode2} title={`Source · ${file}.tsx`}>
          <CodeBlock code={info.source} label="Copy source" numbered maxH="max-h-[420px]" />
        </Section>
      </div>
    </motion.aside>
  )
}
