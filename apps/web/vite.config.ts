import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { worldEditorSave } from './src/dev-server/editor-save-plugin.ts'

/** Where the world editor (`?edit=1`, dev only) saves the overrides and the world settings. */
const WORLD_LAYOUTS = fileURLToPath(new URL('../../packages/world/layouts', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), worldEditorSave({ layoutsDir: WORLD_LAYOUTS })],
  build: {
    // The world chunk is meant to be big — it is three + r3f and nothing else,
    // and it is lazy. Its real budget is in gzipped bytes and enforced by
    // `pnpm size`; this only stops a raw-byte warning about a chunk we already
    // measure. Keep it just above the world chunk so a new dependency still shouts.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // `@sf/world` (generator + layouts) is shared by the world chunk and the
        // world-building chunk; left to itself the bundler names it after its
        // directory (`src-*.js`). A fixed name keeps the size-limit path stable.
        manualChunks: (id) => (id.includes('/packages/world/') ? 'tile-world' : undefined),
      },
    },
  },
})
