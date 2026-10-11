/**
 * Game Engine coordinator for The Drifting World.
 * Manages Three.js WebGL rendering, mobile/desktop input loops,
 * adaptive graphics quality, and lifecycle.
 */
import * as THREE from 'three';
import { PlayerController } from './player';
import { WorldManager } from './world';
import { ThreadManager } from './threads';
import { InteractionManager, InteractionState } from './interactions';
import { GameSettings, PerformanceStats } from './types';
import { soundSystem } from './audio';

export class GameEngine {
  public container: HTMLElement;
  public renderer!: THREE.WebGLRenderer;
  public scene!: THREE.Scene;
  public player!: PlayerController;
  public world!: WorldManager;
  public threads!: ThreadManager;
  public interactions!: InteractionManager;

  public isRunning: boolean = false;
  public isPaused: boolean = false;

  private clock: THREE.Clock;
  private animFrameId: number | null = null;
  public settings: GameSettings;

  // Performance tracking
  public stats: PerformanceStats = { fps: 60, drawCalls: 0, triangles: 0 };
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  // Desktop keyboard state
  private activeKeys: Set<string> = new Set();
  private isPointerLocked: boolean = false;

  // External listeners
  public onPerformanceUpdate?: (stats: PerformanceStats) => void;
  public onRespawnEffect?: (alpha: number) => void;

  constructor(container: HTMLElement, settings: GameSettings) {
    this.container = container;
    this.settings = settings;
    this.clock = new THREE.Clock();

    this.initScene();
    this.initRenderer();
    this.initGameSystems();
    this.setupDesktopInputs();
    this.setupResizeListener();
  }

  private initScene() {
    this.scene = new THREE.Scene();
  }

  private initRenderer() {
    let rendererInstance: THREE.WebGLRenderer | null = null;

    try {
      // First attempt with preferred settings
      rendererInstance = new THREE.WebGLRenderer({
        antialias: this.settings.graphicsQuality !== 'low',
        powerPreference: 'high-performance',
        precision: this.settings.graphicsQuality === 'low' ? 'mediump' : 'highp',
        stencil: false,
      });
    } catch (primaryErr) {
      console.warn('Primary WebGL initialization failed, attempting fallback:', primaryErr);
      try {
        // Fallback attempt with minimal requirements
        rendererInstance = new THREE.WebGLRenderer({
          antialias: false,
          powerPreference: 'default',
          precision: 'mediump',
          stencil: false,
        });
      } catch (fallbackErr) {
        console.error('Fatal WebGL initialization error:', fallbackErr);
        throw new Error(
          'WebGL 3D graphics could not be initialized. Please ensure hardware acceleration is enabled in your browser settings and graphics drivers are up to date.'
        );
      }
    }

    this.renderer = rendererInstance;
    this.applyQualitySettings(this.settings.graphicsQuality);

    // Guaranteed positive dimensions even during layout reflows
    const width = Math.max(this.container.clientWidth || window.innerWidth || 800, 320);
    const height = Math.max(this.container.clientHeight || window.innerHeight || 600, 240);

    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // Attach to DOM
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
  }

  public applyQualitySettings(quality: 'low' | 'balanced' | 'high') {
    this.settings.graphicsQuality = quality;

    let targetDpr = 1.0;
    if (quality === 'balanced') {
      targetDpr = Math.min(window.devicePixelRatio, 1.35);
    } else if (quality === 'high') {
      targetDpr = Math.min(window.devicePixelRatio, 1.75);
    }

    this.renderer.setPixelRatio(targetDpr);

    if (this.world) {
      this.world.setQuality(quality);
    }
  }

  private initGameSystems() {
    // 1. Player
    this.player = new PlayerController([0, 2.8, 0]);
    this.player.setSensitivity(this.settings.sensitivity);

    // 2. World
    this.world = new WorldManager(this.scene);
    this.world.buildWorld();

    // Link walkable meshes for player ground collision
    this.player.walkableMeshes = this.world.walkableMeshes;

    // 3. Threads
    this.threads = new ThreadManager(this.scene);

    // 4. Interactions
    this.interactions = new InteractionManager(this.world, this.threads, this.player);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    soundSystem.startAudio();
    this.gameLoop();
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
    this.clock.getDelta(); // flush delta spike
  }

