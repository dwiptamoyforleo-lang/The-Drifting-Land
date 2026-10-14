import * as THREE from 'three';
import { CameraMode, PlayerStats } from './types';

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public health: number = 100;
  public maxHealth: number = 100;
  public stamina: number = 100;
  public maxStamina: number = 100;
  public isSprinting: boolean = false;
  public isGrounded: boolean = true;
  public isRespawning: boolean = false;
  public respawnFadeAlpha: number = 0;
  public cameraMode: CameraMode = 'third_person';

  public input = {
    moveForward: 0,
    moveRight: 0,
    jump: false,
    sprint: false,
    primaryAction: false,
  };

  private euler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private sensitivity: number = 0.0022;
  public walkableMeshes: THREE.Object3D[] = [];
  public getNearbyObserver?: () => { position: THREE.Vector3; name: string } | null;
  public onDamageTaken?: (amount: number, reason: string) => void;
  public onStatsChange?: () => void;

  private cameraPivot: THREE.Group = new THREE.Group();
  private thirdPersonDistance: number = 6.5;

  constructor(scene: THREE.Scene, spawnPos: [number, number, number]) {
    this.position = new THREE.Vector3(...spawnPos);
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1500);
    scene.add(this.cameraPivot);
  }

  public setSensitivity(val: number) {
    this.sensitivity = 0.0022 * val;
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
  }

  public applyLookDelta(deltaX: number, deltaY: number, isTouch: boolean = false) {
    const factor = isTouch ? 0.8 : 1.0;
    this.euler.y -= deltaX * this.sensitivity * factor;
    this.euler.x -= deltaY * this.sensitivity * factor;
    this.euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.euler.x));
  }

  public update(delta: number) {
    if (this.isRespawning) {
      this.respawnFadeAlpha = Math.min(1, this.respawnFadeAlpha + delta * 2.0);
      return;
    } else if (this.respawnFadeAlpha > 0) {
      this.respawnFadeAlpha = Math.max(0, this.respawnFadeAlpha - delta * 2.0);
    }

    // Movement calculation
    const speed = this.input.sprint && this.stamina > 5 ? 7.2 : 4.2;
    if (this.input.sprint && this.input.moveForward !== 0) {
      this.stamina = Math.max(0, this.stamina - delta * 18);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * 12);
    }

    const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, this.euler.y, 0));
    const rightDir = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, this.euler.y, 0));

    const moveDir = new THREE.Vector3()
      .addScaledVector(forwardDir, this.input.moveForward)
      .addScaledVector(rightDir, this.input.moveRight);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      this.position.x += moveDir.x * speed * delta;
      this.position.z += moveDir.z * speed * delta;
    }

    // Gravity & Ground collision
    if (!this.isGrounded) {
      this.velocity.y -= 14.0 * delta;
    } else {
      this.velocity.y = 0;
    }
    this.position.y += this.velocity.y * delta;

    // Platform height check
    let groundHeight = 4.2;
    for (const mesh of this.walkableMeshes) {
      const box = new THREE.Box3().setFromObject(mesh);
      if (
        this.position.x >= box.min.x &&
        this.position.x <= box.max.x &&
        this.position.z >= box.min.z &&
        this.position.z <= box.max.z
      ) {
        if (box.max.y > groundHeight && this.position.y >= box.max.y - 1.5) {
          groundHeight = box.max.y;
        }
      }
    }

    if (this.position.y <= groundHeight) {
      this.position.y = groundHeight;
      this.isGrounded = true;
      this.velocity.y = 0;
    } else if (this.position.y > groundHeight + 0.3) {
      this.isGrounded = false;
    }

    if (this.input.jump && this.isGrounded) {
      this.velocity.y = 5.8;
      this.isGrounded = false;
      this.input.jump = false;
    }

    // Camera positioning based on mode
    if (this.cameraMode === 'first_person') {
      this.camera.position.copy(this.position).add(new THREE.Vector3(0, 1.7, 0));
      this.camera.quaternion.setFromEuler(this.euler);
    } else if (this.cameraMode === 'second_person') {
      if (this.getNearbyObserver) {
        const obs = this.getNearbyObserver();
        if (obs) {
          this.camera.position.copy(obs.position);
          this.camera.lookAt(this.position);
          return;
        }
      }
      // Fallback second-person front view
      const camOffset = new THREE.Vector3(0, 2.2, 3.5).applyEuler(new THREE.Euler(0, this.euler.y, 0));
      this.camera.position.copy(this.position).add(camOffset);
      this.camera.lookAt(this.position);
    } else {
      // Third-person orbital
      const camOffset = new THREE.Vector3(0, 2.2, this.thirdPersonDistance).applyEuler(this.euler);
      this.camera.position.copy(this.position).add(camOffset);
      this.camera.lookAt(this.position.clone().add(new THREE.Vector3(0, 1.4, 0)));
    }
  }

  public takeDamage(amount: number, reason: string) {
    this.health = Math.max(0, this.health - amount);
    if (this.onDamageTaken) this.onDamageTaken(amount, reason);
    if (this.health <= 0) {
      this.respawn();
    }
  }

  public heal(amount: number, notify: boolean = true) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    if (notify && this.onStatsChange) this.onStatsChange();
  }

  public restoreStamina(amount: number, notify: boolean = true) {
    this.stamina = Math.min(this.maxStamina, this.stamina + amount);
    if (notify && this.onStatsChange) this.onStatsChange();
  }

  public respawn() {
    this.isRespawning = true;
    setTimeout(() => {
      this.health = this.maxHealth;
      this.stamina = this.maxStamina;
      this.position.set(0, 4.2, 0);
      this.isRespawning = false;
    }, 1200);
  }

  public getPlayerStats(): PlayerStats {
    return {
      maxHealth: this.maxHealth,
      maxStamina: this.maxStamina,
      speedMultiplier: 1.0,
      fallDamageReduction: 10,
      staminaRegenRate: 24,
    };
  }

  public getTelemetry() {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      currency: 150,
      dayNumber: 1,
      worldTime: '14:30',
      timeToSunset: '3h 15m',
      currentLocation: 'Sector 01: Aero-Haven Observation Deck',
      currentObjective: 'Harmonize the 3 Magical Anchors across the archipelago.',
    };
  }
}
