/**
 * First-person player controller for The Drifting World.
 * Strictly first-person only.
 * Supports smooth mobile virtual joystick + touch-drag look,
 * and desktop WASD + pointer-lock mouse look.
 */
import * as THREE from 'three';
import { soundSystem } from './audio';

export interface PlayerInput {
  moveForward: number; // -1 to 1
  moveRight: number;   // -1 to 1
  lookDeltaX: number;  // radians or pixels
  lookDeltaY: number;  // radians or pixels
  jump: boolean;
  interact: boolean;
}

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public yaw: number = 0;   // horizontal rotation
  public pitch: number = 0; // vertical rotation (-85 to +85 deg)
  public isGrounded: boolean = true;
  public lastCheckpoint: THREE.Vector3;

  private eyeHeight: number = 1.65;
  private walkSpeed: number = 5.2;
  private jumpForce: number = 7.4;
  private gravity: number = -22.0;

  // Head bobbing
  private bobTimer: number = 0;
  private bobOffset: number = 0;
  private footstepTimer: number = 0;

  // Collision colliders (island top meshes, stepping stones, bridge)
  public walkableMeshes: THREE.Object3D[] = [];
  private raycaster: THREE.Raycaster;

  // Respawn state
  public isRespawning: boolean = false;
  public respawnFadeAlpha: number = 0;
  public onRespawnCallback?: () => void;

  // Input states
  public input: PlayerInput = {
    moveForward: 0,
    moveRight: 0,
    lookDeltaX: 0,
    lookDeltaY: 0,
    jump: false,
    interact: false,
  };

  public sensitivity: number = 1.2;

  constructor(initialPosition: [number, number, number] = [0, 2.5, 0]) {
    this.position = new THREE.Vector3(...initialPosition);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.lastCheckpoint = this.position.clone();

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1200);
    this.camera.position.copy(this.position);
    this.camera.position.y += this.eyeHeight;
    this.camera.rotation.order = 'YXZ';

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 3.5;
  }

  public setCheckpoint(pos: THREE.Vector3) {
    this.lastCheckpoint.copy(pos);
    this.lastCheckpoint.y += 0.5; // slight clearance
  }

  public setSensitivity(s: number) {
    this.sensitivity = Math.max(0.4, Math.min(3.0, s));
  }

  public applyLookDelta(deltaX: number, deltaY: number, isTouch: boolean = false) {
    // Touch deltas are in screen pixels, mouse deltas in movementX/Y
    const factor = isTouch ? 0.0035 * this.sensitivity : 0.0022 * this.sensitivity;

    this.yaw -= deltaX * factor;
    this.pitch -= deltaY * factor;

    // Clamp pitch strictly between -85 and +85 degrees to avoid flipping upside-down
    const maxPitch = (85 * Math.PI) / 180;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  public update(delta: number) {
    if (this.isRespawning) {
      this.respawnFadeAlpha = Math.min(1.0, this.respawnFadeAlpha + delta * 2.5);
      if (this.respawnFadeAlpha >= 1.0) {
        // Teleport to checkpoint
        this.position.copy(this.lastCheckpoint);
        this.velocity.set(0, 0, 0);
        this.isRespawning = false;
        if (this.onRespawnCallback) this.onRespawnCallback();
      }
      return;
    } else if (this.respawnFadeAlpha > 0) {
      this.respawnFadeAlpha = Math.max(0, this.respawnFadeAlpha - delta * 2.0);
    }

    // Clamp delta to prevent tunneling through ground during lag spikes
    const dt = Math.min(delta, 0.08);

    // 1. Process movement direction based on current yaw (first-person eyes)
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    const moveDir = new THREE.Vector3();
    if (Math.abs(this.input.moveForward) > 0.01) {
      moveDir.addScaledVector(forward, this.input.moveForward);
    }
    if (Math.abs(this.input.moveRight) > 0.01) {
      moveDir.addScaledVector(right, this.input.moveRight);
    }

    if (moveDir.lengthSq() > 1.0) {
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

    // Apply gravity
    this.velocity.y += this.gravity * dt;

    // Proposed new position
    const nextPos = this.position.clone();
    nextPos.x += this.velocity.x * dt;
    nextPos.z += this.velocity.z * dt;
    nextPos.y += this.velocity.y * dt;

    // Ground & platform collision via downward raycast
    const wasGrounded = this.isGrounded;
    this.checkCollisions(nextPos, dt);

    if (!wasGrounded && this.isGrounded) {
      soundSystem.playLand();
    }

    // Fall-off check into the misty ocean void
    if (this.position.y < -9.5 && !this.isRespawning) {
      this.triggerRespawn();
      return;
    }

    // Footsteps & head bobbing
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.isGrounded && horizontalSpeed > 0.8) {
      this.bobTimer += dt * (horizontalSpeed * 2.2);
      this.bobOffset = Math.sin(this.bobTimer) * 0.035;

      this.footstepTimer += dt * horizontalSpeed;
      if (this.footstepTimer > 2.8) {
        this.footstepTimer = 0;
        soundSystem.playFootstep();
      }
    } else {
      this.bobOffset *= 0.85; // gently return to center
      this.footstepTimer = 0;
    }

    // Update camera representation (player's first-person eyes)
    this.camera.position.set(
      this.position.x,
      this.position.y + this.eyeHeight + this.bobOffset,
      this.position.z
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  private checkCollisions(nextPos: THREE.Vector3, _dt: number) {
    // Cast ray from waist height downwards
    const rayOrigin = new THREE.Vector3(nextPos.x, nextPos.y + 1.2, nextPos.z);
    this.raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
    this.raycaster.far = 2.4;

    const hits = this.raycaster.intersectObjects(this.walkableMeshes, true);

    if (hits.length > 0) {
      const hit = hits[0];
      const groundY = hit.point.y;

      // If next position would fall through or is close to ground
      if (nextPos.y <= groundY + 0.1) {
        this.position.x = nextPos.x;
        this.position.z = nextPos.z;
        this.position.y = groundY;
        this.velocity.y = 0;
        this.isGrounded = true;
        return;
      }
    }

    // In mid-air or walking off an edge
    this.isGrounded = false;
    this.position.copy(nextPos);
  }

  public triggerRespawn() {
    this.isRespawning = true;
    this.respawnFadeAlpha = 0;
    soundSystem.playRespawnTone();
  }

  public getLookDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }
}
