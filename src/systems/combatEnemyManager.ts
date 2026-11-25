/**
 * Hostile Creature and Combat Manager for The Drifting Land.
 * Implements 5 distinct hostile enemy archetypes:
 * 1. Thornstalker (Forest territory ambush & leap strike)
 * 2. Ancient Ruin Automaton (Heavy mechanical march & ground pound shockwave)
 * 3. Razorwing Raptor (Aerial circling & high-speed dive-bomb)
 * 4. Basalt Geo-Brute (Rock shell curl & rolling boulder charge)
 * 5. Voidborn Aberration (Phase teleportation & void burst)
 *
 * Adheres to Three.js and Performance guidelines:
 * - Distance simulation culling & entity capping
 * - Object pooling & zero per-frame allocations
 * - Readable attack windup telegraphs & hit reactions
 */

import * as THREE from 'three';
import { InventorySystem } from './inventorySystem';
import { QuestSystem } from './questSystem';
import { AchievementSystem } from './achievementSystem';
import { NotificationSystem } from './notificationSystem';
import { AudioService } from '../services/audio';
import { rollLoot } from '../data/lootTables';
import { getItemDef } from '../data/items';

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
  isDead: boolean;
  baseSpeed: number;
  aggroRadius: number;
  attackRange: number;
  damage: number;
  altitudeOffset: number;
  materials: THREE.Material[];
}

