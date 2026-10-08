/**
 * The canonical text of the two editable world files. Keys are always written
 * in the same order and each edit or chunk sits on its own line, so a save
 * from the world editor (#105) diffs as exactly the lines that changed.
 */
import type { ChunkCoord, TileCoord } from './tile-grid'
import type { WorldEdit, WorldOverrides } from './world-overrides'
import type { WorldSettings } from './world-settings'

function tileText(tile: TileCoord): string {
  return `{ "x": ${tile.x}, "z": ${tile.z} }`
}

function chunkText(chunk: ChunkCoord): string {
  return `{ "cx": ${chunk.cx}, "cz": ${chunk.cz} }`
}

function field(name: string, value: string): string {
  return `"${name}": ${value}`
}

function editFields(edit: WorldEdit): string[] {
  const op = field('op', JSON.stringify(edit.op))
  switch (edit.op) {
    case 'move-hotspot':
      return [op, field('hotspot', JSON.stringify(edit.hotspot)), field('to', tileText(edit.to))]
    case 'set-ground':
      return [op, field('at', tileText(edit.at)), field('ground', JSON.stringify(edit.ground))]
    case 'place-structure':
    case 'place-decor':
      return [op, field('at', tileText(edit.at)), field('kind', JSON.stringify(edit.kind)), field('rotation', String(edit.rotation))]
    case 'remove-structure':
    case 'remove-decor':
      return [op, field('at', tileText(edit.at))]
  }
}

function list(lines: readonly string[]): string {
  return lines.length === 0 ? '[]' : `[\n${lines.map((line) => `    ${line}`).join(',\n')}\n  ]`
}

export function serializeWorldOverrides(overrides: WorldOverrides): string {
  const edits = overrides.edits.map((edit) => `{ ${editFields(edit).join(', ')} }`)
  return `{\n  ${field('schemaVersion', String(overrides.schemaVersion))},\n  ${field('edits', list(edits))}\n}\n`
}

export function serializeWorldSettings(settings: WorldSettings): string {
  return [
    '{',
    `  ${field('schemaVersion', String(settings.schemaVersion))},`,
    `  ${field('seed', String(settings.seed))},`,
    `  ${field('chunks', list(settings.chunks.map(chunkText)))}`,
    '}',
    '',
  ].join('\n')
}
