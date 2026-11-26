/**
 * Procedural Flora, Plants, and Gathering Nodes Manager for The Drifting Land.
 * - Shares geometries, materials, and additive glow sprites via SharedAssets
 * - Eliminates 12 dynamic PointLights in favor of lightweight glow sprites
 * - Streams node scene attachment by chunk ACTIVE state while keeping metadata & regrowth timers intact
 * - Syncs harvested timestamps with both SaveData and WorldStateStore
 */

import * as THREE from 'three';
import { WeatherType, SaveData } from '../types/game';
import { InventorySystem } from '../systems/inventorySystem';
import { AudioService } from '../services/audio';
import { NotificationSystem } from '../systems/notificationSystem';
import { SharedAssets } from './sharedAssets';
import { WorldStateStore } from '../services/worldStateStore';

export interface FloraNode {
  id: string;
  name: string;
  plantType:
    | 'lumenvine'
    | 'moonbloom'
    | 'emberfern'
    | 'driftroot'
    | 'glassleaf'
    | 'whisper_moss'
    | 'rift_orchid'
    | 'wood_fragment'
    | 'stone_deposit';
  position: [number, number, number];
  yieldItemId: string;
  minYield: number;
  maxYield: number;
  interactionRadius: number;
  respawnTimeSeconds: number;
  group: THREE.Group;
  meshParts: THREE.Object3D[];
  glowSprite?: THREE.Sprite;
  isHarvested: boolean;
  harvestTimestamp: number;
  regrowthProgress: number; // 0 to 1
  requiresNight?: boolean;
  requiresDimensional?: boolean;
  isMounted: boolean;
}

const _tmpVec3 = new THREE.Vector3();

export class FloraManager {
  public group: THREE.Group;
  public nodes: Map<string, FloraNode> = new Map();
  private worldStateStore: WorldStateStore | null = null;
  private regionId = 'verdant_reach';

  constructor(scene: THREE.Scene, _isSoftwareGl = false) {
    this.group = new THREE.Group();
    this.group.name = 'world_flora_and_resources';
    scene.add(this.group);
  }

  /**
   * Populate all harvestable plants, wood fragments, and stone deposits across The Verdant Reach
   */
  public populate(
    getTerrainHeight: (x: number, z: number) => number,
    _inventory: InventorySystem,
    save: SaveData,
    worldStateStore?: WorldStateStore,
    regionId = 'verdant_reach'
  ): void {
    this.clear();
    this.worldStateStore = worldStateStore || null;
    this.regionId = regionId;

    if (regionId !== 'verdant_reach') {
      return;
    }

    const savedHarvests = save.harvestedFlora || {};

    // 1. LUMENVINE
    const lumenvineLocs: [number, number][] = [
      [20, -18],
      [26, 4],
      [10, -32],
      [18, -4],
    ];
    lumenvineLocs.forEach(([x, z], idx) => {
      this.createLumenvineNode(`flora_lumenvine_${idx}`, x, getTerrainHeight(x, z), z, savedHarvests);
    });

    // 2. MOONBLOOM
    const moonbloomLocs: [number, number][] = [
      [-8, 12],
      [-14, -20],
      [16, 16],
    ];
    moonbloomLocs.forEach(([x, z], idx) => {
      this.createMoonbloomNode(`flora_moonbloom_${idx}`, x, getTerrainHeight(x, z), z, savedHarvests);
    });

    // 3. EMBERFERN
    const emberfernLocs: [number, number][] = [
      [34, 18],
      [42, 28],
      [26, 34],
    ];
    emberfernLocs.forEach(([x, z], idx) => {
      this.createEmberfernNode(`flora_emberfern_${idx}`, x, getTerrainHeight(x, z), z, savedHarvests);
    });

    // 4. DRIFTROOT
    const driftrootLocs: [number, number][] = [
      [-36, -26],
      [-44, 12],
      [30, -30],
      [-12, 38],
    ];
    driftrootLocs.forEach(([x, z], idx) => {
      this.createDriftrootNode(`flora_driftroot_${idx}`, x, getTerrainHeight(x, z), z, savedHarvests);
    });

    // 5. GLASSLEAF
    const glassleafLocs: [number, number][] = [
      [-18, 30],
      [-30, 8],
      [40, 10],
    ];
    glassleafLocs.forEach(([x, z], idx) => {
      this.createGlassleafNode(`flora_glassleaf_${idx}`, x, getTerrainHeight(x, z), z, savedHarvests);
    });

    // 6. WHISPER MOSS
    const whisperMossLocs: [number, number][] = [
      [-28, -14],
      [-32, 24],
      [8, -26],
      [4, 30],
    ];
    whisperMossLocs.forEach(([x, z], idx) => {
      this.createWhisperMossNode(`flora_whisper_moss_${idx}`, x, getTerrainHeight(x, z), z, savedHarvests);
    });

    // 7. RIFT ORCHID
    const riftOrchidLocs: [number, number][] = [
      [-46, -18],
      [-52, -26],
    ];
    riftOrchidLocs.forEach(([x, z], idx) => {
      this.createRiftOrchidNode(`flora_rift_orchid_${idx}`, x, getTerrainHeight(x, z), z, savedHarvests);
    });

    // 8. WOOD FRAGMENTS
    const woodLocs: [number, number][] = [
      [-12, 6],
      [6, -14],
      [22, 10],
      [-20, -10],
      [14, 22],
    ];
    woodLocs.forEach(([x, z], idx) => {
      this.createWoodFragmentNode(`resource_wood_${idx}`, x, getTerrainHeight(x, z), z, savedHarvests);
    });

    // 9. BASALT STONES
    const stoneLocs: [number, number][] = [
      [14, -6],
      [-8, -16],
      [4, 18],
      [32, -8],
      [-24, 16],
    ];
    stoneLocs.forEach(([x, z], idx) => {
      this.createStoneDepositNode(`resource_stone_${idx}`, x, getTerrainHeight(x, z), z, savedHarvests);
    });
  }

