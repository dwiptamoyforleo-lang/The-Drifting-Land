import * as THREE from '../vendor/three.js';
import { RoomEnvironment } from '../vendor/three.js';

/**
 * Three.js WebGLRenderer, scene lighting rig, PMREM environment, and resize/context-loss handling.
 */
export class WorldRenderer {
  /**
   * @param {HTMLElement} mountEl
   * @param {import('../config/quality.js').QUALITY_PRESETS['high'] & { isSoftwareGl: boolean }} quality
   * @param {{ onContextLost?: () => void, onContextRestored?: () => void }} [callbacks]
   */
  constructor(mountEl, quality, callbacks = {}) {
    this.mountEl = mountEl;
    this.quality = quality;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xd99e7c, quality.fogDensity);

    this.camera = new THREE.PerspectiveCamera(
      68,
      Math.max(1, mountEl.clientWidth) / Math.max(1, mountEl.clientHeight),
      0.15,
      1200
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: quality.antialias,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio));
    this.renderer.setSize(Math.max(1, mountEl.clientWidth), Math.max(1, mountEl.clientHeight));
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';

    mountEl.appendChild(this.renderer.domElement);

    // Mandatory studio reflection map for metallic brass, water & Wayglass
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this._envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this._envRT.texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();

    // Warm/Cool key + hemisphere fill rig (single shadow caster)
    this.hemiLight = new THREE.HemisphereLight(0x89a8d8, 0x4c4036, 0.78);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffd08a, 1.45);
    this.sunLight.castShadow = quality.shadows;
    this.sunLight.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 260;
    const d = 52;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this._onResize = this.resize.bind(this);
    this._onLost = (ev) => {
      ev.preventDefault();
      this.callbacks.onContextLost?.();
    };
    this._onRestored = () => {
      this.callbacks.onContextRestored?.();
    };

    window.addEventListener('resize', this._onResize);
    this.renderer.domElement.addEventListener('webglcontextlost', this._onLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this._onRestored);
  }

  /**
   * Apply new quality settings at runtime without recreating the world.
   * @param {ReturnType<import('../config/quality.js').resolveQuality>} quality
   */
  applyQuality(quality) {
    this.quality = quality;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio));
    this.renderer.shadowMap.enabled = quality.shadows;
    this.sunLight.castShadow = quality.shadows;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = quality.fogDensity;
    }
    this.resize();
  }

  /**
   * Sync directional sun, hemisphere fill, and fog to DriftClock + player shadow center.
   * @param {import('./DriftClock.js').DriftClock} clock
   * @param {THREE.Vector3} focusPos
   */
  syncAtmosphere(clock, focusPos) {
    this.sunLight.color.copy(clock.sunColor);
    this.sunLight.intensity = clock.sunIntensity;
    this.sunLight.target.position.copy(focusPos);
    this.sunLight.position
      .copy(focusPos)
      .addScaledVector(clock.sunDirection, 115);

    this.hemiLight.color.copy(clock.hemiSkyColor);
    this.hemiLight.groundColor.copy(clock.hemiGroundColor);
    this.hemiLight.intensity = clock.hemiIntensity;

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(clock.fogColor);
    }
  }

  resize() {
    const w = Math.max(1, this.mountEl.clientWidth || window.innerWidth);
    const h = Math.max(1, this.mountEl.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this._onLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this._onRestored);
    this._envRT?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
