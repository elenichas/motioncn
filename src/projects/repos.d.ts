/**
 * Code from scanned repos (imported as "@repo/<id>/...") is not type-checked here: it follows
 * its own repo's TypeScript settings and dependencies. Vite resolves it at runtime.
 */
declare module "@repo/*"
