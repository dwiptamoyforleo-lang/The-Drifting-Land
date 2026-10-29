/**
 * Core Game Engine Loop Orchestrator for The Drifting Land.
 * Integrates:
 * - Three.js WebGL rendering with Software-GL guard
 * - CameraManager with smooth orbit and screen shake
 * - PlayerController physics & animations
 * - WorldGenerator (The Verdant Reach)
 * - EntityManager (NPCs, Wisps, Harvestable nodes)
 * - DayNightSystem (20-min cycle, 13m day / 7m night, sunrise/sunset countdown)
 * - WeatherSystem (Clear, Mist, Wind, Rain, Storms, Dimensional Disturbance, Red Eclipse)
 * - CrimsonWardenEncounter (Shattered Rift Boss with attack telegraphs, 2 phases, unique loot)
 * - InventorySystem, QuestSystem, CheckpointSystem
 * - InputManager and UI reactivity
 */

import * as THREE from 'three';
import {
  GameMode,
  SaveData,
  ShardRelic,
  CameraMode,
  CrimsonWardenState,
  WeatherType,
} from '../types/game';
import { RenderPipeline, RendererBundle } from './renderer';
import { WorldGenerator, WorldBundle } from './world';
import { PlayerController } from './player';
import { CameraManager, ObserverTarget } from './cameraManager';
import { DayNightSystem } from './dayNight';
import { InputManager } from './input';
import { EntityManager, RuntimeEntity } from '../systems/entityManager';
import { InventorySystem } from '../systems/inventorySystem';
import { QuestSystem } from '../systems/questSystem';
import { AchievementSystem } from '../systems/achievementSystem';
import { WeatherSystem } from '../systems/weatherSystem';
import { CrimsonWardenEncounter } from '../systems/crimsonWarden';
import { CheckpointSystem } from '../systems/checkpointSystem';
import { NotificationSystem } from '../systems/notificationSystem';
import { AudioService } from '../services/audio';
import { StorageService } from '../services/storage';
import { StructuresManager } from './structures';
import { InteractionSystem } from '../systems/interactionSystem';
import { FloraManager, FloraNode } from './floraManager';
import { WildlifeManager, CreatureInstance } from '../systems/wildlifeManager';
import { getContextualDialogue, DialogueContext } from '../data/npcDialogue';

export interface EngineUiCallbacks {
  onStatsUpdate: (stats: {
    health: number;
    maxHealth: number;
    stamina: number;
    maxStamina: number;
    level: number;
    experience: number;
    experienceToNext: number;
  }) => void;
  onTimeUpdate: (time: {
    phase: string;
    cycleTime: number;
    dayCount: number;
    isRedMoon: boolean;
    clockTime: string;
    nextTransitionLabel: string;
    nextTransitionSeconds: number;
  }) => void;
  onRelicUpdate: (shards: ShardRelic[], collectedCount: number, totalCount: number) => void;
  onInteractionAvailable: (prompt: string | null) => void;
  onBeaconStateChange: (activated: boolean) => void;
  onNpcDialogue?: (dialogue: {
    name: string;
    roleTitle?: string;
    role?: string;
    lines: string[];
    tradeCatalogId?: string;
  } | null) => void;
  onOpenTradeModal?: (catalogId: string) => void;
  onToggleInventoryModal?: () => void;
  onToggleQuestsModal?: () => void;
  onToggleMapModal?: () => void;
  onCameraModeChange?: (mode: CameraMode, label: string) => void;
  onWeatherUpdate?: (weather: string) => void;
  onBossStateUpdate?: (boss: CrimsonWardenState | null) => void;
  onFpsUpdate?: (fps: number) => void;
  onDiscoveriesUpdate?: (discoveries: string[]) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private bundle: RendererBundle | null = null;
  private world: WorldBundle | null = null;
  private player: PlayerController | null = null;
  private cameraManager: CameraManager | null = null;
  public dayNight: DayNightSystem | null = null;
  public entities: EntityManager | null = null;
  public structures: StructuresManager | null = null;
  public interactions: InteractionSystem | null = null;
  public flora: FloraManager | null = null;
  public wildlife: WildlifeManager | null = null;
  private nearbyFlora: { node: FloraNode; prompt: string; canHarvest: boolean } | null = null;
  private nearbyCreature: CreatureInstance | null = null;
  public inventory: InventorySystem;
  public quests: QuestSystem;
  public achievements: AchievementSystem;
  public weather: WeatherSystem;
  public crimsonWarden: CrimsonWardenEncounter | null = null;
  public checkpoints: CheckpointSystem;
  public input: InputManager;
  private uiCallbacks: EngineUiCallbacks;

  private mode: GameMode = 'TITLE';
  private isRunning: boolean = false;
  private frameId: number = 0;
  private clock: THREE.Clock = new THREE.Clock();
  private totalSimulationTime: number = 0;

  // Diagnostics & FPS
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  // Active interaction targets
  private currentInteractionPrompt: string | null = null;
  private nearbyShard: ShardRelic | null = null;
  private isNearBeacon: boolean = false;
  private nearbyEntity: RuntimeEntity | null = null;
  private isNearBoss: boolean = false;

  // Save state
  private activeSave: SaveData;

