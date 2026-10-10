/**
 * The world editor's save endpoint as a plain Node request handler: the
 * adapter between an HTTP POST and a file in `packages/world/layouts/`. It
 * decides nothing — the injected `prepare` (`prepareEditorSave`) says what may be written.
 */
import { rename, rm, writeFile } from 'node:fs/promises'
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

/** The write still to finish for each file; the next write to that file waits for it. */
const pendingWrites = new Map<string, Promise<void>>()
let tempSerial = 0

/**
 * Writes the whole file or nothing: into a temp file beside it, then a rename,
 * which replaces the file in one step. A failed write removes its temp file.
 */
async function writeWhole(path: string, contents: string): Promise<void> {
  tempSerial += 1
  const temp = `${path}.${process.pid}.${tempSerial}.tmp`
  try {
    await writeFile(temp, contents, 'utf8')
    await rename(temp, path)
  } catch (error) {
    await rm(temp, { force: true })
    throw error
  }
}

/** Writes to one file run one after another, in arrival order, so the last save is the one left. */
function writeInTurn(path: string, write: () => Promise<void>): Promise<void> {
  const previous = pendingWrites.get(path) ?? Promise.resolve()
  // The previous writer already reported its own failure to its own request.
  const next = previous.catch(() => undefined).then(write)
  pendingWrites.set(path, next)
  const forget = () => {
    if (pendingWrites.get(path) === next) pendingWrites.delete(path)
  }
  next.then(forget, forget)
  return next
}

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

/**
 * Only the editor page itself may save. A page on another origin can still
 * send a "simple" cross-site POST (text/plain, no preflight), so the body must
 * be declared JSON and any `Origin` must be this dev server's own. Browsers
 * always send `Origin` on a POST, so a request without one comes from a local
 * tool (curl, a script), which could write the file directly anyway.
 */
function refusal(request: IncomingMessage): { status: number; reason: string } | null {
  const mediaType = request.headers['content-type']?.split(';')[0]?.trim().toLowerCase()
  if (mediaType !== 'application/json') return { status: 415, reason: 'send the save as application/json' }
  const { origin, host } = request.headers
  if (origin !== undefined && !isOwnOrigin(origin, host)) return { status: 403, reason: 'saves come from the editor page only' }
  return null
}

function isOwnOrigin(origin: string, host: string | undefined): boolean {
  // `Origin: null` (sandboxed frames, file:) and malformed values are never this server.
  if (!URL.canParse(origin)) return false
  return host !== undefined && new URL(origin).host === host
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
  const refused = refusal(request)
  if (refused) {
    reply(response, refused.status, { ok: false, reason: refused.reason })
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
  await writeInTurn(path, async () => {
    // Told inside the turn, so the dev server compares against the save actually being written.
    onWritten?.(path, prepared.contents)
    await writeWhole(path, prepared.contents)
  })
  reply(response, 200, { ok: true, file: EDITOR_SAVE_FILES[target] })
  return true
}
