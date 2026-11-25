/**
 * Spatial Chunk Streaming, Hysteresis, Time-Budgeted Build Queue,
 * Frustum Culling, LRU Cache, and Deterministic Seeded Instanced Props
 * for The Drifting Land.
 */

import * as THREE from 'three';
import { ChunkState } from '../types/game';
import {
  CHUNK_SIZE,
  createSeededRng,
  hashChunkSeed,
} from '../services/worldStateStore';
import { QualityConfig } from './performanceGovernor';
import { SharedAssets } from './sharedAssets';
import { TextureGenerator } from './textures';

interface ChunkEntry {
  cx: number;
  cz: number;
  key: string;
  centerX: number;
  centerZ: number;
  state: ChunkState;
  visible: boolean;
  activeGroup: THREE.Group | null;
  nearGroup: THREE.Group | null;
  bounds: THREE.Box3;
  builtDensity: number;
}

interface BuildTask {
  chunk: ChunkEntry;
  targetState: 'ACTIVE' | 'NEAR';
  distSq: number;
}

interface CachedChunkGroup {
  cacheKey: string;
  group: THREE.Group;
}

const _projScreenMatrix = new THREE.Matrix4();
const _frustum = new THREE.Frustum();
const _dummy = new THREE.Object3D();

// Keepout circles [x, z, radius] so seeded props never overlap landmarks/structures/portals
const VERDANT_EXCLUSIONS: [number, number, number][] = [
  [0, 0, 12],      // Monolith Beacon Plaza
  [-22, -35, 13],  // Abandoned Settlement
  [12, 28, 8],     // Research Camp
  [38, 25, 10],    // Ruined Watchtower & Promontory Beacon
  [-34, 18, 7],    // Sanctum Beacon
  [24, -10, 8],    // Suspended Bridge
  [-38, 22, 7],    // Locked Sanctum Gate
  [-48, -8, 9],    // Hidden Chamber
  [-50, -20, 10],  // Dimensional Gateway
  [-16, 32, 5],    // Lumicite Deposit
  [-28, 6, 5],     // Aetherium Deposit
  [-52, -45, 14],  // Shattered Rift Crater
  [-36, 28, 9],    // Rootbound Guardian Arena
  [-25, -50, 9],   // Ash Colossus Arena
  [46, 24, 9],     // Storm Sentinel Arena
  [-56, -20, 9],   // Rift Sovereign Arena
];

export class ChunkManager {
  public group: THREE.Group;
  private regionId: string;
  private worldSeed: number;
  private getTerrainHeight: (x: number, z: number) => number;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private chunks: Map<string, ChunkEntry> = new Map();
  private lruCache: CachedChunkGroup[] = [];
  private readonly MAX_LRU_CACHE = 8;
  private buildQueue: BuildTask[] = [];

  private terrainMat: THREE.MeshStandardMaterial;
  private lastDensityBucket = -1;
  private activeCount = 0;
  private nearCount = 0;
  private unloadedCount = 0;

  public onChunkStateChange?: (cx: number, cz: number, nextState: ChunkState, prevState: ChunkState) => void;

  constructor(
    scene: THREE.Scene,
    regionId: string,
    worldSeed: number,
    getTerrainHeight: (x: number, z: number) => number,
    maxAnisotropy: number,
    isSoftwareGl: boolean
  ) {
    this.group = new THREE.Group();
    this.group.name = `chunk_stream_${regionId}`;
    scene.add(this.group);

    this.regionId = regionId;
    this.worldSeed = worldSeed;
    this.getTerrainHeight = getTerrainHeight;
    this.maxAnisotropy = maxAnisotropy;
    this.isSoftwareGl = isSoftwareGl;

    this.terrainMat = this.getRegionTerrainMaterial();
    this.initGrid();
  }