  constructor(container: HTMLElement, uiCallbacks: EngineUiCallbacks, initialSave: SaveData) {
    this.container = container;
    this.uiCallbacks = uiCallbacks;
    this.activeSave = initialSave;

    // 1. Initialize Subsystems
    this.inventory = new InventorySystem(initialSave.inventory, initialSave.wallet);

    this.achievements = new AchievementSystem(
      this.inventory,
      initialSave.achievements || {},
      (xp) => this.addExperience(xp)
    );
    this.quests = new QuestSystem(
      this.inventory,
      initialSave.quests,
      initialSave.claimedQuestRewards || [],
      initialSave.trackedQuestId || 'quest_main_1_clearing',
      initialSave.explorationRank || 1,
      initialSave.explorationXp || 0,
      (xp) => this.addExperience(xp)
    );

    this.weather = new WeatherSystem(
      initialSave.currentWeather || 'CLEAR',
      initialSave.settings.particleLimit || 600
    );

    this.checkpoints = new CheckpointSystem(
      initialSave.activatedCheckpoints || ['cp_beacon_plaza'],
      initialSave.activeCheckpointId || 'cp_beacon_plaza'
    );

    // 2. Initialize Input with keybinds
    this.input = new InputManager(
      () => this.handlePauseToggle(),
      () => this.handleInteract(),
      () => this.uiCallbacks.onToggleInventoryModal?.(),
      () => this.uiCallbacks.onToggleQuestsModal?.(),
      () => this.uiCallbacks.onToggleMapModal?.(),
      () => this.cycleCameraMode()
    );
  }

  /**
   * Complete initialization sequence
   */
  async init(): Promise<boolean> {
    try {
      // 1. Check WebGL support
      if (!RenderPipeline.isWebGLAvailable()) {
        throw new Error('WebGL is not supported by your browser or hardware.');
      }

      // 2. Initialize Three.js pipeline
      this.bundle = RenderPipeline.init(this.container, this.activeSave.settings.shadows);

      // 3. Build The Verdant Reach world
      const maxAnisotropy = this.bundle.isSoftwareGl ? 1 : this.bundle.renderer.capabilities.getMaxAnisotropy();
      this.world = WorldGenerator.generate(maxAnisotropy, this.bundle.isSoftwareGl);
      this.bundle.scene.add(this.world.group);

      // 4. Build Player Explorer
      this.player = new PlayerController(this.activeSave.playerPosition, this.bundle.isSoftwareGl);
      this.player.stats = { ...this.activeSave.playerStats };
      this.bundle.scene.add(this.player.group);

      // 5. Build Camera Manager with settings
      this.cameraManager = new CameraManager(
        this.bundle.camera,
        this.activeSave.settings.cameraMode || 'THIRD_PERSON',
        this.activeSave.settings.cameraDistance || 7.5
      );
      this.cameraManager.sensitivity = this.activeSave.settings.cameraSensitivity || 1.0;

      // 6. Build World Entities (NPCs, Wisps, Harvestable nodes)
      this.entities = new EntityManager(this.bundle.scene, this.bundle.isSoftwareGl);
      this.entities.populate(this.world.getTerrainHeight);

      // 6B. Build World Structures (Beacons, Ruined Towers, Hidden Chambers, Settlements, Camps, Bridges, Gates, Deposits)
      this.structures = new StructuresManager(this.bundle.scene, this.bundle.isSoftwareGl);
      this.structures.buildAll(this.world.getTerrainHeight, this.activeSave);

      // 10. Procedural Flora & Gathering Nodes (Prompt 7)
      this.flora = new FloraManager(this.bundle.scene, this.bundle.isSoftwareGl);
      this.flora.populate(
        (x, z) => this.world!.getTerrainHeight(x, z),
        this.inventory,
        this.activeSave
      );

      // 11. Wildlife Simulation (Prompt 9: 8 original species)
      this.wildlife = new WildlifeManager(
        this.bundle.scene,
        this.world.getTerrainHeight,
        this.inventory,
        this.bundle.isSoftwareGl,
        (damage) => {
          if (!this.player) return;
          this.player.stats.health = Math.max(0, this.player.stats.health - damage);
          this.cameraManager?.addShake(0.4);
          if (this.player.stats.health <= 0) {
            this.handlePlayerDefeat();
          }
        }
      );
      this.wildlife.populate();

      // Equipment passive perks listener
      this.inventory.subscribe((_slots, _wallet, _hotbar, _equipped) => {
        this.applyEquipmentBonuses();
      });

      // Hook crafting triggers to quests & achievements
      this.inventory.onRecipeCrafted = (_recipeId, outputItemId) => {
        this.quests.reportProgress('CRAFT', outputItemId, 1);
        this.achievements.unlock('ach_artisan');
        this.persistSave();
      };

      // Hook exploration rank changes
      this.quests.onRankChanged = (_rank, _perk) => {
        this.applyEquipmentBonuses();
        this.persistSave();
      };

      // Evaluate milestone achievements & starting clearing quest
      this.achievements.evaluateMilestones(this.activeSave);
      this.quests.reportProgress('EXPLORE_AREA', 'clearing_spawn', 1);
      this.applyEquipmentBonuses();

      this.interactions = new InteractionSystem(
        this.activeSave,
        this.inventory,
        this.quests,
        this.checkpoints,
        this.structures
      );
      this.interactions.onPromptChange = (prompt) => {
        this.currentInteractionPrompt = prompt;
        this.uiCallbacks.onInteractionAvailable(prompt);
      };
      this.interactions.onCameraShake = (intensity) => {
        this.cameraManager?.addShake(intensity);
      };
      this.interactions.onSaveRequested = () => {
        this.persistSave();
        this.uiCallbacks.onDiscoveriesUpdate?.(this.activeSave.discoveries);
      };
      this.interactions.onTeleportRequested = (x, y, z) => {
        if (this.player) {
          this.player.group.position.set(x, y, z);
          this.player.velocity.set(0, 0, 0);
        }
      };

      // 7. Initialize Day / Night system (20-min cycle: 13m day, 7m night)
      this.dayNight = new DayNightSystem(
        this.bundle.scene,
        this.activeSave.worldTime.cycleTime,
        this.activeSave.worldTime.dayCount,
        this.activeSave.redMoon,
        this.activeSave.settings.dayDurationMinutes || 20
      );

      // Hook Red Moon triggers
      this.dayNight.onRedMoonStart = () => {
        this.quests.startQuest('quest_blood_moon_eclipse');
        this.weather.setWeather('RED_ECLIPSE');
        this.cameraManager?.addShake(0.7);
        this.persistSave();
      };

      this.dayNight.onRedMoonEnd = () => {
        this.weather.setWeather('CLEAR');
        this.persistSave();
      };

      // 8. Initialize Weather particles
      this.weather.initScene(this.bundle.scene);

      // 9. Initialize Crimson Warden Boss Encounter
      this.crimsonWarden = new CrimsonWardenEncounter(
        this.bundle.scene,
        this.world.getTerrainHeight,
        {
          onBossStateChange: (bossState) => {
            this.uiCallbacks.onBossStateUpdate?.(bossState);
          },
          onPlayerDamage: (damage) => {
            if (!this.player) return;
            this.player.stats.health = Math.max(0, this.player.stats.health - damage);
            this.cameraManager?.addShake(0.5);
            if (this.player.stats.health <= 0) {
              this.handlePlayerDefeat();
            }
          },
          onBossDefeated: () => {
            this.handleBossVictory();
          },
        },
        this.activeSave.redMoon.wardenDefeated,
        this.bundle.isSoftwareGl
      );

      // 10. Restore collected relics state from save
      this.restoreRelicsState();

      // 11. Initialize audio system
      AudioService.init();
      AudioService.setVolume(this.activeSave.settings.masterVolume);
      AudioService.setMuted(!this.activeSave.settings.soundEnabled);

      // Handle window resizing
      window.addEventListener('resize', this.handleResize);

      // Start render loop
      this.isRunning = true;
      this.clock.start();
      this.startLoop();

      return true;
    } catch (err) {
      console.error('Game initialization failed:', err);
      throw err;
    }
  }

