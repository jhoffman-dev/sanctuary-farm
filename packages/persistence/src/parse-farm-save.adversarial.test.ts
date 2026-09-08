import type { FarmSave } from '@sf/domain'
import { createRng, emptyFarmSave, gradeAnswer, nextFact, nextFactInFamily } from '@sf/domain'
import { describe, expect, it } from 'vitest'
import { createLocalSaveStore, DEFAULT_SAVE_KEY } from './local-save-store'
import { parseFarmSave } from './parse-farm-save'
import { createMemoryStorage, freshFarmSave } from './test-fixtures'

/** A real, playable save a few questions in — what the app actually writes. */
function playedSave(): FarmSave {
  const farm = emptyFarmSave()
  const rng = createRng(3)
  let scheduler = farm.scheduler
  for (let i = 0; i < 25; i++) {
    const served = nextFact(scheduler, rng)
    scheduler = gradeAnswer(served.state, { factId: served.fact.id, given: served.fact.answer, latencyMs: 1200 }).state
  }
  return { ...farm, scheduler, coins: 7, sessions: [{ startedAt: 1, endedAt: 2, context: 'paddock', family: null, entries: [] }] }
}

function withScheduler(overrides: Record<string, unknown>): unknown {
  const farm = playedSave()
  return { ...farm, scheduler: { ...farm.scheduler, ...overrides } }
}

/** Plays two questions on a parsed save; this is what the app does right after load(). */
function playOnce(farm: FarmSave): void {
  const served = nextFact(farm.scheduler, createRng(1))
  const graded = gradeAnswer(served.state, { factId: served.fact.id, given: served.fact.answer, latencyMs: 900 })
  const again = nextFact(graded.state, createRng(2))
  gradeAnswer(again.state, { factId: again.fact.id, given: 0, latencyMs: 900 })
}

// ─── Corrupt or hostile blobs ───

describe('parseFarmSave — the structural guard against a corrupt blob', () => {
  it('a truncated blob at any length loads as null or a farm, never as an exception', async () => {
    const json = JSON.stringify(playedSave())
    const storage = createMemoryStorage()
    for (let length = 0; length < json.length; length += 97) {
      storage.setItem(DEFAULT_SAVE_KEY, json.slice(0, length))
      await expect(createLocalSaveStore({ storage }).load(), `cut at ${length}`).resolves.not.toThrow
      const loaded = await createLocalSaveStore({ storage }).load()
      expect(loaded === null || typeof loaded === 'object', `cut at ${length}`).toBe(true)
    }
  })

  it.each([
    ['an empty object as a fact status', { '7x8': {} }],
    ['a fact status with a string box', { '7x8': { ...playedSave().scheduler.facts['7x8'], box: '5' } }],
    ['a fact status with box 9', { '7x8': { ...playedSave().scheduler.facts['7x8'], box: 9 } }],
    ['a fact status with recentLatencies as a string', { '7x8': { ...playedSave().scheduler.facts['7x8'], recentLatencies: 'fast' } }],
    ['a fact status introduced at box 0', { '7x8': { ...playedSave().scheduler.facts['7x8'], box: 0, introduced: true } }],
    ['deeply nested junk as a fact status', { '7x8': { a: { b: { c: { d: [1, { e: null }] } } } } }],
  ])('rejects %s', (_label, facts) => {
    expect(parseFarmSave(withScheduler({ facts: { ...playedSave().scheduler.facts, ...facts } }))).toBeNull()
  })

  it.each([
    ['unlockedTiers without tier 1', { unlockedTiers: [] }],
    ['unlockedTiers with a tier above 6', { unlockedTiers: [1, 2, 99] }],
    ['a maxTable of 0', { maxTable: 0 }],
    ['a maxTable above the 12×12 table', { maxTable: 13 }],
    ['a negative globalCounter', { globalCounter: -1 }],
    ['no facts at all for a 12-table', { facts: {} }],
  ])('rejects a scheduler with %s — a state the domain can never produce', (_label, overrides) => {
    expect(parseFarmSave(withScheduler(overrides))).toBeNull()
  })

  it('rejects negative coins and feed', () => {
    expect(parseFarmSave({ ...playedSave(), coins: -1 })).toBeNull()
    expect(parseFarmSave({ ...playedSave(), feed: -1 })).toBeNull()
  })

  it('rejects a save whose settings.maxTable disagrees with its scheduler.maxTable', () => {
    const farm = playedSave()
    expect(parseFarmSave({ ...farm, settings: { muted: false, maxTable: 5 } })).toBeNull()
  })

  it.each([
    ['an empty fact status', withScheduler({ facts: { '1x1': {} }, maxTable: 1 })],
    ['no facts at all', withScheduler({ facts: {} })],
    ['a huge maxTable with no facts for it', withScheduler({ maxTable: 13 })],
  ])('any save it accepts can be played: %s either parses as null or serves and grades without throwing', (_label, raw) => {
    const parsed = parseFarmSave(raw)
    if (parsed === null) return
    expect(() => playOnce(parsed)).not.toThrow()
  })

  it('a lastServed that names no known fact is harmless for both mixed and egg practice', () => {
    const parsed = parseFarmSave(withScheduler({ lastServed: '99x99' }))
    expect(parsed).not.toBeNull()
    if (!parsed) return
    expect(() => playOnce(parsed)).not.toThrow()
    expect(() => nextFactInFamily(parsed.scheduler, 3, createRng(1))).not.toThrow()
  })

  it('a __proto__ key in the blob does not pollute Object.prototype and the save still plays', () => {
    const farm = playedSave()
    const raw = JSON.parse(
      JSON.stringify(farm).replace('"facts":{', '"facts":{"__proto__":{"polluted":true},').replace(
        '"commuteCredit":{',
        '"commuteCredit":{"__proto__":{"polluted":true},',
      ),
    ) as unknown
    const parsed = parseFarmSave({ ...(raw as object), __proto__: { polluted: true } })
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
    expect(parsed).not.toBeNull()
    if (!parsed) return
    expect(() => playOnce(parsed)).not.toThrow()
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
  })

  it('huge but finite numbers are accepted and survive a round-trip', () => {
    const farm = { ...playedSave(), coins: Number.MAX_SAFE_INTEGER, feed: 1e300 }
    const parsed = parseFarmSave(JSON.parse(JSON.stringify(farm)))
    expect(parsed?.coins).toBe(Number.MAX_SAFE_INTEGER)
    expect(parsed?.feed).toBe(1e300)
  })

  it('rejects non-finite coins, which JSON would turn into null and lose the whole farm on the next load', () => {
    expect(parseFarmSave({ ...playedSave(), coins: Number.POSITIVE_INFINITY })).toBeNull()
    expect(parseFarmSave({ ...playedSave(), coins: Number.NaN })).toBeNull()
  })

  it('the persistence fixture "freshFarmSave" is itself a playable save', () => {
    // freshFarmSave() has maxTable 12 and no facts. If this is a "well-formed v3 save",
    // the domain must be able to serve from it; if it is not, the fixture is lying.
    const parsed = parseFarmSave(freshFarmSave())
    expect(parsed).not.toBeNull()
    if (!parsed) return
    expect(() => playOnce(parsed)).not.toThrow()
  })
})

