import { defineConfig, devices } from '@playwright/test'
import { e2eServerPort } from '../../scripts/e2e/server-port.ts'

// Each run serves on a port of its own unless E2E_REUSE_SERVER=1 (SF-90).
const server = e2eServerPort({ envKey: 'E2E_LANDING_PORT', fixedPort: 4180 })
const baseURL = `http://localhost:${server.port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // The landing site has no build step: serve the folder itself, so the spec
    // checks the files Firebase Hosting uploads verbatim.
    command: `node ./e2e/serve.mjs ${server.port}`,
    url: baseURL,
    reuseExistingServer: server.reuseExistingServer,
    timeout: 30_000,
  },
})
