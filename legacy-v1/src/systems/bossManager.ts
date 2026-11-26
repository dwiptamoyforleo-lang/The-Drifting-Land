/**
 * Boss Encounter Manager for The Drifting Land.
 * Orchestrates 6 distinct world boss encounters with:
 * - Shared geometries & materials via SharedAssets
 * - Throttled / diffed UI state notifications (never 60 Hz React re-renders)
 * - Chunk streaming visibility & region scoping
 * - Zero Date.now() animation calls and clean GPU disposal
 */

import * as THREE from 'three';
import { BossId, ActiveBossState } from '../types/game';
import { InventorySystem } from './inventorySystem';
import { QuestSystem } from './questSystem';
import { AchievementSystem } from './achievementSystem';
import { NotificationSystem } from './notificationSystem';
import { AudioService } from '../services/audio';
import { rollLoot } from '../data/lootTables';
import { getItemDef } from '../data/items';
import { SharedAssets } from '../engine/sharedAssets';

export interface BossEntityData {
  id: BossId;
  name: string;
  subtitle: string;
  arenaCenter: THREE.Vector3;
  leashRadius: number;
  triggerRadius: number;
  maxHealth: number;
  phase1Interval: number;
  phase2Interval: number;
  baseDamage: number;
  questObjectiveId: string;
  achievementId: string;
}

export interface BossInstance {
  data: BossEntityData;
  group: THREE.Group;
  meshGroup: THREE.Group;
  health: number;
  maxHealth: number;
  phase: 1 | 2;
  isActive: boolean;
  isDefeated: boolean;
  attackTimer: number;
  attackInterval: number;
  currentTelegraph: {
    type: string;
    timer: number;
    duration: number;
    radius: number;
    damage: number;
  } | null;
  telegraphMesh: THREE.Mesh;
  telegraphMat: THREE.MeshBasicMaterial;
  damageCooldown: number;
  hitFlashTimer: number;
  isFlashing: boolean;
  meshes: THREE.Mesh[];
  streamVisible: boolean;
  customAnim?: (dt: number, time: number) => void;
}

export class BossManager {
  private scene: THREE.Scene;
  private getTerrainHeight: (x: number, z: number) => number;
  private inventory: InventorySystem;
  private quests: QuestSystem;
  private achievements: AchievementSystem;
  private isSoftwareGl: boolean;
  private animTime: number = 0;

  private bosses: Map<BossId, BossInstance> = new Map();
  public activeBossId: BossId | null = null;
  public defeatedBosses: Set<string> = new Set();
  public claimedBossRewards: Set<string> = new Set();

  private onBossStateChangeCallback?: (state: ActiveBossState | null) => void;
  private onPlayerDamageCallback?: (damage: number) => void;
  private flashMaterial: THREE.MeshBasicMaterial;

  // UI throttling state so boss HUD never triggers 60 Hz React re-renders
  private uiNotifyTimer: number = 0;
  private lastUiHealth: number = -1;
  private lastUiPhase: number = -1;
  private lastUiWarningType: string | null = null;

  constructor(
    scene: THREE.Scene,
    getTerrainHeight: (x: number, z: number) => number,
    inventory: InventorySystem,
    quests: QuestSystem,
    achievements: AchievementSystem,
    initialDefeated: string[] = [],
    initialClaimed: string[] = [],
    isSoftwareGl = false,
    onBossStateChange?: (state: ActiveBossState | null) => void,
    onPlayerDamage?: (damage: number) => void,
    regionId = 'verdant_reach'
  ) {
    this.scene = scene;
    this.getTerrainHeight = getTerrainHeight;
    this.inventory = inventory;
    this.quests = quests;
    this.achievements = achievements;
    this.defeatedBosses = new Set(initialDefeated);
    this.claimedBossRewards = new Set(initialClaimed);
    this.isSoftwareGl = isSoftwareGl;
    this.onBossStateChangeCallback = onBossStateChange;
    this.onPlayerDamageCallback = onPlayerDamage;
    this.flashMaterial = SharedAssets.getMaterial('combat_hit_flash', () =>
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );

    this.populateForRegion(regionId, getTerrainHeight);
  }

  public populateForRegion(
    regionId: string,
    getTerrainHeight?: (x: number, z: number) => number
  ): void {
    this.clear();
    if (getTerrainHeight) {
      this.getTerrainHeight = getTerrainHeight;
    }
    if (regionId !== 'verdant_reach') {
      return;
    }
    this.initializeAllBosses();
  }

