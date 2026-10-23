/**
 * Three.js WebGL Setup & Hardware Detection for The Drifting Land.
 * Implements strict Three.js Skill guidelines:
 * - Software WebGL probe from GPU renderer string
 * - SRGB Color Space & ACES Filmic Tone Mapping
 * - RoomEnvironment PMREM procedural environment reflection
 * - PCF Soft Shadows
 * - Zero GC in render loop
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface RendererBundle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
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
  static init(container: HTMLElement, enableShadows = true): RendererBundle {
    const isSoftwareGl = this.detectSoftwareGl();

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1726);
    // Horizon fog matching atmosphere
    scene.fog = new THREE.FogExp2(0x0e1726, 0.009);

    // Camera (Default Third-person perspective)
    const camera = new THREE.PerspectiveCamera(
      65,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      1000
    );
    camera.position.set(0, 15, 25);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
    });

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Cap devicePixelRatio: 1 on software, max 2 on mobile/desktop GPUs
    const pixelRatio = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);

    if (enableShadows && !isSoftwareGl) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else {
      renderer.shadowMap.enabled = false;
    }

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

    // Warm Key + Cool Fill 3-point lighting setup
    const hemiLight = new THREE.HemisphereLight(0x7ec8e3, 0x1b3826, 0.7);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3d6, 1.8);
    keyLight.position.set(45, 70, 30);
    keyLight.castShadow = !isSoftwareGl && enableShadows;
    keyLight.shadow.mapSize.width = isSoftwareGl ? 512 : 2048;
    keyLight.shadow.mapSize.height = isSoftwareGl ? 512 : 2048;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 200;
    const d = 50;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x4ade80, 0.4);
    rimLight.position.set(-30, 20, -30);
    scene.add(rimLight);

    // Dispose helper
    const dispose = () => {
      pmremTexture.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };

    return {
      renderer,
      scene,
      camera,
      isSoftwareGl,
      pmremTexture,
      dispose,
    };
  }
}
