import { describe, expect, it } from 'vitest'
import { readDeviceSignals } from './device-signals'

const RENDERER = 0x1f01
const UNMASKED_RENDERER_WEBGL = 0x9246

function fakeGl({ unmasked, plain }: { unmasked: string | null; plain: unknown }) {
  return {
    RENDERER,
    getExtension: (name: string) => (name === 'WEBGL_debug_renderer_info' && unmasked !== null ? { UNMASKED_RENDERER_WEBGL } : null),
    getParameter: (parameter: number) => (parameter === UNMASKED_RENDERER_WEBGL ? unmasked : plain),
  } as unknown as WebGLRenderingContext
}

describe('readDeviceSignals', () => {
  it('reads the unmasked renderer, the core count and Chromium’s device memory', () => {
    const gl = fakeGl({ unmasked: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics 600 (GLK 2), OpenGL 4.6)', plain: 'WebKit WebGL' })
    expect(readDeviceSignals(gl, { hardwareConcurrency: 2, deviceMemory: 4 })).toEqual({
      gpuRenderer: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics 600 (GLK 2), OpenGL 4.6)',
      logicalCores: 2,
      memoryGb: 4,
    })
  })

  it('falls back to the plain renderer without the debug extension, and to null for what the browser hides', () => {
    expect(readDeviceSignals(fakeGl({ unmasked: null, plain: 'Apple GPU' }), { hardwareConcurrency: 2 })).toEqual({
      gpuRenderer: 'Apple GPU',
      logicalCores: 2,
      memoryGb: null,
    })
  })

  it('treats an empty or non-string renderer and a zero core count as unknown', () => {
    expect(readDeviceSignals(fakeGl({ unmasked: null, plain: null }), { hardwareConcurrency: 0 })).toEqual({
      gpuRenderer: null,
      logicalCores: null,
      memoryGb: null,
    })
    expect(readDeviceSignals(fakeGl({ unmasked: '', plain: 'x' }), { hardwareConcurrency: 4 }).gpuRenderer).toBeNull()
  })
})
