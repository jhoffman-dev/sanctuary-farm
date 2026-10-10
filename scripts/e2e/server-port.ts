import { execFileSync } from 'node:child_process'

/** Set to `1` to serve on the fixed port and attach to a server already running there. */
export const REUSE_SERVER_ENV = 'E2E_REUSE_SERVER'

export interface E2eServerPort {
  port: number
  reuseExistingServer: boolean
}

export interface E2eServerPortRequest {
  /** Env var that carries the chosen port to Playwright's workers, and lets a caller pin one. */
  envKey: string
  /** The port a developer's own long-running server listens on. */
  fixedPort: number
  env?: NodeJS.ProcessEnv
}

// The Playwright config must be synchronous, so the OS is asked for a free
// port from a short-lived child process. Listening without a host claims the
// port on every interface, as Vite and the landing server do.
const FREE_PORT_SCRIPT =
  "const s=require('node:net').createServer();s.listen(0,()=>{process.stdout.write(String(s.address().port));s.close()})"

const freePort = (): string => execFileSync(process.execPath, ['-e', FREE_PORT_SCRIPT], { encoding: 'utf8' })

/**
 * The port an e2e web server listens on, and whether it may reuse a server
 * already there. By default every run gets a port of its own and never
 * reuses, so concurrent runs in different worktrees cannot test each other's
 * build. Playwright loads the config again in each worker; the chosen port is
 * kept in `env` so the workers agree with the runner.
 */
export function e2eServerPort({ envKey, fixedPort, env = process.env }: E2eServerPortRequest): E2eServerPort {
  if (env[REUSE_SERVER_ENV] === '1') {
    return { port: parsePort(envKey, env[envKey] || String(fixedPort)), reuseExistingServer: true }
  }
  env[envKey] ||= freePort()
  return { port: parsePort(envKey, env[envKey]), reuseExistingServer: false }
}

function parsePort(envKey: string, value: string): number {
  const port = Number(value)
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`${envKey} must be a TCP port, got "${value}"`)
  }
  return port
}
