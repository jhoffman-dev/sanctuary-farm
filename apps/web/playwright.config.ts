import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // CI renders WebGL in software (SwiftShader), which takes every core it can get: two
  // workers' farms starve each other's frames and main threads, so a test's speed would
  // depend on what the other worker happens to be drawing. One farm at a time, as a player has.
  workers: process.env.CI ? 1 : '50%', // '50%' is Playwright's own default
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Build then serve the production bundle: e2e exercises what ships, not
    // the dev server. The build is a few seconds, so re-running it after CI's
    // own `pnpm build` is cheaper than a confusing "dist not found" locally.
    command: `pnpm exec vite build && pnpm exec vite preview --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