  private initializeAllBosses(): void {
    this.createBoss({
      id: 'rootbound_guardian',
      name: 'Rootbound Guardian',
      subtitle: 'Primordial Grove Behemoth',
      arenaCenter: new THREE.Vector3(-36, this.getTerrainHeight(-36, 28), 28),
      leashRadius: 30,
      triggerRadius: 15,
      maxHealth: 600,
      phase1Interval: 3.8,
      phase2Interval: 2.6,
      baseDamage: 25,
      questObjectiveId: 'boss_rootbound_guardian',
      achievementId: 'ach_grove_conquered',
    });

    this.createBoss({
      id: 'ash_colossus',
      name: 'Ash Colossus',
      subtitle: 'Titan of the Molten Core',
      arenaCenter: new THREE.Vector3(-25, this.getTerrainHeight(-25, -50), -50),
      leashRadius: 32,
      triggerRadius: 16,
      maxHealth: 750,
      phase1Interval: 4.2,
      phase2Interval: 2.8,
      baseDamage: 32,
      questObjectiveId: 'boss_ash_colossus',
      achievementId: 'ach_colossus_conquered',
    });

    this.createBoss({
      id: 'storm_sentinel',
      name: 'Storm Sentinel',
      subtitle: 'Tempest Resonator Spire',
      arenaCenter: new THREE.Vector3(46, this.getTerrainHeight(46, 24), 24),
      leashRadius: 30,
      triggerRadius: 15,
      maxHealth: 700,
      phase1Interval: 3.5,
      phase2Interval: 2.4,
      baseDamage: 28,
      questObjectiveId: 'boss_storm_sentinel',
      achievementId: 'ach_storm_conquered',
    });

    this.createBoss({
      id: 'archive_keeper',
      name: 'Archive Keeper',
      subtitle: 'Ancient Celestial Curator',
      arenaCenter: new THREE.Vector3(-48, this.getTerrainHeight(-48, -10), -10),
      leashRadius: 28,
      triggerRadius: 14,
      maxHealth: 650,
      phase1Interval: 3.6,
      phase2Interval: 2.5,
      baseDamage: 26,
      questObjectiveId: 'boss_archive_keeper',
      achievementId: 'ach_archive_conquered',
    });

    this.createBoss({
      id: 'rift_sovereign',
      name: 'Rift Sovereign',
      subtitle: 'Entity Beyond the Veil',
      arenaCenter: new THREE.Vector3(-56, this.getTerrainHeight(-56, -20), -20),
      leashRadius: 32,
      triggerRadius: 16,
      maxHealth: 850,
      phase1Interval: 3.4,
      phase2Interval: 2.2,
      baseDamage: 35,
      questObjectiveId: 'boss_rift_sovereign',
      achievementId: 'ach_sovereign_conquered',
    });

    this.createBoss({
      id: 'crimson_warden',
      name: 'Crimson Warden',
      subtitle: 'Scourge of the Eclipse',
      arenaCenter: new THREE.Vector3(-52, this.getTerrainHeight(-52, -45), -45),
      leashRadius: 34,
      triggerRadius: 16,
      maxHealth: 800,
      phase1Interval: 3.6,
      phase2Interval: 2.4,
      baseDamage: 30,
      questObjectiveId: 'boss_crimson_warden',
      achievementId: 'ach_warden_slain',
    });
  }

