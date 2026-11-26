/**
 * Persistent World State Store & Deterministic Seeded PRNG for The Drifting Land.
 * - Deterministic chunk seeding: hash(worldSeed, regionId, cx, cz) + mulberry32
 * - Compact delta records per region/chunk (only modified objects stored)
 * - Syncs seamlessly with SaveData (v2) while remaining backward-compatible with v1 saves
 */

import { RegionChunkDelta, RegionDeltaState, SaveData } from '../types/game';

export const CHUNK_SIZE = 32;
export const DEFAULT_WORLD_SEED = 133742;

export function getChunkCoords(x: number, z: number): { cx: number; cz: number } {
  return {
    cx: Math.floor(x / CHUNK_SIZE),
    cz: Math.floor(z / CHUNK_SIZE),
  };
}

export function getChunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export function getChunkKeyForPos(x: number, z: number): string {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cz = Math.floor(z / CHUNK_SIZE);
  return `${cx},${cz}`;
}

/**
 * Deterministic 32-bit FNV-1a mix for (worldSeed, regionId, cx, cz)
 */
export function hashChunkSeed(worldSeed: number, regionId: string, cx: number, cz: number): number {
  let h = (2166136261 ^ (worldSeed | 0)) >>> 0;
  for (let i = 0; i < regionId.length; i++) {
    h ^= regionId.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= (cx + 4096) | 0;
  h = Math.imul(h, 16777619) >>> 0;
  h ^= (cz + 4096) | 0;
  h = Math.imul(h, 16777619) >>> 0;
  return h >>> 0;
}

/**
 * Fast deterministic PRNG (Mulberry32)
 */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isChunkDeltaEmpty(d: RegionChunkDelta): boolean {
  return (
    (!d.harvestedFlora || Object.keys(d.harvestedFlora).length === 0) &&
    (!d.harvestedDeposits || Object.keys(d.harvestedDeposits).length === 0) &&
    (!d.harvestedEntities || Object.keys(d.harvestedEntities).length === 0) &&
    (!d.defeatedEnemies || Object.keys(d.defeatedEnemies).length === 0) &&
    (!d.wildlifeCooldowns || Object.keys(d.wildlifeCooldowns).length === 0) &&
    (!d.wildlifePositions || Object.keys(d.wildlifePositions).length === 0) &&
    (!d.unlockedDoors || d.unlockedDoors.length === 0) &&
    (!d.discoveredChambers || d.discoveredChambers.length === 0) &&
    (!d.activatedStructures || d.activatedStructures.length === 0) &&
    (!d.collectedShards || d.collectedShards.length === 0)
  );
}

export class WorldStateStore {
  public worldSeed: number;
  private regionChunks: Map<string, Map<string, RegionChunkDelta>> = new Map();

  constructor(save?: SaveData) {
    this.worldSeed = save?.worldSeed || DEFAULT_WORLD_SEED;
    if (save) {
      this.hydrateFromSave(save);
    }
  }

  public hydrateFromSave(save: SaveData): void {
    this.worldSeed = save.worldSeed || DEFAULT_WORLD_SEED;
    this.regionChunks.clear();

    if (save.regionStates) {
      for (const [regionId, regionState] of Object.entries(save.regionStates)) {
        if (!regionState || !regionState.chunks) continue;
        const chunkMap = new Map<string, RegionChunkDelta>();
        for (const [chunkKey, delta] of Object.entries(regionState.chunks)) {
          if (delta && !isChunkDeltaEmpty(delta)) {
            chunkMap.set(chunkKey, this.cloneDelta(delta));
          }
        }
        if (chunkMap.size > 0) {
          this.regionChunks.set(regionId, chunkMap);
        }
      }
    }
  }

  private cloneDelta(d: RegionChunkDelta): RegionChunkDelta {
    const out: RegionChunkDelta = {};
    if (d.harvestedFlora) out.harvestedFlora = { ...d.harvestedFlora };
    if (d.harvestedDeposits) out.harvestedDeposits = { ...d.harvestedDeposits };
    if (d.harvestedEntities) out.harvestedEntities = { ...d.harvestedEntities };
    if (d.defeatedEnemies) out.defeatedEnemies = { ...d.defeatedEnemies };
    if (d.wildlifeCooldowns) out.wildlifeCooldowns = { ...d.wildlifeCooldowns };
    if (d.wildlifePositions) {
      out.wildlifePositions = {};
      for (const [k, pos] of Object.entries(d.wildlifePositions)) {
        out.wildlifePositions[k] = [pos[0], pos[1]];
      }
    }
    if (d.unlockedDoors) out.unlockedDoors = [...d.unlockedDoors];
    if (d.discoveredChambers) out.discoveredChambers = [...d.discoveredChambers];
    if (d.activatedStructures) out.activatedStructures = [...d.activatedStructures];
    if (d.collectedShards) out.collectedShards = [...d.collectedShards];
    return out;
  }

  private getOrCreateChunk(regionId: string, chunkKey: string): RegionChunkDelta {
    let regMap = this.regionChunks.get(regionId);
    if (!regMap) {
      regMap = new Map();
      this.regionChunks.set(regionId, regMap);
    }
    let chunk = regMap.get(chunkKey);
    if (!chunk) {
      chunk = {};
      regMap.set(chunkKey, chunk);
    }
    return chunk;
  }

  public getChunkDelta(regionId: string, chunkKey: string): RegionChunkDelta | undefined {
    return this.regionChunks.get(regionId)?.get(chunkKey);
  }

  public setFloraHarvested(regionId: string, x: number, z: number, id: string, timestamp: number): void {
    const chunk = this.getOrCreateChunk(regionId, getChunkKeyForPos(x, z));
    if (!chunk.harvestedFlora) chunk.harvestedFlora = {};
    chunk.harvestedFlora[id] = timestamp;
  }

  public clearFloraHarvested(regionId: string, x: number, z: number, id: string): void {
    const chunk = this.getChunkDelta(regionId, getChunkKeyForPos(x, z));
    if (chunk?.harvestedFlora) {
      delete chunk.harvestedFlora[id];
    }
  }

  public setDepositHarvested(regionId: string, x: number, z: number, id: string, timestamp: number): void {
    const chunk = this.getOrCreateChunk(regionId, getChunkKeyForPos(x, z));
    if (!chunk.harvestedDeposits) chunk.harvestedDeposits = {};
    chunk.harvestedDeposits[id] = timestamp;
  }

  public setEntityHarvested(regionId: string, x: number, z: number, id: string, timestamp: number): void {
    const chunk = this.getOrCreateChunk(regionId, getChunkKeyForPos(x, z));
    if (!chunk.harvestedEntities) chunk.harvestedEntities = {};
    chunk.harvestedEntities[id] = timestamp;
  }

  public setEnemyDefeated(regionId: string, x: number, z: number, id: string, timestamp: number): void {
    const chunk = this.getOrCreateChunk(regionId, getChunkKeyForPos(x, z));
    if (!chunk.defeatedEnemies) chunk.defeatedEnemies = {};
    chunk.defeatedEnemies[id] = timestamp;
  }

  public clearEnemyDefeated(regionId: string, x: number, z: number, id: string): void {
    const chunk = this.getChunkDelta(regionId, getChunkKeyForPos(x, z));
    if (chunk?.defeatedEnemies) {
      delete chunk.defeatedEnemies[id];
    }
  }

  public getEnemyDefeatTimestamp(regionId: string, x: number, z: number, id: string): number {
    return this.getChunkDelta(regionId, getChunkKeyForPos(x, z))?.defeatedEnemies?.[id] || 0;
  }

  public setWildlifeState(
    regionId: string,
    homeX: number,
    homeZ: number,
    id: string,
    cooldownUntilMs: number,
    pos?: [number, number]
  ): void {
    const chunk = this.getOrCreateChunk(regionId, getChunkKeyForPos(homeX, homeZ));
    if (cooldownUntilMs > Date.now()) {
      if (!chunk.wildlifeCooldowns) chunk.wildlifeCooldowns = {};
      chunk.wildlifeCooldowns[id] = cooldownUntilMs;
    } else if (chunk.wildlifeCooldowns) {
      delete chunk.wildlifeCooldowns[id];
    }
    if (pos) {
      if (!chunk.wildlifePositions) chunk.wildlifePositions = {};
      chunk.wildlifePositions[id] = [Math.round(pos[0] * 10) / 10, Math.round(pos[1] * 10) / 10];
    }
  }

  public getWildlifeState(
    regionId: string,
    homeX: number,
    homeZ: number,
    id: string
  ): { cooldownUntilMs: number; pos?: [number, number] } {
    const chunk = this.getChunkDelta(regionId, getChunkKeyForPos(homeX, homeZ));
    return {
      cooldownUntilMs: chunk?.wildlifeCooldowns?.[id] || 0,
      pos: chunk?.wildlifePositions?.[id],
    };
  }

  public markDoorUnlocked(regionId: string, x: number, z: number, id: string): void {
    const chunk = this.getOrCreateChunk(regionId, getChunkKeyForPos(x, z));
    if (!chunk.unlockedDoors) chunk.unlockedDoors = [];
    if (!chunk.unlockedDoors.includes(id)) chunk.unlockedDoors.push(id);
  }

  public markChamberDiscovered(regionId: string, x: number, z: number, id: string): void {
    const chunk = this.getOrCreateChunk(regionId, getChunkKeyForPos(x, z));
    if (!chunk.discoveredChambers) chunk.discoveredChambers = [];
    if (!chunk.discoveredChambers.includes(id)) chunk.discoveredChambers.push(id);
  }

  public markStructureActivated(regionId: string, x: number, z: number, id: string): void {
    const chunk = this.getOrCreateChunk(regionId, getChunkKeyForPos(x, z));
    if (!chunk.activatedStructures) chunk.activatedStructures = [];
    if (!chunk.activatedStructures.includes(id)) chunk.activatedStructures.push(id);
  }

  public markShardCollected(regionId: string, x: number, z: number, id: string): void {
    const chunk = this.getOrCreateChunk(regionId, getChunkKeyForPos(x, z));
    if (!chunk.collectedShards) chunk.collectedShards = [];
    if (!chunk.collectedShards.includes(id)) chunk.collectedShards.push(id);
  }

  public getEntityHarvestTimestamp(regionId: string, x: number, z: number, id: string): number {
    return this.getChunkDelta(regionId, getChunkKeyForPos(x, z))?.harvestedEntities?.[id] || 0;
  }

  public getFloraHarvestTimestamp(regionId: string, x: number, z: number, id: string): number {
    return this.getChunkDelta(regionId, getChunkKeyForPos(x, z))?.harvestedFlora?.[id] || 0;
  }

  /**
   * Prune expired respawn timestamps (older than 5 minutes) and serialize compactly into SaveData
   */
  public syncToSave(save: SaveData): void {
    save.worldSeed = this.worldSeed;
    const now = Date.now();
    const outRegions: Record<string, RegionDeltaState> = {};

    this.regionChunks.forEach((chunkMap, regionId) => {
      const outChunks: Record<string, RegionChunkDelta> = {};
      chunkMap.forEach((delta, chunkKey) => {
        // Prune expired enemy respawns (> 60s) and expired wildlife cooldowns
        if (delta.defeatedEnemies) {
          for (const [eid, ts] of Object.entries(delta.defeatedEnemies)) {
            if (now - ts > 60000) delete delta.defeatedEnemies[eid];
          }
          if (Object.keys(delta.defeatedEnemies).length === 0) delete delta.defeatedEnemies;
        }
        if (delta.wildlifeCooldowns) {
          for (const [wid, until] of Object.entries(delta.wildlifeCooldowns)) {
            if (until <= now) delete delta.wildlifeCooldowns[wid];
          }
          if (Object.keys(delta.wildlifeCooldowns).length === 0) delete delta.wildlifeCooldowns;
        }
        if (!isChunkDeltaEmpty(delta)) {
          outChunks[chunkKey] = delta;
        }
      });
      if (Object.keys(outChunks).length > 0) {
        outRegions[regionId] = { chunks: outChunks };
      }
    });

    save.regionStates = outRegions;
  }
}
