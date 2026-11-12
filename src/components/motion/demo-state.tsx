import { createContext, useContext, useState } from "react"

/**
 * Showcase state for a component on the canvas.
 * - enabled:  normal, fully interactive
 * - hover:    the component renders its hover animation without a pointer
 *             (also turns on `hover:` utilities for elements marked data-hover-target)
 * - disabled: native controls are disabled via <fieldset disabled>, and each
 *             component switches off its gestures and shows its disabled look
 */
export type DemoState = "enabled" | "hover" | "disabled"
export const demoStates: DemoState[] = ["enabled", "hover", "disabled"]

const Ctx = createContext<DemoState>("enabled")
export const DemoStateProvider = Ctx.Provider

export function useDemoState() {
  const state = useContext(Ctx)
  return { state, disabled: state === "disabled", forceHover: state === "hover" }
}

/** Real pointer hover OR forced hover; always false when disabled. */
export function useHover() {
  const { disabled, forceHover } = useDemoState()
  const [over, setOver] = useState(false)
  return {
    hovered: !disabled && (over || forceHover),
    hoverProps: {
      onPointerEnter: () => setOver(true),
      onPointerLeave: () => setOver(false),
    },
  }
}
