import * as THREE from '../vendor/three.js';
import { sampleIslandSurfaceY, resolveObstacleCollisions } from '../world/Collision.js';
import { PlatformCarry } from '../world/PlatformCarry.js';

const GRAVITY = -21.0;
const JUMP_VEL = 8.4;
const GLIDE_MAX_SINK = -1.65;
const WALK_SPEED = 6.5;
const SPRINT_SPEED = 9.2;
const EYE_HEIGHT = 1.68;
const MAX_BREATH = 6.0;

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();
const _eye = new THREE.Vector3();

/**
 * First-person exploration controller with moving-island carry, Skycloak glide,
 * Ember Lantern budget, Windcall cooldown, and cloud-sea rescue.
 */
export class PlayerController {
  /**
   * @param {import('./FirstPersonCamera.js').FirstPersonCamera} fpCamera
   * @param {import('../core/EventBus.js').EventBus} bus
   */
  constructor(fpCamera, bus) {
    this.fpCamera = fpCamera;
    this.bus = bus;
    this.carry = new PlatformCarry();

    this.position = new THREE.Vector3(0, 4.55, 2.5);
    this.velocity = new THREE.Vector3();
    this.grounded = false;
    this.gliding = false;
    this.coyoteTimer = 0;
    this.jumpBuffer = 0;

    this.ember = 100;
    this.breath = MAX_BREATH;
    this.windcallCooldown = 0;
    this.hasWayglass = false;
    this.safeIslandId = 'kestrel_raft';
    this._stepAccum = 0;
    this._lampHitCooldown = 0;

    this.input = {
      forward: 0,
      strafe: 0,
      sprint: false,
      jumpHeld: false,
      jumpJustPressed: false,
    };
  }

  /**
   * Place player onto a specific island spawn point.
   * @param {object} island
   */
  teleportToIsland(island) {
    const local = island.spawnLocal || [0, 0.7, 0];
    this.position.set(
      island.group.position.x + local[0],
      island.group.position.y + local[1],
      island.group.position.z + local[2]
    );
    this.velocity.set(0, 0, 0);
    this.grounded = true;
    this.gliding = false;
    this.breath = MAX_BREATH;
    this.safeIslandId = island.id;
    this.carry.setGroundedIsland(island);
    this.fpCamera.setAngles(0, -0.06);
    this.syncCamera();
  }

  triggerJump() {
    this.jumpBuffer = 0.14;
    this.input.jumpHeld = true;
  }

  releaseJump() {
    this.input.jumpHeld = false;
  }

