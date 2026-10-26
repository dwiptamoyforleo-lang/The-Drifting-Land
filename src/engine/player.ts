/**
 * Player Controller & 3-12 Part Procedural Explorer Character for The Drifting Land.
 * Adheres strictly to the Three.js skill:
 * - 3-12 distinct parts across primary silhouette, secondary read, and accent detail
 * - Pivot at bottom-center flush with terrain
 * - Radial contact shadow grounding plane
 * - Frame delta clamp and coyote-time jump physics
 * - Smooth third-person orbital camera following
 */

import * as THREE from 'three';
import { InputState, PlayerStats } from '../types/game';
import { AudioService } from '../services/audio';

// Pre-allocated reusable math vectors (Zero GC in render loop)
const _moveDir = new THREE.Vector3();
const _camOffset = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();

export class PlayerController {
  public group: THREE.Group;
  public stats: PlayerStats;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public isGrounded: boolean = true;
  public facingAngle: number = 0;
  public staminaRegenModifier: number = 1.0;

  // Jump & Dash mechanics
  private coyoteTimer: number = 0;
  private jumpBufferTimer: number = 0;
  private dashCooldown: number = 0;
  private dashDuration: number = 0;
  private isDashing: boolean = false;
  private stepDistance: number = 0;

  // Character Mesh Components (6 distinct parts)
  private bodyMesh: THREE.Mesh;
  private headMesh: THREE.Mesh;
  private visorMesh: THREE.Mesh;
  private backpackMesh: THREE.Mesh;
  private lanternMesh: THREE.Mesh;
  private scarfMesh: THREE.Mesh;
  private lanternLight: THREE.PointLight;
  private contactShadow: THREE.Mesh;

  // Camera settings
  public cameraDistance: number = 7.5;
  public cameraPitch: number = 0.35; // radians
  public cameraYaw: number = 0; // radians

