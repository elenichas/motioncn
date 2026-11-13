/**
 * Reaches a screen of the app the way a user does: by pressing things, in order.
 * A step is the visible name of a control ("Plan a stay"); "tab:Plan" looks only among navigation tabs;
 * "see:…" waits for a control without pressing it (a screen that opens by itself, after a splash).
 * Each step waits for its control to appear (splash screens, transitions), so no timings are written down.
 */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase()

function visible(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2 || (el as HTMLButtonElement).disabled) return false
  if (getComputedStyle(el).visibility === "hidden" || el.closest("[hidden], [aria-hidden='true'], [inert]")) return false
  return true
}

function find(step: string): HTMLElement | null {
  const tab = step.startsWith("tab:")
  const want = norm(tab ? step.slice(4) : step)
  const all = [...document.querySelectorAll<HTMLElement>(tab ? "[role='tab'], nav button, nav a" : "button, a[href], [role='button'], [role='tab'], [role='radio'], [role='link']")].filter(visible)
  const name = (el: HTMLElement) => norm(el.getAttribute("aria-label") ?? el.textContent ?? "")
  // The topmost match wins: a sheet's button over one with the same name on the page under it.
  const onTop = (els: HTMLElement[]) =>
    els.find((el) => {
      const r = el.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return !!hit && (el.contains(hit) || hit.contains(el))
    }) ?? els[0] ?? null
  return onTop(all.filter((el) => name(el) === want)) ?? onTop(all.filter((el) => name(el).startsWith(want))) ?? (tab ? onTop(all.filter((el) => name(el).includes(want))) : null)
}

/** Resolves once nothing on the page has changed for a moment: entrance animations are over. */
function settled(quiet = 700, max = 6000) {
  return new Promise<void>((resolve) => {
    let t = setTimeout(done, quiet)
    const mo = new MutationObserver(() => (clearTimeout(t), (t = setTimeout(done, quiet))))
    const cap = setTimeout(done, max)
    function done() {
      mo.disconnect()
      clearTimeout(t)
      clearTimeout(cap)
      resolve()
    }
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true })
  })
}

export async function drive(steps: string[]): Promise<{ ok: boolean; done: number; wanted?: string }> {
  for (let i = 0; i < steps.length; i++) {
    const see = steps[i].startsWith("see:")
    const step = see ? steps[i].slice(4) : steps[i]
    let el: HTMLElement | null = null
    for (const until = Date.now() + 9000; !el && Date.now() < until; ) {
      el = find(step)
      if (!el) await wait(150)
    }
    if (!el) return { ok: false, done: i, wanted: step.replace(/^tab:/, "") }
    if (see) continue
    el.scrollIntoView({ block: "center" })
    el.click()
    await wait(500)
  }
  await settled()
  return { ok: true, done: steps.length }
}
