/**
 * Hostile Creature and Combat Manager for The Drifting Land.
 * Implements 5 distinct hostile enemy archetypes:
 * 1. Thornstalker
 * 2. Ancient Ruin Automaton
 * 3. Razorwing Raptor
 * 4. Basalt Geo-Brute
 * 5. Voidborn Aberration
 *
 * Optimizations:
 * - Shared geometries & materials via SharedAssets (flash via shared white material swap)
 * - Timestamp-driven respawns persisted in WorldStateStore (replaces setTimeout)
 * - Fixed 16-slot FloatingDamageText ring pool & reusable temp vectors
 * - Chunk streaming visibility & entity caps
 */

import * as THREE from 'three';
import { InventorySystem } from './inventorySystem';
import { QuestSystem } from './questSystem';
import { AchievementSystem } from './achievementSystem';
import { NotificationSystem } from './notificationSystem';
import { AudioService } from '../services/audio';
import { rollLoot } from '../data/lootTables';
import { getItemDef } from '../data/items';
import { SharedAssets } from '../engine/sharedAssets';
import { WorldStateStore, createSeededRng, hashChunkSeed } from '../services/worldStateStore';

export type EnemyType =
  | 'thornstalker'
  | 'ruin_automaton'
  | 'razorwing_raptor'
  | 'basalt_geo_brute'
  | 'voidborn_aberration';

export type EnemyAiState =
  | 'IDLE'
  | 'PATROL'
  | 'STALK'
  | 'WINDUP'
  | 'ATTACK'
  | 'RECOVER'
  | 'DEAD';

export interface EnemyInstance {
  id: string;
  type: EnemyType;
  name: string;
  group: THREE.Group;
  homePos: THREE.Vector3;
  currentPos: THREE.Vector3;
  velocity: THREE.Vector3;
  rotationY: number;
  health: number;
  maxHealth: number;
  state: EnemyAiState;
  stateTimer: number;
  attackCooldown: number;
  telegraphTimer: number;
  telegraphDuration: number;
  telegraphRadius: number;
  telegraphMesh?: THREE.Mesh;
  hitFlashTimer: number;
  isFlashing: boolean;
  isDead: boolean;
  respawnAtMs: number;
  baseSpeed: number;
  aggroRadius: number;
  attackRange: number;
  damage: number;
  altitudeOffset: number;
  meshes: THREE.Mesh[];
  streamVisible: boolean;
  cappedEnabled: boolean;
}

export interface FloatingDamageText {
  id: string;
  text: string;
  color: string;
  pos: THREE.Vector3;
  life: number;
  maxLife: number;
}

const _forwardVec = new THREE.Vector3();
const _toEnemy = new THREE.Vector3();
const RESPAWN_DURATION_MS = 45000;
const DAMAGE_POOL_SIZE = 16;

export class CombatEnemyManager {
  private scene: THREE.Scene;
  private getTerrainHeight: (x: number, z: number) => number;
  private inventory: InventorySystem;
  private quests: QuestSystem;
  private achievements: AchievementSystem;
  private isSoftwareGl: boolean;
  private worldStateStore?: WorldStateStore;
  private regionId: string = 'verdant_reach';
  private entityCap: number = 24;
  private animTime: number = 0;

  public enemies: EnemyInstance[] = [];
  public floatingTexts: FloatingDamageText[] = [];
  private floatingPool: FloatingDamageText[] = [];
  private floatingPoolCursor: number = 0;
  private playerInvulnerableTimer: number = 0;
  private flashMaterial: THREE.MeshBasicMaterial;

