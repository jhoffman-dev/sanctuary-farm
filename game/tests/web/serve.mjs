// Static server for the Godot web export (game/build/web) in the smoke and
// load-timing runs. The single-threaded export needs no COOP/COEP headers
// (ADR-0006), so none are sent: the smoke proves the build runs without them,
// as on Safari.
//
// It caches like firebase.json's game target (SF-100): the content-hashed
// engine and pack (`engine-*`, `game-*`) are `immutable`, everything else is
// `no-cache` with an ETag. With `--encoding br|gzip` it also compresses like
// Hosting would (brotli 11 / gzip 9, done once at start-up); without it bytes
// go out raw, which is all the functional smoke needs.
//
// Usage: node serve.mjs <port> [--encoding br|gzip]
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const root = fileURLToPath(new URL('../../build/web/', import.meta.url))
const port = Number(process.argv[2] ?? 4190)
const encodingFlag = process.argv.indexOf('--encoding')
const encoding = encodingFlag === -1 ? undefined : process.argv[encodingFlag + 1]

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.pck': 'application/octet-stream',
  '.png': 'image/png',
}
const compressible = new Set(['.html', '.js', '.wasm', '.pck'])
const IMMUTABLE = /^(engine|game)-[0-9a-f]{12}\./

const compress = (body) => {
  if (encoding === 'br') {
    return brotliCompressSync(body, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_LGWIN]: 24 },
    })
  }
  return gzipSync(body, { level: 9 })
}

const servedFile = (name) => {
  const body = readFileSync(join(root, name))
  const encoded = encoding && compressible.has(extname(name)) ? compress(body) : undefined
  return {
    body: encoded ?? body,
    headers: {
      'content-type': contentTypes[extname(name)] ?? 'application/octet-stream',
      'cache-control': IMMUTABLE.test(name) ? 'public, max-age=31536000, immutable' : 'no-cache',
      etag: `"${createHash('sha1').update(body).digest('hex')}"`,
      ...(encoded ? { 'content-encoding': encoding, vary: 'Accept-Encoding' } : {}),
    },
  }
}

// The export is read once: a missing file then 404s, which is the failure the
// spec should see, not something to paper over.
const files = new Map(readdirSync(root).map((name) => [name, servedFile(name)]))

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
  const file = files.get(pathname === '/' ? 'index.html' : pathname.slice(1))
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  } else if (req.headers['if-none-match'] === file.headers.etag) {
    res.writeHead(304, { etag: file.headers.etag, 'cache-control': file.headers['cache-control'] })
    res.end()
  } else {
    res.writeHead(200, file.headers)
    res.end(file.body)
  }
}).listen(port)
