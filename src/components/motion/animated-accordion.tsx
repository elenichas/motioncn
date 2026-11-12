import { useId, useState } from "react"
import { LayoutGroup, motion } from "motion/react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import { ChevronDown } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { useDemoState } from "./demo-state"

const FAQ = [
  { q: "Is it built on shadcn/ui?", a: ["Yes, every component composes stock shadcn parts.", "Install with the shadcn CLI and own the code."] },
  { q: "Does it respect reduced motion?", a: ["Animations drop to simple fades.", "Loops pause when reduced motion is on."] },
  { q: "Can I use my own theme?", a: ["Paste any shadcn or tweakcn theme.", "Every component reads only theme tokens."] },
]

/**
 * shadcn Accordion with a springy chevron, a highlight that glides to the open item,
 * and answer lines that cascade in. Keeps Radix keyboard behaviour and the stock
 * height animation. Hover: the trigger nudges right and its chevron dips.
 * Disabled: items can't be toggled.
 */
export function AnimatedAccordion() {
  const id = useId()
  const { disabled, forceHover } = useDemoState()
  const [open, setOpen] = useState("item-0")
  const [over, setOver] = useState<string | null>(null)
  const hoverItem = disabled ? null : forceHover ? "item-1" : over

  return (
    <LayoutGroup id={id}>
      <Accordion type="single" collapsible value={open} onValueChange={setOpen} disabled={disabled} className="w-80">
        {FAQ.map((f, i) => {
          const value = `item-${i}`
          const isOpen = open === value
          return (
            <AccordionItem key={value} value={value} className="relative">
              {isOpen && <motion.span layoutId="open-bar" className="bg-primary absolute top-3 bottom-3 -left-3 w-0.5 rounded-full" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
              <AccordionPrimitive.Header className="flex">
                <AccordionPrimitive.Trigger
                  className="focus-visible:ring-ring/50 flex flex-1 items-center justify-between gap-4 rounded-md py-4 text-left text-sm font-medium outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                  onPointerEnter={() => setOver(value)}
                  onPointerLeave={() => setOver(null)}
                >
                  <motion.span animate={{ x: hoverItem === value ? 4 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                    {f.q}
                  </motion.span>
                  <motion.span
                    className="text-muted-foreground flex"
                    animate={{ rotate: isOpen ? 180 : 0, y: hoverItem === value && !isOpen ? 2 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <ChevronDown className="size-4" />
                  </motion.span>
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionContent>
                <ul className="text-muted-foreground space-y-1">
                  {f.a.map((line, j) => (
                    <motion.li key={line} className={cn(isOpen ? "" : "opacity-0")} initial={{ opacity: 0, y: -4 }} animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0 }} transition={{ delay: 0.08 + j * 0.07 }}>
                      {line}
                    </motion.li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </LayoutGroup>
  )
}
