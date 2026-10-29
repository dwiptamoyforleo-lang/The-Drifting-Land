/**
 * Procedural Flora, Plants, and Gathering Nodes Manager for The Drifting Land.
 * Implements Prompt 7:
 * - 7 Original Plants: Lumenvine, Moonbloom, Emberfern, Driftroot, Glassleaf, Whisper Moss, Rift Orchid
 * - Natural Wood Fragments and Basalt River Stones
 * - Dynamic blooming states conditioned by Night, Weather, and Dimensional Events
 * - Tangible 3D procedural meshes (3-8 parts) with harvest animations & regrowth cycles
 */

import * as THREE from 'three';
import { WeatherType, SaveData } from '../types/game';
import { InventorySystem } from '../systems/inventorySystem';
import { AudioService } from '../services/audio';
import { NotificationSystem } from './../systems/notificationSystem';

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
  light?: THREE.PointLight;
  isHarvested: boolean;
  harvestTimestamp: number;
  regrowthProgress: number; // 0 to 1
  requiresNight?: boolean;
  requiresDimensional?: boolean;
}

export class FloraManager {
  public group: THREE.Group;
  public nodes: Map<string, FloraNode> = new Map();
  private isSoftwareGl: boolean;

  constructor(scene: THREE.Scene, isSoftwareGl = false) {
    this.group = new THREE.Group();
    this.group.name = 'world_flora_and_resources';
    this.isSoftwareGl = isSoftwareGl;
    scene.add(this.group);
  }

  /**
   * Populate all harvestable plants, wood fragments, and stone deposits across The Verdant Reach
   */
  public populate(
    getTerrainHeight: (x: number, z: number) => number,
    inventory: InventorySystem,
    save: SaveData
  ): void {
    const savedHarvests = save.harvestedFlora || {};

    // 1. LUMENVINE (Bioluminescent azure vines near water & shaded crags)
    const lumenvineLocs: [number, number][] = [
      [20, -18],
      [26, 4],
      [10, -32],
      [18, -4],
    ];
    lumenvineLocs.forEach(([x, z], idx) => {
      const y = getTerrainHeight(x, z);
      this.createLumenvineNode(`flora_lumenvine_${idx}`, x, y, z, savedHarvests);
    });

    // 2. MOONBLOOM (Nocturnal silver-white flower; blooms only at night)
    const moonbloomLocs: [number, number][] = [
      [-8, 12],
      [-14, -20],
      [16, 16],
    ];
    moonbloomLocs.forEach(([x, z], idx) => {
      const y = getTerrainHeight(x, z);
      this.createMoonbloomNode(`flora_moonbloom_${idx}`, x, y, z, savedHarvests);
    });

    // 3. EMBERFERN (Warm crimson-orange fern on sunward promontory rocks)
    const emberfernLocs: [number, number][] = [
      [34, 18],
      [42, 28],
      [26, 34],
    ];
    emberfernLocs.forEach(([x, z], idx) => {
      const y = getTerrainHeight(x, z);
      this.createEmberfernNode(`flora_emberfern_${idx}`, x, y, z, savedHarvests);
    });

    // 4. DRIFTROOT (Gnarled ancient woody roots near island perimeter)
    const driftrootLocs: [number, number][] = [
      [-36, -26],
      [-44, 12],
      [30, -30],
      [-12, 38],
    ];
    driftrootLocs.forEach(([x, z], idx) => {
      const y = getTerrainHeight(x, z);
      this.createDriftrootNode(`flora_driftroot_${idx}`, x, y, z, savedHarvests);
    });

    // 5. GLASSLEAF (Prismatic translucent crystal succulents)
    const glassleafLocs: [number, number][] = [
      [-18, 30],
      [-30, 8],
      [40, 10],
    ];
    glassleafLocs.forEach(([x, z], idx) => {
      const y = getTerrainHeight(x, z);
      this.createGlassleafNode(`flora_glassleaf_${idx}`, x, y, z, savedHarvests);
    });

    // 6. WHISPER MOSS (Velvety damp cyan-green moss on shaded boulders)
    const whisperMossLocs: [number, number][] = [
      [-28, -14],
      [-32, 24],
      [8, -26],
      [4, 30],
    ];
    whisperMossLocs.forEach(([x, z], idx) => {
      const y = getTerrainHeight(x, z);
      this.createWhisperMossNode(`flora_whisper_moss_${idx}`, x, y, z, savedHarvests);
    });

    // 7. RIFT ORCHID (Deep violet-crimson orchid near western void rift)
    const riftOrchidLocs: [number, number][] = [
      [-46, -18],
      [-52, -26],
    ];
    riftOrchidLocs.forEach(([x, z], idx) => {
      const y = getTerrainHeight(x, z);
      this.createRiftOrchidNode(`flora_rift_orchid_${idx}`, x, y, z, savedHarvests);
    });

    // 8. WOOD FRAGMENTS (Fallen driftwood branches lying along trails)
    const woodLocs: [number, number][] = [
      [-12, 6],
      [6, -14],
      [22, 10],
      [-20, -10],
      [14, 22],
    ];
    woodLocs.forEach(([x, z], idx) => {
      const y = getTerrainHeight(x, z);
      this.createWoodFragmentNode(`resource_wood_${idx}`, x, y, z, savedHarvests);
    });

    // 9. BASALT STONES (Smooth volcanic river pebbles)
    const stoneLocs: [number, number][] = [
      [14, -6],
      [-8, -16],
      [4, 18],
      [32, -8],
      [-24, 16],
    ];
    stoneLocs.forEach(([x, z], idx) => {
      const y = getTerrainHeight(x, z);
      this.createStoneDepositNode(`resource_stone_${idx}`, x, y, z, savedHarvests);
    });
  }

