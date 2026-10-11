/**
 * Third-Person Player Controller for The Drifting Land.
 * Strictly Third-Person ONLY.
 * Features:
 * - 3D Sci-Fi Explorer Character Model with procedural walking/running limb animations
 * - Smooth orbiting third-person camera trailing behind the character
 * - Brass Field Compass held by the character
 * - Robust collision physics preventing any falling-through-floor bugs
 * - Real-time TelemetryData (Heading, Elevation, Temperature)
 */
import * as THREE from 'three';
import { soundSystem } from './audio';
import { TelemetryData } from './types';

export interface PlayerInput {
  moveForward: number; // -1 to 1
  moveRight: number;   // -1 to 1
  lookDeltaX: number;  // radians or pixels
  lookDeltaY: number;  // radians or pixels
  jump: boolean;
  interact: boolean;
}

export class PlayerController {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public yaw: number = 0;   // camera orbit horizontal angle
  public pitch: number = 0.25; // camera orbit vertical angle
  public isGrounded: boolean = true;
  public lastCheckpoint: THREE.Vector3;

  // Third-person camera settings
  private cameraDistance: number = 4.2;
  private cameraTargetHeight: number = 1.5;
  private currentCameraPos: THREE.Vector3 = new THREE.Vector3();

  // Movement physics
  private walkSpeed: number = 5.8;
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
    interact: false,
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