// ─── Round-trips ───

describe('save → load → save', () => {
  it('a real played save survives storage byte-for-byte through a fresh store', async () => {
    const storage = createMemoryStorage()
    const farm = playedSave()
    await createLocalSaveStore({ storage }).save(farm)
    const firstBlob = storage.getItem(DEFAULT_SAVE_KEY)

    const reloaded = await createLocalSaveStore({ storage }).load()
    expect(reloaded).toEqual(farm)
    if (!reloaded) return

    await createLocalSaveStore({ storage }).save(reloaded)
    expect(storage.getItem(DEFAULT_SAVE_KEY)).toBe(firstBlob)
  })

  it('a reloaded save continues identically to the in-memory original', () => {
    const farm = playedSave()
    const reloaded = parseFarmSave(JSON.parse(JSON.stringify(farm)))
    if (!reloaded) throw new Error('did not parse')
    const a = nextFact(farm.scheduler, createRng(9))
    const b = nextFact(reloaded.scheduler, createRng(9))
    expect(b.fact.id).toBe(a.fact.id)
    expect(b.state).toEqual(a.state)
  })

  it('stray keys nested inside scheduler, settings and a fact status are dropped, not persisted forever', () => {
    // parseFarmSave promises to rebuild the object so hand-edited keys don't leak into the domain;
    // the existing test only checks the top level.
    const farm = playedSave()
    const raw = {
      ...farm,
      scheduler: {
        ...farm.scheduler,
        prototypeQueue: [1, 2, 3],
        facts: { ...farm.scheduler.facts, '1x1': { ...farm.scheduler.facts['1x1'], creature: 'hen' } },
      },
      settings: { ...farm.settings, theme: 'dark' },
    }
    const parsed = parseFarmSave(raw)
    if (!parsed) throw new Error('did not parse')
    expect(parsed.scheduler).not.toHaveProperty('prototypeQueue')
    expect(parsed.scheduler.facts['1x1']).not.toHaveProperty('creature')
    expect(parsed.settings).not.toHaveProperty('theme')
  })
})

// ─── Two stores, one key ───

describe('two stores over one storage key', () => {
  it('load() reflects the other store’s later write instead of a stale in-memory copy', async () => {
    const storage = createMemoryStorage()
    const first = createLocalSaveStore({ storage })
    const second = createLocalSaveStore({ storage })
    await first.save(freshFarmSave({ coins: 1 }))
    await second.save(freshFarmSave({ coins: 2 }))
    await first.save(freshFarmSave({ coins: 3 }))
    await second.save(freshFarmSave({ coins: 4 }))

    expect(storage.getItem(DEFAULT_SAVE_KEY)).toContain('"coins":4')
    await expect(first.load()).resolves.toMatchObject({ coins: 4 })
  })

  it('load() after the other store cleared the key is null, not the ghost of a deleted farm', async () => {
    const storage = createMemoryStorage()
    const first = createLocalSaveStore({ storage })
    const second = createLocalSaveStore({ storage })
    await first.save(freshFarmSave({ coins: 1 }))
    await second.clear()

    expect(storage.getItem(DEFAULT_SAVE_KEY)).toBeNull()
    await expect(first.load()).resolves.toBeNull()
  })

  it('the last write wins in storage regardless of which store made it', async () => {
    const storage = createMemoryStorage()
    const first = createLocalSaveStore({ storage })
    const second = createLocalSaveStore({ storage })
    await first.save(freshFarmSave({ coins: 1 }))
    await second.save(freshFarmSave({ coins: 2 }))
    await expect(createLocalSaveStore({ storage }).load()).resolves.toMatchObject({ coins: 2 })
  })
})
