/**
 * Draft fix for Button.
 * Copied from components/aspra/ui.tsx:45. Edit it here: the canvas shows it next to the current version
 * and runs the same accessibility checks on both. Approve it to hand it to an agent.
 *
 * Changes:
 * - size "sm" is 44px tall (was 36px), the touch target PRODUCT.md asks for
 * - new `loading` prop: spinner, aria-busy, disabled, label kept so width does not jump
 * - variant "sea" is the blue one; "sulphur" stays as an alias until uses are renamed
 */
import * as React from "react"
import { LoaderCircle } from "lucide-react"
import { cn } from "@repo/aspra/lib/utils"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "dark" | "light" | "outline" | "ghost" | "sea" | "sulphur"
  size?: "md" | "lg" | "sm"
  block?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", block, loading, disabled, className, children, ...props },
  ref,
) {
  const tone = variant === "sulphur" ? "sea" : variant
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background-color,color,transform,opacity] duration-200 active:scale-[0.98] disabled:active:scale-100",
        loading ? "cursor-progress" : "disabled:opacity-45",
        size === "lg" && "h-14 px-7 text-[16px]",
        size === "md" && "h-12 px-5 text-[15px]",
        size === "sm" && "h-11 px-4 text-[14px]",
        block && "w-full",
        tone === "primary" && "bg-ink text-white hover:bg-obsidian-3",
        tone === "dark" && "bg-obsidian text-white hover:bg-obsidian-2",
        tone === "light" && "bg-white text-ink hover:bg-chalk-2",
        tone === "sea" && "bg-sea text-white hover:bg-sea-deep",
        tone === "outline" && "border border-white/80 bg-white/55 text-ink backdrop-blur-md hover:bg-white/85",
        tone === "ghost" && "bg-transparent text-ink hover:bg-ink/5",
        className,
      )}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})

/** Components this draft replaces in the canvas preview. */
export const parts = { Button }

const VARIANTS = ["primary", "dark", "light", "sea", "outline", "ghost"] as const
const Label = ({ children }: { children: React.ReactNode }) => <div className="mb-2 font-mono text-[12px] tracking-tight opacity-70">{children}</div>

/** The specimen sheet with the fix, including the new loading state. */
export default function Draft() {
  return (
    <div className="ambient min-h-full space-y-5 p-5">
      {(["lg", "md", "sm"] as const).map((size) => (
        <div key={size}>
          <Label>size="{size}"</Label>
          <div className="flex flex-wrap gap-2">
            {VARIANTS.map((v) => (
              <Button key={v} variant={v} size={size}>{v}</Button>
            ))}
          </div>
        </div>
      ))}
      <div>
        <Label>disabled</Label>
        <div className="flex flex-wrap gap-2">
          {VARIANTS.map((v) => (
            <Button key={v} variant={v} disabled>{v}</Button>
          ))}
        </div>
      </div>
      <div>
        <Label>loading (new)</Label>
        <div className="flex flex-wrap gap-2">
          <Button loading>Booking</Button>
          <Button variant="sea" loading>Saving</Button>
          <Button variant="light" size="sm" loading>Sending</Button>
        </div>
      </div>
    </div>
  )
}
