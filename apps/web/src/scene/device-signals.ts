import type { DeviceSignals } from './quality-tier'

/** The slice of a WebGL context the probe reads. */
type RendererQuery = Pick<WebGLRenderingContext, 'getExtension' | 'getParameter' | 'RENDERER'>

/** `navigator.deviceMemory` is Chromium-only, so it is not in the DOM typings. */
type NavigatorSignals = Pick<Navigator, 'hardwareConcurrency'> & { readonly deviceMemory?: number }

function gpuRenderer(gl: RendererQuery): string | null {
  // Firefox and newer Chromium answer the plain RENDERER unmasked and deprecate the extension; Safari masks both.
  const debug = gl.getExtension('WEBGL_debug_renderer_info')
  const renderer: unknown = gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER)
  return typeof renderer === 'string' && renderer !== '' ? renderer : null
}

function positiveOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

/** Reads what the browser will say about the device: the renderer from the scene's own context, the rest from `navigator`. */
export function readDeviceSignals(gl: RendererQuery, browser: NavigatorSignals): DeviceSignals {
  return {
    gpuRenderer: gpuRenderer(gl),
    logicalCores: positiveOrNull(browser.hardwareConcurrency),
    memoryGb: positiveOrNull(browser.deviceMemory),
  }
}
