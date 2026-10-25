/**
 * Data-driven world entity catalog for The Drifting Land.
 */

import { WorldEntityDefinition } from '../types/game';

export const WORLD_ENTITIES: WorldEntityDefinition[] = [
  // NPC: Surveyor Kaelen
  {
    id: 'npc_surveyor_kaelen',
    name: 'Surveyor Kaelen',
    type: 'NPC',
    position: [6, 4.2, 5],
    rotationY: -Math.PI / 4,
    dialogue: [
      'Greetings, explorer! The air on The Verdant Reach carries the scent of ancient resin today.',
      'The central beacon has slumbered since the Great Drift divided the realms.',
      'If you recover the four elemental shards and place them on the dais, we might open the driftway to the Sunward Spire!',
      'Take these provisions—the winds beyond the tree line can chill even seasoned scouts.',
    ],
    interactPrompt: 'Press [E] or Tap to Speak with Surveyor Kaelen',
  },

  // Harvestable Resource Node 1: North Grove
  {
    id: 'node_moss_north',
    name: 'Verdant Moss Patch',
    type: 'COLLECTIBLE',
    position: [-10, 4.8, 18],
    drops: [{ itemId: 'verdant_moss_fiber', chance: 1.0, min: 1, max: 2 }],
    interactPrompt: 'Press [E] to Forage Verdant Moss',
  },

  // Harvestable Resource Node 2: West Basalt Outcrop
  {
    id: 'node_moss_west',
    name: 'Verdant Moss Patch',
    type: 'COLLECTIBLE',
    position: [-24, 5.2, -12],
    drops: [{ itemId: 'verdant_moss_fiber', chance: 1.0, min: 1, max: 3 }],
    interactPrompt: 'Press [E] to Forage Verdant Moss',
  },

  // Harvestable Resource Node 3: South Basin
  {
    id: 'node_bloom_south',
    name: 'Drift Bloom Nectar Node',
    type: 'COLLECTIBLE',
    position: [18, 4.2, 22],
    drops: [{ itemId: 'drift_bloom_nectar', chance: 1.0, min: 1, max: 2 }],
    interactPrompt: 'Press [E] to Harvest Drift Bloom Nectar',
  },

  // Aether Wisp Critters (fluttering atmospheric entities)
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

  // Red Moon Exclusive Flora (Blooms only during eclipse)
  {
    id: 'node_bloodroot_1',
    name: 'Bloodroot Orchid',
    type: 'COLLECTIBLE',
    position: [-46, 4.0, -38],
    drops: [{ itemId: 'bloodroot_orchid', chance: 1.0, min: 1, max: 2 }],
    interactPrompt: 'Press [E] to Harvest Bloodroot Orchid',
  },
  {
    id: 'node_bloodroot_2',
    name: 'Bloodroot Orchid',
    type: 'COLLECTIBLE',
    position: [-58, 4.0, -48],
    drops: [{ itemId: 'bloodroot_orchid', chance: 1.0, min: 1, max: 3 }],
    interactPrompt: 'Press [E] to Harvest Bloodroot Orchid',
  },

  // Red Moon Exclusive Mutated Wisp
  {
    id: 'critter_crimson_wisp',
    name: 'Mutated Crimson Wisp',
    type: 'CREATURE',
    position: [-48, 5.0, -42],
    drops: [{ itemId: 'blood_essence', chance: 1.0, min: 1, max: 2 }],
    interactPrompt: 'Press [E] to Siphon Volatile Blood Essence',
  },
];
