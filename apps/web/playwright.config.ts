import { defineConfig, devices } from '@playwright/test'
import { e2eServerPort } from '../../scripts/e2e/server-port.ts'

// Each run serves on ports of its own unless E2E_REUSE_SERVER=1 (SF-90).
const prod = e2eServerPort({ envKey: 'E2E_WEB_PREVIEW_PORT', fixedPort: 4173 })
const dev = e2eServerPort({ envKey: 'E2E_WEB_DEV_PORT', fixedPort: 5174 })
const prodURL = `http://localhost:${prod.port}`
const devURL = `http://localhost:${dev.port}`
/** Specs for dev-only routes (`?assets=1`, `?view=`, `?edit=1`), which the production build does not contain. */
const DEV_ONLY = /\.dev\.spec\.ts$/
/**
 * The world editor's spec saves into `packages/world/layouts/` and restores
 * the files afterwards. Other dev specs read those files through the same dev
 * server, so it runs only once they have finished.
 */
const WRITES_LAYOUTS = /editor\.dev\.spec\.ts$/

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
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', testIgnore: DEV_ONLY, use: { ...devices['Desktop Chrome'], baseURL: prodURL } },
    {
      name: 'chromium-dev',
      testMatch: DEV_ONLY,
      testIgnore: WRITES_LAYOUTS,
      use: { ...devices['Desktop Chrome'], baseURL: devURL },
    },
    {
      name: 'chromium-dev-editor',
      testMatch: WRITES_LAYOUTS,
      dependencies: ['chromium-dev'],
      use: { ...devices['Desktop Chrome'], baseURL: devURL },
    },
  ],
  webServer: [
    {
      // Build then serve the production bundle: e2e exercises what ships, not
      // the dev server. The build is a few seconds, so re-running it after CI's
      // own `pnpm build` is cheaper than a confusing "dist not found" locally.
      command: `pnpm exec vite build && pnpm exec vite preview --port ${prod.port} --strictPort`,
      url: prodURL,
      reuseExistingServer: prod.reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: `pnpm exec vite --port ${dev.port} --strictPort`,
      url: devURL,
      reuseExistingServer: dev.reuseExistingServer,
      timeout: 120_000,
    },
  ],
})