  private handlePlayerDefeat(): void {
    NotificationSystem.notify('Expedition Knockout', 'You were overwhelmed by the void rift. Returning to beacon...', 'danger', 6000);
    if (!this.player || !this.world) return;

    // Respawn at active checkpoint
    const cp = this.checkpoints.getActiveCheckpoint();
    const spawnPos = cp?.position || [0, 4.5, 0];
    this.player.group.position.set(spawnPos[0], spawnPos[1], spawnPos[2]);
    this.player.stats.health = this.player.stats.maxHealth;
    this.player.stats.stamina = this.player.stats.maxStamina;
  }

  private handleBossVictory(): void {
    if (!this.activeSave.redMoon.wardenRewardsClaimed) {
      this.activeSave.redMoon.wardenRewardsClaimed = true;
      this.activeSave.redMoon.wardenDefeated = true;

      // Unique rewards (one-time claim)
      this.inventory.addItem('crimson_heart_relic', 1, false);
      this.inventory.addItem('wardens_blood_amulet', 1, false);
      this.inventory.addCoins(150);
      this.addExperience(250);

      // Quest completion progress
      this.quests.reportProgress('DEFEAT_BOSS', 'crimson_warden', 1);
      this.cameraManager?.addShake(0.8);
      this.persistSave();
    }
  }

