/**
 * Wildlife & Creature Simulation System for The Drifting Land.
 * Implements 8 original species with:
 * - Deterministic creature IDs + WorldStateStore cooldown/position persistence
 * - Shared geometries & materials via SharedAssets
 * - Chunk streaming culling & entity caps from PerformanceGovernor
 * - Zero per-frame Vector3 allocations
 */

import * as THREE from 'three';
import { InventorySystem } from './inventorySystem';
import { NotificationSystem } from './notificationSystem';
import { AudioService } from '../services/audio';
import { SharedAssets } from '../engine/sharedAssets';
import { WorldStateStore, createSeededRng, hashChunkSeed } from '../services/worldStateStore';

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
  cooldownUntilMs: number;
  animPhase: number;
  isHostile?: boolean;
  attackCooldown: number;
  streamVisible: boolean;
  streamActive: boolean;
  cappedEnabled: boolean;
}

const _tmpFleeDir = new THREE.Vector3();

const WILDLIFE_SPAWNS: {
  id: string;
  species: WildlifeSpecies;
  name: string;
  homeCenter: [number, number];
  wanderRadius: number;
  moveSpeed: number;
}[] = [
  { id: 'wildlife_cloudgrazer_0', species: 'Cloudgrazer', name: 'Cloudgrazer Matriarch', homeCenter: [6, 0], wanderRadius: 18, moveSpeed: 1.2 },
  { id: 'wildlife_cloudgrazer_1', species: 'Cloudgrazer', name: 'Young Cloudgrazer', homeCenter: [-8, 8], wanderRadius: 15, moveSpeed: 1.4 },
  { id: 'wildlife_emberfox_0', species: 'Emberfox', name: 'Emberfox Scout', homeCenter: [-18, 6], wanderRadius: 14, moveSpeed: 3.2 },
  { id: 'wildlife_emberfox_1', species: 'Emberfox', name: 'Emberfox Vulpine', homeCenter: [18, -12], wanderRadius: 16, moveSpeed: 3.4 },
  { id: 'wildlife_glasswing_0', species: 'Glasswing', name: 'Shimmering Glasswing', homeCenter: [12, 16], wanderRadius: 12, moveSpeed: 2.0 },
  { id: 'wildlife_glasswing_1', species: 'Glasswing', name: 'Prismatic Glasswing', homeCenter: [16, 22], wanderRadius: 10, moveSpeed: 2.2 },
  { id: 'wildlife_mossback_0', species: 'Mossback', name: 'Elder Mossback', homeCenter: [-28, 14], wanderRadius: 12, moveSpeed: 0.5 },
  { id: 'wildlife_mossback_1', species: 'Mossback', name: 'Mossback Shellback', homeCenter: [-14, 18], wanderRadius: 10, moveSpeed: 0.45 },
  { id: 'wildlife_stormray_0', species: 'Storm Ray', name: 'Apex Storm Ray', homeCenter: [0, 0], wanderRadius: 35, moveSpeed: 4.5 },
  { id: 'wildlife_stormray_1', species: 'Storm Ray', name: 'Gliding Storm Ray', homeCenter: [-20, -10], wanderRadius: 30, moveSpeed: 4.0 },
  { id: 'wildlife_glowhare_0', species: 'Glowhare', name: 'Luminescent Glowhare', homeCenter: [-4, -8], wanderRadius: 12, moveSpeed: 2.8 },
  { id: 'wildlife_glowhare_1', species: 'Glowhare', name: 'Emerald Glowhare', homeCenter: [8, -16], wanderRadius: 10, moveSpeed: 3.0 },
  { id: 'wildlife_riftstalker_0', species: 'Rift Stalker', name: 'Voidborn Rift Stalker', homeCenter: [-46, -22], wanderRadius: 12, moveSpeed: 2.6 },
  { id: 'wildlife_moondeer_0', species: 'Moon Deer', name: 'Celestial Moon Deer', homeCenter: [24, 8], wanderRadius: 16, moveSpeed: 2.8 },
];

export class WildlifeManager {
  public group: THREE.Group;
  private creatures: CreatureInstance[] = [];
  private isSoftwareGl: boolean;
  private getTerrainHeight: (x: number, z: number) => number;
  private inventory: InventorySystem;
  private onPlayerDamage?: (damage: number) => void;
  private regionId: string = 'verdant_reach';
  private worldStateStore?: WorldStateStore;
  private entityCap: number = 24;

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

