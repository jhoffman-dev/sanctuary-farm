import { onRequest } from 'firebase-functions/v2/https'

/**
 * Liveness probe for the deploy pipeline and the emulator. Returns no data
 * about anyone; exists so "functions deploy works" can be verified before
 * Phase 4 puts custom auth here.
 */
export const health = onRequest({ region: 'us-central1', cors: false }, (_request, response) => {
  response.json({ ok: true, service: 'sanctuary-farm-functions' })
})
