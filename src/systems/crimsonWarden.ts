/**
 * Crimson Warden Boss Encounter & Red Moon Rift System.
 * - Spawns at the Shattered Rift Crater landmark ([-52, y, -45]) during Red Moon
 * - 3D procedural animated boss model with obsidian armor, glowing core, and floating blade
 * - Readable ground attack telegraph warning rings
 * - Phase 1 (100% - 50%) and Phase 2 Enraged (50% - 0%)
 * - Unique, non-duplicate reward claiming (Crimson Core, Warden's Blood Amulet)
 * - Safe leash and reset if player retreats
 */

import * as THREE from 'three';
import { CrimsonWardenState } from '../types/game';
import { NotificationSystem } from './notificationSystem';
import { AudioService } from '../services/audio';

export interface BossCallbacks {
  onBossStateChange: (state: CrimsonWardenState | null) => void;
  onPlayerDamage: (damage: number) => void;
  onBossDefeated: () => void;
}

export class CrimsonWardenEncounter {
  public group: THREE.Group;
  public riftGroup: THREE.Group;
  public arenaCenter: THREE.Vector3;
  private isSoftwareGl: boolean;
  private callbacks: BossCallbacks;

  // Boss state
  public state: CrimsonWardenState = {
    active: false,
    health: 600,
    maxHealth: 600,
    phase: 1,
    attackWarning: null,
    isDefeated: false,
  };

  // 3D Visual Meshes
  private bossMeshGroup: THREE.Group;
  private torsoMesh: THREE.Mesh;
  private coreMesh: THREE.Mesh;
  private swordMesh: THREE.Mesh;
  private auraLight: THREE.PointLight;

  // Attack telegraph ring mesh
  private telegraphMesh: THREE.Mesh;
  private telegraphMat: THREE.MeshBasicMaterial;

  // Rift Portal Meshes
  private riftCoreMesh: THREE.Mesh;
  private riftRing1: THREE.Mesh;
  private riftRing2: THREE.Mesh;
  private riftLight: THREE.PointLight;

  // Combat Timers
  private attackTimer: number = 0;
  private attackInterval: number = 3.8;
  private currentTelegraph: {
    type: 'CLEAVE' | 'NOVA';
    timer: number;
    duration: number;
    radius: number;
    x: number;
    z: number;
    damage: number;
  } | null = null;

  private isEngaged: boolean = false;
  private playerInvulnerableTimer: number = 0;