  private restoreRelicsState(): void {
    if (!this.world) return;
    const collectedIds = new Set(this.activeSave.collectedShardIds);

    this.world.shards.forEach((entry, id) => {
      if (collectedIds.has(id)) {
        entry.data.collected = true;
        entry.mesh.visible = false;
      }
    });

    if (this.activeSave.beaconStates['verdant_monolith_beacon']) {
      this.world.beacon.data.activated = true;
      (this.world.beacon.beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.85;
      this.uiCallbacks.onBeaconStateChange(true);
    }

    this.notifyRelicUpdate();
  }

  private notifyRelicUpdate(): void {
    if (!this.world) return;
    const shards: ShardRelic[] = [];
    let collectedCount = 0;
    this.world.shards.forEach((s) => {
      shards.push(s.data);
      if (s.data.collected) collectedCount++;
    });
    this.uiCallbacks.onRelicUpdate(shards, collectedCount, shards.length);
  }

  public addExperience(amount: number): void {
    if (!this.player) return;
    this.player.stats.experience += amount;
    while (this.player.stats.experience >= this.player.stats.experienceToNext) {
      this.player.stats.experience -= this.player.stats.experienceToNext;
      this.player.stats.level += 1;
      this.player.stats.maxHealth += 15;
      this.player.stats.health = this.player.stats.maxHealth;
      this.player.stats.maxStamina += 10;
      this.player.stats.stamina = this.player.stats.maxStamina;
      this.player.stats.experienceToNext = Math.round(this.player.stats.experienceToNext * 1.5);

      NotificationSystem.notify('Expedition Level Up!', `Level ${this.player.stats.level} reached!`, 'discovery', 6000);
      AudioService.playRelicCollect();
    }
  }

  /**
   * Main Render Loop with Software-WebGL Guard (Three.js Skill compliant)
   */
  private startLoop = (): void => {
    if (!this.isRunning || !this.bundle) return;

    const tick = () => {
      if (!this.isRunning || !this.bundle) return;

      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);

      this.update(dt);
      this.bundle.renderer.render(this.bundle.scene, this.bundle.camera);

      // FPS counter
      this.frameCount++;
      this.fpsTimer += dt;
      if (this.fpsTimer >= 1.0) {
        this.uiCallbacks.onFpsUpdate?.(Math.round(this.frameCount / this.fpsTimer));
        this.frameCount = 0;
        this.fpsTimer = 0;
      }

      if (this.bundle.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.bundle.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  };

  /**
   * Software WebGL frame pacing guard
   */
  private afterDraw(cb: () => void): void {
    if (!this.bundle) return;
    const gl = this.bundle.renderer.getContext() as WebGL2RenderingContext;
    if (!gl) {
      this.frameId = window.setTimeout(cb, 33);
      return;
    }

    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    gl.flush();

    const poll = () => {
      if (!this.isRunning) return;
      const state = sync && gl.getSyncParameter ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.ALREADY_SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 60);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  /**
   * Frame simulation update
   */
  private update(dt: number): void {
    if (!this.bundle || !this.world || !this.player || !this.dayNight || !this.cameraManager) return;

    this.totalSimulationTime += dt;

    // 1. Day/Night progression (20-minute cycle with exact countdown)
    this.dayNight.update(dt);
      if (this.flora) {
        const isNight = this.dayNight.state.phaseName === 'NIGHT' || this.dayNight.state.phaseName === 'RED_MOON';
        const isRedMoon = this.dayNight.state.isRedMoon;
        this.flora.update(dt, this.totalSimulationTime, isNight, isRedMoon);
      }
    this.uiCallbacks.onTimeUpdate({
      phase: this.dayNight.state.phaseName,
      cycleTime: this.dayNight.state.cycleTime,
      dayCount: this.dayNight.state.dayCount,
      isRedMoon: this.dayNight.state.isRedMoon,
      clockTime: this.dayNight.state.clockTime,
      nextTransitionLabel: this.dayNight.state.nextTransitionLabel,
      nextTransitionSeconds: this.dayNight.state.nextTransitionSeconds,
    });

    // 2. Weather simulation with particles and environmental fog
    this.weather.update(
      dt,
      this.bundle.scene,
      this.dayNight.state.isRedMoon,
      this.player.group.position
    );
    this.uiCallbacks.onWeatherUpdate?.(this.weather.state.currentWeather);

    // Apply weather modifiers to player stamina regeneration
    this.player.staminaRegenModifier = this.weather.staminaRegenModifier;

    // 3. World animation (beacon rings, hovering crystals, flowing river)
    this.world.update(dt);

    // 3B. Structures animation (astrolabe rings, gates, crystals, dimensional gateway vortex)
    this.structures?.update(dt, this.totalSimulationTime);

    // 4. Entity updates (NPCs, schedules, trading creatures, wisps)
    this.entities?.update(dt, this.totalSimulationTime, this.dayNight.state, this.activeSave.discoveries);

    // 4B. Wildlife simulation (8 original species)
    this.wildlife?.update(dt, this.totalSimulationTime, this.player.group.position, {
      isRedMoon: Boolean(this.dayNight.state.isRedMoon),
    });

    // 5. Crimson Warden Boss simulation
    if (this.crimsonWarden) {
      this.crimsonWarden.update(
        dt,
        this.totalSimulationTime,
        this.player.group.position,
        this.dayNight.state.isRedMoon,
        this.world.getTerrainHeight
      );
    }

    if (this.mode === 'TITLE') {
      // Cinematic camera orbit around The Verdant Reach & Ancient Beacon
      const t = Date.now() * 0.0002;
      const camRadius = 38;
      this.bundle.camera.position.x = Math.sin(t) * camRadius;
      this.bundle.camera.position.z = Math.cos(t) * camRadius;
      this.bundle.camera.position.y = 16 + Math.sin(t * 1.5) * 4;
      this.bundle.camera.lookAt(0, 5, 0);
    } else if (this.mode === 'PLAYING') {
      // 1. Player physics, colliders & movement
      const activeCp = this.checkpoints.getActiveCheckpoint();
      const colliders = this.structures ? this.structures.colliders : [];

      this.player.update(
        dt,
        this.input.state,
        this.world.getTerrainHeight,
        this.bundle.camera,
        colliders,
        activeCp?.position,
        () => this.handlePlayerDefeat()
      );

      // 2. Camera Manager update with Observer Perspective support
      const observers: ObserverTarget[] = [
        { name: 'Surveyor Kaelen', position: new THREE.Vector3(6, this.world.getTerrainHeight(6, 5), 5), eyeHeight: 1.4 },
        { name: 'Ancient Monolith', position: new THREE.Vector3(0, this.world.getTerrainHeight(0, 0), 0), eyeHeight: 5.4 },
        { name: 'Luminescent Wisp', position: new THREE.Vector3(14, this.world.getTerrainHeight(14, -8) + 1.8, -8), eyeHeight: 0.5 },
      ];

      // If boss is active, it can serve as a dramatic observer!
      if (this.crimsonWarden?.state.active) {
        observers.unshift({
          name: 'Crimson Warden',
          position: this.crimsonWarden.getBossPosition(),
          eyeHeight: 3.8,
        });
      }

      this.cameraManager.update(
        dt,
        this.player.group.position,
        this.player.facingAngle,
        this.input.state.lookDeltaX,
        this.input.state.lookDeltaY,
        this.world.getTerrainHeight,
        this.player.group,
        observers
      );

      // Reset look deltas after consumption
      this.input.state.lookDeltaX = 0;
      this.input.state.lookDeltaY = 0;

      // 3. UI Stats update
      this.uiCallbacks.onStatsUpdate({
        health: Math.round(this.player.stats.health),
        maxHealth: this.player.stats.maxHealth,
        stamina: Math.round(this.player.stats.stamina),
        maxStamina: this.player.stats.maxStamina,
        level: this.player.stats.level,
        experience: this.player.stats.experience,
        experienceToNext: this.player.stats.experienceToNext,
      });

      // 4. Check proximity interactions and checkpoints
      this.checkInteractions();
    }
  }

  /**
   * Check for nearby relics, beacon, entities, boss, and checkpoints
   */
  private checkInteractions(): void {
    if (!this.world || !this.player) return;

    const playerPos = this.player.group.position;
    let foundPrompt: string | null = null;
    this.nearbyShard = null;
    this.isNearBeacon = false;
    this.nearbyEntity = null;
    this.isNearBoss = false;

    // 1. Check Unified Structure Interactions (Beacons, Ruined Towers, Chambers, Settlements, Camps, Gates, Deposits, Gateways)
    if (this.interactions) {
      const structPrompt = this.interactions.update(playerPos);
      if (structPrompt) {
        foundPrompt = structPrompt.actionText;
      }
    }

    // 2. Check Waypoint Checkpoints
    this.checkpoints.checkProximity(
      [playerPos.x, playerPos.y, playerPos.z],
      (discoveredId) => {
        this.quests.reportProgress('DISCOVER', discoveredId, 1);
        if (!this.activeSave.discoveries.includes(discoveredId)) {
          this.activeSave.discoveries.push(discoveredId);
        }
      }
    );

    // 3. Check Crimson Warden Combat Proximity
    if (!foundPrompt && this.crimsonWarden?.state.active) {
      const distToBoss = playerPos.distanceTo(this.crimsonWarden.getBossPosition());
      if (distToBoss < 6.5) {
        this.isNearBoss = true;
        foundPrompt = 'Press [E] or Action to Strike Crimson Warden!';
      }
    }

        // Check Flora gathering nodes
    this.nearbyFlora = null;
    if (!foundPrompt && this.flora && this.dayNight) {
      const isNight = this.dayNight ? (this.dayNight.state.phaseName === 'NIGHT' || this.dayNight.state.phaseName === 'RED_MOON') : false;
      const isRedMoon = this.dayNight ? this.dayNight.state.isRedMoon : false;
      const floraTarget = this.flora.getNearbyHarvestable(playerPos, isNight, isRedMoon, this.weather.state.currentWeather);
      if (floraTarget) {
        this.nearbyFlora = floraTarget;
        foundPrompt = floraTarget.prompt;
      }
    }
    // 4. Check Shards
    if (!foundPrompt) {
      this.world.shards.forEach((entry) => {
        if (entry.data.collected) return;
        const dist = playerPos.distanceTo(entry.mesh.position);
        if (dist < 3.2) {
          this.nearbyShard = entry.data;
          foundPrompt = `Press [E] or Tap to collect ${entry.data.name}`;
        }
      });
    }

    // 5. Check World Entities (NPCs, resource nodes, wisps, bloodroot orchids)
    if (!foundPrompt && this.entities) {
      const nearest = this.entities.getNearestInteractable(playerPos, 3.2);
      if (nearest) {
        this.nearbyEntity = nearest;
        foundPrompt = nearest.def.interactPrompt || `Press [E] to interact with ${nearest.def.name}`;
      }
    }

    // 5B. Check Wildlife (Cloudgrazer, Emberfox, Glowhare, Mossback, etc.)
    this.nearbyCreature = null;
    if (!foundPrompt && this.wildlife) {
      const creature = this.wildlife.getNearbyCreature(playerPos, 3.2);
      if (creature && !creature.isHarvested) {
        this.nearbyCreature = creature;
        foundPrompt = creature.harvestPrompt || `Press [E] to interact with ${creature.name}`;
      }
    }

    // Storyline triggers: Clearing & Beacon Proximity
    const beaconDist = Math.hypot(playerPos.x, playerPos.z);
    if (beaconDist < 25) {
      this.quests.reportProgress('EXPLORE_AREA', 'clearing_spawn', 1);
    }
    if (beaconDist < 16) {
      this.quests.reportProgress('DISCOVER', 'disc_beacon_plaza', 1);
      if (!this.activeSave.discoveries.includes('disc_beacon_plaza')) {
        this.activeSave.discoveries.push('disc_beacon_plaza');
      }
    }

    // Storyline triggers: Gateway & Disturbance Proximity
    const distToGateway = Math.hypot(playerPos.x - (-50), playerPos.z - (-20));
    if (distToGateway < 14) {
      this.quests.reportProgress('LOCATE_DISTURBANCE', 'disc_void_rift_island', 1);
      this.quests.reportProgress('DISCOVER_PORTAL', 'disc_dimensional_gateway', 1);
      if (!this.activeSave.discoveries.includes('disc_dimensional_gateway')) {
        this.activeSave.discoveries.push('disc_dimensional_gateway');
      }
      if (!this.activeSave.discoveries.includes('disc_void_rift_island')) {
        this.activeSave.discoveries.push('disc_void_rift_island');
      }
    }

    // 6. Check Ancient Beacon
    if (!foundPrompt && beaconDist < 6.5) {
      this.isNearBeacon = true;
      if (!this.world.beacon.data.activated) {
        const collectedCount = this.activeSave.collectedShardIds.length;
        const q3Done = this.quests.getJournalSnapshot().completed.some((q) => q.id === 'quest_main_3_repair');
        if (q3Done || collectedCount >= this.world.beacon.data.requiredShards) {
          foundPrompt = 'Press [E] or Action to Awaken Ancient Monolith Beacon!';
        } else {
          foundPrompt = `Beacon Dais Fractured — Repair Materials or Shards Needed (${collectedCount}/${this.world.beacon.data.requiredShards})`;
        }
      } else {
        foundPrompt = 'The Ancient Monolith Beacon is glowing with celestial resonance';
      }
    }

    if (foundPrompt !== this.currentInteractionPrompt) {
      this.currentInteractionPrompt = foundPrompt;
      this.uiCallbacks.onInteractionAvailable(foundPrompt);
    }
  }

  /**
   * Handle interact key [E] or touch button
   */
  /**
   * Sync active gear perks to player controller
   */
  public applyEquipmentBonuses(): void {
    if (!this.player) return;
    const bonuses = this.inventory.getEquipBonuses();
    this.player.stats.speed = 8.5 + (bonuses.speedBonus || 0);
    this.player.stats.maxHealth = 100 + (bonuses.healthBonus || 0);
    this.player.stats.maxStamina = 100 + (bonuses.staminaBonus || 0);
    this.player.stats.health = Math.min(this.player.stats.health, this.player.stats.maxHealth);
    this.player.stats.stamina = Math.min(this.player.stats.stamina, this.player.stats.maxStamina);

    const expPerks = this.quests.getExplorationPerks();
    this.player.sprintDrainModifier = expPerks.staminaEfficiency ? 0.85 : 1.0;
    this.player.staminaRegenModifier = 1.0 + expPerks.regenBonus;

    const lanternLight = (this.player as any).lanternLight as THREE.PointLight | undefined;
    if (lanternLight) {
      lanternLight.distance = 8 + (bonuses.lightRadius || 0);
      lanternLight.intensity = bonuses.lightRadius ? 1.4 : 0.9;
    }
  }

  public handleInteract(): void {
    if (this.mode !== 'PLAYING' || !this.world || !this.player) return;

    // 1. Structure interaction via InteractionSystem
    if (this.interactions && this.interactions.executeInteraction()) {
      return;
    }

    // 2. Attack Crimson Warden if in combat range
    if (this.isNearBoss && this.crimsonWarden?.state.active) {
      const struck = this.crimsonWarden.playerAttack(this.player.group.position);
      if (struck) {
        this.cameraManager?.addShake(0.35);
      }
      return;
    }

        // Check Flora harvesting
    if (this.nearbyFlora && this.nearbyFlora.canHarvest && this.flora) {
      const node = this.nearbyFlora.node;
      const harvested = this.flora.harvestNode(node.id, this.inventory, this.activeSave);
      if (harvested) {
        this.cameraManager?.addShake(0.2);
        this.quests.reportProgress('COLLECT', node.yieldItemId, 1);
        const discId = `flora_${node.plantType}`;
        if (!this.activeSave.discoveries.includes(discId)) {
          this.activeSave.discoveries.push(discId);
          this.quests.reportProgress('DISCOVER', discId, 1);
        }
        this.persistSave();
        return;
      }
    }
    // 2. Collect Shard
    if (this.nearbyShard && !this.nearbyShard.collected) {
      const entry = this.world.shards.get(this.nearbyShard.id);
      if (entry) {
        entry.data.collected = true;
        entry.mesh.visible = false;
        if (!this.activeSave.collectedShardIds.includes(this.nearbyShard.id)) {
          this.activeSave.collectedShardIds.push(this.nearbyShard.id);
        }

        // Add to inventory
        this.inventory.addItem(this.nearbyShard.id, 1, false);

        // Update quest progress
        this.quests.reportProgress('COLLECT', this.nearbyShard.id, 1);

        // Audio & Camera Shake feedback
        AudioService.playRelicCollect();
        this.cameraManager?.addShake(0.35);

        this.notifyRelicUpdate();
        this.persistSave();
      }
      return;
    }

    // 3. Interact with Entity (NPC Contextual Dialogue or Harvest)
    if (this.nearbyEntity) {
      const def = this.nearbyEntity.def;
      if (def.type === 'NPC' || def.type === 'TRADER') {
        const ctx: DialogueContext = {
          timePhase: this.dayNight?.state.phaseName || 'NOON',
          isRedMoon: Boolean(this.dayNight?.state.isRedMoon),
          weatherName: this.weather.state.currentWeather,
          explorationRank: this.quests.explorationRank,
          beaconActivated: Boolean(this.activeSave.beaconStates['verdant_monolith_beacon']),
          discoveries: this.activeSave.discoveries,
          activeQuestId: this.quests.getTrackedQuestId(),
          completedQuestIds: this.quests.getJournalSnapshot().completed.map((q) => q.id),
        };
        const node = getContextualDialogue(def.id, ctx);
        this.uiCallbacks.onNpcDialogue?.({
          name: node.speakerName,
          roleTitle: node.roleTitle,
          role: node.role,
          lines: node.lines,
          tradeCatalogId: node.tradeCatalogId,
        });
        AudioService.playUiClick();
        this.quests.reportProgress('INTERACT_NPC', def.id, 1);
        if (!this.activeSave.discoveredNpcs) this.activeSave.discoveredNpcs = [];
        if (!this.activeSave.discoveredNpcs.includes(def.id)) {
          this.activeSave.discoveredNpcs.push(def.id);
        }
        return;
      }

      if (def.type === 'COLLECTIBLE' || def.type === 'CREATURE') {
        const harvested = this.entities?.harvestEntity(def.id);
        if (harvested && harvested.drops) {
          harvested.drops.forEach((drop) => {
            if (Math.random() <= drop.chance) {
              const qty = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min;
              this.inventory.addItem(drop.itemId, qty);
              this.quests.reportProgress('COLLECT', drop.itemId, qty);
            }
          });
          AudioService.playUiClick();
        }
        return;
      }
    }

    // 3B. Interact with Wildlife (Gather wool, pelts, feathers, scutes, etc.)
    if (this.nearbyCreature && this.wildlife) {
      const harvested = this.wildlife.harvest(this.nearbyCreature);
      if (harvested) {
        this.quests.reportProgress('COLLECT', this.nearbyCreature.harvestItemId, 1);
        this.persistSave();
        return;
      }
    }

    // 4. Awaken Beacon
    if (this.isNearBeacon && !this.world.beacon.data.activated) {
      const collectedCount = this.activeSave.collectedShardIds.length;
      const q3Done = this.quests.getJournalSnapshot().completed.some((q) => q.id === 'quest_main_3_repair');
      if (q3Done || collectedCount >= this.world.beacon.data.requiredShards) {
        this.world.beacon.data.activated = true;
        this.activeSave.beaconStates['verdant_monolith_beacon'] = true;

        // Quest progress
        this.quests.reportProgress('ACTIVATE_BEACON', 'verdant_monolith_beacon', 1);
        this.achievements.unlock('ach_beacon_ignited');
        this.quests.addExplorationXp(120);

        // Heavy audio & screen shake feedback
        AudioService.playBeaconActivate();
        this.cameraManager?.addShake(0.85);

        this.uiCallbacks.onBeaconStateChange(true);
        NotificationSystem.notify(
          'Monolith Beacon Awakened',
          'A radiant pillar of aether pierces the skyward clouds!',
          'discovery',
          7000
        );
        this.persistSave();
      }
    }
  }

  /**
   * Consume item from inventory
   */
  public useItem(itemId: string): boolean {
    if (!this.player) return false;
    const itemDef = this.inventory.getSlots().find((s) => s.item.id === itemId)?.item;
    if (!itemDef || !itemDef.statsEffect) return false;

    if (this.inventory.removeItem(itemId, 1)) {
      if (itemDef.statsEffect.heal) {
        this.player.stats.health = Math.min(
          this.player.stats.maxHealth,
          this.player.stats.health + itemDef.statsEffect.heal
        );
      }
      if (itemDef.statsEffect.stamina) {
        this.player.stats.stamina = Math.min(
          this.player.stats.maxStamina,
          this.player.stats.stamina + itemDef.statsEffect.stamina
        );
      }
      if (itemDef.statsEffect.maxHealthBoost) {
        this.player.stats.maxHealth += itemDef.statsEffect.maxHealthBoost;
        this.player.stats.health = this.player.stats.maxHealth;
      }
      if (itemDef.statsEffect.maxStaminaBoost) {
        this.player.stats.maxStamina += itemDef.statsEffect.maxStaminaBoost;
        this.player.stats.stamina = this.player.stats.maxStamina;
      }
      AudioService.playUiClick();
      NotificationSystem.notify('Used Item', itemDef.name, 'item');
      return true;
    }
    return false;
  }

  /**
   * Save current game progress
   */
    /**
   * Fast travel between attuned checkpoints
   */
  public fastTravel(checkpointId: string): boolean {
    const cp = this.checkpoints.getCheckpoints().find((c) => c.id === checkpointId && c.activated);
    if (!cp || !this.player) return false;
    this.player.group.position.set(cp.position[0], cp.position[1] + 0.8, cp.position[2]);
    this.player.velocity.set(0, 0, 0);
    this.cameraManager?.addShake(0.3);
    AudioService.playRelicCollect();
    NotificationSystem.notify('Fast Travel Complete', `Attuned to ${cp.name}`, 'info', 4000);
    this.persistSave();
    return true;
  }

  public getTrackedQuest(): { def: any; progress: any; activeObjectiveText: string } | null {
    const active = this.quests.getTrackedQuest();
    if (!active) return null;
    const firstObj = active.def.objectives[0];
    const current = active.progress.objectives[firstObj.id] || 0;
    const text = `${firstObj.description} (${current}/${firstObj.targetCount})`;
    return {
      def: active.def,
      progress: active.progress,
      activeObjectiveText: text,
    };
  }

  public persistSave(): void {
    if (!this.player || !this.dayNight) return;
    this.activeSave.playerPosition = [
      this.player.group.position.x,
      this.player.group.position.y,
      this.player.group.position.z,
    ];
    this.activeSave.playerRotationY = this.player.facingAngle;
    this.activeSave.playerStats = { ...this.player.stats };
    this.activeSave.wallet = { ...this.inventory.wallet };
    this.activeSave.hotbarSlots = [...this.inventory.hotbar];
    this.activeSave.equippedGear = { ...this.inventory.equipped };
    if (this.flora) {
      const harvestedData: Record<string, number> = {};
      this.flora.nodes.forEach((n, id) => {
        if (n.isHarvested) {
          harvestedData[id] = n.harvestTimestamp;
        }
      });
      this.activeSave.harvestedFlora = harvestedData;
    }

    this.activeSave.inventory = this.inventory.serialize();
    this.activeSave.quests = this.quests.serialize();
    this.activeSave.trackedQuestId = this.quests.getTrackedQuestId();
    this.activeSave.claimedQuestRewards = this.quests.getClaimedRewards();
    this.activeSave.explorationRank = this.quests.explorationRank;
    this.activeSave.explorationXp = this.quests.explorationXp;
    this.activeSave.achievements = this.achievements.serialize();
    this.activeSave.activatedCheckpoints = this.checkpoints.getActivatedIds();
    this.activeSave.activeCheckpointId = this.checkpoints.getActiveCheckpoint()?.id;
    this.activeSave.currentWeather = this.weather.state.currentWeather;
    this.activeSave.worldTime = {
      cycleTime: this.dayNight.state.cycleTime,
      dayCount: this.dayNight.state.dayCount,
    };
    this.activeSave.redMoon = { ...this.dayNight.redMoonSave };
    StorageService.saveGame(this.activeSave);
  }

  public setMode(newMode: GameMode): void {
    this.mode = newMode;
    if (newMode === 'PLAYING') {
      AudioService.init();
      AudioService.startAmbience();
      this.input.resetInputs();
    } else if (newMode === 'PAUSED' || newMode === 'TITLE' || newMode === 'INVENTORY' || newMode === 'QUESTS') {
      this.input.resetInputs();
    }
  }

  public getMode(): GameMode {
    return this.mode;
  }

  // Developer-Only Testing Controls (Prompt 5 requirement)
  public devToggleRedMoon(force?: boolean): boolean {
    if (!this.dayNight) return false;
    const active = this.dayNight.toggleRedMoon(force);
    if (active) {
      this.weather.setWeather('RED_ECLIPSE');
      this.quests.startQuest('quest_blood_moon_eclipse');
    } else {
      this.weather.setWeather('CLEAR');
    }
    this.persistSave();
    return active;
  }

  public devJumpPhase(phase: 'DAWN' | 'NOON' | 'DUSK' | 'NIGHT'): void {
    this.dayNight?.jumpToPhase(phase);
  }

  public devAdvanceTime(seconds: number): void {
    this.dayNight?.advanceTimeSeconds(seconds);
  }

  public devSetWeather(weather: WeatherType): void {
    this.weather.setWeather(weather);
  }

  public devResetRedMoonCooldown(): void {
    this.dayNight?.resetRedMoonCooldown();
    if (this.crimsonWarden) {
      this.crimsonWarden.state.isDefeated = false;
      this.activeSave.redMoon.wardenDefeated = false;
      this.activeSave.redMoon.wardenRewardsClaimed = false;
    }
    this.persistSave();
  }

  public devTeleport(x: number, z: number): void {
    if (!this.player || !this.world) return;
    const y = this.world.getTerrainHeight(x, z) + 1.5;
    this.player.group.position.set(x, y, z);
    NotificationSystem.notify('Dev Teleport', `Moved to [${Math.round(x)}, ${Math.round(z)}]`, 'info');
  }

  public cycleCameraMode(): void {
    if (!this.cameraManager) return;
    const mode = this.cameraManager.cycleMode();
    this.activeSave.settings.cameraMode = mode;
    this.uiCallbacks.onCameraModeChange?.(mode, this.cameraManager.activeObserverLabel);
    NotificationSystem.notify('Camera Perspective', this.cameraManager.activeObserverLabel, 'info', 2500);
    AudioService.playUiClick();
  }

  public setCameraMode(mode: CameraMode): void {
    if (!this.cameraManager) return;
    this.cameraManager.setMode(mode);
    this.activeSave.settings.cameraMode = mode;
    this.uiCallbacks.onCameraModeChange?.(mode, this.cameraManager.activeObserverLabel);
  }

  public setCameraDistance(dist: number): void {
    if (!this.cameraManager) return;
    this.cameraManager.distance = Math.max(3, Math.min(18, dist));
    this.activeSave.settings.cameraDistance = this.cameraManager.distance;
  }

  public setCameraSensitivity(sens: number): void {
    if (!this.cameraManager) return;
    this.cameraManager.sensitivity = Math.max(0.2, Math.min(3.0, sens));
    this.activeSave.settings.cameraSensitivity = this.cameraManager.sensitivity;
  }

  public getCameraMode(): CameraMode {
    return this.cameraManager?.mode || 'THIRD_PERSON';
  }

  public getCameraLabel(): string {
    return this.cameraManager?.activeObserverLabel || 'THIRD PERSON';
  }

  public getPlayerPosition(): [number, number, number] {
    if (!this.player) return this.activeSave.playerPosition;
    return [this.player.group.position.x, this.player.group.position.y, this.player.group.position.z];
  }

  public getPlayerFacingAngle(): number {
    return this.player ? this.player.facingAngle : 0;
  }

  public getCheckpoints() {
    return this.checkpoints.getCheckpoints();
  }

  private handlePauseToggle = (): void => {
    if (this.mode === 'PLAYING') {
      this.setMode('PAUSED');
    } else if (this.mode === 'PAUSED' || this.mode === 'INVENTORY' || this.mode === 'QUESTS' || this.mode === 'MAP') {
      this.setMode('PLAYING');
    }
  };

  private handleResize = (): void => {
    if (!this.bundle || !this.container) return;
    const width = this.container.clientWidth;
    const height = Math.max(this.container.clientHeight, 1);
    this.bundle.camera.aspect = width / height;
    this.bundle.camera.updateProjectionMatrix();
    this.bundle.renderer.setSize(width, height);
  };

  /**
   * Clean up all WebGL, entities, and event listeners without memory leaks
   */
  dispose(): void {
    this.isRunning = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.input.dispose();
    AudioService.stopAmbience();
    this.player?.dispose();
    this.entities?.dispose();
    this.wildlife?.dispose();
    this.structures?.dispose();
    this.crimsonWarden?.dispose();
    this.weather?.dispose();
    this.dayNight?.dispose();
    this.world?.dispose();
    this.bundle?.dispose();
  }
}
