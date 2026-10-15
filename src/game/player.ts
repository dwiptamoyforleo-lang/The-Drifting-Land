/**
 * Player Controller for The Drifting Land.
 * Supports First-Person, Third-Person, and Second-Person Observer View.
 * Features sprint physics, smooth camera transitions, and telemetry data.
 */
import * as THREE from 'three';
import { soundSystem } from './audio';
import { TelemetryData, CameraMode, PlayerStats, ItemEquipmentStats } from './types';

export interface PlayerInput {
  moveForward: number; // -1 to 1
  moveRight: number;   // -1 to 1
  lookDeltaX: number;
  lookDeltaY: number;
  jump: boolean;
  sprint: boolean;
  interact: boolean;
  primaryAction: boolean;
}

export class PlayerController {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public yaw: number = 0;
  public pitch: number = 0.25;
  public isGrounded: boolean = true;
  public lastCheckpoint: THREE.Vector3;
  public cameraMode: CameraMode = 'first_person';

  // Camera settings
  private cameraDistance: number = 4.2;
  private cameraTargetHeight: number = 1.5;
  private currentCameraPos: THREE.Vector3 = new THREE.Vector3();

  // Movement physics
  private walkSpeed: number = 5.8;
  private sprintMultiplier: number = 1.65;
  private jumpForce: number = 7.6;
  private gravity: number = -22.0;

  // Player Survival & Stats
  public health: number = 100;
  public maxHealth: number = 100;
  public stamina: number = 100;
  public maxStamina: number = 100;
  public isExhausted: boolean = false;
  public speedMultiplier: number = 1.0;
  public fallDamageReduction: number = 0.0;
  public staminaRegenMultiplier: number = 1.0;
  private prevAirVelocityY: number = 0;

  // Combat Strike System
  public attackPower: number = 28;
  public attackCooldown: number = 0.35;
  private attackTimer: number = 0;
  public isSwingingAttack: boolean = false;
  private swingAnimTimer: number = 0;
  public onAttackTriggered?: () => void;

  // Callbacks
  public onDamageTaken?: (amount: number, reason: string) => void;
  public onStatsChange?: () => void;
  public getNearbyObserver?: () => { position: THREE.Vector3; name: string } | null;
  public activeObserverName: string = '';

  // 3D Character Model Rig
  public characterGroup!: THREE.Group;
  private torsoMesh!: THREE.Mesh;
  private leftLegMesh!: THREE.Mesh;
  private rightLegMesh!: THREE.Mesh;
  private leftArmMesh!: THREE.Mesh;
  private rightArmMesh!: THREE.Mesh;
  private headMesh!: THREE.Mesh;
  private compassNeedleMesh!: THREE.Mesh;

  // Animation timers
  private animTimer: number = 0;
  private footstepTimer: number = 0;

  // Collision
  public walkableMeshes: THREE.Object3D[] = [];
  private raycaster: THREE.Raycaster;

  // Scratch vector pool to completely eliminate GC allocations in game loop
  private _forward: THREE.Vector3 = new THREE.Vector3();
  private _right: THREE.Vector3 = new THREE.Vector3();
  private _moveDir: THREE.Vector3 = new THREE.Vector3();
  private _nextPos: THREE.Vector3 = new THREE.Vector3();
  private _rayOrigin: THREE.Vector3 = new THREE.Vector3();
  private _rayDir: THREE.Vector3 = new THREE.Vector3(0, -1, 0);
  private _eyePos: THREE.Vector3 = new THREE.Vector3();
  private _lookTarget: THREE.Vector3 = new THREE.Vector3();
  private _camTarget: THREE.Vector3 = new THREE.Vector3();
  private _desiredCameraPos: THREE.Vector3 = new THREE.Vector3();
  private _raycastHits: THREE.Intersection[] = [];
  private _cachedLookDir: THREE.Vector3 = new THREE.Vector3();

  // Respawn
  public isRespawning: boolean = false;
  public respawnFadeAlpha: number = 0;
  public onRespawnCallback?: () => void;

  public input: PlayerInput = {
    moveForward: 0,
    moveRight: 0,
    lookDeltaX: 0,
    lookDeltaY: 0,
    jump: false,
    sprint: false,
    interact: false,
    primaryAction: false,
  };

