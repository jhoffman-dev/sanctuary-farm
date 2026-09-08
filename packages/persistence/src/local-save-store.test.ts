import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLocalSaveStore, DEFAULT_SAVE_KEY } from './local-save-store'
import { createFailingStorage, createMemoryStorage, freshFarmSave } from './test-fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('createLocalSaveStore — round-trip', () => {
  it('save then load returns the farm', async () => {
    const storage = createMemoryStorage()
    const store = createLocalSaveStore({ storage })
    const farm = freshFarmSave({ coins: 7, feed: 3 })

    await store.save(farm)

    await expect(store.load()).resolves.toEqual(farm)
  })

  it('a second store over the same storage sees what the first saved', async () => {
    const storage = createMemoryStorage()
    const farm = freshFarmSave({ coins: 7 })
    await createLocalSaveStore({ storage }).save(farm)

    await expect(createLocalSaveStore({ storage }).load()).resolves.toEqual(farm)
  })

  it('clear then load returns null', async () => {
    const storage = createMemoryStorage()
    const store = createLocalSaveStore({ storage })
    await store.save(freshFarmSave())

    await store.clear()

    await expect(store.load()).resolves.toBeNull()
    expect(storage.getItem(DEFAULT_SAVE_KEY)).toBeNull()
  })

  it('uses the global localStorage under the default key when no storage is given', async () => {
    const farm = freshFarmSave({ coins: 2 })

    await createLocalSaveStore().save(farm)

    expect(JSON.parse(localStorage.getItem(DEFAULT_SAVE_KEY) ?? 'null')).toEqual(farm)
    await expect(createLocalSaveStore().load()).resolves.toEqual(farm)
  })
})

describe('createLocalSaveStore — no save', () => {
  it('load with nothing stored is null', async () => {
    const store = createLocalSaveStore({ storage: createMemoryStorage() })
    await expect(store.load()).resolves.toBeNull()
  })

  it('load with unparsable JSON is null', async () => {
    const storage = createMemoryStorage()
    storage.setItem(DEFAULT_SAVE_KEY, '{not json')
    await expect(createLocalSaveStore({ storage }).load()).resolves.toBeNull()
  })

  it('load with a prototype v2 blob is null — v1/v2 are not migrated', async () => {
    const storage = createMemoryStorage()
    const v2Blob = {
      schemaVersion: 2,
      facts: {},
      scheduler: { facts: {}, globalCounter: 40, unlockedTiers: [1, 2], recentFamilies: [], maxTable: 12 },
      globalCounter: 40,
      creatures: [],
      care: {},
      coins: 9,
      feed: 4,
      sessions: [],
      settings: { muted: false, maxTable: 12 },
      lastChoresDate: null,
    }
    storage.setItem(DEFAULT_SAVE_KEY, JSON.stringify(v2Blob))
    await expect(createLocalSaveStore({ storage }).load()).resolves.toBeNull()
  })
})

describe('createLocalSaveStore — key isolation', () => {
  it('two stores with different keys do not see each other', async () => {
    const storage = createMemoryStorage()
    const first = createLocalSaveStore({ storage, key: 'farm/one' })
    const second = createLocalSaveStore({ storage, key: 'farm/two' })

    await first.save(freshFarmSave({ coins: 1 }))

    await expect(second.load()).resolves.toBeNull()
    await expect(createLocalSaveStore({ storage, key: 'farm/one' }).load()).resolves.toEqual(
      freshFarmSave({ coins: 1 }),
    )
  })
})

describe('createLocalSaveStore — storage failures', () => {
  it('load is null when getItem throws', async () => {
    const store = createLocalSaveStore({ storage: createFailingStorage(['getItem']) })
    await expect(store.load()).resolves.toBeNull()
  })

  it('save resolves when setItem throws and load still returns the farm', async () => {
    const store = createLocalSaveStore({ storage: createFailingStorage(['setItem']) })
    const farm = freshFarmSave({ coins: 5 })

    await expect(store.save(farm)).resolves.toBeUndefined()

    await expect(store.load()).resolves.toEqual(farm)
  })

  it('clear after a failing setItem drops the in-memory copy', async () => {
    const store = createLocalSaveStore({ storage: createFailingStorage(['setItem']) })
    await store.save(freshFarmSave())

    await store.clear()

    await expect(store.load()).resolves.toBeNull()
  })

  it('clear resolves when removeItem throws, and this session then loads no farm', async () => {
    const store = createLocalSaveStore({ storage: createFailingStorage(['removeItem']) })
    await store.save(freshFarmSave())
    await expect(store.clear()).resolves.toBeUndefined()
    await expect(store.load()).resolves.toBeNull()
  })

  it('a later successful save takes over from the in-memory copy kept after a failed one', async () => {
    const storage = createMemoryStorage()
    let refuse = true
    const flaky: Storage = {
      ...storage,
      setItem: (key, value) => {
        if (refuse) throw new Error('quota')
        storage.setItem(key, value)
      },
    }
    const store = createLocalSaveStore({ storage: flaky })
    await store.save(freshFarmSave({ coins: 1 }))
    refuse = false
    await store.save(freshFarmSave({ coins: 2 }))

    await createLocalSaveStore({ storage }).save(freshFarmSave({ coins: 3 }))

    await expect(store.load()).resolves.toMatchObject({ coins: 3 })
  })

  it('works where localStorage does not exist at all', async () => {
    vi.stubGlobal('localStorage', undefined)
    const store = createLocalSaveStore()
    const farm = freshFarmSave({ coins: 3 })

    await expect(store.load()).resolves.toBeNull()
    await expect(store.save(farm)).resolves.toBeUndefined()
    await expect(store.load()).resolves.toEqual(farm)
    await expect(store.clear()).resolves.toBeUndefined()
  })

  it('works where merely touching localStorage throws (opaque origin)', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError')
      },
    })
    try {
      const store = createLocalSaveStore()
      await expect(store.load()).resolves.toBeNull()
      await store.save(freshFarmSave({ coins: 4 }))
      await expect(store.load()).resolves.toEqual(freshFarmSave({ coins: 4 }))
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    }
  })
})