    // Build Third-Person Character Model & add directly to scene
    this.buildCharacterModel();
    this.updateCamera(0.016);
  }

  /**
   * Builds the stylized sci-fi explorer character model visible in Third Person!
   */
  private buildCharacterModel() {
    this.characterGroup = new THREE.Group();
    this.characterGroup.position.copy(this.position);

    // Materials
    const matSuitBlue = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // explorer cyan-blue jacket
      roughness: 0.5,
      metalness: 0.1,
      flatShading: true,
    });

    const matDarkPants = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // slate dark trousers
      roughness: 0.6,
      flatShading: true,
    });

    const matHelmet = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // pale tactical helmet
      roughness: 0.3,
      metalness: 0.2,
      flatShading: true,
    });

    const matVisor = new THREE.MeshBasicMaterial({
      color: 0x00f0c0, // glowing cyan visor
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

    // 1. Torso
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.65, 0.35);
    this.torsoMesh = new THREE.Mesh(torsoGeo, matSuitBlue);
    this.torsoMesh.position.y = 1.05;
    this.characterGroup.add(this.torsoMesh);

    // Explorer Backpack with glowing light
    const packGeo = new THREE.BoxGeometry(0.4, 0.5, 0.22);
    const backpack = new THREE.Mesh(packGeo, matDarkPants);
    backpack.position.set(0, 0.05, -0.25);
    this.torsoMesh.add(backpack);

    const packLight = new THREE.PointLight(0x00f0c0, 1.2, 3);
    packLight.position.set(0, 0.15, -0.15);
    backpack.add(packLight);

    // 2. Head & Helmet
    const headGeo = new THREE.SphereGeometry(0.24, 12, 10);
    this.headMesh = new THREE.Mesh(headGeo, matHelmet);
    this.headMesh.position.set(0, 0.52, 0);
    this.torsoMesh.add(this.headMesh);

    // Visor
    const visorGeo = new THREE.BoxGeometry(0.26, 0.12, 0.15);
    const visor = new THREE.Mesh(visorGeo, matVisor);
    visor.position.set(0, 0, 0.18);
    this.headMesh.add(visor);

    // 3. Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.65, 0.22);
    // Left leg
    this.leftLegMesh = new THREE.Mesh(legGeo, matDarkPants);
    this.leftLegMesh.position.set(-0.16, 0.42, 0);
    this.characterGroup.add(this.leftLegMesh);

    // Right leg
    this.rightLegMesh = new THREE.Mesh(legGeo, matDarkPants);
    this.rightLegMesh.position.set(0.16, 0.42, 0);
    this.characterGroup.add(this.rightLegMesh);

    // Boots
    const bootGeo = new THREE.BoxGeometry(0.22, 0.2, 0.3);
    const bootL = new THREE.Mesh(bootGeo, matBoots);
    bootL.position.set(0, -0.32, 0.04);
    this.leftLegMesh.add(bootL);

    const bootR = new THREE.Mesh(bootGeo, matBoots);
    bootR.position.set(0, -0.32, 0.04);
    this.rightLegMesh.add(bootR);

    // 4. Arms
    const armGeo = new THREE.BoxGeometry(0.16, 0.6, 0.18);
    // Left arm
    this.leftArmMesh = new THREE.Mesh(armGeo, matSuitBlue);
    this.leftArmMesh.position.set(-0.36, 1.05, 0);
    this.characterGroup.add(this.leftArmMesh);

    // Right arm (holding field compass!)
    this.rightArmMesh = new THREE.Mesh(armGeo, matSuitBlue);
    this.rightArmMesh.position.set(0.36, 1.05, 0);
    this.characterGroup.add(this.rightArmMesh);

    // Brass Field Compass in Right Hand
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

  public applyLookDelta(deltaX: number, deltaY: number, isTouch: boolean = false) {
    const factor = isTouch ? 0.0035 * this.sensitivity : 0.0022 * this.sensitivity;

    this.yaw -= deltaX * factor;
    this.pitch += deltaY * factor;

    // Clamp vertical orbit angle so camera stays behind character and doesn't invert
    this.pitch = Math.max(-0.3, Math.min(1.2, this.pitch));
  }

  public update(delta: number) {
    if (this.isRespawning) {
      this.respawnFadeAlpha = Math.min(1.0, this.respawnFadeAlpha + delta * 2.5);
      if (this.respawnFadeAlpha >= 1.0) {
        // Safely respawn on solid ground
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

    // Movement relative to current third-person camera horizontal angle
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

    // Horizontal acceleration & friction
    const targetVx = moveDir.x * this.walkSpeed;
    const targetVz = moveDir.z * this.walkSpeed;

    const lerpFactor = this.isGrounded ? 12.0 * dt : 3.0 * dt;
    this.velocity.x += (targetVx - this.velocity.x) * Math.min(1, lerpFactor);
    this.velocity.z += (targetVz - this.velocity.z) * Math.min(1, lerpFactor);

    // Jump handling
    if (this.input.jump && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
      this.input.jump = false;
      soundSystem.playJump();
    }

    // Gravity
    this.velocity.y += this.gravity * dt;

    // Proposed new position
    const nextPos = this.position.clone();
    nextPos.x += this.velocity.x * dt;
    nextPos.z += this.velocity.z * dt;
    nextPos.y += this.velocity.y * dt;

    const wasGrounded = this.isGrounded;
    this.checkCollisions(nextPos);

    if (!wasGrounded && this.isGrounded) {
      soundSystem.playLand();
    }

    // Fall-off check into the cloud sea abyss
    if (this.position.y < -12.0 && !this.isRespawning) {
      this.triggerRespawn();
      return;
    }

    // Update 3D Character Position & Rotation
    this.characterGroup.position.copy(this.position);

    if (isMoving) {
      // Rotate character to face movement direction smoothly
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.characterGroup.rotation.y = targetAngle;

      // Animate limb swinging
      this.animTimer += dt * 10.0;
      const swing = Math.sin(this.animTimer) * 0.55;

      this.leftLegMesh.rotation.x = swing;
      this.rightLegMesh.rotation.x = -swing;
      this.leftArmMesh.rotation.x = -swing * 0.8;
      this.rightArmMesh.rotation.x = swing * 0.4; // subtle swing while holding compass

      // Footstep sound
      this.footstepTimer += dt * Math.hypot(this.velocity.x, this.velocity.z);
      if (this.footstepTimer > 2.6) {
        this.footstepTimer = 0;
        soundSystem.playFootstep();
      }
    } else {
      // Return limbs to idle
      this.leftLegMesh.rotation.x *= 0.8;
      this.rightLegMesh.rotation.x *= 0.8;
      this.leftArmMesh.rotation.x *= 0.8;
      this.rightArmMesh.rotation.x *= 0.8;

      // Idle breathing sway
      const idleTime = performance.now() * 0.002;
      this.torsoMesh.position.y = 1.05 + Math.sin(idleTime) * 0.015;
    }

    // Update Third-Person Camera
    this.updateCamera(dt);
  }

  /**
   * Robust Collision Physics:
   * Combines analytical platform floor boundaries with raycasting.
   * Completely prevents falling through the floor or death loops!
   */
  private checkCollisions(nextPos: THREE.Vector3) {
    // 1. Analytical Solid Floor Bounds for Platforms & Bridges:
    // A. Main Observation Catwalk Platform:
    // Extents: X from -8.2 to 8.2, Z from -7.2 to 7.2. Floor elevation is 4.2.
    if (Math.abs(nextPos.x) <= 8.2 && nextPos.z >= -7.2 && nextPos.z <= 7.2) {
      if (nextPos.y <= 4.2) {
        this.position.x = nextPos.x;
        this.position.z = nextPos.z;
        this.position.y = 4.2;
        this.velocity.y = 0;
        this.isGrounded = true;
        return;
      }
    }

    // B. Walkable Elevated Sky-Bridge:
    // Extents: X from -2.2 to 2.2, Z from -5.0 down to -48.0. Floor elevation is 4.2.
    if (Math.abs(nextPos.x) <= 2.2 && nextPos.z <= -5.0 && nextPos.z >= -48.0) {
      if (nextPos.y <= 4.2) {
        this.position.x = nextPos.x;
        this.position.z = nextPos.z;
        this.position.y = 4.2;
        this.velocity.y = 0;
        this.isGrounded = true;
        return;
      }
    }

    // 2. High-tolerance Raycast downward from chest level
    const rayOrigin = new THREE.Vector3(nextPos.x, nextPos.y + 1.8, nextPos.z);
    this.raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
    this.raycaster.far = 3.8;

    if (this.walkableMeshes.length > 0) {
      const hits = this.raycaster.intersectObjects(this.walkableMeshes, true);
      if (hits.length > 0) {
        const groundY = hits[0].point.y;
        if (nextPos.y <= groundY + 0.1) {
          this.position.x = nextPos.x;
          this.position.z = nextPos.z;
          this.position.y = groundY;
          this.velocity.y = 0;
          this.isGrounded = true;
          return;
        }
      }
    }

    // Mid-air fall
    this.isGrounded = false;
    this.position.copy(nextPos);
  }

  /**
   * Updates the Third-Person Camera trailing behind the character.
   */
  private updateCamera(dt: number) {
    const target = new THREE.Vector3(
      this.position.x,
      this.position.y + this.cameraTargetHeight,
      this.position.z
    );

    // Calculate third-person camera offset based on yaw and pitch
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);

    const offsetX = Math.sin(this.yaw) * cosPitch * this.cameraDistance;
    const offsetY = sinPitch * this.cameraDistance;
    const offsetZ = Math.cos(this.yaw) * cosPitch * this.cameraDistance;

    const desiredCameraPos = new THREE.Vector3(
      target.x + offsetX,
      target.y + offsetY,
      target.z + offsetZ
    );

    // Smooth camera lag
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
    };
  }

  public getLookDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }
}
