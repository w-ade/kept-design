import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { bookmarksApi } from "./bookmarks-plugin.ts"

// The dashboard reads the roadmap from docs/roadmap/roadmap.json, one directory up.
// That file stays the single source of truth; nothing is copied in here.
export default defineConfig({
  plugins: [react(), bookmarksApi()],
  server: {
    port: 5174,
    open: false,
    fs: { allow: [".."] },
  },
  preview: { port: 4175 },
})
