/**
 * Comprehensive World Entities & NPC Registry for The Drifting Land.
 * Covers:
 * - Settlers, Researchers, Merchants, Scouts, Travelers, Lost Explorers, and Village Leaders
 * - Special Trading Creatures (Mosskeeper, Drift Collector, Moon Moth, Rift Broker)
 * - Harvestable Nodes and Atmospheric Relic Wisps
 */

import { WorldEntityDefinition } from '../types/game';

export const WORLD_ENTITIES: WorldEntityDefinition[] = [
  // 1. Village Leader: Elder Soren (Verdant Haven Hearth)
  {
    id: 'npc_elder_soren',
    name: 'Elder Soren',
    type: 'NPC',
    role: 'VILLAGE_LEADER',
    roleTitle: 'Leader of Verdant Haven',
    position: [-22, 4.8, -34],
    rotationY: 0,
    interactPrompt: 'Press [E] to Speak with Elder Soren',
    schedule: {
      dayBehavior: 'RESTING',
      nightBehavior: 'RESTING',
      stormBehavior: 'SHELTERING',
      redMoonBehavior: 'GUARDING',
      homePosition: [-22, 4.8, -34],
      shelterPosition: [-25, 4.8, -37],
    },
  },

  // 2. Outpost Merchant: Trader Orin (Verdant Haven Trading Stall)
  {
    id: 'npc_trader_orin',
    name: 'Trader Orin',
    type: 'NPC',
    role: 'MERCHANT',
    roleTitle: 'Settlement Quartermaster',
    tradeCatalogId: 'trader_orin',
    position: [-25, 4.8, -32],
    rotationY: Math.PI / 3,
    interactPrompt: 'Press [E] to Trade with Trader Orin',
    schedule: {
      dayBehavior: 'TRADING',
      nightBehavior: 'TRADING',
      stormBehavior: 'SHELTERING',
      redMoonBehavior: 'SHELTERING',
      homePosition: [-25, 4.8, -32],
      shelterPosition: [-25, 4.8, -37],
    },
  },

  // 3. Settler: Elian the Stonemason (Verdant Haven Forge & Anvil)
  {
    id: 'npc_elian_mason',
    name: 'Elian the Stonemason',
    type: 'NPC',
    role: 'SETTLER',
    roleTitle: 'Homestead Mason & Smith',
    position: [-19, 4.8, -37],
    rotationY: -Math.PI / 4,
    interactPrompt: 'Press [E] to Speak with Elian the Stonemason',
    schedule: {
      dayBehavior: 'WALKING',
      nightBehavior: 'RESTING',
      stormBehavior: 'SHELTERING',
      redMoonBehavior: 'SHELTERING',
      patrolPoints: [
        [-19, 4.8, -37],
        [-17, 4.8, -35],
        [-20, 4.8, -33],
      ],
      homePosition: [-19, 4.8, -37],
      shelterPosition: [-25, 4.8, -37],
    },
  },

  // 4. Settler: Mira the Homesteader (Verdant Haven Garden Beds)
  {
    id: 'npc_mira_homesteader',
    name: 'Mira the Homesteader',
    type: 'NPC',
    role: 'SETTLER',
    roleTitle: 'Botanist & Hearthkeeper',
    position: [-27, 4.8, -37],
    rotationY: Math.PI / 2,
    interactPrompt: 'Press [E] to Speak with Mira the Homesteader',
    schedule: {
      dayBehavior: 'WALKING',
      nightBehavior: 'RESTING',
      stormBehavior: 'SHELTERING',
      redMoonBehavior: 'SHELTERING',
      patrolPoints: [
        [-27, 4.8, -37],
        [-26, 4.8, -35],
        [-28, 4.8, -33],
      ],
      homePosition: [-27, 4.8, -37],
      shelterPosition: [-25, 4.8, -37],
    },
  },

  // 5. Traveler: Wayfarer Ren (Resting at Campfire)
  {
    id: 'npc_wayfarer_ren',
    name: 'Wayfarer Ren',
    type: 'NPC',
    role: 'TRAVELER',
    roleTitle: 'Wandering Drift Explorer',
    position: [-20, 4.8, -32],
    rotationY: -Math.PI / 2,
    interactPrompt: 'Press [E] to Rest & Converse with Wayfarer Ren',
    schedule: {
      dayBehavior: 'RESTING',
      nightBehavior: 'RESTING',
      stormBehavior: 'SHELTERING',
      redMoonBehavior: 'GUARDING',
      homePosition: [-20, 4.8, -32],
      shelterPosition: [-25, 4.8, -37],
    },
  },

  // 6. Researcher: Surveyor Kaelen (Research Camp)
  {
    id: 'npc_surveyor_kaelen',
    name: 'Surveyor Kaelen',
    type: 'NPC',
    role: 'RESEARCHER',
    roleTitle: 'Verdant Reach Cartographer',
    position: [12, 4.5, 28],
    rotationY: -Math.PI / 4,
    interactPrompt: 'Press [E] to Speak with Surveyor Kaelen',
    schedule: {
      dayBehavior: 'WALKING',
      nightBehavior: 'RESTING',
      stormBehavior: 'SHELTERING',
      redMoonBehavior: 'SHELTERING',
      patrolPoints: [
        [12, 4.5, 28],
        [10, 4.5, 26],
        [14, 4.5, 25],
      ],
      homePosition: [12, 4.5, 28],
      shelterPosition: [12, 4.5, 28],
    },
  },

  // 7. Researcher: Archivist Vaelen (Monolith Beacon Dais)
  {
    id: 'npc_archivist_vaelen',
    name: 'Archivist Vaelen',
    type: 'NPC',
    role: 'RESEARCHER',
    roleTitle: 'Scholar of the First Drift',
    position: [4, 4.5, -4],
    rotationY: Math.PI / 6,
    interactPrompt: 'Press [E] to Consult Archivist Vaelen',
    schedule: {
      dayBehavior: 'RESTING',
      nightBehavior: 'RESTING',
      stormBehavior: 'SHELTERING',
      redMoonBehavior: 'SHELTERING',
      homePosition: [4, 4.5, -4],
      shelterPosition: [0, 4.5, 0],
    },
  },

  // 8. Scout: Scout Kira (Ruined Watchtower)
  {
    id: 'npc_scout_kira',
    name: 'Scout Kira',
    type: 'NPC',
    role: 'SCOUT',
    roleTitle: 'Watchtower Lookout',
    position: [38, 12.0, 25],
    rotationY: -Math.PI / 3,
    interactPrompt: 'Press [E] to Speak with Scout Kira',
    schedule: {
      dayBehavior: 'GUARDING',
      nightBehavior: 'GUARDING',
      stormBehavior: 'GUARDING',
      redMoonBehavior: 'GUARDING',
      homePosition: [38, 12.0, 25],
      shelterPosition: [38, 12.0, 25],
    },
  },

  // 9. Lost Explorer: Fenn the Stranded Cartographer (Western Chasm Cliffs)
  {
    id: 'npc_fenn_cartographer',
    name: 'Fenn the Stranded',
    type: 'NPC',
    role: 'LOST_EXPLORER',
    roleTitle: 'Shipwrecked Cartographer',
    position: [-44, 5.0, 12],
    rotationY: Math.PI / 4,
    interactPrompt: 'Press [E] to Aid Fenn the Stranded Cartographer',
    schedule: {
      dayBehavior: 'RESTING',
      nightBehavior: 'RESTING',
      stormBehavior: 'SHELTERING',
      redMoonBehavior: 'SHELTERING',
      homePosition: [-44, 5.0, 12],
      shelterPosition: [-44, 5.0, 12],
    },
  },

  // 10. Trading Creature: The Mosskeeper (Elder Grove, Daytime)
  {
    id: 'npc_mosskeeper',
    name: 'The Mosskeeper',
    type: 'TRADER',
    role: 'TRADING_CREATURE',
    roleTitle: 'Primordial Grove Guardian',
    tradeCatalogId: 'trader_mosskeeper',
    position: [-34, 4.8, 18],
    rotationY: 0,
    interactPrompt: 'Press [E] to Commune & Trade with The Mosskeeper',
    schedule: {
      dayBehavior: 'TRADING',
      nightBehavior: 'RESTING',
      stormBehavior: 'RESTING',
      redMoonBehavior: 'SHELTERING',
      homePosition: [-34, 4.8, 18],
      shelterPosition: [-34, 4.8, 18],
    },
  },

  // 11. Trading Creature: The Drift Collector (Eastern Ridge, Afternoon/Sunset)
  {
    id: 'npc_drift_collector',
    name: 'The Drift Collector',
    type: 'TRADER',
    role: 'TRADING_CREATURE',
    roleTitle: 'Nomad Scavenger',
    tradeCatalogId: 'trader_collector',
    position: [40, 6.2, -12],
    rotationY: -Math.PI / 4,
    interactPrompt: 'Press [E] to Barter with The Drift Collector',
    schedule: {
      dayBehavior: 'TRADING',
      nightBehavior: 'SHELTERING',
      stormBehavior: 'SHELTERING',
      redMoonBehavior: 'SHELTERING',
      homePosition: [40, 6.2, -12],
      shelterPosition: [40, 6.2, -12],
    },
  },

  // 12. Trading Creature: The Moon Moth (Beacon Clearing, Night/Red Moon)
  {
    id: 'npc_moon_moth',
    name: 'The Moon Moth',
    type: 'TRADER',
    role: 'TRADING_CREATURE',
    roleTitle: 'Luminescent Night Entity',
    tradeCatalogId: 'trader_moon_moth',
    position: [2, 5.0, 6],
    rotationY: Math.PI / 2,
    interactPrompt: 'Press [E] to Trade with The Moon Moth',
    schedule: {
      dayBehavior: 'RESTING',
      nightBehavior: 'TRADING',
      stormBehavior: 'TRADING',
      redMoonBehavior: 'TRADING',
      homePosition: [2, 5.0, 6],
      shelterPosition: [2, 5.0, 6],
    },
  },

  // 13. Trading Creature: The Rift Broker (Shattered Gateway & Rift)
  {
    id: 'npc_rift_broker',
    name: 'The Rift Broker',
    type: 'TRADER',
    role: 'TRADING_CREATURE',
    roleTitle: 'Shrouded Dimensional Dealer',
    tradeCatalogId: 'trader_rift_broker',
    position: [-48, 5.5, -18],
    rotationY: -Math.PI / 2,
    interactPrompt: 'Press [E] to Trade with The Rift Broker',
    schedule: {
      dayBehavior: 'TRADING',
      nightBehavior: 'TRADING',
      stormBehavior: 'TRADING',
      redMoonBehavior: 'TRADING',
      homePosition: [-48, 5.5, -18],
      shelterPosition: [-48, 5.5, -18],
    },
  },

  // Harvestable Resource Nodes
  {
    id: 'node_moss_north',
    name: 'Verdant Moss Patch',
    type: 'COLLECTIBLE',
    position: [-10, 4.8, 18],
    drops: [{ itemId: 'verdant_moss_fiber', chance: 1.0, min: 1, max: 2 }],
    interactPrompt: 'Press [E] to Forage Verdant Moss',
  },
  {
    id: 'node_moss_west',
    name: 'Verdant Moss Patch',
    type: 'COLLECTIBLE',
    position: [-24, 5.2, -12],
    drops: [{ itemId: 'verdant_moss_fiber', chance: 1.0, min: 1, max: 3 }],
    interactPrompt: 'Press [E] to Forage Verdant Moss',
  },
  {
    id: 'node_bloom_south',
    name: 'Drift Bloom Nectar Node',
    type: 'COLLECTIBLE',
    position: [18, 4.2, 22],
    drops: [{ itemId: 'drift_bloom_nectar', chance: 1.0, min: 1, max: 2 }],
    interactPrompt: 'Press [E] to Harvest Drift Bloom Nectar',
  },
  {
    id: 'critter_wisp_1',
    name: 'Luminescent Aether Wisp',
    type: 'CREATURE',
    position: [14, 5.5, -8],
    drops: [{ itemId: 'celestial_dust', chance: 0.8, min: 1, max: 2 }],
    interactPrompt: 'Press [E] to Gather Celestial Dust',
  },
  {
    id: 'critter_wisp_2',
    name: 'Luminescent Aether Wisp',
    type: 'CREATURE',
    position: [-20, 6.0, 24],
    drops: [{ itemId: 'celestial_dust', chance: 0.8, min: 1, max: 2 }],
    interactPrompt: 'Press [E] to Gather Celestial Dust',
  },
  {
    id: 'node_bloodroot_1',
    name: 'Bloodroot Orchid',
    type: 'COLLECTIBLE',
    position: [-46, 4.0, -38],
    drops: [{ itemId: 'bloodroot_orchid', chance: 1.0, min: 1, max: 2 }],
    interactPrompt: 'Press [E] to Harvest Bloodroot Orchid',
  },
  {
    id: 'critter_crimson_wisp',
    name: 'Mutated Crimson Wisp',
    type: 'CREATURE',
    position: [-48, 5.0, -42],
    drops: [{ itemId: 'blood_essence', chance: 1.0, min: 1, max: 2 }],
    interactPrompt: 'Press [E] to Siphon Volatile Blood Essence',
  },
];
