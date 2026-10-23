/**
 * Data-driven item catalog for The Drifting Land.
 * Covers resources, relics, consumables, gear, and quest items.
 */

import { ItemDefinition } from '../types/game';

export const ITEM_CATALOG: Record<string, ItemDefinition> = {
  // Consumables & Sustenance
  drift_bloom_nectar: {
    id: 'drift_bloom_nectar',
    name: 'Drift Bloom Nectar',
    description: 'Sweet luminous dew extracted from flora hanging over the island edge.',
    rarity: 'common',
    category: 'consumable',
    value: 12,
    stackable: true,
    maxStack: 20,
    icon: 'droplet',
    lore: 'Provides vital hydration in the high-altitude breezes of the archipelago.',
    statsEffect: {
      heal: 35,
      stamina: 20,
    },
  },
  traveler_rations: {
    id: 'traveler_rations',
    name: 'Preserved Sun-Grain Rations',
    description: 'Dense dried provisions favored by island surveyors and scouts.',
    rarity: 'common',
    category: 'consumable',
    value: 8,
    stackable: true,
    maxStack: 30,
    icon: 'apple',
    statsEffect: {
      heal: 25,
      stamina: 50,
    },
  },
  aether_surge_tonic: {
    id: 'aether_surge_tonic',
    name: 'Aether Surge Tonic',
    description: 'A shimmering distillation of atmospheric energy that accelerates reflex speeds.',
    rarity: 'rare',
    category: 'consumable',
    value: 65,
    stackable: true,
    maxStack: 10,
    icon: 'zap',
    lore: 'Brewed from crushed solar crystals and morning mist.',
    statsEffect: {
      stamina: 100,
      speedBoostDuration: 15,
    },
  },

  // Resources & Crafting
  verdant_moss_fiber: {
    id: 'verdant_moss_fiber',
    name: 'Verdant Moss Fiber',
    description: 'Tough, resilient plant strands harvested from ancient stone columns.',
    rarity: 'common',
    category: 'resource',
    value: 6,
    stackable: true,
    maxStack: 64,
    icon: 'feather',
    lore: 'Used by nomads to bind timber, repair cloaks, and weave rope.',
  },
  ancient_basalt_slate: {
    id: 'ancient_basalt_slate',
    name: 'Ancient Basalt Slate',
    description: 'Carved volcanic slab infused with primordial anti-gravitational minerals.',
    rarity: 'uncommon',
    category: 'resource',
    value: 24,
    stackable: true,
    maxStack: 32,
    icon: 'box',
    lore: 'Its weight decreases as the island ascends into the sunward jet streams.',
  },
  celestial_dust: {
    id: 'celestial_dust',
    name: 'Celestial Dust',
    description: 'Fine glowing particles left behind in the wake of migrating aether wisps.',
    rarity: 'rare',
    category: 'resource',
    value: 50,
    stackable: true,
    maxStack: 50,
    icon: 'sparkles',
    lore: 'Gathers on altar crests on clear starry nights.',
  },

  // Key Relics
  shard_verdant_heart: {
    id: 'shard_verdant_heart',
    name: 'Verdant Heart Shard',
    description: 'One of the four primal keystone fragments that anchor The Verdant Reach.',
    rarity: 'epic',
    category: 'relic',
    value: 250,
    stackable: false,
    maxStack: 1,
    icon: 'gem',
    lore: 'Vibrates with subterranean song when held near the monolith beacon.',
  },
  shard_sunward_ridge: {
    id: 'shard_sunward_ridge',
    name: 'Sunward Crest Shard',
    description: 'A solar-aligned keystone fragment salvaged from the eastern ridge.',
    rarity: 'epic',
    category: 'relic',
    value: 250,
    stackable: false,
    maxStack: 1,
    icon: 'sun',
  },
  shard_elder_groove: {
    id: 'shard_elder_groove',
    name: 'Elder Spire Relic',
    description: 'A keystone fragment steeped in ancient forgotten geometry.',
    rarity: 'epic',
    category: 'relic',
    value: 250,
    stackable: false,
    maxStack: 1,
    icon: 'shield',
  },
  shard_waterfall_basin: {
    id: 'shard_waterfall_basin',
    name: 'Tears of Aether',
    description: 'A crystallized drop of the cosmic rift that severed the continents.',
    rarity: 'epic',
    category: 'relic',
    value: 250,
    stackable: false,
    maxStack: 1,
    icon: 'compass',
  },

  // Currencies & Valuables
  sunstone_coin: {
    id: 'sunstone_coin',
    name: 'Sunstone Coin',
    description: 'Minted from compressed solar shale; accepted by wandering cartographers.',
    rarity: 'uncommon',
    category: 'currency',
    value: 1,
    stackable: true,
    maxStack: 9999,
    icon: 'coins',
  },
  aether_core_prism: {
    id: 'aether_core_prism',
    name: 'Aether Core Prism',
    description: 'Rare celestial matrix extracted from fully awakened beacons.',
    rarity: 'legendary',
    category: 'relic',
    value: 500,
    stackable: true,
    maxStack: 5,
    icon: 'star',
    lore: 'Powers regional portals connecting to adjacent drifting landmasses.',
  },
};

export function getItemDef(id: string): ItemDefinition | undefined {
  return ITEM_CATALOG[id];
}
