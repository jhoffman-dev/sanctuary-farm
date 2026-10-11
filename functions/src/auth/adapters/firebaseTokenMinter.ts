import type { Auth } from 'firebase-admin/auth'
import type { TokenMinter } from '../application/index.js'

/**
 * The one claim every token carries, and the only one. Auth is shared with the
 * other games in `student-games-be188`, so `firestore.rules` admits a request
 * to `saves/{uid}` only when this claim is present (SF-114).
 */
export const GAME_CLAIMS = Object.freeze({ game: 'sanctuary-farm' })

export function firebaseTokenMinter(auth: Auth): TokenMinter {
  // async so a bad uid (createCustomToken throws synchronously) still arrives as a rejection.
  return { mint: async (uid) => auth.createCustomToken(uid, { ...GAME_CLAIMS }) }
}
