// Renders every synth recipe to an OGG for the Godot client (SF-97). Godot's
// web export has no procedural audio (ADR-0006), so the sounds ship as files —
// but they are still *made* by the real recipe code in `packages/audio`: this
// script strips the TypeScript types from `recipes.ts` and `web-audio-bus.ts`,
// loads them into headless Chromium and hands `createWebAudioBus` an
// OfflineAudioContext, so each file is exactly what the browser bus plays.
//
// Output: game/assets/audio/<id>.ogg (44.1 kHz mono Vorbis, via libvorbis's
// `oggenc` with a fixed stream serial so reruns are byte-identical) and
// manifest.json (duration, limit and source recipe per sound).
//
// Usage: node game/tools/render_sounds.mjs     (needs `oggenc`: brew install vorbis-tools)
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const ROOT = new URL('../../', import.meta.url).pathname
const AUDIO_SRC = join(ROOT, 'packages/audio/src')
const OUT_DIR = join(ROOT, 'game/assets/audio')
const SAMPLE_RATE = 44_100
const ORIGIN = 'https://render.invalid'
/** Any fixed value: Ogg picks a random stream serial otherwise, and the files would churn. */
const OGG_SERIAL = '97'

// docs/sound-design.md §6: feedback sounds ≤ 0.6 s, world sounds ≤ 1 s.
const LIMIT_SECONDS = { feedback: 0.6, world: 1.0 }

// Godot ids are snake_case; `recipe` is the SoundName in packages/application.
const SOUNDS = [
  { id: 'correct', recipe: 'correct', category: 'feedback' },
  { id: 'fluent', recipe: 'fluent', category: 'feedback' },
  { id: 'wrong', recipe: 'wrong', category: 'feedback' },
  { id: 'hatch', recipe: 'hatch', category: 'feedback' },
  { id: 'tap', recipe: 'tap', category: 'feedback' },
  { id: 'footstep', recipe: 'footstep', category: 'world' },
  { id: 'door_open', recipe: 'doorOpen', category: 'world' },
  { id: 'chew', recipe: 'chew', category: 'world' },
]

/** The recipe modules as browser JavaScript, keyed by the path the page imports. */
function browserModules() {
  const toJs = (file) =>
    stripTypeScriptTypes(readFileSync(join(AUDIO_SRC, file), 'utf8')).replace("from './recipes'", "from './recipes.js'")
  return {
    '/recipes.js': toJs('recipes.ts'),
    '/web-audio-bus.js': toJs('web-audio-bus.ts'),
    '/index.html': '<!doctype html><title>render</title>',
  }
}

/**
 * Plays each recipe through the real bus into an OfflineAudioContext. The
 * render stops when the last voice's envelope reaches silence (delay +
 * duration); the bus's 50 ms oscillator tail after that is held at -80 dB, so
 * cutting it loses nothing audible and keeps the files at the documented length.
 */
async function renderInBrowser({ recipes, sampleRate }) {
  const { createWebAudioBus } = await import('/web-audio-bus.js')
  const { RECIPES } = await import('/recipes.js')
  const rendered = {}
  for (const name of recipes) {
    const seconds = Math.max(...RECIPES[name].map((voice) => voice.delay + voice.duration))
    const context = new OfflineAudioContext(1, Math.ceil(seconds * sampleRate), sampleRate)
    createWebAudioBus({ createContext: () => context }).play(name)
    const buffer = await context.startRendering()
    rendered[name] = Array.from(buffer.getChannelData(0))
  }
  return rendered
}

async function renderAll() {
  const modules = browserModules()
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.route(`${ORIGIN}/**`, (route) => {
      const path = new URL(route.request().url()).pathname
      const isHtml = path.endsWith('.html')
      route.fulfill({ status: 200, contentType: isHtml ? 'text/html' : 'text/javascript', body: modules[path] ?? '' })
    })
    await page.goto(`${ORIGIN}/index.html`)
    const recipes = SOUNDS.map((sound) => sound.recipe)
    return await page.evaluate(renderInBrowser, { recipes, sampleRate: SAMPLE_RATE })
  } finally {
    await browser.close()
  }
}

/** 16-bit PCM mono WAV — oggenc's input. */
function wavBytes(samples) {
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((sample, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), i * 2))
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

function encodeOgg(samples, wavPath, oggPath) {
  writeFileSync(wavPath, wavBytes(samples))
  execFileSync('oggenc', ['--quiet', '--quality', '6', '--serial', OGG_SERIAL, '--output', oggPath, wavPath])
}

async function main() {
  const rendered = await renderAll()
  const scratch = mkdtempSync(join(tmpdir(), 'sf-sounds-'))
  try {
    const manifest = SOUNDS.map(({ id, recipe, category }) => {
      const samples = rendered[recipe]
      const duration = samples.length / SAMPLE_RATE
      const limit = LIMIT_SECONDS[category]
      if (duration > limit) throw new Error(`${id}: ${duration.toFixed(3)} s is over the ${category} limit of ${limit} s`)
      encodeOgg(samples, join(scratch, `${id}.wav`), join(OUT_DIR, `${id}.ogg`))
      const peak = samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0)
      const source = `packages/audio/src/recipes.ts RECIPES.${recipe}`
      return { id, file: `${id}.ogg`, category, duration_s: Number(duration.toFixed(4)), limit_s: limit, peak: Number(peak.toFixed(4)), source }
    })
    const body = { sample_rate: SAMPLE_RATE, channels: 1, renderer: 'game/tools/render_sounds.mjs', sounds: manifest }
    writeFileSync(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(body, null, 2)}\n`)
    for (const sound of manifest) console.log(`${sound.file.padEnd(14)} ${sound.duration_s.toFixed(3)} s  peak ${sound.peak}`)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

await main()
