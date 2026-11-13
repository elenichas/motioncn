/**
 * Stand-in for components/aspra/suite3d/suite-tour.tsx on the canvas.
 * The real tour is a three.js scene loaded with next/dynamic; it is out of scope for a
 * component review, so flows that open it show this placeholder instead.
 */
import { Box, X } from "lucide-react"

type Props = { suiteId: string; onClose: (saved: boolean) => void; saveLabel?: string; prefs?: unknown; onChange?: unknown }

export function SuiteTour({ suiteId, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[var(--z-sheet)] grid place-items-center bg-obsidian p-6 text-center text-white">
      <div className="max-w-xs">
        <Box className="mx-auto mb-3 size-8 opacity-70" aria-hidden />
        <p className="text-[15px] font-medium">3D suite tour ({suiteId})</p>
        <p className="mt-1 text-[13.5px] text-white/70">Not rendered on the canvas. The real tour is a three.js scene.</p>
        <button onClick={() => onClose(false)} className="mx-auto mt-5 flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[15px] font-medium text-ink">
          <X className="size-4" aria-hidden /> Close
        </button>
      </div>
    </div>
  )
}
