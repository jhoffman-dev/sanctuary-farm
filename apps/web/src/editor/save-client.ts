/**
 * The browser half of Save: posts both files to the dev server's editor
 * endpoints (`vite.config.ts`). The browser cannot write the repo; the dev
 * server validates each body with the game's own parsers and writes it.
 */
import { type WorldDraft, serializeWorldOverrides, serializeWorldSettings } from '@sf/world'
import { editorSaveRoute } from '../dev-server/editor-save-routes'

export type SaveOutcome = { readonly ok: true } | { readonly ok: false; readonly reason: string }

export type Post = (url: string, init: { method: 'POST'; headers: Record<string, string>; body: string }) => Promise<Response>

async function postFile(post: Post, url: string, body: string): Promise<SaveOutcome> {
  let response: Response
  try {
    response = await post(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  } catch (error) {
    return { ok: false, reason: `the dev server did not answer (${error instanceof Error ? error.message : String(error)}) — is \`pnpm dev\` running?` }
  }
  if (response.ok) return { ok: true }
  // A refusal without a JSON body (a proxy page, a crash) still reports its status below.
  const answer = (await response.json().catch(() => ({}))) as { reason?: unknown }
  return { ok: false, reason: typeof answer.reason === 'string' ? answer.reason : `the dev server answered ${response.status}` }
}

/** Writes `overrides.json`, then `world.json`; stops at the first refusal and says why. */
export async function saveWorldDraft(draft: WorldDraft, post: Post): Promise<SaveOutcome> {
  const overrides = await postFile(post, editorSaveRoute('overrides'), serializeWorldOverrides(draft.overrides))
  if (!overrides.ok) return overrides
  return postFile(post, editorSaveRoute('world'), serializeWorldSettings(draft.settings))
}
