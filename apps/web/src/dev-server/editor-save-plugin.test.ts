// @vitest-environment node
/**
 * The dev-server plugin's one rule: a layouts file the editor just wrote is
 * not hot-reloaded (the editor already shows it), but any other change is.
 * Driven through the plugin's own middleware against a temporary directory.
 */
import { mkdtemp, rm } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prepareEditorSave } from './editor-save'
import { worldEditorSave } from './editor-save-plugin'

type Middleware = (request: IncomingMessage, response: ServerResponse, next: (error?: unknown) => void) => void
type HotUpdate = (options: { file: string; read: () => Promise<string> }) => Promise<unknown[] | undefined>

const SAVED = JSON.stringify({ schemaVersion: 1, edits: [{ op: 'remove-decor', at: { x: 2, z: 3 } }] })

let layoutsDir = ''

beforeEach(async () => {
  layoutsDir = await mkdtemp(join(tmpdir(), 'sf-editor-plugin-'))
})

afterEach(async () => {
  await rm(layoutsDir, { recursive: true, force: true })
})

function startPlugin(): { middleware: Middleware; hotUpdate: HotUpdate } {
  const plugin = worldEditorSave({ layoutsDir })
  let middleware: Middleware | undefined
  const server = {
    middlewares: { use: (handler: Middleware) => (middleware = handler) },
    ssrLoadModule: async () => ({ prepareEditorSave }),
  }
  ;(plugin.configureServer as (server: unknown) => void)(server)
  if (!middleware) throw new Error('the plugin installed no middleware')
  return { middleware, hotUpdate: plugin.hotUpdate as unknown as HotUpdate }
}

/** Sends a save through the middleware and resolves with the status once it is answered. */
function saveThrough(middleware: Middleware, body: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = Object.assign(Readable.from([Buffer.from(body)]), {
      method: 'POST',
      url: '/__editor/overrides',
      headers: { host: 'localhost:5173', origin: 'http://localhost:5173', 'content-type': 'application/json' },
    }) as unknown as IncomingMessage
    const response = { statusCode: 200, setHeader: () => undefined, end: () => resolve(response.statusCode) }
    middleware(request, response as unknown as ServerResponse, reject)
  })
}

const overridesFile = () => join(layoutsDir, 'overrides.json')
const readAs = (text: string) => async () => text

describe('worldEditorSave hot reload', () => {
  it('skips reloading a file whose text is exactly what the editor just wrote', async () => {
    const { middleware, hotUpdate } = startPlugin()
    expect(await saveThrough(middleware, SAVED)).toBe(200)
    const written = prepareEditorSave('overrides', SAVED)
    if (!written.ok) throw new Error(written.reason)
    expect(await hotUpdate({ file: overridesFile(), read: readAs(written.contents) })).toEqual([])
  })

  it('reloads the same file when a hand edit changed its text', async () => {
    const { middleware, hotUpdate } = startPlugin()
    await saveThrough(middleware, SAVED)
    expect(await hotUpdate({ file: overridesFile(), read: readAs('{ "hand": "edited" }\n') })).toBeUndefined()
  })

  it('reloads a file the editor never wrote, without reading it', async () => {
    const { hotUpdate } = startPlugin()
    let read = false
    const result = await hotUpdate({
      file: overridesFile(),
      read: async () => {
        read = true
        return ''
      },
    })
    expect(result).toBeUndefined()
    expect(read).toBe(false)
  })

  it('reloads every other file as usual', async () => {
    const { middleware, hotUpdate } = startPlugin()
    await saveThrough(middleware, SAVED)
    expect(await hotUpdate({ file: join(layoutsDir, 'farm-layout.json'), read: readAs(SAVED) })).toBeUndefined()
  })

  it('leaves every other request to the rest of the dev server', () => {
    const { middleware } = startPlugin()
    let passedOn = false
    const request = { method: 'GET', url: '/src/main.tsx', headers: {} } as unknown as IncomingMessage
    middleware(request, {} as ServerResponse, () => (passedOn = true))
    expect(passedOn).toBe(true)
  })

  it('hands a failed write to the next middleware as an error', async () => {
    const { middleware } = startPlugin()
    await rm(layoutsDir, { recursive: true, force: true })
    await expect(saveThrough(middleware, SAVED)).rejects.toThrow(/ENOENT/)
  })
})