  private getRegionTerrainMaterial(): THREE.MeshStandardMaterial {
    const stoneTex = TextureGenerator.createStoneTexture(this.maxAnisotropy);

    if (this.regionId === 'ashen_expanse') {
      return SharedAssets.getMaterial('terrain_ashen', () =>
        new THREE.MeshStandardMaterial({
          map: stoneTex,
          color: 0x27272a,
          roughness: 0.9,
          metalness: 0.25,
        })
      );
    }
    if (this.regionId === 'moonveil_wilds') {
      return SharedAssets.getMaterial('terrain_moonveil', () =>
        new THREE.MeshStandardMaterial({
          map: stoneTex,
          color: 0x2e1065,
          roughness: 0.8,
          metalness: 0.1,
        })
      );
    }
    if (this.regionId === 'sunken_archive') {
      return SharedAssets.getMaterial('terrain_archive', () =>
        new THREE.MeshStandardMaterial({
          map: stoneTex,
          color: 0x334155,
          roughness: 0.75,
          metalness: 0.35,
        })
      );
    }
    if (this.regionId === 'rift_frontier') {
      return SharedAssets.getMaterial('terrain_rift', () =>
        new THREE.MeshStandardMaterial({
          map: stoneTex,
          color: 0x18181b,
          roughness: 0.6,
          metalness: 0.7,
        })
      );
    }
    if (this.regionId === 'shattered_highlands') {
      return SharedAssets.getMaterial('terrain_highlands', () =>
        new THREE.MeshStandardMaterial({
          map: stoneTex,
          color: 0x475569,
          roughness: 0.85,
          metalness: 0.15,
        })
      );
    }

    const grassTex = TextureGenerator.createGrassTexture(this.maxAnisotropy);
    return SharedAssets.getMaterial('terrain_verdant', () =>
      new THREE.MeshStandardMaterial({
        map: grassTex,
        roughness: 0.85,
        metalness: 0.05,
      })
    );
  }

  private initGrid(): void {
    const maxRadius = this.regionId === 'shattered_highlands' ? 102 : 92;

    for (let cx = -4; cx <= 3; cx++) {
      for (let cz = -4; cz <= 3; cz++) {
        const minX = cx * CHUNK_SIZE;
        const maxX = minX + CHUNK_SIZE;
        const minZ = cz * CHUNK_SIZE;
        const maxZ = minZ + CHUNK_SIZE;

        // Only register chunks whose bounds intersect the island radius
        const closestX = Math.max(minX, Math.min(0, maxX));
        const closestZ = Math.max(minZ, Math.min(0, maxZ));
        if (Math.hypot(closestX, closestZ) > maxRadius) {
          continue;
        }

        const key = `${cx},${cz}`;
        const centerX = minX + CHUNK_SIZE * 0.5;
        const centerZ = minZ + CHUNK_SIZE * 0.5;

        // Sample corners & center to estimate accurate vertical AABB for frustum culling
        let minY = Infinity;
        let maxY = -Infinity;
        for (let sx = 0; sx <= 2; sx++) {
          for (let sz = 0; sz <= 2; sz++) {
            const wx = minX + sx * (CHUNK_SIZE * 0.5);
            const wz = minZ + sz * (CHUNK_SIZE * 0.5);
            const h = this.getTerrainHeight(wx, wz);
            if (h < minY) minY = h;
            if (h > maxY) maxY = h;
          }
        }

        const bounds = new THREE.Box3(
          new THREE.Vector3(minX, minY - 4, minZ),
          new THREE.Vector3(maxX, maxY + 18, maxZ)
        );

        this.chunks.set(key, {
          cx,
          cz,
          key,
          centerX,
          centerZ,
          state: 'UNLOADED',
          visible: true,
          activeGroup: null,
          nearGroup: null,
          bounds,
          builtDensity: -1,
        });
      }
    }

    this.unloadedCount = this.chunks.size;
  }

  /**
   * Synchronously build only the immediate chunks around player spawn so terrain
   * under the player is visible on frame 1; outer chunks stream asynchronously.
   */
  public bootstrapAround(playerX: number, playerZ: number, config: QualityConfig): void {
    const densityBucket = this.getDensityBucket(config.vegetationDensity);
    this.lastDensityBucket = densityBucket;

    this.chunks.forEach((chunk) => {
      const dist = Math.hypot(chunk.centerX - playerX, chunk.centerZ - playerZ);
      if (dist <= Math.min(44, config.activeLoadRadius)) {
        this.promoteChunkImmediate(chunk, 'ACTIVE', densityBucket);
      }
    });
    this.recountStates();
  }

