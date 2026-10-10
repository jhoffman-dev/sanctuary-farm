/**
 * Undo and redo for the world editor (#105): a pure stack of whole documents.
 * The documents are small (a seed, a chunk list, a few dozen edits), so a
 * snapshot per step is simpler and safer than inverting each edit.
 */
export interface EditHistory<T> {
  readonly past: readonly T[]
  readonly present: T
  readonly future: readonly T[]
}

export function startHistory<T>(present: T): EditHistory<T> {
  return { past: [], present, future: [] }
}

/**
 * A new step. A change that leaves the document as it was is not a step, so
 * a click that does nothing never costs James an undo. Recording a step
 * drops the redo branch, as every editor does.
 */
export function recordStep<T>(history: EditHistory<T>, next: T, same: (one: T, other: T) => boolean): EditHistory<T> {
  if (same(history.present, next)) return history
  return { past: [...history.past, history.present], present: next, future: [] }
}

/**
 * Replaces the present without a new step: the rest of a drag after its
 * first tile, so one stroke of the brush is one undo.
 */
export function amendStep<T>(history: EditHistory<T>, next: T): EditHistory<T> {
  return { ...history, present: next }
}

export function undo<T>(history: EditHistory<T>): EditHistory<T> {
  const previous = history.past.at(-1)
  if (previous === undefined) return history
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] }
}

export function redo<T>(history: EditHistory<T>): EditHistory<T> {
  const [next, ...rest] = history.future
  if (next === undefined) return history
  return { past: [...history.past, history.present], present: next, future: rest }
}
