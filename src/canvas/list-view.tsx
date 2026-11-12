import { useEffect, useRef } from "react"
import { LayoutGroup } from "motion/react"
import { DemoStateProvider, type DemoState } from "@/components/motion/demo-state"
import { categories, registry } from "@/registry"
import { themeVars, type Mode } from "@/lib/themes"
import { cn } from "@/lib/utils"

/**
 * Scrollable list of every component, grouped by category. Used on small screens
 * (and via the More menu) where an infinite canvas is awkward to navigate by touch.
 */
export function ListView({ theme, mode, state, onOpenCode }: { theme: string; mode: Mode; state: DemoState; onOpenCode: (kind: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  // some components (cmdk) scroll their selection into view on mount; start the list at the top
  useEffect(() => {
    const ids = [50, 300, 800].map((ms) => window.setTimeout(() => ref.current?.scrollTo(0, 0), ms))
    return () => ids.forEach(clearTimeout)
  }, [])
  return (
    <div ref={ref} className="bg-muted h-full overflow-y-auto px-3 pt-40 pb-10 sm:px-4 sm:pt-28">
      <div className="mx-auto max-w-3xl space-y-10">
        {categories.map((c) => (
          <section key={c.id} aria-labelledby={`cat-${c.id}`}>
            <h2 id={`cat-${c.id}`} className="text-lg font-semibold">
              {c.title} <span className="text-muted-foreground text-sm font-normal">· {c.blurb}</span>
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {c.built.map((kind) => {
                const e = registry[kind]
                const Comp = e.component
                return (
                  <article key={kind} className="min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <h3 className="font-medium">
                        {e.title} <span className="text-muted-foreground">· {e.base}</span>
                      </h3>
                      {e.file && (
                        <button className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline" onClick={() => onOpenCode(kind)}>
                          Code
                        </button>
                      )}
                    </div>
                    <div
                      className={cn("bg-background text-foreground flex min-h-64 items-center justify-center overflow-hidden rounded-xl border p-2 sm:p-6", mode === "dark" && "dark")}
                      style={{ ...(themeVars(theme, mode) as React.CSSProperties), colorScheme: mode, contentVisibility: "auto", containIntrinsicSize: "auto 320px" }}
                    >
                      <DemoStateProvider value={state}>
                        <fieldset disabled={state === "disabled"} data-force-hover={state === "hover" ? "" : undefined} className="contents">
                          <LayoutGroup id={`list-${kind}`}>
                            <div className="origin-center scale-[0.88] sm:scale-100">
                              <Comp key={state} />
                            </div>
                          </LayoutGroup>
                        </fieldset>
                      </DemoStateProvider>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

/**
 * One component on its own: `?embed=<file>&state=hover&mode=dark&theme=rose`.
 * Used by the visual regression tests, and handy for sharing a single component.
 */
export function EmbedView({ params }: { params: URLSearchParams }) {
  const file = params.get("embed")
  const entry = Object.values(registry).find((e) => e.file === file)
  const mode = (params.get("mode") === "dark" ? "dark" : "light") as Mode
  const theme = params.get("theme") ?? "violet"
  const state = (["enabled", "hover", "disabled"].includes(params.get("state") ?? "") ? params.get("state") : "enabled") as DemoState
  if (!entry) return <p className="p-8 text-sm">Unknown component “{file}”.</p>
  const Comp = entry.component
  return (
    <div className={cn("bg-background text-foreground flex min-h-full items-center justify-center p-10", mode === "dark" && "dark")} style={{ ...(themeVars(theme, mode) as React.CSSProperties), colorScheme: mode }}>
      <div data-embed={file} className="inline-flex p-6">
        <DemoStateProvider value={state}>
          <fieldset disabled={state === "disabled"} data-force-hover={state === "hover" ? "" : undefined} className="contents">
            <LayoutGroup id="embed">
              <Comp />
            </LayoutGroup>
          </fieldset>
        </DemoStateProvider>
      </div>
    </div>
  )
}
