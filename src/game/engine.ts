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
  private telemetryTimer: number = 0;
  private statsTimer: number = 0;
  private lastRespawnFadeAlpha: number = 0;
  private activeKeys: Set<string> = new Set();
  private isPointerLocked: boolean = false;
  private cleanupListeners: (() => void)[] = [];

  private static readonly CAMPFIRE_POS: THREE.Vector3 = new THREE.Vector3(8.0, 4.6, -18.0);
  private static readonly TIME_LABELS: Record<string, string> = {
    day: 'SOLAR CYCLE: MIDDAY',
    sunset: 'SOLAR CYCLE: AMBER TWILIGHT',
    night: 'SOLAR CYCLE: CELESTIAL NIGHT',
    red_moon: 'PHENOMENON: RED MOON ECLIPSE',
  };
  private _observerPos: THREE.Vector3 = new THREE.Vector3();
  private _tempVec: THREE.Vector3 = new THREE.Vector3();

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
  public onLootAcquired?: (itemId: string, count: number) => void;

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
    this.world.initPerformanceOptimizations();
    this.world.setQuality(this.settings.graphicsQuality);
    this.scene.updateMatrixWorld(true);

    this.player = new PlayerController(this.scene, [0, 4.2, 0]);
    this.player.setSensitivity(this.settings.sensitivity);
    this.player.setCameraMode(this.settings.cameraMode || 'first_person');
    this.player.walkableMeshes = this.world.walkableMeshes;
    this.player.onDamageTaken = (amount, reason) => {
      if (this.onDamageEffect) this.onDamageEffect(amount, reason);
    };
    this.player.onStatsChange = () => {
      if (this.onStatsUpdate) this.onStatsUpdate(this.player.getPlayerStats());
    };
    this.player.onAttackTriggered = () => {
      const lookDir = this.player.getLookDirection();
      if (this.world.creaturesManager) {
        const result = this.world.creaturesManager.handlePlayerAttack(
          this.player.position,
          lookDir,
          this.player.attackPower
        );
        if (result.hit) {
          soundSystem.playHit();
          if (result.defeated) {
            soundSystem.playCreatureDefeated();
            if (result.rareDropNotification) {
              soundSystem.playRareItemDrop();
              this.interactions.showToast('RARE DROP!', result.rareDropNotification, 5.0);
            } else {
              this.interactions.showToast('TARGET DEFEATED', `${result.creatureName} was neutralized.`);
            }
            if (result.lootItems && result.lootItems.length > 0 && this.onLootAcquired) {
              result.lootItems.forEach((item) => this.onLootAcquired?.(item.itemId, item.count));
            }
          } else {
            this.interactions.showToast('HIT CONFIRMED', `Dealt ${this.player.attackPower} dmg to ${result.creatureName}`);
          }
        }
      }
    };

    // Second-person observer hook: finds closest observing NPC or creature within 22m (zero allocation)
    this.player.getNearbyObserver = () => {
      const pPos = this.player.position;
      let closest: { position: THREE.Vector3; name: string } | null = null;
      let minDistSq = 22.0 * 22.0;

      for (let i = 0; i < this.world.npcs.length; i++) {
        const npc = this.world.npcs[i];
        const nx = npc.mesh ? npc.mesh.position.x : npc.position[0];
        const ny = npc.mesh ? npc.mesh.position.y : npc.position[1];
        const nz = npc.mesh ? npc.mesh.position.z : npc.position[2];
        const dx = pPos.x - nx;
        const dy = pPos.y - ny;
        const dz = pPos.z - nz;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq < minDistSq && dSq > 1.44) {
          minDistSq = dSq;
          this._observerPos.set(nx, ny + 1.7, nz);
          closest = {
            position: this._observerPos,
            name: `${npc.name} (${npc.role})`,
          };
        }
      }

      for (let i = 0; i < this.world.wildlife.length; i++) {
        const w = this.world.wildlife[i];
        const wx = w.mesh ? w.mesh.position.x : w.position[0];
        const wy = w.mesh ? w.mesh.position.y : w.position[1];
        const wz = w.mesh ? w.mesh.position.z : w.position[2];
        const dx = pPos.x - wx;
        const dy = pPos.y - wy;
        const dz = pPos.z - wz;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq < minDistSq && dSq > 2.25) {
          minDistSq = dSq;
          const eyeH = w.species === 'cloudgrazer' ? 2.8 : 1.3;
          this._observerPos.set(wx, wy + eyeH, wz);
          closest = {
            position: this._observerPos,
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
      if (this.onPerformanceUpdate && this.settings.showFps) {
        this.onPerformanceUpdate(this.stats);
      }
    }

    if (!this.isPaused) {
      this.processDesktopMovement();
      this.player.update(delta);

      // Throttle telemetry updates to ~10 Hz (100ms) to prevent 60 FPS React re-render thrashing
      this.telemetryTimer += delta;
      if (this.telemetryTimer >= 0.1) {
        this.telemetryTimer = 0;
        if (this.onTelemetryUpdate) {
          const baseTelemetry = this.player.getTelemetry();
          this.onTelemetryUpdate({
            ...baseTelemetry,
            timeOfDay: this.world.timeOfDay,
            timeLabel: GameEngine.TIME_LABELS[this.world.timeOfDay] || 'SOLAR CYCLE: NORMAL',
          });
        }
      }

      // Throttle stats updates to ~10 Hz (100ms)
      this.statsTimer += delta;
      if (this.statsTimer >= 0.1) {
        this.statsTimer = 0;
        if (this.onStatsUpdate) {
          this.onStatsUpdate(this.player.getPlayerStats());
        }
      }

      // Only notify respawn alpha on actual state transition to avoid per-frame React updates
      const currentRespawnAlpha = this.player.respawnFadeAlpha;
      if (this.onRespawnEffect && (currentRespawnAlpha > 0.001 || this.lastRespawnFadeAlpha > 0.001)) {
        if (Math.abs(currentRespawnAlpha - this.lastRespawnFadeAlpha) > 0.02 || (currentRespawnAlpha <= 0.001 && this.lastRespawnFadeAlpha > 0.001)) {
          this.lastRespawnFadeAlpha = currentRespawnAlpha;
          this.onRespawnEffect(currentRespawnAlpha <= 0.001 ? 0 : currentRespawnAlpha);
        }
      }

      this.world.update(elapsedTime, delta, this.player.position, (dmg, reason) => {
        this.player.takeDamage(dmg, reason);
      });

      // Campfire rest healing near Traveler Jorah's rest camp ([8.0, 4.6, -18.0]) - zero-allocation check
      const campfireDist = this.player.position.distanceTo(GameEngine.CAMPFIRE_POS);
      if (campfireDist < 3.8 && !this.player.isRespawning) {
        if (this.player.health < this.player.maxHealth || this.player.stamina < this.player.maxStamina) {
          this.player.heal(delta * 5.0, false);
          this.player.restoreStamina(delta * 18.0, false);
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

    const onCanvasClick = () => {
      if (!('ontouchstart' in window) && !this.isPointerLocked) {
        canvas.requestPointerLock();
      }
    };
    canvas.addEventListener('click', onCanvasClick);
    this.cleanupListeners.push(() => canvas.removeEventListener('click', onCanvasClick));

    const onPointerLockChange = () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);
    this.cleanupListeners.push(() => document.removeEventListener('pointerlockchange', onPointerLockChange));

    const onMouseMove = (e: MouseEvent) => {
      if (this.isPointerLocked && !this.isPaused) {
        this.player.applyLookDelta(e.movementX, e.movementY, false);
      }
    };
    document.addEventListener('mousemove', onMouseMove);
    this.cleanupListeners.push(() => document.removeEventListener('mousemove', onMouseMove));

    const onKeyDown = (e: KeyboardEvent) => {
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
    };
    window.addEventListener('keydown', onKeyDown);
    this.cleanupListeners.push(() => window.removeEventListener('keydown', onKeyDown));

    const onKeyUp = (e: KeyboardEvent) => {
      this.activeKeys.delete(e.code);
      if (e.code === 'KeyW' || e.code === 'KeyS' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        this.player.input.moveForward = 0;
      }
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        this.player.input.moveRight = 0;
      }
    };
    window.addEventListener('keyup', onKeyUp);
    this.cleanupListeners.push(() => window.removeEventListener('keyup', onKeyUp));

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        this.interactions.showToast('TOOL ACTION', 'Used equipped item.');
      } else if (e.button === 2) {
        this.interactions.showToast('ALTERNATE ACTION', 'Secondary tool mode engaged.');
      }
    };
    canvas.addEventListener('mousedown', onMouseDown);
    this.cleanupListeners.push(() => canvas.removeEventListener('mousedown', onMouseDown));

    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    canvas.addEventListener('contextmenu', onContextMenu);
    this.cleanupListeners.push(() => canvas.removeEventListener('contextmenu', onContextMenu));
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
    this.cleanupListeners.push(() => window.removeEventListener('resize', onResize));

    const onOrientation = () => setTimeout(onResize, 200);
    window.addEventListener('orientationchange', onOrientation);
    this.cleanupListeners.push(() => window.removeEventListener('orientationchange', onOrientation));
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
    
    // Clean up all registered window, document, and canvas listeners
    this.cleanupListeners.forEach((cleanup) => {
      try {
        cleanup();
      } catch {
        // Ignored
      }
    });
    this.cleanupListeners = [];

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

