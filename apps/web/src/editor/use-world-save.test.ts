import { NO_OVERRIDES, type WorldDraft, loadWorldSettings, withSeed } from '@sf/world'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useWorldSave } from './use-world-save'

const first: WorldDraft = { settings: loadWorldSettings(), overrides: NO_OVERRIDES }
const second = withSeed(first, first.settings.seed + 1)

/** A dev server that answers each request only when the test says so. */
function heldServer() {
  const requests: { url: string; answer: () => void }[] = []
  const post = (url: string) =>
    new Promise<Response>((resolve) => requests.push({ url, answer: () => resolve(Response.json({ ok: true })) }))
  return { post, requests }
}

/** Answers every request the server is holding, and any the answers set off, until none are left. */
async function answerAll(requests: { answer: () => void }[]): Promise<void> {
  let answered = 0
  while (answered < requests.length) {
    await act(async () => {
      requests[answered]?.answer()
      answered += 1
      await Promise.resolve()
    })
  }
}

describe('useWorldSave', () => {
  it('ignores a second save while one is in flight, so the saved draft is the one that reached disk', async () => {
    const { post, requests } = heldServer()
    const saved: WorldDraft[] = []
    const { result, rerender } = renderHook(({ draft }) => useWorldSave({ draft, post, onSaved: (done) => saved.push(done) }), {
      initialProps: { draft: first },
    })

    let firstSave: Promise<void> = Promise.resolve()
    act(() => {
      firstSave = result.current.save()
    })
    expect(result.current.status.kind).toBe('saving')
    // An edit, then ⌘S again, before the first save has been answered.
    rerender({ draft: second })
    let secondSave: Promise<void> = Promise.resolve()
    act(() => {
      secondSave = result.current.save()
    })
    await answerAll(requests)
    await act(() => Promise.all([firstSave, secondSave]))

    expect(requests.map((request) => request.url)).toEqual(['/__editor/overrides', '/__editor/world'])
    expect(saved).toEqual([first])
    expect(result.current.status.kind).toBe('saved')
  })

  it('saves again once the first save has finished', async () => {
    const { post, requests } = heldServer()
    const saved: WorldDraft[] = []
    const { result, rerender } = renderHook(({ draft }) => useWorldSave({ draft, post, onSaved: (done) => saved.push(done) }), {
      initialProps: { draft: first },
    })
    let pending: Promise<void> = Promise.resolve()
    act(() => {
      pending = result.current.save()
    })
    await answerAll(requests)
    await act(() => pending)

    rerender({ draft: second })
    act(() => {
      pending = result.current.save()
    })
    await answerAll(requests)
    await act(() => pending)

    expect(saved).toEqual([first, second])
  })
})
