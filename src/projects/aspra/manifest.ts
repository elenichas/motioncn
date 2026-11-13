import type { Manifest, ProjectTheme } from "@/project/types"

const UI = "components/aspra/ui.tsx"

/** A shadcn-style accent applied to Aspra's brand tokens. The sea family is derived from one colour. */
const accent = (id: string, name: string, color: string): ProjectTheme => ({
  id,
  name,
  vars: {
    sea: color,
    "sea-deep": `color-mix(in oklab, ${color} 78%, black)`,
    "sea-light": `color-mix(in oklab, ${color} 38%, white)`,
    "sea-wash": `color-mix(in oklab, ${color} 10%, white)`,
    sulphur: `color-mix(in oklab, ${color} 45%, white)`,
    "sulphur-deep": `color-mix(in oklab, ${color} 78%, black)`,
  },
})

export const manifest: Manifest = {
  id: "aspra",
  name: "Aspra Milos",
  summary:
    "Hotel guest app (Next.js, Tailwind v4, framer-motion). The design system is the hand-built set in components/aspra/ui.tsx; the shadcn kit in components/ui is installed but not imported anywhere.",
  themes: [
    { id: "meltemi", name: "Aspra · Meltemi", note: "The repo's own theme", vars: {} },
    {
      id: "neutral",
      name: "shadcn Neutral",
      note: "Brand tokens remapped to shadcn neutral",
      vars: {
        chalk: "#fafafa",
        "chalk-2": "#f5f5f5",
        pumice: "#e5e5e5",
        stone: "#a3a3a3",
        ink: "#0a0a0a",
        "ink-2": "#404040",
        "ink-3": "#737373",
        obsidian: "#0a0a0a",
        "obsidian-2": "#171717",
        "obsidian-3": "#262626",
        sea: "#171717",
        "sea-deep": "#0a0a0a",
        "sea-light": "#d4d4d4",
        "sea-wash": "#f5f5f5",
        sulphur: "#e5e5e5",
        "sulphur-deep": "#171717",
        border: "#e5e5e5",
      },
    },
    accent("blue", "shadcn Blue", "oklch(0.488 0.243 264.376)"),
    accent("violet", "shadcn Violet", "oklch(0.541 0.281 293.009)"),
    accent("rose", "shadcn Rose", "oklch(0.586 0.253 17.585)"),
    accent("green", "shadcn Green", "oklch(0.527 0.154 150.069)"),
    accent("orange", "shadcn Orange", "oklch(0.553 0.195 38.402)"),
  ],
  pages: [
    /* ───────────────────────── Foundations ───────────────────────── */
    {
      id: "foundations",
      title: "Foundations",
      kind: "library",
      blurb: "Tokens, type, radii and surfaces, read from app/globals.css and the class names in use.",
      sections: [
        {
          title: "Colour",
          entries: [
            {
              id: "tokens",
              title: "Colour tokens",
              where: "app/globals.css:20",
              confidence: "rendered",
              w: 760,
              findings: [
                { level: "warn", text: "Components use the brand tokens (bg-ink, bg-sea) directly, not the shadcn semantic tokens (--primary, --background) that globals.css also defines. Theming through the semantic layer changes nothing in the UI." },
                { level: "warn", text: "Names kept from an older theme no longer describe the colour: 'sulphur' is pale blue, and Button variant 'sulphur' is sea blue." },
                { level: "info", text: "No dark mode: the .dark variant is declared but no dark values exist. Dark surfaces are made per component with obsidian and the on-dark class." },
              ],
            },
          ],
        },
        {
          title: "Type and shape",
          entries: [
            {
              id: "type-scale",
              title: "Type scale in use",
              where: "27 sizes across 15 files",
              confidence: "rendered",
              w: 760,
              findings: [
                { level: "issue", text: "27 hard-coded pixel sizes and no type tokens. Body text alone uses 13, 13.5, 14, 14.5, 15 and 15.5px." },
                { level: "info", text: "Proposal: 7 steps. 12 caption, 14 small, 15 body, 17 lead, 22 title, 26 section, 38 display (plus 56/64 for hero numbers)." },
              ],
            },
            {
              id: "radii",
              title: "Corner radii in use",
              where: "14 radius classes",
              confidence: "rendered",
              w: 760,
              findings: [
                { level: "warn", text: "Containers use rounded-xl, 2xl, 3xl and arbitrary 20, 26, 28 and 32px. The theme defines --radius-xl/2xl/3xl, so the arbitrary values skip it." },
              ],
            },
          ],
        },
        {
          title: "Surfaces",
          entries: [
            {
              id: "surfaces",
              title: "Glass surfaces",
              where: "app/globals.css:205",
              confidence: "rendered",
              w: 760,
              findings: [
                { level: "warn", text: "glass utilities and the ambient backdrop are hard-coded rgb values, so they do not follow a theme change (switch themes to see it)." },
                { level: "info", text: "Reduced transparency is handled: glass turns opaque under prefers-reduced-transparency." },
              ],
            },
          ],
        },
      ],
    },

    /* ───────────────────────── Primitives ───────────────────────── */
    {
      id: "components",
      title: "Components",
      kind: "library",
      blurb: "The 15 components in components/aspra/ui.tsx and the pieces built from them, every variant and state the code supports.",
      sections: [
        {
          title: "Actions",
          entries: [
            {
              id: "button",
              title: "Button",
              where: `${UI}:45`,
              confidence: "rendered",
              w: 560,
              findings: [
                { level: "issue", text: "Size sm is 36px tall, under the 44px touch target PRODUCT.md asks for." },
                { level: "warn", text: "Variant 'primary' is black ink, not the --primary token (sea). 'sulphur' is the blue one." },
                { level: "warn", text: "No loading or pending state. Disabled is opacity only." },
                { level: "info", text: "26 hand-written buttons outside the library repeat Button styles. See Inconsistencies." },
              ],
            },
            {
              id: "icon-button",
              title: "IconButton",
              where: `${UI}:71`,
              confidence: "rendered",
              findings: [
                { level: "info", text: "Requires a label, so every icon button has an accessible name." },
                { level: "warn", text: "No visual variants: every caller passes its own colours and borders through className." },
              ],
            },
            {
              id: "text-link",
              title: "TextLink",
              where: `${UI}:455`,
              confidence: "rendered",
              findings: [{ level: "warn", text: "A hand-written copy in today.tsx:334 uses text-sea-deep and 13.5px instead of text-sea and 14px." }],
            },
          ],
        },
        {
          title: "Selection",
          entries: [
            {
              id: "chip",
              title: "Chip",
              where: `${UI}:118`,
              confidence: "rendered",
              findings: [
                { level: "info", text: "Selected state shows a check icon as well as colour, which meets 'never state by colour alone'." },
                { level: "warn", text: "No disabled state." },
              ],
            },
            {
              id: "option-row",
              title: "OptionRow",
              where: `${UI}:157`,
              confidence: "rendered",
              findings: [{ level: "warn", text: "No disabled state. Uses role=radio on a button but the group has no radiogroup or arrow-key handling." }],
            },
            {
              id: "segmented",
              title: "Segmented",
              where: `${UI}:252`,
              confidence: "rendered",
              findings: [
                { level: "issue", text: "Segments are 36px tall, under the 44px target." },
                { level: "warn", text: "radiogroup without arrow-key navigation: every segment is a separate Tab stop." },
              ],
            },
            {
              id: "counter",
              title: "Counter",
              where: `${UI}:204`,
              confidence: "rendered",
              findings: [
                { level: "warn", text: "The minus and plus buttons are 40px, under the 44px target." },
                { level: "info", text: "Limits disable the buttons and the value is announced through aria-live." },
              ],
            },
          ],
        },
        {
          title: "Structure",
          entries: [
            {
              id: "flow-header",
              title: "FlowHeader",
              where: `${UI}:309`,
              confidence: "rendered",
              findings: [{ level: "info", text: "Step progress is a real progressbar with values." }],
            },
            {
              id: "section-title",
              title: "SectionTitle",
              where: `${UI}:438`,
              confidence: "rendered",
            },
            {
              id: "sheet",
              title: "Sheet",
              where: `${UI}:369`,
              confidence: "rendered",
              responsive: true,
              findings: [
                { level: "issue", text: "Focus does not move into the sheet when it opens, is not trapped while open, and does not return to the trigger when it closes." },
                { level: "info", text: "Bottom sheet on phone, centred dialog from md (768px). Escape closes it." },
              ],
            },
            {
              id: "full-screen",
              title: "FullScreen",
              where: `${UI}:479`,
              confidence: "rendered",
              responsive: true,
              findings: [
                { level: "warn", text: "Picks its dark backdrop by checking whether className contains 'bg-obsidian'. A tone prop would make this explicit." },
              ],
            },
          ],
        },
        {
          title: "Media and brand",
          entries: [
            {
              id: "photo",
              title: "Photo",
              where: `${UI}:93`,
              confidence: "rendered",
              findings: [{ level: "info", text: "Shows sea-wash while loading. No aspect ratio is set by the component, so every caller sizes it." }],
            },
            { id: "wordmark", title: "Wordmark and ArchMark", where: `${UI}:12`, confidence: "rendered" },
          ],
        },
        {
          title: "Status",
          entries: [
            {
              id: "status-pill",
              title: "StatusPill",
              where: "components/aspra/tabs/today.tsx:428",
              confidence: "rendered",
              findings: [
                { level: "warn", text: "Lives in a screen file, not the library, and only knows confirmed and requested." },
              ],
            },
          ],
        },
        {
          title: "Forms and pickers",
          entries: [
            { id: "trip-prefs", title: "TripPrefs", where: "components/aspra/shared.tsx:39", confidence: "rendered", assumptions: ["Preferences from the sample 'booked' guest in data.ts"] },
            { id: "suite-prefs", title: "SuitePrefs · compact", where: "components/aspra/shared.tsx:120", confidence: "rendered", assumptions: ["Preferences from the sample 'booked' guest in data.ts"] },
            { id: "extras-picker", title: "ExtrasPicker", where: "components/aspra/shared.tsx:289", confidence: "rendered", assumptions: ["Two extras selected, from the sample booking"] },
            { id: "stay-calendar", title: "StayCalendar", where: "components/aspra/entry/stay-calendar.tsx:31", confidence: "rendered", assumptions: ["June 2027, the sample booking's dates"], findings: [{ level: "info", text: "Sold-out nights are struck through as well as greyed out." }] },
          ],
        },
      ],
    },

    /* ───────────────────────── Screens ───────────────────────── */
    {
      id: "screens",
      title: "Screens",
      kind: "library",
      blurb: "The real app at phone, tablet and desktop widths, with sample guests from data.ts.",
      sections: [
        {
          title: "Guest app",
          blurb: "The real app with sample guests from data.ts. Each frame has its own storage, so frames do not share state.",
          entries: [
            { id: "screen-gate", title: "Gate", where: "components/aspra/entry/gate.tsx:72", confidence: "rendered", responsive: true },
            { id: "screen-today-before", title: "Today · before the stay", where: "components/aspra/tabs/today.tsx:80", confidence: "assumed", responsive: true, inApp: true, assumptions: ["Booked guest Clara Weiss, restored from a saved session", "Opens after the 1.9s splash"] },
            { id: "screen-today-during", title: "Today · during the stay", where: "components/aspra/tabs/today.tsx:259", confidence: "assumed", responsive: true, inApp: true, assumptions: ["Booked guest, phase set to 'during'", "Opens after the 1.9s splash"] },
            { id: "screen-plan", title: "Plan", where: "components/aspra/tabs/plan.tsx:24", confidence: "assumed", responsive: true, inApp: true, assumptions: ["Booked guest with 3 planned experiences"] },
            {
              id: "screen-concierge",
              title: "Concierge (Nefeli)",
              where: "components/aspra/tabs/concierge.tsx:41",
              confidence: "assumed",
              responsive: true,
              inApp: true,
              assumptions: ["Empty conversation only. Replies come from /api/chat, which the canvas does not run"],
              findings: [{ level: "warn", text: "Sending a message here calls /api/chat and fails. Not a UI bug, but the error state is worth a look." }],
            },
            { id: "screen-journal", title: "Journal · after the stay", where: "components/aspra/tabs/journal.tsx:20", confidence: "assumed", responsive: true, inApp: true, assumptions: ["Booked guest, phase set to 'after'"] },
            { id: "screen-booking", title: "Booking flow", where: "components/aspra/entry/booking-flow.tsx:54", confidence: "assumed", responsive: true, inApp: true, assumptions: ["New guest, first step", "The 3D suite tour is replaced by a placeholder"] },
            { id: "screen-returning", title: "Returning guest entry", where: "components/aspra/entry/guest-entry.tsx:191", confidence: "rendered", responsive: true, inApp: true, assumptions: ["Returning guest Jonas Hale"] },
          ],
        },
      ],
    },

    /* ───────────────────────── Review ───────────────────────── */
    {
      id: "review",
      title: "Review",
      kind: "review",
      blurb: "What needs a decision: new code from main, the same idea written several ways, proposals, and what the canvas leaves out.",
      sections: [
        {
          title: "Duplicates to merge · cards",
          blurb: "No Card component exists. These are the hand-written card containers, grouped by fill, radius and padding.",
          entries: [
            {
              id: "drift-surfaces",
              title: "28 surface styles, 43 uses",
              confidence: "rendered",
              w: 1180,
              findings: [
                { level: "issue", text: "The most common shape, glass + rounded-2xl, appears with p-3, p-4, p-5, px-4 and no padding." },
                { level: "info", text: "Proposal: a Card with tone (glass, wash, dark, dashed) and padding (sm, md) props, rounded-2xl only." },
              ],
            },
          ],
        },
        {
          title: "Duplicates to merge · buttons",
          blurb: "Buttons written by hand in screen files instead of using the library Button, IconButton or TextLink.",
          entries: [
            {
              id: "drift-buttons",
              title: "26 hand-written buttons",
              confidence: "rendered",
              w: 1180,
              findings: [
                { level: "warn", text: "Pill buttons repeat Button with new heights (h-10, h-12, min-h-11) and fills. List rows have no component at all." },
                { level: "info", text: "Specimens are rebuilt from each button's class list. Content is placeholder text." },
              ],
            },
          ],
        },
        {
          title: "Duplicates to merge · components",
          entries: [
            {
              id: "drift-row-line",
              title: "Row and Line",
              where: "components/aspra/entry/booking-flow.tsx:686 · components/aspra/stay-sheet.tsx:110",
              confidence: "rendered",
              w: 560,
              findings: [{ level: "issue", text: "Same props, same markup. Only Row sets 14.5px text. Merge into one SummaryRow in the library." }],
            },
          ],
        },
        {
          title: "Proposals",
          blurb: "States the code does not have yet, drawn from existing tokens and parts.",
          entries: [
            {
              id: "button-loading",
              title: "Button · loading",
              confidence: "rendered",
              proposal: true,
              w: 560,
              findings: [{ level: "info", text: "Not in the repo. Built from Button's own classes plus a spinner, with aria-busy and the label kept for screen readers." }],
            },
            {
              id: "status-pill-proposal",
              title: "StatusPill · full set",
              confidence: "rendered",
              proposal: true,
              findings: [{ level: "info", text: "Not in the repo. Adds pending, declined and cancelled from existing tokens (sulphur, clay, stone), each with an icon so state is not colour alone." }],
            },
          ],
        },
        {
          title: "Not on the canvas",
          blurb: "Code the canvas leaves out, and why. Some of it may not be needed at all.",
          entries: [
            { id: "nr-suite3d", title: "3D suite tour", where: "components/aspra/suite3d/", confidence: "not-rendered", w: 380, findings: [{ level: "info", text: "A three.js scene, not UI components. Flows that open it show a placeholder." }] },
            { id: "nr-viewer", title: "/viewer prototype", where: "components/viewer/", confidence: "not-rendered", w: 380, findings: [{ level: "warn", text: "Not linked from the app and uses its own brown and gold hex colours. Likely left over: remove or move out." }] },
            { id: "nr-kit", title: "shadcn kit (57 files)", where: "components/ui/", confidence: "not-rendered", w: 380, findings: [{ level: "warn", text: "Installed but imported by nothing. Delete it, or adopt pieces on purpose (Dialog would fix the Sheet focus issues)." }] },
            { id: "nr-step", title: "Step", where: `${UI}:514`, confidence: "not-rendered", w: 380, findings: [{ level: "info", text: "An animation wrapper with no look of its own. Seen in the Booking flow screen." }] },
          ],
        },
      ],
    },
  ],
}
