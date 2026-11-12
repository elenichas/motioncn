// shadcn/ui v4 theme tokens (OKLCH). Base = neutral; colour themes override
// primary / primary-foreground / ring, like the official theme presets.
// Rose, Orange, Green, Blue and Violet primaries are darkened from the official presets
// so primary-foreground text on primary passes WCAG AA (4.5:1) in light and dark.
// Any theme exported from ui.shadcn.com/themes or tweakcn can be pasted in here.

export type Mode = "light" | "dark"
export type Vars = Record<string, string>

const neutralLight: Vars = {
  background: "oklch(1 0 0)",
  foreground: "oklch(0.145 0 0)",
  card: "oklch(1 0 0)",
  "card-foreground": "oklch(0.145 0 0)",
  popover: "oklch(1 0 0)",
  "popover-foreground": "oklch(0.145 0 0)",
  primary: "oklch(0.205 0 0)",
  "primary-foreground": "oklch(0.985 0 0)",
  secondary: "oklch(0.97 0 0)",
  "secondary-foreground": "oklch(0.205 0 0)",
  muted: "oklch(0.97 0 0)",
  "muted-foreground": "oklch(0.556 0 0)",
  accent: "oklch(0.97 0 0)",
  "accent-foreground": "oklch(0.205 0 0)",
  destructive: "oklch(0.577 0.245 27.325)",
  border: "oklch(0.922 0 0)",
  input: "oklch(0.922 0 0)",
  ring: "oklch(0.708 0 0)",
}

const neutralDark: Vars = {
  background: "oklch(0.145 0 0)",
  foreground: "oklch(0.985 0 0)",
  card: "oklch(0.205 0 0)",
  "card-foreground": "oklch(0.985 0 0)",
  popover: "oklch(0.205 0 0)",
  "popover-foreground": "oklch(0.985 0 0)",
  primary: "oklch(0.922 0 0)",
  "primary-foreground": "oklch(0.205 0 0)",
  secondary: "oklch(0.269 0 0)",
  "secondary-foreground": "oklch(0.985 0 0)",
  muted: "oklch(0.269 0 0)",
  "muted-foreground": "oklch(0.708 0 0)",
  accent: "oklch(0.269 0 0)",
  "accent-foreground": "oklch(0.985 0 0)",
  destructive: "oklch(0.704 0.191 22.216)",
  border: "oklch(1 0 0 / 10%)",
  input: "oklch(1 0 0 / 15%)",
  ring: "oklch(0.556 0 0)",
}

// Stone — warm grey base (shadcn "stone")
const stoneLight: Vars = {
  ...neutralLight,
  foreground: "oklch(0.147 0.004 49.25)",
  "card-foreground": "oklch(0.147 0.004 49.25)",
  "popover-foreground": "oklch(0.147 0.004 49.25)",
  primary: "oklch(0.216 0.006 56.043)",
  "primary-foreground": "oklch(0.985 0.001 106.423)",
  secondary: "oklch(0.97 0.001 106.424)",
  "secondary-foreground": "oklch(0.216 0.006 56.043)",
  muted: "oklch(0.97 0.001 106.424)",
  "muted-foreground": "oklch(0.553 0.013 58.071)",
  accent: "oklch(0.97 0.001 106.424)",
  "accent-foreground": "oklch(0.216 0.006 56.043)",
  border: "oklch(0.923 0.003 48.717)",
  input: "oklch(0.923 0.003 48.717)",
  ring: "oklch(0.709 0.01 56.259)",
}
const stoneDark: Vars = {
  ...neutralDark,
  background: "oklch(0.147 0.004 49.25)",
  card: "oklch(0.216 0.006 56.043)",
  popover: "oklch(0.216 0.006 56.043)",
  primary: "oklch(0.923 0.003 48.717)",
  "primary-foreground": "oklch(0.216 0.006 56.043)",
  secondary: "oklch(0.268 0.007 34.298)",
  muted: "oklch(0.268 0.007 34.298)",
  "muted-foreground": "oklch(0.709 0.01 56.259)",
  accent: "oklch(0.268 0.007 34.298)",
  ring: "oklch(0.553 0.013 58.071)",
}

type Accent = { light: Vars; dark: Vars }
const accent = (
  lp: string,
  lpf: string,
  dp: string,
  dpf: string,
): Accent => ({
  light: { primary: lp, "primary-foreground": lpf, ring: lp },
  dark: { primary: dp, "primary-foreground": dpf, ring: dp },
})

export type Theme = {
  id: string
  name: string
  swatch: string
  base: { light: Vars; dark: Vars }
  accent?: Accent
}

const neutral = { light: neutralLight, dark: neutralDark }
const stone = { light: stoneLight, dark: stoneDark }