  constructor(
    scene: THREE.Scene,
    getTerrainHeight: (x: number, z: number) => number,
    callbacks: BossCallbacks,
    isDefeated = false,
    isSoftwareGl = false
  ) {
    this.callbacks = callbacks;
    this.isSoftwareGl = isSoftwareGl;
    this.state.isDefeated = isDefeated;

    // Arena location: Western Crater [-52, -45]
    const arenaX = -52;
    const arenaZ = -45;
    const arenaY = getTerrainHeight(arenaX, arenaZ);
    this.arenaCenter = new THREE.Vector3(arenaX, arenaY, arenaZ);

    this.group = new THREE.Group();
    this.group.name = 'crimson_warden_encounter';
    scene.add(this.group);

    // 1. Build Shattered Rift Portal & Obelisks
    this.riftGroup = new THREE.Group();
    this.riftGroup.position.copy(this.arenaCenter);
    this.group.add(this.riftGroup);

    // Basalt Rift Ring Pillars
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
      metalness: 0.2,
      flatShading: true,
    });

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const px = Math.cos(angle) * 8.5;
      const pz = Math.sin(angle) * 8.5;
      const h = 6 + (i % 3) * 2;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, h, 1.2), pillarMat);
      pillar.position.set(px, h / 2, pz);
      pillar.rotation.y = angle + 0.2;
      pillar.castShadow = !isSoftwareGl;
      this.riftGroup.add(pillar);

      // Crimson runic glow strip
      const rune = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, h * 0.7, 0.2),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      rune.position.set(px * 0.95, h / 2, pz * 0.95);
      this.riftGroup.add(rune);
    }

    // Swirling Void Rift Core
    const riftGeo = new THREE.OctahedronGeometry(2.2, 1);
    const riftMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0xef4444,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.9,
    });
    this.riftCoreMesh = new THREE.Mesh(riftGeo, riftMat);
    this.riftCoreMesh.position.set(0, 3.5, 0);
    this.riftGroup.add(this.riftCoreMesh);

    // Orbiting Rift Rings
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf87171,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    this.riftRing1 = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.12, 8, 24), ringMat);
    this.riftRing1.position.set(0, 3.5, 0);
    this.riftGroup.add(this.riftRing1);

    this.riftRing2 = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.14, 8, 24), ringMat);
    this.riftRing2.position.set(0, 3.5, 0);
    this.riftGroup.add(this.riftRing2);

    this.riftLight = new THREE.PointLight(0xef4444, 1.5, 30);
    this.riftLight.position.set(0, 4, 0);
    this.riftGroup.add(this.riftLight);

    // 2. Build Procedural Crimson Warden Boss Model
    this.bossMeshGroup = new THREE.Group();
    this.bossMeshGroup.position.copy(this.arenaCenter);
    this.bossMeshGroup.position.y += 0.5;
    this.group.add(this.bossMeshGroup);

    // Torso / Obsidian Cuirass
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.7,
      metalness: 0.8,
      flatShading: true,
    });
    this.torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 1.2), armorMat);
    this.torsoMesh.position.y = 2.4;
    this.torsoMesh.castShadow = !isSoftwareGl;
    this.bossMeshGroup.add(this.torsoMesh);

    // Horned Obsidian Mask / Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), armorMat);
    head.position.y = 3.9;
    this.bossMeshGroup.add(head);

    // Glowing Visor slit
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.15, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    visor.position.set(0, 3.9, 0.48);
    this.bossMeshGroup.add(visor);

    // Horns
    for (const sx of [-0.6, 0.6]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.1, 5), armorMat);
      horn.position.set(sx, 4.7, 0);
      horn.rotation.z = (sx > 0 ? -1 : 1) * 0.4;
      this.bossMeshGroup.add(horn);
    }

    // Glowing Crimson Void Core in chest
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.8,
    });
    this.coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), coreMat);
    this.coreMesh.position.set(0, 2.4, 0.5);
    this.bossMeshGroup.add(this.coreMesh);

    // Spiked Pauldrons (Shoulders)
    for (const sx of [-1.3, 1.3]) {
      const pauldron = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 4), armorMat);
      pauldron.position.set(sx, 3.3, 0);
      pauldron.rotation.z = (sx > 0 ? -1 : 1) * 0.5;
      this.bossMeshGroup.add(pauldron);
    }

    // Floating Greatsword
    const bladeGroup = new THREE.Group();
    bladeGroup.position.set(1.8, 2.2, 0);
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 3.8, 0.1),
      new THREE.MeshStandardMaterial({
        color: 0x991b1b,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.5,
        metalness: 0.9,
        roughness: 0.2,
      })
    );
    blade.position.y = 1.9;
    bladeGroup.add(blade);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.2), armorMat);
    guard.position.y = 0.1;
    bladeGroup.add(guard);

    this.swordMesh = bladeGroup as unknown as THREE.Mesh;
    this.bossMeshGroup.add(bladeGroup);

    // Boss Light Aura
    this.auraLight = new THREE.PointLight(0xef4444, 1.8, 18);
    this.auraLight.position.set(0, 2.8, 0);
    this.bossMeshGroup.add(this.auraLight);

    // 3. Ground Attack Telegraph Ring
    const teleGeo = new THREE.RingGeometry(0.2, 5.0, 32);
    teleGeo.rotateX(-Math.PI / 2);
    this.telegraphMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.telegraphMesh = new THREE.Mesh(teleGeo, this.telegraphMat);
    this.telegraphMesh.visible = false;
    scene.add(this.telegraphMesh);

    // Initial visibility
    this.bossMeshGroup.visible = false;
  }

  /**
   * Main update loop for boss combat AI and animation
   */
  update(
    delta: number,
    totalTime: number,
    playerPos: THREE.Vector3,
    isRedMoonActive: boolean,
    getTerrainHeight: (x: number, z: number) => number
  ): void {
    // 1. Animate Rift
    this.riftCoreMesh.rotation.y += delta * 1.5;
    this.riftCoreMesh.rotation.x += delta * 0.8;
    this.riftRing1.rotation.x += delta * 1.8;
    this.riftRing2.rotation.y += delta * 1.4;

    if (this.playerInvulnerableTimer > 0) {
      this.playerInvulnerableTimer -= delta;
    }

    // Only active during Red Moon and if not defeated
    if (!isRedMoonActive || this.state.isDefeated) {
      if (this.state.active) {
        this.despawnBoss();
      }
      this.riftGroup.visible = isRedMoonActive;
      return;
    }

    this.riftGroup.visible = true;

    // Check proximity to trigger encounter (within 35m of crater)
    const distToCrater = playerPos.distanceTo(this.arenaCenter);

    if (!this.state.active) {
      if (distToCrater < 32) {
        this.spawnBoss();
      }
      return;
    }

    // Leash check: If player retreats beyond 55m, boss resets
    if (distToCrater > 55) {
      this.resetEncounter();
      NotificationSystem.notify('Crimson Warden', 'The warden disengages as you flee the crater.', 'info');
      return;
    }

    // Combat AI Loop
    this.updateBossCombat(delta, totalTime, playerPos, getTerrainHeight);
  }

  private spawnBoss(): void {
    this.state.active = true;
    this.state.health = this.state.maxHealth;
    this.state.phase = 1;
    this.bossMeshGroup.position.copy(this.arenaCenter);
    this.bossMeshGroup.visible = true;
    this.isEngaged = true;
    this.attackTimer = 2.0; // Grace period before first attack

    AudioService.playBeaconActivate();
    NotificationSystem.notify(
      'Crimson Warden Awakened',
      'The dimensional sentinel emerges to purge the intruder!',
      'danger',
      6000
    );
    this.callbacks.onBossStateChange(this.state);
  }

  private resetEncounter(): void {
    this.state.active = false;
    this.state.health = this.state.maxHealth;
    this.state.phase = 1;
    this.bossMeshGroup.visible = false;
    this.cancelTelegraph();
    this.callbacks.onBossStateChange(null);
  }

  private despawnBoss(): void {
    this.state.active = false;
    this.bossMeshGroup.visible = false;
    this.cancelTelegraph();
    this.callbacks.onBossStateChange(null);
  }

  /**
   * Combat AI: Movement, Telegraphing, Attack execution
   */
  private updateBossCombat(
    delta: number,
    totalTime: number,
    playerPos: THREE.Vector3,
    getTerrainHeight: (x: number, z: number) => number
  ): void {
    const bossPos = this.bossMeshGroup.position;
    const distToPlayer = bossPos.distanceTo(playerPos);

    // Face player
    const targetAngle = Math.atan2(playerPos.x - bossPos.x, playerPos.z - bossPos.z);
    this.bossMeshGroup.rotation.y = THREE.MathUtils.lerp(this.bossMeshGroup.rotation.y, targetAngle, delta * 3.5);

    // Hover bobbing
    const groundY = getTerrainHeight(bossPos.x, bossPos.z);
    bossPos.y = groundY + 0.3 + Math.sin(totalTime * 2.5) * 0.25;

    // Movement toward player if outside melee range
    const desiredDist = 4.2;
    const moveSpeed = this.state.phase === 2 ? 6.5 : 4.5;

    if (distToPlayer > desiredDist) {
      const dirX = (playerPos.x - bossPos.x) / distToPlayer;
      const dirZ = (playerPos.z - bossPos.z) / distToPlayer;
      bossPos.x += dirX * moveSpeed * delta;
      bossPos.z += dirZ * moveSpeed * delta;
    }

    // Sword idle float animation
    this.swordMesh.rotation.z = Math.sin(totalTime * 3.0) * 0.15;
    this.swordMesh.position.y = 2.2 + Math.cos(totalTime * 2.0) * 0.2;

    // Phase 2 Enraged Visuals
    if (this.state.phase === 2) {
      (this.coreMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.5 + Math.sin(totalTime * 6) * 0.8;
      this.auraLight.intensity = 3.0;
    }

    // Attack Telegraph Lifecycle
    if (this.currentTelegraph) {
      this.currentTelegraph.timer += delta;
      const progress = Math.min(1.0, this.currentTelegraph.timer / this.currentTelegraph.duration);

      // Update 3D ground warning ring scale and pulsing red opacity
      this.telegraphMesh.visible = true;
      this.telegraphMesh.position.set(
        this.currentTelegraph.x,
        getTerrainHeight(this.currentTelegraph.x, this.currentTelegraph.z) + 0.15,
        this.currentTelegraph.z
      );

      const targetScale = this.currentTelegraph.radius / 5.0;
      this.telegraphMesh.scale.set(targetScale * progress, 1, targetScale * progress);
      this.telegraphMat.opacity = 0.3 + progress * 0.55;

      this.state.attackWarning = {
        type: this.currentTelegraph.type,
        progress,
        x: this.currentTelegraph.x,
        z: this.currentTelegraph.z,
        radius: this.currentTelegraph.radius,
      };
      this.callbacks.onBossStateChange(this.state);

      // Telegraph Completed -> Strike!
      if (progress >= 1.0) {
        this.executeAttack(playerPos);
      }
    } else {
      // Cooldown timer until next telegraphed attack
      this.attackTimer -= delta;
      if (this.attackTimer <= 0) {
        this.startRandomAttack(playerPos);
      }
    }
  }

  private startRandomAttack(playerPos: THREE.Vector3): void {
    // Phase 1 has Cleave; Phase 2 unlocks massive Dimensional Nova
    const isPhase2 = this.state.phase === 2;
    const chooseNova = isPhase2 && Math.random() < 0.55;

    if (chooseNova) {
      // Massive 10m Ground Nova centered on boss
      this.currentTelegraph = {
        type: 'NOVA',
        timer: 0,
        duration: 2.2, // Readable warning time
        radius: 9.5,
        x: this.bossMeshGroup.position.x,
        z: this.bossMeshGroup.position.z,
        damage: 40,
      };
      NotificationSystem.notify('Crimson Warden', 'Warning: Dimensional Nova preparing!', 'danger', 2500);
    } else {
      // 5.5m Cleave centered on player's position
      this.currentTelegraph = {
        type: 'CLEAVE',
        timer: 0,
        duration: 1.8,
        radius: 5.5,
        x: playerPos.x,
        z: playerPos.z,
        damage: 22,
      };
    }
  }

  private executeAttack(playerPos: THREE.Vector3): void {
    if (!this.currentTelegraph) return;

    const hitDist = Math.hypot(playerPos.x - this.currentTelegraph.x, playerPos.z - this.currentTelegraph.z);

    // Audio feedback for attack impact
    AudioService.playDash();

    if (hitDist <= this.currentTelegraph.radius && this.playerInvulnerableTimer <= 0) {
      this.callbacks.onPlayerDamage(this.currentTelegraph.damage);
      this.playerInvulnerableTimer = 1.0;
      NotificationSystem.notify(
        'Hit!',
        `Took ${this.currentTelegraph.damage} damage from ${this.currentTelegraph.type}!`,
        'danger',
        2500
      );
    }

    this.cancelTelegraph();
    this.attackTimer = this.state.phase === 2 ? 2.5 : 3.8;
  }

  private cancelTelegraph(): void {
    this.currentTelegraph = null;
    this.telegraphMesh.visible = false;
    this.state.attackWarning = null;
    this.callbacks.onBossStateChange(this.state);
  }

  /**
   * Player attacks the Crimson Warden (Action key / click)
   */
  public playerAttack(playerPos: THREE.Vector3): boolean {
    if (!this.state.active || this.state.isDefeated) return false;

    const dist = this.bossMeshGroup.position.distanceTo(playerPos);
    if (dist > 6.0) return false; // Out of melee attack range

    // Deal damage
    const damage = Math.floor(Math.random() * 25) + 40; // 40-64 damage per strike
    this.state.health = Math.max(0, this.state.health - damage);

    // Sound and visual reaction
    AudioService.playRelicCollect();
    NotificationSystem.notify('Strike!', `Dealt ${damage} damage to Crimson Warden!`, 'info', 1800);

    // Phase transition check at 50% HP (300 HP)
    if (this.state.health <= 300 && this.state.phase === 1) {
      this.state.phase = 2;
      NotificationSystem.notify(
        'Crimson Warden Enraged!',
        'The warden unlocks the Void Seal! Speed and attack power surge!',
        'danger',
        6000
      );
      AudioService.playBeaconActivate();
    }

    // Check defeat
    if (this.state.health <= 0) {
      this.handleDefeat();
    } else {
      this.callbacks.onBossStateChange(this.state);
    }

    return true;
  }

  private handleDefeat(): void {
    this.state.isDefeated = true;
    this.state.active = false;
    this.bossMeshGroup.visible = false;
    this.cancelTelegraph();

    NotificationSystem.notify(
      'Crimson Warden Slain!',
      'The dimensional protector collapses into cosmic dust! Claim your spoils!',
      'discovery',
      8000
    );

    AudioService.playBeaconActivate();
    this.callbacks.onBossDefeated();
    this.callbacks.onBossStateChange(null);
  }

  public getBossPosition(): THREE.Vector3 {
    return this.bossMeshGroup.position;
  }

  dispose(): void {
    this.telegraphMesh.geometry.dispose();
    this.telegraphMat.dispose();
  }
}
