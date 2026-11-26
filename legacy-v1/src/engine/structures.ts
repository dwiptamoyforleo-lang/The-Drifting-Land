/**
 * World Structures & Interactive Architecture for The Drifting Land.
 * - InstancedMesh for repeated bridge planks, tower steps, and merlons
 * - Shared geometries, materials, and glow sprites via SharedAssets (only 1 hearth PointLight)
 * - Chunk streaming mount/unmount while keeping colliders & structure interaction metadata registered
 * - Syncs unlocked doors, discovered chambers, and deposits with WorldStateStore
 */

import * as THREE from 'three';
import { ObstacleCollider, SaveData } from '../types/game';
import { TextureGenerator } from './textures';
import { SharedAssets } from './sharedAssets';
import { QualityTier } from './performanceGovernor';
import { WorldStateStore } from '../services/worldStateStore';

export interface RuntimeStructure {
  id: string;
  name: string;
  type: string;
  position: [number, number, number];
  interactionRadius: number;
  promptText: string;
  group: THREE.Group;
  colliders: ObstacleCollider[];
  isMounted?: boolean;
  update?: (delta: number, totalTime: number) => void;
  dispose: () => void;
}

const _dummy = new THREE.Object3D();

export class StructuresManager {
  public group: THREE.Group;
  public colliders: ObstacleCollider[] = [];
  public structures: Map<string, RuntimeStructure> = new Map();
  private isSoftwareGl: boolean;
  private worldStateStore: WorldStateStore | null = null;
  private regionId = 'verdant_reach';

  private gateDoorMesh: THREE.Mesh | null = null;
  private gateDoorOriginalY = 0;
  private isGateOpening = false;
  private gateOpenProgress = 0;

  private hiddenWallMesh: THREE.Mesh | null = null;
  private isHiddenWallDissolving = false;
  private hiddenWallProgress = 0;

  private gatewayVortexMesh: THREE.Mesh | null = null;
  private beaconRings: THREE.Group[] = [];
  private crystalNodes: THREE.Mesh[] = [];
  private hearthLight: THREE.PointLight | null = null;

  constructor(scene: THREE.Scene, isSoftwareGl = false) {
    this.group = new THREE.Group();
    this.group.name = 'world_structures';
    this.isSoftwareGl = isSoftwareGl;
    scene.add(this.group);
  }

