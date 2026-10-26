/**
 * World Structures & Interactive Architecture for The Drifting Land.
 * Implements Prompt 6 requirements:
 * 1. Ancient Beacons (active checkpoints with lighting and respawn anchors)
 * 2. Ruined Towers (vertical climbable watchtower with summit celestial astrolabe)
 * 3. Hidden Chambers (subterranean secret room behind cracked wall with ancient codex)
 * 4. Abandoned Settlements (Hollow Drift homestead with shelters, hearth, ledger, and salvage crates)
 * 5. Research Camps (Surveyor Kaelen's expedition camp with cartography desk and field notes)
 * 6. Suspended Bridges (walkable timber suspension bridge with cables and physical deck)
 * 7. Locked Doors (Sanctum Gate requiring Sanctum Rune Key, with animated opening)
 * 8. Resource Deposits (Lumicite crystal vein & Aetherium ore outcrop, mineable with [E])
 * 9. Dimensional Gateways (Arch of the Astral Conflux with swirling animated vortex)
 */

import * as THREE from 'three';
import { ObstacleCollider, SaveData } from '../types/game';
import { TextureGenerator } from './textures';

export interface RuntimeStructure {
  id: string;
  name: string;
  type: string;
  position: [number, number, number];
  interactionRadius: number;
  promptText: string;
  group: THREE.Group;
  colliders: ObstacleCollider[];
  update?: (delta: number, totalTime: number) => void;
  dispose: () => void;
}

export class StructuresManager {
  public group: THREE.Group;
  public colliders: ObstacleCollider[] = [];
  public structures: Map<string, RuntimeStructure> = new Map();
  private isSoftwareGl: boolean;

  // Dynamic references for animated components
  private gateDoorMesh: THREE.Mesh | null = null;
  private gateDoorOriginalY: number = 0;
  private isGateOpening: boolean = false;
  private gateOpenProgress: number = 0;

  private hiddenWallMesh: THREE.Mesh | null = null;
  private isHiddenWallDissolving: boolean = false;
  private hiddenWallProgress: number = 0;

