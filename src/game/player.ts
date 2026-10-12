/**
 * Player Controller for The Drifting Land.
 * Supports First-Person, Third-Person, and Second-Person Observer View.
 * Features sprint physics, smooth camera transitions, and telemetry data.
 */
import * as THREE from 'three';
import { soundSystem } from './audio';
import { TelemetryData, CameraMode } from './types';

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
  public cameraMode: CameraMode = 'third_person';

  // Camera settings
  private cameraDistance: number = 4.2;
  private cameraTargetHeight: number = 1.5;
  private currentCameraPos: THREE.Vector3 = new THREE.Vector3();

  // Movement physics
  private walkSpeed: number = 5.8;
  private sprintMultiplier: number = 1.65;
  private jumpForce: number = 7.6;
  private gravity: number = -22.0;

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

  public update(delta: number) {
    if (this.isRespawning) {
      this.respawnFadeAlpha = Math.min(1.0, this.respawnFadeAlpha + delta * 2.5);
      if (this.respawnFadeAlpha >= 1.0) {
        this.position.set(this.lastCheckpoint.x, Math.max(4.2, this.lastCheckpoint.y), this.lastCheckpoint.z);
        this.velocity.set(0, 0, 0);
        this.isGrounded = true;
        this.isRespawning = false;
        if (this.onRespawnCallback) this.onRespawnCallback();
      }
      return;
    } else if (this.respawnFadeAlpha > 0) {
      this.respawnFadeAlpha = Math.max(0, this.respawnFadeAlpha - delta * 2.0);
    }

    const dt = Math.min(delta, 0.08);
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    const moveDir = new THREE.Vector3();
    if (Math.abs(this.input.moveForward) > 0.01) {
      moveDir.addScaledVector(forward, this.input.moveForward);
    }
    if (Math.abs(this.input.moveRight) > 0.01) {
      moveDir.addScaledVector(right, this.input.moveRight);
    }

    const isMoving = moveDir.lengthSq() > 0.01;
    if (isMoving) {
      moveDir.normalize();
    }

    const currentSpeed = this.input.sprint ? this.walkSpeed * this.sprintMultiplier : this.walkSpeed;
    const targetVx = moveDir.x * currentSpeed;
    const targetVz = moveDir.z * currentSpeed;

    const lerpFactor = this.isGrounded ? 12.0 * dt : 3.0 * dt;
    this.velocity.x += (targetVx - this.velocity.x) * Math.min(1, lerpFactor);
    this.velocity.z += (targetVz - this.velocity.z) * Math.min(1, lerpFactor);

    if (this.input.jump && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
      this.input.jump = false;
      soundSystem.playJump();
    }

    this.velocity.y += this.gravity * dt;

    const nextPos = this.position.clone();
    nextPos.x += this.velocity.x * dt;
    nextPos.z += this.velocity.z * dt;
    nextPos.y += this.velocity.y * dt;

    // Ground raycasting & floor snapping
    const groundElevation = this.checkGroundCollision(nextPos);

    if (nextPos.y <= groundElevation) {
      nextPos.y = groundElevation;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      if (this.isGrounded && nextPos.y - groundElevation < 0.35) {
        nextPos.y = groundElevation;
        this.velocity.y = 0;
      } else {
        this.isGrounded = false;
      }
    }

    this.position.copy(nextPos);

    // Void fall detection
    if (this.position.y < -35 && !this.isRespawning) {
      this.triggerRespawn();
    }

    // Update 3D Character Model position and limb animation
    this.updateCharacterAnimation(dt, isMoving, moveDir);

    // Update camera depending on active camera mode
    this.updateCamera(dt);
  }

  private checkGroundCollision(probePos: THREE.Vector3): number {
    if (this.walkableMeshes.length === 0) {
      return 4.2;
    }

    const rayOrigin = new THREE.Vector3(probePos.x, probePos.y + 1.2, probePos.z);
    this.raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));

    const hits = this.raycaster.intersectObjects(this.walkableMeshes, true);
    if (hits.length > 0) {
      const topHit = hits[0].point.y;
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
      this.rightArmMesh.rotation.x = armSwing * 0.3;

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
      this.rightArmMesh.rotation.x = 0;

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
      const eyePos = new THREE.Vector3(this.position.x, this.position.y + 1.62, this.position.z);
      this.camera.position.copy(eyePos);

      const cosPitch = Math.cos(this.pitch);
      const lookTarget = new THREE.Vector3(
        eyePos.x - Math.sin(this.yaw) * cosPitch,
        eyePos.y + Math.sin(this.pitch),
        eyePos.z - Math.cos(this.yaw) * cosPitch
      );
      this.camera.lookAt(lookTarget);
      return;
    }

    if (this.cameraMode === 'second_person') {
      // Observer View: frontal perspective looking back towards the player
      const frontDist = 4.0;
      const target = new THREE.Vector3(this.position.x, this.position.y + 1.35, this.position.z);
      const frontX = this.position.x - Math.sin(this.yaw - 0.4) * frontDist;
      const frontY = this.position.y + 2.2;
      const frontZ = this.position.z - Math.cos(this.yaw - 0.4) * frontDist;
      const desiredPos = new THREE.Vector3(frontX, frontY, frontZ);

      this.currentCameraPos.lerp(desiredPos, Math.min(1.0, 14.0 * dt));
      this.camera.position.copy(this.currentCameraPos);
      this.camera.lookAt(target);
      return;
    }

    // Default Third-Person Orbit View
    const target = new THREE.Vector3(this.position.x, this.position.y + this.cameraTargetHeight, this.position.z);
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);

    const offsetX = Math.sin(this.yaw) * cosPitch * this.cameraDistance;
    const offsetY = sinPitch * this.cameraDistance;
    const offsetZ = Math.cos(this.yaw) * cosPitch * this.cameraDistance;

    const desiredCameraPos = new THREE.Vector3(target.x + offsetX, target.y + offsetY, target.z + offsetZ);
    this.currentCameraPos.lerp(desiredCameraPos, Math.min(1.0, 16.0 * dt));
    this.camera.position.copy(this.currentCameraPos);
    this.camera.lookAt(target);
  }

  public triggerRespawn() {
    this.isRespawning = true;
    this.respawnFadeAlpha = 0;
    soundSystem.playRespawnTone();
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
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }
}
