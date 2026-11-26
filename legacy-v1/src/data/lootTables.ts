/**
 * Configurable, data-driven loot tables for The Drifting Land.
 * Defines drop tables across the 6 required rarity tiers:
 * Common, Uncommon, Rare, Epic, Legendary, and Event-exclusive.
 */

import { LootRarity } from '../types/game';

export interface LootDropEntry {
  itemId: string;
  rarity: LootRarity;
  chance: number; // 0.0 to 1.0 (e.g. 0.85 = 85%)
  min: number;
  max: number;
  isGuaranteedFirstKill?: boolean; // single-grant anti-exploit
  requiresEvent?: boolean; // e.g. Red Moon / Celestial alignment
}

export interface LootTableDefinition {
  id: string;
  name: string;
  minCoins: number;
  maxCoins: number;
  xpReward: number;
  drops: LootDropEntry[];
}

export const LOOT_TABLES: Record<string, LootTableDefinition> = {
  // --- 1. Forest Territorial Creature: Thornstalker ---
  thornstalker: {
    id: 'thornstalker',
    name: 'Thornstalker Trophy Cache',
    minCoins: 4,
    maxCoins: 12,
    xpReward: 25,
    drops: [
      { itemId: 'thorn_barb', rarity: 'common', chance: 0.95, min: 1, max: 3 },
      { itemId: 'verdant_moss_fiber', rarity: 'common', chance: 0.75, min: 1, max: 2 },
      { itemId: 'ember_shard', rarity: 'uncommon', chance: 0.28, min: 1, max: 1 },
      { itemId: 'drift_bloom_nectar', rarity: 'common', chance: 0.45, min: 1, max: 1 },
    ],
  },

  // --- 2. Ruin Guardian: Ancient Ruin Automaton ---
  ruin_automaton: {
    id: 'ruin_automaton',
    name: 'Automaton Salvage Scrap',
    minCoins: 12,
    maxCoins: 28,
    xpReward: 45,
    drops: [
      { itemId: 'automaton_plate', rarity: 'uncommon', chance: 0.9, min: 1, max: 2 },
      { itemId: 'ancient_gear', rarity: 'uncommon', chance: 0.85, min: 1, max: 3 },
      { itemId: 'ancient_basalt_slate', rarity: 'uncommon', chance: 0.5, min: 1, max: 2 },
      { itemId: 'storm_core', rarity: 'rare', chance: 0.18, min: 1, max: 1 },
    ],
  },

  // --- 3. Flying Predator: Razorwing Raptor ---
  razorwing_raptor: {
    id: 'razorwing_raptor',
    name: 'Razorwing Nest Plunder',
    minCoins: 10,
    maxCoins: 22,
    xpReward: 35,
    drops: [
      { itemId: 'raptor_talon', rarity: 'rare', chance: 0.8, min: 1, max: 2 },
      { itemId: 'storm_core', rarity: 'rare', chance: 0.35, min: 1, max: 1 },
      { itemId: 'celestial_dust', rarity: 'rare', chance: 0.4, min: 1, max: 2 },
    ],
  },

  // --- 4. Armored Mineral Guardian: Basalt Geo-Brute ---
  basalt_geo_brute: {
    id: 'basalt_geo_brute',
    name: 'Cracked Geode Ore',
    minCoins: 15,
    maxCoins: 35,
    xpReward: 50,
    drops: [
      { itemId: 'basalt_carapace_chunk', rarity: 'uncommon', chance: 0.95, min: 1, max: 3 },
      { itemId: 'ember_shard', rarity: 'uncommon', chance: 0.75, min: 1, max: 2 },
      { itemId: 'ancient_basalt_slate', rarity: 'uncommon', chance: 0.65, min: 1, max: 2 },
      { itemId: 'rift_crystal', rarity: 'rare', chance: 0.22, min: 1, max: 1 },
    ],
  },

  // --- 5. Dimensional Enemy: Voidborn Aberration ---
  voidborn_aberration: {
    id: 'voidborn_aberration',
    name: 'Spatial Fracture Remnant',
    minCoins: 20,
    maxCoins: 45,
    xpReward: 65,
    drops: [
      { itemId: 'void_essence_shard', rarity: 'rare', chance: 0.9, min: 1, max: 2 },
      { itemId: 'rift_crystal', rarity: 'rare', chance: 0.65, min: 1, max: 2 },
      { itemId: 'celestial_dust', rarity: 'rare', chance: 0.5, min: 2, max: 4 },
      { itemId: 'eclipse_fragment', rarity: 'event-exclusive', chance: 0.2, min: 1, max: 1, requiresEvent: true },
    ],
  },

  // ==========================================
  // --- 6 BOSS ENCOUNTERS (Prompt 10) ---
  // ==========================================

  // Boss 1: Rootbound Guardian
  rootbound_guardian: {
    id: 'rootbound_guardian',
    name: 'Heart of the Ancient Grove',
    minCoins: 120,
    maxCoins: 200,
    xpReward: 250,
    drops: [
      { itemId: 'relic_grove_heart', rarity: 'epic', chance: 1.0, min: 1, max: 1, isGuaranteedFirstKill: true },
      { itemId: 'thorn_barb', rarity: 'common', chance: 1.0, min: 3, max: 6 },
      { itemId: 'verdant_moss_fiber', rarity: 'common', chance: 1.0, min: 4, max: 8 },
      { itemId: 'drift_bloom_nectar', rarity: 'common', chance: 0.8, min: 2, max: 3 },
    ],
  },

  // Boss 2: Ash Colossus
  ash_colossus: {
    id: 'ash_colossus',
    name: 'Heart of the Cinder Crater',
    minCoins: 150,
    maxCoins: 250,
    xpReward: 300,
    drops: [
      { itemId: 'relic_colossus_core', rarity: 'epic', chance: 1.0, min: 1, max: 1, isGuaranteedFirstKill: true },
      { itemId: 'ember_shard', rarity: 'uncommon', chance: 1.0, min: 4, max: 8 },
      { itemId: 'basalt_carapace_chunk', rarity: 'uncommon', chance: 1.0, min: 3, max: 5 },
      { itemId: 'ancient_basalt_slate', rarity: 'uncommon', chance: 0.9, min: 2, max: 4 },
    ],
  },

  // Boss 3: Storm Sentinel
  storm_sentinel: {
    id: 'storm_sentinel',
    name: 'Spire Tempest Matrix',
    minCoins: 180,
    maxCoins: 280,
    xpReward: 320,
    drops: [
      { itemId: 'relic_sentinel_prism', rarity: 'epic', chance: 1.0, min: 1, max: 1, isGuaranteedFirstKill: true },
      { itemId: 'storm_core', rarity: 'rare', chance: 1.0, min: 2, max: 4 },
      { itemId: 'raptor_talon', rarity: 'rare', chance: 0.85, min: 2, max: 3 },
      { itemId: 'celestial_dust', rarity: 'rare', chance: 0.9, min: 3, max: 5 },
    ],
  },

  // Boss 4: Archive Keeper
  archive_keeper: {
    id: 'archive_keeper',
    name: 'Vault Runic Treasury',
    minCoins: 200,
    maxCoins: 320,
    xpReward: 350,
    drops: [
      { itemId: 'relic_archivist_seal', rarity: 'epic', chance: 1.0, min: 1, max: 1, isGuaranteedFirstKill: true },
      { itemId: 'ancient_gear', rarity: 'uncommon', chance: 1.0, min: 4, max: 8 },
      { itemId: 'automaton_plate', rarity: 'uncommon', chance: 1.0, min: 3, max: 6 },
      { itemId: 'aether_surge_tonic', rarity: 'rare', chance: 0.75, min: 1, max: 2 },
    ],
  },

  // Boss 5: Rift Sovereign
  rift_sovereign: {
    id: 'rift_sovereign',
    name: 'Gateway Nexus Singularity',
    minCoins: 300,
    maxCoins: 500,
    xpReward: 500,
    drops: [
      { itemId: 'relic_sovereign_eye', rarity: 'legendary', chance: 1.0, min: 1, max: 1, isGuaranteedFirstKill: true },
      { itemId: 'rift_crystal', rarity: 'rare', chance: 1.0, min: 3, max: 6 },
      { itemId: 'void_essence_shard', rarity: 'rare', chance: 1.0, min: 3, max: 5 },
      { itemId: 'eclipse_fragment', rarity: 'event-exclusive', chance: 0.5, min: 1, max: 2 },
    ],
  },

  // Boss 6: Crimson Warden
  crimson_warden: {
    id: 'crimson_warden',
    name: 'Shattered Rift Reliquary',
    minCoins: 250,
    maxCoins: 400,
    xpReward: 450,
    drops: [
      { itemId: 'warden_blood_amulet', rarity: 'epic', chance: 1.0, min: 1, max: 1, isGuaranteedFirstKill: true },
      { itemId: 'crimson_warden_core', rarity: 'epic', chance: 1.0, min: 1, max: 1, isGuaranteedFirstKill: true },
      { itemId: 'void_essence_shard', rarity: 'rare', chance: 1.0, min: 2, max: 4 },
      { itemId: 'eclipse_fragment', rarity: 'event-exclusive', chance: 1.0, min: 1, max: 2, requiresEvent: true },
    ],
  },
};

