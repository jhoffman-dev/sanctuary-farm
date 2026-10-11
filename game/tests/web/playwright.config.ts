import { defineConfig, devices } from '@playwright/test'
import { e2eServerPort } from '../../../scripts/e2e/server-port.ts'

// Smoke for the Godot web export. Run `pnpm godot:export:web` first; this
// serves game/build/web as Firebase Hosting would. Each run takes a free port
// of its own unless E2E_REUSE_SERVER=1 (SF-90).
const server = e2eServerPort({ envKey: 'E2E_GODOT_PORT', fixedPort: 4190 })
const baseURL = `http://localhost:${server.port}`

export default defineConfig({
  testDir: '.',
  // The throttled load timer has its own config (load-timing.config.ts).
  testIgnore: 'load-timing.spec.ts',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The engine is ~40 MB of wasm compiled in a software-GL browser.
  timeout: 120_000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  outputDir: '../../build/test-results',
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
  webServer: {
    command: `node ./serve.mjs ${server.port}`,
    cwd: import.meta.dirname,
    url: baseURL,
    reuseExistingServer: server.reuseExistingServer,
    timeout: 30_000,
  },
})
