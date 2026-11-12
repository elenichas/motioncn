import fs from "node:fs"
import { expect, test } from "@playwright/test"

// The component list comes from the generated registry, so new components are covered automatically.
const registry = JSON.parse(fs.readFileSync("public/r/registry.json", "utf8")) as { items: { name: string; categories?: string[] }[] }
const components = registry.items.filter((i) => i.categories).map((i) => i.name)
const states = ["enabled", "hover", "disabled"] as const
const modes = ["light", "dark"] as const

for (const name of components) {
  test.describe(name, () => {
    for (const mode of modes)
      for (const state of states) {
        test(`${state} · ${mode}`, async ({ page }) => {
          const errors: string[] = []
          page.on("pageerror", (e) => errors.push(e.message))
          await page.goto(`/?embed=${name}&state=${state}&mode=${mode}&theme=violet&static=1`)
          const el = page.locator(`[data-embed="${name}"]`)
          await expect(el).toBeVisible()
          await page.waitForTimeout(1200) // let springs settle
          await expect(el).toHaveScreenshot(`${name}-${state}-${mode}.png`)
          expect(errors).toEqual([])
        })
      }
  })
}