  private getDensityBucket(vegetationDensity: number): number {
    return Math.round(vegetationDensity * 20) / 20;
  }

  /**
   * Update chunk states with hysteresis, frustum culling, and a ~3ms build budget
   */
  public update(
    playerPos: THREE.Vector3,
    camera: THREE.PerspectiveCamera,
    config: QualityConfig
  ): void {
    const tStart = performance.now();
    const densityBucket = this.getDensityBucket(config.vegetationDensity);
    const densityChanged = densityBucket !== this.lastDensityBucket;
    this.lastDensityBucket = densityBucket;

    // Update camera frustum once per frame
    camera.updateMatrixWorld();
    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_projScreenMatrix);

    this.buildQueue.length = 0;

    let statesDirty = false;

    this.chunks.forEach((chunk) => {
      const dx = chunk.centerX - playerPos.x;
      const dz = chunk.centerZ - playerPos.z;
      const distSq = dx * dx + dz * dz;
      const dist = Math.sqrt(distSq);

      // Determine desired state with hysteresis
      let desired: ChunkState = chunk.state;
      if (chunk.state === 'UNLOADED') {
        if (dist <= config.activeLoadRadius) desired = 'ACTIVE';
        else if (dist <= config.nearLoadRadius) desired = 'NEAR';
      } else if (chunk.state === 'NEAR') {
        if (dist <= config.activeLoadRadius) desired = 'ACTIVE';
        else if (dist > config.nearUnloadRadius) desired = 'UNLOADED';
      } else {
        // Currently ACTIVE
        if (dist > config.nearUnloadRadius) desired = 'UNLOADED';
        else if (dist > config.activeUnloadRadius) desired = 'NEAR';
      }

      if (desired === 'UNLOADED' && chunk.state !== 'UNLOADED') {
        this.demoteToUnloaded(chunk);
        statesDirty = true;
      } else if (desired !== chunk.state || (desired === 'ACTIVE' && densityChanged && chunk.builtDensity !== densityBucket)) {
        this.buildQueue.push({
          chunk,
          targetState: desired === 'ACTIVE' ? 'ACTIVE' : 'NEAR',
          distSq,
        });
      }

      // Frustum visibility check for loaded chunks (keep close chunks always visible)
      const isVisible = dist < 42 || _frustum.intersectsBox(chunk.bounds);
      chunk.visible = isVisible;
      if (chunk.state === 'ACTIVE' && chunk.activeGroup) {
        chunk.activeGroup.visible = isVisible;
      } else if (chunk.state === 'NEAR' && chunk.nearGroup) {
        chunk.nearGroup.visible = isVisible;
      }
    });

    // Sort build tasks nearest-first and process within a strict ~3ms frame budget
    if (this.buildQueue.length > 0) {
      this.buildQueue.sort((a, b) => a.distSq - b.distSq);
      const TIME_BUDGET_MS = 3.0;

      for (let i = 0; i < this.buildQueue.length; i++) {
        if (i > 0 && performance.now() - tStart >= TIME_BUDGET_MS) {
          break;
        }
        const task = this.buildQueue[i];
        this.promoteChunkImmediate(task.chunk, task.targetState, densityBucket);
        statesDirty = true;
      }
    }

