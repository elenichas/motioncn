import { useId, useState } from "react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { Calculator, Calendar, CreditCard, Palette, Settings, Smile, User } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command"
import { useDemoState } from "./demo-state"

const GROUPS = [
  { heading: "Suggestions", items: [{ icon: Calendar, label: "Calendar" }, { icon: Smile, label: "Search emoji" }, { icon: Calculator, label: "Calculator" }] },
  { heading: "Settings", items: [{ icon: User, label: "Profile", k: "⌘P" }, { icon: CreditCard, label: "Billing", k: "⌘B" }, { icon: Palette, label: "Theme", k: "⌘T" }, { icon: Settings, label: "Settings", k: "⌘S" }] },
]

/**
 * shadcn Command (cmdk) with a highlight that glides between results, results that
 * fade and reflow as you type, and an animated empty state. Arrow keys and Enter work as usual.
 * Hover: a result lights up under the pointer. Disabled: search and results disabled.
 */
export function CommandPalette() {
  const id = useId()
  const { disabled, forceHover } = useDemoState()
  const [value, setValue] = useState(forceHover ? "billing" : "calendar")
  const [query, setQuery] = useState("")
  const [picked, setPicked] = useState<string | null>(null)

  return (
    <div className="flex w-80 flex-col gap-2">
      <Command value={value} onValueChange={setValue} className="rounded-xl border shadow-md" loop>
        <CommandInput placeholder="Type a command or search…" value={query} onValueChange={setQuery} disabled={disabled} aria-label="Search commands" />
        <CommandList className="max-h-64">
          <CommandEmpty>
            <motion.span className="text-muted-foreground inline-block" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              No results for “{query}”
            </motion.span>
          </CommandEmpty>
          <LayoutGroup id={id}>
            {GROUPS.map((g) => (
              <CommandGroup key={g.heading} heading={g.heading}>
                {g.items.map((it) => {
                  const v = it.label.toLowerCase()
                  return (
                    <CommandItem key={it.label} value={v} disabled={disabled} onSelect={() => setPicked(it.label)} className="relative data-[selected=true]:bg-transparent">
                      {value === v && !disabled && <motion.span layoutId="cmd-highlight" className="bg-accent absolute inset-0 rounded-sm" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                      <it.icon className="relative" />
                      <span className="relative">{it.label}</span>
                      {"k" in it && <CommandShortcut className="relative">{it.k}</CommandShortcut>}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </LayoutGroup>
        </CommandList>
      </Command>
      <div className="h-5 text-center text-xs" aria-live="polite">
        <AnimatePresence mode="popLayout">
          {picked && (
            <motion.span key={picked} className="text-muted-foreground inline-block" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              Opened {picked}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