  public sensitivity: number = 1.2;

  constructor(scene: THREE.Scene, initialPosition: [number, number, number] = [0, 4.2, 0]) {
    this.scene = scene;
    this.position = new THREE.Vector3(initialPosition[0], initialPosition[1], initialPosition[2]);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.lastCheckpoint = new THREE.Vector3(0, 4.2, 0);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1400);

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 4.0;
    (this.raycaster as any).firstHitOnly = true;

    this.buildCharacterModel();
    this.updateCamera(0.016);
  }

  private buildCharacterModel() {
    this.characterGroup = new THREE.Group();
    this.characterGroup.position.copy(this.position);

    const matSuitBlue = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.5,
      metalness: 0.1,
      flatShading: true,
    });

    const matDarkPants = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      flatShading: true,
    });

    const matHelmet = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.3,
      metalness: 0.2,
      flatShading: true,
    });

    const matVisor = new THREE.MeshBasicMaterial({
      color: 0x00f0c0,
    });

    const matBoots = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7,
      flatShading: true,
    });

    const matBrass = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.3,
      metalness: 0.8,
    });

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.65, 0.35);
    this.torsoMesh = new THREE.Mesh(torsoGeo, matSuitBlue);
    this.torsoMesh.position.y = 1.05;
    this.characterGroup.add(this.torsoMesh);

    const packGeo = new THREE.BoxGeometry(0.4, 0.5, 0.22);
    const backpack = new THREE.Mesh(packGeo, matDarkPants);
    backpack.position.set(0, 0.05, -0.25);
    this.torsoMesh.add(backpack);

    const packLight = new THREE.PointLight(0x00f0c0, 1.2, 3);
    packLight.position.set(0, 0.15, -0.15);
    backpack.add(packLight);

    // Head & Helmet
    const headGeo = new THREE.SphereGeometry(0.24, 12, 10);
    this.headMesh = new THREE.Mesh(headGeo, matHelmet);
    this.headMesh.position.set(0, 0.52, 0);
    this.torsoMesh.add(this.headMesh);

    const visorGeo = new THREE.BoxGeometry(0.26, 0.12, 0.15);
    const visor = new THREE.Mesh(visorGeo, matVisor);
    visor.position.set(0, 0, 0.18);
    this.headMesh.add(visor);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.65, 0.22);
    this.leftLegMesh = new THREE.Mesh(legGeo, matDarkPants);
    this.leftLegMesh.position.set(-0.16, 0.42, 0);
    this.characterGroup.add(this.leftLegMesh);

    this.rightLegMesh = new THREE.Mesh(legGeo, matDarkPants);
    this.rightLegMesh.position.set(0.16, 0.42, 0);
    this.characterGroup.add(this.rightLegMesh);

    const bootGeo = new THREE.BoxGeometry(0.22, 0.2, 0.3);
    const bootL = new THREE.Mesh(bootGeo, matBoots);
    bootL.position.set(0, -0.32, 0.04);
    this.leftLegMesh.add(bootL);

    const bootR = new THREE.Mesh(bootGeo, matBoots);
    bootR.position.set(0, -0.32, 0.04);
    this.rightLegMesh.add(bootR);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.16, 0.6, 0.18);
    this.leftArmMesh = new THREE.Mesh(armGeo, matSuitBlue);
    this.leftArmMesh.position.set(-0.36, 1.05, 0);
    this.characterGroup.add(this.leftArmMesh);

    this.rightArmMesh = new THREE.Mesh(armGeo, matSuitBlue);
    this.rightArmMesh.position.set(0.36, 1.05, 0);
    this.characterGroup.add(this.rightArmMesh);

    const compassBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.04), matBrass);
    compassBody.position.set(0, -0.35, 0.12);
    compassBody.rotation.x = -Math.PI / 3;
    this.rightArmMesh.add(compassBody);

    const needleGeo = new THREE.BoxGeometry(0.012, 0.08, 0.01);
    this.compassNeedleMesh = new THREE.Mesh(needleGeo, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    this.compassNeedleMesh.position.z = 0.025;
    compassBody.add(this.compassNeedleMesh);

    this.scene.add(this.characterGroup);
  }

  public setCheckpoint(pos: THREE.Vector3) {
    this.lastCheckpoint.copy(pos);
    this.lastCheckpoint.y = Math.max(4.2, pos.y);
  }

  public setSensitivity(s: number) {
    this.sensitivity = Math.max(0.4, Math.min(3.0, s));
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
    if (this.characterGroup) {
      this.characterGroup.visible = mode !== 'first_person';
    }
  }

  public toggleCameraMode(): CameraMode {
    const modes: CameraMode[] = ['third_person', 'first_person', 'second_person'];
    const nextIdx = (modes.indexOf(this.cameraMode) + 1) % modes.length;
    this.setCameraMode(modes[nextIdx]);
    return this.cameraMode;
  }

  public applyLookDelta(deltaX: number, deltaY: number, isTouch: boolean = false) {
    const factor = isTouch ? 0.0035 * this.sensitivity : 0.0022 * this.sensitivity;
    this.yaw -= deltaX * factor;
    this.pitch += deltaY * factor;
    this.pitch = Math.max(-0.3, Math.min(1.2, this.pitch));
  }

  public performAttack(): boolean {
    if (this.attackTimer > 0 || this.isRespawning) return false;
    this.attackTimer = this.attackCooldown;
    this.isSwingingAttack = true;
    this.swingAnimTimer = 0.22;
    if (this.onAttackTriggered) {
      this.onAttackTriggered();
    }
    return true;
  }

  public update(delta: number) {
    if (this.attackTimer > 0) {
      this.attackTimer -= delta;
    }
    if (this.swingAnimTimer > 0) {
      this.swingAnimTimer -= delta;
      if (this.swingAnimTimer <= 0) {
        this.isSwingingAttack = false;
      }
    }

    if (this.input.primaryAction) {
      this.performAttack();
      this.input.primaryAction = false;
    }

    if (this.isRespawning) {
      this.respawnFadeAlpha = Math.min(1.0, this.respawnFadeAlpha + delta * 2.5);
      if (this.respawnFadeAlpha >= 1.0) {
        this.position.set(this.lastCheckpoint.x, Math.max(4.2, this.lastCheckpoint.y), this.lastCheckpoint.z);
        this.velocity.set(0, 0, 0);
        this.isGrounded = true;
        this.isRespawning = false;
        this.health = this.maxHealth;
        this.stamina = this.maxStamina;
        this.isExhausted = false;
        if (this.onStatsChange) this.onStatsChange();
        if (this.onRespawnCallback) this.onRespawnCallback();
      }
      return;
    } else if (this.respawnFadeAlpha > 0) {
      this.respawnFadeAlpha = Math.max(0, this.respawnFadeAlpha - delta * 2.0);
    }

    const dt = Math.min(delta, 0.08);
    this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    this._moveDir.set(0, 0, 0);
    if (Math.abs(this.input.moveForward) > 0.01) {
      this._moveDir.addScaledVector(this._forward, this.input.moveForward);
    }
    if (Math.abs(this.input.moveRight) > 0.01) {
      this._moveDir.addScaledVector(this._right, this.input.moveRight);
    }

    const isMoving = this._moveDir.lengthSq() > 0.01;
    if (isMoving) {
      this._moveDir.normalize();
    }

    // Stamina & Sprint Logic
    let isSprintingNow = false;
    if (this.input.sprint && isMoving && !this.isExhausted && this.stamina > 0) {
      isSprintingNow = true;
      this.stamina = Math.max(0, this.stamina - 18.0 * dt);
      if (this.stamina <= 0) {
        this.isExhausted = true;
        soundSystem.playStaminaExhausted();
      }
    } else {
      // Regenerate stamina when not sprinting (faster when resting/standing still)
      const regenRate = (isMoving ? 16.0 : 28.0) * this.staminaRegenMultiplier;
      this.stamina = Math.min(this.maxStamina, this.stamina + regenRate * dt);
      if (this.isExhausted && this.stamina >= 18.0) {
        this.isExhausted = false;
      }
    }

    const effectiveWalkSpeed = this.walkSpeed * this.speedMultiplier;
    const currentSpeed = isSprintingNow ? effectiveWalkSpeed * this.sprintMultiplier : effectiveWalkSpeed;
    const targetVx = this._moveDir.x * currentSpeed;
    const targetVz = this._moveDir.z * currentSpeed;

    const lerpFactor = this.isGrounded ? 12.0 * dt : 3.0 * dt;
    this.velocity.x += (targetVx - this.velocity.x) * Math.min(1, lerpFactor);
    this.velocity.z += (targetVz - this.velocity.z) * Math.min(1, lerpFactor);

    if (this.input.jump && this.isGrounded) {
      const jumpStaminaCost = 12.0;
      if (this.stamina >= jumpStaminaCost) {
        this.stamina = Math.max(0, this.stamina - jumpStaminaCost);
        this.velocity.y = this.jumpForce;
      } else {
        // Weaker jump when out of stamina
        this.velocity.y = this.jumpForce * 0.7;
      }
      this.isGrounded = false;
      this.input.jump = false;
      soundSystem.playJump();
    }

    if (!this.isGrounded) {
      this.prevAirVelocityY = this.velocity.y;
    }

    this.velocity.y += this.gravity * dt;

    this._nextPos.copy(this.position);
    this._nextPos.x += this.velocity.x * dt;
    this._nextPos.z += this.velocity.z * dt;
    this._nextPos.y += this.velocity.y * dt;

    // Ground raycasting & floor snapping
    const groundElevation = this.checkGroundCollision(this._nextPos);
    const wasAirborne = !this.isGrounded;

    if (this._nextPos.y <= groundElevation) {
      this._nextPos.y = groundElevation;
      this.velocity.y = 0;
      this.isGrounded = true;

      // Fall Damage Calculation on Impact
      if (wasAirborne && this.prevAirVelocityY < -13.5) {
        const excessSpeed = Math.abs(this.prevAirVelocityY) - 13.5;
        const rawDamage = Math.round(excessSpeed * 4.8);
        const damage = Math.max(5, Math.round(rawDamage * (1.0 - this.fallDamageReduction)));
        this.takeDamage(damage, 'Fall Impact');
      }
      this.prevAirVelocityY = 0;
    } else {
      if (this.isGrounded && this._nextPos.y - groundElevation < 0.35) {
        this._nextPos.y = groundElevation;
        this.velocity.y = 0;
      } else {
        this.isGrounded = false;
      }
    }

    this.position.copy(this._nextPos);

    // Void fall detection
    if (this.position.y < -35 && !this.isRespawning) {
      this.takeDamage(this.maxHealth, 'Void Abyss Fall');
    }

    // Update 3D Character Model position and limb animation
    this.updateCharacterAnimation(dt, isMoving, this._moveDir);

    // Update camera depending on active camera mode
    this.updateCamera(dt);
  }

  private checkGroundCollision(probePos: THREE.Vector3): number {
    if (this.walkableMeshes.length === 0) {
      return 4.2;
    }

    this._rayOrigin.set(probePos.x, probePos.y + 1.2, probePos.z);
    this.raycaster.set(this._rayOrigin, this._rayDir);

    this._raycastHits.length = 0;
    this.raycaster.intersectObjects(this.walkableMeshes, false, this._raycastHits);
    if (this._raycastHits.length > 0) {
      const topHit = this._raycastHits[0].point.y;
      return Math.max(topHit, 4.2);
    }

    return 4.2;
  }

  private updateCharacterAnimation(dt: number, isMoving: boolean, moveDir: THREE.Vector3) {
    if (!this.characterGroup) return;

    this.characterGroup.position.copy(this.position);

    if (isMoving) {
      const targetCharAngle = Math.atan2(moveDir.x, moveDir.z);
      this.characterGroup.rotation.y = targetCharAngle;

      this.animTimer += dt * (this.input.sprint ? 14.0 : 8.5);
      const legSwing = Math.sin(this.animTimer) * 0.45;
      const armSwing = Math.cos(this.animTimer) * 0.4;

      this.leftLegMesh.rotation.x = legSwing;
      this.rightLegMesh.rotation.x = -legSwing;
      this.leftArmMesh.rotation.x = -armSwing;
      if (this.isSwingingAttack) {
        this.rightArmMesh.rotation.x = -Math.PI / 2.2 + Math.sin(this.swingAnimTimer * 16.0) * 0.8;
      } else {
        this.rightArmMesh.rotation.x = armSwing * 0.3;
      }

      this.footstepTimer += dt;
      const stepInterval = this.input.sprint ? 0.28 : 0.42;
      if (this.footstepTimer > stepInterval && this.isGrounded) {
        this.footstepTimer = 0;
        soundSystem.playFootstep();
      }
    } else {
      this.leftLegMesh.rotation.x = 0;
      this.rightLegMesh.rotation.x = 0;
      this.leftArmMesh.rotation.x = 0;
      if (this.isSwingingAttack) {
        this.rightArmMesh.rotation.x = -Math.PI / 2.2 + Math.sin(this.swingAnimTimer * 16.0) * 0.8;
      } else {
        this.rightArmMesh.rotation.x = 0;
      }

      // Rotate character with camera idle yaw
      this.characterGroup.rotation.y = this.yaw + Math.PI;

      // Subtle breathing idle
      this.animTimer += dt * 2.0;
      this.torsoMesh.position.y = 1.05 + Math.sin(this.animTimer) * 0.02;
    }

    if (this.compassNeedleMesh) {
      this.compassNeedleMesh.rotation.z = -this.yaw;
    }
  }

  private updateCamera(dt: number) {
    if (this.cameraMode === 'first_person') {
      this._eyePos.set(this.position.x, this.position.y + 1.62, this.position.z);
      this.camera.position.copy(this._eyePos);

      const cosPitch = Math.cos(this.pitch);
      this._lookTarget.set(
        this._eyePos.x - Math.sin(this.yaw) * cosPitch,
        this._eyePos.y + Math.sin(this.pitch),
        this._eyePos.z - Math.cos(this.yaw) * cosPitch
      );
      this.camera.lookAt(this._lookTarget);
      return;
    }

    if (this.cameraMode === 'second_person') {
      const observer = this.getNearbyObserver ? this.getNearbyObserver() : null;
      this._camTarget.set(this.position.x, this.position.y + 1.25, this.position.z);

      if (observer) {
        // Perspective of nearby observing creature or NPC looking directly at player
        this.activeObserverName = observer.name;
        this.currentCameraPos.lerp(observer.position, Math.min(1.0, 9.0 * dt));
        this.camera.position.copy(this.currentCameraPos);
        this.camera.lookAt(this._camTarget);
      } else {
        // Dedicated observer camera in front of the player looking back toward them
        this.activeObserverName = 'Front Recon Drone';
        const frontDist = 4.2;
        const frontX = this.position.x - Math.sin(this.yaw) * frontDist;
        const frontY = this.position.y + 2.0;
        const frontZ = this.position.z - Math.cos(this.yaw) * frontDist;
        this._desiredCameraPos.set(frontX, frontY, frontZ);

        this.currentCameraPos.lerp(this._desiredCameraPos, Math.min(1.0, 12.0 * dt));
        this.camera.position.copy(this.currentCameraPos);
        this.camera.lookAt(this._camTarget);
      }
      return;
    }

    // Default Third-Person Orbit View
    this._camTarget.set(this.position.x, this.position.y + this.cameraTargetHeight, this.position.z);
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);

    const offsetX = Math.sin(this.yaw) * cosPitch * this.cameraDistance;
    const offsetY = sinPitch * this.cameraDistance;
    const offsetZ = Math.cos(this.yaw) * cosPitch * this.cameraDistance;

    this._desiredCameraPos.set(this._camTarget.x + offsetX, this._camTarget.y + offsetY, this._camTarget.z + offsetZ);
    this.currentCameraPos.lerp(this._desiredCameraPos, Math.min(1.0, 16.0 * dt));
    this.camera.position.copy(this.currentCameraPos);
    this.camera.lookAt(this._camTarget);
  }

  public triggerRespawn() {
    this.isRespawning = true;
    this.respawnFadeAlpha = 0;
    soundSystem.playRespawnTone();
  }

  public takeDamage(amount: number, reason: string = 'Environmental Hazard') {
    if (this.isRespawning) return;
    this.health = Math.max(0, this.health - amount);
    soundSystem.playHurt();
    if (this.onDamageTaken) {
      this.onDamageTaken(amount, reason);
    }
    if (this.onStatsChange) {
      this.onStatsChange();
    }
    if (this.health <= 0) {
      this.triggerRespawn();
    }
  }

  public heal(amount: number, playSound: boolean = false): number {
    const prev = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    if (playSound) soundSystem.playHeal();
    return this.health - prev;
  }

  public restoreStamina(amount: number, playSound: boolean = false): number {
    const prev = this.stamina;
    this.stamina = Math.min(this.maxStamina, this.stamina + amount);
    this.isExhausted = false;
    if (playSound) soundSystem.playHeal();
    return this.stamina - prev;
  }

  public applyEquipmentStats(statsList: (ItemEquipmentStats | undefined)[]) {
    let bonusHealth = 0;
    let bonusStamina = 0;
    let speedMult = 1.0;
    let fallRed = 0.0;
    let regenMult = 1.0;

    statsList.forEach((stat) => {
      if (!stat) return;
      if (stat.maxHealthBonus) bonusHealth += stat.maxHealthBonus;
      if (stat.maxStaminaBonus) bonusStamina += stat.maxStaminaBonus;
      if (stat.speedMultiplier) speedMult *= stat.speedMultiplier;
      if (stat.fallDamageReduction) fallRed = Math.min(0.85, fallRed + stat.fallDamageReduction);
      if (stat.staminaRegenMultiplier) regenMult *= stat.staminaRegenMultiplier;
    });

    this.maxHealth = 100 + bonusHealth;
    this.maxStamina = 100 + bonusStamina;
    this.speedMultiplier = Math.max(0.6, Math.min(2.0, speedMult));
    this.fallDamageReduction = Math.max(0, Math.min(0.85, fallRed));
    this.staminaRegenMultiplier = Math.max(0.5, Math.min(2.5, regenMult));

    this.health = Math.min(this.health, this.maxHealth);
    this.stamina = Math.min(this.stamina, this.maxStamina);

    if (this.onStatsChange) this.onStatsChange();
  }

  public getPlayerStats(sectorName: string = 'Sector 01: Observation Deck'): PlayerStats {
    const coords: [number, number, number] = [
      Math.round(this.position.x * 10) / 10,
      Math.round(this.position.y * 10) / 10,
      Math.round(this.position.z * 10) / 10,
    ];

    let hazardLevel: 'safe' | 'caution' | 'danger' = 'safe';
    let environmentalStatus = 'Atmospheric Equilibrium: 100% Breathable';

    if (this.position.y < -15) {
      hazardLevel = 'danger';
      environmentalStatus = 'Void Turbulence: Severe Gravitational Shearing';
    } else if (this.health < 40) {
      hazardLevel = 'caution';
      environmentalStatus = 'Suit Integrity: Compromised / Repair Advised';
    } else if (this.isExhausted) {
      hazardLevel = 'caution';
      environmentalStatus = 'Exertion Warning: Kinetic Dampeners Overheated';
    }

    return {
      health: Math.round(this.health),
      maxHealth: this.maxHealth,
      stamina: Math.round(this.stamina),
      maxStamina: this.maxStamina,
      speedMultiplier: Math.round(this.speedMultiplier * 100) / 100,
      fallDamageReduction: Math.round(this.fallDamageReduction * 100),
      staminaRegenRate: Math.round(24 * this.staminaRegenMultiplier),
      isSprinting: this.input.sprint && !this.isExhausted,
      isExhausted: this.isExhausted,
      locationName: sectorName,
      coordinates: coords,
      environmentalStatus,
      hazardLevel,
    };
  }

  public getTelemetry(): TelemetryData {
    const deg = Math.round(((((-this.yaw * 180) / Math.PI) % 360) + 360) % 360);
    const elev = Math.round(1420 + (this.position.y - 4.2) * 10);
    const temp = Math.round((18.4 - (this.position.y - 4.2) * 0.2) * 10) / 10;
    return {
      headingDegrees: deg,
      temperatureCelsius: temp,
      elevationMeters: elev,
      timeOfDay: 'day',
      timeLabel: 'SOLAR CYCLE: NORMAL',
    };
  }

  public getLookDirection(): THREE.Vector3 {
    this.camera.getWorldDirection(this._cachedLookDir);
    return this._cachedLookDir;
  }
}