    if (statesDirty) {
      this.recountStates();
    }
  }

  private promoteChunkImmediate(
    chunk: ChunkEntry,
    targetState: 'ACTIVE' | 'NEAR',
    densityBucket: number
  ): void {
    const prevState = chunk.state;

    // Detach previous mesh group into LRU cache before attaching new LOD group
    if (prevState === 'ACTIVE' && chunk.activeGroup && chunk.builtDensity === densityBucket) {
      if (targetState === 'ACTIVE') return;
      this.detachToCache(chunk, 'ACTIVE', chunk.activeGroup);
      chunk.activeGroup = null;
    } else if (prevState === 'ACTIVE' && chunk.activeGroup) {
      this.group.remove(chunk.activeGroup);
      SharedAssets.disposeObject3DSafe(chunk.activeGroup);
      chunk.activeGroup = null;
    }

    if (prevState === 'NEAR' && chunk.nearGroup) {
      if (targetState === 'NEAR') return;
      this.detachToCache(chunk, 'NEAR', chunk.nearGroup);
      chunk.nearGroup = null;
    }

    if (targetState === 'ACTIVE') {
      const cacheKey = this.makeCacheKey(chunk.key, 'ACTIVE', densityBucket);
      let grp = this.popFromCache(cacheKey);
      if (!grp) {
        grp = this.buildActiveChunkGroup(chunk, densityBucket);
      }
      chunk.activeGroup = grp;
      chunk.builtDensity = densityBucket;
      grp.visible = chunk.visible;
      this.group.add(grp);
    } else {
      const cacheKey = this.makeCacheKey(chunk.key, 'NEAR', 0);
      let grp = this.popFromCache(cacheKey);
      if (!grp) {
        grp = this.buildNearChunkGroup(chunk);
      }
      chunk.nearGroup = grp;
      grp.visible = chunk.visible;
      this.group.add(grp);
    }

    chunk.state = targetState;
    if (prevState !== targetState) {
      this.onChunkStateChange?.(chunk.cx, chunk.cz, targetState, prevState);
    }
  }

  private demoteToUnloaded(chunk: ChunkEntry): void {
    const prevState = chunk.state;
    if (prevState === 'UNLOADED') return;

    if (chunk.activeGroup) {
      this.detachToCache(chunk, 'ACTIVE', chunk.activeGroup);
      chunk.activeGroup = null;
    }
    if (chunk.nearGroup) {
      this.detachToCache(chunk, 'NEAR', chunk.nearGroup);
      chunk.nearGroup = null;
    }

    chunk.state = 'UNLOADED';
    this.onChunkStateChange?.(chunk.cx, chunk.cz, 'UNLOADED', prevState);
  }

  private makeCacheKey(chunkKey: string, state: 'ACTIVE' | 'NEAR', densityBucket: number): string {
    return `${this.regionId}:${chunkKey}:${state}:${state === 'ACTIVE' ? densityBucket : 0}`;
  }

  private detachToCache(chunk: ChunkEntry, state: 'ACTIVE' | 'NEAR', grp: THREE.Group): void {
    this.group.remove(grp);
    const cacheKey = this.makeCacheKey(chunk.key, state, chunk.builtDensity);

    // Avoid duplicates
    const existingIdx = this.lruCache.findIndex((c) => c.cacheKey === cacheKey);
    if (existingIdx >= 0) {
      this.lruCache.splice(existingIdx, 1);
    }

    this.lruCache.push({ cacheKey, group: grp });
    while (this.lruCache.length > this.MAX_LRU_CACHE) {
      const evicted = this.lruCache.shift();
      if (evicted) {
        SharedAssets.disposeObject3DSafe(evicted.group);
      }
    }
  }

  private popFromCache(cacheKey: string): THREE.Group | null {
    const idx = this.lruCache.findIndex((c) => c.cacheKey === cacheKey);
    if (idx === -1) return null;
    const [entry] = this.lruCache.splice(idx, 1);
    return entry.group;
  }

  /**
   * Build terrain tile geometry for a chunk at given segment resolution
   */
  private createChunkTerrainMesh(chunk: ChunkEntry, segments: number, receiveShadow: boolean): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const lx = posAttr.getX(i);
      const lz = posAttr.getZ(i);
      const wx = chunk.centerX + lx;
      const wz = chunk.centerZ + lz;
      posAttr.setY(i, this.getTerrainHeight(wx, wz));
    }
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, this.terrainMat);
    mesh.position.set(chunk.centerX, 0, chunk.centerZ);
    mesh.receiveShadow = receiveShadow;
    return mesh;
  }

  private buildNearChunkGroup(chunk: ChunkEntry): THREE.Group {
    const grp = new THREE.Group();
    grp.name = `chunk_near_${chunk.key}`;
    // Low-detail 6x6 terrain tile (no shadows, no foliage props)
    grp.add(this.createChunkTerrainMesh(chunk, 6, false));
    return grp;
  }

  private buildActiveChunkGroup(chunk: ChunkEntry, density: number): THREE.Group {
    const grp = new THREE.Group();
    grp.name = `chunk_active_${chunk.key}`;

    // 14x14 terrain tile (~11.5m/seg resolution — matches original 180m / 80 seg density)
    grp.add(this.createChunkTerrainMesh(chunk, 14, !this.isSoftwareGl));

    // Deterministic seeded instanced biome props
    if (density > 0.05) {
      this.populateSeededInstancedProps(grp, chunk, density);
    }

    return grp;
  }

  private isExcludedPosition(wx: number, wz: number): boolean {
    const dist = Math.hypot(wx, wz);
    const maxR = this.regionId === 'shattered_highlands' ? 88 : 76;
    if (dist > maxR) return true;

    if (this.regionId === 'verdant_reach') {
      // River channel clearance
      if (wz > -48 && wz < 28) {
        const riverT = (wz + 45) / 70;
        const riverX = 10 + riverT * 38;
        if (Math.abs(wx - riverX) < 11.5) return true;
      }
      for (const [ex, ez, er] of VERDANT_EXCLUSIONS) {
        if (Math.hypot(wx - ex, wz - ez) < er) return true;
      }
    } else {
      // Keep central spawn/landmark plaza clear across destination worlds
      if (dist < 14) return true;
    }

    return false;
  }

  private populateSeededInstancedProps(
    grp: THREE.Group,
    chunk: ChunkEntry,
    density: number
  ): void {
    const seed = hashChunkSeed(this.worldSeed, this.regionId, chunk.cx, chunk.cz);
    const rng = createSeededRng(seed);
    const minX = chunk.cx * CHUNK_SIZE + 1.5;
    const minZ = chunk.cz * CHUNK_SIZE + 1.5;
    const span = CHUNK_SIZE - 3.0;

    if (this.regionId === 'verdant_reach') {
      // Pine / Oak trees & mossy rocks (deterministic candidates scaled by density)
      const treeSlots = 5;
      const treePositions: { x: number; y: number; z: number; scale: number; rot: number; isPine: boolean }[] = [];

      for (let i = 0; i < treeSlots; i++) {
        const wx = minX + rng() * span;
        const wz = minZ + rng() * span;
        const scale = 0.8 + rng() * 0.55;
        const rot = rng() * Math.PI * 2;
        const isPine = rng() > 0.45;
        if (!this.isExcludedPosition(wx, wz)) {
          const wy = this.getTerrainHeight(wx, wz);
          if (wy > 0.4) {
            treePositions.push({ x: wx, y: wy, z: wz, scale, rot, isPine });
          }
        }
      }

      const rockSlots = 4;
      const rockPositions: { x: number; y: number; z: number; scale: number; rot: number }[] = [];
      for (let i = 0; i < rockSlots; i++) {
        const wx = minX + rng() * span;
        const wz = minZ + rng() * span;
        const scale = 0.65 + rng() * 0.75;
        const rot = rng() * Math.PI * 2;
        if (!this.isExcludedPosition(wx, wz)) {
          const wy = this.getTerrainHeight(wx, wz);
          if (wy > 0.2) {
            rockPositions.push({ x: wx, y: wy, z: wz, scale, rot });
          }
        }
      }

      const keepTrees = Math.min(treePositions.length, Math.max(0, Math.round(treePositions.length * density)));
      const pines = treePositions.slice(0, keepTrees).filter((t) => t.isPine);
      const oaks = treePositions.slice(0, keepTrees).filter((t) => !t.isPine);

      if (pines.length > 0) {
        const trunkGeo = SharedAssets.getGeometry('prop_pine_trunk', () => {
          const g = new THREE.CylinderGeometry(0.18, 0.3, 2.2, 6);
          g.translate(0, 1.1, 0);
          return g;
        });
        const crownGeo = SharedAssets.getGeometry('prop_pine_crown', () => {
          const g = new THREE.ConeGeometry(1.5, 3.6, 7);
          g.translate(0, 3.6, 0);
          return g;
        });
        const barkMat = SharedAssets.getMaterial('prop_bark_mat', () =>
          new THREE.MeshStandardMaterial({
            map: TextureGenerator.createBarkTexture(this.maxAnisotropy),
            roughness: 0.9,
          })
        );
        const pineMat = SharedAssets.getMaterial('prop_pine_mat', () =>
          new THREE.MeshStandardMaterial({
            color: 0x166534,
            roughness: 0.85,
            flatShading: true,
          })
        );

        const trunkInst = new THREE.InstancedMesh(trunkGeo, barkMat, pines.length);
        const crownInst = new THREE.InstancedMesh(crownGeo, pineMat, pines.length);
        trunkInst.castShadow = !this.isSoftwareGl;
        crownInst.castShadow = !this.isSoftwareGl;

        for (let i = 0; i < pines.length; i++) {
          const p = pines[i];
          _dummy.position.set(p.x, p.y - 0.1, p.z);
          _dummy.rotation.set(0, p.rot, 0);
          _dummy.scale.setScalar(p.scale);
          _dummy.updateMatrix();
          trunkInst.setMatrixAt(i, _dummy.matrix);
          crownInst.setMatrixAt(i, _dummy.matrix);
        }
        trunkInst.instanceMatrix.needsUpdate = true;
        crownInst.instanceMatrix.needsUpdate = true;
        grp.add(trunkInst, crownInst);
      }

      if (oaks.length > 0) {
        const trunkGeo = SharedAssets.getGeometry('prop_oak_trunk', () => {
          const g = new THREE.CylinderGeometry(0.24, 0.38, 2.0, 6);
          g.translate(0, 1.0, 0);
          return g;
        });
        const canopyGeo = SharedAssets.getGeometry('prop_oak_canopy', () => {
          const g = new THREE.DodecahedronGeometry(1.6, 0);
          g.translate(0, 3.1, 0);
          return g;
        });
        const barkMat = SharedAssets.getMaterial('prop_bark_mat', () =>
          new THREE.MeshStandardMaterial({
            map: TextureGenerator.createBarkTexture(this.maxAnisotropy),
            roughness: 0.9,
          })
        );
        const oakMat = SharedAssets.getMaterial('prop_oak_mat', () =>
          new THREE.MeshStandardMaterial({
            color: 0x15803d,
            roughness: 0.85,
            flatShading: true,
          })
        );

        const trunkInst = new THREE.InstancedMesh(trunkGeo, barkMat, oaks.length);
        const canopyInst = new THREE.InstancedMesh(canopyGeo, oakMat, oaks.length);
        trunkInst.castShadow = !this.isSoftwareGl;
        canopyInst.castShadow = !this.isSoftwareGl;

        for (let i = 0; i < oaks.length; i++) {
          const o = oaks[i];
          _dummy.position.set(o.x, o.y - 0.1, o.z);
          _dummy.rotation.set(0, o.rot, 0);
          _dummy.scale.setScalar(o.scale);
          _dummy.updateMatrix();
          trunkInst.setMatrixAt(i, _dummy.matrix);
          canopyInst.setMatrixAt(i, _dummy.matrix);
        }
        trunkInst.instanceMatrix.needsUpdate = true;
        canopyInst.instanceMatrix.needsUpdate = true;
        grp.add(trunkInst, canopyInst);
      }

      const keepRocks = Math.min(rockPositions.length, Math.max(0, Math.round(rockPositions.length * density)));
      if (keepRocks > 0) {
        const rockGeo = SharedAssets.getGeometry('prop_verdant_rock', () => new THREE.DodecahedronGeometry(0.7, 0));
        const rockMat = SharedAssets.getMaterial('prop_rock_mat', () =>
          new THREE.MeshStandardMaterial({
            color: 0x475569,
            roughness: 0.9,
            flatShading: true,
          })
        );
        const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, keepRocks);
        for (let i = 0; i < keepRocks; i++) {
          const r = rockPositions[i];
          _dummy.position.set(r.x, r.y + 0.25 * r.scale, r.z);
          _dummy.rotation.set(r.rot * 0.4, r.rot, 0);
          _dummy.scale.set(r.scale * 1.2, r.scale * 0.75, r.scale);
          _dummy.updateMatrix();
          rockInst.setMatrixAt(i, _dummy.matrix);
        }
        rockInst.instanceMatrix.needsUpdate = true;
        grp.add(rockInst);
      }
      return;
    }

    // Destination worlds: deterministic instanced rock/crystal scatter
    const propSlots = 4;
    const props: { x: number; y: number; z: number; scale: number; rot: number }[] = [];
    for (let i = 0; i < propSlots; i++) {
      const wx = minX + rng() * span;
      const wz = minZ + rng() * span;
      const scale = 0.7 + rng() * 0.8;
      const rot = rng() * Math.PI * 2;
      if (!this.isExcludedPosition(wx, wz)) {
        const wy = this.getTerrainHeight(wx, wz);
        if (wy > -5) {
          props.push({ x: wx, y: wy, z: wz, scale, rot });
        }
      }
    }

    const keepProps = Math.min(props.length, Math.max(0, Math.round(props.length * density)));
    if (keepProps === 0) return;

    const geoKey =
      this.regionId === 'ashen_expanse'
        ? 'prop_basalt_col'
        : this.regionId === 'moonveil_wilds'
        ? 'prop_mini_cap'
        : 'prop_crystal_shard';
    const propGeo = SharedAssets.getGeometry(geoKey, () => {
      if (this.regionId === 'ashen_expanse') {
        const g = new THREE.CylinderGeometry(0.45, 0.55, 2.2, 6);
        g.translate(0, 1.0, 0);
        return g;
      }
      if (this.regionId === 'moonveil_wilds') {
        const g = new THREE.ConeGeometry(0.75, 1.2, 6);
        g.translate(0, 0.8, 0);
        return g;
      }
      const g = new THREE.OctahedronGeometry(0.65, 0);
      g.translate(0, 0.65, 0);
      return g;
    });

    const colorHex =
      this.regionId === 'ashen_expanse'
        ? 0x18181b
        : this.regionId === 'moonveil_wilds'
        ? 0xa855f7
        : this.regionId === 'sunken_archive'
        ? 0x64748b
        : this.regionId === 'rift_frontier'
        ? 0x7c3aed
        : 0x38bdf8;

    const propMat = SharedAssets.getMaterial(`prop_mat_${this.regionId}`, () =>
      new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: this.regionId === 'moonveil_wilds' || this.regionId === 'rift_frontier' ? colorHex : 0x000000,
        emissiveIntensity: 0.35,
        roughness: 0.75,
        flatShading: true,
      })
    );

    const inst = new THREE.InstancedMesh(propGeo, propMat, keepProps);
    for (let i = 0; i < keepProps; i++) {
      const p = props[i];
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(0, p.rot, 0);
      _dummy.scale.setScalar(p.scale);
      _dummy.updateMatrix();
      inst.setMatrixAt(i, _dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    grp.add(inst);
  }

  private recountStates(): void {
    let active = 0;
    let near = 0;
    let unloaded = 0;
    this.chunks.forEach((c) => {
      if (c.state === 'ACTIVE') active++;
      else if (c.state === 'NEAR') near++;
      else unloaded++;
    });
    this.activeCount = active;
    this.nearCount = near;
    this.unloadedCount = unloaded;
  }

  public getChunkStateAt(x: number, z: number): ChunkState {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const c = this.chunks.get(`${cx},${cz}`);
    return c ? c.state : 'UNLOADED';
  }

  public isPositionActive(x: number, z: number): boolean {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const c = this.chunks.get(`${cx},${cz}`);
    return c ? c.state === 'ACTIVE' : false;
  }

  public isPositionVisible(x: number, z: number): boolean {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const c = this.chunks.get(`${cx},${cz}`);
    return c ? c.state !== 'UNLOADED' && c.visible : false;
  }

  public getCounts(): { active: number; near: number; unloaded: number } {
    return {
      active: this.activeCount,
      near: this.nearCount,
      unloaded: this.unloadedCount,
    };
  }

  public dispose(): void {
    this.chunks.forEach((c) => {
      if (c.activeGroup) {
        this.group.remove(c.activeGroup);
        SharedAssets.disposeObject3DSafe(c.activeGroup);
        c.activeGroup = null;
      }
      if (c.nearGroup) {
        this.group.remove(c.nearGroup);
        SharedAssets.disposeObject3DSafe(c.nearGroup);
        c.nearGroup = null;
      }
    });
    this.chunks.clear();

    for (const cached of this.lruCache) {
      SharedAssets.disposeObject3DSafe(cached.group);
    }
    this.lruCache = [];

    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
