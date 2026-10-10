import { resolve } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'
import { handleEditorSave } from './editor-save-handler.ts'
import { type PrepareEditorSave, editorSaveTarget } from './editor-save-routes.ts'

/** Loaded through the dev server, which resolves `@sf/world`'s TypeScript; the config loader cannot. */
async function loadPrepare(server: ViteDevServer): Promise<PrepareEditorSave> {
  const module = (await server.ssrLoadModule('/src/dev-server/editor-save.ts')) as typeof import('./editor-save')
  return module.prepareEditorSave
}

/**
 * Dev server only (`apply: 'serve'`): `POST /__editor/overrides` and
 * `POST /__editor/world` write the world editor's save into
 * `packages/world/layouts/`. A production build has no server and no route.
 *
 * A file the editor just wrote is not hot-reloaded — the editor already shows
 * it, and a reload would throw away its camera and history. A hand edit to the
 * same file still reloads as usual, because its text differs.
 */
export function worldEditorSave({ layoutsDir }: { layoutsDir: string }): Plugin {
  const writtenByEditor = new Map<string, string>()
  return {
    name: 'sf-world-editor-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (editorSaveTarget(request.url?.split('?')[0] ?? '') === null) {
          next()
          return
        }
        loadPrepare(server)
          .then((prepare) =>
            handleEditorSave(request, response, {
              layoutsDir,
              prepare,
              onWritten: (path, contents) => writtenByEditor.set(resolve(path), contents),
            }),
          )
          .then(() => undefined, next)
      })
    },
    async hotUpdate({ file, read }) {
      const written = writtenByEditor.get(resolve(file))
      if (written === undefined || written !== (await read())) return
      return []
    },
  }
}
