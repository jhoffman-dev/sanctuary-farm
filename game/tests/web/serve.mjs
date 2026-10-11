// Static server for the Godot web export (game/build/web) in the smoke run.
// The single-threaded export needs no COOP/COEP headers (ADR-0006), so none
// are sent: the smoke proves the build runs without them, as on Safari.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../build/web/', import.meta.url))
const port = Number(process.argv[2] ?? 4190)

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.pck': 'application/octet-stream',
  '.png': 'image/png',
}

const filePathFor = (url) => {
  const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname)
  const withinRoot = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  return join(root, withinRoot.endsWith('/') ? `${withinRoot}index.html` : withinRoot)
}

createServer((req, res) => {
  const path = filePathFor(req.url ?? '/')
  readFile(path).then(
    (body) => {
      res.writeHead(200, { 'content-type': contentTypes[extname(path)] ?? 'application/octet-stream' })
      res.end(body)
    },
    // A missing file means the export is incomplete — the 404 is the failure
    // the spec should see, not something to paper over.
    () => {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('Not found')
    },
  )
}).listen(port)
