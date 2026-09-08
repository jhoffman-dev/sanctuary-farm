import { describe, expect, it } from 'vitest'
import { respondHealth } from './health.js'

/** Records what the handler wrote, standing in for the Express response. */
function fakeResponse() {
  const sent: unknown[] = []
  return { sent, json: (body: unknown) => void sent.push(body) }
}

describe('respondHealth', () => {
  it('answers a probe with an ok report naming the service', () => {
    const response = fakeResponse()

    respondHealth({}, response)

    expect(response.sent).toEqual([{ ok: true, service: 'sanctuary-farm-functions' }])
  })

  it('reports nothing beyond liveness, whatever the request carries', () => {
    const response = fakeResponse()

    respondHealth({ headers: { cookie: 'session=secret' }, ip: '203.0.113.7' }, response)

    expect(Object.keys(response.sent[0] as object)).toEqual(['ok', 'service'])
  })
})
