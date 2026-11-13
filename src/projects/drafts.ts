import type { DraftModule } from "@/projects"

/**
 * Draft fixes: src/projects/<id>/drafts/<entry-id>.tsx. Loaded only inside preview frames, so creating
 * or editing a draft reloads just the frames that show it, not the canvas. The canvas lists drafts
 * through the dev server (/__canvas/drafts) instead.
 */
const draftFiles = import.meta.glob<DraftModule>("./*/drafts/*.tsx")
export const loadDraft = (project: string, entry: string) => draftFiles[`./${project}/drafts/${entry}.tsx`]?.()
