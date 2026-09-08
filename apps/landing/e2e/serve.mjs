// Static file server for the landing e2e run. apps/landing has no build step,
// so the spec exercises the exact bytes Firebase Hosting will serve.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const port = Number(process.argv[2] ?? 4180)

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
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
    // An unreadable path means the page links something that will not deploy —
    // a 404 here is exactly the failure the spec is looking for.
    () => {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('Not found')
    },
  )
}).listen(port)
