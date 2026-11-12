// Simulates `npx shadcn add <item>` for every component into an empty project,
// one at a time, then typechecks it. Catches missing registry/npm dependencies.
// Stock shadcn components are copied from src/components/ui (stand-ins for the
// shadcn registry, which the CLI would fetch).
import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")
const out = path.join(root, "public/r")
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))
const installed = new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)])
const load = (name) => JSON.parse(fs.readFileSync(path.join(out, `${name}.json`), "utf8"))

const only = process.argv[2]
const items = fs
  .readdirSync(out)
  .filter((f) => f.endsWith(".json") && !["registry.json", "all.json", "themes.json"].includes(f))
  .map((f) => f.replace(".json", ""))
  .filter((n) => !only || n === only)

let failed = 0
for (const name of items) {
  const dir = fs.mkdtempSync("/tmp/regtest-")
  fs.mkdirSync(path.join(dir, "components/ui"), { recursive: true })
  fs.mkdirSync(path.join(dir, "lib"), { recursive: true })
  fs.copyFileSync(path.join(root, "src/lib/utils.ts"), path.join(dir, "lib/utils.ts"))
  const seen = new Set()
  const npm = new Set()
  const install = (n) => {
    if (seen.has(n)) return
    seen.add(n)
    const item = load(n)
    for (const d of item.dependencies ?? []) npm.add(d)
    for (const f of item.files) {
      const target = f.type === "registry:lib" ? path.join(dir, "lib", path.basename(f.path)) : path.join(dir, "components", path.basename(f.path))
      fs.writeFileSync(target, f.content)
    }
    for (const dep of item.registryDependencies ?? []) {
      if (dep.startsWith("http")) install(dep.split("/r/")[1].replace(".json", ""))
      else if (dep !== "utils") {
        const src = path.join(root, "src/components/ui", `${dep}.tsx`)
        if (!fs.existsSync(src)) throw new Error(`${n}: unknown shadcn dependency "${dep}"`)
        fs.copyFileSync(src, path.join(dir, "components/ui", `${dep}.tsx`))
      }
    }
  }
  try {
    install(name)
    const missingNpm = [...npm].filter((d) => !installed.has(d))
    if (missingNpm.length) throw new Error(`npm deps not in package.json: ${missingNpm}`)
    fs.symlinkSync(path.join(root, "node_modules"), path.join(dir, "node_modules"))
    fs.writeFileSync(
      path.join(dir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "bundler",
          jsx: "react-jsx", strict: true, noEmit: true, skipLibCheck: true, paths: { "@/*": ["./*"] },
        },
        include: ["components", "lib"],
      }),
    )
    execSync("node_modules/.bin/tsc -p .", { cwd: dir, stdio: "pipe" })
    console.log(`✓ ${name}  (${seen.size} items, npm: ${[...npm].join(", ") || "none"})`)
  } catch (e) {
    failed++
    console.log(`✗ ${name}\n${(e.stdout?.toString() || e.message).split("\n").slice(0, 8).join("\n")}`)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}
console.log(failed ? `\n${failed} item(s) failed` : `\nAll ${items.length} items install and typecheck on their own.`)
process.exit(failed ? 1 : 0)
