import { Component as ComponentIcon, Workflow } from "lucide-react"
import { cn } from "@/lib/utils"

/** The canvases nested in a project. */
export type CanvasId = "components" | "flows"
export const CANVASES = [
  { id: "components" as const, label: "Components", hint: "The library, and what needs a decision", icon: ComponentIcon },
  { id: "flows" as const, label: "User flows", hint: "Every flow, screen by screen", icon: Workflow },
]

/** Switch between a project's canvases (toolbar). */
export function CanvasSwitch({ current, set }: { current: CanvasId; set: (c: CanvasId) => void }) {
  return (
    <div role="tablist" aria-label="Canvas" className="bg-muted flex items-center rounded-lg p-0.5">
      {CANVASES.map((c) => (
        <button
          key={c.id}
          role="tab"
          aria-selected={c.id === current}
          onClick={() => set(c.id)}
          title={c.hint}
          className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap transition-colors", c.id === current ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          <c.icon className="size-3.5" /> {c.label}
        </button>
      ))}
    </div>
  )
}
