import { createServer } from 'node:net'
import { describe, expect, it } from 'vitest'
import { e2eServerPort } from './server-port'

const KEY = 'E2E_TEST_PORT'
const FIXED = 4173

/** Resolves once `port` has been bound and released, proving nothing else held it. */
const bindable = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.listen(port, () => server.close(() => resolve(true)))
  })

describe('e2eServerPort', () => {
  it('gives a run a free port of its own and never reuses a server', async () => {
    const env: NodeJS.ProcessEnv = {}

    const { port, reuseExistingServer } = e2eServerPort({ envKey: KEY, fixedPort: FIXED, env })

    expect(reuseExistingServer).toBe(false)
    expect(port).not.toBe(FIXED)
    expect(await bindable(port)).toBe(true)
  })

  it('returns the same port when the config is loaded again in a worker', () => {
    const env: NodeJS.ProcessEnv = {}

    const runner = e2eServerPort({ envKey: KEY, fixedPort: FIXED, env })
    const worker = e2eServerPort({ envKey: KEY, fixedPort: FIXED, env })

    expect(worker.port).toBe(runner.port)
    expect(env[KEY]).toBe(String(runner.port))
  })

  it('honours a port pinned in the env, still without reuse', () => {
    const result = e2eServerPort({ envKey: KEY, fixedPort: FIXED, env: { [KEY]: '6123' } })

    expect(result).toEqual({ port: 6123, reuseExistingServer: false })
  })

  it('opts in to the fixed port and reuse with E2E_REUSE_SERVER=1', () => {
    const result = e2eServerPort({ envKey: KEY, fixedPort: FIXED, env: { E2E_REUSE_SERVER: '1' } })

    expect(result).toEqual({ port: FIXED, reuseExistingServer: true })
  })

  it('reuses a server on a pinned port when opted in', () => {
    const env = { E2E_REUSE_SERVER: '1', [KEY]: '5199' }

    expect(e2eServerPort({ envKey: KEY, fixedPort: FIXED, env })).toEqual({ port: 5199, reuseExistingServer: true })
  })

  it.each(['abc', '0', '70000', '41.5'])('rejects a pinned port of %j', (value) => {
    expect(() => e2eServerPort({ envKey: KEY, fixedPort: FIXED, env: { [KEY]: value } })).toThrow(
      `${KEY} must be a TCP port, got "${value}"`,
    )
  })
})
