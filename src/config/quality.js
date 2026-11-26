/**
 * @fileoverview Graphics quality presets and software WebGL detection.
 */

export const QUALITY_PRESETS = {
  low: {
    name: 'low',
    maxPixelRatio: 1.0,
    antialias: false,
    shadows: false,
    shadowMapSize: 512,
    seaSegments: 40,
    fogDensity: 0.0022,
    moteCount: 40,
  },
  medium: {
    name: 'medium',
    maxPixelRatio: 1.5,
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    seaSegments: 64,
    fogDensity: 0.0019,
    moteCount: 80,
  },
  high: {
    name: 'high',
    maxPixelRatio: 2.0,
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    seaSegments: 88,
    fogDensity: 0.0017,
    moteCount: 120,
  },
};

/**
 * Probe once for software WebGL renderers without altering scene content.
 * @returns {boolean}
 */
export function detectSoftwareWebGL() {
  if (typeof document === 'undefined') return true;
  const canvas = document.createElement('canvas');
  try {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Resolve concrete quality settings from user preset ('auto' | 'low' | 'medium' | 'high').
 * @param {string} preset
 * @param {boolean} isSoftwareGl
 */
export function resolveQuality(preset, isSoftwareGl) {
  let baseKey = preset;
  if (!['low', 'medium', 'high'].includes(baseKey)) {
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    baseKey = isMobile || cores <= 4 ? 'medium' : 'high';
  }
  const base = QUALITY_PRESETS[baseKey] || QUALITY_PRESETS.medium;
  if (!isSoftwareGl) return { ...base, isSoftwareGl: false };

  return {
    ...base,
    isSoftwareGl: true,
    maxPixelRatio: 1.0,
    antialias: false,
    shadows: false,
  };
}
