/**
 * The world editor's save endpoint as a plain Node request handler: the
 * adapter between an HTTP POST and a file in `packages/world/layouts/`. It
 * decides nothing — the injected `prepare` (`prepareEditorSave`) says what may be written.
 */
import { writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import { EDITOR_SAVE_FILES, editorSaveTarget, type PrepareEditorSave } from './editor-save-routes.ts'

/** Far above any real overrides file; stops a runaway body filling memory. */
const MAX_BODY_BYTES = 1_000_000

export type EditorSaveHandlerOptions = {
  readonly layoutsDir: string
  readonly prepare: PrepareEditorSave
  /** Told the path and text of every file written, so the dev server can skip reloading for it. */
  readonly onWritten?: (path: string, contents: string) => void
}

class BodyTooLarge extends Error {}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new BodyTooLarge()
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function reply(response: ServerResponse, status: number, body: Record<string, unknown>): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}

/** Returns `true` when it answered the request, `false` when the request is not a save. */
export async function handleEditorSave(
  request: IncomingMessage,
  response: ServerResponse,
  { layoutsDir, prepare, onWritten }: EditorSaveHandlerOptions,
): Promise<boolean> {
  const target = editorSaveTarget(request.url?.split('?')[0] ?? '')
  if (target === null) return false
  if (request.method !== 'POST') {
    reply(response, 405, { ok: false, reason: 'use POST' })
    return true
  }
  let body: string
  try {
    body = await readBody(request)
  } catch (error) {
    if (!(error instanceof BodyTooLarge)) throw error
    reply(response, 413, { ok: false, reason: `the body is over ${MAX_BODY_BYTES} bytes` })
    return true
  }
  const prepared = prepare(target, body)
  if (!prepared.ok) {
    reply(response, 400, prepared)
    return true
  }
  const path = join(layoutsDir, EDITOR_SAVE_FILES[target])
  onWritten?.(path, prepared.contents)
  await writeFile(path, prepared.contents, 'utf8')
  reply(response, 200, { ok: true, file: EDITOR_SAVE_FILES[target] })
  return true
}
