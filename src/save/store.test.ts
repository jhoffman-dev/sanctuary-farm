import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SAVE_KEY } from '@/contracts'
import { createSaveStore, emptySave, migrate } from './store'

// jsdom's default opaque origin makes `localStorage` throw; use a tiny in-memory
// Storage so these tests exercise the real read/write path.
class MemStorage {
  private m = new Map<string, string>()
  get length() {
    return this.m.size
  }
  clear() {
    this.m.clear()
  }
  getItem(key: string) {
    return this.m.has(key) ? (this.m.get(key) as string) : null
  }
  setItem(key: string, value: string) {
    this.m.set(key, String(value))
  }
  removeItem(key: string) {
    this.m.delete(key)
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemStorage())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createSaveStore — round-trip', () => {
  it('save then load round-trips a SaveData exactly', () => {
    const store = createSaveStore()
    const data = emptySave()
    data.globalCounter = 42
    data.settings.maxTable = 10
    data.currency = { pellets: 3, coins: 1 }
    data.lastChoresDate = '2026-08-20'
    store.save(data)

    const reloaded = createSaveStore().load()
    expect(reloaded).toEqual(data)
  })

  it('load() with no stored value returns a fresh save', () => {
    expect(createSaveStore().load()).toEqual(emptySave())
  })

  it('keeps an in-memory copy when localStorage.setItem throws (private mode / quota)', () => {
    const store = createSaveStore()
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const data = emptySave()
    data.globalCounter = 9
    expect(() => store.save(data)).not.toThrow()
    expect(store.load().globalCounter).toBe(9)
  })

  it('survives a corrupt stored value', () => {
    localStorage.setItem(SAVE_KEY, '{not valid json')
    expect(createSaveStore().load()).toEqual(emptySave())
  })
})

describe('migrate — never throws', () => {
  it.each([
    ['empty object', {}],
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
    ['an array', []],
    ['a partial object', { globalCounter: 5, settings: { muted: true } }],
    ['a future schema version', { schemaVersion: 99, globalCounter: 1 }],
    ['garbage-typed fields', { facts: 'x', sessions: null, scheduler: 7, currency: [] }],
    ['a bad-JSON-derived string', '{"broken":'],
  ])('returns a valid SaveData for %s', (_label, input) => {
    let out: ReturnType<typeof migrate>
    expect(() => {
      out = migrate(input)
    }).not.toThrow()
    out = migrate(input)
    expect(out.schemaVersion).toBe(1)
    expect(out.facts).toBeTypeOf('object')
    expect(Array.isArray(out.sessions)).toBe(true)
    expect(Array.isArray(out.creatures)).toBe(true)
    expect(out.settings.maxTable).toBeTypeOf('number')
    expect(out.settings.muted).toBeTypeOf('boolean')
    expect(out.currency.pellets).toBeTypeOf('number')
  })

  it('fills missing fields from emptySave()', () => {
    const out = migrate({ globalCounter: 7 })
    const fresh = emptySave()
    expect(out.globalCounter).toBe(7)
    expect(out.facts).toEqual(fresh.facts)
    expect(out.settings).toEqual(fresh.settings)
  })

  it('preserves known fields from a current-schema blob', () => {
    const blob = emptySave()
    blob.globalCounter = 128
    blob.currency = { pellets: 9, coins: 4 }
    blob.lastChoresDate = '2026-08-25'
    blob.settings = { muted: true, maxTable: 8 }
    const cloned = JSON.parse(JSON.stringify(blob)) as unknown
    expect(migrate(cloned)).toEqual(blob)
  })
})

describe('export / import / reset', () => {
  it('exportJSON pretty-prints', () => {
    const json = createSaveStore().exportJSON()
    expect(json).toContain('\n  ')
    expect(JSON.parse(json).schemaVersion).toBe(1)
  })

  it('importJSON(exportJSON()) is a no-op round-trip', () => {
    const store = createSaveStore()
    const data = emptySave()
    data.globalCounter = 11
    store.save(data)
    const json = store.exportJSON()

    const store2 = createSaveStore()
    expect(store2.importJSON(json)).toBe(true)
    expect(store2.exportJSON()).toBe(json)
  })

  it('importJSON("garbage") returns false and does not change the save', () => {
    const store = createSaveStore()
    const before = store.exportJSON()
    expect(store.importJSON('garbage')).toBe(false)
    expect(store.importJSON('null')).toBe(false)
    expect(store.exportJSON()).toBe(before)
  })

  it('reset() wipes to a fresh save', () => {
    const store = createSaveStore()
    const data = emptySave()
    data.globalCounter = 50
    store.save(data)
    store.reset()
    expect(store.load()).toEqual(emptySave())
  })
})
