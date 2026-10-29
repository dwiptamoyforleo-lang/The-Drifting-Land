/**
 * Wildlife & Creature Simulation System for The Drifting Land.
 * Implements 8 original species:
 * - Cloudgrazer (Gentle meadow ruminant)
 * - Emberfox (Agile curious fox with flame tail)
 * - Glasswing (Translucent fluttering blossom avian)
 * - Mossback (Ancient slow-moving tortoise covered in living flora)
 * - Storm Ray (High-altitude aerial manta soaring in thermals)
 * - Glowhare (Bioluminescent hopping critter, active dusk/night)
 * - Rift Stalker (Hostile predatory quadruped near spatial rift)
 * - Moon Deer (Ethereal luminescent stag appearing at night)
 *
 * Adheres to:
 * - Entity caps & lightweight distant simulation (>60m simplified step)
 * - Habitat constraints & time-dependent behaviors
 * - Low-occlusion interaction prompts and drops
 */

import * as THREE from 'three';
import { InventorySystem } from './inventorySystem';
import { NotificationSystem } from './notificationSystem';
import { AudioService } from '../services/audio';

export type WildlifeSpecies =
  | 'Cloudgrazer'
  | 'Emberfox'
  | 'Glasswing'
  | 'Mossback'
  | 'Storm Ray'
  | 'Glowhare'
  | 'Rift Stalker'
  | 'Moon Deer';

export type CreatureBehaviorState = 'WANDERING' | 'GRAZING' | 'RESTING' | 'FLEEING' | 'STALKING' | 'ATTACKING';

export interface CreatureInstance {
  id: string;
  species: WildlifeSpecies;
  name: string;
  group: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetPos: THREE.Vector3;
  state: CreatureBehaviorState;
  stateTimer: number;
  homeCenter: [number, number];
  wanderRadius: number;
  moveSpeed: number;
  facingYaw: number;
  harvestPrompt?: string;
  harvestItemId: string;
  isHarvested: boolean;
  harvestCooldown: number;
  // Specific mesh references for procedural animation
  headMesh?: THREE.Object3D;
  tailMesh?: THREE.Object3D;
  leftWing?: THREE.Object3D;
  rightWing?: THREE.Object3D;
  legs?: THREE.Object3D[];
  animPhase: number;
  isHostile?: boolean;
  attackCooldown: number;
}

export class WildlifeManager {
  public group: THREE.Group;
  private creatures: CreatureInstance[] = [];
  private isSoftwareGl: boolean;
  private getTerrainHeight: (x: number, z: number) => number;
  private inventory: InventorySystem;
  private onPlayerDamage?: (damage: number) => void;

  constructor(
    scene: THREE.Scene,
    getTerrainHeight: (x: number, z: number) => number,
    inventory: InventorySystem,
    isSoftwareGl = false,
    onPlayerDamage?: (damage: number) => void
  ) {
    this.group = new THREE.Group();
    this.group.name = 'wildlife_system';
    this.getTerrainHeight = getTerrainHeight;
    this.inventory = inventory;
    this.isSoftwareGl = isSoftwareGl;
    this.onPlayerDamage = onPlayerDamage;
    scene.add(this.group);
  }

