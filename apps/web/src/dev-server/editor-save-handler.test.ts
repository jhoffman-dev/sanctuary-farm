// @vitest-environment node
/**
 * The save endpoint against the real filesystem: a POST round-trips to a file
 * in a temporary layouts directory, and every refusal leaves the file alone.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prepareEditorSave } from './editor-save'
import { handleEditorSave } from './editor-save-handler'

const ORIGINAL = '{\n  "schemaVersion": 1,\n  "edits": []\n}\n'

type Answer = { status: number; body: Record<string, unknown> }

const DEV_HOST = 'localhost:5173'
/** What the editor page's own `fetch` sends. */
const EDITOR_HEADERS = { host: DEV_HOST, origin: `http://${DEV_HOST}`, 'content-type': 'application/json' }

function request(method: string, url: string, body = '', headers: Record<string, string> = EDITOR_HEADERS): IncomingMessage {
  return Object.assign(Readable.from([Buffer.from(body)]), { method, url, headers }) as unknown as IncomingMessage
}

function response(): { response: ServerResponse; answer: Promise<Answer> } {
  let settle: (answer: Answer) => void = () => undefined
  const answer = new Promise<Answer>((resolve) => (settle = resolve))
  const fake = {
    statusCode: 200,
    setHeader: () => undefined,
    end(text: string) {
      settle({ status: fake.statusCode, body: JSON.parse(text) as Record<string, unknown> })
    },
  }
  return { response: fake as unknown as ServerResponse, answer }
}

let layoutsDir = ''

beforeEach(async () => {
  layoutsDir = await mkdtemp(join(tmpdir(), 'sf-editor-save-'))
  await writeFile(join(layoutsDir, 'overrides.json'), ORIGINAL)
})

afterEach(async () => {
  await rm(layoutsDir, { recursive: true, force: true })
})

async function post(
  url: string,
  body: string,
  written: string[] = [],
  headers: Record<string, string> = EDITOR_HEADERS,
): Promise<{ handled: boolean; answer: Answer }> {
  const { response: res, answer } = response()
  const handled = await handleEditorSave(request('POST', url, body, headers), res, {
    layoutsDir,
    prepare: prepareEditorSave,
    onWritten: (path) => written.push(path),
  })
  return { handled, answer: await answer }
}

describe('handleEditorSave', () => {
  it('writes a valid save to the layouts directory and says which file', async () => {
    const written: string[] = []
    const edits = [{ op: 'remove-decor', at: { x: 4, z: -3 } }]
    const { handled, answer } = await post('/__editor/overrides', JSON.stringify({ schemaVersion: 1, edits }), written)
    expect(handled).toBe(true)
    expect(answer).toEqual({ status: 200, body: { ok: true, file: 'overrides.json' } })
    expect(await readFile(join(layoutsDir, 'overrides.json'), 'utf8')).toBe(
      '{\n  "schemaVersion": 1,\n  "edits": [\n    { "op": "remove-decor", "at": { "x": 4, "z": -3 } }\n  ]\n}\n',
    )
    expect(written).toEqual([join(layoutsDir, 'overrides.json')])
  })

  it('refuses an invalid save with a 400 and the reason, leaving the file as it was', async () => {
    const { answer } = await post('/__editor/overrides', JSON.stringify({ schemaVersion: 2, edits: [] }))
    expect(answer.status).toBe(400)
    expect(answer.body.reason).toBe('overrides.json was not saved — schemaVersion: expected 1')
    expect(await readFile(join(layoutsDir, 'overrides.json'), 'utf8')).toBe(ORIGINAL)
  })

  it('refuses a body over the size limit', async () => {
    const { answer } = await post('/__editor/world', 'x'.repeat(1_000_001))
    expect(answer.status).toBe(413)
  })

  it('answers only POST', async () => {
    const { response: res, answer } = response()
    await handleEditorSave(request('GET', '/__editor/world'), res, { layoutsDir, prepare: prepareEditorSave })
    expect((await answer).status).toBe(405)
  })

  it('leaves every other request to the rest of the server', async () => {
    const { response: res } = response()
    expect(await handleEditorSave(request('POST', '/src/main.tsx'), res, { layoutsDir, prepare: prepareEditorSave })).toBe(false)
  })

  const VALID = JSON.stringify({ schemaVersion: 1, edits: [{ op: 'remove-decor', at: { x: 1, z: 1 } }] })

  it('refuses a body that is not declared JSON with a 415, so no cross-site simple POST can save', async () => {
    for (const contentType of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x']) {
      const { answer } = await post('/__editor/overrides', VALID, [], { ...EDITOR_HEADERS, 'content-type': contentType })
      expect(answer.status).toBe(415)
    }
    const { answer } = await post('/__editor/overrides', VALID, [], { host: DEV_HOST, origin: `http://${DEV_HOST}` })
    expect(answer.status).toBe(415)
    expect(await readFile(join(layoutsDir, 'overrides.json'), 'utf8')).toBe(ORIGINAL)
  })

  it('accepts JSON with a charset', async () => {
    const { answer } = await post('/__editor/overrides', VALID, [], { ...EDITOR_HEADERS, 'content-type': 'application/json; charset=utf-8' })
    expect(answer.status).toBe(200)
  })

  it('refuses a save from any other origin with a 403, leaving the file as it was', async () => {
    for (const origin of ['http://evil.example', 'http://localhost:3000', 'null']) {
      const { answer } = await post('/__editor/overrides', VALID, [], { ...EDITOR_HEADERS, origin })
      expect(answer.status).toBe(403)
    }
    expect(await readFile(join(layoutsDir, 'overrides.json'), 'utf8')).toBe(ORIGINAL)
  })

  it('accepts a save with no Origin: browsers always send one on POST, so that is a local tool, not a page', async () => {
    const { answer } = await post('/__editor/overrides', VALID, [], { host: DEV_HOST, 'content-type': 'application/json' })
    expect(answer.status).toBe(200)
  })

  it('fails loudly when the directory cannot be written', async () => {
    const { response: res } = response()
    const save = handleEditorSave(request('POST', '/__editor/overrides', ORIGINAL), res, {
      layoutsDir: join(layoutsDir, 'missing'),
      prepare: prepareEditorSave,
    })
    await expect(save).rejects.toThrow(/ENOENT/)
  })
})
