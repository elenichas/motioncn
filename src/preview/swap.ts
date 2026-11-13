/**
 * Fixed versions of repo components, swapped into the real app.
 *
 * The dev server rewrites every component in a scanned repo (see canvasSwap in vite.canvas.ts) so that it
 * renders through `__canvasRender`. A preview frame fills `overrides` from draft fixes before it renders; from
 * then on the app uses the fixed component wherever the original was used, local helpers included.
 * Nothing in the repo changes: this is how a screen shows a fix before it is applied.
 */
import { createContext, createElement, useContext, type ComponentType, type ReactNode } from "react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = ComponentType<any>
export const overrides: Record<string, Any> = {}

/** Names being replaced further up the tree: a fix that wraps the original must get the original. */
const Inside = createContext<ReadonlySet<string>>(new Set())

export function __canvasRender(name: string, Original: Any, props: unknown): ReactNode {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const inside = useContext(Inside)
  const Fixed = overrides[name]
  if (!Fixed || Fixed === Original || inside.has(name)) return createElement(Original, props as object)
  return createElement(Inside.Provider, { value: new Set([...inside, name]) }, createElement(Fixed, props as object))
}
