/**
 * Vite's `?raw` suffix (the bytes of a file as a string). The package loads no
 * Vite types, so tests that compare the shipped files' exact text declare it here.
 */
declare module '*?raw' {
  const text: string
  export default text
}