  constructor(initialPosition: [number, number, number], isSoftwareGl = false) {
    this.stats = {
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      speed: 8.5,
      jumpForce: 9.2,
      level: 1,
      experience: 0,
      experienceToNext: 200,
    };

    this.group = new THREE.Group();
    this.group.name = 'player_explorer';
    this.group.position.set(initialPosition[0], initialPosition[1], initialPosition[2]);

    // 1. Primary Silhouette: Explorer Torso/Coat
    const bodyGeo = new THREE.CylinderGeometry(0.42, 0.52, 1.1, 8);
    bodyGeo.translate(0, 0.95, 0); // bottom-center pivot
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937, // Obsidian survival tunic
      roughness: 0.75,
      metalness: 0.1,
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.castShadow = !isSoftwareGl;
    this.group.add(this.bodyMesh);

    // 2. Secondary Read: Explorer Helm / Cowl
    const headGeo = new THREE.SphereGeometry(0.35, 12, 10);
    headGeo.translate(0, 1.72, 0);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x374151,
      roughness: 0.6,
      metalness: 0.25,
    });
    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.headMesh.castShadow = !isSoftwareGl;
    this.group.add(this.headMesh);

    // 3. Accent Detail: Golden Drift Visor (Reflective glass/metal)
    const visorGeo = new THREE.BoxGeometry(0.38, 0.14, 0.16);
    visorGeo.translate(0, 1.72, 0.26);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Amber visor
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
      roughness: 0.15,
      metalness: 0.9,
    });
    this.visorMesh = new THREE.Mesh(visorGeo, visorMat);
    this.group.add(this.visorMesh);

    // 4. Secondary Read: Survival Gear Backpack
    const packGeo = new THREE.BoxGeometry(0.5, 0.6, 0.32);
    packGeo.translate(0, 1.1, -0.38);
    const packMat = new THREE.MeshStandardMaterial({
      color: 0x78350f, // Weathered leather
      roughness: 0.85,
      metalness: 0.05,
    });
    this.backpackMesh = new THREE.Mesh(packGeo, packMat);
    this.backpackMesh.castShadow = !isSoftwareGl;
    this.group.add(this.backpackMesh);

    // 5. Accent Detail: Windblown Verdant Cloak Scarf
    const scarfGeo = new THREE.TorusGeometry(0.38, 0.1, 8, 16);
    scarfGeo.rotateX(Math.PI / 2);
    scarfGeo.translate(0, 1.48, 0);
    const scarfMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Emerald silk scarf
      roughness: 0.5,
      metalness: 0.1,
    });
    this.scarfMesh = new THREE.Mesh(scarfGeo, scarfMat);
    this.group.add(this.scarfMesh);

    // 6. Accent Detail: Aether Lantern hanging from pack
    const lanternGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.25, 6);
    lanternGeo.translate(0.32, 0.8, -0.35);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0x6ee7b7,
      emissive: 0x34d399,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.8,
    });
    this.lanternMesh = new THREE.Mesh(lanternGeo, lanternMat);
    this.group.add(this.lanternMesh);

    this.lanternLight = new THREE.PointLight(0x34d399, 0.9, 8);
    this.lanternLight.position.set(0.32, 0.8, -0.35);
    this.group.add(this.lanternLight);

    // 7. Grounding: Radial Contact Shadow beneath character
    const shadowGeo = new THREE.PlaneGeometry(1.4, 1.4);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 64, 64);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);

    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadow.position.y = 0.03; // offset slightly above ground to prevent z-fighting
    this.group.add(this.contactShadow);
  }

  /**
   * Update player physics, movement, and animation
   */
  update(
    delta: number,
    input: InputState,
    getTerrainHeight: (x: number, z: number) => number,
    camera: THREE.PerspectiveCamera
  ): void {
    const dt = Math.min(delta, 0.05); // clamped delta

    // 1. Handle Cooldowns & Timers
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;
    if (this.coyoteTimer > 0) this.coyoteTimer -= dt;

    if (input.jump) {
      this.jumpBufferTimer = 0.15; // 150ms buffer
    }

    // 2. Sprint & Dash Execution
    let isSprinting = false;
    const hasMoveInput = (Math.abs(input.joystickX) > 0.1 || Math.abs(input.joystickY) > 0.1 ||
      input.forward || input.backward || input.left || input.right);

    if (input.sprint && hasMoveInput && this.stats.stamina > 4) {
      isSprinting = true;
      this.stats.stamina = Math.max(0, this.stats.stamina - 18 * dt);
    }

    // Stamina regeneration when not sprinting or dashing
    if (!isSprinting && !this.isDashing && this.stats.stamina < this.stats.maxStamina) {
      this.stats.stamina = Math.min(this.stats.maxStamina, this.stats.stamina + 26 * this.staminaRegenModifier * dt);
    }

    if (input.dash && this.dashCooldown <= 0 && this.stats.stamina >= 25) {
      this.isDashing = true;
      this.dashDuration = 0.22;
      this.dashCooldown = 0.8;
      this.stats.stamina -= 25;
      AudioService.playDash();
    }

    if (this.isDashing) {
      this.dashDuration -= dt;
      if (this.dashDuration <= 0) {
        this.isDashing = false;
      }
    }

    // 3. Movement Direction from Inputs (Keyboard + Virtual Joystick)
    let moveX = 0;
    let moveZ = 0;

    if (input.forward) moveZ -= 1;
    if (input.backward) moveZ += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    // Add analog joystick input
    if (Math.abs(input.joystickX) > 0.1 || Math.abs(input.joystickY) > 0.1) {
      moveX += input.joystickX;
      moveZ += input.joystickY;
    }

    const inputLength = Math.sqrt(moveX * moveX + moveZ * moveZ);

    // Calculate movement relative to camera orientation
    if (hasMoveInput && inputLength > 0.05) {
      const normX = moveX / inputLength;
      const normZ = moveZ / inputLength;

      // Project onto horizontal plane based on camera yaw
      const sinYaw = Math.sin(this.cameraYaw);
      const cosYaw = Math.cos(this.cameraYaw);

      _moveDir.x = normX * cosYaw + normZ * sinYaw;
      _moveDir.z = -normX * sinYaw + normZ * cosYaw;
      _moveDir.y = 0;
      _moveDir.normalize();

      const speedMultiplier = this.isDashing ? 2.3 : isSprinting ? 1.6 : 1.0;
      const targetSpeed = this.stats.speed * speedMultiplier;

      // Check elevation gradient ahead (slope collision prevention)
      const testDist = 0.6;
      const nextX = this.group.position.x + _moveDir.x * testDist;
      const nextZ = this.group.position.z + _moveDir.z * testDist;
      const nextGroundY = getTerrainHeight(nextX, nextZ);
      const currentGroundY = getTerrainHeight(this.group.position.x, this.group.position.z);
      const slopeRise = nextGroundY - currentGroundY;

      // If slope rise is too steep (> 1.8m per 0.6m forward), deflect speed to prevent climbing vertical sheer cliffs
      const slopeFactor = slopeRise > 1.8 ? 0.2 : 1.0;

      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, _moveDir.x * targetSpeed * slopeFactor, 12, dt);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, _moveDir.z * targetSpeed * slopeFactor, 12, dt);

      // Rotate character towards move direction
      const targetFacing = Math.atan2(_moveDir.x, _moveDir.z);
      this.facingAngle = THREE.MathUtils.damp(this.facingAngle, targetFacing, 14, dt);
      this.group.rotation.y = this.facingAngle;

      // Footstep sound feedback
      this.stepDistance += targetSpeed * dt;
      const stepThreshold = isSprinting ? 1.9 : 2.7;
      if (this.isGrounded && this.stepDistance > stepThreshold) {
        this.stepDistance = 0;
        AudioService.playFootstep();
      }

      // Walking/running subtle tilt
      this.bodyMesh.rotation.z = Math.sin(Date.now() * (isSprinting ? 0.02 : 0.012)) * 0.06;
      this.scarfMesh.rotation.y = Math.PI / 2 + Math.sin(Date.now() * 0.01) * 0.18;
    } else {
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, 14, dt);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, 14, dt);
      this.bodyMesh.rotation.z = THREE.MathUtils.damp(this.bodyMesh.rotation.z, 0, 10, dt);
    }

    // 4. Gravity and Vertical Movement
    const currentGroundY = getTerrainHeight(this.group.position.x, this.group.position.z);
    const gravity = -24;

    this.velocity.y += gravity * dt;
    this.group.position.x += this.velocity.x * dt;
    this.group.position.z += this.velocity.z * dt;
    this.group.position.y += this.velocity.y * dt;

    // Ground collision test
    if (this.group.position.y <= currentGroundY) {
      this.group.position.y = currentGroundY;
      this.velocity.y = 0;
      this.isGrounded = true;
      this.coyoteTimer = 0.12; // 120ms coyote time
    } else {
      this.isGrounded = false;
    }

    // 5. Jump Execution (Buffered + Coyote time)
    if (this.jumpBufferTimer > 0 && (this.isGrounded || this.coyoteTimer > 0)) {
      this.velocity.y = this.stats.jumpForce;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      AudioService.playJump();
    }

    // Fall rescue safety: if player drops off floating archipelago into abyss, safely respawn at center
    if (this.group.position.y < -30) {
      this.group.position.set(0, getTerrainHeight(0, 0) + 2, 0);
      this.velocity.set(0, 0, 0);
    }

    // 6. Camera Orbit & Look Delta Updates
    if (input.lookDeltaX !== 0 || input.lookDeltaY !== 0) {
      const sensitivity = 0.003;
      this.cameraYaw -= input.lookDeltaX * sensitivity;
      this.cameraPitch = Math.max(0.05, Math.min(1.2, this.cameraPitch + input.lookDeltaY * sensitivity));
      // Reset deltas after consumption
      input.lookDeltaX = 0;
      input.lookDeltaY = 0;
    }

    // Calculate third-person target position
    const camDist = this.cameraDistance;
    _camOffset.x = Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * camDist;
    _camOffset.y = Math.sin(this.cameraPitch) * camDist + 1.6;
    _camOffset.z = Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * camDist;

    _desiredCamPos.copy(this.group.position).add(_camOffset);

    // Prevent camera clipping below ground level
    const camGround = getTerrainHeight(_desiredCamPos.x, _desiredCamPos.z) + 0.8;
    if (_desiredCamPos.y < camGround) {
      _desiredCamPos.y = camGround;
    }

    // Exponential camera damping
    camera.position.x = THREE.MathUtils.damp(camera.position.x, _desiredCamPos.x, 10, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, _desiredCamPos.y, 10, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, _desiredCamPos.z, 10, dt);

    // Look at player chest
    _lookTarget.copy(this.group.position);
    _lookTarget.y += 1.4;
    camera.lookAt(_lookTarget);
  }

  /**
   * Free resources
   */
  dispose(): void {
    this.bodyMesh.geometry.dispose();
    this.headMesh.geometry.dispose();
    this.visorMesh.geometry.dispose();
    this.backpackMesh.geometry.dispose();
    this.scarfMesh.geometry.dispose();
    this.lanternMesh.geometry.dispose();
  }
}