  private createLumenvineNode(id: string, x: number, y: number, z: number, savedHarvests: Record<string, number>): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    const moundGeo = SharedAssets.getGeometry('flora_lumen_mound', () => new THREE.CylinderGeometry(0.5, 0.7, 0.25, 7));
    const moundMat = SharedAssets.getMaterial('flora_lumen_mound_mat', () => new THREE.MeshStandardMaterial({ color: 0x1e3a2f, roughness: 0.9 }));
    const mound = new THREE.Mesh(moundGeo, moundMat);
    mound.position.y = 0.12;
    grp.add(mound);
    parts.push(mound);

    const arcGeo = SharedAssets.getGeometry('flora_lumen_arc', () => new THREE.TorusGeometry(0.45, 0.08, 6, 12, Math.PI));
    const vineMat = SharedAssets.getMaterial('flora_lumen_vine_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.85, roughness: 0.3 })
    );
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const arc = new THREE.Mesh(arcGeo, vineMat);
      arc.position.set(Math.cos(angle) * 0.25, 0.45, Math.sin(angle) * 0.25);
      arc.rotation.y = angle;
      arc.rotation.z = Math.PI / 6;
      grp.add(arc);
      parts.push(arc);
    }

    const bulbGeo = SharedAssets.getGeometry('flora_lumen_bulb', () => new THREE.SphereGeometry(0.22, 8, 8));
    const bulbMat = SharedAssets.getMaterial('flora_lumen_bulb_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x38bdf8, emissiveIntensity: 1.2, roughness: 0.2 })
    );
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.y = 0.85;
    grp.add(bulb);
    parts.push(bulb);

    const glowSprite = SharedAssets.createGlowSprite(0x38bdf8, 1.9, 0.65);
    glowSprite.position.y = 0.85;
    grp.add(glowSprite);

    this.registerNode(id, 'Lumenvine', 'lumenvine', [x, y, z], 'lumenvine_fiber', 1, 2, 3.2, 45, grp, parts, savedHarvests, glowSprite);
  }

  private createMoonbloomNode(id: string, x: number, y: number, z: number, savedHarvests: Record<string, number>): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    const stemGeo = SharedAssets.getGeometry('flora_moon_stem', () => new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6));
    const stemMat = SharedAssets.getMaterial('flora_moon_stem_mat', () => new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 }));
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.35;
    grp.add(stem);
    parts.push(stem);

    const petalGeo = SharedAssets.getGeometry('flora_moon_petal', () => new THREE.ConeGeometry(0.18, 0.55, 5));
    const petalMat = SharedAssets.getMaterial('flora_moon_petal_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0x94a3b8, emissiveIntensity: 0.6, roughness: 0.3 })
    );
    for (let p = 0; p < 5; p++) {
      const angle = (p * Math.PI * 2) / 5;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(angle) * 0.15, 0.75, Math.sin(angle) * 0.15);
      petal.rotation.x = 0.35;
      petal.rotation.y = angle;
      grp.add(petal);
      parts.push(petal);
    }

    const coreGeo = SharedAssets.getGeometry('flora_moon_core', () => new THREE.SphereGeometry(0.12, 6, 6));
    const coreMat = SharedAssets.getMaterial('flora_moon_core_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.0 })
    );
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.75;
    grp.add(core);
    parts.push(core);

    const glowSprite = SharedAssets.createGlowSprite(0xe2e8f0, 2.0, 0.65);
    glowSprite.position.y = 0.8;
    grp.add(glowSprite);

    this.registerNode(id, 'Moonbloom', 'moonbloom', [x, y, z], 'moonbloom_petal', 1, 2, 3.2, 60, grp, parts, savedHarvests, glowSprite, true, false);
  }

  private createEmberfernNode(id: string, x: number, y: number, z: number, savedHarvests: Record<string, number>): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    const frondGeo = SharedAssets.getGeometry('flora_ember_frond', () => new THREE.ConeGeometry(0.16, 0.85, 4));
    const fernMat = SharedAssets.getMaterial('flora_ember_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xc2410c, emissiveIntensity: 0.75, roughness: 0.4 })
    );
    for (let f = 0; f < 6; f++) {
      const angle = (f * Math.PI * 2) / 6;
      const frond = new THREE.Mesh(frondGeo, fernMat);
      frond.position.set(Math.cos(angle) * 0.25, 0.45, Math.sin(angle) * 0.25);
      frond.rotation.x = 0.45;
      frond.rotation.y = angle;
      grp.add(frond);
      parts.push(frond);
    }

    const emberGeo = SharedAssets.getGeometry('flora_ember_core', () => new THREE.DodecahedronGeometry(0.18, 0));
    const emberMat = SharedAssets.getMaterial('flora_ember_core_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.2 })
    );
    const ember = new THREE.Mesh(emberGeo, emberMat);
    ember.position.y = 0.35;
    grp.add(ember);
    parts.push(ember);

    const glowSprite = SharedAssets.createGlowSprite(0xf97316, 1.8, 0.6);
    glowSprite.position.y = 0.5;
    grp.add(glowSprite);

    this.registerNode(id, 'Emberfern', 'emberfern', [x, y, z], 'emberfern_frond', 1, 3, 3.2, 45, grp, parts, savedHarvests, glowSprite);
  }

  private createDriftrootNode(id: string, x: number, y: number, z: number, savedHarvests: Record<string, number>): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    const rootGeo = SharedAssets.getGeometry('flora_driftroot_cyl', () => new THREE.CylinderGeometry(0.14, 0.22, 1.1, 6));
    const barkMat = SharedAssets.getMaterial('flora_driftroot_bark', () => new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.95 }));
    for (let r = 0; r < 3; r++) {
      const angle = (r * Math.PI * 2) / 3;
      const root = new THREE.Mesh(rootGeo, barkMat);
      root.position.set(Math.cos(angle) * 0.3, 0.4, Math.sin(angle) * 0.3);
      root.rotation.z = 0.35 * Math.cos(angle);
      root.rotation.x = 0.35 * Math.sin(angle);
      grp.add(root);
      parts.push(root);
    }

    const mossGeo = SharedAssets.getGeometry('flora_driftroot_moss', () => new THREE.DodecahedronGeometry(0.35, 0));
    const mossMat = SharedAssets.getMaterial('flora_driftroot_moss_mat', () => new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 }));
    const moss = new THREE.Mesh(mossGeo, mossMat);
    moss.position.y = 0.8;
    grp.add(moss);
    parts.push(moss);

    this.registerNode(id, 'Driftroot', 'driftroot', [x, y, z], 'driftwood_branch', 2, 3, 3.2, 50, grp, parts, savedHarvests);
  }

  private createGlassleafNode(id: string, x: number, y: number, z: number, savedHarvests: Record<string, number>): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    const leafGeo = SharedAssets.getGeometry('flora_glass_leaf', () => new THREE.ConeGeometry(0.16, 0.75, 4));
    const crystalMat = SharedAssets.getMaterial('flora_glass_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0xa5f3fc,
        emissive: 0x0891b2,
        emissiveIntensity: 0.5,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.85,
      })
    );
    for (let c = 0; c < 5; c++) {
      const angle = (c * Math.PI * 2) / 5;
      const leaf = new THREE.Mesh(leafGeo, crystalMat);
      leaf.position.set(Math.cos(angle) * 0.22, 0.4, Math.sin(angle) * 0.22);
      leaf.rotation.x = 0.3;
      leaf.rotation.y = angle;
      grp.add(leaf);
      parts.push(leaf);
    }

    this.registerNode(id, 'Glassleaf', 'glassleaf', [x, y, z], 'glassleaf_shard', 1, 2, 3.2, 60, grp, parts, savedHarvests);
  }

  private createWhisperMossNode(id: string, x: number, y: number, z: number, savedHarvests: Record<string, number>): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    const rockGeo = SharedAssets.getGeometry('flora_wmoss_rock', () => new THREE.DodecahedronGeometry(0.65, 0));
    const rockMat = SharedAssets.getMaterial('flora_wmoss_rock_mat', () => new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 }));
    const patchGeo = SharedAssets.getGeometry('flora_wmoss_patch', () => new THREE.SphereGeometry(0.28, 6, 6));
    const mossMat = SharedAssets.getMaterial('flora_wmoss_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x047857, emissiveIntensity: 0.35, roughness: 0.85 })
    );

    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.y = 0.35;
    grp.add(rock);
    parts.push(rock);

    for (let m = 0; m < 3; m++) {
      const patch = new THREE.Mesh(patchGeo, mossMat);
      patch.position.set(0.2 * (m - 1), 0.7, 0.15 * ((m % 2) * 2 - 1));
      grp.add(patch);
      parts.push(patch);
    }

    this.registerNode(id, 'Whisper Moss', 'whisper_moss', [x, y, z], 'whisper_moss_clump', 2, 3, 3.2, 40, grp, parts, savedHarvests);
  }

  private createRiftOrchidNode(id: string, x: number, y: number, z: number, savedHarvests: Record<string, number>): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    const stemGeo = SharedAssets.getGeometry('flora_orchid_stem', () => new THREE.CylinderGeometry(0.08, 0.1, 0.9, 6));
    const stemMat = SharedAssets.getMaterial('flora_orchid_stem_mat', () => new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 }));
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.45;
    grp.add(stem);
    parts.push(stem);

    const petalGeo = SharedAssets.getGeometry('flora_orchid_petal', () => new THREE.ConeGeometry(0.25, 0.8, 5));
    const petalMat = SharedAssets.getMaterial('flora_orchid_petal_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0x7c3aed, emissive: 0x9333ea, emissiveIntensity: 0.85, roughness: 0.25 })
    );
    for (let r = 0; r < 4; r++) {
      const angle = (r * Math.PI) / 2;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(angle) * 0.2, 0.95, Math.sin(angle) * 0.2);
      petal.rotation.x = 0.5;
      petal.rotation.y = angle;
      grp.add(petal);
      parts.push(petal);
    }

    const coreGeo = SharedAssets.getGeometry('flora_orchid_core', () => new THREE.OctahedronGeometry(0.18, 0));
    const coreMat = SharedAssets.getMaterial('flora_orchid_core_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xdb2777, emissiveIntensity: 1.3 })
    );
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.95;
    grp.add(core);
    parts.push(core);

    const glowSprite = SharedAssets.createGlowSprite(0xa855f7, 2.3, 0.72);
    glowSprite.position.y = 1.0;
    grp.add(glowSprite);

    this.registerNode(id, 'Rift Orchid', 'rift_orchid', [x, y, z], 'rift_orchid_blossom', 1, 2, 3.4, 90, grp, parts, savedHarvests, glowSprite, false, true);
  }

  private createWoodFragmentNode(id: string, x: number, y: number, z: number, savedHarvests: Record<string, number>): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    const branchGeo = SharedAssets.getGeometry('flora_wood_branch', () => {
      const g = new THREE.CylinderGeometry(0.08, 0.12, 1.2, 5);
      g.rotateZ(Math.PI / 2.2);
      return g;
    });
    const woodMat = SharedAssets.getMaterial('flora_wood_mat', () => new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }));
    for (let b = 0; b < 2; b++) {
      const branch = new THREE.Mesh(branchGeo, woodMat);
      branch.position.set(b * 0.25, 0.08, b * 0.15);
      branch.rotation.y = b * 0.8;
      grp.add(branch);
      parts.push(branch);
    }

    this.registerNode(id, 'Wood Fragments', 'wood_fragment', [x, y, z], 'driftwood_branch', 1, 2, 2.8, 35, grp, parts, savedHarvests);
  }

  private createStoneDepositNode(id: string, x: number, y: number, z: number, savedHarvests: Record<string, number>): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    const pebbleGeo = SharedAssets.getGeometry('flora_stone_pebble', () => new THREE.DodecahedronGeometry(0.22, 0));
    const stoneMat = SharedAssets.getMaterial('flora_stone_mat', () => new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 }));
    for (let s = 0; s < 3; s++) {
      const pebble = new THREE.Mesh(pebbleGeo, stoneMat);
      const scale = 0.82 + s * 0.18;
      pebble.scale.setScalar(scale);
      pebble.position.set((s - 1) * 0.22, 0.1, (s % 2) * 0.15);
      pebble.rotation.set(s * 0.3, s * 0.5, 0);
      grp.add(pebble);
      parts.push(pebble);
    }

    this.registerNode(id, 'Basalt Pebbles', 'stone_deposit', [x, y, z], 'basalt_pebble', 1, 3, 2.8, 35, grp, parts, savedHarvests);
  }

  private registerNode(
    id: string,
    name: string,
    plantType: FloraNode['plantType'],
    position: [number, number, number],
    yieldItemId: string,
    minYield: number,
    maxYield: number,
    interactionRadius: number,
    respawnTimeSeconds: number,
    group: THREE.Group,
    meshParts: THREE.Object3D[],
    savedHarvests: Record<string, number>,
    glowSprite?: THREE.Sprite,
    requiresNight = false,
    requiresDimensional = false
  ): void {
    const storeHarvest = this.worldStateStore?.getFloraHarvestTimestamp(this.regionId, position[0], position[2], id) || 0;
    const lastHarvest = Math.max(savedHarvests[id] || 0, storeHarvest);
    const now = Date.now();
    const isHarvested = lastHarvest > 0 && now - lastHarvest < respawnTimeSeconds * 1000;

    const node: FloraNode = {
      id,
      name,
      plantType,
      position,
      yieldItemId,
      minYield,
      maxYield,
      interactionRadius,
      respawnTimeSeconds,
      group,
      meshParts,
      glowSprite,
      isHarvested,
      harvestTimestamp: lastHarvest,
      regrowthProgress: isHarvested ? 0 : 1,
      requiresNight,
      requiresDimensional,
      isMounted: false,
    };

    if (isHarvested) {
      group.scale.set(0.01, 0.01, 0.01);
      if (glowSprite) glowSprite.visible = false;
    }

    this.nodes.set(id, node);
  }

  /**
   * Stream node visibility/mounting based on chunk ACTIVE state
   */
  public syncStreaming(isPositionActive: (x: number, z: number) => boolean): void {
    const now = Date.now();
    this.nodes.forEach((node) => {
      const shouldMount = isPositionActive(node.position[0], node.position[2]);
      if (shouldMount && !node.isMounted) {
        // Reconcile regrowth before attaching
        if (node.isHarvested && now - node.harvestTimestamp >= node.respawnTimeSeconds * 1000) {
          node.isHarvested = false;
          node.regrowthProgress = 1.0;
          node.group.scale.set(1, 1, 1);
          if (node.glowSprite) node.glowSprite.visible = true;
          this.worldStateStore?.clearFloraHarvested(this.regionId, node.position[0], node.position[2], node.id);
        }
        this.group.add(node.group);
        node.isMounted = true;
      } else if (!shouldMount && node.isMounted) {
        this.group.remove(node.group);
        node.isMounted = false;
      }
    });
  }

  /**
   * Find nearest available harvestable node (zero per-frame Vector3 allocations)
   */
  public getNearbyHarvestable(
    playerPos: THREE.Vector3,
    isNight: boolean,
    isRedMoon: boolean,
    weather: WeatherType
  ): { node: FloraNode; prompt: string; canHarvest: boolean } | null {
    let nearest: FloraNode | null = null;
    let minDist = Infinity;

    this.nodes.forEach((node) => {
      _tmpVec3.set(node.position[0], node.position[1], node.position[2]);
      const dist = playerPos.distanceTo(_tmpVec3);

      if (dist <= node.interactionRadius && dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    });

    if (!nearest) return null;

    const n = nearest as FloraNode;

    if (n.isHarvested) {
      const remainingSec = Math.ceil((n.respawnTimeSeconds * 1000 - (Date.now() - n.harvestTimestamp)) / 1000);
      return {
        node: n,
        prompt: `${n.name} (Regrowing... ${Math.max(1, remainingSec)}s)`,
        canHarvest: false,
      };
    }

    if (n.requiresNight && !isNight && !isRedMoon) {
      return {
        node: n,
        prompt: `${n.name} (Dormant - Blooms only at Night)`,
        canHarvest: false,
      };
    }

    if (n.requiresDimensional && !isRedMoon && weather !== 'DIMENSIONAL_DISTURBANCE') {
      return {
        node: n,
        prompt: `${n.name} (Dormant - Awoke by Dimensional Fracture or Red Moon)`,
        canHarvest: false,
      };
    }

    return {
      node: n,
      prompt: `Press [E] or Action to Gather ${n.name}`,
      canHarvest: true,
    };
  }

  public harvestNode(nodeId: string, inventory: InventorySystem, save: SaveData): boolean {
    const node = this.nodes.get(nodeId);
    if (!node || node.isHarvested) return false;

    const rankBonus = save.explorationRank && save.explorationRank >= 4 ? 1 : 0;
    const qty = Math.floor(Math.random() * (node.maxYield - node.minYield + 1)) + node.minYield + rankBonus;
    inventory.addItem(node.yieldItemId, qty);

    AudioService.playRelicCollect();

    node.isHarvested = true;
    node.harvestTimestamp = Date.now();
    node.regrowthProgress = 0;

    if (!save.harvestedFlora) save.harvestedFlora = {};
    save.harvestedFlora[node.id] = node.harvestTimestamp;
    this.worldStateStore?.setFloraHarvested(this.regionId, node.position[0], node.position[2], node.id, node.harvestTimestamp);

    node.group.scale.set(0.1, 0.1, 0.1);
    if (node.glowSprite) node.glowSprite.visible = false;

    NotificationSystem.notify('Resource Gathered', `Gathered ${qty}x ${node.name}`, 'item', 3500);
    return true;
  }

  public update(dt: number, totalTime: number, isNight: boolean, isRedMoon: boolean): void {
    const now = Date.now();

    this.nodes.forEach((node) => {
      if (node.isHarvested) {
        const elapsedMs = now - node.harvestTimestamp;
        const totalMs = node.respawnTimeSeconds * 1000;

        if (elapsedMs >= totalMs) {
          node.isHarvested = false;
          node.regrowthProgress = 1.0;
          node.group.scale.set(1.0, 1.0, 1.0);
          if (node.glowSprite) node.glowSprite.visible = true;
          this.worldStateStore?.clearFloraHarvested(this.regionId, node.position[0], node.position[2], node.id);
        } else if (node.isMounted) {
          const remain = totalMs - elapsedMs;
          if (remain < 5000) {
            const growFrac = Math.max(0.1, 1.0 - remain / 5000);
            node.group.scale.set(growFrac, growFrac, growFrac);
          }
        }
        return;
      }

      if (!node.isMounted) return;

      const pulse = 1.0 + Math.sin(totalTime * 2.0 + node.position[0]) * 0.04;
      node.group.scale.set(pulse, pulse, pulse);

      if (node.requiresNight) {
        const isOpen = isNight || isRedMoon;
        const targetY = isOpen ? 1.0 : 0.25;
        node.group.scale.y = THREE.MathUtils.lerp(node.group.scale.y, targetY, dt * 2.0);
        if (node.glowSprite) {
          node.glowSprite.visible = isOpen;
        }
      }
    });
  }

  public clear(): void {
    this.nodes.forEach((node) => {
      if (node.isMounted) {
        this.group.remove(node.group);
      }
      SharedAssets.disposeObject3DSafe(node.group);
    });
    this.nodes.clear();
  }

  public dispose(): void {
    this.clear();
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