  private readonly SPAWN_NODES: {
    type: EnemyType;
    name: string;
    pos: [number, number];
    radius: number;
  }[] = [
    { type: 'thornstalker', name: 'Verdant Thornstalker', pos: [-35, 25], radius: 12 },
    { type: 'thornstalker', name: 'Briar Thornstalker', pos: [-18, 38], radius: 10 },
    { type: 'thornstalker', name: 'Shadow Thicket Stalker', pos: [-42, 10], radius: 12 },
    { type: 'ruin_automaton', name: 'Ancient Ruin Automaton', pos: [22, -14], radius: 14 },
    { type: 'ruin_automaton', name: 'Vault Sentry Automaton', pos: [32, 2], radius: 12 },
    { type: 'ruin_automaton', name: 'Weathered Colossus Sentry', pos: [-24, 4], radius: 10 },
    { type: 'razorwing_raptor', name: 'Gale Razorwing Raptor', pos: [38, 22], radius: 16 },
    { type: 'razorwing_raptor', name: 'Ridge Razorwing Raptor', pos: [48, 8], radius: 16 },
    { type: 'basalt_geo_brute', name: 'Basalt Geo-Brute', pos: [-16, -38], radius: 14 },
    { type: 'basalt_geo_brute', name: 'Molten Geo-Brute', pos: [-32, -42], radius: 12 },
    { type: 'voidborn_aberration', name: 'Voidborn Aberration', pos: [-46, -22], radius: 14 },
    { type: 'voidborn_aberration', name: 'Rift Phantasm', pos: [-58, -12], radius: 12 },
  ];

  constructor(
    scene: THREE.Scene,
    getTerrainHeight: (x: number, z: number) => number,
    inventory: InventorySystem,
    quests: QuestSystem,
    achievements: AchievementSystem,
    isSoftwareGl = false,
    regionId = 'verdant_reach',
    worldStateStore?: WorldStateStore
  ) {
    this.scene = scene;
    this.getTerrainHeight = getTerrainHeight;
    this.inventory = inventory;
    this.quests = quests;
    this.achievements = achievements;
    this.isSoftwareGl = isSoftwareGl;

    this.flashMaterial = SharedAssets.getMaterial('combat_hit_flash', () =>
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );

    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) {
      this.floatingPool.push({
        id: `dmg_pool_${i}`,
        text: '',
        color: '#f87171',
        pos: new THREE.Vector3(),
        life: 0,
        maxLife: 0.8,
      });
    }

