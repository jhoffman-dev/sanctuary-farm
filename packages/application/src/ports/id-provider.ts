/** Unique ids for sessions and, later, save codes. Injected so tests are deterministic. */
export interface IdProvider {
  newId(): string
}
