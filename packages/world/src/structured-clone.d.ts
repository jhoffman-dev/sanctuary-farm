/**
 * `structuredClone` is a platform global everywhere we run (Node ≥ 17, every
 * supported browser), but the base tsconfig loads no DOM and no Node types on
 * purpose — this package is framework-free. Declaring the one global the tests
 * need is cheaper, and narrower, than pulling in a whole lib.
 */
declare function structuredClone<T>(value: T): T
