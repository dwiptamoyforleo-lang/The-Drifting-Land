/**
 * Data-driven quest definitions for The Drifting Land.
 */

import { QuestDefinition } from '../types/game';

export const QUEST_CATALOG: Record<string, QuestDefinition> = {
  quest_awaken_beacon: {
    id: 'quest_awaken_beacon',
    title: 'Awakening The Verdant Reach',
    giverName: 'Ancient Inscription',
    regionId: 'verdant_reach',
    description: 'Restore celestial power to the central Monolith Beacon by recovering the four lost elemental Drift Shards scattered across the floating isle.',
    loreSnippet: 'When the four keystones reunite, the ancient beacon will rekindle its aether beacon to guide lost voyagers.',
    objectives: [
      {
        id: 'obj_gather_shards',
        description: 'Collect all 4 Drift Shards across the archipelago',
        targetCount: 4,
        currentCount: 0,
        completed: false,
        type: 'COLLECT',
      },
      {
        id: 'obj_activate_monolith',
        description: 'Interact with the central dais to awaken the Ancient Monolith Beacon',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'ACTIVATE_BEACON',
        targetId: 'verdant_monolith_beacon',
      },
    ],
    rewards: {
      experience: 500,
      coins: 150,
      items: [
        { itemId: 'aether_surge_tonic', quantity: 2 },
        { itemId: 'aether_core_prism', quantity: 1 },
      ],
    },
  },

  quest_herbs_of_vale: {
    id: 'quest_herbs_of_vale',
    title: 'Botanist of the Islets',
    giverName: 'Surveyor Kaelen',
    regionId: 'verdant_reach',
    description: 'Forage Verdant Moss Fiber from the ancient stone ruins to aid the wandering expedition.',
    loreSnippet: 'The moss absorbs aether from passing mist, making it an indispensable binding agent.',
    objectives: [
      {
        id: 'obj_gather_moss',
        description: 'Forage Verdant Moss Fibers',
        targetCount: 3,
        currentCount: 0,
        completed: false,
        type: 'COLLECT',
        targetId: 'verdant_moss_fiber',
      },
    ],
    rewards: {
      experience: 150,
      coins: 45,
      items: [
        { itemId: 'traveler_rations', quantity: 3 },
      ],
    },
  },

  quest_survey_ruins: {
    id: 'quest_survey_ruins',
    title: 'Echoes of the Great Drift',
    giverName: 'Surveyor Kaelen',
    regionId: 'verdant_reach',
    description: 'Explore and discover the three historic ruin viewpoints overlooking the cloud sea.',
    loreSnippet: 'The fracture lines along the stone pillars match the celestial constellations.',
    objectives: [
      {
        id: 'obj_discover_overlook',
        description: 'Discover the Sunward Promontory Waystone',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'DISCOVER',
        targetId: 'cp_eastern_ridge',
      },
      {
        id: 'obj_discover_canopy',
        description: 'Discover the Sunken Ruin Sanctum Waystone',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'DISCOVER',
        targetId: 'cp_elder_groove',
      },
    ],
    rewards: {
      experience: 250,
      coins: 80,
      items: [
        { itemId: 'drift_bloom_nectar', quantity: 4 },
      ],
    },
  },

  quest_blood_moon_eclipse: {
    id: 'quest_blood_moon_eclipse',
    title: 'The Blood Moon Eclipse',
    giverName: 'Celestial Omen',
    regionId: 'verdant_reach',
    description: 'An ancient rift has opened beneath the blood moon at the western crater. Confront the Crimson Warden and claim the fallen celestial core.',
    loreSnippet: 'When the sky bleeds crimson, the forgotten warden emerges from the void fracture to test the unworthy.',
    objectives: [
      {
        id: 'obj_gather_bloodroot',
        description: 'Forage a rare Bloodroot Orchid under the eclipse',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'COLLECT',
        targetId: 'bloodroot_orchid',
      },
      {
        id: 'obj_defeat_warden',
        description: 'Defeat the Crimson Warden at the Shattered Rift Crater',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'DEFEAT_BOSS',
        targetId: 'crimson_warden',
      },
    ],
    rewards: {
      experience: 400,
      coins: 150,
      items: [
        { itemId: 'wardens_blood_amulet', quantity: 1 },
      ],
    },
  },
  quest_lost_civilization: {
    id: 'quest_lost_civilization',
    title: 'Relics of the Lost Pioneers',
    giverName: 'Surveyor Field Log',
    regionId: 'verdant_reach',
    description: 'Investigate the forgotten pioneer settlement, cross the gorge suspension bridge, unlock the sunken sanctum gate, and uncover the secret chamber of the first drift.',
    loreSnippet: 'The pioneers left their records in the hollow settlement before the skies fractured.',
    objectives: [
      {
        id: 'obj_discover_settlement',
        description: 'Explore the Hollow Drift Homestead [-22, -35]',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'DISCOVER',
        targetId: 'disc_abandoned_settlement',
      },
      {
        id: 'obj_cross_bridge',
        description: 'Cross the River Gorge Suspension Bridge [24, -10]',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'DISCOVER',
        targetId: 'disc_suspended_bridge',
      },
      {
        id: 'obj_unlock_gate',
        description: 'Unlock the Sunken Sanctum Gate [-38, 22]',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'DISCOVER',
        targetId: 'disc_locked_door',
      },
      {
        id: 'obj_hidden_chamber',
        description: 'Uncover the Hidden Subterranean Chamber [-48, -8]',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'DISCOVER',
        targetId: 'disc_hidden_chamber',
      },
    ],
    rewards: {
      experience: 350,
      coins: 120,
      items: [
        { itemId: 'aether_surge_tonic', quantity: 1 },
        { itemId: 'traveler_rations', quantity: 2 },
      ],
    },
  },
};
