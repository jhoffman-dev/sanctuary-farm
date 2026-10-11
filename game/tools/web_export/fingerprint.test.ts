import { describe, expect, it } from 'vitest'
import { type ExportFile, planFingerprint } from './fingerprint.ts'

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text)

const page = (config: object): string =>
  `<html><head></head><body><script src="index.js"></script><script>\nconst GODOT_CONFIG = ${JSON.stringify(config)};\nconst engine = new Engine(GODOT_CONFIG);\n</script></body></html>`

const stockConfig = { args: [], executable: 'index', fileSizes: { 'index.pck': 4, 'index.wasm': 6 }, focusCanvas: true }

const stockFiles = (wasm = 'engine'): ExportFile[] => [
  { name: 'index.wasm', bytes: bytes(wasm) },
  { name: 'index.js', bytes: bytes('loader') },
  { name: 'index.audio.worklet.js', bytes: bytes('worklet') },
  { name: 'index.audio.position.worklet.js', bytes: bytes('position') },
  { name: 'index.pck', bytes: bytes('pack') },
  { name: 'index.png', bytes: bytes('splash') },
]

const configOf = (html: string): Record<string, unknown> =>
  JSON.parse(/const GODOT_CONFIG = (\{.*?\});/.exec(html)?.[1] ?? 'null') as Record<string, unknown>

describe('planFingerprint', () => {
  it('names the engine files after one shared content hash and the pack after its own', () => {
    const { renames } = planFingerprint(page(stockConfig), stockFiles())

    const engineStem = /^engine-[0-9a-f]{12}$/
    const wasm = renames.get('index.wasm') ?? ''
    const stem = wasm.replace(/\.wasm$/, '')
    expect(stem).toMatch(engineStem)
    expect(renames.get('index.js')).toBe(`${stem}.js`)
    expect(renames.get('index.audio.worklet.js')).toBe(`${stem}.audio.worklet.js`)
    expect(renames.get('index.audio.position.worklet.js')).toBe(`${stem}.audio.position.worklet.js`)
    expect(renames.get('index.pck')).toMatch(/^game-[0-9a-f]{12}\.pck$/)
  })

  it('leaves files the loader does not derive from the executable where they are', () => {
    const { renames } = planFingerprint(page(stockConfig), stockFiles())

    expect(renames.has('index.png')).toBe(false)
  })

  it('points the page at the renamed loader, engine and pack, keeping the rest of the config', () => {
    const { renames, html } = planFingerprint(page(stockConfig), stockFiles())
    const stem = (renames.get('index.wasm') ?? '').replace(/\.wasm$/, '')
    const pack = renames.get('index.pck') ?? ''

    expect(html).toContain(`<script src="${stem}.js">`)
    expect(html).not.toContain('<script src="index.js">')
    expect(configOf(html)).toEqual({
      args: [],
      executable: stem,
      mainPack: pack,
      fileSizes: { [pack]: 4, [`${stem}.wasm`]: 6 },
      focusCanvas: true,
    })
  })

  it('gives a changed engine a new name, and an unchanged one the same name', () => {
    const first = planFingerprint(page(stockConfig), stockFiles('engine v1')).renames
    const same = planFingerprint(page(stockConfig), stockFiles('engine v1')).renames
    const changed = planFingerprint(page(stockConfig), stockFiles('engine v2')).renames

    expect(same.get('index.wasm')).toBe(first.get('index.wasm'))
    expect(changed.get('index.wasm')).not.toBe(first.get('index.wasm'))
    expect(changed.get('index.pck')).toBe(first.get('index.pck'))
  })

  it('maps already-fingerprinted files onto themselves, so a second run changes nothing', () => {
    const once = planFingerprint(page(stockConfig), stockFiles())
    const renamedFiles = stockFiles().map((file) => ({ ...file, name: once.renames.get(file.name) ?? file.name }))

    const twice = planFingerprint(once.html, renamedFiles)

    for (const [from, to] of twice.renames) expect(to).toBe(from)
    expect(twice.html).toBe(once.html)
  })

  it('works without the audio worklets, which only some exports have', () => {
    const files = stockFiles().filter((file) => !file.name.includes('worklet'))

    const { renames } = planFingerprint(page(stockConfig), files)

    expect([...renames.keys()].sort()).toEqual(['index.js', 'index.pck', 'index.wasm'])
  })

  it('refuses a page without a GODOT_CONFIG', () => {
    expect(() => planFingerprint('<html></html>', stockFiles())).toThrow(/no GODOT_CONFIG/)
  })

  it('refuses an export that is missing the engine or the pack', () => {
    const withoutWasm = stockFiles().filter((file) => file.name !== 'index.wasm')
    const withoutPack = stockFiles().filter((file) => file.name !== 'index.pck')

    expect(() => planFingerprint(page(stockConfig), withoutWasm)).toThrow(/no index\.wasm/)
    expect(() => planFingerprint(page(stockConfig), withoutPack)).toThrow(/no index\.pck/)
  })

  it('refuses a page that does not load the loader by its export name', () => {
    const html = page(stockConfig).replace('<script src="index.js">', '<script src="other.js">')

    expect(() => planFingerprint(html, stockFiles())).toThrow(/does not load index\.js/)
  })
})