  public populate(
    regionId = 'verdant_reach',
    worldStateStore?: WorldStateStore,
    entityCap = 24
  ): void {
    this.clear();
    this.regionId = regionId;
    this.worldStateStore = worldStateStore;
    this.entityCap = entityCap;

    if (regionId !== 'verdant_reach') {
      return;
    }

    WILDLIFE_SPAWNS.forEach((def, idx) => {
      this.spawnCreature(
        def.id,
        def.species,
        def.name,
        def.homeCenter,
        def.wanderRadius,
        def.moveSpeed,
        idx
      );
    });
    this.applyEntityCap();
  }

  public setEntityCap(cap: number): void {
    this.entityCap = cap;
    this.applyEntityCap();
  }

  private applyEntityCap(): void {
    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i];
      c.cappedEnabled = i < this.entityCap;
      c.group.visible = c.cappedEnabled && c.streamVisible;
    }
  }

  private spawnCreature(
    id: string,
    species: WildlifeSpecies,
    name: string,
    homeCenter: [number, number],
    wanderRadius: number,
    moveSpeed: number,
    spawnIdx: number
  ): void {
    const worldSeed = this.worldStateStore?.worldSeed || 133742;
    const rng = createSeededRng(hashChunkSeed(worldSeed, this.regionId, homeCenter[0], homeCenter[1] + spawnIdx));

    const savedState = this.worldStateStore?.getWildlifeState(
      this.regionId,
      homeCenter[0],
      homeCenter[1],
      id
    );

    const x = savedState?.pos ? savedState.pos[0] : homeCenter[0] + (rng() - 0.5) * wanderRadius * 0.5;
    const z = savedState?.pos ? savedState.pos[1] : homeCenter[1] + (rng() - 0.5) * wanderRadius * 0.5;
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

    const now = Date.now();
    const cooldownUntilMs = savedState?.cooldownUntilMs || 0;
    const remainingSec = cooldownUntilMs > now ? (cooldownUntilMs - now) / 1000 : 0;

    const instance: CreatureInstance = {
      id,
      species,
      name,
      group: grp,
      position: grp.position,
      velocity: new THREE.Vector3(),
      targetPos: new THREE.Vector3(x, y, z),
      state: 'WANDERING',
      stateTimer: rng() * 4 + 2,
      homeCenter,
      wanderRadius,
      moveSpeed,
      facingYaw: rng() * Math.PI * 2,
      harvestPrompt,
      harvestItemId,
      isHarvested: remainingSec > 0,
      harvestCooldown: remainingSec,
      cooldownUntilMs,
      animPhase: rng() * Math.PI * 2,
      isHostile,
      attackCooldown: 0,
      streamVisible: true,
      streamActive: true,
      cappedEnabled: spawnIdx < this.entityCap,
    };

    this.creatures.push(instance);
  }

  private mat(key: string, color: number, opts?: Partial<THREE.MeshStandardMaterialParameters>): THREE.MeshStandardMaterial {
    return SharedAssets.getMaterial(`wl_${key}`, () =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts })
    );
  }

  // --- Shared 3D Procedural Mesh Builders ---

  private buildCloudgrazerMesh(grp: THREE.Group): void {
    const woolMat = this.mat('cg_wool', 0xf1efe7, { roughness: 0.9 });
    const hornMat = this.mat('cg_horn', 0x5c4033, { roughness: 0.6 });
    const legMat = this.mat('cg_leg', 0x8d6e63, { roughness: 0.8 });

    const bodyGeo = SharedAssets.getGeometry('wl_cg_body', () => {
      const g = new THREE.BoxGeometry(1.6, 1.2, 2.2);
      g.translate(0, 1.2, 0);
      return g;
    });
    const body = new THREE.Mesh(bodyGeo, woolMat);
    body.castShadow = !this.isSoftwareGl;
    grp.add(body);

    const headGeo = SharedAssets.getGeometry('wl_cg_head', () => {
      const g = new THREE.BoxGeometry(0.7, 0.7, 0.9);
      g.translate(0, 1.6, 1.3);
      return g;
    });
    grp.add(new THREE.Mesh(headGeo, woolMat));

    const hornGeo = SharedAssets.getGeometry('wl_cg_horn', () => new THREE.TorusGeometry(0.3, 0.08, 6, 8, Math.PI));
    const hornL = new THREE.Mesh(hornGeo, hornMat);
    hornL.position.set(-0.45, 1.9, 1.2);
    hornL.rotation.y = Math.PI / 2;
    grp.add(hornL);

    const hornR = new THREE.Mesh(hornGeo, hornMat);
    hornR.position.set(0.45, 1.9, 1.2);
    hornR.rotation.y = Math.PI / 2;
    grp.add(hornR);

    const legGeo = SharedAssets.getGeometry('wl_cg_leg', () => {
      const g = new THREE.CylinderGeometry(0.18, 0.22, 0.9, 6);
      g.translate(0, 0.45, 0);
      return g;
    });
    const legPositions = [[-0.6, 0, -0.7], [0.6, 0, -0.7], [-0.6, 0, 0.7], [0.6, 0, 0.7]];
    for (const pos of legPositions) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      grp.add(leg);
    }
  }

  private buildEmberfoxMesh(grp: THREE.Group): void {
    const foxMat = this.mat('ef_fox', 0xe65100, { roughness: 0.7 });
    const bibMat = this.mat('ef_bib', 0xfff8e1, { roughness: 0.8 });
    const emberMat = this.mat('ef_ember', 0xff7043, { emissive: 0xff3d00, emissiveIntensity: 0.85, roughness: 0.4 });

    const body = new THREE.Mesh(
      SharedAssets.getGeometry('wl_ef_body', () => new THREE.BoxGeometry(0.5, 0.4, 0.9)),
      foxMat
    );
    body.position.set(0, 0.45, 0);
    body.castShadow = !this.isSoftwareGl;
    grp.add(body);

    const bib = new THREE.Mesh(
      SharedAssets.getGeometry('wl_ef_bib', () => new THREE.BoxGeometry(0.38, 0.28, 0.3)),
      bibMat
    );
    bib.position.set(0, 0.48, 0.35);
    grp.add(bib);

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('wl_ef_head', () => new THREE.ConeGeometry(0.25, 0.45, 4)),
      foxMat
    );
    head.position.set(0, 0.7, 0.55);
    head.rotation.x = Math.PI / 2;
    grp.add(head);

    const tail = new THREE.Mesh(
      SharedAssets.getGeometry('wl_ef_tail', () => new THREE.DodecahedronGeometry(0.24, 0)),
      emberMat
    );
    tail.position.set(0, 0.6, -0.65);
    grp.add(tail);

    const legGeo = SharedAssets.getGeometry('wl_ef_leg', () => {
      const g = new THREE.CylinderGeometry(0.06, 0.08, 0.4, 5);
      g.translate(0, 0.2, 0);
      return g;
    });
    for (const pos of [[-0.2, 0, -0.3], [0.2, 0, -0.3], [-0.2, 0, 0.3], [0.2, 0, 0.3]]) {
      const leg = new THREE.Mesh(legGeo, foxMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      grp.add(leg);
    }
  }

  private buildGlasswingMesh(grp: THREE.Group): void {
    const bodyMat = this.mat('gw_body', 0x06b6d4, { roughness: 0.3 });
    const wingMat = this.mat('gw_wing', 0xa5f3fc, {
      emissive: 0x0891b2,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
    });

    const body = new THREE.Mesh(
      SharedAssets.getGeometry('wl_gw_body', () => new THREE.CylinderGeometry(0.08, 0.04, 0.6, 6)),
      bodyMat
    );
    body.rotation.x = Math.PI / 2;
    body.position.y = 1.0;
    grp.add(body);

    const wingGeo = SharedAssets.getGeometry('wl_gw_wing', () => new THREE.PlaneGeometry(0.8, 0.45));
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
    const shellMat = this.mat('mb_shell', 0x2e7d32, { roughness: 0.9 });
    const skinMat = this.mat('mb_skin', 0x4e342e, { roughness: 0.85 });

    const shell = new THREE.Mesh(
      SharedAssets.getGeometry('wl_mb_shell', () => new THREE.SphereGeometry(1.0, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
      shellMat
    );
    shell.scale.set(1.1, 0.7, 1.3);
    shell.position.y = 0.3;
    shell.castShadow = !this.isSoftwareGl;
    grp.add(shell);

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('wl_mb_head', () => new THREE.BoxGeometry(0.35, 0.25, 0.45)),
      skinMat
    );
    head.position.set(0, 0.4, 1.2);
    grp.add(head);

    const legGeo = SharedAssets.getGeometry('wl_mb_leg', () => {
      const g = new THREE.CylinderGeometry(0.2, 0.25, 0.35, 6);
      g.translate(0, 0.17, 0);
      return g;
    });
    for (const pos of [[-0.7, 0, -0.6], [0.7, 0, -0.6], [-0.7, 0, 0.6], [0.7, 0, 0.6]]) {
      const leg = new THREE.Mesh(legGeo, skinMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      grp.add(leg);
    }
  }

  private buildStormRayMesh(grp: THREE.Group): void {
    const rayMat = this.mat('sr_body', 0x1e293b, { roughness: 0.5, metalness: 0.2 });
    const glowMat = this.mat('sr_glow', 0x38bdf8, { emissive: 0x0284c7, emissiveIntensity: 0.8, roughness: 0.2 });

    const bodyGeo = SharedAssets.getGeometry('wl_sr_body', () => {
      const g = new THREE.ConeGeometry(1.8, 0.4, 4);
      g.scale(1.8, 1, 0.8);
      return g;
    });
    const body = new THREE.Mesh(bodyGeo, rayMat);
    body.rotation.y = Math.PI / 4;
    grp.add(body);

    const glowL = new THREE.Mesh(
      SharedAssets.getGeometry('wl_sr_edge', () => new THREE.CylinderGeometry(0.04, 0.04, 2.8, 4)),
      glowMat
    );
    glowL.rotation.z = Math.PI / 2;
    glowL.position.y = 0.05;
    grp.add(glowL);

    const tail = new THREE.Mesh(
      SharedAssets.getGeometry('wl_sr_tail', () => new THREE.CylinderGeometry(0.04, 0.01, 2.5, 4)),
      glowMat
    );
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 0, -1.5);
    grp.add(tail);
  }

  private buildGlowhareMesh(grp: THREE.Group): void {
    const furMat = this.mat('gh_fur', 0xa7f3d0, { emissive: 0x10b981, emissiveIntensity: 0.45, roughness: 0.7 });

    const body = new THREE.Mesh(
      SharedAssets.getGeometry('wl_gh_body', () => new THREE.SphereGeometry(0.25, 6, 6)),
      furMat
    );
    body.scale.set(0.9, 0.9, 1.2);
    body.position.y = 0.25;
    grp.add(body);

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('wl_gh_head', () => new THREE.SphereGeometry(0.18, 6, 6)),
      furMat
    );
    head.position.set(0, 0.4, 0.25);
    grp.add(head);

    const earGeo = SharedAssets.getGeometry('wl_gh_ear', () => {
      const g = new THREE.CylinderGeometry(0.03, 0.05, 0.3, 4);
      g.translate(0, 0.15, 0);
      return g;
    });
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
    const shadowMat = this.mat('rs_shadow', 0x180c24, { roughness: 0.6, metalness: 0.4 });
    const riftMat = this.mat('rs_rift', 0xc084fc, { emissive: 0x9333ea, emissiveIntensity: 0.9 });

    const body = new THREE.Mesh(
      SharedAssets.getGeometry('wl_rs_body', () => new THREE.BoxGeometry(0.7, 0.55, 1.6)),
      shadowMat
    );
    body.position.y = 0.65;
    body.castShadow = !this.isSoftwareGl;
    grp.add(body);

    const spineGeo = SharedAssets.getGeometry('wl_rs_spine', () => new THREE.ConeGeometry(0.08, 0.35, 4));
    for (let i = -0.5; i <= 0.5; i += 0.3) {
      const spine = new THREE.Mesh(spineGeo, riftMat);
      spine.position.set(0, 1.05, i);
      grp.add(spine);
    }

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('wl_rs_head', () => new THREE.BoxGeometry(0.45, 0.35, 0.55)),
      shadowMat
    );
    head.position.set(0, 0.85, 0.95);
    grp.add(head);

    const eyeGeo = SharedAssets.getGeometry('wl_rs_eye', () => new THREE.SphereGeometry(0.05, 4, 4));
    const eyeL = new THREE.Mesh(eyeGeo, riftMat);
    eyeL.position.set(-0.16, 0.92, 1.2);
    grp.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, riftMat);
    eyeR.position.set(0.16, 0.92, 1.2);
    grp.add(eyeR);

    const legGeo = SharedAssets.getGeometry('wl_rs_leg', () => {
      const g = new THREE.CylinderGeometry(0.1, 0.08, 0.65, 5);
      g.translate(0, 0.32, 0);
      return g;
    });
    for (const pos of [[-0.35, 0, -0.6], [0.35, 0, -0.6], [-0.35, 0, 0.6], [0.35, 0, 0.6]]) {
      const leg = new THREE.Mesh(legGeo, shadowMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      grp.add(leg);
    }
  }

  private buildMoonDeerMesh(grp: THREE.Group): void {
    const peltMat = this.mat('md_pelt', 0x94a3b8, { roughness: 0.7 });
    const antlerMat = this.mat('md_antler', 0xbae6fd, { emissive: 0x38bdf8, emissiveIntensity: 0.85 });

    const body = new THREE.Mesh(
      SharedAssets.getGeometry('wl_md_body', () => new THREE.BoxGeometry(0.8, 0.8, 1.6)),
      peltMat
    );
    body.position.y = 1.2;
    body.castShadow = !this.isSoftwareGl;
    grp.add(body);

    const neck = new THREE.Mesh(
      SharedAssets.getGeometry('wl_md_neck', () => new THREE.CylinderGeometry(0.2, 0.28, 0.8, 6)),
      peltMat
    );
    neck.position.set(0, 1.7, 0.6);
    neck.rotation.x = -Math.PI / 6;
    grp.add(neck);

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('wl_md_head', () => new THREE.ConeGeometry(0.22, 0.5, 5)),
      peltMat
    );
    head.position.set(0, 2.1, 0.8);
    head.rotation.x = Math.PI / 2;
    grp.add(head);

    const antlerGeo = SharedAssets.getGeometry('wl_md_antler', () => new THREE.TorusGeometry(0.4, 0.05, 4, 6, Math.PI * 0.8));
    const antlerL = new THREE.Mesh(antlerGeo, antlerMat);
    antlerL.position.set(-0.25, 2.4, 0.7);
    antlerL.rotation.y = Math.PI / 4;
    grp.add(antlerL);

    const antlerR = new THREE.Mesh(antlerGeo, antlerMat);
    antlerR.position.set(0.25, 2.4, 0.7);
    antlerR.rotation.y = -Math.PI / 4;
    grp.add(antlerR);

    const legGeo = SharedAssets.getGeometry('wl_md_leg', () => {
      const g = new THREE.CylinderGeometry(0.08, 0.08, 1.1, 5);
      g.translate(0, 0.55, 0);
      return g;
    });
    for (const pos of [[-0.32, 0, -0.6], [0.32, 0, -0.6], [-0.32, 0, 0.6], [0.32, 0, 0.6]]) {
      const leg = new THREE.Mesh(legGeo, peltMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      grp.add(leg);
    }
  }

  /**
   * Sync visibility and active simulation state with chunk streaming
   */
  public syncStreaming(
    isVisible: (x: number, z: number) => boolean,
    isActive: (x: number, z: number) => boolean
  ): void {
    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i];
      const nextVis = isVisible(c.position.x, c.position.z);
      const nextAct = isActive(c.position.x, c.position.z);

      if (c.streamVisible && !nextVis && this.worldStateStore) {
        this.worldStateStore.setWildlifeState(
          this.regionId,
          c.homeCenter[0],
          c.homeCenter[1],
          c.id,
          c.cooldownUntilMs,
          [c.position.x, c.position.z]
        );
      }

      c.streamVisible = nextVis;
      c.streamActive = nextAct;
      c.group.visible = c.cappedEnabled && nextVis;
    }
  }

  public flushStateToStore(): void {
    if (!this.worldStateStore) return;
    for (const c of this.creatures) {
      this.worldStateStore.setWildlifeState(
        this.regionId,
        c.homeCenter[0],
        c.homeCenter[1],
        c.id,
        c.cooldownUntilMs,
        [c.position.x, c.position.z]
      );
    }
  }

  public update(dt: number, totalTime: number, playerPos: THREE.Vector3, _timeState: { isRedMoon: boolean }): void {
    const cappedDt = Math.min(dt, 0.12);

    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i];
      if (!c.cappedEnabled) continue;

      if (c.harvestCooldown > 0) {
        c.harvestCooldown = Math.max(0, c.harvestCooldown - cappedDt);
        if (c.harvestCooldown <= 0) {
          c.isHarvested = false;
          c.cooldownUntilMs = 0;
        }
      }
      if (c.attackCooldown > 0) {
        c.attackCooldown = Math.max(0, c.attackCooldown - cappedDt);
      }

      // Skip unloaded or far chunks completely
      if (!c.streamVisible) continue;

      const distSqToPlayer = c.position.distanceToSquared(playerPos);

      // Simplified distant simulation (> 55m or not in ACTIVE chunk)
      if (!c.streamActive || distSqToPlayer > 55 * 55) {
        c.stateTimer -= cappedDt;
        if (c.stateTimer <= 0) {
          c.stateTimer = 4.5;
          const rx = c.homeCenter[0] + (Math.random() - 0.5) * c.wanderRadius;
          const rz = c.homeCenter[1] + (Math.random() - 0.5) * c.wanderRadius;
          c.position.x = rx;
          c.position.z = rz;
          c.position.y = c.species === 'Storm Ray' ? this.getTerrainHeight(rx, rz) + 16 : this.getTerrainHeight(rx, rz);
        }
        continue;
      }

      c.animPhase += cappedDt * 2.5;
      const distToPlayer = Math.sqrt(distSqToPlayer);

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
        c.state = 'FLEEING';
        _tmpFleeDir.subVectors(c.position, playerPos).setY(0).normalize();
        c.targetPos.copy(c.position).addScaledVector(_tmpFleeDir, 8);
      } else {
        c.stateTimer -= cappedDt;
        if (c.stateTimer <= 0) {
          if (c.state === 'WANDERING') {
            c.state = Math.random() > 0.5 ? 'GRAZING' : 'RESTING';
            c.stateTimer = Math.random() * 3 + 2;
          } else {
            c.state = 'WANDERING';
            c.stateTimer = Math.random() * 5 + 3;
            const ang = Math.random() * Math.PI * 2;
            const dist = Math.random() * c.wanderRadius;
            const tx = c.homeCenter[0] + Math.cos(ang) * dist;
            const tz = c.homeCenter[1] + Math.sin(ang) * dist;
            const ty = c.species === 'Storm Ray' ? this.getTerrainHeight(tx, tz) + 16 : this.getTerrainHeight(tx, tz);
            c.targetPos.set(tx, ty, tz);
          }
        }
      }

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
        }
      }

      if (c.state === 'GRAZING') {
        c.group.rotation.x = Math.sin(totalTime * 2.0) * 0.12;
      } else if (c.species === 'Storm Ray') {
        c.group.rotation.z = Math.sin(totalTime * 1.2) * 0.15;
      } else {
        c.group.rotation.x = 0;
      }
    }
  }

  public getVisibleCount(): number {
    let count = 0;
    for (const c of this.creatures) {
      if (c.group.visible) count++;
    }
    return count;
  }

  public getNearbyCreature(playerPos: THREE.Vector3, maxDist = 3.2): CreatureInstance | null {
    let closest: CreatureInstance | null = null;
    let minDistSq = maxDist * maxDist;

    for (const c of this.creatures) {
      if (!c.group.visible || c.species === 'Storm Ray') continue;
      const dSq = c.position.distanceToSquared(playerPos);
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closest = c;
      }
    }
    return closest;
  }

  public harvest(creature: CreatureInstance): boolean {
    if (creature.isHarvested) {
      NotificationSystem.notify(creature.name, 'Needs time to rest before yielding more.', 'info', 2500);
      return false;
    }

    const added = this.inventory.addItem(creature.harvestItemId, 1, true);
    if (added) {
      creature.isHarvested = true;
      creature.harvestCooldown = 45;
      creature.cooldownUntilMs = Date.now() + 45000;
      this.worldStateStore?.setWildlifeState(
        this.regionId,
        creature.homeCenter[0],
        creature.homeCenter[1],
        creature.id,
        creature.cooldownUntilMs,
        [creature.position.x, creature.position.z]
      );
      AudioService.playItemCollect();
      NotificationSystem.notify('Creature Harvest', `Gathered 1x ${creature.harvestItemId.replace(/_/g, ' ')}`, 'item', 3000);
      return true;
    }
    return false;
  }

  public clear(): void {
    this.flushStateToStore();
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      SharedAssets.disposeObject3DSafe(child);
    }
    this.creatures = [];
  }

  public dispose(): void {
    this.clear();
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
