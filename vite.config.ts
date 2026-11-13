import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { canvasApi, canvasSwap, externalRepos, loadProjects } from "./vite.canvas.ts"

/** Repos shown on project canvases (src/projects/<id>/config.json), when they are checked out next to this one. */
const projects = loadProjects()

export default defineConfig({
  base: "./",
  plugins: [externalRepos(projects), canvasSwap(projects), canvasApi(projects), react(), tailwindcss()],
  resolve: {
    // "@/" is resolved by externalRepos() so it can mean a different root inside a scanned repo
    alias: projects.map((p) => ({ find: `@repo/${p.id}`, replacement: p.abs })),
  },
  server: {
    fs: { allow: [import.meta.dirname, ...projects.map((p) => p.abs)] },
    // repo worktrees made by "Apply in repo" live here; they are not part of this app
    watch: { ignored: ["**/.canvas/**"] },
  },
  build: {
    rollupOptions: {
      // Project canvases need their repos checked out next to this one, so hosted builds
      // (where they are not) ship only the playground.
      input: {
        main: path.resolve(import.meta.dirname, "index.html"),
        ...(projects.length
          ? { project: path.resolve(import.meta.dirname, "project.html"), preview: path.resolve(import.meta.dirname, "preview.html") }
          : {}),
      },
    },
  },
})
