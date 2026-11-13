/**
 * Draft fix for Sheet.
 * Copied from components/aspra/ui.tsx:369. Edit it here: the canvas shows it next to the current version
 * and runs the same accessibility checks on both. Approve it to hand it to an agent.
 */
import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, Check, Minus, Plus, X } from "lucide-react"
import { cn } from "@repo/aspra/lib/utils"
import { EASE, IconButton } from "@repo/aspra/components/aspra/ui"

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="glass max-w-[360px] space-y-3 rounded-2xl p-4 text-ink">
          <motion.button
            aria-label="Close"
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-obsidian/35 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.45, ease: EASE }}
            className="glass-strong relative flex max-h-[90svh] w-full max-w-[440px] flex-col rounded-t-[28px] md:max-h-[84svh] md:max-w-[560px] md:rounded-[28px]"
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <h2 className="font-display text-[26px] leading-tight text-ink">{title}</h2>
              <IconButton label="Close" onClick={onClose} className="-mr-2 hover:bg-ink/5">
                <X className="size-5" />
              </IconButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">{children}</div>
            {footer && (
              <div className="border-t border-white/70 px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/** Components this draft replaces in the canvas preview. */
export const parts = { Sheet }