  /**
   * Fixed 60 Hz simulation step.
   * @param {number} dt
   * @param {Map<string, object>} islandMap
   * @param {boolean} paused
   */
  step(dt, islandMap, paused) {
    if (paused) return;

    if (this.windcallCooldown > 0) this.windcallCooldown = Math.max(0, this.windcallCooldown - dt);
    if (this._lampHitCooldown > 0) this._lampHitCooldown = Math.max(0, this._lampHitCooldown - dt);

    // 1. Carry player with whichever island they stood on last tick
    this.carry.applyCarry(islandMap, this.position);

    // 2. Horizontal movement relative to camera yaw
    const yaw = this.fpCamera.yaw;
    _forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    _right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    _move.set(0, 0, 0)
      .addScaledVector(_forward, this.input.forward)
      .addScaledVector(_right, this.input.strafe);

    const len = _move.length();
    if (len > 1) _move.divideScalar(len);

    const speed = this.input.sprint ? SPRINT_SPEED : WALK_SPEED;
    const accel = this.grounded ? 14 : 7;
    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, _move.x * speed, Math.min(1, accel * dt));
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, _move.z * speed, Math.min(1, accel * dt));

    // 3. Coyote + Jump + Skycloak Glide
    if (this.grounded) {
      this.coyoteTimer = 0.12;
      this.breath = Math.min(MAX_BREATH, this.breath + (MAX_BREATH / 3.0) * dt);
      this.gliding = false;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (this.jumpBuffer > 0) {
      this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
      if (this.coyoteTimer > 0) {
        this.velocity.y = JUMP_VEL;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBuffer = 0;
        this.carry.setGroundedIsland(null);
        this.bus.emit('player:jump');
      }
    }

    // Updraft check across nearby islands
    let inUpdraft = false;
    for (const island of islandMap.values()) {
      for (const u of island.updrafts) {
        const ux = island.group.position.x + u.localPos.x;
        const uy = island.group.position.y + u.localPos.y;
        const uz = island.group.position.z + u.localPos.z;
        const dx = this.position.x - ux;
        const dz = this.position.z - uz;
        if (dx * dx + dz * dz <= u.radius * u.radius && this.position.y >= uy - 1.0 && this.position.y <= uy + u.lift + 2.0) {
          inUpdraft = true;
          this.velocity.y = Math.max(this.velocity.y, Math.min(10.5, u.lift * 0.78));
          this.grounded = false;
          this.gliding = true;
          this.breath = MAX_BREATH;
        }
      }
    }

    if (!this.grounded && !inUpdraft) {
      if (this.input.jumpHeld && this.velocity.y < 0 && this.breath > 0.05) {
        this.gliding = true;
        this.breath = Math.max(0, this.breath - dt);
      } else {
        this.gliding = false;
      }
    }

    // 4. Vertical integration
    this.velocity.y += GRAVITY * dt;
    if (this.gliding && this.velocity.y < GLIDE_MAX_SINK) {
      this.velocity.y = GLIDE_MAX_SINK;
    }

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // 5. Island ground + obstacle resolution
    let landedIsland = null;
    let bestGroundY = -Infinity;

    for (const island of islandMap.values()) {
      resolveObstacleCollisions(island, this.position, 0.42);
      const sy = sampleIslandSurfaceY(island, this.position.x, this.position.z);
      if (sy !== null) {
        // Snap if near deck height and falling/walking
        if (this.position.y <= sy + 0.38 && this.position.y >= sy - 1.35 && this.velocity.y <= 1.2) {
          if (sy > bestGroundY) {
            bestGroundY = sy;
            landedIsland = island;
          }
        }
      }
    }

    if (landedIsland) {
      this.position.y = bestGroundY;
      this.velocity.y = 0;
      this.grounded = true;
      this.gliding = false;
      this.safeIslandId = landedIsland.id;
      this.carry.setGroundedIsland(landedIsland);
    } else {
      this.grounded = false;
      this.carry.setGroundedIsland(null);
    }

    // 6. Footstep audio cadence
    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.grounded && horizSpeed > 1.2) {
      this._stepAccum += horizSpeed * dt;
      if (this._stepAccum >= 2.15) {
        this._stepAccum = 0;
        this.bus.emit('player:step');
      }
    } else {
      this._stepAccum = 0;
    }

    // 7. Ember lantern drain outdoors (refills passively near braziers / lit beacons)
    let nearWarmth = false;
    for (const island of islandMap.values()) {
      for (const inter of island.interactables) {
        if ((inter.type === 'brazier' || (inter.type === 'beacon' && inter.lit))) {
          const wx = island.group.position.x + inter.localPos.x;
          const wy = island.group.position.y + inter.localPos.y;
          const wz = island.group.position.z + inter.localPos.z;
          const dSq = (this.position.x - wx) ** 2 + (this.position.y - wy) ** 2 + (this.position.z - wz) ** 2;
          if (dSq < 18) {
            nearWarmth = true;
            this.ember = Math.min(100, this.ember + 28 * dt);
          }
        }
      }

      // Hollow Lamp proximity drain (light stealth hazard, never kills)
      for (const lamp of island.hollowLamps) {
        const lx = island.group.position.x + lamp.mesh.position.x;
        const ly = island.group.position.y + lamp.mesh.position.y;
        const lz = island.group.position.z + lamp.mesh.position.z;
        const dSq = (this.position.x - lx) ** 2 + (this.position.y + 0.9 - ly) ** 2 + (this.position.z - lz) ** 2;
        if (dSq < 2.25 && this._lampHitCooldown <= 0) {
          this._lampHitCooldown = 2.0;
          this.ember = Math.max(8, this.ember - 35);
          this.bus.emit('player:lampHit');
        }
      }
    }
    if (!nearWarmth) {
      this.ember = Math.max(10, this.ember - 0.55 * dt);
    }

    // 8. Gentle cloud-sea rescue if falling off sky-lanes
    if (this.position.y < -14) {
      const safe = islandMap.get(this.safeIslandId) || islandMap.get('kestrel_raft');
      if (safe) {
        this.teleportToIsland(safe);
        this.bus.emit('player:rescued', safe.name);
      }
    }
  }

  syncCamera() {
    _eye.set(this.position.x, this.position.y + EYE_HEIGHT, this.position.z);
    this.fpCamera.syncCamera(_eye);
  }
}
