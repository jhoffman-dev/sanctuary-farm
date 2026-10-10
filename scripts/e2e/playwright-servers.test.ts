import { createServer, type Server } from 'node:net'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * SF-90: the ports the e2e configs used to hard-code. Another worktree's run
 * may hold them at any moment; a run here must never attach to that server.
 */
const LEGACY_PORTS = [4173, 5174, 4180]

const CONFIGS = {
  web: '../../apps/web/playwright.config.ts',
  landing: '../../apps/landing/playwright.config.ts',
} as const

interface WebServerEntry {
  url?: string
  reuseExistingServer?: boolean
}

interface LoadedConfig {
  webServer?: WebServerEntry | WebServerEntry[]
  use?: { baseURL?: string }
  projects?: { use?: { baseURL?: string } }[]
}

const impostors: Server[] = []

/** Hold a legacy port the way another worktree's server would. */
const occupy = (port: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', (error: NodeJS.ErrnoException) => {
      // Already held by a real run elsewhere: the port is foreign either way.
      if (error.code === 'EADDRINUSE') resolve()
      else reject(error)
    })
    server.listen(port, () => {
      impostors.push(server)
      resolve()
    })
  })

const loadConfig = async (path: string): Promise<LoadedConfig> => {
  vi.resetModules()
  const loaded = (await import(path)) as { default: LoadedConfig }
  return loaded.default
}

const serversOf = (config: LoadedConfig): WebServerEntry[] =>
  [config.webServer ?? []].flat()

const baseURLsOf = (config: LoadedConfig): string[] =>
  [config.use?.baseURL, ...(config.projects ?? []).map((project) => project.use?.baseURL)].filter(
    (url): url is string => url !== undefined,
  )

const portOf = (url: string | undefined): number => Number(new URL(url ?? '').port)

beforeAll(async () => {
  await Promise.all(LEGACY_PORTS.map(occupy))
})

afterAll(async () => {
  await Promise.all(impostors.map((server) => new Promise((resolve) => server.close(resolve))))
})

beforeEach(() => {
  vi.stubEnv('CI', '')
  vi.stubEnv('E2E_REUSE_SERVER', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe.each(Object.entries(CONFIGS))('%s Playwright config, with the legacy ports held by another server', (_, path) => {
  it('never reuses an existing server', async () => {
    const config = await loadConfig(path)

    for (const server of serversOf(config)) expect(server.reuseExistingServer).toBe(false)
  })

  it('serves on a port no other run is using', async () => {
    const config = await loadConfig(path)

    for (const server of serversOf(config)) expect(LEGACY_PORTS).not.toContain(portOf(server.url))
  })

  it('points every baseURL at one of its own servers', async () => {
    const config = await loadConfig(path)
    const ownPorts = serversOf(config).map((server) => portOf(server.url))

    for (const url of baseURLsOf(config)) expect(ownPorts).toContain(portOf(url))
  })
})
