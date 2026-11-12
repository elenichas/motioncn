# motioncn launch kit

## Before launch
- [ ] Push to GitHub and import on Vercel (or Netlify). Build `npm run build`, output `dist`.
- [ ] Set `REGISTRY_URL` and `VITE_REGISTRY_URL` to the live origin (also as a GitHub Actions variable, `REGISTRY_URL`), then redeploy.
- [ ] Smoke test: `npx shadcn@latest add <origin>/r/mood-slider.json` in a fresh shadcn app.
- [ ] Check CI is green: build, registry verify, 228 visual tests.
- [ ] Record a 20-second clip: zoom out across the canvas, flip themes, turn on the accessibility check, open the code panel.

## Positioning (one line)
**motioncn: 38 animated shadcn/ui components you can install, theme and audit, on an infinite canvas.**

What's different from other animated libraries:
- Built on stock shadcn components and installed with the shadcn CLI.
- Every component in Enabled / Hover / Disabled.
- WCAG AA checked across 8 themes, light and dark.
- Paste your own theme and see all 38 in it.

## Launch post (X / Bluesky / LinkedIn)
> I built motioncn: 38 animated shadcn/ui components on an infinite canvas.
>
> • install any of them with `npx shadcn add`
> • paste your theme and see every component in it
> • hover states, disabled states and an accessibility check built in
>
> It's MIT and free. Have a play: <link>

## Component of the week (one post each)
1. **Mood Slider:** "A shadcn Slider that drives a face. Five moods, one spring. `npx shadcn add <origin>/r/mood-slider.json`"
2. **Swipe Cards:** "Tinder-style swipe deck on shadcn Card. LIKE/NOPE stamps fade in with the drag; undo included."
3. **Voice ↔ Text Input:** "Tap the blob to talk. It listens, squishes to the sound and types out what it heard."
4. **Reasoning:** "shadcn's Reasoning pattern, animated: thinking opens, thoughts stream, then it folds into 'Thought for 2s'."
5. **Slide to Confirm:** "Slide to pay. Springs back if you let go early; Enter works too."
6. **Spring Lab:** "Tune stiffness, damping and mass, watch the curve, copy the Motion transition."

Each post: a 6–10 second clip, the install command, and a link to `/?embed=<name>`.

## Show HN / Product Hunt blurb
motioncn is a set of 38 animated extensions for shadcn/ui. Each one composes stock shadcn components, adds Motion springs and gestures, and ships hover and disabled states. The playground is an infinite canvas. You can:
- re-theme everything, or paste your own shadcn or tweakcn theme
- compare one component across every theme
- run a WCAG check on anything you hover
- open the code for any component and install it with the shadcn CLI

Everything is MIT.

## Later
- A "Pro" set: full landing-page sections and AI chat layouts.
- Theme packs and a design-system review service.
