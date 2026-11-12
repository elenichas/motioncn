import type { FrameData } from "@/registry"
import type { Mode, Vars } from "@/lib/themes"
import type { DemoState } from "@/components/motion/demo-state"

/** Everything needed to restore a canvas: settings, frames and an imported theme. */
export type Layout = {
  v: 1
  theme: string
  mode: Mode
  radius: number
  state: DemoState
  frames: FrameData[]
  custom?: { name: string; light: Vars; dark: Vars }
}

const KEY = "motioncn:layout:v1"

const toB64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
const fromB64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)))

export const encodeLayout = (l: Layout) => toB64(JSON.stringify(l))

export function decodeLayout(code: string): Layout | null {
  try {
    const l = JSON.parse(fromB64(code.trim()))
    return l && l.v === 1 && Array.isArray(l.frames) ? (l as Layout) : null
  } catch {
    return null
  }
}

/** Browser storage can be missing or throw (private mode, sandboxed frames). */
export function saveLocal(l: Layout) {
  try {
    localStorage.setItem(KEY, encodeLayout(l))
  } catch {
    /* ignore */
  }
}
export function clearLocal() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/** Startup: a shared ?layout= link wins, then the viewer's own saved canvas. */
export function loadInitial(): Layout | null {
  try {
    const q = new URLSearchParams(location.search).get("layout")
    if (q) return decodeLayout(q)
  } catch {
    /* ignore */
  }
  try {
    const s = localStorage.getItem(KEY)
    return s ? decodeLayout(s) : null
  } catch {
    return null
  }
}

/** Links only work when the canvas is its own top-level page (not embedded). */
export function shareLink(l: Layout): string | null {
  try {
    if (window.self !== window.top) return null
    return `${location.origin}${location.pathname}?layout=${encodeLayout(l)}`
  } catch {
    return null
  }
}
