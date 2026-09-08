import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/** Matches `.firebaserc`; the `demo-` prefix keeps the SDK off real Google APIs. */
const PROJECT_ID = 'demo-sanctuary-farm'

/** Stands in for any document a client might reach for. */
const SAMPLE_DOCUMENT = 'saves/a-save-code'

const RULES_FILE = fileURLToPath(new URL('../firestore.rules', import.meta.url))

let testEnvironment: RulesTestEnvironment

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(RULES_FILE, 'utf8') },
  })
})

afterAll(async () => {
  await testEnvironment.cleanup()
})

describe('firestore.rules — closed until Phase 4', () => {
  it('denies an unauthenticated read', async () => {
    const firestore = testEnvironment.unauthenticatedContext().firestore()

    await assertFails(getDoc(doc(firestore, SAMPLE_DOCUMENT)))
  })

  it('denies an unauthenticated write', async () => {
    const firestore = testEnvironment.unauthenticatedContext().firestore()

    await assertFails(setDoc(doc(firestore, SAMPLE_DOCUMENT), { coins: 1 }))
  })

  it('denies a signed-in read — being authenticated grants nothing yet', async () => {
    const firestore = testEnvironment.authenticatedContext('a-player').firestore()

    await assertFails(getDoc(doc(firestore, SAMPLE_DOCUMENT)))
  })

  it('denies a signed-in write, including to a path named after the caller', async () => {
    const firestore = testEnvironment.authenticatedContext('a-player').firestore()

    await assertFails(setDoc(doc(firestore, 'saves/a-player'), { coins: 1 }))
  })

  it('denies reads of a path the rules never mention', async () => {
    const firestore = testEnvironment.authenticatedContext('a-player').firestore()

    await assertFails(getDoc(doc(firestore, 'anything/at/all/here')))
  })

  it('leaves the admin escape hatch open so seeding stays possible', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), SAMPLE_DOCUMENT), { coins: 1 })
      const snapshot = await getDoc(doc(context.firestore(), SAMPLE_DOCUMENT))

      expect(snapshot.data()).toEqual({ coins: 1 })
    })
  })
})