  private addBossMesh(
    parent: THREE.Group,
    meshes: THREE.Mesh[],
    geo: THREE.BufferGeometry,
    mat: THREE.Material
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geo, mat);
    (mesh as any).__origMat = mat;
    parent.add(mesh);
    meshes.push(mesh);
    return mesh;
  }

  private createBoss(data: BossEntityData): void {
    const group = new THREE.Group();
    group.name = `boss_${data.id}`;
    group.position.copy(data.arenaCenter);
    this.scene.add(group);

    const meshes: THREE.Mesh[] = [];
    const meshGroup = new THREE.Group();
    group.add(meshGroup);

    // Shared Arena Perimeter Obelisks & Runes
    const arenaMat = SharedAssets.getMaterial('boss_arena_obelisk', () =>
      new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9, metalness: 0.2 })
    );
    const obeliskGeo = SharedAssets.getGeometry('boss_obelisk_geo', () => new THREE.BoxGeometry(0.8, 3.5, 0.8));
    const runeGeo = SharedAssets.getGeometry('boss_rune_geo', () => new THREE.BoxGeometry(0.15, 2.0, 0.15));
    const runeColor =
      data.id === 'rootbound_guardian' ? 0x22c55e
        : data.id === 'ash_colossus' ? 0xf97316
        : data.id === 'storm_sentinel' ? 0x06b6d4
        : data.id === 'archive_keeper' ? 0xa855f7
        : data.id === 'rift_sovereign' ? 0xec4899
        : 0xef4444;
    const runeMat = SharedAssets.getMaterial(`boss_rune_${data.id}`, () =>
      new THREE.MeshBasicMaterial({ color: runeColor })
    );

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const px = Math.cos(angle) * (data.triggerRadius - 2);
      const pz = Math.sin(angle) * (data.triggerRadius - 2);
      const obelisk = new THREE.Mesh(obeliskGeo, arenaMat);
      obelisk.position.set(px, 1.75, pz);
      group.add(obelisk);

      const rune = new THREE.Mesh(runeGeo, runeMat);
      rune.position.set(px * 0.95, 1.75, pz * 0.95);
      group.add(rune);
    }

    let customAnim: ((dt: number, time: number) => void) | undefined;

    if (data.id === 'rootbound_guardian') {
      const barkMat = SharedAssets.getMaterial('boss_rg_bark', () =>
        new THREE.MeshStandardMaterial({ color: 0x3f2d20, roughness: 0.9 })
      );
      const coreMat = SharedAssets.getMaterial('boss_rg_core', () =>
        new THREE.MeshStandardMaterial({ color: 0x15803d, emissive: 0x22c55e, emissiveIntensity: 1.2 })
      );

      const torso = this.addBossMesh(
        meshGroup,
        meshes,
        SharedAssets.getGeometry('boss_rg_torso', () => new THREE.CylinderGeometry(1.2, 1.8, 3.2, 8)),
        barkMat
      );
      torso.position.set(0, 2.5, 0);

      const core = this.addBossMesh(
        meshGroup,
        meshes,
        SharedAssets.getGeometry('boss_rg_core_geo', () => new THREE.IcosahedronGeometry(0.7, 1)),
        coreMat
      );
      core.position.set(0, 2.6, 0.7);

      const clubGeo = SharedAssets.getGeometry('boss_rg_club', () => new THREE.BoxGeometry(0.7, 2.5, 0.7));
      const clubL = this.addBossMesh(meshGroup, meshes, clubGeo, barkMat);
      clubL.position.set(-2.2, 2.0, 0);
      const clubR = this.addBossMesh(meshGroup, meshes, clubGeo, barkMat);
      clubR.position.set(2.2, 2.0, 0);

      customAnim = (_dt, time) => {
        meshGroup.position.y = Math.sin(time * 1.5) * 0.15;
        clubL.rotation.x = Math.sin(time * 2.0) * 0.3;
        clubR.rotation.x = -Math.sin(time * 2.0) * 0.3;
      };
    } else if (data.id === 'ash_colossus') {
      const obsMat = SharedAssets.getMaterial('boss_ac_obs', () =>
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 })
      );
      const lavaMat = SharedAssets.getMaterial('boss_ac_lava', () =>
        new THREE.MeshStandardMaterial({ color: 0xea580c, emissive: 0xf97316, emissiveIntensity: 1.4 })
      );

      const torso = this.addBossMesh(
        meshGroup,
        meshes,
        SharedAssets.getGeometry('boss_ac_torso', () => new THREE.BoxGeometry(2.4, 3.2, 1.8)),
        obsMat
      );
      torso.position.set(0, 2.8, 0);

      const lavaHeart = this.addBossMesh(
        meshGroup,
        meshes,
        SharedAssets.getGeometry('boss_ac_heart', () => new THREE.OctahedronGeometry(0.9, 0)),
        lavaMat
      );
      lavaHeart.position.set(0, 3.0, 0.8);

      const pauldronGeo = SharedAssets.getGeometry('boss_ac_pauldron', () => new THREE.DodecahedronGeometry(1.0, 0));
      const pauldronL = this.addBossMesh(meshGroup, meshes, pauldronGeo, obsMat);
      pauldronL.position.set(-2.0, 4.0, 0);
      const pauldronR = this.addBossMesh(meshGroup, meshes, pauldronGeo, obsMat);
      pauldronR.position.set(2.0, 4.0, 0);

      customAnim = (_dt, time) => {
        lavaHeart.rotation.y = time * 2;
        lavaHeart.rotation.z = time * 1.5;
      };
    } else if (data.id === 'storm_sentinel') {
      const spireMat = SharedAssets.getMaterial('boss_ss_spire', () =>
        new THREE.MeshStandardMaterial({ color: 0x082f49, roughness: 0.2, metalness: 0.9 })
      );
      const elecMat = SharedAssets.getMaterial('boss_ss_elec', () =>
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.5 })
      );

      const mainSpire = this.addBossMesh(
        meshGroup,
        meshes,
        SharedAssets.getGeometry('boss_ss_main', () => new THREE.ConeGeometry(0.9, 4.2, 6)),
        spireMat
      );
      mainSpire.position.set(0, 3.2, 0);

      const prismGeo = SharedAssets.getGeometry('boss_ss_prism', () => new THREE.OctahedronGeometry(0.4, 0));
      const prisms: THREE.Mesh[] = [];
      for (let i = 0; i < 4; i++) {
        prisms.push(this.addBossMesh(meshGroup, meshes, prismGeo, elecMat));
      }

      customAnim = (_dt, time) => {
        meshGroup.position.y = 1.0 + Math.sin(time * 2.0) * 0.4;
        mainSpire.rotation.y = time * 1.5;
        prisms.forEach((p, idx) => {
          const ang = time * 2.5 + (idx * Math.PI) / 2;
          p.position.set(Math.cos(ang) * 2.5, 3.2 + Math.sin(ang * 2) * 0.6, Math.sin(ang) * 2.5);
          p.rotation.x = time * 3;
        });
      };
    } else if (data.id === 'archive_keeper') {
      const keeperMat = SharedAssets.getMaterial('boss_ak_body', () =>
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 })
      );
      const lensMat = SharedAssets.getMaterial('boss_ak_lens', () =>
        new THREE.MeshStandardMaterial({ color: 0x7e22ce, emissive: 0xa855f7, emissiveIntensity: 1.3 })
      );

      const sphere = this.addBossMesh(
        meshGroup,
        meshes,
        SharedAssets.getGeometry('boss_ak_sphere', () => new THREE.SphereGeometry(1.3, 14, 10)),
        keeperMat
      );
      sphere.position.set(0, 3.0, 0);

      const eye = this.addBossMesh(
        meshGroup,
        meshes,
        SharedAssets.getGeometry('boss_ak_eye', () => new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12)),
        lensMat
      );
      eye.rotation.x = Math.PI / 2;
      eye.position.set(0, 3.0, 1.2);

      const ring = this.addBossMesh(
        meshGroup,
        meshes,
        SharedAssets.getGeometry('boss_ak_ring', () => new THREE.TorusGeometry(2.4, 0.1, 8, 24)),
        keeperMat
      );
      ring.position.set(0, 3.0, 0);

      customAnim = (_dt, time) => {
        meshGroup.position.y = Math.sin(time * 1.8) * 0.25;
        ring.rotation.x = time * 1.2;
        ring.rotation.y = time * 1.8;
      };
    } else if (data.id === 'rift_sovereign') {
      const voidMat = SharedAssets.getMaterial('boss_rs_void', () =>
        new THREE.MeshStandardMaterial({ color: 0x3b0764, emissive: 0x581c87, emissiveIntensity: 0.9 })
      );
      const starMat = SharedAssets.getMaterial('boss_rs_star', () => new THREE.MeshBasicMaterial({ color: 0xf472b6 }));

      const core = this.addBossMesh(
        meshGroup,
        meshes,
        SharedAssets.getGeometry('boss_rs_core', () => new THREE.DodecahedronGeometry(1.4, 0)),
        voidMat
      );
      core.position.set(0, 3.5, 0);

      const halo = this.addBossMesh(
        meshGroup,
        meshes,
        SharedAssets.getGeometry('boss_rs_halo', () => new THREE.TorusGeometry(3.0, 0.15, 6, 24)),
        starMat
      );
      halo.rotation.x = Math.PI / 3;
      halo.position.set(0, 3.5, 0);

      customAnim = (_dt, time) => {
        meshGroup.position.y = Math.sin(time * 2.2) * 0.35;
        core.rotation.y = time * 0.8;
        core.rotation.x = time * 0.5;
        halo.rotation.z = time * 1.2;
      };
    } else if (data.id === 'crimson_warden') {
      const redMat = SharedAssets.getMaterial('boss_cw_red', () =>
        new THREE.MeshStandardMaterial({ color: 0x991b1b, emissive: 0xef4444, emissiveIntensity: 1.0 })
      );
      const obsMat = SharedAssets.getMaterial('boss_cw_obs', () =>
        new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 })
      );

      const torso = this.addBossMesh(
        meshGroup,
        meshes,
        SharedAssets.getGeometry('boss_cw_torso', () => new THREE.CylinderGeometry(0.9, 1.4, 3.2, 8)),
        obsMat
      );
      torso.position.set(0, 2.8, 0);

      const core = this.addBossMesh(
        meshGroup,
        meshes,
        SharedAssets.getGeometry('boss_cw_core', () => new THREE.OctahedronGeometry(0.7, 0)),
        redMat
      );
      core.position.set(0, 3.0, 0.6);

      const blade = this.addBossMesh(
        meshGroup,
        meshes,
        SharedAssets.getGeometry('boss_cw_blade', () => new THREE.BoxGeometry(0.3, 3.5, 0.1)),
        redMat
      );
      blade.position.set(1.8, 3.2, 0.5);

      customAnim = (_dt, time) => {
        meshGroup.position.y = Math.sin(time * 2.0) * 0.15;
        blade.position.y = 3.2 + Math.sin(time * 3.0) * 0.3;
      };
    }

    const telegraphMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringGeo = SharedAssets.getGeometry('boss_telegraph_ring', () => {
      const g = new THREE.RingGeometry(0.1, 5.0, 28);
      g.rotateX(-Math.PI / 2);
      return g;
    });
    const telegraphMesh = new THREE.Mesh(ringGeo, telegraphMat);
    telegraphMesh.position.set(0, 0.1, 0);
    telegraphMesh.visible = false;
    group.add(telegraphMesh);

    const isDefeated = this.defeatedBosses.has(data.id);
    if (isDefeated) {
      meshGroup.visible = false;
    }

    this.bosses.set(data.id, {
      data,
      group,
      meshGroup,
      health: data.maxHealth,
      maxHealth: data.maxHealth,
      phase: 1,
      isActive: false,
      isDefeated,
      attackTimer: 0,
      attackInterval: data.phase1Interval,
      currentTelegraph: null,
      telegraphMesh,
      telegraphMat,
      damageCooldown: 0,
      hitFlashTimer: 0,
      isFlashing: false,
      meshes,
      streamVisible: true,
      customAnim,
    });
  }

  public syncStreaming(isVisible: (x: number, z: number) => boolean): void {
    for (const boss of this.bosses.values()) {
      const vis = boss.isActive || isVisible(boss.data.arenaCenter.x, boss.data.arenaCenter.z);
      boss.streamVisible = vis;
      boss.group.visible = vis;
    }
  }

  private emitBossUi(boss: BossInstance, force = false): void {
    const warnType = boss.currentTelegraph ? boss.currentTelegraph.type : null;
    const stateChanged =
      force ||
      boss.health !== this.lastUiHealth ||
      boss.phase !== this.lastUiPhase ||
      warnType !== this.lastUiWarningType;

    if (!stateChanged && this.uiNotifyTimer < 0.12) {
      return;
    }

    this.uiNotifyTimer = 0;
    this.lastUiHealth = boss.health;
    this.lastUiPhase = boss.phase;
    this.lastUiWarningType = warnType;

    this.onBossStateChangeCallback?.({
      id: boss.data.id,
      name: boss.data.name,
      subtitle: boss.data.subtitle,
      active: true,
      health: boss.health,
      maxHealth: boss.maxHealth,
      phase: boss.phase,
      attackWarning: boss.currentTelegraph
        ? {
            type: boss.currentTelegraph.type,
            progress: boss.currentTelegraph.timer / boss.currentTelegraph.duration,
            x: boss.data.arenaCenter.x,
            z: boss.data.arenaCenter.z,
            radius: boss.currentTelegraph.radius,
          }
        : null,
      isDefeated: false,
    });
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    isRedMoon = false
  ): void {
    this.animTime += dt;
    this.uiNotifyTimer += dt;

    let currentlyActiveBoss: BossInstance | null = null;

    for (const boss of this.bosses.values()) {
      if (boss.isDefeated) continue;
      if (!boss.streamVisible && !boss.isActive) continue;

      const distSqToPlayer = playerPos.distanceToSquared(boss.data.arenaCenter);
      if (distSqToPlayer > 75 * 75 && !boss.isActive) continue;

      const distToPlayer = Math.sqrt(distSqToPlayer);

      if (boss.customAnim) {
        boss.customAnim(dt, this.animTime);
      }

      if (boss.hitFlashTimer > 0) {
        boss.hitFlashTimer -= dt;
        if (boss.hitFlashTimer <= 0 && boss.isFlashing) {
          boss.isFlashing = false;
          for (const m of boss.meshes) {
            if ((m as any).__origMat) {
              m.material = (m as any).__origMat;
            }
          }
        }
      }

      if (boss.damageCooldown > 0) {
        boss.damageCooldown -= dt;
      }

      if (!boss.isActive) {
        if (boss.data.id === 'crimson_warden' && !isRedMoon && distToPlayer > 8) {
          continue;
        }

        if (distToPlayer <= boss.data.triggerRadius) {
          boss.isActive = true;
          boss.health = boss.maxHealth;
          boss.phase = 1;
          boss.attackTimer = 1.5;
          currentlyActiveBoss = boss;
          AudioService.playBossPhaseChange();
          NotificationSystem.notify(
            `Encounter: ${boss.data.name}`,
            boss.data.subtitle,
            'danger',
            5000
          );
          this.emitBossUi(boss, true);
        }
      } else {
        currentlyActiveBoss = boss;

        if (distToPlayer > boss.data.leashRadius) {
          boss.isActive = false;
          boss.health = boss.maxHealth;
          boss.phase = 1;
          boss.currentTelegraph = null;
          boss.telegraphMat.opacity = 0;
          boss.telegraphMesh.visible = false;
          currentlyActiveBoss = null;
          NotificationSystem.notify(
            `${boss.data.name} Leashed`,
            'You fled the arena — encounter reset.',
            'info',
            3000
          );
          continue;
        }

        const dx = playerPos.x - boss.data.arenaCenter.x;
        const dz = playerPos.z - boss.data.arenaCenter.z;
        boss.meshGroup.rotation.y = Math.atan2(dx, dz);

        if (boss.phase === 1 && boss.health <= boss.maxHealth * 0.5) {
          boss.phase = 2;
          boss.attackInterval = boss.data.phase2Interval;
          AudioService.playBossPhaseChange();
          NotificationSystem.notify(
            `${boss.data.name} Enraged!`,
            'Phase 2: Attack frequency and power intensified!',
            'danger',
            4000
          );
        }

        if (!boss.currentTelegraph) {
          boss.attackTimer -= dt;
          if (boss.attackTimer <= 0) {
            const radius = boss.phase === 2 ? 6.2 : 4.8;
            const duration = boss.phase === 2 ? 1.0 : 1.4;
            const dmg = Math.round(boss.data.baseDamage * (boss.phase === 2 ? 1.4 : 1.0));

            boss.currentTelegraph = {
              type: boss.phase === 2 ? 'ENRAGED NOVA' : 'GROUND SMASH',
              timer: 0,
              duration,
              radius,
              damage: dmg,
            };
          }
        } else {
          const t = boss.currentTelegraph;
          t.timer += dt;
          const progress = Math.min(1.0, t.timer / t.duration);

          boss.telegraphMesh.visible = true;
          boss.telegraphMat.opacity = 0.25 + progress * 0.6;
          const scale = Math.max(0.1, progress * (t.radius / 5.0));
          boss.telegraphMesh.scale.set(scale, 1, scale);

          if (t.timer >= t.duration) {
            AudioService.playDamage();
            if (distToPlayer <= t.radius) {
              this.onPlayerDamageCallback?.(t.damage);
              NotificationSystem.notify(
                'Crushing Blow!',
                `${boss.data.name}'s ${t.type} hit you for ${t.damage}!`,
                'danger',
                2500
              );
            }

            boss.currentTelegraph = null;
            boss.telegraphMat.opacity = 0;
            boss.telegraphMesh.visible = false;
            boss.attackTimer = boss.attackInterval;
          }
        }
      }
    }

    if (currentlyActiveBoss) {
      this.activeBossId = currentlyActiveBoss.data.id;
      this.emitBossUi(currentlyActiveBoss, false);
    } else if (this.activeBossId) {
      this.activeBossId = null;
      this.lastUiHealth = -1;
      this.lastUiPhase = -1;
      this.lastUiWarningType = null;
      this.onBossStateChangeCallback?.(null);
    }
  }

  public handlePlayerAttack(
    playerPos: THREE.Vector3,
    damage: number
  ): { hit: boolean; bossDefeated: boolean; bossName?: string } {
    for (const boss of this.bosses.values()) {
      if (!boss.isActive || boss.isDefeated) continue;

      const dist = playerPos.distanceTo(boss.data.arenaCenter);
      if (dist <= 6.5) {
        if (boss.damageCooldown > 0) {
          return { hit: false, bossDefeated: false };
        }

        boss.damageCooldown = 0.22;
        const dealt = Math.round(damage * (0.85 + Math.random() * 0.3));
        boss.health = Math.max(0, boss.health - dealt);

        boss.hitFlashTimer = 0.14;
        boss.isFlashing = true;
        for (const m of boss.meshes) {
          m.material = this.flashMaterial;
        }

        AudioService.playHit();

        if (boss.health <= 0) {
          this.handleBossDefeat(boss);
          return { hit: true, bossDefeated: true, bossName: boss.data.name };
        }

        this.emitBossUi(boss, true);
        return { hit: true, bossDefeated: false, bossName: boss.data.name };
      }
    }

    return { hit: false, bossDefeated: false };
  }

  private handleBossDefeat(boss: BossInstance): void {
    boss.isDefeated = true;
    boss.isActive = false;
    boss.meshGroup.visible = false;
    boss.telegraphMat.opacity = 0;
    boss.telegraphMesh.visible = false;

    this.defeatedBosses.add(boss.data.id);
    const isFirstKill = !this.claimedBossRewards.has(boss.data.id);
    this.claimedBossRewards.add(boss.data.id);

    const loot = rollLoot(boss.data.id, isFirstKill, true);
    this.inventory.addCoins(loot.coins);
    this.quests.addExplorationXp(loot.xp);

    const grantedNames: string[] = [];
    for (const item of loot.items) {
      const def = getItemDef(item.itemId);
      if (def) {
        this.inventory.addItem(item.itemId, item.quantity);
        grantedNames.push(`${item.quantity}x ${def.name}`);
        this.quests.reportProgress('COLLECT', item.itemId, item.quantity);
      }
    }

    this.quests.reportProgress('DEFEAT_BOSS', boss.data.id, 1);
    this.quests.reportProgress('DEFEAT_BOSS', boss.data.questObjectiveId, 1);
    this.achievements.unlock(boss.data.achievementId);
    this.achievements.unlock('ach_combat_victor');

    AudioService.playDiscoveryFanfare();

    NotificationSystem.notify(
      `BOSS DEFEATED: ${boss.data.name}!`,
      `+${loot.coins} Coins, +${loot.xp} XP. Claimed: ${grantedNames.join(', ')}`,
      'discovery',
      8000
    );

    this.activeBossId = null;
    this.lastUiHealth = -1;
    this.onBossStateChangeCallback?.(null);
  }

  public getActiveBoss(): BossInstance | null {
    if (!this.activeBossId) return null;
    return this.bosses.get(this.activeBossId) || null;
  }

  public isNearAnyBoss(playerPos: THREE.Vector3, threshold = 6.5): { near: boolean; bossName?: string } {
    for (const boss of this.bosses.values()) {
      if (boss.isActive && !boss.isDefeated) {
        if (playerPos.distanceTo(boss.data.arenaCenter) <= threshold) {
          return { near: true, bossName: boss.data.name };
        }
      }
    }
    return { near: false };
  }

  public clear(): void {
    for (const boss of this.bosses.values()) {
      this.scene.remove(boss.group);
      SharedAssets.disposeObject3DSafe(boss.group);
    }
    this.bosses.clear();
    if (this.activeBossId) {
      this.activeBossId = null;
      this.onBossStateChangeCallback?.(null);
    }
  }

  public dispose(): void {
    this.clear();
  }
}