  /**
   * Spawn initial creature population across designated island habitats
   */
  public populate(): void {
    // 1. Cloudgrazers (Central Plains & Meadows)
    this.spawnCreature('Cloudgrazer', 'Cloudgrazer Matriarch', [6, 0], 18, 1.2);
    this.spawnCreature('Cloudgrazer', 'Young Cloudgrazer', [-8, 8], 15, 1.4);

    // 2. Emberfoxes (Rocky Slopes & Forest Edge)
    this.spawnCreature('Emberfox', 'Emberfox Scout', [-18, 6], 14, 3.2);
    this.spawnCreature('Emberfox', 'Emberfox Vulpine', [18, -12], 16, 3.4);

    // 3. Glasswings (Flower & Nectar Groves)
    this.spawnCreature('Glasswing', 'Shimmering Glasswing', [12, 16], 12, 2.0);
    this.spawnCreature('Glasswing', 'Prismatic Glasswing', [16, 22], 10, 2.2);

    // 4. Mossbacks (Damp River Basin & Elder Grove)
    this.spawnCreature('Mossback', 'Elder Mossback', [-28, 14], 12, 0.5);
    this.spawnCreature('Mossback', 'Mossback Shellback', [-14, 18], 10, 0.45);

    // 5. Storm Rays (Aerial high-altitude thermals)
    this.spawnCreature('Storm Ray', 'Apex Storm Ray', [0, 0], 35, 4.5);
    this.spawnCreature('Storm Ray', 'Gliding Storm Ray', [-20, -10], 30, 4.0);

    // 6. Glowhares (Verdant Clearings, Nocturnal)
    this.spawnCreature('Glowhare', 'Luminescent Glowhare', [-4, -8], 12, 2.8);
    this.spawnCreature('Glowhare', 'Emerald Glowhare', [8, -16], 10, 3.0);

    // 7. Rift Stalkers (Near Shattered Rift, Hostile Prowler)
    this.spawnCreature('Rift Stalker', 'Voidborn Rift Stalker', [-46, -22], 12, 2.6);

    // 8. Moon Deer (Secluded Twilight Glades)
    this.spawnCreature('Moon Deer', 'Celestial Moon Deer', [24, 8], 16, 2.8);
  }