/**
 * Roll items from a data-driven loot table with anti-exploit guarantees
 */
export function rollLoot(
  tableId: string,
  isFirstKill: boolean,
  isEventActive: boolean
): {
  items: { itemId: string; quantity: number; rarity: LootRarity }[];
  coins: number;
  xp: number;
} {
  const table = LOOT_TABLES[tableId];
  if (!table) {
    return { items: [], coins: 0, xp: 0 };
  }

  const rolledItems: { itemId: string; quantity: number; rarity: LootRarity }[] = [];

  for (const drop of table.drops) {
    // If drop requires event (e.g. Red Moon) and event isn't active, skip
    if (drop.requiresEvent && !isEventActive) {
      continue;
    }

    // Check single-grant anti-exploit
    if (drop.isGuaranteedFirstKill) {
      if (isFirstKill) {
        rolledItems.push({
          itemId: drop.itemId,
          quantity: 1,
          rarity: drop.rarity,
        });
      }
      continue;
    }

    // Standard probability roll
    const roll = Math.random();
    if (roll <= drop.chance) {
      const qty = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min;
      if (qty > 0) {
        rolledItems.push({
          itemId: drop.itemId,
          quantity: qty,
          rarity: drop.rarity,
        });
      }
    }
  }

  const coins = Math.floor(Math.random() * (table.maxCoins - table.minCoins + 1)) + table.minCoins;

  return {
    items: rolledItems,
    coins,
    xp: table.xpReward,
  };
}
