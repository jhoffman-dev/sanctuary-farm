import { defineConfig, devices } from '@playwright/test'

const PROD_PORT = 4173
const DEV_PORT = 5174
const prodURL = `http://localhost:${PROD_PORT}`
const devURL = `http://localhost:${DEV_PORT}`
/** Specs for dev-only routes (`?assets=1`, `?view=`), which the production build does not contain. */
const DEV_ONLY = /\.dev\.spec\.ts$/

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', testIgnore: DEV_ONLY, use: { ...devices['Desktop Chrome'], baseURL: prodURL } },
    { name: 'chromium-dev', testMatch: DEV_ONLY, use: { ...devices['Desktop Chrome'], baseURL: devURL } },
  ],
  webServer: [
    {
      // Build then serve the production bundle: e2e exercises what ships, not
      // the dev server. The build is a few seconds, so re-running it after CI's
      // own `pnpm build` is cheaper than a confusing "dist not found" locally.
      command: `pnpm exec vite build && pnpm exec vite preview --port ${PROD_PORT} --strictPort`,
      url: prodURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `pnpm exec vite --port ${DEV_PORT} --strictPort`,
      url: devURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
