import { describe, expect, it } from 'vitest'
import { createInMemorySaveStore } from './in-memory-save-store'
import { freshFarmSave } from './test-fixtures'

describe('createInMemorySaveStore', () => {
  it('starts empty by default', async () => {
    await expect(createInMemorySaveStore().load()).resolves.toBeNull()
  })

  it('starts with the given farm', async () => {
    const farm = freshFarmSave({ coins: 8 })
    await expect(createInMemorySaveStore(farm).load()).resolves.toEqual(farm)
  })

  it('save then load round-trips', async () => {
    const store = createInMemorySaveStore()
    const farm = freshFarmSave({ feed: 1 })

    await store.save(farm)

    await expect(store.load()).resolves.toEqual(farm)
  })

  it('clear then load is null', async () => {
    const store = createInMemorySaveStore(freshFarmSave())

    await store.clear()

    await expect(store.load()).resolves.toBeNull()
  })

  it('stores are independent of each other', async () => {
    const first = createInMemorySaveStore()
    const second = createInMemorySaveStore()

    await first.save(freshFarmSave({ coins: 1 }))

    await expect(second.load()).resolves.toBeNull()
  })
})
