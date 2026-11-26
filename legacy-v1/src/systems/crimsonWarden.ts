/**
 * Crimson Warden Boss Encounter & Red Moon Rift System.
 * - Replaces 2 dynamic PointLights with baked additive glow sprites (SharedAssets)
 * - Throttles UI telegraph state updates to ~10 Hz (instead of 60 Hz React re-renders)
 * - Supports region scoping & complete GPU resource disposal
 */

import * as THREE from 'three';
import { CrimsonWardenState } from '../types/game';
import { NotificationSystem } from './notificationSystem';
import { AudioService } from '../services/audio';
import { SharedAssets } from '../engine/sharedAssets';

export interface BossCallbacks {
  onBossStateChange: (state: CrimsonWardenState | null) => void;
  onPlayerDamage: (damage: number) => void;
  onBossDefeated: () => void;
}

export class CrimsonWardenEncounter {
  private scene: THREE.Scene;
  public group: THREE.Group;
  public riftGroup: THREE.Group;
  public arenaCenter: THREE.Vector3;
  private callbacks: BossCallbacks;
  private regionActive: boolean = true;

  public state: CrimsonWardenState = {
    id: 'crimson_warden',
    name: 'Crimson Warden',
    subtitle: 'Scourge of the Eclipse',
    active: false,
    health: 600,
    maxHealth: 600,
    phase: 1,
    attackWarning: null,
    isDefeated: false,
  };

  private bossMeshGroup: THREE.Group;
  private torsoMesh: THREE.Mesh;
  private coreMesh: THREE.Mesh;
  private swordMesh: THREE.Mesh;
  private auraGlowSprite: THREE.Sprite;

  private telegraphMesh: THREE.Mesh;
  private telegraphMat: THREE.MeshBasicMaterial;

  private riftCoreMesh: THREE.Mesh;
  private riftRing1: THREE.Mesh;
  private riftRing2: THREE.Mesh;

  private attackTimer: number = 0;
  private currentTelegraph: {
    type: 'CLEAVE' | 'NOVA';
    timer: number;
    duration: number;
    radius: number;
    x: number;
    z: number;
    damage: number;
  } | null = null;

  private playerInvulnerableTimer: number = 0;
  private uiNotifyTimer: number = 0;

  constructor(
    scene: THREE.Scene,
    getTerrainHeight: (x: number, z: number) => number,
    callbacks: BossCallbacks,
    isDefeated = false,
    isSoftwareGl = false
  ) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.state.isDefeated = isDefeated;

    const arenaX = -52;
    const arenaZ = -45;
    const arenaY = getTerrainHeight(arenaX, arenaZ);
    this.arenaCenter = new THREE.Vector3(arenaX, arenaY, arenaZ);

    this.group = new THREE.Group();
    this.group.name = 'crimson_warden_encounter';
    scene.add(this.group);

    this.riftGroup = new THREE.Group();
    this.riftGroup.position.copy(this.arenaCenter);
    this.group.add(this.riftGroup);