  private gatewayVortexMesh: THREE.Mesh | null = null;
  private beaconRings: THREE.Group[] = [];
  private crystalNodes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene, isSoftwareGl = false) {
    this.group = new THREE.Group();
    this.group.name = 'world_structures';
    this.isSoftwareGl = isSoftwareGl;
    scene.add(this.group);
  }

  /**
   * Instantiate all 9 structure types across the archipelago
   */
  public buildAll(getTerrainHeight: (x: number, z: number) => number, save: SaveData): void {
    const stoneTex = TextureGenerator.createStoneTexture(this.isSoftwareGl ? 1 : 4);
    const barkTex = TextureGenerator.createBarkTexture(this.isSoftwareGl ? 1 : 4);
    const pathTex = TextureGenerator.createPathTexture(this.isSoftwareGl ? 1 : 4);

    // Shared materials
    const stoneMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: false,
    });

    const woodMat = new THREE.MeshStandardMaterial({
      map: barkTex,
      roughness: 0.8,
      metalness: 0.1,
    });

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x78350f,
      emissiveIntensity: 0.3,
    });

    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      metalness: 0.85,
    });

    const aetheriumMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.9,
    });

    // 1. ANCIENT BEACONS (Waystone Sanctuaries)
    this.buildPromontoryBeacon(stoneMat, crystalMat, getTerrainHeight, save);
    this.buildSanctumBeacon(stoneMat, crystalMat, getTerrainHeight, save);

    // 2. RUINED TOWER (Sunward Promontory Watchtower & Astrolabe)
    this.buildRuinedTower(stoneMat, woodMat, bronzeMat, getTerrainHeight);

    // 3. HIDDEN CHAMBER (Concealed Subterranean Vault)
    this.buildHiddenChamber(stoneMat, bronzeMat, getTerrainHeight, save);

    // 4. ABANDONED SETTLEMENT (Hollow Drift Homestead)
    this.buildAbandonedSettlement(stoneMat, woodMat, pathTex, getTerrainHeight);

    // 5. RESEARCH CAMP (Surveyor Kaelen's Outpost)
    this.buildResearchCamp(woodMat, getTerrainHeight);

    // 6. SUSPENDED BRIDGE (Timber & Rope suspension across gorge)
    this.buildSuspendedBridge(woodMat, bronzeMat, getTerrainHeight);

    // 7. LOCKED DOOR (Antiquity Sanctum Arch Gate)
    this.buildLockedDoor(stoneMat, bronzeMat, getTerrainHeight, save);

    // 8. RESOURCE DEPOSITS (Lumicite Vein & Aetherium Ore)
    this.buildResourceDeposits(stoneMat, crystalMat, aetheriumMat, getTerrainHeight);

    // 9. DIMENSIONAL GATEWAY (Arch of the Astral Conflux)
    this.buildDimensionalGateway(stoneMat, bronzeMat, getTerrainHeight);
  }

  /**
   * 1A. Sunward Promontory Waystone Beacon
   */
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

    // Base pedestal
    const baseGeo = new THREE.CylinderGeometry(2.2, 2.6, 0.8, 8);
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = 0.4;
    grp.add(base);

    // Runic Obelisk Pillar
    const pillarGeo = new THREE.BoxGeometry(1.1, 4.5, 1.1);
    const pillar = new THREE.Mesh(pillarGeo, stoneMat);
    pillar.position.y = 2.6;
    grp.add(pillar);

    // Floating Crystal
    const cryGeo = new THREE.OctahedronGeometry(0.7, 0);
    const cry = new THREE.Mesh(cryGeo, crystalMat);
    cry.position.y = 5.2;
    grp.add(cry);

    // Light
    const isAct = save.activatedCheckpoints.includes('cp_eastern_ridge');
    const light = new THREE.PointLight(0x38bdf8, isAct ? 1.5 : 0.5, 12);
    light.position.y = 5.2;
    grp.add(light);

    this.group.add(grp);

    const collider: ObstacleCollider = {
      type: 'cylinder',
      x,
      y,
      z,
      radius: 1.8,
      height: 4.5,
    };
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
      update: (_dt, totalTime) => {
        cry.rotation.y = totalTime * 1.2;
        cry.position.y = 5.2 + Math.sin(totalTime * 2.0) * 0.15;
      },
      dispose: () => {},
    });
  }

  /**
   * 1B. Sunken Ruin Sanctum Waystone Beacon
   */
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

    const baseGeo = new THREE.CylinderGeometry(2.0, 2.4, 0.7, 8);
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = 0.35;
    grp.add(base);

    const pillarGeo = new THREE.CylinderGeometry(0.7, 0.9, 3.8, 8);
    const pillar = new THREE.Mesh(pillarGeo, stoneMat);
    pillar.position.y = 2.2;
    grp.add(pillar);

    const cryGeo = new THREE.DodecahedronGeometry(0.65, 0);
    const cry = new THREE.Mesh(cryGeo, crystalMat);
    cry.position.y = 4.4;
    grp.add(cry);

    const isAct = save.activatedCheckpoints.includes('cp_elder_groove');
    const light = new THREE.PointLight(0x34d399, isAct ? 1.4 : 0.4, 12);
    light.position.y = 4.4;
    grp.add(light);

    this.group.add(grp);

    const collider: ObstacleCollider = {
      type: 'cylinder',
      x,
      y,
      z,
      radius: 1.6,
      height: 4.0,
    };
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
      update: (_dt, totalTime) => {
        cry.rotation.y = -totalTime * 1.5;
        cry.position.y = 4.4 + Math.sin(totalTime * 2.2) * 0.12;
      },
      dispose: () => {},
    });
  }

  /**
   * 2. Ruined Watchtower (Climbable vantage structure with Astrolabe)
   */
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

    // Octagonal Tower Cylinder
    const towerGeo = new THREE.CylinderGeometry(4.2, 4.8, 8.5, 8, 1, true);
    const towerMesh = new THREE.Mesh(towerGeo, stoneMat);
    towerMesh.position.y = 4.25;
    towerMesh.castShadow = !this.isSoftwareGl;
    grp.add(towerMesh);

    // Summit Observation Floor
    const floorGeo = new THREE.CylinderGeometry(4.3, 4.3, 0.4, 8);
    const floorMesh = new THREE.Mesh(floorGeo, stoneMat);
    floorMesh.position.y = 8.5;
    grp.add(floorMesh);

    // Battlements
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) {
        const angle = (i * Math.PI) / 4;
        const bx = Math.cos(angle) * 4.1;
        const bz = Math.sin(angle) * 4.1;
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.6), stoneMat);
        merlon.position.set(bx, 9.3, bz);
        merlon.rotation.y = -angle;
        grp.add(merlon);
      }
    }

    // Climbable spiral exterior timber ramps / steps around tower base
    const stepCount = 9;
    const towerColliders: ObstacleCollider[] = [];

    for (let s = 0; s < stepCount; s++) {
      const stepAngle = (s * Math.PI * 0.22) - Math.PI * 0.5;
      const stepRadius = 4.8;
      const sx = Math.cos(stepAngle) * stepRadius;
      const sz = Math.sin(stepAngle) * stepRadius;
      const sy = 0.8 + s * 0.85;

      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 1.4), woodMat);
      stepMesh.position.set(sx, sy, sz);
      stepMesh.rotation.y = -stepAngle + Math.PI / 2;
      stepMesh.castShadow = !this.isSoftwareGl;
      grp.add(stepMesh);

      // Walkable step collider
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

    // Summit Observation Deck Walkable Collider
    towerColliders.push({
      type: 'cylinder',
      x,
      y: y + 8.5,
      z,
      radius: 4.2,
      height: 0.5,
      walkableTop: true,
      topY: y + 8.7,
    });

    // Solid Tower Main Trunk Cylinder Collider
    towerColliders.push({
      type: 'cylinder',
      x,
      y,
      z,
      radius: 3.8,
      height: 8.5,
    });

    // Interactive Celestial Astrolabe on the summit
    const astrolabeGrp = new THREE.Group();
    astrolabeGrp.position.set(0, 9.2, 0);

    const standMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.2, 8), bronzeMat);
    astrolabeGrp.add(standMesh);

    const sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), bronzeMat);
    sphereMesh.position.y = 1.0;
    astrolabeGrp.add(sphereMesh);

    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 8, 24), bronzeMat);
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
      update: (_dt, totalTime) => {
        ringMesh.rotation.z = totalTime * 0.8;
      },
      dispose: () => {},
    });
  }

  /**
   * 3. Hidden Chamber (Concealed Subterranean Vault behind cracked ruin wall)
   */
  private buildHiddenChamber(
    stoneMat: THREE.Material,
    bronzeMat: THREE.Material,
    getTerrainHeight: (x: number, z: number) => number,
    save: SaveData
  ): void {
    const x = -48;
    const z = -8;
    const y = getTerrainHeight(x, z);
    const grp = new THREE.Group();
    grp.position.set(x, y, z);

    // Subterranean Chamber Box Envelope (Carved into hill)
    const chamberFloor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 9), stoneMat);
    chamberFloor.position.set(0, 0.3, 0);
    grp.add(chamberFloor);

    // 3 Solid perimeter walls
    const wallNorth = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.8), stoneMat);
    wallNorth.position.set(0, 2.5, -4.5);
    grp.add(wallNorth);

    const wallSouth = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.8), stoneMat);
    wallSouth.position.set(0, 2.5, 4.5);
    grp.add(wallSouth);

    const wallWest = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5, 9), stoneMat);
    wallWest.position.set(-4.5, 2.5, 0);
    grp.add(wallWest);

    // Ceiling slab
    const roof = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.6, 9.5), stoneMat);
    roof.position.set(0, 5.2, 0);
    grp.add(roof);

    // Ancient Relic Altar inside chamber
    const altar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 1.2, 8), stoneMat);
    altar.position.set(0, 0.9, 0);
    grp.add(altar);

    // Glowing Codex on altar
    const codexMat = new THREE.MeshStandardMaterial({
      color: 0x6ee7b7,
      emissive: 0x10b981,
      emissiveIntensity: 0.9,
    });
    const codexMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.8), codexMat);
    codexMesh.position.set(0, 1.6, 0);
    grp.add(codexMesh);

    const chamberLight = new THREE.PointLight(0x34d399, 1.2, 10);
    chamberLight.position.set(0, 2.5, 0);
    grp.add(chamberLight);

    // Illusory / Cracked Front Wall (East side)
    const isDiscovered = save.discoveredChambers.includes('hidden_chamber');
    const wallGeo = new THREE.BoxGeometry(0.8, 5, 6);
    const crackedMat = new THREE.MeshStandardMaterial({
      color: isDiscovered ? 0x22c55e : 0x475569,
      roughness: 0.9,
      transparent: true,
      opacity: isDiscovered ? 0.15 : 1.0,
    });
    this.hiddenWallMesh = new THREE.Mesh(wallGeo, crackedMat);
    this.hiddenWallMesh.position.set(4.5, 2.5, 0);
    grp.add(this.hiddenWallMesh);

    // Colliders
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
      update: (_dt, totalTime) => {
        codexMesh.rotation.y = totalTime * 0.5;
        if (this.isHiddenWallDissolving && this.hiddenWallMesh) {
          this.hiddenWallProgress = Math.min(1.0, this.hiddenWallProgress + _dt * 1.5);
          (this.hiddenWallMesh.material as THREE.MeshStandardMaterial).opacity = 1.0 - this.hiddenWallProgress * 0.85;
          if (this.hiddenWallProgress >= 1.0) {
            this.isHiddenWallDissolving = false;
          }
        }
      },
      dispose: () => {},
    });
  }

  /**
   * 4. Abandoned Settlement (Hollow Drift Homestead)
   */
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

    // Weathered Flagstone courtyard
    const courtGeo = new THREE.CylinderGeometry(7.5, 8.0, 0.25, 8);
    const courtMat = new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.9 });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.position.y = 0.12;
    grp.add(court);

    // Shelter 1 (Main homestead hut)
    const hut1 = new THREE.Group();
    hut1.position.set(-3.5, 0, -2);
    // Timber walls
    const wall1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 3.6), woodMat);
    wall1.position.y = 1.4;
    wall1.castShadow = !this.isSoftwareGl;
    hut1.add(wall1);
    // Slanted thatch/wood roof
    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.8, 4), woodMat);
    roof1.position.y = 3.6;
    roof1.rotation.y = Math.PI / 4;
    roof1.castShadow = !this.isSoftwareGl;
    hut1.add(roof1);
    grp.add(hut1);

    // Shelter 2 (Broken storehouse)
    const hut2 = new THREE.Group();
    hut2.position.set(3.8, 0, 2.5);
    const wall2 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 3.2), woodMat);
    wall2.position.y = 1.1;
    wall2.castShadow = !this.isSoftwareGl;
    hut2.add(wall2);
    grp.add(hut2);

    // Stone Hearth in center with old ashes
    const hearthGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.8, 8);
    const hearth = new THREE.Mesh(hearthGeo, stoneMat);
    hearth.position.set(0, 0.4, 0);
    grp.add(hearth);

    // Pioneer Ledger on a wood crate beside hearth
    const crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const crate = new THREE.Mesh(crateGeo, woodMat);
    crate.position.set(1.5, 0.4, -0.6);
    grp.add(crate);

    const ledgerMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 });
    const ledger = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.45), ledgerMat);
    ledger.position.set(1.5, 0.85, -0.6);
    grp.add(ledger);

    // Salvage supply crate on the side
    const salvageCrate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 1.0), woodMat);
    salvageCrate.position.set(-1.8, 0.45, 2.8);
    grp.add(salvageCrate);

    // Broken grounded cargo skiff frame
    const skiffGeo = new THREE.CylinderGeometry(0.6, 1.2, 5.0, 6);
    skiffGeo.rotateZ(Math.PI / 2);
    skiffGeo.scale(1, 0.6, 1);
    const skiff = new THREE.Mesh(skiffGeo, woodMat);
    skiff.position.set(4.2, 0.4, -3.2);
    skiff.rotation.y = Math.PI / 6;
    grp.add(skiff);

    // Colliders
    const colliders: ObstacleCollider[] = [
      { type: 'box', x: x - 3.5, y: y + 1.4, z: z - 2, width: 4.2, depth: 3.6, height: 3.5 },
      { type: 'box', x: x + 3.8, y: y + 1.1, z: z + 2.5, width: 3.2, depth: 3.2, height: 2.8 },
      { type: 'cylinder', x, y: y + 0.4, z, radius: 1.3, height: 0.8 },
      { type: 'box', x: x - 1.8, y: y + 0.45, z: z + 2.8, width: 1.0, depth: 1.0, height: 0.9 },
    ];

    this.colliders.push(...colliders);
    this.group.add(grp);

    this.structures.set('abandoned_settlement', {
      id: 'abandoned_settlement',
      name: 'Hollow Drift Homestead',
      type: 'ABANDONED_SETTLEMENT',
      position: [x + 1.5, y + 0.85, z - 0.6],
      interactionRadius: 3.8,
      promptText: 'Press [E] or Action to Read Pioneer Homestead Ledger',
      group: grp,
      colliders,
      dispose: () => {},
    });
  }

  /**
   * 5. Research Camp (Surveyor Kaelen's Outpost)
   */
  private buildResearchCamp(woodMat: THREE.Material, getTerrainHeight: (x: number, z: number) => number): void {
    const x = 12;
    const z = 28;
    const y = getTerrainHeight(x, z);
    const grp = new THREE.Group();
    grp.position.set(x, y, z);

    // Expedition Canvas Tent
    const tentMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
    });
    const tentGeo = new THREE.CylinderGeometry(2.4, 2.6, 3.2, 5);
    tentGeo.rotateZ(Math.PI / 2);
    const tent = new THREE.Mesh(tentGeo, tentMat);
    tent.position.set(-2.0, 1.4, 0);
    tent.castShadow = !this.isSoftwareGl;
    grp.add(tent);

    // Cartographer's Desk
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 1.2), woodMat);
    deskTop.position.set(1.4, 1.0, 0);
    grp.add(deskTop);

    // Legs
    for (const dx of [-0.9, 0.9]) {
      for (const dz of [-0.45, 0.45]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), woodMat);
        leg.position.set(1.4 + dx, 0.5, dz);
        grp.add(leg);
      }
    }

    // Chart scroll & glowing lantern on desk
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 });
    const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), paperMat);
    scroll.rotateZ(Math.PI / 3);
    scroll.position.set(1.2, 1.15, -0.2);
    grp.add(scroll);

    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.9,
    });
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.25), lanternMat);
    lantern.position.set(1.9, 1.25, 0.25);
    grp.add(lantern);

    const deskLight = new THREE.PointLight(0xf59e0b, 0.8, 6);
    deskLight.position.set(1.9, 1.35, 0.25);
    grp.add(deskLight);

    // Surveyor's Theodolite Tripod
    const tripod = new THREE.Group();
    tripod.position.set(3.2, 0, 1.4);
    for (let i = 0; i < 3; i++) {
      const legAngle = (i * Math.PI * 2) / 3;
      const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), woodMat);
      tLeg.position.set(Math.cos(legAngle) * 0.4, 0.7, Math.sin(legAngle) * 0.4);
      tLeg.rotation.x = 0.25 * Math.sin(legAngle);
      tLeg.rotation.z = -0.25 * Math.cos(legAngle);
      tripod.add(tLeg);
    }
    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 })
    );
    scope.position.y = 1.45;
    scope.rotation.x = Math.PI / 2;
    tripod.add(scope);
    grp.add(tripod);

    // Colliders
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
      dispose: () => {},
    });
  }

  /**
   * 6. Suspended Bridge (Crossing river gorge at x: 24, z: -10)
   */
  private buildSuspendedBridge(
    woodMat: THREE.Material,
    bronzeMat: THREE.Material,
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
    const bridgeAngle = Math.atan2(dx, dz);
    grp.rotation.y = bridgeAngle;

    // 4 Heavy Anchorage Timber Pylons at bridge ends
    for (const end of [-bridgeLength / 2, bridgeLength / 2]) {
      for (const side of [-1.6, 1.6]) {
        const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3.2, 8), woodMat);
        pylon.position.set(side, 1.2, end);
        pylon.castShadow = !this.isSoftwareGl;
        grp.add(pylon);
      }
    }

    // Suspension braided cables (catenary curve)
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 });
    for (const side of [-1.6, 1.6]) {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, bridgeLength, 8), cableMat);
      cable.rotateX(Math.PI / 2);
      cable.position.set(side, 2.0, 0);
      grp.add(cable);

      // Guard Rail
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, bridgeLength), woodMat);
      rail.position.set(side, 1.1, 0);
      grp.add(rail);
    }

    // Individual Walkway Planks
    const plankCount = 14;
    for (let p = 0; p < plankCount; p++) {
      const zOffset = -bridgeLength / 2 + (p + 0.5) * (bridgeLength / plankCount);
      const sag = Math.sin((p / plankCount) * Math.PI) * 0.18; // gentle bridge sag
      const plank = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.16, 0.65), woodMat);
      plank.position.set(0, -sag, zOffset);
      plank.castShadow = !this.isSoftwareGl;
      grp.add(plank);
    }

    // Walkable Bridge Deck Collider
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
      dispose: () => {},
    });
  }

  /**
   * 7. Locked Door (Antiquity Sanctum Arch Gate)
   */
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

    // Stone Frame Pillars
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6.0, 1.4), stoneMat);
    p1.position.set(-2.4, 3.0, 0);
    grp.add(p1);

    const p2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6.0, 1.4), stoneMat);
    p2.position.set(2.4, 3.0, 0);
    grp.add(p2);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.4, 1.6), stoneMat);
    lintel.position.set(0, 6.2, 0);
    grp.add(lintel);

    // Heavy Bronze & Iron Portcullis Door
    const isUnlocked = save.unlockedDoors.includes('sanctum_arch_gate');
    const doorGeo = new THREE.BoxGeometry(3.6, 5.0, 0.4);
    this.gateDoorMesh = new THREE.Mesh(doorGeo, bronzeMat);
    this.gateDoorOriginalY = 2.5;
    this.gateDoorMesh.position.set(0, isUnlocked ? -2.2 : 2.5, 0);
    this.gateDoorMesh.castShadow = !this.isSoftwareGl;
    grp.add(this.gateDoorMesh);

    // Glowing Runic Keyhole in center of door
    const keyholeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: isUnlocked ? 0x059669 : 0x0284c7,
      emissiveIntensity: 1.0,
    });
    const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.45, 8), keyholeMat);
    keyhole.rotateX(Math.PI / 2);
    keyhole.position.set(0, 2.5, 0);
    grp.add(keyhole);

    // Colliders
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
      update: (_dt) => {
        if (this.isGateOpening && this.gateDoorMesh) {
          this.gateOpenProgress = Math.min(1.0, this.gateOpenProgress + _dt * 1.2);
          this.gateDoorMesh.position.y = THREE.MathUtils.lerp(this.gateDoorOriginalY, -2.2, this.gateOpenProgress);
          if (this.gateOpenProgress >= 1.0) {
            this.isGateOpening = false;
          }
        }
      },
      dispose: () => {},
    });
  }

  /**
   * 8. Resource Deposits (Lumicite Vein & Aetherium Ore)
   */
  private buildResourceDeposits(
    stoneMat: THREE.Material,
    crystalMat: THREE.Material,
    aetheriumMat: THREE.Material,
    getTerrainHeight: (x: number, z: number) => number
  ): void {
    // Deposit 1: Lumicite Crystal Vein at (-16, 32)
    const x1 = -16;
    const z1 = 32;
    const y1 = getTerrainHeight(x1, z1);
    const grp1 = new THREE.Group();
    grp1.position.set(x1, y1, z1);

    // Basalt host boulder
    const rock1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), stoneMat);
    rock1.position.y = 0.8;
    grp1.add(rock1);

    // Jutting Azure Crystal Spikes
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const spikeGeo = new THREE.ConeGeometry(0.35, 1.8, 6);
      const spike = new THREE.Mesh(spikeGeo, crystalMat);
      spike.position.set(Math.cos(angle) * 0.7, 1.5, Math.sin(angle) * 0.7);
      spike.rotation.x = Math.sin(angle) * 0.45;
      spike.rotation.z = -Math.cos(angle) * 0.45;
      grp1.add(spike);
      this.crystalNodes.push(spike);
    }

    const light1 = new THREE.PointLight(0x38bdf8, 0.9, 8);
    light1.position.y = 1.8;
    grp1.add(light1);

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
      dispose: () => {},
    });

    // Deposit 2: Aetherium Ore Outcrop at (-28, 6)
    const x2 = -28;
    const z2 = 6;
    const y2 = getTerrainHeight(x2, z2);
    const grp2 = new THREE.Group();
    grp2.position.set(x2, y2, z2);

    const rock2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), stoneMat);
    rock2.position.y = 0.9;
    grp2.add(rock2);

    // Metallic Golden Clusters
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const oreGeo = new THREE.BoxGeometry(0.65, 0.9, 0.65);
      const ore = new THREE.Mesh(oreGeo, aetheriumMat);
      ore.position.set(Math.cos(angle) * 0.8, 1.6, Math.sin(angle) * 0.8);
      ore.rotation.set(0.3, angle, 0.2);
      grp2.add(ore);
      this.crystalNodes.push(ore);
    }

    const light2 = new THREE.PointLight(0xf59e0b, 0.85, 8);
    light2.position.y = 1.8;
    grp2.add(light2);

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
      dispose: () => {},
    });
  }

  /**
   * 9. Dimensional Gateway (Arch of the Astral Conflux)
   */
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

    // Colossal Gateway Base Dais
    const daisGeo = new THREE.CylinderGeometry(5.2, 5.8, 0.8, 8);
    const dais = new THREE.Mesh(daisGeo, stoneMat);
    dais.position.y = 0.4;
    grp.add(dais);

    // Arch Pillars
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 9.5, 1.6), stoneMat);
    p1.position.set(-3.2, 4.75, 0);
    p1.castShadow = !this.isSoftwareGl;
    grp.add(p1);

    const p2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 9.5, 1.6), stoneMat);
    p2.position.set(3.2, 4.75, 0);
    p2.castShadow = !this.isSoftwareGl;
    grp.add(p2);

    const archTop = new THREE.Mesh(new THREE.BoxGeometry(8.0, 1.6, 2.0), stoneMat);
    archTop.position.set(0, 9.5, 0);
    grp.add(archTop);

    // Swirling Energetic Vortex Plane (Event Horizon)
    const vortexGeo = new THREE.PlaneGeometry(5.2, 8.2);
    const vortexMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    this.gatewayVortexMesh = new THREE.Mesh(vortexGeo, vortexMat);
    this.gatewayVortexMesh.position.set(0, 5.0, 0);
    grp.add(this.gatewayVortexMesh);

    // Orbiting obelisk shards
    for (let i = 0; i < 3; i++) {
      const ringGrp = new THREE.Group();
      ringGrp.position.set(0, 5.0, 0);
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 4), bronzeMat);
      shard.position.set(4.2, 0, 0);
      ringGrp.add(shard);
      ringGrp.rotation.y = (i * Math.PI * 2) / 3;
      grp.add(ringGrp);
      this.beaconRings.push(ringGrp);
    }

    const gateLight = new THREE.PointLight(0x818cf8, 1.6, 16);
    gateLight.position.set(0, 5.0, 0);
    grp.add(gateLight);

    // Colliders for the solid pillars
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
      update: (_dt, totalTime) => {
        if (this.gatewayVortexMesh) {
          (this.gatewayVortexMesh.material as THREE.MeshBasicMaterial).opacity =
            0.65 + Math.sin(totalTime * 3.0) * 0.15;
        }
        this.beaconRings.forEach((r, idx) => {
          r.rotation.y += _dt * (0.8 + idx * 0.3);
        });
      },
      dispose: () => {},
    });
  }

  /**
   * Unlock Sanctum Door with stone grinding animation and collider removal
   */
  public triggerUnlockDoor(): void {
    this.isGateOpening = true;
    this.gateOpenProgress = 0;
    // Remove the door obstacle collider so player can walk through!
    this.colliders = this.colliders.filter(
      (c) => !(c.type === 'box' && Math.abs(c.x - -38) < 1.0 && Math.abs(c.z - 22) < 1.0)
    );
    const struct = this.structures.get('sanctum_arch_gate');
    if (struct) {
      struct.promptText = 'Sanctum Gate Unlocked';
    }
  }

  /**
   * Dissolve the cracked hidden chamber wall
   */
  public triggerDissolveHiddenWall(): void {
    this.isHiddenWallDissolving = true;
    this.hiddenWallProgress = 0;
    // Remove the front wall collider
    this.colliders = this.colliders.filter(
      (c) => !(c.type === 'box' && Math.abs(c.x - -43.5) < 1.0 && Math.abs(c.z - -8) < 1.0)
    );
    const struct = this.structures.get('hidden_chamber');
    if (struct) {
      struct.promptText = 'Press [E] to Inspect Codex of the First Drift';
    }
  }

  /**
   * Main per-frame update loop for structure animations
   */
  public update(dt: number, totalTime: number): void {
    this.structures.forEach((s) => {
      s.update?.(dt, totalTime);
    });
  }

  public dispose(): void {
    this.structures.forEach((s) => s.dispose());
    this.structures.clear();
    this.colliders = [];
  }
}
