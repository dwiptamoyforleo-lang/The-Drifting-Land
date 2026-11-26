/**
 * Three.js WebGL Setup, Fallback Context Creation & Hardware Detection for The Drifting Land.
 * - Single cached probe (never leaks probe contexts; skipped entirely when direct WebGL init succeeds)
 * - 4-stage fallback initialization (WebGL2 Standard -> WebGL2 Low-Power Safe -> WebGL1 check -> 400ms delayed WebGL2 retry)
 * - No failIfMajorPerformanceCaveat: true; powerPreference: 'high-performance' only on Attempt 1
 * - Lazy optional RoomEnvironment PMREM generation (skipped on mobile/low/softwareGL, deferred after frame 1 on desktop)
 * - Full context loss/restoration and complete forceContextLoss() disposal
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  GameSettings,
  WebGLAttemptLog,
  WebGLDiagnosticReport,
} from '../types/game';
import { QualityConfig } from './performanceGovernor';

export interface WebGLProbeResult {
  webgl2Available: boolean;
  webgl1Available: boolean;
  gpuRenderer: string;
  gpuVendor: string;
  isSoftwareGl: boolean;
}

export class WebGLInitError extends Error {
  public readonly report: WebGLDiagnosticReport;

  constructor(message: string, report: WebGLDiagnosticReport) {
    super(message);
    this.name = 'WebGLInitError';
    this.report = report;
  }
}

export interface RendererBundle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  keyLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  rimLight: THREE.DirectionalLight;
  isSoftwareGl: boolean;
  isMobile: boolean;
  forcedLowQuality: boolean;
  pmremTexture: THREE.Texture | null;
  scheduleLazyEnvironment: () => void;
  dispose: () => void;
}

const SOFTWARE_GL_REGEX = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i;

let cachedProbeResult: WebGLProbeResult | null = null;

function readGpuInfo(gl: WebGLRenderingContext | WebGL2RenderingContext): {
  renderer: string;
  vendor: string;
  isSoftwareGl: boolean;
} {
  let renderer = 'Unknown';
  let vendor = 'Unknown';
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    renderer = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || 'Unknown');
    vendor = String(gl.getParameter(ext ? ext.UNMASKED_VENDOR_WEBGL : gl.VENDOR) || 'Unknown');
  } catch {
    // Some privacy-hardened browsers restrict renderer parameters
  }
  return {
    renderer,
    vendor,
    isSoftwareGl: SOFTWARE_GL_REGEX.test(renderer),
  };
}

function releaseTempContext(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext | WebGL2RenderingContext | null
): void {
  try {
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    // Ignore
  }
  canvas.width = 0;
  canvas.height = 0;
}

export class RenderPipeline {
  /**
   * Single shared cached WebGL probe.
   * Creates at most ONE offscreen canvas, checks capabilities, immediately releases via loseContext(),
   * and caches the result so repeated checks never leak extra contexts.
   */
  static probeWebGLCapabilities(forceRefresh = false): WebGLProbeResult {
    if (cachedProbeResult && !forceRefresh) {
      return cachedProbeResult;
    }

    if (typeof document === 'undefined' || typeof window === 'undefined' || !window.WebGLRenderingContext) {
      cachedProbeResult = {
        webgl2Available: false,
        webgl1Available: false,
        gpuRenderer: 'WebGL API unavailable in environment',
        gpuVendor: 'Unavailable',
        isSoftwareGl: true,
      };
      return cachedProbeResult;
    }

    let canvas: HTMLCanvasElement | null = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    let webgl2Available = false;
    let webgl1Available = false;
    let gpuRenderer = 'Unavailable';
    let gpuVendor = 'Unavailable';
    let isSoftwareGl = false;

    try {
      const gl2 = canvas.getContext('webgl2', {
        failIfMajorPerformanceCaveat: false,
      }) as WebGL2RenderingContext | null;

      if (gl2) {
        webgl2Available = true;
        webgl1Available = true; // Browsers with WebGL2 support WebGL1 as well
        const info = readGpuInfo(gl2);
        gpuRenderer = info.renderer;
        gpuVendor = info.vendor;
        isSoftwareGl = info.isSoftwareGl;
        releaseTempContext(canvas, gl2);
      } else {
        // Check WebGL1 on a fresh minimal probe only if WebGL2 failed
        const gl1 = (canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false }) ||
          canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: false })) as
          | WebGLRenderingContext
          | null;
        if (gl1) {
          webgl1Available = true;
          const info = readGpuInfo(gl1);
          gpuRenderer = info.renderer;
          gpuVendor = info.vendor;
          isSoftwareGl = info.isSoftwareGl;
          releaseTempContext(canvas, gl1);
        }
      }
    } catch {
      // Probe failed cleanly
    } finally {
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
      }
    }

    cachedProbeResult = {
      webgl2Available,
      webgl1Available,
      gpuRenderer,
      gpuVendor,
      isSoftwareGl,
    };
    return cachedProbeResult;
  }

  /**
   * Cached check used only by external callers; uses single shared probe result.
   */
  static detectSoftwareGl(): boolean {
    return this.probeWebGLCapabilities().isSoftwareGl;
  }

  /**
   * Cached availability check; uses single shared probe result.
   */
  static isWebGLAvailable(): boolean {
    const probe = this.probeWebGLCapabilities();
    return probe.webgl2Available || probe.webgl1Available;
  }

  /**
   * Detect if device is a mobile / tablet user agent
   */
  static isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private static createManagedCanvas(): {
    canvas: HTMLCanvasElement;
    getCreationError: () => string | undefined;
    cleanupListener: () => void;
  } {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    let creationError: string | undefined;
    const onCreationError = (ev: Event) => {
      const msg = (ev as WebGLContextEvent)?.statusMessage;
      if (msg) {
        creationError = msg;
      }
    };
    canvas.addEventListener('webglcontextcreationerror', onCreationError, false);

    return {
      canvas,
      getCreationError: () => creationError,
      cleanupListener: () => {
        canvas.removeEventListener('webglcontextcreationerror', onCreationError, false);
      },
    };
  }

  /**
   * Initialize Three.js scene, camera, and WebGLRenderer directly with 4-stage fallback recovery.
   * Never blocks on a redundant pre-check before trying real WebGLRenderer creation.
   */
  static async init(
    container: HTMLElement,
    settings: GameSettings,
    onContextLost?: () => void,
    onContextRestored?: () => void
  ): Promise<RendererBundle> {
    const isMobile = this.isMobileDevice();
    const attempts: WebGLAttemptLog[] = [];
    let lastCreationError: string | undefined;

    let renderer: THREE.WebGLRenderer | null = null;
    let forcedLowQuality = isMobile || settings.graphicsQuality === 'low';

    // Helper to try constructing THREE.WebGLRenderer cleanly on a fresh canvas
    const tryCreateRenderer = (
      attemptNumber: number,
      label: string,
      options: THREE.WebGLRendererParameters & { forceWebGL1?: boolean }
    ): THREE.WebGLRenderer | null => {
      const managed = this.createManagedCanvas();
      let tempRenderer: THREE.WebGLRenderer | null = null;
      let explicitGl1: WebGLRenderingContext | null = null;

      try {
        if (options.forceWebGL1) {
          explicitGl1 = (managed.canvas.getContext('webgl', {
            antialias: false,
            powerPreference: 'default',
            failIfMajorPerformanceCaveat: false,
          }) ||
            managed.canvas.getContext('experimental-webgl', {
              antialias: false,
              powerPreference: 'default',
              failIfMajorPerformanceCaveat: false,
            })) as WebGLRenderingContext | null;

          if (!explicitGl1) {
            throw new Error(
              managed.getCreationError() || 'Browser returned null for WebGL1 (webgl) context.'
            );
          }

          // Three.js r186 requires WebGL2 (#version 300 es + VAO). Verify cleanly before accepting.
          if (typeof (explicitGl1 as unknown as { createVertexArray?: unknown }).createVertexArray !== 'function') {
            throw new Error(
              'WebGL1 context acquired, but Three.js 0.186 requires WebGL2 shaders (#version 300 es / VAO).'
            );
          }

          tempRenderer = new THREE.WebGLRenderer({
            canvas: managed.canvas,
            context: explicitGl1,
            antialias: false,
            powerPreference: 'default',
            failIfMajorPerformanceCaveat: false,
          });
        } else {
          tempRenderer = new THREE.WebGLRenderer({
            canvas: managed.canvas,
            antialias: options.antialias,
            powerPreference: options.powerPreference,
            stencil: options.stencil ?? false,
            alpha: options.alpha ?? false,
            failIfMajorPerformanceCaveat: false,
          });
        }

        managed.cleanupListener();
        attempts.push({ attempt: attemptNumber, label, success: true });
        return tempRenderer;
      } catch (err) {
        const rawErr = err instanceof Error ? err.message : String(err);
        const creationMsg = managed.getCreationError();
        if (creationMsg) lastCreationError = creationMsg;
        const fullErr = creationMsg && !rawErr.includes(creationMsg) ? `${rawErr} (${creationMsg})` : rawErr;
        attempts.push({ attempt: attemptNumber, label, success: false, error: fullErr });

        try {
          if (tempRenderer) {
            tempRenderer.dispose();
            tempRenderer.forceContextLoss();
          } else if (explicitGl1) {
            releaseTempContext(managed.canvas, explicitGl1);
          } else {
            managed.canvas.width = 0;
            managed.canvas.height = 0;
          }
        } catch {
          // Ignore cleanup errors
        }
        managed.cleanupListener();
        return null;
      }
    };

    // Attempt 1: WebGL2 with standard settings (high-performance only on Attempt 1)
    const wantAA = !isMobile && settings.graphicsQuality !== 'low';
    renderer = tryCreateRenderer(1, 'WebGL2 Standard (high-performance)', {
      antialias: wantAA,
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
    });

    // Attempt 2: WebGL2 safe fallback (antialias false, default powerPreference, low pixel ratio)
    if (!renderer) {
      forcedLowQuality = true;
      renderer = tryCreateRenderer(2, 'WebGL2 Safe Fallback (no AA, default power)', {
        antialias: false,
        powerPreference: 'default',
        stencil: false,
        alpha: true,
      });
    }

    // Attempt 3: WebGL1 compatibility probe/fallback
    if (!renderer) {
      forcedLowQuality = true;
      renderer = tryCreateRenderer(3, 'WebGL1 Compatibility Fallback', {
        antialias: false,
        powerPreference: 'default',
        forceWebGL1: true,
      });
    }

    // Attempt 4: Delayed WebGL2 retry (400ms) in case GPU process needed time to reclaim a lost slot
    if (!renderer) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 400));
      forcedLowQuality = true;
      renderer = tryCreateRenderer(4, 'WebGL2 Delayed Recovery (400ms)', {
        antialias: false,
        powerPreference: 'default',
        stencil: false,
        alpha: false,
      });
    }

    // If all attempts failed, build rich diagnostic report using ONE shared probe and throw
    if (!renderer) {
      const probe = this.probeWebGLCapabilities(true);
      const report = this.buildDiagnosticReport(
        probe,
        isMobile,
        attempts,
        lastCreationError
      );
      throw new WebGLInitError(report.summary, report);
    }

    // Read GPU capabilities directly from the live renderer context (0 extra probe contexts!)
    const liveGl = renderer.getContext();
    const liveGpu = readGpuInfo(liveGl);
    const isSoftwareGl = liveGpu.isSoftwareGl;
    if (isSoftwareGl) {
      forcedLowQuality = true;
    }

    // Cache probe state cleanly from the live context
    cachedProbeResult = {
      webgl2Available: true,
      webgl1Available: true,
      gpuRenderer: liveGpu.renderer,
      gpuVendor: liveGpu.vendor,
      isSoftwareGl,
    };

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1726);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      settings.fov || 65,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      1000
    );
    camera.position.set(0, 15, 25);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Attach canvas to isolated container
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting setup (shared with DayNightSystem so only ONE directional shadow caster exists)
    const hemiLight = new THREE.HemisphereLight(0x7ec8e3, 0x1b3826, 0.7);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3d6, 1.8);
    keyLight.position.set(45, 70, 30);
    const d = 48;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 260;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x4ade80, 0.35);
    rimLight.position.set(-30, 20, -30);
    scene.add(rimLight);

    let pmremTimer: number | null = null;
    let isBundleDisposed = false;

    const handleLost = (e: Event) => {
      e.preventDefault();
      console.warn('WebGL context lost. Pausing engine and awaiting browser restoration.');
      onContextLost?.();
    };

    const handleRestored = () => {
      if (isBundleDisposed || !renderer) return;
      console.info('WebGL context restored.');
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.needsUpdate = true;
      onContextRestored?.();
    };

    renderer.domElement.addEventListener('webglcontextlost', handleLost, false);
    renderer.domElement.addEventListener('webglcontextrestored', handleRestored, false);

    const bundle: RendererBundle = {
      renderer,
      scene,
      camera,
      keyLight,
      hemiLight,
      rimLight,
      isSoftwareGl,
      isMobile,
      forcedLowQuality,
      pmremTexture: null,
      scheduleLazyEnvironment: () => {
        // Skip RoomEnvironment PMREM on mobile, software GL, or low preset to avoid GPU stalls/crashes
        if (
          isBundleDisposed ||
          isMobile ||
          isSoftwareGl ||
          forcedLowQuality ||
          settings.graphicsQuality === 'low' ||
          bundle.pmremTexture
        ) {
          return;
        }
        pmremTimer = window.setTimeout(() => {
          pmremTimer = null;
          if (isBundleDisposed || !renderer) return;
          try {
            const pmremGenerator = new THREE.PMREMGenerator(renderer);
            pmremGenerator.compileEquirectangularShader();
            const tex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
            pmremGenerator.dispose();
            if (isBundleDisposed) {
              tex.dispose();
              return;
            }
            bundle.pmremTexture = tex;
            scene.environment = tex;
          } catch (envErr) {
            console.warn('Skipping optional RoomEnvironment PMREM generation:', envErr);
          }
        }, 180);
      },
      dispose: () => {
        isBundleDisposed = true;
        if (pmremTimer !== null) {
          clearTimeout(pmremTimer);
          pmremTimer = null;
        }
        if (renderer) {
          renderer.domElement.removeEventListener('webglcontextlost', handleLost, false);
          renderer.domElement.removeEventListener('webglcontextrestored', handleRestored, false);
        }
        if (keyLight.shadow.map) {
          keyLight.shadow.map.dispose();
          keyLight.shadow.map = null;
        }
        scene.environment = null;
        if (bundle.pmremTexture) {
          bundle.pmremTexture.dispose();
          bundle.pmremTexture = null;
        }
        if (renderer) {
          try {
            renderer.dispose();
            renderer.forceContextLoss();
          } catch {
            // Ignore disposal errors if context was already lost
          }
          if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
          }
          renderer.domElement.width = 0;
          renderer.domElement.height = 0;
        }
        container.innerHTML = '';
        renderer = null;
      },
    };

    // Apply initial preset immediately (capped pixelRatio & shadows off when low/mobile/softwareGL)
    this.applySettings(bundle, settings, container.clientWidth, container.clientHeight);

    return bundle;
  }

  static buildDiagnosticReport(
    probe: WebGLProbeResult,
    isMobile: boolean,
    attempts: WebGLAttemptLog[],
    contextCreationError?: string,
    customSummary?: string
  ): WebGLDiagnosticReport {
    let summary = customSummary;
    if (!summary) {
      if (!probe.webgl2Available && probe.webgl1Available) {
        summary =
          'Your browser created a WebGL1 context, but WebGL2 is currently disabled or blocked (Three.js requires WebGL2).';
      } else if (!probe.webgl2Available && !probe.webgl1Available) {
        summary =
          'Browser could not allocate a WebGL graphics context. Chrome may have disabled WebGL after a GPU reset or context limit.';
      } else {
        summary =
          'WebGL hardware appears available, but context creation failed across all fallback attempts.';
      }
    }

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const screenSize =
      typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : 'Unknown';
    const viewportSize =
      typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown';

    return {
      summary,
      webgl2Available: probe.webgl2Available,
      webgl1Available: probe.webgl1Available,
      gpuRenderer: probe.gpuRenderer,
      gpuVendor: probe.gpuVendor,
      isSoftwareGl: probe.isSoftwareGl,
      isMobile,
      userAgent: ua,
      devicePixelRatio: dpr,
      screenSize,
      viewportSize,
      contextCreationError,
      attempts,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Apply resolved QualityConfig from PerformanceGovernor + user settings
   */
  static applyQualityConfig(
    bundle: RendererBundle,
    settings: GameSettings,
    config: QualityConfig,
    width: number,
    height: number
  ): void {
    const { renderer, camera, keyLight, scene, forcedLowQuality } = bundle;

    const effectiveDpr = forcedLowQuality
      ? Math.min(config.pixelRatioCap, 1.0)
      : config.pixelRatioCap;

    // 1. Pixel ratio cap
    renderer.setPixelRatio(effectiveDpr);
    renderer.setSize(width, Math.max(height, 1));

    // 2. Render distance & fog
    camera.far = config.farPlane;
    camera.fov = settings.fov || 65;
    camera.updateProjectionMatrix();

    if (scene.fog && 'density' in scene.fog) {
      (scene.fog as THREE.FogExp2).density = config.fogDensity;
    }

    // 3. Single directional shadow map with clean disposal when dimensions change
    const enableShadows = !forcedLowQuality && config.shadows && config.shadowMapSize > 0;
    renderer.shadowMap.enabled = enableShadows;

    if (enableShadows) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      keyLight.castShadow = true;
      if (
        keyLight.shadow.mapSize.width !== config.shadowMapSize ||
        keyLight.shadow.mapSize.height !== config.shadowMapSize
      ) {
        if (keyLight.shadow.map) {
          keyLight.shadow.map.dispose();
          keyLight.shadow.map = null;
        }
        keyLight.shadow.mapSize.set(config.shadowMapSize, config.shadowMapSize);
      }
    } else {
      keyLight.castShadow = false;
      if (keyLight.shadow.map) {
        keyLight.shadow.map.dispose();
        keyLight.shadow.map = null;
      }
    }
    renderer.shadowMap.needsUpdate = true;
  }

  /**
   * Dynamically apply performance presets and graphic settings (non-governor fallback)
   */
  static applySettings(
    bundle: RendererBundle,
    settings: GameSettings,
    width: number,
    height: number
  ): void {
    const { isSoftwareGl, isMobile, forcedLowQuality } = bundle;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    let tier: 'low' | 'medium' | 'high';
    if (forcedLowQuality && settings.graphicsQuality === 'auto') {
      tier = 'low';
    } else if (settings.graphicsQuality === 'auto') {
      if (isSoftwareGl || isMobile) tier = 'low';
      else if (typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 4) <= 4) {
        tier = 'medium';
      } else {
        tier = 'high';
      }
    } else {
      tier = settings.graphicsQuality;
    }

    const pixelRatioCap =
      isSoftwareGl || tier === 'low' || forcedLowQuality
        ? 1.0
        : tier === 'medium'
        ? Math.min(dpr, isMobile ? 1.25 : 1.5)
        : Math.min(dpr, isMobile ? 1.25 : 2.0);

    let farPlane = 160;
    let fogDensity = 0.01;
    if (settings.renderDistance === 'short' || tier === 'low') {
      farPlane = 95;
      fogDensity = 0.015;
    } else if (settings.renderDistance === 'medium' || tier === 'medium') {
      farPlane = 160;
      fogDensity = 0.01;
    } else {
      farPlane = 240;
      fogDensity = 0.007;
    }

    const shadowMapSize =
      tier === 'low' || isSoftwareGl || forcedLowQuality ? 0 : tier === 'medium' ? 512 : 1024;

    this.applyQualityConfig(
      bundle,
      settings,
      {
        tier,
        isAuto: settings.graphicsQuality === 'auto',
        pixelRatioCap,
        activeLoadRadius: tier === 'low' ? 46 : tier === 'medium' ? 62 : 80,
        activeUnloadRadius: tier === 'low' ? 58 : tier === 'medium' ? 76 : 96,
        nearLoadRadius: tier === 'low' ? 92 : tier === 'medium' ? 128 : 175,
        nearUnloadRadius: tier === 'low' ? 108 : tier === 'medium' ? 148 : 200,
        farPlane,
        fogDensity,
        shadows: !forcedLowQuality && settings.shadows && !isSoftwareGl && tier !== 'low',
        shadowMapSize,
        vegetationDensity: tier === 'low' ? 0.45 : tier === 'medium' ? 0.75 : 1.0,
        particleLimit: settings.particleLimit || (tier === 'low' ? 140 : 400),
        entityCap: tier === 'low' ? 10 : tier === 'medium' ? 16 : 24,
        maxPointLights: tier === 'low' ? 1 : tier === 'medium' ? 2 : 4,
      },
      width,
      height
    );
  }

  /**
   * Extract live WebGL telemetry for performance diagnostics overlay
   */
  static getDiagnostics(renderer: THREE.WebGLRenderer) {
    return {
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      points: renderer.info.render.points,
      lines: renderer.info.render.lines,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
    };
  }
}