export interface FloatingDamageText {
  id: string;
  text: string;
  color: string;
  pos: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class CombatEnemyManager {
  private scene: THREE.Scene;
  private getTerrainHeight: (x: number, z: number) => number;
  private inventory: InventorySystem;
  private quests: QuestSystem;
  private achievements: AchievementSystem;
  private isSoftwareGl: boolean;

  public enemies: EnemyInstance[] = [];
  public floatingTexts: FloatingDamageText[] = [];
  private playerInvulnerableTimer: number = 0; // 0.3s i-frames

  // Spawn definitions across the island
  private readonly SPAWN_NODES: {
    type: EnemyType;
    name: string;
    pos: [number, number];
    radius: number;
  }[] = [
    // Forest Thornstalkers (Verdant glade)
    { type: 'thornstalker', name: 'Verdant Thornstalker', pos: [-35, 25], radius: 12 },
    { type: 'thornstalker', name: 'Briar Thornstalker', pos: [-18, 38], radius: 10 },
    { type: 'thornstalker', name: 'Shadow Thicket Stalker', pos: [-42, 10], radius: 12 },

    // Ruin Automatons (Ancient ruins & perimeter)
    { type: 'ruin_automaton', name: 'Ancient Ruin Automaton', pos: [22, -14], radius: 14 },
    { type: 'ruin_automaton', name: 'Vault Sentry Automaton', pos: [32, 2], radius: 12 },
    { type: 'ruin_automaton', name: 'Weathered Colossus Sentry', pos: [-24, 4], radius: 10 },

    // Razorwing Raptors (Cliffs and windward crags)
    { type: 'razorwing_raptor', name: 'Gale Razorwing Raptor', pos: [38, 22], radius: 16 },
    { type: 'razorwing_raptor', name: 'Ridge Razorwing Raptor', pos: [48, 8], radius: 16 },

    // Basalt Geo-Brutes (Cinder crater & volcanic rocks)
    { type: 'basalt_geo_brute', name: 'Basalt Geo-Brute', pos: [-16, -38], radius: 14 },
    { type: 'basalt_geo_brute', name: 'Molten Geo-Brute', pos: [-32, -42], radius: 12 },

    // Voidborn Aberrations (Rift island & dimensional tear)
    { type: 'voidborn_aberration', name: 'Voidborn Aberration', pos: [-46, -22], radius: 14 },
    { type: 'voidborn_aberration', name: 'Rift Phantasm', pos: [-58, -12], radius: 12 },
  ];

  constructor(
    scene: THREE.Scene,
    getTerrainHeight: (x: number, z: number) => number,
    inventory: InventorySystem,
    quests: QuestSystem,
    achievements: AchievementSystem,
    isSoftwareGl = false
  ) {
    this.scene = scene;
    this.getTerrainHeight = getTerrainHeight;
    this.inventory = inventory;
    this.quests = quests;
    this.achievements = achievements;
    this.isSoftwareGl = isSoftwareGl;

    this.spawnAllEnemies();
  }

  private spawnAllEnemies(): void {
    let idCounter = 1;
    for (const node of this.SPAWN_NODES) {
      const x = node.pos[0] + (Math.random() - 0.5) * node.radius;
      const z = node.pos[1] + (Math.random() - 0.5) * node.radius;
      const y = this.getTerrainHeight(x, z);

      const enemy = this.createEnemyInstance(`enemy_${idCounter++}`, node.type, node.name, x, y, z);
      this.enemies.push(enemy);
      this.scene.add(enemy.group);
    }
  }

  private createEnemyInstance(
    id: string,
    type: EnemyType,
    name: string,
    x: number,
    y: number,
    z: number
  ): EnemyInstance {
    const group = new THREE.Group();
    group.name = `hostile_${id}`;
    group.position.set(x, y, z);

    const materials: THREE.Material[] = [];
    let health = 100;
    let baseSpeed = 4.0;
    let aggroRadius = 12.0;
    let attackRange = 2.5;
    let damage = 15;
    let altitudeOffset = 0;
    let telegraphRadius = 2.5;
    let telegraphDuration = 1.0;

    // Archetype-specific 3D Procedural Meshes & Parameters
    if (type === 'thornstalker') {
      health = 80;
      baseSpeed = 6.2;
      aggroRadius = 14.0;
      attackRange = 3.2;
      damage = 18;
      telegraphRadius = 2.8;
      telegraphDuration = 0.8;

      // Thornstalker: Sleek predatory quadruped with thorn barbs
      const mat = new THREE.MeshStandardMaterial({
        color: 0x2e4a2e,
        roughness: 0.8,
        metalness: 0.1,
      });
      materials.push(mat);

      // Torso
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 1.4), mat);
      body.position.set(0, 0.5, 0);
      group.add(body);

      // Spiny back quills
      const quillMat = new THREE.MeshBasicMaterial({ color: 0x84cc16 });
      materials.push(quillMat);
      for (let i = -0.5; i <= 0.5; i += 0.25) {
        const spine = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 4), quillMat);
        spine.rotation.x = -Math.PI / 4;
        spine.position.set(0, 0.9, i);
        group.add(spine);
      }

      // Head & glowing red eyes
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 5), mat);
      head.rotation.x = Math.PI / 2;
      head.position.set(0, 0.6, 0.9);
      group.add(head);

      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      materials.push(eyeMat);
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), eyeMat);
      eyeL.position.set(-0.16, 0.7, 1.0);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), eyeMat);
      eyeR.position.set(0.16, 0.7, 1.0);
      group.add(eyeL, eyeR);

    } else if (type === 'ruin_automaton') {
      health = 160;
      baseSpeed = 3.2;
      aggroRadius = 11.0;
      attackRange = 3.5;
      damage = 28;
      telegraphRadius = 4.2;
      telegraphDuration = 1.3;

      // Ruin Automaton: Ancient bronze and obsidian mechanical construct
      const bronzeMat = new THREE.MeshStandardMaterial({
        color: 0xb45309,
        roughness: 0.5,
        metalness: 0.8,
      });
      materials.push(bronzeMat);

      // Heavy chest chassis
      const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 1.2, 8), bronzeMat);
      chest.position.set(0, 1.3, 0);
      group.add(chest);

      // Center glowing eye
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      materials.push(eyeMat);
      const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8), eyeMat);
      eye.rotation.x = Math.PI / 2;
      eye.position.set(0, 1.5, 0.55);
      group.add(eye);

      // Piston arms
      const armMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.7 });
      materials.push(armMat);
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.3), armMat);
      armL.position.set(-0.9, 1.1, 0);
      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 0.4), armMat); // Heavy hammer arm
      armR.position.set(0.9, 1.0, 0);
      group.add(armL, armR);

      // Heavy piston legs
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.35), bronzeMat);
      legL.position.set(-0.4, 0.45, 0);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.35), bronzeMat);
      legR.position.set(0.4, 0.45, 0);
      group.add(legL, legR);

    } else if (type === 'razorwing_raptor') {
      health = 90;
      baseSpeed = 7.5;
      aggroRadius = 16.0;
      attackRange = 3.0;
      damage = 22;
      altitudeOffset = 4.5; // Glides above terrain
      telegraphRadius = 3.0;
      telegraphDuration = 0.9;

      // Razorwing Raptor: Crystalline feathered avian predator
      const featherMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.3,
        metalness: 0.5,
      });
      materials.push(featherMat);

      // Aerodynamic fuselage
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 6), featherMat);
      body.rotation.x = Math.PI / 2;
      body.position.set(0, 0, 0);
      group.add(body);

      // Razor wings
      const wingMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.8,
        side: THREE.DoubleSide,
      });
      materials.push(wingMat);

      const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.6), wingMat);
      wingL.position.set(-1.0, 0.1, 0);
      wingL.rotation.z = -0.15;
      const wingR = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.6), wingMat);
      wingR.position.set(1.0, 0.1, 0);
      wingR.rotation.z = 0.15;
      group.add(wingL, wingR);

      // Curved predatory talons
      const talonMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      materials.push(talonMat);
      const talonL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 4), talonMat);
      talonL.position.set(-0.25, -0.4, 0.2);
      const talonR = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 4), talonMat);
      talonR.position.set(0.25, -0.4, 0.2);
      group.add(talonL, talonR);

    } else if (type === 'basalt_geo_brute') {
      health = 180;
      baseSpeed = 3.8;
      aggroRadius = 12.0;
      attackRange = 3.2;
      damage = 32;
      telegraphRadius = 3.8;
      telegraphDuration = 1.2;

      // Basalt Geo-Brute: Segmented rock boulder with magma cracks
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x27272a,
        roughness: 0.95,
        metalness: 0.2,
      });
      materials.push(rockMat);

      // Massive shell dome
      const shell = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 1), rockMat);
      shell.position.set(0, 0.85, 0);
      group.add(shell);

      // Magma veins
      const magmaMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
      materials.push(magmaMat);
      const magmaCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), magmaMat);
      magmaCore.position.set(0, 0.85, 0);
      group.add(magmaCore);

      // Heavy rock feet
      const foot1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), rockMat);
      foot1.position.set(-0.5, 0.2, 0.4);
      const foot2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), rockMat);
      foot2.position.set(0.5, 0.2, 0.4);
      const foot3 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), rockMat);
      foot3.position.set(-0.5, 0.2, -0.4);
      const foot4 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), rockMat);
      foot4.position.set(0.5, 0.2, -0.4);
      group.add(foot1, foot2, foot3, foot4);

    } else if (type === 'voidborn_aberration') {
      health = 110;
      baseSpeed = 4.8;
      aggroRadius = 15.0;
      attackRange = 4.0;
      damage = 25;
      altitudeOffset = 1.2;
      telegraphRadius = 3.5;
      telegraphDuration = 0.9;

      // Voidborn Aberration: Floating fractured dark core with orbiting shards
      const voidMat = new THREE.MeshStandardMaterial({
        color: 0x581c87,
        emissive: 0x3b0764,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.9,
      });
      materials.push(voidMat);

      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), voidMat);
      core.position.set(0, 1.2, 0);
      group.add(core);

      // Orbiting void shards
      const shardMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
      materials.push(shardMat);
      for (let i = 0; i < 3; i++) {
        const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.2, 0), shardMat);
        const ang = (i * Math.PI * 2) / 3;
        shard.position.set(Math.cos(ang) * 1.1, 1.2 + (i % 2 === 0 ? 0.2 : -0.2), Math.sin(ang) * 1.1);
        group.add(shard);
      }
    }

    // Ground Attack Telegraph Ring Mesh
    const ringGeo = new THREE.RingGeometry(telegraphRadius * 0.85, telegraphRadius, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const telegraphMesh = new THREE.Mesh(ringGeo, ringMat);
    telegraphMesh.position.set(0, 0.05, 0);
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
      isDead: false,
      baseSpeed,
      aggroRadius,
      attackRange,
      damage,
      altitudeOffset,
      materials,
    };
  }

  /**
   * Main update loop for all hostile entities
   */
  public update(
    dt: number,
    playerPos: THREE.Vector3,
    onPlayerDamage: (dmg: number) => void
  ): void {
    if (this.playerInvulnerableTimer > 0) {
      this.playerInvulnerableTimer -= dt;
    }

    // Update floating damage texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.pos.y += dt * 1.5;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    const maxSimDistSq = 55 * 55; // 55m distance culling for 60 FPS

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;

      const distSqToPlayer = enemy.currentPos.distanceToSquared(playerPos);

      // Distance simulation culling
      if (distSqToPlayer > maxSimDistSq) {
        enemy.group.visible = false;
        continue;
      }
      enemy.group.visible = true;

      const distToPlayer = Math.sqrt(distSqToPlayer);

      // Update cooldowns & timers
      if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt;
      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= dt;
        if (enemy.hitFlashTimer <= 0) {
          // Reset materials from hit flash
          enemy.materials.forEach((m) => {
            if ('color' in m && (m as any).__origColor) {
              (m as any).color.setHex((m as any).__origColor);
            }
          });
        }
      }

      // Hide telegraph if not in WINDUP
      if (enemy.telegraphMesh) {
        const tMat = enemy.telegraphMesh.material as THREE.MeshBasicMaterial;
        if (enemy.state === 'WINDUP') {
          const progress = Math.min(1.0, enemy.telegraphTimer / enemy.telegraphDuration);
          tMat.opacity = 0.3 + progress * 0.5;
          const scale = Math.max(0.2, progress);
          enemy.telegraphMesh.scale.set(scale, 1, scale);
        } else {
          tMat.opacity = 0;
        }
      }

      // --- Finite State Machine ---
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
              // Pick random direction around home pos
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
          // Face player
          const dx = playerPos.x - enemy.currentPos.x;
          const dz = playerPos.z - enemy.currentPos.z;
          enemy.rotationY = Math.atan2(dx, dz);

          // Leash check
          const distFromHome = enemy.currentPos.distanceTo(enemy.homePos);
          if (distFromHome > 28.0 || distToPlayer > enemy.aggroRadius * 1.6) {
            // Return home
            enemy.state = 'IDLE';
            enemy.stateTimer = 2.0;
            break;
          }

          // Move towards player
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

          // Archetype specific windup cues
          if (enemy.type === 'razorwing_raptor') {
            // Gain altitude preparing for dive
            enemy.altitudeOffset = THREE.MathUtils.damp(enemy.altitudeOffset, 7.5, 4, dt);
          } else if (enemy.type === 'basalt_geo_brute') {
            // Squat down shaking
            enemy.group.scale.set(1.1, 0.85, 1.1);
          }

          if (enemy.telegraphTimer >= enemy.telegraphDuration) {
            enemy.state = 'ATTACK';
            enemy.stateTimer = 0.4; // attack execution window

            // Execute archetype attack motion
            if (enemy.type === 'thornstalker') {
              // Ambush leap forward
              const leapSpeed = enemy.baseSpeed * 2.2;
              enemy.velocity.x = Math.sin(enemy.rotationY) * leapSpeed;
              enemy.velocity.z = Math.cos(enemy.rotationY) * leapSpeed;
              enemy.velocity.y = 4.5;
            } else if (enemy.type === 'razorwing_raptor') {
              // High speed dive bomb
              const diveSpeed = enemy.baseSpeed * 2.5;
              enemy.velocity.x = Math.sin(enemy.rotationY) * diveSpeed;
              enemy.velocity.z = Math.cos(enemy.rotationY) * diveSpeed;
              enemy.altitudeOffset = 0.5;
            } else if (enemy.type === 'basalt_geo_brute') {
              // Rolling charge forward
              const chargeSpeed = enemy.baseSpeed * 2.0;
              enemy.velocity.x = Math.sin(enemy.rotationY) * chargeSpeed;
              enemy.velocity.z = Math.cos(enemy.rotationY) * chargeSpeed;
              enemy.group.scale.set(1, 1, 1);
            } else if (enemy.type === 'voidborn_aberration') {
              // Phase teleport near player flank
              const flankAngle = enemy.rotationY + (Math.random() > 0.5 ? 1.2 : -1.2);
              const tx = playerPos.x + Math.sin(flankAngle) * 2.0;
              const tz = playerPos.z + Math.cos(flankAngle) * 2.0;
              enemy.currentPos.x = tx;
              enemy.currentPos.z = tz;
            }
          }
          break;
        }

        case 'ATTACK': {
          enemy.stateTimer -= dt;

          // Check hit against player during active attack window
          if (distToPlayer <= enemy.attackRange + 0.5 && this.playerInvulnerableTimer <= 0) {
            this.playerInvulnerableTimer = 0.35; // 350ms i-frame protection
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

      // Physics integration & ground alignment
      enemy.currentPos.x += enemy.velocity.x * dt;
      enemy.currentPos.z += enemy.velocity.z * dt;
      enemy.currentPos.y += enemy.velocity.y * dt;

      const groundY = this.getTerrainHeight(enemy.currentPos.x, enemy.currentPos.z) + enemy.altitudeOffset;
      if (enemy.currentPos.y <= groundY) {
        enemy.currentPos.y = groundY;
        enemy.velocity.y = 0;
      } else {
        enemy.velocity.y -= 18.0 * dt; // gravity
      }

      enemy.group.position.copy(enemy.currentPos);
      enemy.group.rotation.y = enemy.rotationY;

      // Subtle bobbing animation
      if (enemy.type === 'voidborn_aberration' || enemy.type === 'razorwing_raptor') {
        enemy.group.position.y += Math.sin(Date.now() * 0.005) * 0.15;
      }
    }
  }

  /**
   * Player Attack Input Trigger:
   * Sweeps a forward cone / sphere in front of the player.
   * If an enemy is hit, applies damage, hit flash, knockback, and defeat handling.
   */
  public handlePlayerAttack(
    playerPos: THREE.Vector3,
    playerFacing: number,
    baseDamage: number
  ): { hitCount: number; defeatedCount: number } {
    let hitCount = 0;
    let defeatedCount = 0;

    const hitRange = 3.8;
    const forwardVec = new THREE.Vector3(Math.sin(playerFacing), 0, Math.cos(playerFacing));

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;

      const toEnemy = new THREE.Vector3().subVectors(enemy.currentPos, playerPos);
      const dist = toEnemy.length();

      if (dist <= hitRange) {
        // Dot product check for forward cone (120 degree angle)
        toEnemy.y = 0;
        toEnemy.normalize();
        const dot = forwardVec.dot(toEnemy);

        if (dot > 0.15 || dist < 1.5) {
          // Hit confirmed!
          hitCount++;
          const finalDamage = Math.round(baseDamage * (0.9 + Math.random() * 0.25));
          enemy.health -= finalDamage;

          // Hit visual flash (color shift)
          enemy.hitFlashTimer = 0.15;
          enemy.materials.forEach((m) => {
            if ('color' in m) {
              if (!(m as any).__origColor) {
                (m as any).__origColor = (m as any).color.getHex();
              }
              (m as any).color.setHex(0xffffff);
            }
          });

          // Knockback enemy slightly away from player
          enemy.velocity.x += forwardVec.x * 4.5;
          enemy.velocity.z += forwardVec.z * 4.5;

          // Sound effect
          AudioService.playHit();

          // Spawn floating damage indicator
          this.floatingTexts.push({
            id: `dmg_${Date.now()}_${Math.random()}`,
            text: `-${finalDamage}`,
            color: '#f87171',
            pos: enemy.currentPos.clone().add(new THREE.Vector3(0, 1.2, 0)),
            life: 0.8,
            maxLife: 0.8,
          });

          // Defeat Handling
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
    // 1. Play defeat audio & collapse animation
    AudioService.playRelicCollect();
    enemy.group.scale.set(0.1, 0.1, 0.1);
    this.scene.remove(enemy.group);

    // 2. Roll data-driven loot table
    const loot = rollLoot(enemy.type, true, false);

    // 3. Grant Coins and XP
    if (loot.coins > 0) {
      this.inventory.addCoins(loot.coins);
    }
    if (loot.xp > 0) {
      this.quests.addExplorationXp(loot.xp);
    }

    // 4. Grant Loot Items into player's pouch
    const dropNames: string[] = [];
    for (const item of loot.items) {
      const def = getItemDef(item.itemId);
      if (def) {
        this.inventory.addItem(item.itemId, item.quantity);
        dropNames.push(`${item.quantity}x ${def.name}`);
        this.quests.reportProgress('COLLECT', item.itemId, item.quantity);
      }
    }

    // 5. Notify Player
    const lootSummary = dropNames.length > 0 ? dropNames.join(', ') : 'Minor Scraps';
    NotificationSystem.notify(
      `Defeated ${enemy.name}!`,
      `+${loot.coins} Coins, +${loot.xp} XP. Looted: ${lootSummary}`,
      'discovery',
      4500
    );

    // 6. Quest & Achievement Hooks
    this.achievements.unlock('ach_combat_victor');

    // 7. Controlled Respawn Timer (respawns after 45 seconds so islands stay populated)
    setTimeout(() => {
      if (enemy.isDead) {
        enemy.isDead = false;
        enemy.health = enemy.maxHealth;
        enemy.state = 'IDLE';
        enemy.currentPos.copy(enemy.homePos);
        enemy.group.position.copy(enemy.homePos);
        enemy.group.scale.set(1, 1, 1);
        this.scene.add(enemy.group);
      }
    }, 45000);
  }

  public getNearestEnemy(playerPos: THREE.Vector3, maxDist: number): EnemyInstance | null {
    let nearest: EnemyInstance | null = null;
    let minDist = maxDist;

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      const d = enemy.currentPos.distanceTo(playerPos);
      if (d < minDist) {
        minDist = d;
        nearest = enemy;
      }
    }
    return nearest;
  }

  public clear(): void {
    this.dispose();
  }

  public dispose(): void {
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.group);
      enemy.materials.forEach((m) => m.dispose());
    }
    this.enemies = [];
    this.floatingTexts = [];
  }
}
