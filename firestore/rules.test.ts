import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

/**
 * The `emulator` alias in `.firebaserc`; the `demo-` prefix keeps the SDK off
 * real Google APIs.
 */
const PROJECT_ID = 'demo-sanctuary-farm'

// In production these rules govern the *named* database `sanctuary-farm`, not
// `(default)` — the shared `student-games-be188` project holds other games, and
// rules on `(default)` would be theirs too (see `docs/deploy.md`).
// The test still runs against the emulator's default database:
// `@firebase/rules-unit-testing` 5.0.2 has no database-id option —
// `TestEnvironmentConfig.firestore` takes only `rules`/`host`/`port`, and
// `RulesTestContext.firestore()` takes compat `Settings`, which carries no
// database id. The rules source under test is byte-identical either way, so the
// contract asserted here is the one deployed; only the database it is attached
// to differs.

const RULES_FILE = fileURLToPath(new URL('../firestore.rules', import.meta.url))

/** The claim our custom-auth function (#161) puts on every token it mints. */
const FARM_CLAIMS = { game: 'sanctuary-farm' }
const OWNER = 'owner-uid'
const CLASSMATE = 'classmate-uid'
/** The size cap in `firestore.rules` (512 KiB of save JSON). */
const MAX_SAVE_CHARS = 524_288

/** The compat instance a rules-test context hands out; `doc()` accepts it. */
type ContextFirestore = ReturnType<RulesTestContext['firestore']>

let testEnvironment: RulesTestEnvironment

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(RULES_FILE, 'utf8') },
  })
})

afterEach(async () => {
  await testEnvironment.clearFirestore()
})

afterAll(async () => {
  await testEnvironment.cleanup()
})

function farmPlayer(uid: string): ContextFirestore {
  return testEnvironment.authenticatedContext(uid, FARM_CLAIMS).firestore()
}

function saveOf(firestore: ContextFirestore, uid: string) {
  return doc(firestore, 'saves', uid)
}

/** A well-formed cloud save, as the game will write it. */
function validSave(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 4,
    updatedAt: serverTimestamp(),
    save: JSON.stringify({ schema_version: 4, coins: 3, feed: 12 }),
    ...overrides,
  }
}

/** Seeds a save with the rules off, so a test can start from an existing farm. */
async function seedSave(uid: string): Promise<void> {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'saves', uid), {
      schemaVersion: 4,
      updatedAt: Timestamp.fromMillis(0),
      save: '{"coins":1}',
    })
  })
}

describe('saves/{uid} — your farm', () => {
  it('lets a player create their own save', async () => {
    await assertSucceeds(setDoc(saveOf(farmPlayer(OWNER), OWNER), validSave()))
  })

  it('lets a player read their own save back', async () => {
    const firestore = farmPlayer(OWNER)
    await setDoc(saveOf(firestore, OWNER), validSave())

    const snapshot = await assertSucceeds(getDoc(saveOf(firestore, OWNER)))

    expect(snapshot.data()?.schemaVersion).toBe(4)
  })

  it('lets a player overwrite their own existing save', async () => {
    await seedSave(OWNER)

    await assertSucceeds(setDoc(saveOf(farmPlayer(OWNER), OWNER), validSave()))
  })

  it('lets a save of exactly the size cap through', async () => {
    const save = 'x'.repeat(MAX_SAVE_CHARS)

    await assertSucceeds(setDoc(saveOf(farmPlayer(OWNER), OWNER), validSave({ save })))
  })
})

describe('saves/{uid} — nobody else’s farm', () => {
  it('denies reading another player’s save', async () => {
    await seedSave(OWNER)

    await assertFails(getDoc(saveOf(farmPlayer(CLASSMATE), OWNER)))
  })

  it('denies writing another player’s save', async () => {
    await seedSave(OWNER)

    await assertFails(setDoc(saveOf(farmPlayer(CLASSMATE), OWNER), validSave()))
  })

  it('denies creating a save under someone else’s uid', async () => {
    await assertFails(setDoc(saveOf(farmPlayer(CLASSMATE), OWNER), validSave()))
  })

  it('denies an unauthenticated read', async () => {
    await seedSave(OWNER)
    const firestore = testEnvironment.unauthenticatedContext().firestore()

    await assertFails(getDoc(saveOf(firestore, OWNER)))
  })

  it('denies an unauthenticated write', async () => {
    const firestore = testEnvironment.unauthenticatedContext().firestore()

    await assertFails(setDoc(saveOf(firestore, OWNER), validSave()))
  })

  it('denies a user signed in without our game claim (another game in the shared project)', async () => {
    const firestore = testEnvironment.authenticatedContext(OWNER).firestore()

    await assertFails(setDoc(saveOf(firestore, OWNER), validSave()))
    await assertFails(getDoc(saveOf(firestore, OWNER)))
  })

  it('denies a user whose claim names a different game', async () => {
    const firestore = testEnvironment
      .authenticatedContext(OWNER, { game: 'math-invaders' })
      .firestore()

    await assertFails(setDoc(saveOf(firestore, OWNER), validSave()))
  })

  it('denies listing saves, even when every result would be the caller’s own', async () => {
    await seedSave(OWNER)
    const firestore = farmPlayer(OWNER)

    await assertFails(getDocs(collection(firestore, 'saves')))
  })

  it('denies an unauthenticated listing of saves', async () => {
    const firestore = testEnvironment.unauthenticatedContext().firestore()

    await assertFails(getDocs(collection(firestore, 'saves')))
  })

  it('denies deleting a save, even your own — deletion goes through the function', async () => {
    await seedSave(OWNER)

    await assertFails(deleteDoc(saveOf(farmPlayer(OWNER), OWNER)))
  })
})

