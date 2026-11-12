import { useState } from "react"
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { GripVertical, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDemoState } from "./demo-state"

type Todo = { id: number; text: string; done: boolean }
const initial: Todo[] = [
  { id: 1, text: "Pick a shadcn theme", done: true },
  { id: 2, text: "Add spring physics", done: false },
  { id: 3, text: "Respect reduced motion", done: false },
  { id: 4, text: "Ship it", done: false },
]

/** shadcn Checkbox (same Radix primitive + classes) whose tick draws itself and pops. */
function AnimatedCheckbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      disabled={disabled}
      onCheckedChange={(v) => onChange(v === true)}
      aria-label={label}
      className={cn(
        "border-input focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 relative flex size-5 shrink-0 items-center justify-center rounded-[5px] border shadow-xs outline-none focus-visible:ring-[3px]",
        checked && "border-primary",
      )}
    >
      <motion.span
        className="bg-primary absolute inset-0 rounded-[4px]"
        initial={false}
        animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
      />
      <svg viewBox="0 0 24 24" className="text-primary-foreground relative size-3.5" fill="none" stroke="currentColor" strokeWidth={3.5}>
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0 }}
          transition={{ duration: 0.25, delay: checked ? 0.08 : 0 }}
        />
      </svg>
    </CheckboxPrimitive.Root>
  )
}

function Item({ todo, toggle, forced }: { todo: Todo; toggle: (id: number) => void; forced: boolean }) {
  const controls = useDragControls()
  const { disabled } = useDemoState()
  const [over, setOver] = useState(false)
  const hovered = !disabled && (over || forced)
  return (
    <Reorder.Item
      value={todo}
      dragListener={false}
      dragControls={controls}
      onPointerEnter={() => setOver(true)}
      onPointerLeave={() => setOver(false)}
      className={cn("bg-card flex items-center gap-3 rounded-lg border px-3 py-2.5 shadow-xs transition-colors", hovered && "bg-accent", disabled && "opacity-60")}
      animate={{ x: hovered ? 4 : 0 }}
      whileDrag={{ scale: 1.03, boxShadow: "0 10px 30px -10px rgb(0 0 0 / 0.3)" }}
    >
      <AnimatedCheckbox checked={todo.done} onChange={() => toggle(todo.id)} label={todo.text} disabled={disabled} />
      <span className="relative flex-1 text-sm">
        <span className={cn("transition-colors", todo.done && "text-muted-foreground")}>{todo.text}</span>
        <motion.span
          className="bg-foreground/60 absolute top-1/2 left-0 h-px w-full origin-left"
          initial={false}
          animate={{ scaleX: todo.done ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </span>
      <motion.button
        aria-label="Drag to reorder"
        onPointerDown={(e) => !disabled && controls.start(e)}
        className={cn("flex size-6 cursor-grab touch-none items-center justify-center rounded-md active:cursor-grabbing disabled:cursor-not-allowed", hovered ? "text-foreground" : "text-muted-foreground")}
        animate={{ scale: hovered ? 1.15 : 1 }}
      >
        <GripVertical className="size-4" />
      </motion.button>
    </Reorder.Item>
  )
}

/** Checklist: ticks draw, text strikes through, rows reorder by drag.
 *  Hover: row nudges right and the grip handle wakes up. Disabled: checkboxes and drag off. */
export function TodoList() {
  const { forceHover } = useDemoState()
  const [todos, setTodos] = useState(initial)
  const done = todos.filter((t) => t.done).length
  const toggle = (id: number) => setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))

  return (
    <div className="w-72 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">Launch checklist</span>
        <span className="text-muted-foreground tabular-nums">
          {done}/{todos.length}
        </span>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <motion.div
          className="bg-primary h-full rounded-full"
          animate={{ width: `${(done / todos.length) * 100}%` }}
          transition={{ type: "spring", bounce: 0.2 }}
        />
      </div>
      <Reorder.Group axis="y" values={todos} onReorder={setTodos} className="space-y-2">
        {todos.map((t) => (
          <Item key={t.id} todo={t} toggle={toggle} forced={forceHover && t.id === 2} />
        ))}
      </Reorder.Group>
      <AnimatePresence>
        {done === todos.length && (
          <motion.p
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className="text-primary flex items-center justify-center gap-1.5 text-sm font-medium"
          >
            <Sparkles className="size-4" /> All done — nice work!
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