  public setSensitivity(val: number) {
    this.settings.sensitivity = val;
    this.player.setSensitivity(val);
  }

  private gameLoop = () => {
    if (!this.isRunning) return;

    this.animFrameId = requestAnimationFrame(this.gameLoop);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    // FPS calculation
    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 0.5) {
      this.stats.fps = Math.round((this.frameCount / this.fpsTimer));
      this.stats.drawCalls = this.renderer.info.render.calls;
      this.stats.triangles = this.renderer.info.render.triangles;
      this.frameCount = 0;
      this.fpsTimer = 0;
      if (this.onPerformanceUpdate) {
        this.onPerformanceUpdate(this.stats);
      }
    }

    if (!this.isPaused) {
      // 1. Process desktop keyboard movement input
      this.processDesktopMovement();

      // 2. Update player physics and first-person camera
      this.player.update(delta);

      // Notify UI of respawn fade overlay
      if (this.onRespawnEffect) {
        this.onRespawnEffect(this.player.respawnFadeAlpha);
      }

      // 3. Update world animated scenery (ocean waves, floating rocks, motes)
      this.world.update(elapsedTime, delta);

      // 4. Update threads & resonance
      this.threads.update(elapsedTime, delta);

      // 5. Update interaction proximity checks
      this.interactions.update(delta);
    }

    // Render 3D Scene
    this.renderer.render(this.scene, this.player.camera);
  };

  private processDesktopMovement() {
    // Only process desktop keyboard if pointer is locked or not on touch
    let forward = 0;
    let right = 0;

    if (this.activeKeys.has('KeyW') || this.activeKeys.has('ArrowUp')) forward += 1;
    if (this.activeKeys.has('KeyS') || this.activeKeys.has('ArrowDown')) forward -= 1;
    if (this.activeKeys.has('KeyD') || this.activeKeys.has('ArrowRight')) right += 1;
    if (this.activeKeys.has('KeyA') || this.activeKeys.has('ArrowLeft')) right -= 1;

    // Only overwrite if mobile joystick isn't actively pressed
    if (forward !== 0 || right !== 0) {
      this.player.input.moveForward = forward;
      this.player.input.moveRight = right;
    }
  }

  private setupDesktopInputs() {
    // Pointer lock for desktop mouse look
    const canvas = this.renderer.domElement;

    canvas.addEventListener('click', () => {
      // If user clicks canvas on desktop, request pointer lock
      if (!('ontouchstart' in window) && !this.isPointerLocked) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked && !this.isPaused) {
        this.player.applyLookDelta(e.movementX, e.movementY, false);
      }
    });

    window.addEventListener('keydown', (e) => {
      this.activeKeys.add(e.code);

      if (e.code === 'Space') {
        this.player.input.jump = true;
      }
      if (e.code === 'KeyE') {
        this.interactions.triggerCurrentInteract();
      }
      if (e.code === 'Escape') {
        this.isPaused = !this.isPaused;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.activeKeys.delete(e.code);
      if (e.code === 'KeyW' || e.code === 'KeyS' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        this.player.input.moveForward = 0;
      }
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        this.player.input.moveRight = 0;
      }
    });
  }

  private setupResizeListener() {
    const onResize = () => {
      if (!this.container || !this.renderer) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;

      this.player.camera.aspect = width / height;
      this.player.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(onResize, 200);
    });
  }

  /**
   * Applies saved progress to restore activated anchors and fragments
   */
  public restoreProgress(activatedAnchorIds: string[], collectedFragmentIds: string[], resonanceDiscovered: boolean) {
    activatedAnchorIds.forEach(id => {
      const anchor = this.world.anchors.find(a => a.id === id);
      if (anchor) {
        anchor.activated = true;
        if (anchor.crystalMesh) {
          const mat = anchor.crystalMesh.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 2.4;
        }
        if (anchor.light) {
          anchor.light.intensity = 4.0;
        }
      }
    });

    collectedFragmentIds.forEach(id => {
      const frag = this.world.fragments.find(f => f.id === id);
      if (frag) {
        frag.collected = true;
        if (frag.mesh) frag.mesh.visible = false;
      }
    });

    // Check thread connections
    this.threads.evaluateResonance(this.world.anchors);

    if (resonanceDiscovered) {
      this.world.revealResonanceCitadel();
    }
  }

  public destroy() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
