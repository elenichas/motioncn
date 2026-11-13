import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type View = { x: number; y: number; z: number }
export const MIN_Z = 0.06
export const MAX_Z = 3
const clampZ = (z: number) => Math.min(MAX_Z, Math.max(MIN_Z, z))

/** Zoom by a factor around a screen point (keeps that point fixed). */
export function zoomAt(v: View, factor: number, cx: number, cy: number): View {
  const z = clampZ(v.z * factor)
  const k = z / v.z
  return { z, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }
}

/** Fit every [data-frame] in the world layer into the viewport. */
export function fitView(world: HTMLElement | null, vw: number, vh: number, ids?: string[]): View | null {
  if (!world) return null
  const els = [...world.querySelectorAll<HTMLElement>("[data-frame]")].filter((el) => !ids || ids.includes(el.dataset.frame!))
  if (!els.length) return null
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const el of els) {
    x0 = Math.min(x0, el.offsetLeft)
    y0 = Math.min(y0, el.offsetTop - 28)
    x1 = Math.max(x1, el.offsetLeft + el.offsetWidth)
    y1 = Math.max(y1, el.offsetTop + el.offsetHeight)
  }
  const pad = 80
  const z = clampZ(Math.min((vw - pad * 2) / (x1 - x0), (vh - pad * 2 - 60) / (y1 - y0), 1.2))
  return { z, x: (vw - (x1 - x0) * z) / 2 - x0 * z, y: (vh - (y1 - y0) * z) / 2 - y0 * z + 24 }
}

type Props = {
  view: View
  setView: (fn: (v: View) => View) => void
  onBackgroundClick?: () => void
  worldRef: React.RefObject<HTMLDivElement | null>
  children: ReactNode
}

/**
 * Figma-style infinite canvas.
 * - Drag empty space / middle mouse / Space+drag → pan
 * - Mouse wheel → zoom at cursor; trackpad scroll → pan; Shift + wheel → pan sideways
 * - Ctrl/⌘ + wheel or trackpad pinch → zoom at cursor
 * Interactions inside frames ([data-frame-body]) are left to the components.
 */
export function Canvas({ view, setView, onBackgroundClick, worldRef, children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [space, setSpace] = useState(false)
  const [panning, setPanning] = useState(false)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  // two-finger pinch / pan on touch screens (works over frames too)
  const touches = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; mx: number; my: number } | null>(null)
  const pinchState = () => {
    const [a, b] = [...touches.current.values()]
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
  }
  const onTouchDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (touches.current.size === 2) {
      pinch.current = pinchState()
      drag.current = null
      setPanning(false)
    }
  }
  const onTouchMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" || !touches.current.has(e.pointerId)) return
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const prev = pinch.current
    if (!prev || touches.current.size !== 2) return
    e.stopPropagation()
    const next = pinchState()
    const r = rootRef.current!.getBoundingClientRect()
    setView((v) => {
      const z = zoomAt(v, next.dist / prev.dist, next.mx - r.left, next.my - r.top)
      return { ...z, x: z.x + (next.mx - prev.mx), y: z.y + (next.my - prev.my) }
    })
    pinch.current = next
  }
  const onTouchUp = (e: React.PointerEvent) => {
    touches.current.delete(e.pointerId)
    if (touches.current.size < 2) pinch.current = null
  }

  useEffect(() => {
    const el = rootRef.current!
    // A mouse wheel sends coarse, whole steps (or lines); a trackpad sends small fractional deltas.
    const isMouseWheel = (e: WheelEvent) => e.deltaMode === 1 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 40 && Number.isInteger(e.deltaY))
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0085))
        setView((v) => zoomAt(v, factor, e.clientX - r.left, e.clientY - r.top))
      } else if (isMouseWheel(e) && !e.shiftKey) {
        // mouse wheel zooms at the cursor; Shift + wheel pans sideways
        const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.06 : 0.0022))
        setView((v) => zoomAt(v, factor, e.clientX - r.left, e.clientY - r.top))
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [setView])

  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA"].includes(t.tagName))
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !typing(e.target)) {
        if (e.target instanceof HTMLButtonElement) e.preventDefault()
        setSpace(true)
      }
    }
    const up = (e: KeyboardEvent) => e.code === "Space" && setSpace(false)
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const t = e.target as HTMLElement
      const inFrame = !!t.closest("[data-frame]")
      const forcePan = space || e.button === 1
      if ((inFrame && !forcePan) || (e.button !== 0 && e.button !== 1)) return
      e.preventDefault()
      drag.current = { x: e.clientX, y: e.clientY, moved: false }
      setPanning(true)
      ;try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* synthetic pointer */ }
    },
    [space],
  )
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || pinch.current) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true
    d.x = e.clientX
    d.y = e.clientY
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
  }
  const onPointerUp = () => {
    if (drag.current && !drag.current.moved) onBackgroundClick?.()
    drag.current = null
    setPanning(false)
  }

  const g = 24 * view.z
  return (
    <div
      ref={rootRef}
      className={cn("bg-muted relative h-full w-full touch-none overflow-hidden select-none", space && "cursor-grab", panning && "cursor-grabbing")}
      style={{
        backgroundImage: "radial-gradient(color-mix(in oklab, var(--muted-foreground) 35%, transparent) 1px, transparent 1px)",
        backgroundSize: `${g}px ${g}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerDownCapture={onTouchDown}
      onPointerMoveCapture={onTouchMove}
      onPointerUpCapture={onTouchUp}
      onPointerCancelCapture={onTouchUp}
    >
      <div
        ref={worldRef}
        className={cn("absolute top-0 left-0 origin-top-left", space && "pointer-events-none")}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}
      >
        {children}
      </div>
    </div>
  )
}
