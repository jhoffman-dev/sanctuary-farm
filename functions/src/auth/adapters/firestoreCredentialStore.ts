import type { Firestore } from 'firebase-admin/firestore'
import type { CreateAccountResult, CredentialStore, NewAccount } from '../application/index.js'

/**
 * Collection names shared with `firestore.rules` and `docs/cloud-save.md`
 * (SF-114): the rules deny every client access to both.
 */
export const SAVE_CODES = 'saveCodes'
export const USERNAMES = 'usernames'

/**
 * Credential records in the named `sanctuary-farm` database.
 *
 * - `saveCodes/{HMAC of the code}` → `{ uid }`
 * - `usernames/{lower-case username}` → `{ uid, pinHash }`
 *
 * Nothing else: no timestamps, no device, no address, no plaintext code or PIN.
 */
export function firestoreCredentialStore(db: Firestore): CredentialStore {
  return {
    createAccount: (account) => createAccountRecords(db, account),

    async uidForSaveCode(saveCodeKey) {
      const snapshot = await db.collection(SAVE_CODES).doc(saveCodeKey).get()
      if (!snapshot.exists) return null
      return requireString(snapshot.get('uid'), 'saveCodes.uid')
    },

    async usernameRecord(usernameKey) {
      const snapshot = await db.collection(USERNAMES).doc(usernameKey).get()
      if (!snapshot.exists) return null
      return {
        uid: requireString(snapshot.get('uid'), 'usernames.uid'),
        pinHash: requireString(snapshot.get('pinHash'), 'usernames.pinHash'),
      }
    },
  }
}

async function createAccountRecords(db: Firestore, account: NewAccount): Promise<CreateAccountResult> {
  const codeRef = db.collection(SAVE_CODES).doc(account.saveCodeKey)
  const usernameRef = account.username ? db.collection(USERNAMES).doc(account.username.key) : null
  return db.runTransaction(async (transaction) => {
    if ((await transaction.get(codeRef)).exists) return 'saveCodeTaken'
    if (usernameRef && (await transaction.get(usernameRef)).exists) return 'usernameTaken'
    transaction.create(codeRef, { uid: account.uid })
    if (usernameRef && account.username) {
      transaction.create(usernameRef, { uid: account.uid, pinHash: account.username.pinHash })
    }
    return 'created'
  })
}

/**
 * A credential record only this function writes has the wrong shape: fail
 * loudly (the caller gets a generic error) rather than sign anyone in.
 */
function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`malformed credential record: ${field}`)
  return value
}