    const pillarMat = SharedAssets.getMaterial('cw_pillar_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.85,
        metalness: 0.2,
        flatShading: true,
      })
    );
    const runeMat = SharedAssets.getMaterial('cw_rune_mat', () =>
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const px = Math.cos(angle) * 8.5;
      const pz = Math.sin(angle) * 8.5;
      const h = 6 + (i % 3) * 2;
      const pillar = new THREE.Mesh(
        SharedAssets.getGeometry(`cw_pillar_${h}`, () => new THREE.BoxGeometry(1.2, h, 1.2)),
        pillarMat
      );
      pillar.position.set(px, h / 2, pz);
      pillar.rotation.y = angle + 0.2;
      pillar.castShadow = !isSoftwareGl;
      this.riftGroup.add(pillar);

      const rune = new THREE.Mesh(
        SharedAssets.getGeometry(`cw_rune_${h}`, () => new THREE.BoxGeometry(0.2, h * 0.7, 0.2)),
        runeMat
      );
      rune.position.set(px * 0.95, h / 2, pz * 0.95);
      this.riftGroup.add(rune);
    }

    const riftGeo = SharedAssets.getGeometry('cw_rift_core', () => new THREE.OctahedronGeometry(2.2, 1));
    const riftMat = SharedAssets.getMaterial('cw_rift_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0x991b1b,
        emissive: 0xef4444,
        emissiveIntensity: 0.9,
        roughness: 0.1,
        metalness: 0.9,
      })
    );
    this.riftCoreMesh = new THREE.Mesh(riftGeo, riftMat);
    this.riftCoreMesh.position.set(0, 3.5, 0);
    this.riftGroup.add(this.riftCoreMesh);

    const ringMat = SharedAssets.getMaterial('cw_ring_mat', () =>
      new THREE.MeshBasicMaterial({
        color: 0xf87171,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      })
    );
    this.riftRing1 = new THREE.Mesh(
      SharedAssets.getGeometry('cw_ring_1', () => new THREE.TorusGeometry(3.6, 0.12, 8, 24)),
      ringMat
    );
    this.riftRing1.position.set(0, 3.5, 0);
    this.riftGroup.add(this.riftRing1);

    this.riftRing2 = new THREE.Mesh(
      SharedAssets.getGeometry('cw_ring_2', () => new THREE.TorusGeometry(4.8, 0.14, 8, 24)),
      ringMat
    );
    this.riftRing2.position.set(0, 3.5, 0);
    this.riftGroup.add(this.riftRing2);

    // Baked glow sprite replaces costly dynamic PointLight
    const riftGlow = SharedAssets.createGlowSprite(0xef4444, 7.5, 0.65);
    riftGlow.position.set(0, 3.6, 0);
    this.riftGroup.add(riftGlow);

    // 2. Crimson Warden Boss Model
    this.bossMeshGroup = new THREE.Group();
    this.bossMeshGroup.position.copy(this.arenaCenter);
    this.bossMeshGroup.position.y += 0.5;
    this.group.add(this.bossMeshGroup);

    const armorMat = SharedAssets.getMaterial('cw_armor_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0x27272a,
        roughness: 0.7,
        metalness: 0.8,
        flatShading: true,
      })
    );
    this.torsoMesh = new THREE.Mesh(
      SharedAssets.getGeometry('cw_torso', () => new THREE.BoxGeometry(1.8, 2.2, 1.2)),
      armorMat
    );
    this.torsoMesh.position.y = 2.4;
    this.torsoMesh.castShadow = !isSoftwareGl;
    this.bossMeshGroup.add(this.torsoMesh);

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('cw_head', () => new THREE.BoxGeometry(0.9, 0.9, 0.9)),
      armorMat
    );
    head.position.y = 3.9;
    this.bossMeshGroup.add(head);

    const visor = new THREE.Mesh(
      SharedAssets.getGeometry('cw_visor', () => new THREE.BoxGeometry(0.7, 0.15, 0.2)),
      runeMat
    );
    visor.position.set(0, 3.9, 0.48);
    this.bossMeshGroup.add(visor);

    const hornGeo = SharedAssets.getGeometry('cw_horn', () => new THREE.ConeGeometry(0.2, 1.1, 5));
    for (const sx of [-0.6, 0.6]) {
      const horn = new THREE.Mesh(hornGeo, armorMat);
      horn.position.set(sx, 4.7, 0);
      horn.rotation.z = (sx > 0 ? -1 : 1) * 0.4;
      this.bossMeshGroup.add(horn);
    }

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.8,
    });
    this.coreMesh = new THREE.Mesh(
      SharedAssets.getGeometry('cw_core', () => new THREE.OctahedronGeometry(0.55, 0)),
      coreMat
    );
    this.coreMesh.position.set(0, 2.4, 0.5);
    this.bossMeshGroup.add(this.coreMesh);

    const pauldronGeo = SharedAssets.getGeometry('cw_pauldron', () => new THREE.ConeGeometry(0.7, 1.2, 4));
    for (const sx of [-1.3, 1.3]) {
      const pauldron = new THREE.Mesh(pauldronGeo, armorMat);
      pauldron.position.set(sx, 3.3, 0);
      pauldron.rotation.z = (sx > 0 ? -1 : 1) * 0.5;
      this.bossMeshGroup.add(pauldron);
    }

    const bladeGroup = new THREE.Group();
    bladeGroup.position.set(1.8, 2.2, 0);
    const blade = new THREE.Mesh(
      SharedAssets.getGeometry('cw_blade', () => new THREE.BoxGeometry(0.3, 3.8, 0.1)),
      SharedAssets.getMaterial('cw_blade_mat', () =>
        new THREE.MeshStandardMaterial({
          color: 0x991b1b,
          emissive: 0x7f1d1d,
          emissiveIntensity: 0.5,
          metalness: 0.9,
          roughness: 0.2,
        })
      )
    );
    blade.position.y = 1.9;
    bladeGroup.add(blade);

    const guard = new THREE.Mesh(
      SharedAssets.getGeometry('cw_guard', () => new THREE.BoxGeometry(1.0, 0.2, 0.2)),
      armorMat
    );
    guard.position.y = 0.1;
    bladeGroup.add(guard);

    this.swordMesh = bladeGroup as unknown as THREE.Mesh;
    this.bossMeshGroup.add(bladeGroup);

    this.auraGlowSprite = SharedAssets.createGlowSprite(0xef4444, 5.2, 0.65);
    this.auraGlowSprite.position.set(0, 2.8, 0);
    this.bossMeshGroup.add(this.auraGlowSprite);

    const teleGeo = SharedAssets.getGeometry('boss_telegraph_ring', () => {
      const g = new THREE.RingGeometry(0.1, 5.0, 28);
      g.rotateX(-Math.PI / 2);
      return g;
    });
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

    this.bossMeshGroup.visible = false;
    this.riftGroup.visible = false;
  }

  public setRegionActive(active: boolean, getTerrainHeight?: (x: number, z: number) => number): void {
    this.regionActive = active;
    if (!active) {
      if (this.state.active) {
        this.despawnBoss();
      }
      this.group.visible = false;
      this.telegraphMesh.visible = false;
    } else {
      this.group.visible = true;
      if (getTerrainHeight) {
        const y = getTerrainHeight(this.arenaCenter.x, this.arenaCenter.z);
        this.arenaCenter.y = y;
        this.riftGroup.position.y = y;
      }
    }
  }

  update(
    delta: number,
    totalTime: number,
    playerPos: THREE.Vector3,
    isRedMoonActive: boolean,
    getTerrainHeight: (x: number, z: number) => number
  ): void {
    if (!this.regionActive) return;

    if (this.playerInvulnerableTimer > 0) {
      this.playerInvulnerableTimer -= delta;
    }

    if (!isRedMoonActive || this.state.isDefeated) {
      if (this.state.active) {
        this.despawnBoss();
      }
      this.riftGroup.visible = false;
      return;
    }

    const distToCrater = playerPos.distanceTo(this.arenaCenter);
    if (distToCrater > 95 && !this.state.active) {
      this.riftGroup.visible = false;
      return;
    }

    this.riftGroup.visible = true;
    this.riftCoreMesh.rotation.y += delta * 1.5;
    this.riftCoreMesh.rotation.x += delta * 0.8;
    this.riftRing1.rotation.x += delta * 1.8;
    this.riftRing2.rotation.y += delta * 1.4;

    if (!this.state.active) {
      if (distToCrater < 32) {
        this.spawnBoss();
      }
      return;
    }

    if (distToCrater > 55) {
      this.resetEncounter();
      NotificationSystem.notify('Crimson Warden', 'The warden disengages as you flee the crater.', 'info');
      return;
    }

    this.updateBossCombat(delta, totalTime, playerPos, getTerrainHeight);
  }

  private spawnBoss(): void {
    this.state.active = true;
    this.state.health = this.state.maxHealth;
    this.state.phase = 1;
    this.bossMeshGroup.position.copy(this.arenaCenter);
    this.bossMeshGroup.visible = true;
    this.attackTimer = 2.0;

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

  private updateBossCombat(
    delta: number,
    totalTime: number,
    playerPos: THREE.Vector3,
    getTerrainHeight: (x: number, z: number) => number
  ): void {
    const bossPos = this.bossMeshGroup.position;
    const distToPlayer = bossPos.distanceTo(playerPos);

    const targetAngle = Math.atan2(playerPos.x - bossPos.x, playerPos.z - bossPos.z);
    this.bossMeshGroup.rotation.y = THREE.MathUtils.lerp(this.bossMeshGroup.rotation.y, targetAngle, delta * 3.5);

    const groundY = getTerrainHeight(bossPos.x, bossPos.z);
    bossPos.y = groundY + 0.3 + Math.sin(totalTime * 2.5) * 0.25;

    const desiredDist = 4.2;
    const moveSpeed = this.state.phase === 2 ? 6.5 : 4.5;

    if (distToPlayer > desiredDist) {
      const dirX = (playerPos.x - bossPos.x) / distToPlayer;
      const dirZ = (playerPos.z - bossPos.z) / distToPlayer;
      bossPos.x += dirX * moveSpeed * delta;
      bossPos.z += dirZ * moveSpeed * delta;
    }

    this.swordMesh.rotation.z = Math.sin(totalTime * 3.0) * 0.15;
    this.swordMesh.position.y = 2.2 + Math.cos(totalTime * 2.0) * 0.2;

    if (this.state.phase === 2) {
      (this.coreMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.5 + Math.sin(totalTime * 6) * 0.8;
      this.auraGlowSprite.scale.set(6.8, 6.8, 1);
    }

    this.uiNotifyTimer += delta;

    if (this.currentTelegraph) {
      this.currentTelegraph.timer += delta;
      const progress = Math.min(1.0, this.currentTelegraph.timer / this.currentTelegraph.duration);

      this.telegraphMesh.visible = true;
      this.telegraphMesh.position.set(
        this.currentTelegraph.x,
        getTerrainHeight(this.currentTelegraph.x, this.currentTelegraph.z) + 0.15,
        this.currentTelegraph.z
      );

      const targetScale = this.currentTelegraph.radius / 5.0;
      this.telegraphMesh.scale.set(targetScale * progress, 1, targetScale * progress);
      this.telegraphMat.opacity = 0.3 + progress * 0.55;

      const isNewWarning = !this.state.attackWarning;
      this.state.attackWarning = {
        type: this.currentTelegraph.type,
        progress,
        x: this.currentTelegraph.x,
        z: this.currentTelegraph.z,
        radius: this.currentTelegraph.radius,
      };
      if (isNewWarning || this.uiNotifyTimer >= 0.1) {
        this.uiNotifyTimer = 0;
        this.callbacks.onBossStateChange({ ...this.state });
      }

      if (progress >= 1.0) {
        this.executeAttack(playerPos);
      }
    } else {
      this.attackTimer -= delta;
      if (this.attackTimer <= 0) {
        this.startRandomAttack(playerPos);
      }
    }
  }

  private startRandomAttack(playerPos: THREE.Vector3): void {
    const isPhase2 = this.state.phase === 2;
    const chooseNova = isPhase2 && Math.random() < 0.55;

    if (chooseNova) {
      this.currentTelegraph = {
        type: 'NOVA',
        timer: 0,
        duration: 2.2,
        radius: 9.5,
        x: this.bossMeshGroup.position.x,
        z: this.bossMeshGroup.position.z,
        damage: 40,
      };
      NotificationSystem.notify('Crimson Warden', 'Warning: Dimensional Nova preparing!', 'danger', 2500);
    } else {
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
    if (this.state.attackWarning !== null) {
      this.state.attackWarning = null;
      this.callbacks.onBossStateChange({ ...this.state });
    }
  }

  public playerAttack(playerPos: THREE.Vector3): boolean {
    if (!this.state.active || this.state.isDefeated) return false;
    const dist = this.bossMeshGroup.position.distanceTo(playerPos);
    if (dist > 6.0) return false;
    const damage = Math.floor(Math.random() * 25) + 40;
    AudioService.playRelicCollect();
    NotificationSystem.notify('Strike!', `Dealt ${damage} damage to Crimson Warden!`, 'info', 1800);
    return this.takeDamage(damage);
  }

  public takeDamage(damage: number): boolean {
    if (!this.state.active || this.state.isDefeated) return false;
    this.state.health = Math.max(0, this.state.health - damage);

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

    if (this.state.health <= 0) {
      this.handleDefeat();
    } else {
      this.callbacks.onBossStateChange({ ...this.state });
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
    this.scene.remove(this.group);
    SharedAssets.disposeObject3DSafe(this.group);
    this.scene.remove(this.telegraphMesh);
    this.telegraphMat.dispose();
  }
}
