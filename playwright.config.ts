import { defineConfig } from "@playwright/test"

// Visual regression: every component × state × mode, rendered alone via ?embed=.
// First run:   npm run test:visual -- --update-snapshots   (creates the baselines)
// Afterwards:  npm run test:visual                          (fails on visual changes)
export default defineConfig({
  testDir: "tests",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  expect: {
    // a little tolerance for anti-aliasing and looping ambient animations
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: "disabled" },
  },
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 900, height: 900 },
    deviceScaleFactor: 1,
  },
  webServer: {
    command: "npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: true,
  },
})