    this.populate(regionId, worldStateStore, this.entityCap);
  }

  public populate(
    regionId = 'verdant_reach',
    worldStateStore?: WorldStateStore,
    entityCap = 24
  ): void {
    this.clear();
    this.regionId = regionId;
    this.worldStateStore = worldStateStore;
    this.entityCap = entityCap;

    if (regionId !== 'verdant_reach') {
      return;
    }

    const worldSeed = worldStateStore?.worldSeed || 133742;
    const now = Date.now();

    for (let idx = 0; idx < this.SPAWN_NODES.length; idx++) {
      const node = this.SPAWN_NODES[idx];
      const rng = createSeededRng(hashChunkSeed(worldSeed, regionId, node.pos[0], node.pos[1] + idx));
      const x = node.pos[0] + (rng() - 0.5) * node.radius;
      const z = node.pos[1] + (rng() - 0.5) * node.radius;
      const y = this.getTerrainHeight(x, z);
      const enemyId = `enemy_${idx + 1}`;

      const enemy = this.createEnemyInstance(enemyId, node.type, node.name, x, y, z, idx < entityCap);
      const defeatedAt = worldStateStore?.getEnemyDefeatTimestamp(regionId, x, z, enemyId) || 0;
      if (defeatedAt > 0 && now - defeatedAt < RESPAWN_DURATION_MS) {
        enemy.isDead = true;
        enemy.state = 'DEAD';
        enemy.respawnAtMs = defeatedAt + RESPAWN_DURATION_MS;
        enemy.group.visible = false;
      } else if (defeatedAt > 0) {
        worldStateStore?.clearEnemyDefeated(regionId, x, z, enemyId);
      }

      this.enemies.push(enemy);
      if (!enemy.isDead) {
        this.scene.add(enemy.group);
      }
    }
  }

  public setEntityCap(cap: number): void {
    this.entityCap = cap;
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      enemy.cappedEnabled = i < cap;
      if (!enemy.isDead) {
        enemy.group.visible = enemy.cappedEnabled && enemy.streamVisible;
      }
    }
  }

  private mat(key: string, color: number, opts?: Partial<THREE.MeshStandardMaterialParameters>): THREE.MeshStandardMaterial {
    return SharedAssets.getMaterial(`ce_${key}`, () =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts })
    );
  }

  private basicMat(key: string, color: number): THREE.MeshBasicMaterial {
    return SharedAssets.getMaterial(`ce_b_${key}`, () => new THREE.MeshBasicMaterial({ color }));
  }

  private addMesh(
    group: THREE.Group,
    meshes: THREE.Mesh[],
    geo: THREE.BufferGeometry,
    material: THREE.Material
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geo, material);
    (mesh as any).__origMat = material;
    group.add(mesh);
    meshes.push(mesh);
    return mesh;
  }

  private createEnemyInstance(
    id: string,
    type: EnemyType,
    name: string,
    x: number,
    y: number,
    z: number,
    cappedEnabled: boolean
  ): EnemyInstance {
    const group = new THREE.Group();
    group.name = `hostile_${id}`;
    group.position.set(x, y, z);

    const meshes: THREE.Mesh[] = [];
    let health = 100;
    let baseSpeed = 4.0;
    let aggroRadius = 12.0;
    let attackRange = 2.5;
    let damage = 15;
    let altitudeOffset = 0;
    let telegraphRadius = 2.5;
    let telegraphDuration = 1.0;

    if (type === 'thornstalker') {
      health = 80;
      baseSpeed = 6.2;
      aggroRadius = 14.0;
      attackRange = 3.2;
      damage = 18;
      telegraphRadius = 2.8;
      telegraphDuration = 0.8;

      const mat = this.mat('thorn_body', 0x2e4a2e, { metalness: 0.1 });
      const body = this.addMesh(
        group,
        meshes,
        SharedAssets.getGeometry('ce_ts_body', () => new THREE.BoxGeometry(0.7, 0.5, 1.4)),
        mat
      );
      body.position.set(0, 0.5, 0);

      const quillMat = this.basicMat('thorn_quill', 0x84cc16);
      const spineGeo = SharedAssets.getGeometry('ce_ts_spine', () => new THREE.ConeGeometry(0.08, 0.4, 4));
      for (let i = -0.5; i <= 0.5; i += 0.25) {
        const spine = this.addMesh(group, meshes, spineGeo, quillMat);
        spine.rotation.x = -Math.PI / 4;
        spine.position.set(0, 0.9, i);
      }

      const head = this.addMesh(
        group,
        meshes,
        SharedAssets.getGeometry('ce_ts_head', () => new THREE.ConeGeometry(0.3, 0.6, 5)),
        mat
      );
      head.rotation.x = Math.PI / 2;
      head.position.set(0, 0.6, 0.9);

      const eyeMat = this.basicMat('thorn_eye', 0xef4444);
      const eyeGeo = SharedAssets.getGeometry('ce_ts_eye', () => new THREE.SphereGeometry(0.08, 6, 6));
      const eyeL = this.addMesh(group, meshes, eyeGeo, eyeMat);
      eyeL.position.set(-0.16, 0.7, 1.0);
      const eyeR = this.addMesh(group, meshes, eyeGeo, eyeMat);
      eyeR.position.set(0.16, 0.7, 1.0);
    } else if (type === 'ruin_automaton') {
      health = 160;
      baseSpeed = 3.2;
      aggroRadius = 11.0;
      attackRange = 3.5;
      damage = 28;
      telegraphRadius = 4.2;
      telegraphDuration = 1.3;

      const bronzeMat = this.mat('auto_bronze', 0xb45309, { roughness: 0.5, metalness: 0.8 });
      const chest = this.addMesh(
        group,
        meshes,
        SharedAssets.getGeometry('ce_ra_chest', () => new THREE.CylinderGeometry(0.7, 0.5, 1.2, 8)),
        bronzeMat
      );
      chest.position.set(0, 1.3, 0);

      const eyeMat = this.basicMat('auto_eye', 0x06b6d4);
      const eye = this.addMesh(
        group,
        meshes,
        SharedAssets.getGeometry('ce_ra_eye', () => new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8)),
        eyeMat
      );
      eye.rotation.x = Math.PI / 2;
      eye.position.set(0, 1.5, 0.55);

      const armMat = this.mat('auto_arm', 0x3f3f46, { roughness: 0.7 });
      const armL = this.addMesh(
        group,
        meshes,
        SharedAssets.getGeometry('ce_ra_armL', () => new THREE.BoxGeometry(0.3, 1.0, 0.3)),
        armMat
      );
      armL.position.set(-0.9, 1.1, 0);

      const armR = this.addMesh(
        group,
        meshes,
        SharedAssets.getGeometry('ce_ra_armR', () => new THREE.BoxGeometry(0.4, 1.1, 0.4)),
        armMat
      );
      armR.position.set(0.9, 1.0, 0);

      const legGeo = SharedAssets.getGeometry('ce_ra_leg', () => new THREE.BoxGeometry(0.35, 0.9, 0.35));
      const legL = this.addMesh(group, meshes, legGeo, bronzeMat);
      legL.position.set(-0.4, 0.45, 0);
      const legR = this.addMesh(group, meshes, legGeo, bronzeMat);
      legR.position.set(0.4, 0.45, 0);
    } else if (type === 'razorwing_raptor') {
      health = 90;
      baseSpeed = 7.5;
      aggroRadius = 16.0;
      attackRange = 3.0;
      damage = 22;
      altitudeOffset = 4.5;
      telegraphRadius = 3.0;
      telegraphDuration = 0.9;

      const featherMat = this.mat('rw_feather', 0x0284c7, { roughness: 0.3, metalness: 0.5 });
      const body = this.addMesh(
        group,
        meshes,
        SharedAssets.getGeometry('ce_rw_body', () => new THREE.ConeGeometry(0.4, 1.6, 6)),
        featherMat
      );
      body.rotation.x = Math.PI / 2;

      const wingMat = this.mat('rw_wing', 0x38bdf8, {
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.8,
        side: THREE.DoubleSide,
      });
      const wingGeo = SharedAssets.getGeometry('ce_rw_wing', () => new THREE.BoxGeometry(1.8, 0.05, 0.6));
      const wingL = this.addMesh(group, meshes, wingGeo, wingMat);
      wingL.position.set(-1.0, 0.1, 0);
      wingL.rotation.z = -0.15;
      const wingR = this.addMesh(group, meshes, wingGeo, wingMat);
      wingR.position.set(1.0, 0.1, 0);
      wingR.rotation.z = 0.15;

      const talonMat = this.basicMat('rw_talon', 0xfacc15);
      const talonGeo = SharedAssets.getGeometry('ce_rw_talon', () => new THREE.ConeGeometry(0.08, 0.35, 4));
      const talonL = this.addMesh(group, meshes, talonGeo, talonMat);
      talonL.position.set(-0.25, -0.4, 0.2);
      const talonR = this.addMesh(group, meshes, talonGeo, talonMat);
      talonR.position.set(0.25, -0.4, 0.2);
    } else if (type === 'basalt_geo_brute') {
      health = 180;
      baseSpeed = 3.8;
      aggroRadius = 12.0;
      attackRange = 3.2;
      damage = 32;
      telegraphRadius = 3.8;
      telegraphDuration = 1.2;

      const rockMat = this.mat('bg_rock', 0x27272a, { roughness: 0.95, metalness: 0.2 });
      const shell = this.addMesh(
        group,
        meshes,
        SharedAssets.getGeometry('ce_bg_shell', () => new THREE.DodecahedronGeometry(0.9, 1)),
        rockMat
      );
      shell.position.set(0, 0.85, 0);

      const magmaMat = this.basicMat('bg_magma', 0xf97316);
      const magmaCore = this.addMesh(
        group,
        meshes,
        SharedAssets.getGeometry('ce_bg_core', () => new THREE.IcosahedronGeometry(0.5, 0)),
        magmaMat
      );
      magmaCore.position.set(0, 0.85, 0);

      const footGeo = SharedAssets.getGeometry('ce_bg_foot', () => new THREE.BoxGeometry(0.4, 0.3, 0.4));
      for (const pos of [[-0.5, 0.2, 0.4], [0.5, 0.2, 0.4], [-0.5, 0.2, -0.4], [0.5, 0.2, -0.4]]) {
        const foot = this.addMesh(group, meshes, footGeo, rockMat);
        foot.position.set(pos[0], pos[1], pos[2]);
      }
    } else if (type === 'voidborn_aberration') {
      health = 110;
      baseSpeed = 4.8;
      aggroRadius = 15.0;
      attackRange = 4.0;
      damage = 25;
      altitudeOffset = 1.2;
      telegraphRadius = 3.5;
      telegraphDuration = 0.9;

      const voidMat = this.mat('vb_core', 0x581c87, {
        emissive: 0x3b0764,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.9,
      });
      const core = this.addMesh(
        group,
        meshes,
        SharedAssets.getGeometry('ce_vb_core', () => new THREE.OctahedronGeometry(0.65, 0)),
        voidMat
      );
      core.position.set(0, 1.2, 0);

      const shardMat = this.basicMat('vb_shard', 0xc084fc);
      const shardGeo = SharedAssets.getGeometry('ce_vb_shard', () => new THREE.TetrahedronGeometry(0.2, 0));
      for (let i = 0; i < 3; i++) {
        const shard = this.addMesh(group, meshes, shardGeo, shardMat);
        const ang = (i * Math.PI * 2) / 3;
        shard.position.set(Math.cos(ang) * 1.1, 1.2 + (i % 2 === 0 ? 0.2 : -0.2), Math.sin(ang) * 1.1);
      }
    }

    // Shared telegraph RingGeometry scaled by telegraphRadius
    const ringGeo = SharedAssets.getGeometry('ce_telegraph_ring', () => {
      const g = new THREE.RingGeometry(0.85, 1.0, 24);
      g.rotateX(-Math.PI / 2);
      return g;
    });
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const telegraphMesh = new THREE.Mesh(ringGeo, ringMat);
    telegraphMesh.position.set(0, 0.05, 0);
    telegraphMesh.visible = false;
    group.add(telegraphMesh);

    return {
      id,
      type,
      name,
      group,
      homePos: new THREE.Vector3(x, y, z),
      currentPos: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(),
      rotationY: 0,
      health,
      maxHealth: health,
      state: 'IDLE',
      stateTimer: Math.random() * 3,
      attackCooldown: 0,
      telegraphTimer: 0,
      telegraphDuration,
      telegraphRadius,
      telegraphMesh,
      hitFlashTimer: 0,
      isFlashing: false,
      isDead: false,
      respawnAtMs: 0,
      baseSpeed,
      aggroRadius,
      attackRange,
      damage,
      altitudeOffset,
      meshes,
      streamVisible: true,
      cappedEnabled,
    };
  }

  public syncStreaming(isVisible: (x: number, z: number) => boolean): void {
    for (const enemy of this.enemies) {
      enemy.streamVisible = isVisible(enemy.currentPos.x, enemy.currentPos.z);
      if (!enemy.isDead) {
        enemy.group.visible = enemy.cappedEnabled && enemy.streamVisible;
      }
    }
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    onPlayerDamage: (dmg: number) => void
  ): void {
    this.animTime += dt;
    if (this.playerInvulnerableTimer > 0) {
      this.playerInvulnerableTimer = Math.max(0, this.playerInvulnerableTimer - dt);
    }

    // Update active floating damage text pool entries
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.pos.y += dt * 1.5;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    const now = Date.now();
    const maxSimDistSq = 55 * 55;

    for (const enemy of this.enemies) {
      // Timestamp-based respawn (persists across chunk unload & page reload)
      if (enemy.isDead) {
        if (enemy.respawnAtMs > 0 && now >= enemy.respawnAtMs) {
          enemy.isDead = false;
          enemy.respawnAtMs = 0;
          enemy.health = enemy.maxHealth;
          enemy.state = 'IDLE';
          enemy.currentPos.copy(enemy.homePos);
          enemy.group.position.copy(enemy.homePos);
          enemy.group.scale.set(1, 1, 1);
          enemy.group.visible = enemy.cappedEnabled && enemy.streamVisible;
          this.scene.add(enemy.group);
          this.worldStateStore?.clearEnemyDefeated(
            this.regionId,
            enemy.homePos.x,
            enemy.homePos.z,
            enemy.id
          );
        }
        continue;
      }

      if (!enemy.cappedEnabled || !enemy.streamVisible) {
        enemy.group.visible = false;
        continue;
      }

      const distSqToPlayer = enemy.currentPos.distanceToSquared(playerPos);
      if (distSqToPlayer > maxSimDistSq) {
        enemy.group.visible = false;
        continue;
      }
      enemy.group.visible = true;

      const distToPlayer = Math.sqrt(distSqToPlayer);

      if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt;
      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= dt;
        if (enemy.hitFlashTimer <= 0 && enemy.isFlashing) {
          enemy.isFlashing = false;
          for (const m of enemy.meshes) {
            if ((m as any).__origMat) {
              m.material = (m as any).__origMat;
            }
          }
        }
      }

      if (enemy.telegraphMesh) {
        const tMat = enemy.telegraphMesh.material as THREE.MeshBasicMaterial;
        if (enemy.state === 'WINDUP') {
          enemy.telegraphMesh.visible = true;
          const progress = Math.min(1.0, enemy.telegraphTimer / enemy.telegraphDuration);
          tMat.opacity = 0.3 + progress * 0.5;
          const scale = Math.max(0.2, progress) * enemy.telegraphRadius;
          enemy.telegraphMesh.scale.set(scale, 1, scale);
        } else {
          enemy.telegraphMesh.visible = false;
          tMat.opacity = 0;
        }
      }

      switch (enemy.state) {
        case 'IDLE':
        case 'PATROL': {
          enemy.stateTimer -= dt;
          if (distToPlayer <= enemy.aggroRadius) {
            enemy.state = 'STALK';
            enemy.stateTimer = 0;
            break;
          }

          if (enemy.stateTimer <= 0) {
            enemy.state = enemy.state === 'IDLE' ? 'PATROL' : 'IDLE';
            enemy.stateTimer = 2.0 + Math.random() * 3.0;
            if (enemy.state === 'PATROL') {
              const angle = Math.random() * Math.PI * 2;
              const wanderDist = 3.0 + Math.random() * 4.0;
              const targetX = enemy.homePos.x + Math.cos(angle) * wanderDist;
              const targetZ = enemy.homePos.z + Math.sin(angle) * wanderDist;
              const dx = targetX - enemy.currentPos.x;
              const dz = targetZ - enemy.currentPos.z;
              enemy.rotationY = Math.atan2(dx, dz);
            }
          }

          if (enemy.state === 'PATROL') {
            const speed = enemy.baseSpeed * 0.35;
            enemy.velocity.x = Math.sin(enemy.rotationY) * speed;
            enemy.velocity.z = Math.cos(enemy.rotationY) * speed;
          } else {
            enemy.velocity.x *= 0.8;
            enemy.velocity.z *= 0.8;
          }
          break;
        }

        case 'STALK': {
          const dx = playerPos.x - enemy.currentPos.x;
          const dz = playerPos.z - enemy.currentPos.z;
          enemy.rotationY = Math.atan2(dx, dz);

          const distFromHome = enemy.currentPos.distanceTo(enemy.homePos);
          if (distFromHome > 28.0 || distToPlayer > enemy.aggroRadius * 1.6) {
            enemy.state = 'IDLE';
            enemy.stateTimer = 2.0;
            break;
          }

          if (distToPlayer > enemy.attackRange) {
            const speed = enemy.baseSpeed;
            enemy.velocity.x = Math.sin(enemy.rotationY) * speed;
            enemy.velocity.z = Math.cos(enemy.rotationY) * speed;
          } else {
            enemy.velocity.x = 0;
            enemy.velocity.z = 0;
            if (enemy.attackCooldown <= 0) {
              enemy.state = 'WINDUP';
              enemy.telegraphTimer = 0;
            }
          }
          break;
        }

        case 'WINDUP': {
          enemy.telegraphTimer += dt;
          enemy.velocity.x *= 0.5;
          enemy.velocity.z *= 0.5;

          if (enemy.type === 'razorwing_raptor') {
            enemy.altitudeOffset = THREE.MathUtils.damp(enemy.altitudeOffset, 7.5, 4, dt);
          } else if (enemy.type === 'basalt_geo_brute') {
            enemy.group.scale.set(1.1, 0.85, 1.1);
          }

          if (enemy.telegraphTimer >= enemy.telegraphDuration) {
            enemy.state = 'ATTACK';
            enemy.stateTimer = 0.4;

            if (enemy.type === 'thornstalker') {
              const leapSpeed = enemy.baseSpeed * 2.2;
              enemy.velocity.x = Math.sin(enemy.rotationY) * leapSpeed;
              enemy.velocity.z = Math.cos(enemy.rotationY) * leapSpeed;
              enemy.velocity.y = 4.5;
            } else if (enemy.type === 'razorwing_raptor') {
              const diveSpeed = enemy.baseSpeed * 2.5;
              enemy.velocity.x = Math.sin(enemy.rotationY) * diveSpeed;
              enemy.velocity.z = Math.cos(enemy.rotationY) * diveSpeed;
              enemy.altitudeOffset = 0.5;
            } else if (enemy.type === 'basalt_geo_brute') {
              const chargeSpeed = enemy.baseSpeed * 2.0;
              enemy.velocity.x = Math.sin(enemy.rotationY) * chargeSpeed;
              enemy.velocity.z = Math.cos(enemy.rotationY) * chargeSpeed;
              enemy.group.scale.set(1, 1, 1);
            } else if (enemy.type === 'voidborn_aberration') {
              const flankAngle = enemy.rotationY + (Math.random() > 0.5 ? 1.2 : -1.2);
              enemy.currentPos.x = playerPos.x + Math.sin(flankAngle) * 2.0;
              enemy.currentPos.z = playerPos.z + Math.cos(flankAngle) * 2.0;
            }
          }
          break;
        }

        case 'ATTACK': {
          enemy.stateTimer -= dt;

          if (distToPlayer <= enemy.attackRange + 0.5 && this.playerInvulnerableTimer <= 0) {
            this.playerInvulnerableTimer = 0.35;
            onPlayerDamage(enemy.damage);
            AudioService.playDamage();
            NotificationSystem.notify(
              'Under Attack!',
              `${enemy.name} struck you for ${enemy.damage} damage!`,
              'danger',
              2000
            );
          }

          if (enemy.stateTimer <= 0) {
            enemy.state = 'RECOVER';
            enemy.stateTimer = 0.8 + Math.random() * 0.4;
            enemy.attackCooldown = 2.5 + Math.random() * 1.5;
            if (enemy.type === 'razorwing_raptor') {
              enemy.altitudeOffset = 4.5;
            }
          }
          break;
        }

        case 'RECOVER': {
          enemy.stateTimer -= dt;
          enemy.velocity.x *= 0.8;
          enemy.velocity.z *= 0.8;
          if (enemy.stateTimer <= 0) {
            enemy.state = 'STALK';
          }
          break;
        }
      }

      enemy.currentPos.x += enemy.velocity.x * dt;
      enemy.currentPos.z += enemy.velocity.z * dt;
      enemy.currentPos.y += enemy.velocity.y * dt;

      const groundY = this.getTerrainHeight(enemy.currentPos.x, enemy.currentPos.z) + enemy.altitudeOffset;
      if (enemy.currentPos.y <= groundY) {
        enemy.currentPos.y = groundY;
        enemy.velocity.y = 0;
      } else {
        enemy.velocity.y -= 18.0 * dt;
      }

      enemy.group.position.copy(enemy.currentPos);
      enemy.group.rotation.y = enemy.rotationY;

      if (enemy.type === 'voidborn_aberration' || enemy.type === 'razorwing_raptor') {
        enemy.group.position.y += Math.sin(this.animTime * 5.0) * 0.15;
      }
    }
  }

  public handlePlayerAttack(
    playerPos: THREE.Vector3,
    playerFacing: number,
    baseDamage: number
  ): { hitCount: number; defeatedCount: number } {
    let hitCount = 0;
    let defeatedCount = 0;

    const hitRange = 3.8;
    _forwardVec.set(Math.sin(playerFacing), 0, Math.cos(playerFacing));

    for (const enemy of this.enemies) {
      if (enemy.isDead || !enemy.cappedEnabled) continue;

      _toEnemy.subVectors(enemy.currentPos, playerPos);
      const dist = _toEnemy.length();

      if (dist <= hitRange) {
        _toEnemy.y = 0;
        _toEnemy.normalize();
        const dot = _forwardVec.dot(_toEnemy);

        if (dot > 0.15 || dist < 1.5) {
          hitCount++;
          const finalDamage = Math.round(baseDamage * (0.9 + Math.random() * 0.25));
          enemy.health -= finalDamage;

          enemy.hitFlashTimer = 0.15;
          enemy.isFlashing = true;
          for (const m of enemy.meshes) {
            m.material = this.flashMaterial;
          }

          enemy.velocity.x += _forwardVec.x * 4.5;
          enemy.velocity.z += _forwardVec.z * 4.5;

          AudioService.playHit();

          // Acquire slot from pre-allocated damage text pool
          const ft = this.floatingPool[this.floatingPoolCursor];
          this.floatingPoolCursor = (this.floatingPoolCursor + 1) % DAMAGE_POOL_SIZE;
          ft.text = `-${finalDamage}`;
          ft.color = '#f87171';
          ft.pos.set(enemy.currentPos.x, enemy.currentPos.y + 1.2, enemy.currentPos.z);
          ft.life = 0.8;
          ft.maxLife = 0.8;
          if (!this.floatingTexts.includes(ft)) {
            this.floatingTexts.push(ft);
          }

          if (enemy.health <= 0) {
            enemy.isDead = true;
            enemy.state = 'DEAD';
            defeatedCount++;
            this.handleEnemyDefeat(enemy);
          }
        }
      }
    }

    return { hitCount, defeatedCount };
  }

  private handleEnemyDefeat(enemy: EnemyInstance): void {
    AudioService.playRelicCollect();
    enemy.group.scale.set(0.1, 0.1, 0.1);
    enemy.group.visible = false;
    this.scene.remove(enemy.group);

    const now = Date.now();
    enemy.respawnAtMs = now + RESPAWN_DURATION_MS;
    this.worldStateStore?.setEnemyDefeated(
      this.regionId,
      enemy.homePos.x,
      enemy.homePos.z,
      enemy.id,
      now
    );

    const loot = rollLoot(enemy.type, true, false);
    if (loot.coins > 0) this.inventory.addCoins(loot.coins);
    if (loot.xp > 0) this.quests.addExplorationXp(loot.xp);

    const dropNames: string[] = [];
    for (const item of loot.items) {
      const def = getItemDef(item.itemId);
      if (def) {
        this.inventory.addItem(item.itemId, item.quantity);
        dropNames.push(`${item.quantity}x ${def.name}`);
        this.quests.reportProgress('COLLECT', item.itemId, item.quantity);
      }
    }

    const lootSummary = dropNames.length > 0 ? dropNames.join(', ') : 'Minor Scraps';
    NotificationSystem.notify(
      `Defeated ${enemy.name}!`,
      `+${loot.coins} Coins, +${loot.xp} XP. Looted: ${lootSummary}`,
      'discovery',
      4500
    );

    this.achievements.unlock('ach_combat_victor');
  }

  public getVisibleCount(): number {
    let count = 0;
    for (const e of this.enemies) {
      if (!e.isDead && e.group.visible) count++;
    }
    return count;
  }

  public getNearestEnemy(playerPos: THREE.Vector3, maxDist: number): EnemyInstance | null {
    let nearest: EnemyInstance | null = null;
    let minDistSq = maxDist * maxDist;

    for (const enemy of this.enemies) {
      if (enemy.isDead || !enemy.cappedEnabled) continue;
      const dSq = enemy.currentPos.distanceToSquared(playerPos);
      if (dSq < minDistSq) {
        minDistSq = dSq;
        nearest = enemy;
      }
    }
    return nearest;
  }

  public clear(): void {
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.group);
      SharedAssets.disposeObject3DSafe(enemy.group);
    }
    this.enemies = [];
    this.floatingTexts.length = 0;
  }

  public dispose(): void {
    this.clear();
  }
}