export const themes: Theme[] = [
  { id: "neutral", name: "Neutral", swatch: "oklch(0.3 0 0)", base: neutral },
  { id: "stone", name: "Stone", swatch: "oklch(0.553 0.013 58.071)", base: stone },
  {
    id: "rose",
    name: "Rose",
    swatch: "oklch(0.55 0.22 16.439)",
    base: neutral,
    accent: accent("oklch(0.55 0.22 16.439)", "oklch(0.985 0.01 12.422)", "oklch(0.55 0.22 16.439)", "oklch(0.985 0.01 12.422)"),
  },
  {
    id: "orange",
    name: "Orange",
    swatch: "oklch(0.55 0.19 41.116)",
    base: neutral,
    accent: accent("oklch(0.55 0.19 41.116)", "oklch(0.985 0.01 73.684)", "oklch(0.55 0.19 41.116)", "oklch(0.985 0.01 73.684)"),
  },
  {
    id: "yellow",
    name: "Yellow",
    swatch: "oklch(0.795 0.184 86.047)",
    base: neutral,
    accent: accent("oklch(0.795 0.184 86.047)", "oklch(0.421 0.095 57.708)", "oklch(0.795 0.184 86.047)", "oklch(0.421 0.095 57.708)"),
  },
  {
    id: "green",
    name: "Green",
    swatch: "oklch(0.5 0.15 149.579)",
    base: neutral,
    accent: accent("oklch(0.5 0.15 149.579)", "oklch(0.985 0.01 155.826)", "oklch(0.5 0.15 149.579)", "oklch(0.985 0.01 155.826)"),
  },
  {
    id: "blue",
    name: "Blue",
    swatch: "oklch(0.546 0.245 262.881)",
    base: neutral,
    accent: accent("oklch(0.546 0.245 262.881)", "oklch(0.97 0.014 254.604)", "oklch(0.546 0.245 262.881)", "oklch(0.97 0.014 254.604)"),
  },
  {
    id: "violet",
    name: "Violet",
    swatch: "oklch(0.541 0.281 293.009)",
    base: neutral,
    accent: accent("oklch(0.541 0.281 293.009)", "oklch(0.969 0.016 293.756)", "oklch(0.541 0.281 293.009)", "oklch(0.969 0.016 293.756)"),
  },
]

export const themeById = (id: string) => themes.find((t) => t.id === id) ?? themes[0]

/** CSS custom properties for a theme + mode, ready for `style={}` or setProperty. */
export function themeVars(id: string, mode: Mode): Record<string, string> {
  const t = themeById(id)
  const vars = { ...t.base[mode], ...(t.accent?.[mode] ?? {}) }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(vars)) out[`--${k}`] = v
  return out
}

/* ---------- custom themes (imported from shadcn / tweakcn CSS) ---------- */

const TOKENS = new Set(Object.keys(neutralLight))

/** Pull `--token: value;` pairs out of one CSS block body. */
function readVars(body: string): Vars {
  const out: Vars = {}
  for (const [, k, v] of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) if (TOKENS.has(k)) out[k] = v.trim()
  return out
}

export type ParsedTheme = { light: Vars; dark: Vars; radius?: string; found: number }

/**
 * Parse CSS from ui.shadcn.com/themes or tweakcn: `:root { … }` and optional `.dark { … }`.
 * Missing tokens fall back to Neutral, so partial themes still work.
 */
export function parseThemeCss(css: string): ParsedTheme | null {
  const block = (sel: RegExp) => css.match(sel)?.[1] ?? ""
  const rootBody = block(/:root\s*\{([^}]*)\}/)
  const darkBody = block(/\.dark\s*\{([^}]*)\}/)
  const light = readVars(rootBody)
  const darkRaw = readVars(darkBody)
  const found = Object.keys(light).length + Object.keys(darkRaw).length
  if (!Object.keys(light).length) return null
  const radius = rootBody.match(/--radius\s*:\s*([^;]+);/)?.[1]?.trim()
  return {
    light: { ...neutralLight, ...light },
    dark: { ...neutralDark, ...(Object.keys(darkRaw).length ? darkRaw : { primary: light.primary ?? neutralDark.primary, "primary-foreground": light["primary-foreground"] ?? neutralDark["primary-foreground"], ring: light.ring ?? neutralDark.ring }) },
    radius,
    found,
  }
}

/** Add or replace the "custom" theme. Returns its id. */
export function registerCustomTheme(name: string, parsed: Pick<ParsedTheme, "light" | "dark">): string {
  const theme: Theme = { id: "custom", name, swatch: parsed.light.primary ?? "oklch(0.5 0 0)", base: { light: parsed.light, dark: parsed.dark } }
  const i = themes.findIndex((t) => t.id === "custom")
  if (i >= 0) themes[i] = theme
  else themes.push(theme)
  return theme.id
}
