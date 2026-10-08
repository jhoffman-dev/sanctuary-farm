import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The world chunk is meant to be big — it is three + r3f and nothing else,
    // and it is lazy. Its real budget is in gzipped bytes and enforced by
    // `pnpm size`; this only stops a raw-byte warning about a chunk we already
    // measure. Keep it just above the world chunk so a new dependency still shouts.
    chunkSizeWarningLimit: 1000,
  },
})
