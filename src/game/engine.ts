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
import { GameSettings, PerformanceStats, TelemetryData, PlayerStats } from './types';
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
  public stats: PerformanceStats = { fps: 60, drawCalls: 0, triangles: 0 };
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private activeKeys: Set<string> = new Set();
  private isPointerLocked: boolean = false;

  public onPerformanceUpdate?: (stats: PerformanceStats) => void;
  public onRespawnEffect?: (alpha: number) => void;
  public onTelemetryUpdate?: (data: TelemetryData) => void;
  public onStatsUpdate?: (stats: PlayerStats) => void;
  public onDamageEffect?: (amount: number, reason: string) => void;
  public onHotbarUse?: (slotIndex: number) => void;
  public onOpenCrafting?: () => void;
  public onToggleCamera?: () => void;
  public onOpenInventory?: () => void;
  public onOpenQuests?: () => void;
  public onOpenMap?: () => void;

  constructor(container: HTMLElement, settings: GameSettings) {
    this.container = container;
    this.settings = settings;
    this.clock = new THREE.Clock();
    this.initScene();
    this.initRenderer();
    this.initGameSystems();
    this.setupDesktopInputs();
    this.setupResizeListener();
    this.start();
  }

  private initScene() {
    this.scene = new THREE.Scene();
  }

  private initRenderer() {
    let rendererInstance: THREE.WebGLRenderer | null = null;
    try {
      rendererInstance = new THREE.WebGLRenderer({
        antialias: this.settings.graphicsQuality !== 'low',
        powerPreference: 'high-performance',
        precision: this.settings.graphicsQuality === 'low' ? 'mediump' : 'highp',
        stencil: false,
      });
    } catch (primaryErr) {
      console.warn('Primary WebGL initialization failed:', primaryErr);
      rendererInstance = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'default', precision: 'mediump', stencil: false });
    }
    this.renderer = rendererInstance;
    this.applyQualitySettings(this.settings.graphicsQuality);

    const width = Math.max(this.container.clientWidth || window.innerWidth || 800, 320);
    const height = Math.max(this.container.clientHeight || window.innerHeight || 600, 240);
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
  }

  public applyQualitySettings(quality: 'low' | 'balanced' | 'high') {
    this.settings.graphicsQuality = quality;
    let targetDpr = 1.0;
    if (quality === 'balanced') targetDpr = Math.min(window.devicePixelRatio, 1.35);
    else if (quality === 'high') targetDpr = Math.min(window.devicePixelRatio, 1.75);
    this.renderer.setPixelRatio(targetDpr);
    if (this.world) this.world.setQuality(quality);
  }

  private initGameSystems() {
    this.world = new WorldManager(this.scene);
    this.world.buildWorld();
    this.scene.updateMatrixWorld(true);

    this.player = new PlayerController(this.scene, [0, 4.2, 0]);
    this.player.setSensitivity(this.settings.sensitivity);
    this.player.setCameraMode(this.settings.cameraMode || 'third_person');
    this.player.walkableMeshes = this.world.walkableMeshes;
    this.player.onDamageTaken = (amount, reason) => {
      if (this.onDamageEffect) this.onDamageEffect(amount, reason);
    };
    this.player.onStatsChange = () => {
      if (this.onStatsUpdate) this.onStatsUpdate(this.player.getPlayerStats());
    };

    // Second-person observer hook: finds closest observing NPC or creature within 22m
    this.player.getNearbyObserver = () => {
      const pPos = this.player.position;
      let closest: { position: THREE.Vector3; name: string } | null = null;
      let minDist = 22.0;

      for (const npc of this.world.npcs) {
        const nPos = npc.mesh ? npc.mesh.position : new THREE.Vector3(...npc.position);
        const d = pPos.distanceTo(nPos);
        if (d < minDist && d > 1.2) {
          minDist = d;
          closest = {
            position: nPos.clone().add(new THREE.Vector3(0, 1.7, 0)),
            name: `${npc.name} (${npc.role})`,
          };
        }
      }

      for (const w of this.world.wildlife) {
        const wPos = w.mesh ? w.mesh.position : new THREE.Vector3(...w.position);
        const d = pPos.distanceTo(wPos);
        if (d < minDist && d > 1.5) {
          minDist = d;
          const eyeH = w.species === 'cloudgrazer' ? 2.8 : 1.3;
          closest = {
            position: wPos.clone().add(new THREE.Vector3(0, eyeH, 0)),
            name: `${w.name} (${w.species})`,
          };
        }
      }

      return closest;
    };

    this.threads = new ThreadManager(this.scene);
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
    this.clock.getDelta();
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

    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 0.5) {
      this.stats.fps = Math.round(this.frameCount / this.fpsTimer);
      this.stats.drawCalls = this.renderer.info.render.calls;
      this.stats.triangles = this.renderer.info.render.triangles;
      this.frameCount = 0;
      this.fpsTimer = 0;
      if (this.onPerformanceUpdate) this.onPerformanceUpdate(this.stats);
    }

    if (!this.isPaused) {
      this.processDesktopMovement();
      this.player.update(delta);

      if (this.onTelemetryUpdate) {
        const baseTelemetry = this.player.getTelemetry();
        const timeLabels: Record<string, string> = {
          day: 'SOLAR CYCLE: MIDDAY',
          sunset: 'SOLAR CYCLE: AMBER TWILIGHT',
          night: 'SOLAR CYCLE: CELESTIAL NIGHT',
          red_moon: 'PHENOMENON: RED MOON ECLIPSE',
        };
        this.onTelemetryUpdate({
          ...baseTelemetry,
          timeOfDay: this.world.timeOfDay,
          timeLabel: timeLabels[this.world.timeOfDay] || 'SOLAR CYCLE: NORMAL',
        });
      }

      if (this.onStatsUpdate) {
        this.onStatsUpdate(this.player.getPlayerStats());
      }

      if (this.onRespawnEffect) this.onRespawnEffect(this.player.respawnFadeAlpha);

      this.world.update(elapsedTime, delta, this.player.position);

      // Campfire rest healing near Traveler Jorah's rest camp ([8.0, 4.6, -18.0])
      const campfireDist = this.player.position.distanceTo(new THREE.Vector3(8.0, 4.6, -18.0));
      if (campfireDist < 3.8 && !this.player.isRespawning) {
        if (this.player.health < this.player.maxHealth || this.player.stamina < this.player.maxStamina) {
          this.player.heal(delta * 5.0);
          this.player.restoreStamina(delta * 18.0);
        }
      }

      this.threads.update(elapsedTime, delta);
      this.interactions.update(delta);
    }

    this.renderer.render(this.scene, this.player.camera);
  };

  private processDesktopMovement() {
    let forward = 0;
    let right = 0;

    if (this.activeKeys.has('KeyW') || this.activeKeys.has('ArrowUp')) forward += 1;
    if (this.activeKeys.has('KeyS') || this.activeKeys.has('ArrowDown')) forward -= 1;
    if (this.activeKeys.has('KeyD') || this.activeKeys.has('ArrowRight')) right += 1;
    if (this.activeKeys.has('KeyA') || this.activeKeys.has('ArrowLeft')) right -= 1;

    if (forward !== 0 || right !== 0) {
      this.player.input.moveForward = forward;
      this.player.input.moveRight = right;
    }

    this.player.input.sprint = this.activeKeys.has('ShiftLeft') || this.activeKeys.has('ShiftRight');
  }

  private setupDesktopInputs() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('click', () => {
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
      if (e.code === 'Space') this.player.input.jump = true;
      if (e.code === 'KeyE') this.interactions.triggerCurrentInteract();
      if (e.code === 'KeyF') {
        this.player.input.primaryAction = true;
        this.interactions.showToast('PRIMARY ACTION', 'Executed equipped tool action.');
      }
      if (e.code === 'KeyV') {
        if (this.onToggleCamera) this.onToggleCamera();
      }
      if (e.code === 'KeyI' || e.code === 'Tab') {
        e.preventDefault();
        if (this.onOpenInventory) this.onOpenInventory();
      }
      if (e.code === 'KeyJ') {
        if (this.onOpenQuests) this.onOpenQuests();
      }
      if (e.code === 'KeyM') {
        if (this.onOpenMap) this.onOpenMap();
      }
      if (e.code === 'KeyC') {
        if (this.onOpenCrafting) this.onOpenCrafting();
      }
      if (e.code === 'Digit1') this.onHotbarUse?.(0);
      if (e.code === 'Digit2') this.onHotbarUse?.(1);
      if (e.code === 'Digit3') this.onHotbarUse?.(2);
      if (e.code === 'Digit4') this.onHotbarUse?.(3);
      if (e.code === 'Digit5') this.onHotbarUse?.(4);
      if (e.code === 'Digit6') this.onHotbarUse?.(5);
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

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.interactions.showToast('TOOL ACTION', 'Used equipped item.');
      } else if (e.button === 2) {
        this.interactions.showToast('ALTERNATE ACTION', 'Secondary tool mode engaged.');
      }
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private setupResizeListener() {
    const onResize = () => {
      if (!this.container || !this.renderer) return;
      const width = Math.max(this.container.clientWidth || window.innerWidth || 800, 320);
      const height = Math.max(this.container.clientHeight || window.innerHeight || 600, 240);
      this.player.camera.aspect = width / height;
      this.player.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => setTimeout(onResize, 200));
  }

  public restoreProgress(activatedAnchorIds: string[], collectedFragmentIds: string[], resonanceDiscovered: boolean) {
    activatedAnchorIds.forEach(id => {
      const anchor = this.world.anchors.find(a => a.id === id);
      if (anchor) {
        anchor.activated = true;
        if (anchor.crystalMesh) (anchor.crystalMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.4;
        if (anchor.light) anchor.light.intensity = 4.0;
      }
    });

    collectedFragmentIds.forEach(id => {
      const frag = this.world.fragments.find(f => f.id === id);
      if (frag) {
        frag.collected = true;
        if (frag.mesh) frag.mesh.visible = false;
      }
    });

    this.threads.evaluateResonance(this.world.anchors);
    if (resonanceDiscovered) this.world.revealResonanceCitadel();
  }

  public destroy() {
    this.isRunning = false;
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

