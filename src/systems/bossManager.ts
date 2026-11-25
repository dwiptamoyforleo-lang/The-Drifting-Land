/**
 * Boss Encounter Manager for The Drifting Land.
 * Orchestrates 6 distinct world boss encounters:
 * 1. Rootbound Guardian (Overgrown Grove Altar [-36, y, 28])
 * 2. Ash Colossus (Cinder Spire Crater [-25, y, -50])
 * 3. Storm Sentinel (Windward Promontory [46, y, 24])
 * 4. Archive Keeper (Sunken Undercroft Vault [-48, y, -10])
 * 5. Rift Sovereign (Dimensional Gateway Nexus [-56, y, -20])
 * 6. Crimson Warden (Shattered Rift Crater [-52, y, -45])
 *
 * Implements:
 * - Readable attack windup telegraphs with expanding ground rings
 * - 2 distinct phases (<50% enrage state with empowered attacks)
 * - Anti-exploit: single-grant unique relics, leash resets, i-frames
 * - Seamless integration with HUD, inventory, quests, achievements, and persistence
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
  materials: THREE.Material[];
  customAnim?: (dt: number, time: number) => void;
}

export class BossManager {
  private scene: THREE.Scene;
  private getTerrainHeight: (x: number, z: number) => number;
  private inventory: InventorySystem;
  private quests: QuestSystem;
  private achievements: AchievementSystem;
  private isSoftwareGl: boolean;

  private bosses: Map<BossId, BossInstance> = new Map();
  public activeBossId: BossId | null = null;
  public defeatedBosses: Set<string> = new Set();
  public claimedBossRewards: Set<string> = new Set();

  private onBossStateChangeCallback?: (state: ActiveBossState | null) => void;
  private onPlayerDamageCallback?: (damage: number) => void;

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
    onPlayerDamage?: (damage: number) => void
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

    this.initializeAllBosses();
  }

  private initializeAllBosses(): void {
    // 1. Rootbound Guardian (Overgrown Grove Altar)
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

    // 2. Ash Colossus (Cinder Spire Crater)
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

    // 3. Storm Sentinel (Windward Promontory)
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

    // 4. Archive Keeper (Sunken Undercroft Vault)
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

    // 5. Rift Sovereign (Dimensional Gateway Nexus)
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

    // 6. Crimson Warden (Shattered Rift Crater)
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

  private createBoss(data: BossEntityData): void {
    const group = new THREE.Group();
    group.name = `boss_${data.id}`;
    group.position.copy(data.arenaCenter);
    this.scene.add(group);

    const materials: THREE.Material[] = [];
    const meshGroup = new THREE.Group();
    group.add(meshGroup);

    // Arena Perimeter Runes / Torches
    const arenaMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.9,
      metalness: 0.2,
    });
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const px = Math.cos(angle) * (data.triggerRadius - 2);
      const pz = Math.sin(angle) * (data.triggerRadius - 2);
      const obelisk = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.5, 0.8), arenaMat);
      obelisk.position.set(px, 1.75, pz);
      group.add(obelisk);

      const runeMat = new THREE.MeshBasicMaterial({
        color: data.id === 'rootbound_guardian' ? 0x22c55e
          : data.id === 'ash_colossus' ? 0xf97316
          : data.id === 'storm_sentinel' ? 0x06b6d4
          : data.id === 'archive_keeper' ? 0xa855f7
          : data.id === 'rift_sovereign' ? 0xec4899
          : 0xef4444,
      });
      const rune = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.0, 0.15), runeMat);
      rune.position.set(px * 0.95, 1.75, pz * 0.95);
      group.add(rune);
    }

    // Boss 3D Procedural Meshes
    let customAnim: ((dt: number, time: number) => void) | undefined;

    if (data.id === 'rootbound_guardian') {
      // Ancient living bark golem
      const barkMat = new THREE.MeshStandardMaterial({ color: 0x3f2d20, roughness: 0.9 });
      materials.push(barkMat);

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, 3.2, 8), barkMat);
      torso.position.set(0, 2.5, 0);
      meshGroup.add(torso);

      // Primordial glowing heart core
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x15803d,
        emissive: 0x22c55e,
        emissiveIntensity: 1.2,
      });
      materials.push(coreMat);
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), coreMat);
      core.position.set(0, 2.6, 0.7);
      meshGroup.add(core);

      // Huge root clubs
      const clubL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.5, 0.7), barkMat);
      clubL.position.set(-2.2, 2.0, 0);
      const clubR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.5, 0.7), barkMat);
      clubR.position.set(2.2, 2.0, 0);
      meshGroup.add(clubL, clubR);

      customAnim = (_dt, time) => {
        meshGroup.position.y = Math.sin(time * 1.5) * 0.15;
        clubL.rotation.x = Math.sin(time * 2.0) * 0.3;
        clubR.rotation.x = -Math.sin(time * 2.0) * 0.3;
      };

    } else if (data.id === 'ash_colossus') {
      // Obsidian & molten magma titan
      const obsMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
      const lavaMat = new THREE.MeshStandardMaterial({
        color: 0xea580c,
        emissive: 0xf97316,
        emissiveIntensity: 1.4,
      });
      materials.push(obsMat, lavaMat);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 1.8), obsMat);
      torso.position.set(0, 2.8, 0);
      meshGroup.add(torso);

      const lavaHeart = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), lavaMat);
      lavaHeart.position.set(0, 3.0, 0.8);
      meshGroup.add(lavaHeart);

      // Basalt shoulders
      const pauldronL = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), obsMat);
      pauldronL.position.set(-2.0, 4.0, 0);
      const pauldronR = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), obsMat);
      pauldronR.position.set(2.0, 4.0, 0);
      meshGroup.add(pauldronL, pauldronR);

      customAnim = (_dt, time) => {
        lavaHeart.rotation.y = time * 2;
        lavaHeart.rotation.z = time * 1.5;
      };

    } else if (data.id === 'storm_sentinel') {
      // Floating lightning spire
      const spireMat = new THREE.MeshStandardMaterial({
        color: 0x082f49,
        roughness: 0.2,
        metalness: 0.9,
      });
      const elecMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.5,
      });
      materials.push(spireMat, elecMat);

      const mainSpire = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.2, 6), spireMat);
      mainSpire.position.set(0, 3.2, 0);
      meshGroup.add(mainSpire);

      // 4 orbiting resonance prisms
      const prisms: THREE.Mesh[] = [];
      for (let i = 0; i < 4; i++) {
        const prism = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), elecMat);
        meshGroup.add(prism);
        prisms.push(prism);
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
      // Ancient celestial runic keeper
      const keeperMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.3,
        metalness: 0.8,
      });
      const lensMat = new THREE.MeshStandardMaterial({
        color: 0x7e22ce,
        emissive: 0xa855f7,
        emissiveIntensity: 1.3,
      });
      materials.push(keeperMat, lensMat);

      const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), keeperMat);
      sphere.position.set(0, 3.0, 0);
      meshGroup.add(sphere);

      const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12), lensMat);
      eye.rotation.x = Math.PI / 2;
      eye.position.set(0, 3.0, 1.2);
      meshGroup.add(eye);

      // Orbiting armillary ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.4, 0.1, 8, 24),
        keeperMat
      );
      ring.position.set(0, 3.0, 0);
      meshGroup.add(ring);

      customAnim = (_dt, time) => {
        meshGroup.position.y = Math.sin(time * 1.8) * 0.25;
        ring.rotation.x = time * 1.2;
        ring.rotation.y = time * 1.8;
      };

    } else if (data.id === 'rift_sovereign') {
      // Cosmic void entity
      const voidMat = new THREE.MeshStandardMaterial({
        color: 0x3b0764,
        emissive: 0x581c87,
        emissiveIntensity: 0.9,
      });
      const starMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
      materials.push(voidMat, starMat);

      const core = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 0), voidMat);
      core.position.set(0, 3.5, 0);
      meshGroup.add(core);

      // Void halo
      const halo = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.15, 6, 24), starMat);
      halo.rotation.x = Math.PI / 3;
      halo.position.set(0, 3.5, 0);
      meshGroup.add(halo);

      customAnim = (_dt, time) => {
        meshGroup.position.y = Math.sin(time * 2.2) * 0.35;
        core.rotation.y = time * 0.8;
        core.rotation.x = time * 0.5;
        halo.rotation.z = time * 1.2;
      };

    } else if (data.id === 'crimson_warden') {
      // Obsidian warrior with crimson blade
      const redMat = new THREE.MeshStandardMaterial({
        color: 0x991b1b,
        emissive: 0xef4444,
        emissiveIntensity: 1.0,
      });
      const obsMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 });
      materials.push(redMat, obsMat);

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 3.2, 8), obsMat);
      torso.position.set(0, 2.8, 0);
      meshGroup.add(torso);

      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), redMat);
      core.position.set(0, 3.0, 0.6);
      meshGroup.add(core);

      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.5, 0.1), redMat);
      blade.position.set(1.8, 3.2, 0.5);
      meshGroup.add(blade);

      customAnim = (_dt, time) => {
        meshGroup.position.y = Math.sin(time * 2.0) * 0.15;
        blade.position.y = 3.2 + Math.sin(time * 3.0) * 0.3;
      };
    }

    // Ground Attack Telegraph Ring
    const telegraphMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const ringGeo = new THREE.RingGeometry(0.1, 5.0, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const telegraphMesh = new THREE.Mesh(ringGeo, telegraphMat);
    telegraphMesh.position.set(0, 0.1, 0);
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
      materials,
      customAnim,
    });
  }

  /**
   * Main boss update cycle
   */
  public update(
    dt: number,
    playerPos: THREE.Vector3,
    isRedMoon = false
  ): void {
    const time = Date.now() * 0.001;

    let currentlyActiveBoss: BossInstance | null = null;

    for (const boss of this.bosses.values()) {
      // Defeated bosses stay inactive unless reset
      if (boss.isDefeated) continue;

      const distToPlayer = playerPos.distanceTo(boss.data.arenaCenter);

      // Custom idle/combat procedural animation
      if (boss.customAnim) {
        boss.customAnim(dt, time);
      }

      // Hit flash restore
      if (boss.hitFlashTimer > 0) {
        boss.hitFlashTimer -= dt;
        if (boss.hitFlashTimer <= 0) {
          boss.materials.forEach((m) => {
            if ('color' in m && (m as any).__origColor) {
              (m as any).color.setHex((m as any).__origColor);
            }
          });
        }
      }

      // Cooldown timer
      if (boss.damageCooldown > 0) {
        boss.damageCooldown -= dt;
      }

      // Leash & Engagement logic
      if (!boss.isActive) {
        // Crimson Warden only awakens during Red Moon or if engaged directly
        if (boss.data.id === 'crimson_warden' && !isRedMoon && distToPlayer > 8) {
          continue;
        }

        if (distToPlayer <= boss.data.triggerRadius) {
          boss.isActive = true;
          boss.health = boss.maxHealth;
          boss.phase = 1;
          boss.attackTimer = 1.5;
          AudioService.playBossPhaseChange();
          NotificationSystem.notify(
            `Encounter: ${boss.data.name}`,
            boss.data.subtitle,
            'danger',
            5000
          );
        }
      } else {
        // Boss is actively fighting!
        currentlyActiveBoss = boss;

        // Leash Reset Check
        if (distToPlayer > boss.data.leashRadius) {
          boss.isActive = false;
          boss.health = boss.maxHealth;
          boss.phase = 1;
          boss.currentTelegraph = null;
          boss.telegraphMat.opacity = 0;
          NotificationSystem.notify(
            `${boss.data.name} Leashed`,
            'You fled the arena — encounter reset.',
            'info',
            3000
          );
          continue;
        }

        // Face player
        const dx = playerPos.x - boss.data.arenaCenter.x;
        const dz = playerPos.z - boss.data.arenaCenter.z;
        boss.meshGroup.rotation.y = Math.atan2(dx, dz);

        // Check Phase 2 Enrage (< 50% HP)
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

        // --- Attack Telegraph & Execution Cycle ---
        if (!boss.currentTelegraph) {
          boss.attackTimer -= dt;
          if (boss.attackTimer <= 0) {
            // Initiate heavy telegraphed attack
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
          // Progress telegraph ring
          const t = boss.currentTelegraph;
          t.timer += dt;
          const progress = Math.min(1.0, t.timer / t.duration);

          // Update telegraph ring visual
          boss.telegraphMat.opacity = 0.25 + progress * 0.6;
          const scale = Math.max(0.1, progress * (t.radius / 5.0));
          boss.telegraphMesh.scale.set(scale, 1, scale);

          // Telegraph detonates!
          if (t.timer >= t.duration) {
            AudioService.playDamage();
            // Check player distance to arena center / impact
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
            boss.attackTimer = boss.attackInterval;
          }
        }
      }
    }

    // Notify UI / HUD of active boss
    if (currentlyActiveBoss) {
      this.activeBossId = currentlyActiveBoss.data.id;
      const b = currentlyActiveBoss;
      this.onBossStateChangeCallback?.({
        id: b.data.id,
        name: b.data.name,
        subtitle: b.data.subtitle,
        active: true,
        health: b.health,
        maxHealth: b.maxHealth,
        phase: b.phase,
        attackWarning: b.currentTelegraph
          ? {
              type: b.currentTelegraph.type,
              progress: b.currentTelegraph.timer / b.currentTelegraph.duration,
              x: b.data.arenaCenter.x,
              z: b.data.arenaCenter.z,
              radius: b.currentTelegraph.radius,
            }
          : null,
        isDefeated: false,
      });
    } else {
      if (this.activeBossId) {
        this.activeBossId = null;
        this.onBossStateChangeCallback?.(null);
      }
    }
  }

  /**
   * Handle Player Attack on Nearby Boss
   */
  public handlePlayerAttack(
    playerPos: THREE.Vector3,
    damage: number
  ): { hit: boolean; bossDefeated: boolean; bossName?: string } {
    for (const [id, boss] of this.bosses.entries()) {
      if (!boss.isActive || boss.isDefeated) continue;

      const dist = playerPos.distanceTo(boss.data.arenaCenter);
      if (dist <= 6.5) {
        // Prevent simultaneous damage spam (0.2s boss i-frames)
        if (boss.damageCooldown > 0) {
          return { hit: false, bossDefeated: false };
        }

        boss.damageCooldown = 0.22;
        const dealt = Math.round(damage * (0.85 + Math.random() * 0.3));
        boss.health = Math.max(0, boss.health - dealt);

        // Visual Hit Flash
        boss.hitFlashTimer = 0.14;
        boss.materials.forEach((m) => {
          if ('color' in m) {
            if (!(m as any).__origColor) {
              (m as any).__origColor = (m as any).color.getHex();
            }
            (m as any).color.setHex(0xffffff);
          }
        });

        AudioService.playHit();

        // Check Boss Defeat
        if (boss.health <= 0) {
          this.handleBossDefeat(boss);
          return { hit: true, bossDefeated: true, bossName: boss.data.name };
        }

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

    this.defeatedBosses.add(boss.data.id);
    const isFirstKill = !this.claimedBossRewards.has(boss.data.id);
    this.claimedBossRewards.add(boss.data.id);

    // Roll data-driven loot table with anti-exploit single-grant check
    const loot = rollLoot(boss.data.id, isFirstKill, true);

    // Grant Coins and XP
    this.inventory.addCoins(loot.coins);
    this.quests.addExplorationXp(loot.xp);

    // Grant items to inventory
    const grantedNames: string[] = [];
    for (const item of loot.items) {
      const def = getItemDef(item.itemId);
      if (def) {
        this.inventory.addItem(item.itemId, item.quantity);
        grantedNames.push(`${item.quantity}x ${def.name}`);
        this.quests.reportProgress('COLLECT', item.itemId, item.quantity);
      }
    }

    // Quest & Achievement updates
    this.quests.reportProgress('DEFEAT_BOSS', boss.data.id, 1);
    this.quests.reportProgress('DEFEAT_BOSS', boss.data.questObjectiveId, 1);
    this.achievements.unlock(boss.data.achievementId);
    this.achievements.unlock('ach_combat_victor');

    // Triumphant audio & fanfare
    AudioService.playDiscoveryFanfare();

    NotificationSystem.notify(
      `BOSS DEFEATED: ${boss.data.name}!`,
      `+${loot.coins} Coins, +${loot.xp} XP. Claimed: ${grantedNames.join(', ')}`,
      'discovery',
      8000
    );

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

  public dispose(): void {
    for (const boss of this.bosses.values()) {
      this.scene.remove(boss.group);
      boss.materials.forEach((m) => m.dispose());
    }
    this.bosses.clear();
  }
}