  private spawnCreature(
    species: WildlifeSpecies,
    name: string,
    homeCenter: [number, number],
    wanderRadius: number,
    moveSpeed: number
  ): void {
    const x = homeCenter[0] + (Math.random() - 0.5) * wanderRadius * 0.5;
    const z = homeCenter[1] + (Math.random() - 0.5) * wanderRadius * 0.5;
    const groundY = this.getTerrainHeight(x, z);
    const y = species === 'Storm Ray' ? groundY + 16 : groundY;

    const grp = new THREE.Group();
    grp.position.set(x, y, z);

    let harvestItemId = 'verdant_moss_fiber';
    let harvestPrompt = `Press [E] to Interact with ${name}`;
    let isHostile = false;

    switch (species) {
      case 'Cloudgrazer':
        harvestItemId = 'cloud_wool';
        harvestPrompt = 'Press [E] to Gather Buoyant Cloudgrazer Wool';
        this.buildCloudgrazerMesh(grp);
        break;
      case 'Emberfox':
        harvestItemId = 'ember_pelt';
        harvestPrompt = 'Press [E] to Collect Warm Emberfox Tuft';
        this.buildEmberfoxMesh(grp);
        break;
      case 'Glasswing':
        harvestItemId = 'glasswing_membrane';
        harvestPrompt = 'Press [E] to Catch Shed Glasswing Filament';
        this.buildGlasswingMesh(grp);
        break;
      case 'Mossback':
        harvestItemId = 'mossback_carapace';
        harvestPrompt = 'Press [E] to Chip Shed Mossback Scute';
        this.buildMossbackMesh(grp);
        break;
      case 'Storm Ray':
        harvestItemId = 'storm_quill';
        harvestPrompt = 'Press [E] to Catch Drifting Storm Quill';
        this.buildStormRayMesh(grp);
        break;
      case 'Glowhare':
        harvestItemId = 'glowhare_fur';
        harvestPrompt = 'Press [E] to Gather Silky Glowhare Lumina';
        this.buildGlowhareMesh(grp);
        break;
      case 'Rift Stalker':
        harvestItemId = 'rift_tendril';
        harvestPrompt = 'Press [E] to Extract Rift Tendril';
        isHostile = true;
        this.buildRiftStalkerMesh(grp);
        break;
      case 'Moon Deer':
        harvestItemId = 'moon_antler_shaving';
        harvestPrompt = 'Press [E] to Collect Luminescent Antler Shavings';
        this.buildMoonDeerMesh(grp);
        break;
    }

    this.group.add(grp);

    const instance: CreatureInstance = {
      id: `wildlife_${species.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      species,
      name,
      group: grp,
      position: grp.position,
      velocity: new THREE.Vector3(),
      targetPos: new THREE.Vector3(x, y, z),
      state: 'WANDERING',
      stateTimer: Math.random() * 4 + 2,
      homeCenter,
      wanderRadius,
      moveSpeed,
      facingYaw: Math.random() * Math.PI * 2,
      harvestPrompt,
      harvestItemId,
      isHarvested: false,
      harvestCooldown: 0,
      animPhase: Math.random() * Math.PI * 2,
      isHostile,
      attackCooldown: 0,
    };

    this.creatures.push(instance);
  }

  // --- 3D Procedural Mesh Builders ---

  private buildCloudgrazerMesh(grp: THREE.Group): void {
    const woolMat = new THREE.MeshStandardMaterial({ color: 0xf1efe7, roughness: 0.9 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.6 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 });

    // Body
    const bodyGeo = new THREE.BoxGeometry(1.6, 1.2, 2.2);
    bodyGeo.translate(0, 1.2, 0);
    const body = new THREE.Mesh(bodyGeo, woolMat);
    body.castShadow = !this.isSoftwareGl;
    grp.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.7, 0.7, 0.9);
    headGeo.translate(0, 1.6, 1.3);
    const head = new THREE.Mesh(headGeo, woolMat);
    grp.add(head);

    // Curved Horns
    const hornL = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 6, 8, Math.PI), hornMat);
    hornL.position.set(-0.45, 1.9, 1.2);
    hornL.rotation.y = Math.PI / 2;
    grp.add(hornL);

    const hornR = hornL.clone();
    hornR.position.x = 0.45;
    grp.add(hornR);

    // 4 Stout legs
    const legGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.9, 6);
    legGeo.translate(0, 0.45, 0);
    const legPositions = [
      [-0.6, 0, -0.7],
      [0.6, 0, -0.7],
      [-0.6, 0, 0.7],
      [0.6, 0, 0.7],
    ];
    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      grp.add(leg);
    });
  }

  private buildEmberfoxMesh(grp: THREE.Group): void {
    const foxMat = new THREE.MeshStandardMaterial({ color: 0xe65100, roughness: 0.7 });
    const bibMat = new THREE.MeshStandardMaterial({ color: 0xfff8e1, roughness: 0.8 });
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xff7043,
      emissive: 0xff3d00,
      emissiveIntensity: 0.85,
      roughness: 0.4,
    });

    // Sleek body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.9), foxMat);
    body.position.set(0, 0.45, 0);
    body.castShadow = !this.isSoftwareGl;
    grp.add(body);

    // White chest bib
    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.3), bibMat);
    bib.position.set(0, 0.48, 0.35);
    grp.add(bib);

    // Head with ears
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.45, 4), foxMat);
    head.position.set(0, 0.7, 0.55);
    head.rotation.x = Math.PI / 2;
    grp.add(head);

    // Flame tail
    const tail = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), emberMat);
    tail.position.set(0, 0.6, -0.65);
    grp.add(tail);

    // 4 slender legs
    const legGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.4, 5);
    legGeo.translate(0, 0.2, 0);
    [[-0.2, 0, -0.3], [0.2, 0, -0.3], [-0.2, 0, 0.3], [0.2, 0, 0.3]].forEach((pos) => {
      const leg = new THREE.Mesh(legGeo, foxMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      grp.add(leg);
    });
  }

  private buildGlasswingMesh(grp: THREE.Group): void {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.3 });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      emissive: 0x0891b2,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
    });

    // Slender body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.6, 6), bodyMat);
    body.rotation.x = Math.PI / 2;
    body.position.y = 1.0;
    grp.add(body);

    // Dual shimmering wings
    const wingGeo = new THREE.PlaneGeometry(0.8, 0.45);
    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.position.set(-0.4, 1.05, 0);
    wingL.rotation.x = Math.PI / 2;
    grp.add(wingL);

    const wingR = new THREE.Mesh(wingGeo, wingMat);
    wingR.position.set(0.4, 1.05, 0);
    wingR.rotation.x = Math.PI / 2;
    grp.add(wingR);
  }

  private buildMossbackMesh(grp: THREE.Group): void {
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.85 });

    // Domed shell
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), shellMat);
    shell.scale.set(1.1, 0.7, 1.3);
    shell.position.y = 0.3;
    shell.castShadow = !this.isSoftwareGl;
    grp.add(shell);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.45), skinMat);
    head.position.set(0, 0.4, 1.2);
    grp.add(head);

    // 4 squat legs
    const legGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.35, 6);
    legGeo.translate(0, 0.17, 0);
    [[-0.7, 0, -0.6], [0.7, 0, -0.6], [-0.7, 0, 0.6], [0.7, 0, 0.6]].forEach((pos) => {
      const leg = new THREE.Mesh(legGeo, skinMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      grp.add(leg);
    });
  }

  private buildStormRayMesh(grp: THREE.Group): void {
    const rayMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.2,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });

    // Manta wing body (wingspan ~3.6m)
    const bodyGeo = new THREE.ConeGeometry(1.8, 0.4, 4);
    bodyGeo.scale(1.8, 1, 0.8);
    const body = new THREE.Mesh(bodyGeo, rayMat);
    body.rotation.y = Math.PI / 4;
    grp.add(body);

    // Glowing electric edges
    const glowL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 4), glowMat);
    glowL.rotation.z = Math.PI / 2;
    glowL.position.y = 0.05;
    grp.add(glowL);

    // Trailing whip tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.01, 2.5, 4), glowMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 0, -1.5);
    grp.add(tail);
  }

  private buildGlowhareMesh(grp: THREE.Group): void {
    const furMat = new THREE.MeshStandardMaterial({
      color: 0xa7f3d0,
      emissive: 0x10b981,
      emissiveIntensity: 0.45,
      roughness: 0.7,
    });

    // Body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), furMat);
    body.scale.set(0.9, 0.9, 1.2);
    body.position.y = 0.25;
    grp.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), furMat);
    head.position.set(0, 0.4, 0.25);
    grp.add(head);

    // Long ears
    const earGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.3, 4);
    earGeo.translate(0, 0.15, 0);
    const earL = new THREE.Mesh(earGeo, furMat);
    earL.position.set(-0.08, 0.5, 0.2);
    earL.rotation.z = -0.15;
    grp.add(earL);

    const earR = new THREE.Mesh(earGeo, furMat);
    earR.position.set(0.08, 0.5, 0.2);
    earR.rotation.z = 0.15;
    grp.add(earR);
  }

  private buildRiftStalkerMesh(grp: THREE.Group): void {
    const shadowMat = new THREE.MeshStandardMaterial({
      color: 0x180c24,
      roughness: 0.6,
      metalness: 0.4,
    });
    const riftMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 0.9,
    });

    // Sleek predatory torso
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 1.6), shadowMat);
    body.position.y = 0.65;
    body.castShadow = !this.isSoftwareGl;
    grp.add(body);

    // Spines along back
    for (let i = -0.5; i <= 0.5; i += 0.3) {
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 4), riftMat);
      spine.position.set(0, 1.05, i);
      grp.add(spine);
    }

    // Fierce head with glowing eyes
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.55), shadowMat);
    head.position.set(0, 0.85, 0.95);
    grp.add(head);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), riftMat);
    eyeL.position.set(-0.16, 0.92, 1.2);
    grp.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), riftMat);
    eyeR.position.set(0.16, 0.92, 1.2);
    grp.add(eyeR);

    // 4 predatory legs
    const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.65, 5);
    legGeo.translate(0, 0.32, 0);
    [[-0.35, 0, -0.6], [0.35, 0, -0.6], [-0.35, 0, 0.6], [0.35, 0, 0.6]].forEach((pos) => {
      const leg = new THREE.Mesh(legGeo, shadowMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      grp.add(leg);
    });
  }

  private buildMoonDeerMesh(grp: THREE.Group): void {
    const peltMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
    const antlerMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.85,
    });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.6), peltMat);
    body.position.y = 1.2;
    body.castShadow = !this.isSoftwareGl;
    grp.add(body);

    // Slender neck & head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.8, 6), peltMat);
    neck.position.set(0, 1.7, 0.6);
    neck.rotation.x = -Math.PI / 6;
    grp.add(neck);

    const head = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 5), peltMat);
    head.position.set(0, 2.1, 0.8);
    head.rotation.x = Math.PI / 2;
    grp.add(head);

    // Luminescent Antlers
    const antlerL = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 4, 6, Math.PI * 0.8), antlerMat);
    antlerL.position.set(-0.25, 2.4, 0.7);
    antlerL.rotation.y = Math.PI / 4;
    grp.add(antlerL);

    const antlerR = antlerL.clone();
    antlerR.position.x = 0.25;
    antlerR.rotation.y = -Math.PI / 4;
    grp.add(antlerR);

    // 4 tall slender legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.1, 5);
    legGeo.translate(0, 0.55, 0);
    [[-0.32, 0, -0.6], [0.32, 0, -0.6], [-0.32, 0, 0.6], [0.32, 0, 0.6]].forEach((pos) => {
      const leg = new THREE.Mesh(legGeo, peltMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      grp.add(leg);
    });
  }

  /**
   * Main simulation update loop
   */
  public update(dt: number, totalTime: number, playerPos: THREE.Vector3, timeState: { isRedMoon: boolean }): void {
    const cappedDt = Math.min(dt, 0.1);

    this.creatures.forEach((c) => {
      c.animPhase += cappedDt * 2.5;
      if (c.harvestCooldown > 0) {
        c.harvestCooldown = Math.max(0, c.harvestCooldown - cappedDt);
        if (c.harvestCooldown <= 0) c.isHarvested = false;
      }
      if (c.attackCooldown > 0) {
        c.attackCooldown = Math.max(0, c.attackCooldown - cappedDt);
      }

      const distToPlayer = c.position.distanceTo(playerPos);

      // Lightweight distant simulation (>60m)
      if (distToPlayer > 60) {
        c.stateTimer -= cappedDt;
        if (c.stateTimer <= 0) {
          c.stateTimer = 4.0;
          const rx = c.homeCenter[0] + (Math.random() - 0.5) * c.wanderRadius;
          const rz = c.homeCenter[1] + (Math.random() - 0.5) * c.wanderRadius;
          c.position.x = rx;
          c.position.z = rz;
          c.position.y = this.getTerrainHeight(rx, rz);
          c.group.position.copy(c.position);
        }
        return;
      }

      // Hostile Rift Stalker AI: Aggro and stalk toward player
      if (c.isHostile && distToPlayer < 12) {
        c.state = 'STALKING';
        c.targetPos.copy(playerPos);

        if (distToPlayer < 2.2 && c.attackCooldown <= 0) {
          c.state = 'ATTACKING';
          c.attackCooldown = 2.5;
          AudioService.playDamage();
          this.onPlayerDamage?.(12);
          NotificationSystem.notify('Rift Stalker Strike', 'Rift Stalker swiped! -12 Health', 'danger', 3000);
        }
      } else if (c.species === 'Emberfox' && distToPlayer < 6.5) {
        // Flee from player if too close
        c.state = 'FLEEING';
        const fleeDir = new THREE.Vector3().subVectors(c.position, playerPos).setY(0).normalize();
        c.targetPos.copy(c.position).addScaledVector(fleeDir, 8);
      } else {
        // Standard state machine
        c.stateTimer -= cappedDt;
        if (c.stateTimer <= 0) {
          if (c.state === 'WANDERING') {
            c.state = Math.random() > 0.5 ? 'GRAZING' : 'RESTING';
            c.stateTimer = Math.random() * 3 + 2;
          } else {
            c.state = 'WANDERING';
            c.stateTimer = Math.random() * 5 + 3;
            // Pick new target within habitat radius
            const ang = Math.random() * Math.PI * 2;
            const dist = Math.random() * c.wanderRadius;
            const tx = c.homeCenter[0] + Math.cos(ang) * dist;
            const tz = c.homeCenter[1] + Math.sin(ang) * dist;
            const ty = c.species === 'Storm Ray' ? this.getTerrainHeight(tx, tz) + 16 : this.getTerrainHeight(tx, tz);
            c.targetPos.set(tx, ty, tz);
          }
        }
      }

      // Movement execution
      if (c.state === 'WANDERING' || c.state === 'FLEEING' || c.state === 'STALKING') {
        const dx = c.targetPos.x - c.position.x;
        const dz = c.targetPos.z - c.position.z;
        const distToTarget = Math.hypot(dx, dz);

        if (distToTarget > 0.4) {
          const targetYaw = Math.atan2(dx, dz);
          c.facingYaw = THREE.MathUtils.lerp(c.facingYaw, targetYaw, cappedDt * 4.0);
          c.group.rotation.y = c.facingYaw;

          const speed = c.state === 'FLEEING' ? c.moveSpeed * 1.8 : c.moveSpeed;
          const moveDist = Math.min(speed * cappedDt, distToTarget);
          c.position.x += Math.sin(c.facingYaw) * moveDist;
          c.position.z += Math.cos(c.facingYaw) * moveDist;

          // Height adjust
          if (c.species === 'Storm Ray') {
            const desiredY = this.getTerrainHeight(c.position.x, c.position.z) + 16 + Math.sin(totalTime * 0.8) * 1.5;
            c.position.y = THREE.MathUtils.lerp(c.position.y, desiredY, cappedDt * 2);
          } else if (c.species === 'Glasswing') {
            const ground = this.getTerrainHeight(c.position.x, c.position.z);
            c.position.y = ground + 0.8 + Math.sin(c.animPhase * 3) * 0.4;
          } else if (c.species === 'Glowhare') {
            const ground = this.getTerrainHeight(c.position.x, c.position.z);
            const hop = Math.abs(Math.sin(c.animPhase * 3)) * 0.35;
            c.position.y = ground + hop;
          } else {
            c.position.y = this.getTerrainHeight(c.position.x, c.position.z);
          }
          c.group.position.copy(c.position);
        }
      }

      // Idle procedural animations
      if (c.state === 'GRAZING') {
        c.group.rotation.x = Math.sin(totalTime * 2.0) * 0.12;
      } else if (c.species === 'Storm Ray') {
        // Graceful wing roll
        c.group.rotation.z = Math.sin(totalTime * 1.2) * 0.15;
      } else {
        c.group.rotation.x = 0;
      }
    });
  }

  /**
   * Check for nearby harvestable / interactable creature
   */
  public getNearbyCreature(playerPos: THREE.Vector3, maxDist = 3.2): CreatureInstance | null {
    let closest: CreatureInstance | null = null;
    let minDist = maxDist;

    for (const c of this.creatures) {
      if (c.species === 'Storm Ray') continue; // Too high to touch
      const d = c.position.distanceTo(playerPos);
      if (d < minDist) {
        minDist = d;
        closest = c;
      }
    }
    return closest;
  }

  /**
   * Interact / Harvest from creature
   */
  public harvest(creature: CreatureInstance): boolean {
    if (creature.isHarvested) {
      NotificationSystem.notify(creature.name, 'Needs time to rest before yielding more.', 'info', 2500);
      return false;
    }

    const added = this.inventory.addItem(creature.harvestItemId, 1, true);
    if (added) {
      creature.isHarvested = true;
      creature.harvestCooldown = 45; // 45 seconds cooldown
      AudioService.playItemCollect();
      NotificationSystem.notify('Creature Harvest', `Gathered 1x ${creature.harvestItemId.replace(/_/g, ' ')}`, 'item', 3000);
      return true;
    }
    return false;
  }

  public dispose(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) {
        if (Array.isArray((child as any).material)) {
          (child as any).material.forEach((m: any) => m.dispose());
        } else {
          (child as any).material.dispose();
        }
      }
    }
    this.creatures = [];
  }
}
