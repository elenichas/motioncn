import { useId, useState } from "react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { CreditCard, KeyRound, User } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useDemoState } from "./demo-state"

const tabs = [
  { id: "account", label: "Account", icon: User },
  { id: "password", label: "Password", icon: KeyRound },
  { id: "billing", label: "Billing", icon: CreditCard },
] as const
type TabId = (typeof tabs)[number]["id"]

const content: Record<TabId, { title: string; field: string; value: string }> = {
  account: { title: "Profile", field: "Display name", value: "Ada Lovelace" },
  password: { title: "Security", field: "New password", value: "••••••••••" },
  billing: { title: "Plan", field: "Card number", value: "•••• 4242" },
}

/**
 * shadcn <Tabs> with a shared-layout pill and direction-aware panels.
 * Hover: a soft highlight glides to the hovered trigger. Disabled: triggers and fields disabled.
 */
export function SlidingTabs() {
  const id = useId()
  const { disabled, forceHover } = useDemoState()
  const [value, setValue] = useState<TabId>("account")
  const [over, setOver] = useState<TabId | null>(null)
  const [dir, setDir] = useState(1)
  const hoverTab = disabled ? null : forceHover ? "password" : over
  const change = (v: string) => {
    const next = v as TabId
    setDir(tabs.findIndex((t) => t.id === next) > tabs.findIndex((t) => t.id === value) ? 1 : -1)
    setValue(next)
  }
  const c = content[value]

  return (
    <Tabs value={value} onValueChange={change} className="w-72">
      <LayoutGroup id={id}>
        <TabsList className="w-full" onPointerLeave={() => setOver(null)}>
          {tabs.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              disabled={disabled}
              onPointerEnter={() => setOver(t.id)}
              className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {hoverTab === t.id && value !== t.id && (
                <motion.span
                  layoutId="hover"
                  className="bg-background/70 ring-border absolute inset-0 rounded-md ring-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                />
              )}
              {value === t.id && (
                <motion.span layoutId="pill" className="bg-background absolute inset-0 rounded-md shadow-sm" transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
              )}
              <motion.span className="relative z-10 flex items-center gap-1.5" animate={{ y: hoverTab === t.id && value !== t.id ? -1 : 0 }}>
                <t.icon />
                {t.label}
              </motion.span>
            </TabsTrigger>
          ))}
        </TabsList>
      </LayoutGroup>
      <div className="relative h-36 overflow-hidden rounded-lg border p-4">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={value}
            role="tabpanel"
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d * 60, opacity: 0, filter: "blur(4px)" }),
              center: { x: 0, opacity: 1, filter: "blur(0px)" },
              exit: (d: number) => ({ x: d * -60, opacity: 0, filter: "blur(4px)" }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
            className="space-y-3"
          >
            <p className="text-sm font-semibold">{c.title}</p>
            <label htmlFor={`${id}-field`} className="text-muted-foreground block text-xs">{c.field}</label>
            <div className="flex gap-2">
              <Input id={`${id}-field`} defaultValue={c.value} className="h-8" />
              <Button size="sm">Save</Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </Tabs>
  )
}