  // --- Plant Node Generators (3-8 parts each) ---

  private createLumenvineNode(
    id: string,
    x: number,
    y: number,
    z: number,
    savedHarvests: Record<string, number>
  ): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);

    const parts: THREE.Object3D[] = [];

    // Central mossy base mound
    const moundGeo = new THREE.CylinderGeometry(0.5, 0.7, 0.25, 7);
    const moundMat = new THREE.MeshStandardMaterial({ color: 0x1e3a2f, roughness: 0.9 });
    const mound = new THREE.Mesh(moundGeo, moundMat);
    mound.position.y = 0.12;
    grp.add(mound);
    parts.push(mound);

    // Twisted glowing vines (4 braided torus/cylinder arches)
    const vineMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    });

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const arcGeo = new THREE.TorusGeometry(0.45, 0.08, 6, 12, Math.PI);
      const arc = new THREE.Mesh(arcGeo, vineMat);
      arc.position.set(Math.cos(angle) * 0.25, 0.45, Math.sin(angle) * 0.25);
      arc.rotation.y = angle;
      arc.rotation.z = Math.PI / 6;
      grp.add(arc);
      parts.push(arc);
    }

    // Glowing bud bulb
    const bulbGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.y = 0.85;
    grp.add(bulb);
    parts.push(bulb);

    const light = new THREE.PointLight(0x38bdf8, 0.8, 5);
    light.position.y = 0.85;
    grp.add(light);

    this.registerNode(
      id,
      'Lumenvine',
      'lumenvine',
      [x, y, z],
      'lumenvine_fiber',
      1,
      2,
      3.2,
      45,
      grp,
      parts,
      savedHarvests,
      light
    );
  }

  private createMoonbloomNode(
    id: string,
    x: number,
    y: number,
    z: number,
    savedHarvests: Record<string, number>
  ): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.35;
    grp.add(stem);
    parts.push(stem);

    // Silver luminescent petals (5 layered cones/ovals)
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0x94a3b8,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });

    for (let p = 0; p < 5; p++) {
      const angle = (p * Math.PI * 2) / 5;
      const petalGeo = new THREE.ConeGeometry(0.18, 0.55, 5);
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(angle) * 0.15, 0.75, Math.sin(angle) * 0.15);
      petal.rotation.x = 0.35;
      petal.rotation.y = angle;
      grp.add(petal);
      parts.push(petal);
    }

    // Glowing core stamen
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.0,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), coreMat);
    core.position.y = 0.75;
    grp.add(core);
    parts.push(core);

    const light = new THREE.PointLight(0xe2e8f0, 0.9, 6);
    light.position.y = 0.8;
    grp.add(light);

    this.registerNode(
      id,
      'Moonbloom',
      'moonbloom',
      [x, y, z],
      'moonbloom_petal',
      1,
      2,
      3.2,
      60,
      grp,
      parts,
      savedHarvests,
      light,
      true, // requires night
      false
    );
  }

  private createEmberfernNode(
    id: string,
    x: number,
    y: number,
    z: number,
    savedHarvests: Record<string, number>
  ): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    const fernMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xc2410c,
      emissiveIntensity: 0.75,
      roughness: 0.4,
    });

    // 6 Radiating warm fronds
    for (let f = 0; f < 6; f++) {
      const angle = (f * Math.PI * 2) / 6;
      const frondGeo = new THREE.ConeGeometry(0.16, 0.85, 4);
      const frond = new THREE.Mesh(frondGeo, fernMat);
      frond.position.set(Math.cos(angle) * 0.25, 0.45, Math.sin(angle) * 0.25);
      frond.rotation.x = 0.45;
      frond.rotation.y = angle;
      grp.add(frond);
      parts.push(frond);
    }

    // Central Ember Node
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.2,
    });
    const ember = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), emberMat);
    ember.position.y = 0.35;
    grp.add(ember);
    parts.push(ember);

    const light = new THREE.PointLight(0xf97316, 0.75, 5);
    light.position.y = 0.5;
    grp.add(light);

    this.registerNode(
      id,
      'Emberfern',
      'emberfern',
      [x, y, z],
      'emberfern_frond',
      1,
      3,
      3.2,
      45,
      grp,
      parts,
      savedHarvests,
      light
    );
  }

  private createDriftrootNode(
    id: string,
    x: number,
    y: number,
    z: number,
    savedHarvests: Record<string, number>
  ): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    const barkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.95 });

    // Gnarled root cluster (3 interconnected curved cylinders)
    for (let r = 0; r < 3; r++) {
      const angle = (r * Math.PI * 2) / 3;
      const rootGeo = new THREE.CylinderGeometry(0.14, 0.22, 1.1, 6);
      const root = new THREE.Mesh(rootGeo, barkMat);
      root.position.set(Math.cos(angle) * 0.3, 0.4, Math.sin(angle) * 0.3);
      root.rotation.z = 0.35 * Math.cos(angle);
      root.rotation.x = 0.35 * Math.sin(angle);
      grp.add(root);
      parts.push(root);
    }

    // Moss accent patch on root crest
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });
    const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), mossMat);
    moss.position.y = 0.8;
    grp.add(moss);
    parts.push(moss);

    this.registerNode(
      id,
      'Driftroot',
      'driftroot',
      [x, y, z],
      'driftwood_branch',
      2,
      3,
      3.2,
      50,
      grp,
      parts,
      savedHarvests
    );
  }

  private createGlassleafNode(
    id: string,
    x: number,
    y: number,
    z: number,
    savedHarvests: Record<string, number>
  ): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      emissive: 0x0891b2,
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.85,
    });

    // 5 Prismatic crystalline succulent petals
    for (let c = 0; c < 5; c++) {
      const angle = (c * Math.PI * 2) / 5;
      const leafGeo = new THREE.ConeGeometry(0.16, 0.75, 4);
      const leaf = new THREE.Mesh(leafGeo, crystalMat);
      leaf.position.set(Math.cos(angle) * 0.22, 0.4, Math.sin(angle) * 0.22);
      leaf.rotation.x = 0.3;
      leaf.rotation.y = angle;
      grp.add(leaf);
      parts.push(leaf);
    }

    this.registerNode(
      id,
      'Glassleaf',
      'glassleaf',
      [x, y, z],
      'glassleaf_shard',
      1,
      2,
      3.2,
      60,
      grp,
      parts,
      savedHarvests
    );
  }

  private createWhisperMossNode(
    id: string,
    x: number,
    y: number,
    z: number,
    savedHarvests: Record<string, number>
  ): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const mossMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x047857,
      emissiveIntensity: 0.35,
      roughness: 0.85,
    });

    // Host stone
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), rockMat);
    rock.position.y = 0.35;
    grp.add(rock);
    parts.push(rock);

    // 3 Moss velvet patches
    for (let m = 0; m < 3; m++) {
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), mossMat);
      patch.position.set(0.2 * (m - 1), 0.7, 0.15 * ((m % 2) * 2 - 1));
      grp.add(patch);
      parts.push(patch);
    }

    this.registerNode(
      id,
      'Whisper Moss',
      'whisper_moss',
      [x, y, z],
      'whisper_moss_clump',
      2,
      3,
      3.2,
      40,
      grp,
      parts,
      savedHarvests
    );
  }

  private createRiftOrchidNode(
    id: string,
    x: number,
    y: number,
    z: number,
    savedHarvests: Record<string, number>
  ): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    // Dark obsidian stem
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 6), stemMat);
    stem.position.y = 0.45;
    grp.add(stem);
    parts.push(stem);

    // Deep violet-crimson petals
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0x7c3aed,
      emissive: 0x9333ea,
      emissiveIntensity: 0.85,
      roughness: 0.25,
    });

    for (let r = 0; r < 4; r++) {
      const angle = (r * Math.PI) / 2;
      const petalGeo = new THREE.ConeGeometry(0.25, 0.8, 5);
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(angle) * 0.2, 0.95, Math.sin(angle) * 0.2);
      petal.rotation.x = 0.5;
      petal.rotation.y = angle;
      grp.add(petal);
      parts.push(petal);
    }

    // Void core spark
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      emissive: 0xdb2777,
      emissiveIntensity: 1.3,
    });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), coreMat);
    core.position.y = 0.95;
    grp.add(core);
    parts.push(core);

    const light = new THREE.PointLight(0xa855f7, 1.2, 8);
    light.position.y = 1.0;
    grp.add(light);

    this.registerNode(
      id,
      'Rift Orchid',
      'rift_orchid',
      [x, y, z],
      'rift_orchid_blossom',
      1,
      2,
      3.4,
      90,
      grp,
      parts,
      savedHarvests,
      light,
      false,
      true // requires dimensional disturbance or red moon
    );
  }

  private createWoodFragmentNode(
    id: string,
    x: number,
    y: number,
    z: number,
    savedHarvests: Record<string, number>
  ): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    for (let b = 0; b < 2; b++) {
      const branchGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.2, 5);
      branchGeo.rotateZ(Math.PI / 2.2);
      const branch = new THREE.Mesh(branchGeo, woodMat);
      branch.position.set(b * 0.25, 0.08, b * 0.15);
      branch.rotation.y = b * 0.8;
      grp.add(branch);
      parts.push(branch);
    }

    this.registerNode(
      id,
      'Wood Fragments',
      'wood_fragment',
      [x, y, z],
      'driftwood_branch',
      1,
      2,
      2.8,
      35,
      grp,
      parts,
      savedHarvests
    );
  }

  private createStoneDepositNode(
    id: string,
    x: number,
    y: number,
    z: number,
    savedHarvests: Record<string, number>
  ): void {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    const parts: THREE.Object3D[] = [];

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    for (let s = 0; s < 3; s++) {
      const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + s * 0.04, 0), stoneMat);
      pebble.position.set((s - 1) * 0.22, 0.1, (s % 2) * 0.15);
      pebble.rotation.set(s * 0.3, s * 0.5, 0);
      grp.add(pebble);
      parts.push(pebble);
    }

    this.registerNode(
      id,
      'Basalt Pebbles',
      'stone_deposit',
      [x, y, z],
      'basalt_pebble',
      1,
      3,
      2.8,
      35,
      grp,
      parts,
      savedHarvests
    );
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
    light?: THREE.PointLight,
    requiresNight = false,
    requiresDimensional = false
  ): void {
    const lastHarvest = savedHarvests[id] || 0;
    const now = Date.now();
    const isHarvested = now - lastHarvest < respawnTimeSeconds * 1000;

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
      light,
      isHarvested,
      harvestTimestamp: lastHarvest,
      regrowthProgress: isHarvested ? 0 : 1,
      requiresNight,
      requiresDimensional,
    };

    if (isHarvested) {
      group.scale.set(0.01, 0.01, 0.01);
      if (light) light.intensity = 0;
    }

    this.nodes.set(id, node);
    this.group.add(group);
  }

  /**
   * Find nearest available harvestable node
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
      const pos = new THREE.Vector3(...node.position);
      const dist = playerPos.distanceTo(pos);

      if (dist <= node.interactionRadius && dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    });

    if (!nearest) return null;

    const n = nearest as FloraNode;

    // Check if node is on cooldown
    if (n.isHarvested) {
      const remainingSec = Math.ceil((n.respawnTimeSeconds * 1000 - (Date.now() - n.harvestTimestamp)) / 1000);
      return {
        node: n,
        prompt: `${n.name} (Regrowing... ${Math.max(1, remainingSec)}s)`,
        canHarvest: false,
      };
    }

    // Check night requirement for Moonbloom
    if (n.requiresNight && !isNight && !isRedMoon) {
      return {
        node: n,
        prompt: `${n.name} (Dormant - Blooms only at Night)`,
        canHarvest: false,
      };
    }

    // Check dimensional disturbance requirement for Rift Orchid
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

  /**
   * Harvest a flora/resource node
   */
  public harvestNode(
    nodeId: string,
    inventory: InventorySystem,
    save: SaveData
  ): boolean {
    const node = this.nodes.get(nodeId);
    if (!node || node.isHarvested) return false;

    // Award items
    const rankBonus = (save.explorationRank && save.explorationRank >= 4) ? 1 : 0;
    const qty = Math.floor(Math.random() * (node.maxYield - node.minYield + 1)) + node.minYield + rankBonus;
    inventory.addItem(node.yieldItemId, qty);

    // Audio & Visual State Change
    AudioService.playRelicCollect();

    node.isHarvested = true;
    node.harvestTimestamp = Date.now();
    node.regrowthProgress = 0;

    // Save harvest timestamp
    if (!save.harvestedFlora) save.harvestedFlora = {};
    save.harvestedFlora[node.id] = node.harvestTimestamp;

    // Animate shrinkage
    node.group.scale.set(0.1, 0.1, 0.1);
    if (node.light) node.light.intensity = 0;

    NotificationSystem.notify(
      'Resource Gathered',
      `Gathered ${qty}x ${node.name}`,
      'item',
      3500
    );

    return true;
  }

  /**
   * Per-frame update for plant ambient breathing and regrowth animations
   */
  public update(dt: number, totalTime: number, isNight: boolean, isRedMoon: boolean): void {
    const now = Date.now();

    this.nodes.forEach((node) => {
      // Regrowth cycle
      if (node.isHarvested) {
        const elapsedMs = now - node.harvestTimestamp;
        const totalMs = node.respawnTimeSeconds * 1000;

        if (elapsedMs >= totalMs) {
          // Node regrown!
          node.isHarvested = false;
          node.regrowthProgress = 1.0;
          node.group.scale.set(1.0, 1.0, 1.0);
          if (node.light) node.light.intensity = 0.8;
        } else {
          // Smooth regrowth scaling in last 5 seconds of cooldown
          const remain = totalMs - elapsedMs;
          if (remain < 5000) {
            const growFrac = 1.0 - remain / 5000;
            node.group.scale.set(growFrac, growFrac, growFrac);
          }
        }
      } else {
        // Ambient subtle breathing
        const pulse = 1.0 + Math.sin(totalTime * 2.0 + node.position[0]) * 0.04;
        node.group.scale.set(pulse, pulse, pulse);

        // Nighttime moonbloom petal unfurl
        if (node.requiresNight) {
          const isOpen = isNight || isRedMoon;
          const targetY = isOpen ? 1.0 : 0.25;
          node.group.scale.y = THREE.MathUtils.lerp(node.group.scale.y, targetY, dt * 2.0);
          if (node.light) {
            node.light.intensity = isOpen ? 0.9 : 0.0;
          }
        }
      }
    });
  }

  public dispose(): void {
    this.nodes.clear();
  }
}
