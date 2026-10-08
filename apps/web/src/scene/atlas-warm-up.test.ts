import { PIECE_IDS } from '@sf/world'
import { describe, expect, it } from 'vitest'
import { KENNEY_CATALOGUE } from '../world-assets'
import { atlasWarmUp } from './atlas-warm-up'

type Source = { readonly url: string; readonly atlasUrl: string }

/** The editor's ghosts: every piece, in `PIECE_IDS` order (GhostPreload). */
const ghostSources: Source[] = PIECE_IDS.map((pieceId) => KENNEY_CATALOGUE[pieceId])
/**
 * The world's pieces, sorted by URL (WorldPieces), and without the ghosts'
 * first model of each atlas, so the two lists would pick different firsts.
 */
const ghostFirsts = new Set([...new Map(ghostSources.map((source) => [source.atlasUrl, source.url])).values()])
const worldSources: Source[] = [...ghostSources]
  .filter((source) => !ghostFirsts.has(source.url))
  .sort((one, other) => (one.url < other.url ? -1 : 1))

function recordingLoads() {
  const loads: string[] = []
  const settle = new Map<string, { resolve: () => void; reject: (error: Error) => void }>()
  const load = (url: string) =>
    new Promise<void>((resolve, reject) => {
      loads.push(url)
      settle.set(url, { resolve, reject })
    })
  return { load, loads, settle }
}

const atlasOf = (url: string) => ghostSources.find((source) => source.url === url)?.atlasUrl

describe('atlasWarmUp', () => {
  it('has the world and the ghosts warm each shared atlas with the same one GLB, whoever asks first', () => {
    expect(new Set(worldSources.map((source) => source.atlasUrl)).size).toBeGreaterThan(0)
    for (const callers of [
      [worldSources, ghostSources],
      [ghostSources, worldSources],
    ]) {
      const { load, loads } = recordingLoads()
      const warmUp = atlasWarmUp(load)
      for (const sources of callers) void warmUp.ready(sources)
      const atlases = loads.map(atlasOf)
      expect(new Set(atlases).size, 'one warm-up GLB per atlas, never two in flight').toBe(atlases.length)
      expect(new Set(atlases)).toEqual(new Set(ghostSources.map((source) => source.atlasUrl)))
      for (const { atlasUrl } of [...worldSources, ...ghostSources]) {
        expect(loads).toContain(warmUp.warmUpUrl(atlasUrl))
      }
    }
  })

  it('gives every caller with the same atlases the same promise, so a suspended render can resume', () => {
    const warmUp = atlasWarmUp(recordingLoads().load)
    expect(warmUp.ready(worldSources)).toBe(warmUp.ready([...worldSources].reverse()))
  })

  it('resolves only once every atlas the caller needs has finished its warm-up', async () => {
    const { load, loads, settle } = recordingLoads()
    const warmUp = atlasWarmUp(load)
    let ready = false
    void warmUp.ready(ghostSources).then(() => (ready = true))
    for (const url of loads.slice(0, -1)) settle.get(url)?.resolve()
    await Promise.resolve()
    expect(ready).toBe(false)
    settle.get(loads.at(-1) ?? '')?.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(ready).toBe(true)
  })

  it('forgets a failed warm-up, so a retry loads the atlas again', async () => {
    const { load, loads, settle } = recordingLoads()
    const warmUp = atlasWarmUp(load)
    const [source] = ghostSources as [Source]
    const failed = warmUp.ready([source])
    settle.get(source.url)?.reject(new Error('offline'))
    await expect(failed).rejects.toThrow('offline')
    void warmUp.ready([source])
    expect(loads).toEqual([source.url, source.url])
  })
})
