import { NO_OVERRIDES, loadWorldSettings } from '@sf/world'
import { describe, expect, it } from 'vitest'
import { saveWorldDraft } from './save-client'

const draft = { settings: loadWorldSettings(), overrides: NO_OVERRIDES }

function answering(...replies: Array<Response | Error>) {
  const calls: { url: string; body: string }[] = []
  const post = async (url: string, init: { body: string }) => {
    calls.push({ url, body: init.body })
    const reply = replies[calls.length - 1]
    if (reply instanceof Error) throw reply
    if (!reply) throw new Error('unexpected request')
    return reply
  }
  return { post, calls }
}

describe('saveWorldDraft', () => {
  it('posts the overrides and then the world settings, in their canonical text', async () => {
    const { post, calls } = answering(Response.json({ ok: true }), Response.json({ ok: true }))
    expect(await saveWorldDraft(draft, post)).toEqual({ ok: true })
    expect(calls.map((call) => call.url)).toEqual(['/__editor/overrides', '/__editor/world'])
    expect(calls[0]?.body).toBe('{\n  "schemaVersion": 1,\n  "edits": []\n}\n')
    expect(JSON.parse(calls[1]?.body ?? '')).toMatchObject({ seed: draft.settings.seed })
  })

  it('stops at a refusal and passes on the server’s reason', async () => {
    const { post, calls } = answering(Response.json({ ok: false, reason: 'overrides.json was not saved — x' }, { status: 400 }))
    expect(await saveWorldDraft(draft, post)).toEqual({ ok: false, reason: 'overrides.json was not saved — x' })
    expect(calls).toHaveLength(1)
  })

  it('reports the status when a refusal has no reason', async () => {
    const { post } = answering(Response.json({ ok: true }), new Response('oops', { status: 500 }))
    expect(await saveWorldDraft(draft, post)).toEqual({ ok: false, reason: 'the dev server answered 500' })
  })

  it('says the dev server is not answering when the request fails', async () => {
    const { post } = answering(new TypeError('Failed to fetch'))
    const outcome = await saveWorldDraft(draft, post)
    expect(outcome.ok).toBe(false)
    expect(!outcome.ok && outcome.reason).toMatch(/is `pnpm dev` running/)
  })
})