describe('saves/{uid} — what a save may contain', () => {
  it('denies a save one character over the size cap', async () => {
    const save = 'x'.repeat(MAX_SAVE_CHARS + 1)

    await assertFails(setDoc(saveOf(farmPlayer(OWNER), OWNER), validSave({ save })))
  })

  it('denies an empty save string', async () => {
    await assertFails(setDoc(saveOf(farmPlayer(OWNER), OWNER), validSave({ save: '' })))
  })

  it('denies a save stored as a map instead of the codec’s JSON string', async () => {
    const save = { coins: 3 }

    await assertFails(setDoc(saveOf(farmPlayer(OWNER), OWNER), validSave({ save })))
  })

  it('denies an extra field — nowhere to put a name, age or anything else', async () => {
    const withName = validSave({ name: 'Ada' })

    await assertFails(setDoc(saveOf(farmPlayer(OWNER), OWNER), withName))
  })

  it('denies a save missing a required field', async () => {
    const { save: _omitted, ...withoutSave } = validSave()

    await assertFails(setDoc(saveOf(farmPlayer(OWNER), OWNER), withoutSave))
  })

  it.each([3, 5, 0, '4', 4.5])('denies unsupported schemaVersion %j', async (schemaVersion) => {
    const badVersion = validSave({ schemaVersion })

    await assertFails(setDoc(saveOf(farmPlayer(OWNER), OWNER), badVersion))
  })

  it('denies a client-chosen updatedAt instead of the server time', async () => {
    const backdated = validSave({ updatedAt: Timestamp.fromMillis(1_000) })

    await assertFails(setDoc(saveOf(farmPlayer(OWNER), OWNER), backdated))
  })

  it('denies an updatedAt that is not a timestamp', async () => {
    const asNumber = validSave({ updatedAt: Date.UTC(2026, 9, 11) })

    await assertFails(setDoc(saveOf(farmPlayer(OWNER), OWNER), asNumber))
  })

  it('denies a partial update that leaves the old updatedAt in place', async () => {
    await seedSave(OWNER)

    await assertFails(updateDoc(saveOf(farmPlayer(OWNER), OWNER), { save: '{"coins":2}' }))
  })

  it('denies an update that adds a field to an existing save', async () => {
    await seedSave(OWNER)
    const firestore = farmPlayer(OWNER)

    await assertFails(
      updateDoc(saveOf(firestore, OWNER), { updatedAt: serverTimestamp(), extra: true }),
    )
  })
})

describe('server-only collections — never a client', () => {
  it.each(['saveCodes/some-code-hash', 'usernames/BraveOtter42', 'deletions/some-event'])(
    'denies reading and writing %s, even for a signed-in player',
    async (path) => {
      const firestore = farmPlayer(OWNER)

      await assertFails(getDoc(doc(firestore, path)))
      await assertFails(setDoc(doc(firestore, path), { uid: OWNER }))
    },
  )

  it.each(['saveCodes', 'usernames', 'deletions'])('denies listing %s', async (name) => {
    await assertFails(getDocs(collection(farmPlayer(OWNER), name)))
  })
})

describe('everything else — closed', () => {
  it('denies reads of a path the rules never mention', async () => {
    const firestore = farmPlayer(OWNER)

    await assertFails(getDoc(doc(firestore, 'anything/at/all/here')))
  })

  it('denies an unauthenticated write to an unmentioned path', async () => {
    const firestore = testEnvironment.unauthenticatedContext().firestore()

    await assertFails(setDoc(doc(firestore, 'anything/else'), { coins: 1 }))
  })

  it('denies a subcollection under your own save', async () => {
    const firestore = farmPlayer(OWNER)

    await assertFails(setDoc(doc(firestore, `saves/${OWNER}/extra/doc`), { coins: 1 }))
  })

  it('leaves the admin escape hatch open so seeding stays possible', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'saves/seeded'), { coins: 1 })
      const snapshot = await getDoc(doc(context.firestore(), 'saves/seeded'))

      expect(snapshot.data()).toEqual({ coins: 1 })
    })
  })
})