  public buildAll(
    getTerrainHeight: (x: number, z: number) => number,
    save: SaveData,
    regionId = 'verdant_reach',
    worldStateStore?: WorldStateStore
  ): void {
    this.clear();
    this.regionId = regionId;
    this.worldStateStore = worldStateStore || null;

    if (regionId !== 'verdant_reach') {
      return;
    }

    const stoneTex = TextureGenerator.createStoneTexture(this.isSoftwareGl ? 1 : 4);
    const barkTex = TextureGenerator.createBarkTexture(this.isSoftwareGl ? 1 : 4);
    const pathTex = TextureGenerator.createPathTexture(this.isSoftwareGl ? 1 : 4);

    const stoneMat = SharedAssets.getMaterial('struct_stone_mat', () =>
      new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.85, metalness: 0.15 })
    );
    const woodMat = SharedAssets.getMaterial('struct_wood_mat', () =>
      new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.8, metalness: 0.1 })
    );
    const bronzeMat = SharedAssets.getMaterial('struct_bronze_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.85,
        roughness: 0.25,
        emissive: 0x78350f,
        emissiveIntensity: 0.3,
      })
    );
    const crystalMat = SharedAssets.getMaterial('struct_crystal_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.8,
        roughness: 0.15,
        metalness: 0.85,
      })
    );
    const aetheriumMat = SharedAssets.getMaterial('struct_aetherium_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.85,
        roughness: 0.2,
        metalness: 0.9,
      })
    );

    this.buildPromontoryBeacon(stoneMat, crystalMat, getTerrainHeight, save);
    this.buildSanctumBeacon(stoneMat, crystalMat, getTerrainHeight, save);
    this.buildRuinedTower(stoneMat, woodMat, bronzeMat, getTerrainHeight);
    this.buildHiddenChamber(stoneMat, getTerrainHeight, save);
    this.buildAbandonedSettlement(stoneMat, woodMat, pathTex, getTerrainHeight);
    this.buildResearchCamp(woodMat, getTerrainHeight);
    this.buildSuspendedBridge(woodMat, getTerrainHeight);
    this.buildLockedDoor(stoneMat, bronzeMat, getTerrainHeight, save);
    this.buildResourceDeposits(stoneMat, crystalMat, aetheriumMat, getTerrainHeight);
    this.buildDimensionalGateway(stoneMat, bronzeMat, getTerrainHeight);
  }

  public setQualityTier(tier: QualityTier): void {
    if (this.hearthLight) {
      this.hearthLight.visible = !this.isSoftwareGl && tier !== 'low';
    }
  }

  public syncStreaming(isPositionVisible: (x: number, z: number) => boolean): void {
    this.structures.forEach((struct) => {
      const visible = isPositionVisible(struct.position[0], struct.position[2]);
      if (visible && !struct.isMounted) {
        this.group.add(struct.group);
        struct.isMounted = true;
      } else if (!visible && struct.isMounted) {
        this.group.remove(struct.group);
        struct.isMounted = false;
      }
    });
  }

  private buildPromontoryBeacon(
    stoneMat: THREE.Material,
    crystalMat: THREE.Material,
    getTerrainHeight: (x: number, z: number) => number,
    save: SaveData
  ): void {
    const x = 38;
    const z = 25;
    const y = getTerrainHeight(x, z);
    const grp = new THREE.Group();
    grp.position.set(x, y, z);

    const base = new THREE.Mesh(
      SharedAssets.getGeometry('beacon_p_base', () => new THREE.CylinderGeometry(2.2, 2.6, 0.8, 8)),
      stoneMat
    );
    base.position.y = 0.4;
    grp.add(base);

    const pillar = new THREE.Mesh(
      SharedAssets.getGeometry('beacon_p_pillar', () => new THREE.BoxGeometry(1.1, 4.5, 1.1)),
      stoneMat
    );
    pillar.position.y = 2.6;
    grp.add(pillar);

    const cry = new THREE.Mesh(
      SharedAssets.getGeometry('beacon_p_cry', () => new THREE.OctahedronGeometry(0.7, 0)),
      crystalMat
    );
    cry.position.y = 5.2;
    grp.add(cry);

    const isAct = save.activatedCheckpoints.includes('cp_eastern_ridge');
    const glow = SharedAssets.createGlowSprite(0x38bdf8, isAct ? 3.2 : 2.0, isAct ? 0.85 : 0.45);
    glow.position.y = 5.2;
    grp.add(glow);

    this.group.add(grp);

    const collider: ObstacleCollider = { type: 'cylinder', x, y, z, radius: 1.8, height: 4.5 };
    this.colliders.push(collider);

    this.structures.set('cp_eastern_ridge', {
      id: 'cp_eastern_ridge',
      name: 'Sunward Promontory Beacon',
      type: 'CHECKPOINT_BEACON',
      position: [x, y, z],
      interactionRadius: 4.2,
      promptText: isAct ? 'Sunward Beacon Attuned' : 'Press [E] or Action to Attune Sunward Beacon',
      group: grp,
      colliders: [collider],
      isMounted: true,
      update: (_dt, totalTime) => {
        if (!grp.parent) return;
        cry.rotation.y = totalTime * 1.2;
        cry.position.y = 5.2 + Math.sin(totalTime * 2.0) * 0.15;
      },
      dispose: () => {},
    });
  }

  private buildSanctumBeacon(
    stoneMat: THREE.Material,
    crystalMat: THREE.Material,
    getTerrainHeight: (x: number, z: number) => number,
    save: SaveData
  ): void {
    const x = -34;
    const z = 18;
    const y = getTerrainHeight(x, z);
    const grp = new THREE.Group();
    grp.position.set(x, y, z);

    const base = new THREE.Mesh(
      SharedAssets.getGeometry('beacon_s_base', () => new THREE.CylinderGeometry(2.0, 2.4, 0.7, 8)),
      stoneMat
    );
    base.position.y = 0.35;
    grp.add(base);

    const pillar = new THREE.Mesh(
      SharedAssets.getGeometry('beacon_s_pillar', () => new THREE.CylinderGeometry(0.7, 0.9, 3.8, 8)),
      stoneMat
    );
    pillar.position.y = 2.2;
    grp.add(pillar);

    const cry = new THREE.Mesh(
      SharedAssets.getGeometry('beacon_s_cry', () => new THREE.DodecahedronGeometry(0.65, 0)),
      crystalMat
    );
    cry.position.y = 4.4;
    grp.add(cry);

    const isAct = save.activatedCheckpoints.includes('cp_elder_groove');
    const glow = SharedAssets.createGlowSprite(0x34d399, isAct ? 3.2 : 2.0, isAct ? 0.85 : 0.45);
    glow.position.y = 4.4;
    grp.add(glow);

    this.group.add(grp);

    const collider: ObstacleCollider = { type: 'cylinder', x, y, z, radius: 1.6, height: 4.0 };
    this.colliders.push(collider);

    this.structures.set('cp_elder_groove', {
      id: 'cp_elder_groove',
      name: 'Sunken Sanctum Beacon',
      type: 'CHECKPOINT_BEACON',
      position: [x, y, z],
      interactionRadius: 4.2,
      promptText: isAct ? 'Sanctum Beacon Attuned' : 'Press [E] or Action to Attune Sanctum Beacon',
      group: grp,
      colliders: [collider],
      isMounted: true,
      update: (_dt, totalTime) => {
        if (!grp.parent) return;
        cry.rotation.y = -totalTime * 1.5;
        cry.position.y = 4.4 + Math.sin(totalTime * 2.2) * 0.12;
      },
      dispose: () => {},
    });
  }

  private buildRuinedTower(
    stoneMat: THREE.Material,
    woodMat: THREE.Material,
    bronzeMat: THREE.Material,
    getTerrainHeight: (x: number, z: number) => number
  ): void {
    const x = 38;
    const z = 25;
    const y = getTerrainHeight(x, z);
    const grp = new THREE.Group();
    grp.position.set(x, y, z);

    const towerMesh = new THREE.Mesh(
      SharedAssets.getGeometry('tower_body', () => new THREE.CylinderGeometry(4.2, 4.8, 8.5, 8, 1, true)),
      stoneMat
    );
    towerMesh.position.y = 4.25;
    towerMesh.castShadow = !this.isSoftwareGl;
    grp.add(towerMesh);

    const floorMesh = new THREE.Mesh(
      SharedAssets.getGeometry('tower_floor', () => new THREE.CylinderGeometry(4.3, 4.3, 0.4, 8)),
      stoneMat
    );
    floorMesh.position.y = 8.5;
    grp.add(floorMesh);

    // Instanced Merlons (4 instances -> 1 draw call)
    const merlonGeo = SharedAssets.getGeometry('tower_merlon', () => new THREE.BoxGeometry(1.6, 1.2, 0.6));
    const merlonInst = new THREE.InstancedMesh(merlonGeo, stoneMat, 4);
    for (let m = 0; m < 4; m++) {
      const angle = (m * 2 * Math.PI) / 4;
      _dummy.position.set(Math.cos(angle) * 4.1, 9.3, Math.sin(angle) * 4.1);
      _dummy.rotation.set(0, -angle, 0);
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      merlonInst.setMatrixAt(m, _dummy.matrix);
    }
    merlonInst.instanceMatrix.needsUpdate = true;
    grp.add(merlonInst);

    // Instanced Spiral Steps (9 instances -> 1 draw call)
    const stepCount = 9;
    const stepGeo = SharedAssets.getGeometry('tower_step', () => new THREE.BoxGeometry(2.2, 0.35, 1.4));
    const stepInst = new THREE.InstancedMesh(stepGeo, woodMat, stepCount);
    stepInst.castShadow = !this.isSoftwareGl;

    const towerColliders: ObstacleCollider[] = [];

    for (let s = 0; s < stepCount; s++) {
      const stepAngle = s * Math.PI * 0.22 - Math.PI * 0.5;
      const stepRadius = 4.8;
      const sx = Math.cos(stepAngle) * stepRadius;
      const sz = Math.sin(stepAngle) * stepRadius;
      const sy = 0.8 + s * 0.85;

      _dummy.position.set(sx, sy, sz);
      _dummy.rotation.set(0, -stepAngle + Math.PI / 2, 0);
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      stepInst.setMatrixAt(s, _dummy.matrix);

      towerColliders.push({
        type: 'box',
        x: x + sx,
        y: y + sy,
        z: z + sz,
        width: 2.2,
        depth: 1.4,
        height: 0.4,
        walkableTop: true,
        topY: y + sy + 0.2,
      });
    }
    stepInst.instanceMatrix.needsUpdate = true;
    grp.add(stepInst);

    towerColliders.push(
      { type: 'cylinder', x, y: y + 8.5, z, radius: 4.2, height: 0.5, walkableTop: true, topY: y + 8.7 },
      { type: 'cylinder', x, y, z, radius: 3.8, height: 8.5 }
    );

    const astrolabeGrp = new THREE.Group();
    astrolabeGrp.position.set(0, 9.2, 0);
    astrolabeGrp.add(
      new THREE.Mesh(SharedAssets.getGeometry('astro_stand', () => new THREE.CylinderGeometry(0.3, 0.5, 1.2, 8)), bronzeMat)
    );
    const sphereMesh = new THREE.Mesh(
      SharedAssets.getGeometry('astro_sphere', () => new THREE.SphereGeometry(0.55, 10, 8)),
      bronzeMat
    );
    sphereMesh.position.y = 1.0;
    astrolabeGrp.add(sphereMesh);

    const ringMesh = new THREE.Mesh(
      SharedAssets.getGeometry('astro_ring', () => new THREE.TorusGeometry(0.85, 0.05, 8, 22)),
      bronzeMat
    );
    ringMesh.position.y = 1.0;
    ringMesh.rotation.x = Math.PI / 3;
    astrolabeGrp.add(ringMesh);

    grp.add(astrolabeGrp);
    this.group.add(grp);
    this.colliders.push(...towerColliders);

    this.structures.set('ruined_watchtower', {
      id: 'ruined_watchtower',
      name: 'Sunward Watchtower Overlook',
      type: 'RUINED_TOWER',
      position: [x, y + 8.7, z],
      interactionRadius: 3.5,
      promptText: 'Press [E] or Action to Examine Celestial Astrolabe',
      group: grp,
      colliders: towerColliders,
      isMounted: true,
      update: (_dt, totalTime) => {
        if (!grp.parent) return;
        ringMesh.rotation.z = totalTime * 0.8;
      },
      dispose: () => {},
    });
  }

  private buildHiddenChamber(
    stoneMat: THREE.Material,
    getTerrainHeight: (x: number, z: number) => number,
    save: SaveData
  ): void {
    const x = -48;
    const z = -8;
    const y = getTerrainHeight(x, z);
    const grp = new THREE.Group();
    grp.position.set(x, y, z);

    const chamberFloor = new THREE.Mesh(
      SharedAssets.getGeometry('chamber_floor', () => new THREE.BoxGeometry(10, 0.6, 9)),
      stoneMat
    );
    chamberFloor.position.set(0, 0.3, 0);
    grp.add(chamberFloor);

    const wallNSGeo = SharedAssets.getGeometry('chamber_wall_ns', () => new THREE.BoxGeometry(10, 5, 0.8));
    const wallNorth = new THREE.Mesh(wallNSGeo, stoneMat);
    wallNorth.position.set(0, 2.5, -4.5);
    const wallSouth = new THREE.Mesh(wallNSGeo, stoneMat);
    wallSouth.position.set(0, 2.5, 4.5);
    const wallWest = new THREE.Mesh(
      SharedAssets.getGeometry('chamber_wall_w', () => new THREE.BoxGeometry(0.8, 5, 9)),
      stoneMat
    );
    wallWest.position.set(-4.5, 2.5, 0);
    const roof = new THREE.Mesh(
      SharedAssets.getGeometry('chamber_roof', () => new THREE.BoxGeometry(10.5, 0.6, 9.5)),
      stoneMat
    );
    roof.position.set(0, 5.2, 0);
    const altar = new THREE.Mesh(
      SharedAssets.getGeometry('chamber_altar', () => new THREE.CylinderGeometry(1.2, 1.5, 1.2, 8)),
      stoneMat
    );
    altar.position.set(0, 0.9, 0);
    grp.add(wallNorth, wallSouth, wallWest, roof, altar);

    const codexMat = SharedAssets.getMaterial('chamber_codex_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0x6ee7b7, emissive: 0x10b981, emissiveIntensity: 0.9 })
    );
    const codexMesh = new THREE.Mesh(
      SharedAssets.getGeometry('chamber_codex', () => new THREE.BoxGeometry(0.6, 0.18, 0.8)),
      codexMat
    );
    codexMesh.position.set(0, 1.6, 0);
    grp.add(codexMesh);

    const glow = SharedAssets.createGlowSprite(0x34d399, 3.2, 0.65);
    glow.position.set(0, 2.2, 0);
    grp.add(glow);

    const storeDiscovered = Boolean(
      this.worldStateStore?.getChunkDelta(this.regionId, `${Math.floor(x / 32)},${Math.floor(z / 32)}`)?.discoveredChambers?.includes('hidden_chamber')
    );
    const isDiscovered = storeDiscovered || save.discoveredChambers.includes('hidden_chamber');
    if (isDiscovered && !save.discoveredChambers.includes('hidden_chamber')) {
      save.discoveredChambers.push('hidden_chamber');
    }

    const wallGeo = SharedAssets.getGeometry('chamber_front_wall', () => new THREE.BoxGeometry(0.8, 5, 6));
    const crackedMat = new THREE.MeshStandardMaterial({
      color: isDiscovered ? 0x22c55e : 0x475569,
      roughness: 0.9,
      transparent: true,
      opacity: isDiscovered ? 0.15 : 1.0,
    });
    this.hiddenWallMesh = new THREE.Mesh(wallGeo, crackedMat);
    this.hiddenWallMesh.position.set(4.5, 2.5, 0);
    grp.add(this.hiddenWallMesh);

    const colliders: ObstacleCollider[] = [
      { type: 'box', x, y: y + 0.3, z, width: 10, depth: 9, height: 0.6, walkableTop: true, topY: y + 0.6 },
      { type: 'box', x, y: y + 2.5, z: z - 4.5, width: 10, depth: 0.8, height: 5 },
      { type: 'box', x, y: y + 2.5, z: z + 4.5, width: 10, depth: 0.8, height: 5 },
      { type: 'box', x: x - 4.5, y: y + 2.5, z, width: 0.8, depth: 9, height: 5 },
    ];
    if (!isDiscovered) {
      colliders.push({ type: 'box', x: x + 4.5, y: y + 2.5, z, width: 0.8, depth: 6, height: 5 });
    }

    this.colliders.push(...colliders);
    this.group.add(grp);

    this.structures.set('hidden_chamber', {
      id: 'hidden_chamber',
      name: 'Echoes of the First Drift (Hidden Chamber)',
      type: 'HIDDEN_CHAMBER',
      position: [x + 4.5, y + 1.5, z],
      interactionRadius: 3.8,
      promptText: isDiscovered
        ? 'Press [E] to Inspect Codex of the First Drift'
        : 'Press [E] to Examine Cracked Runic Wall',
      group: grp,
      colliders,
      isMounted: true,
      update: (dt, totalTime) => {
        if (!grp.parent) return;
        codexMesh.rotation.y = totalTime * 0.5;
        if (this.isHiddenWallDissolving && this.hiddenWallMesh) {
          this.hiddenWallProgress = Math.min(1.0, this.hiddenWallProgress + dt * 1.5);
          (this.hiddenWallMesh.material as THREE.MeshStandardMaterial).opacity = 1.0 - this.hiddenWallProgress * 0.85;
          if (this.hiddenWallProgress >= 1.0) {
            this.isHiddenWallDissolving = false;
          }
        }
      },
      dispose: () => {},
    });
  }

  private buildAbandonedSettlement(
    stoneMat: THREE.Material,
    woodMat: THREE.Material,
    pathTex: THREE.Texture,
    getTerrainHeight: (x: number, z: number) => number
  ): void {
    const x = -22;
    const z = -35;
    const y = getTerrainHeight(x, z);
    const grp = new THREE.Group();
    grp.position.set(x, y, z);

    const courtMat = SharedAssets.getMaterial('settlement_court_mat', () =>
      new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.9 })
    );
    const court = new THREE.Mesh(
      SharedAssets.getGeometry('settlement_court', () => new THREE.CylinderGeometry(8.5, 9.0, 0.25, 8)),
      courtMat
    );
    court.position.y = 0.12;
    grp.add(court);

    const hut1 = new THREE.Group();
    hut1.position.set(-3.5, 0, -2);
    const wall1 = new THREE.Mesh(
      SharedAssets.getGeometry('settlement_wall1', () => new THREE.BoxGeometry(4.6, 3.0, 4.0)),
      woodMat
    );
    wall1.position.y = 1.5;
    wall1.castShadow = !this.isSoftwareGl;
    const roof1 = new THREE.Mesh(
      SharedAssets.getGeometry('settlement_roof1', () => new THREE.ConeGeometry(4.0, 2.0, 4)),
      woodMat
    );
    roof1.position.y = 4.0;
    roof1.rotation.y = Math.PI / 4;
    roof1.castShadow = !this.isSoftwareGl;
    hut1.add(wall1, roof1);
    grp.add(hut1);

    const stall = new THREE.Group();
    stall.position.set(3.8, 0, 2.5);
    const stallWall = new THREE.Mesh(
      SharedAssets.getGeometry('settlement_stall_wall', () => new THREE.BoxGeometry(3.4, 2.4, 3.2)),
      woodMat
    );
    stallWall.position.y = 1.2;
    stallWall.castShadow = !this.isSoftwareGl;
    const counter = new THREE.Mesh(
      SharedAssets.getGeometry('settlement_counter', () => new THREE.BoxGeometry(2.2, 0.85, 0.6)),
      woodMat
    );
    counter.position.set(-0.6, 0.42, 1.8);
    const awningMat = SharedAssets.getMaterial('settlement_awning_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 })
    );
    const awning = new THREE.Mesh(
      SharedAssets.getGeometry('settlement_awning', () => new THREE.BoxGeometry(2.4, 0.1, 1.4)),
      awningMat
    );
    awning.position.set(-0.6, 2.0, 2.0);
    awning.rotation.x = 0.2;
    stall.add(stallWall, counter, awning);
    grp.add(stall);

    const hearth = new THREE.Mesh(
      SharedAssets.getGeometry('settlement_hearth', () => new THREE.CylinderGeometry(1.4, 1.6, 0.5, 8)),
      stoneMat
    );
    hearth.position.set(0, 0.25, 0);
    grp.add(hearth);

    const logGeo = SharedAssets.getGeometry('settlement_fire_log', () => new THREE.CylinderGeometry(0.1, 0.1, 0.9, 5));
    const logMat = SharedAssets.getMaterial('settlement_log_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 })
    );
    for (let i = 0; i < 4; i++) {
      const fireLog = new THREE.Mesh(logGeo, logMat);
      fireLog.rotation.z = Math.PI / 3;
      fireLog.rotation.y = (i * Math.PI) / 2;
      fireLog.position.set(0, 0.35, 0);
      grp.add(fireLog);
    }

    const flameMat = SharedAssets.getMaterial('settlement_flame_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0xffedd5,
        emissive: 0xf97316,
        emissiveIntensity: 1.2,
        roughness: 0.3,
      })
    );
    const flameMesh = new THREE.Mesh(
      SharedAssets.getGeometry('settlement_flame', () => new THREE.ConeGeometry(0.35, 0.7, 6)),
      flameMat
    );
    flameMesh.position.set(0, 0.7, 0);
    grp.add(flameMesh);

    const hearthGlow = SharedAssets.createGlowSprite(0xf97316, 2.6, 0.75);
    hearthGlow.position.set(0, 1.0, 0);
    grp.add(hearthGlow);

    const hearthLight = new THREE.PointLight(0xf97316, 1.8, 14);
    hearthLight.position.set(0, 1.2, 0);
    grp.add(hearthLight);
    this.hearthLight = hearthLight;

    const benchGeo = SharedAssets.getGeometry('settlement_bench', () => new THREE.BoxGeometry(1.6, 0.35, 0.45));
    const bench1 = new THREE.Mesh(benchGeo, woodMat);
    bench1.position.set(0, 0.18, 1.8);
    const bench2 = new THREE.Mesh(benchGeo, woodMat);
    bench2.position.set(1.8, 0.18, 0);
    bench2.rotation.y = Math.PI / 2;
    grp.add(bench1, bench2);

    const crate = new THREE.Mesh(
      SharedAssets.getGeometry('settlement_crate', () => new THREE.BoxGeometry(0.8, 0.8, 0.8)),
      woodMat
    );
    crate.position.set(1.5, 0.4, -0.6);
    const ledgerMat = SharedAssets.getMaterial('settlement_ledger_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 })
    );
    const ledger = new THREE.Mesh(
      SharedAssets.getGeometry('settlement_ledger', () => new THREE.BoxGeometry(0.35, 0.1, 0.45)),
      ledgerMat
    );
    ledger.position.set(1.5, 0.85, -0.6);
    grp.add(crate, ledger);

    const gardenBox = new THREE.Mesh(
      SharedAssets.getGeometry('settlement_garden', () => new THREE.BoxGeometry(2.4, 0.4, 1.2)),
      woodMat
    );
    gardenBox.position.set(-5.5, 0.2, 1.5);
    const gardenFlora = new THREE.Mesh(
      SharedAssets.getGeometry('settlement_flora', () => new THREE.DodecahedronGeometry(0.5, 0)),
      SharedAssets.getMaterial('settlement_flora_mat', () => new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 }))
    );
    gardenFlora.position.set(-5.5, 0.6, 1.5);
    grp.add(gardenBox, gardenFlora);

    const anvil = new THREE.Mesh(
      SharedAssets.getGeometry('settlement_anvil', () => new THREE.BoxGeometry(0.4, 0.6, 0.7)),
      SharedAssets.getMaterial('settlement_anvil_mat', () =>
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 })
      )
    );
    anvil.position.set(2.2, 0.3, -2.8);
    grp.add(anvil);

    const colliders: ObstacleCollider[] = [
      { type: 'box', x: x - 3.5, y: y + 1.5, z: z - 2, width: 4.6, depth: 4.0, height: 3.5 },
      { type: 'box', x: x + 3.8, y: y + 1.2, z: z + 2.5, width: 3.4, depth: 3.2, height: 3.0 },
      { type: 'cylinder', x, y: y + 0.3, z, radius: 1.5, height: 0.8 },
      { type: 'box', x: x + 1.5, y: y + 0.4, z: z - 0.6, width: 0.8, depth: 0.8, height: 0.8 },
      { type: 'box', x: x - 5.5, y: y + 0.3, z: z + 1.5, width: 2.4, depth: 1.2, height: 0.6 },
    ];

    this.colliders.push(...colliders);
    this.group.add(grp);

    this.structures.set('abandoned_settlement', {
      id: 'abandoned_settlement',
      name: 'Verdant Haven Settlement',
      type: 'ABANDONED_SETTLEMENT',
      position: [x + 1.5, y + 0.85, z - 0.6],
      interactionRadius: 3.8,
      promptText: 'Press [E] or Action to Read Pioneer Homestead Ledger',
      group: grp,
      colliders,
      isMounted: true,
      update: (_dt, totalTime) => {
        if (!grp.parent) return;
        const flicker = Math.sin(totalTime * 8) * 0.15 + Math.cos(totalTime * 14) * 0.1;
        if (hearthLight.visible) hearthLight.intensity = 1.8 + flicker;
        flameMesh.scale.set(1.0 + flicker * 0.2, 1.0 + Math.sin(totalTime * 12) * 0.25, 1.0 + flicker * 0.2);
      },
      dispose: () => {},
    });
  }

  private buildResearchCamp(woodMat: THREE.Material, getTerrainHeight: (x: number, z: number) => number): void {
    const x = 12;
    const z = 28;
    const y = getTerrainHeight(x, z);
    const grp = new THREE.Group();
    grp.position.set(x, y, z);

    const tentGeo = SharedAssets.getGeometry('camp_tent', () => {
      const g = new THREE.CylinderGeometry(2.4, 2.6, 3.2, 5);
      g.rotateZ(Math.PI / 2);
      return g;
    });
    const tentMat = SharedAssets.getMaterial('camp_tent_mat', () => new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 }));
    const tent = new THREE.Mesh(tentGeo, tentMat);
    tent.position.set(-2.0, 1.4, 0);
    tent.castShadow = !this.isSoftwareGl;
    grp.add(tent);

    const deskTop = new THREE.Mesh(
      SharedAssets.getGeometry('camp_desk', () => new THREE.BoxGeometry(2.2, 0.15, 1.2)),
      woodMat
    );
    deskTop.position.set(1.4, 1.0, 0);
    grp.add(deskTop);

    const legGeo = SharedAssets.getGeometry('camp_leg', () => new THREE.BoxGeometry(0.12, 1.0, 0.12));
    for (const dx of [-0.9, 0.9]) {
      for (const dz of [-0.45, 0.45]) {
        const leg = new THREE.Mesh(legGeo, woodMat);
        leg.position.set(1.4 + dx, 0.5, dz);
        grp.add(leg);
      }
    }

    const scroll = new THREE.Mesh(
      SharedAssets.getGeometry('camp_scroll', () => new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8)),
      SharedAssets.getMaterial('camp_paper_mat', () => new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 }))
    );
    scroll.rotateZ(Math.PI / 3);
    scroll.position.set(1.2, 1.15, -0.2);
    grp.add(scroll);

    const lantern = new THREE.Mesh(
      SharedAssets.getGeometry('camp_lantern', () => new THREE.BoxGeometry(0.25, 0.35, 0.25)),
      SharedAssets.getMaterial('camp_lantern_mat', () =>
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.9 })
      )
    );
    lantern.position.set(1.9, 1.25, 0.25);
    grp.add(lantern);

    const deskGlow = SharedAssets.createGlowSprite(0xf59e0b, 1.8, 0.65);
    deskGlow.position.set(1.9, 1.35, 0.25);
    grp.add(deskGlow);

    const tripod = new THREE.Group();
    tripod.position.set(3.2, 0, 1.4);
    const tLegGeo = SharedAssets.getGeometry('camp_tripod_leg', () => new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6));
    for (let i = 0; i < 3; i++) {
      const legAngle = (i * Math.PI * 2) / 3;
      const tLeg = new THREE.Mesh(tLegGeo, woodMat);
      tLeg.position.set(Math.cos(legAngle) * 0.4, 0.7, Math.sin(legAngle) * 0.4);
      tLeg.rotation.x = 0.25 * Math.sin(legAngle);
      tLeg.rotation.z = -0.25 * Math.cos(legAngle);
      tripod.add(tLeg);
    }
    const scope = new THREE.Mesh(
      SharedAssets.getGeometry('camp_scope', () => new THREE.CylinderGeometry(0.08, 0.12, 0.7, 8)),
      SharedAssets.getMaterial('camp_scope_mat', () => new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 }))
    );
    scope.position.y = 1.45;
    scope.rotation.x = Math.PI / 2;
    tripod.add(scope);
    grp.add(tripod);

    const colliders: ObstacleCollider[] = [
      { type: 'box', x: x - 2.0, y: y + 1.4, z, width: 3.2, depth: 3.5, height: 2.8 },
      { type: 'box', x: x + 1.4, y: y + 0.6, z, width: 2.4, depth: 1.4, height: 1.2 },
    ];
    this.colliders.push(...colliders);
    this.group.add(grp);

    this.structures.set('research_camp', {
      id: 'research_camp',
      name: "Surveyor Kaelen's Research Camp",
      type: 'RESEARCH_CAMP',
      position: [x + 1.4, y + 1.0, z],
      interactionRadius: 3.6,
      promptText: 'Press [E] or Action to Inspect Cartographer Field Notes',
      group: grp,
      colliders,
      isMounted: true,
      dispose: () => {},
    });
  }

  private buildSuspendedBridge(
    woodMat: THREE.Material,
    getTerrainHeight: (x: number, z: number) => number
  ): void {
    const startX = 20;
    const startZ = -12;
    const endX = 28;
    const endZ = -8;
    const bridgeY = Math.max(getTerrainHeight(startX, startZ), getTerrainHeight(endX, endZ)) + 0.85;

    const grp = new THREE.Group();
    const centerX = (startX + endX) / 2;
    const centerZ = (startZ + endZ) / 2;
    grp.position.set(centerX, bridgeY, centerZ);

    const dx = endX - startX;
    const dz = endZ - startZ;
    const bridgeLength = Math.hypot(dx, dz);
    grp.rotation.y = Math.atan2(dx, dz);

    const pylonGeo = SharedAssets.getGeometry('bridge_pylon', () => new THREE.CylinderGeometry(0.25, 0.35, 3.2, 8));
    for (const end of [-bridgeLength / 2, bridgeLength / 2]) {
      for (const side of [-1.6, 1.6]) {
        const pylon = new THREE.Mesh(pylonGeo, woodMat);
        pylon.position.set(side, 1.2, end);
        pylon.castShadow = !this.isSoftwareGl;
        grp.add(pylon);
      }
    }

    const cableMat = SharedAssets.getMaterial('bridge_cable_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 })
    );
    const cableGeo = new THREE.CylinderGeometry(0.06, 0.06, bridgeLength, 6);
    const railGeo = new THREE.BoxGeometry(0.08, 0.08, bridgeLength);
    for (const side of [-1.6, 1.6]) {
      const cable = new THREE.Mesh(cableGeo, cableMat);
      cable.rotateX(Math.PI / 2);
      cable.position.set(side, 2.0, 0);
      grp.add(cable);

      const rail = new THREE.Mesh(railGeo, woodMat);
      rail.position.set(side, 1.1, 0);
      grp.add(rail);
    }

    // Instanced Walkway Planks (14 instances -> 1 draw call)
    const plankCount = 14;
    const plankGeo = SharedAssets.getGeometry('bridge_plank', () => new THREE.BoxGeometry(3.0, 0.16, 0.65));
    const plankInst = new THREE.InstancedMesh(plankGeo, woodMat, plankCount);
    plankInst.castShadow = !this.isSoftwareGl;

    for (let p = 0; p < plankCount; p++) {
      const zOffset = -bridgeLength / 2 + (p + 0.5) * (bridgeLength / plankCount);
      const sag = Math.sin((p / plankCount) * Math.PI) * 0.18;
      _dummy.position.set(0, -sag, zOffset);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      plankInst.setMatrixAt(p, _dummy.matrix);
    }
    plankInst.instanceMatrix.needsUpdate = true;
    grp.add(plankInst);

    const bridgeCollider: ObstacleCollider = {
      type: 'box',
      x: centerX,
      y: bridgeY,
      z: centerZ,
      width: 3.2,
      depth: bridgeLength + 1.0,
      height: 0.4,
      walkableTop: true,
      topY: bridgeY + 0.1,
    };

    this.colliders.push(bridgeCollider);
    this.group.add(grp);

    this.structures.set('suspended_bridge', {
      id: 'suspended_bridge',
      name: 'River Gorge Suspension Bridge',
      type: 'SUSPENDED_BRIDGE',
      position: [centerX, bridgeY, centerZ],
      interactionRadius: 4.5,
      promptText: 'River Gorge Suspension Bridge',
      group: grp,
      colliders: [bridgeCollider],
      isMounted: true,
      dispose: () => {},
    });
  }

  private buildLockedDoor(
    stoneMat: THREE.Material,
    bronzeMat: THREE.Material,
    getTerrainHeight: (x: number, z: number) => number,
    save: SaveData
  ): void {
    const x = -38;
    const z = 22;
    const y = getTerrainHeight(x, z);
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    grp.rotation.y = Math.PI / 4;

    const pillarGeo = SharedAssets.getGeometry('gate_pillar', () => new THREE.BoxGeometry(1.4, 6.0, 1.4));
    const p1 = new THREE.Mesh(pillarGeo, stoneMat);
    p1.position.set(-2.4, 3.0, 0);
    const p2 = new THREE.Mesh(pillarGeo, stoneMat);
    p2.position.set(2.4, 3.0, 0);
    const lintel = new THREE.Mesh(
      SharedAssets.getGeometry('gate_lintel', () => new THREE.BoxGeometry(6.4, 1.4, 1.6)),
      stoneMat
    );
    lintel.position.set(0, 6.2, 0);
    grp.add(p1, p2, lintel);

    const storeUnlocked = Boolean(
      this.worldStateStore?.getChunkDelta(this.regionId, `${Math.floor(x / 32)},${Math.floor(z / 32)}`)?.unlockedDoors?.includes('sanctum_arch_gate')
    );
    const isUnlocked = storeUnlocked || save.unlockedDoors.includes('sanctum_arch_gate');
    if (isUnlocked && !save.unlockedDoors.includes('sanctum_arch_gate')) {
      save.unlockedDoors.push('sanctum_arch_gate');
    }

    this.gateDoorMesh = new THREE.Mesh(
      SharedAssets.getGeometry('gate_door', () => new THREE.BoxGeometry(3.6, 5.0, 0.4)),
      bronzeMat
    );
    this.gateDoorOriginalY = 2.5;
    this.gateDoorMesh.position.set(0, isUnlocked ? -2.2 : 2.5, 0);
    this.gateDoorMesh.castShadow = !this.isSoftwareGl;
    grp.add(this.gateDoorMesh);

    const keyholeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: isUnlocked ? 0x059669 : 0x0284c7,
      emissiveIntensity: 1.0,
    });
    const keyhole = new THREE.Mesh(
      SharedAssets.getGeometry('gate_keyhole', () => new THREE.CylinderGeometry(0.2, 0.2, 0.45, 8)),
      keyholeMat
    );
    keyhole.rotateX(Math.PI / 2);
    keyhole.position.set(0, 2.5, 0);
    grp.add(keyhole);

    const colliders: ObstacleCollider[] = [
      { type: 'box', x: x - 1.7, y: y + 3, z: z - 1.7, width: 1.5, depth: 1.5, height: 6 },
      { type: 'box', x: x + 1.7, y: y + 3, z: z + 1.7, width: 1.5, depth: 1.5, height: 6 },
    ];
    if (!isUnlocked) {
      colliders.push({ type: 'box', x, y: y + 2.5, z, width: 3.6, depth: 0.6, height: 5 });
    }

    this.colliders.push(...colliders);
    this.group.add(grp);

    this.structures.set('sanctum_arch_gate', {
      id: 'sanctum_arch_gate',
      name: 'Sunken Sanctum Arch Gate',
      type: 'LOCKED_DOOR',
      position: [x, y + 2.5, z],
      interactionRadius: 3.6,
      promptText: isUnlocked
        ? 'Sanctum Gate Unlocked'
        : 'Press [E] or Action to Unlock Gate (Requires Sanctum Key)',
      group: grp,
      colliders,
      isMounted: true,
      update: (dt) => {
        if (this.isGateOpening && this.gateDoorMesh) {
          this.gateOpenProgress = Math.min(1.0, this.gateOpenProgress + dt * 1.2);
          this.gateDoorMesh.position.y = THREE.MathUtils.lerp(this.gateDoorOriginalY, -2.2, this.gateOpenProgress);
          if (this.gateOpenProgress >= 1.0) {
            this.isGateOpening = false;
          }
        }
      },
      dispose: () => {},
    });
  }

  private buildResourceDeposits(
    stoneMat: THREE.Material,
    crystalMat: THREE.Material,
    aetheriumMat: THREE.Material,
    getTerrainHeight: (x: number, z: number) => number
  ): void {
    const x1 = -16;
    const z1 = 32;
    const y1 = getTerrainHeight(x1, z1);
    const grp1 = new THREE.Group();
    grp1.position.set(x1, y1, z1);

    const rock1 = new THREE.Mesh(
      SharedAssets.getGeometry('deposit_rock1', () => new THREE.DodecahedronGeometry(1.6, 1)),
      stoneMat
    );
    rock1.position.y = 0.8;
    grp1.add(rock1);

    const spikeGeo = SharedAssets.getGeometry('deposit_spike', () => new THREE.ConeGeometry(0.35, 1.8, 6));
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const spike = new THREE.Mesh(spikeGeo, crystalMat);
      spike.position.set(Math.cos(angle) * 0.7, 1.5, Math.sin(angle) * 0.7);
      spike.rotation.x = Math.sin(angle) * 0.45;
      spike.rotation.z = -Math.cos(angle) * 0.45;
      grp1.add(spike);
      this.crystalNodes.push(spike);
    }

    const glow1 = SharedAssets.createGlowSprite(0x38bdf8, 2.8, 0.7);
    glow1.position.y = 1.8;
    grp1.add(glow1);

    const col1: ObstacleCollider = { type: 'cylinder', x: x1, y: y1, z: z1, radius: 1.6, height: 2.2 };
    this.colliders.push(col1);
    this.group.add(grp1);

    this.structures.set('res_lumicite_vein', {
      id: 'res_lumicite_vein',
      name: 'Resonant Lumicite Crystal Vein',
      type: 'RESOURCE_DEPOSIT',
      position: [x1, y1 + 1.2, z1],
      interactionRadius: 3.4,
      promptText: 'Press [E] or Action to Mine Lumicite Crystals',
      group: grp1,
      colliders: [col1],
      isMounted: true,
      dispose: () => {},
    });

    const x2 = -28;
    const z2 = 6;
    const y2 = getTerrainHeight(x2, z2);
    const grp2 = new THREE.Group();
    grp2.position.set(x2, y2, z2);

    const rock2 = new THREE.Mesh(
      SharedAssets.getGeometry('deposit_rock2', () => new THREE.DodecahedronGeometry(1.8, 1)),
      stoneMat
    );
    rock2.position.y = 0.9;
    grp2.add(rock2);

    const oreGeo = SharedAssets.getGeometry('deposit_ore', () => new THREE.BoxGeometry(0.65, 0.9, 0.65));
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const ore = new THREE.Mesh(oreGeo, aetheriumMat);
      ore.position.set(Math.cos(angle) * 0.8, 1.6, Math.sin(angle) * 0.8);
      ore.rotation.set(0.3, angle, 0.2);
      grp2.add(ore);
      this.crystalNodes.push(ore);
    }

    const glow2 = SharedAssets.createGlowSprite(0xf59e0b, 2.8, 0.7);
    glow2.position.y = 1.8;
    grp2.add(glow2);

    const col2: ObstacleCollider = { type: 'cylinder', x: x2, y: y2, z: z2, radius: 1.8, height: 2.4 };
    this.colliders.push(col2);
    this.group.add(grp2);

    this.structures.set('res_aetherium_ore', {
      id: 'res_aetherium_ore',
      name: 'Celestial Aetherium Ore Cluster',
      type: 'RESOURCE_DEPOSIT',
      position: [x2, y2 + 1.2, z2],
      interactionRadius: 3.4,
      promptText: 'Press [E] or Action to Mine Aetherium Ore',
      group: grp2,
      colliders: [col2],
      isMounted: true,
      dispose: () => {},
    });
  }

  private buildDimensionalGateway(
    stoneMat: THREE.Material,
    bronzeMat: THREE.Material,
    getTerrainHeight: (x: number, z: number) => number
  ): void {
    const x = -50;
    const z = -20;
    const y = getTerrainHeight(x, z);
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    grp.rotation.y = -Math.PI / 4;

    const dais = new THREE.Mesh(
      SharedAssets.getGeometry('gateway_dais', () => new THREE.CylinderGeometry(5.2, 5.8, 0.8, 8)),
      stoneMat
    );
    dais.position.y = 0.4;
    grp.add(dais);

    const pillarGeo = SharedAssets.getGeometry('gateway_pillar', () => new THREE.BoxGeometry(1.6, 9.5, 1.6));
    const p1 = new THREE.Mesh(pillarGeo, stoneMat);
    p1.position.set(-3.2, 4.75, 0);
    p1.castShadow = !this.isSoftwareGl;
    const p2 = new THREE.Mesh(pillarGeo, stoneMat);
    p2.position.set(3.2, 4.75, 0);
    p2.castShadow = !this.isSoftwareGl;
    const archTop = new THREE.Mesh(
      SharedAssets.getGeometry('gateway_top', () => new THREE.BoxGeometry(8.0, 1.6, 2.0)),
      stoneMat
    );
    archTop.position.set(0, 9.5, 0);
    grp.add(p1, p2, archTop);

    const vortexMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    this.gatewayVortexMesh = new THREE.Mesh(
      SharedAssets.getGeometry('gateway_vortex', () => new THREE.PlaneGeometry(5.2, 8.2)),
      vortexMat
    );
    this.gatewayVortexMesh.position.set(0, 5.0, 0);
    grp.add(this.gatewayVortexMesh);

    const shardGeo = SharedAssets.getGeometry('gateway_shard', () => new THREE.ConeGeometry(0.35, 1.4, 4));
    for (let i = 0; i < 3; i++) {
      const ringGrp = new THREE.Group();
      ringGrp.position.set(0, 5.0, 0);
      const shard = new THREE.Mesh(shardGeo, bronzeMat);
      shard.position.set(4.2, 0, 0);
      ringGrp.add(shard);
      ringGrp.rotation.y = (i * Math.PI * 2) / 3;
      grp.add(ringGrp);
      this.beaconRings.push(ringGrp);
    }

    const gateGlow = SharedAssets.createGlowSprite(0x818cf8, 6.2, 0.7);
    gateGlow.position.set(0, 5.0, 0);
    grp.add(gateGlow);

    const col1: ObstacleCollider = { type: 'cylinder', x: x - 2.2, y, z: z + 2.2, radius: 1.2, height: 9.5 };
    const col2: ObstacleCollider = { type: 'cylinder', x: x + 2.2, y, z: z - 2.2, radius: 1.2, height: 9.5 };
    this.colliders.push(col1, col2);
    this.group.add(grp);

    this.structures.set('dimensional_gateway', {
      id: 'dimensional_gateway',
      name: 'Arch of the Astral Conflux (Gateway)',
      type: 'DIMENSIONAL_GATEWAY',
      position: [x, y + 2.5, z],
      interactionRadius: 4.2,
      promptText: 'Press [E] or Action to Step Through Dimensional Gateway',
      group: grp,
      colliders: [col1, col2],
      isMounted: true,
      update: (dt, totalTime) => {
        if (!grp.parent) return;
        if (this.gatewayVortexMesh) {
          (this.gatewayVortexMesh.material as THREE.MeshBasicMaterial).opacity =
            0.65 + Math.sin(totalTime * 3.0) * 0.15;
        }
        this.beaconRings.forEach((r, idx) => {
          r.rotation.y += dt * (0.8 + idx * 0.3);
        });
      },
      dispose: () => {},
    });
  }

  public triggerUnlockDoor(): void {
    this.isGateOpening = true;
    this.gateOpenProgress = 0;
    this.colliders = this.colliders.filter(
      (c) => !(c.type === 'box' && Math.abs(c.x - -38) < 1.0 && Math.abs(c.z - 22) < 1.0)
    );
    const struct = this.structures.get('sanctum_arch_gate');
    if (struct) {
      struct.promptText = 'Sanctum Gate Unlocked';
      this.worldStateStore?.markDoorUnlocked(this.regionId, struct.position[0], struct.position[2], 'sanctum_arch_gate');
    }
  }

  public triggerDissolveHiddenWall(): void {
    this.isHiddenWallDissolving = true;
    this.hiddenWallProgress = 0;
    this.colliders = this.colliders.filter(
      (c) => !(c.type === 'box' && Math.abs(c.x - -43.5) < 1.0 && Math.abs(c.z - -8) < 1.0)
    );
    const struct = this.structures.get('hidden_chamber');
    if (struct) {
      struct.promptText = 'Press [E] to Inspect Codex of the First Drift';
      this.worldStateStore?.markChamberDiscovered(this.regionId, struct.position[0], struct.position[2], 'hidden_chamber');
    }
  }

  public update(dt: number, totalTime: number): void {
    this.structures.forEach((s) => {
      if (s.isMounted !== false) {
        s.update?.(dt, totalTime);
      }
    });
  }

  public clear(): void {
    this.structures.forEach((s) => {
      if (s.group.parent) {
        this.group.remove(s.group);
      }
      SharedAssets.disposeObject3DSafe(s.group);
      s.dispose();
    });
    this.structures.clear();
    this.colliders = [];
    this.beaconRings = [];
    this.crystalNodes = [];
    this.gateDoorMesh = null;
    this.hiddenWallMesh = null;
    this.gatewayVortexMesh = null;
    this.hearthLight = null;
  }

  public dispose(): void {
    this.clear();
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
