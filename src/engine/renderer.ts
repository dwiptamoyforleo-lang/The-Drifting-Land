/**
 * Three.js WebGL Setup & Hardware Detection for The Drifting Land.
 * Implements strict Three.js Skill guidelines:
 * - Software WebGL probe from GPU renderer string (SwiftShader, WARP, llvmpipe)
 * - Device pixel ratio limits tailored for mid-range Android devices
 * - Presets: Low, Medium, High, and Auto
 * - Dynamic shadow map sizing (off, 512, 1024, 2048) and render-distance fog
 * - WebGL context loss & restore lifecycle protection
 * - SRGB Color Space & ACES Filmic Tone Mapping
 * - RoomEnvironment PMREM procedural environment reflection
 * - Zero GC in render loop and comprehensive disposal
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GameSettings } from '../types/game';

export interface RendererBundle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  keyLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  rimLight: THREE.DirectionalLight;
  isSoftwareGl: boolean;
  pmremTexture: THREE.Texture;
  dispose: () => void;
}

export class RenderPipeline {
  /**
   * Probe WebGL capabilities and detect software renderers (SwiftShader, llvmpipe, WARP)
   */
  static detectSoftwareGl(): boolean {
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) return true;

      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();

      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  /**
   * Detect if device is a mobile / tablet user agent
   */
  static isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Check if WebGL is available at all
   */
  static isWebGLAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
    } catch {
      return false;
    }
  }

  /**
   * Initialize Three.js scene, camera, renderer, and RoomEnvironment
   */
  static init(
    container: HTMLElement,
    settings: GameSettings,
    onContextLost?: () => void,
    onContextRestored?: () => void
  ): RendererBundle {
    const isSoftwareGl = this.detectSoftwareGl();
    const isMobile = this.isMobileDevice();

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1726);

    // Initial camera
    const camera = new THREE.PerspectiveCamera(
      settings.fov || 65,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      1000
    );
    camera.position.set(0, 15, 25);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl && settings.graphicsQuality !== 'low',
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
    });

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Attach to DOM
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Procedural Studio / Room Environment reflection map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const pmremTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = pmremTexture;
    pmremGenerator.dispose();

    // Lighting setup
    const hemiLight = new THREE.HemisphereLight(0x7ec8e3, 0x1b3826, 0.7);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3d6, 1.8);
    keyLight.position.set(45, 70, 30);
    const d = 50;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 200;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x4ade80, 0.4);
    rimLight.position.set(-30, 20, -30);
    scene.add(rimLight);

    const bundle: RendererBundle = {
      renderer,
      scene,
      camera,
      keyLight,
      hemiLight,
      rimLight,
      isSoftwareGl,
      pmremTexture,
      dispose: () => {
        pmremTexture.dispose();
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      },
    };

    // Apply quality preset and distance settings
    this.applySettings(bundle, settings, container.clientWidth, container.clientHeight);

    // WebGL Context Loss Lifecycle handlers
    renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('WebGL context lost. Suppressing crash and notifying engine.');
      onContextLost?.();
    }, false);

    renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.info('WebGL context restored.');
      onContextRestored?.();
    }, false);

    return bundle;
  }

  /**
   * Dynamically apply performance presets and graphic settings
   */
  static applySettings(
    bundle: RendererBundle,
    settings: GameSettings,
    width: number,
    height: number
  ): void {
    const { renderer, camera, keyLight, scene, isSoftwareGl } = bundle;
    const isMobile = this.isMobileDevice();

    // Determine effective preset
    let effectiveQuality = settings.graphicsQuality;
    if (effectiveQuality === 'auto') {
      if (isSoftwareGl) {
        effectiveQuality = 'low';
      } else if (isMobile || (typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)) {
        effectiveQuality = 'medium';
      } else {
        effectiveQuality = 'high';
      }
    }

    // 1. Pixel Ratio limits
    let targetPixelRatio = 1.0;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    if (isSoftwareGl || effectiveQuality === 'low') {
      targetPixelRatio = 1.0;
    } else if (effectiveQuality === 'medium') {
      targetPixelRatio = Math.min(dpr, 1.25);
    } else {
      targetPixelRatio = Math.min(dpr, 2.0);
    }
    renderer.setPixelRatio(targetPixelRatio);
    renderer.setSize(width, height);

    // 2. Render Distance & Fog
    let farPlane = 180;
    let fogDensity = 0.010;
    if (settings.renderDistance === 'short' || effectiveQuality === 'low') {
      farPlane = 90;
      fogDensity = 0.016;
    } else if (settings.renderDistance === 'medium') {
      farPlane = 160;
      fogDensity = 0.010;
    } else {
      farPlane = 260;
      fogDensity = 0.007;
    }
    camera.far = farPlane;
    camera.fov = settings.fov || 65;
    camera.updateProjectionMatrix();

    if (scene.fog && 'density' in scene.fog) {
      (scene.fog as THREE.FogExp2).density = fogDensity;
    }

    // 3. Dynamic Shadows
    const enableShadows = settings.shadows && !isSoftwareGl && effectiveQuality !== 'low';
    renderer.shadowMap.enabled = enableShadows;

    if (enableShadows) {
      const shadowSize = effectiveQuality === 'high' ? 2048 : 512;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = shadowSize;
      keyLight.shadow.mapSize.height = shadowSize;
    } else {
      keyLight.castShadow = false;
    }
    renderer.shadowMap.needsUpdate = true;
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
