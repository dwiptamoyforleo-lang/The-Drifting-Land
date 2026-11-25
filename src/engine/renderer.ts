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
import { QualityConfig } from './performanceGovernor';

export interface RendererBundle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  keyLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  rimLight: THREE.DirectionalLight;
  isSoftwareGl: boolean;
  isMobile: boolean;
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

    // Renderer (disable AA on low/mobile/software for crisp fillrate on Android)
    const enableAA = !isSoftwareGl && !isMobile && settings.graphicsQuality !== 'low';
    const renderer = new THREE.WebGLRenderer({
      antialias: enableAA,
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

    // Lighting setup (shared with DayNightSystem so there is only 1 directional shadow caster)
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

    const bundle: RendererBundle = {
      renderer,
      scene,
      camera,
      keyLight,
      hemiLight,
      rimLight,
      isSoftwareGl,
      isMobile,
      pmremTexture,
      dispose: () => {
        if (keyLight.shadow.map) {
          keyLight.shadow.map.dispose();
          keyLight.shadow.map = null;
        }
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
   * Apply resolved QualityConfig from PerformanceGovernor + user settings
   */
  static applyQualityConfig(
    bundle: RendererBundle,
    settings: GameSettings,
    config: QualityConfig,
    width: number,
    height: number
  ): void {
    const { renderer, camera, keyLight, scene } = bundle;

    // 1. Pixel ratio cap
    renderer.setPixelRatio(config.pixelRatioCap);
    renderer.setSize(width, Math.max(height, 1));

    // 2. Render distance & fog
    camera.far = config.farPlane;
    camera.fov = settings.fov || 65;
    camera.updateProjectionMatrix();

    if (scene.fog && 'density' in scene.fog) {
      (scene.fog as THREE.FogExp2).density = config.fogDensity;
    }

    // 3. Single directional shadow map with clean disposal when dimensions change
    const enableShadows = config.shadows && config.shadowMapSize > 0;
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
    const { isSoftwareGl, isMobile } = bundle;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    let tier: 'low' | 'medium' | 'high';
    if (settings.graphicsQuality === 'auto') {
      if (isSoftwareGl) tier = 'low';
      else if (isMobile || (typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 4) <= 4)) {
        tier = isMobile && (navigator.hardwareConcurrency || 4) <= 4 ? 'low' : 'medium';
      } else {
        tier = 'high';
      }
    } else {
      tier = settings.graphicsQuality;
    }

    const pixelRatioCap =
      isSoftwareGl || tier === 'low'
        ? 1.0
        : tier === 'medium'
        ? Math.min(dpr, isMobile ? 1.25 : 1.5)
        : Math.min(dpr, isMobile ? 1.5 : 2.0);

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

    const shadowMapSize = tier === 'low' || isSoftwareGl ? 0 : tier === 'medium' ? 512 : 1024;

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
        shadows: settings.shadows && !isSoftwareGl && tier !== 'low',
        shadowMapSize,
        vegetationDensity: tier === 'low' ? 0.45 : tier === 'medium' ? 0.75 : 1.0,
        particleLimit: settings.particleLimit || 400,
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
