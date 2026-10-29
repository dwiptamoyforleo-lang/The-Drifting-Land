/**
 * Crafting Recipes Catalog for The Drifting Land.
 * Data-driven contracts defining ingredients, outputs, craft stations, and categories.
 */

import { CraftingRecipe } from '../types/game';

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // --- 1. Tools ---
  {
    id: 'recipe_basic_pickaxe',
    name: "Surveyor's Stone Pickaxe",
    category: 'tools',
    description: 'Craft a sturdy pickaxe from driftwood fragments and basalt river pebbles.',
    ingredients: [
      { itemId: 'driftwood_branch', quantity: 2 },
      { itemId: 'basalt_pebble', quantity: 3 },
    ],
    result: {
      itemId: 'basic_stone_pickaxe',
      quantity: 1,
    },
    station: 'any',
    icon: 'wrench',
  },
  {
    id: 'recipe_sunward_blade',
    name: 'Tempered Sunward Machete',
    category: 'tools',
    description: 'Forge an improved gathering tool from celestial Aetherium ore and Lumicite crystals.',
    ingredients: [
      { itemId: 'aetherium_ore', quantity: 2 },
      { itemId: 'lumicite_shard', quantity: 2 },
      { itemId: 'driftwood_branch', quantity: 2 },
    ],
    result: {
      itemId: 'sunward_blade',
      quantity: 1,
    },
    station: 'any',
    icon: 'shield',
  },

  // --- 2. Equipment ---
  {
    id: 'recipe_aether_lantern',
    name: 'Aether Brass Lantern',
    category: 'equipment',
    description: 'Construct a wearable brass lantern fueled by glowing Lumenvine fibers to illuminate night traversal.',
    ingredients: [
      { itemId: 'lumenvine_fiber', quantity: 3 },
      { itemId: 'driftwood_branch', quantity: 2 },
    ],
    result: {
      itemId: 'aether_lantern',
      quantity: 1,
    },
    station: 'any',
    icon: 'sparkles',
  },
  {
    id: 'recipe_surveyor_goggles',
    name: 'Astrolabe Surveyor Goggles',
    category: 'equipment',
    description: 'Fashion optical survey goggles with prismatic glassleaf shards and Lumicite crystals.',
    ingredients: [
      { itemId: 'glassleaf_shard', quantity: 2 },
      { itemId: 'lumicite_shard', quantity: 2 },
      { itemId: 'basalt_pebble', quantity: 2 },
    ],
    result: {
      itemId: 'celestial_surveyor_goggles',
      quantity: 1,
    },
    station: 'any',
    icon: 'eye',
  },
  {
    id: 'recipe_void_cloak',
    name: 'Voidweave Traveler Cloak',
    category: 'equipment',
    description: 'Weave an agile dimensional mantle from rare Rift Orchid blossoms and Blood Essence.',
    ingredients: [
      { itemId: 'rift_orchid_blossom', quantity: 1 },
      { itemId: 'blood_essence', quantity: 2 },
      { itemId: 'driftwood_branch', quantity: 2 },
    ],
    result: {
      itemId: 'void_rift_cloak',
      quantity: 1,
    },
    station: 'any',
    icon: 'shield',
  },
  {
    id: 'recipe_dimensional_amulet',
    name: 'Amulet of Astral Attunement',
    category: 'equipment',
    description: 'Channel dimensional materials and rare minerals to forge a legendary protective amulet.',
    ingredients: [
      { itemId: 'rift_orchid_blossom', quantity: 2 },
      { itemId: 'aetherium_ore', quantity: 3 },
      { itemId: 'glassleaf_shard', quantity: 2 },
    ],
    result: {
      itemId: 'dimensional_amulet',
      quantity: 1,
    },
    station: 'any',
    icon: 'sparkles',
  },

  // --- 3. Structure Maintenance & Repair ---
  {
    id: 'recipe_repair_kit',
    name: 'Monolith Conduit Repair Kit',
    category: 'structures',
    description: 'Combine ancient basalt slates with driftwood and lumenvine to prepare structural repair slurry.',
    ingredients: [
      { itemId: 'ancient_basalt_slate', quantity: 1 },
      { itemId: 'driftwood_branch', quantity: 3 },
      { itemId: 'lumenvine_fiber', quantity: 2 },
    ],
    result: {
      itemId: 'keystone_repair_kit',
      quantity: 1,
    },
    station: 'any',
    icon: 'wrench',
  },

  // --- 4. Recovery & Potions ---
  {
    id: 'recipe_herbal_salve',
    name: 'Whisper Moss Salve',
    category: 'recovery',
    description: 'Pound damp whisper moss into flower nectar to brew a fast-acting healing salve (+45 Health).',
    ingredients: [
      { itemId: 'whisper_moss_clump', quantity: 2 },
      { itemId: 'drift_bloom_nectar', quantity: 1 },
    ],
    result: {
      itemId: 'herbal_salve',
      quantity: 1,
    },
    station: 'any',
    icon: 'droplet',
  },
  {
    id: 'recipe_elixir_clarity',
    name: 'Moonbloom Clarity Elixir',
    category: 'recovery',
    description: 'Distill nocturnal moonbloom petals into nectar to fully replenish stamina reserves (+100 Stamina).',
    ingredients: [
      { itemId: 'moonbloom_petal', quantity: 2 },
      { itemId: 'drift_bloom_nectar', quantity: 1 },
    ],
    result: {
      itemId: 'elixir_of_clarity',
      quantity: 1,
    },
    station: 'any',
    icon: 'droplet',
  },
  {
    id: 'recipe_ember_surge',
    name: 'Emberfern Surge Brew',
    category: 'recovery',
    description: 'Steep warm emberfern fronds into tonic for instant vitality and a 20s speed boost.',
    ingredients: [
      { itemId: 'emberfern_frond', quantity: 2 },
      { itemId: 'drift_bloom_nectar', quantity: 1 },
    ],
    result: {
      itemId: 'ember_surge_tonic',
      quantity: 1,
    },
    station: 'any',
    icon: 'flame',
  },
];

export function getRecipeDef(id: string): CraftingRecipe | undefined {
  return CRAFTING_RECIPES.find((r) => r.id === id);
}
