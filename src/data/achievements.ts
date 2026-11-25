/**
 * Data definitions for Achievements in The Drifting Land.
 * Implements Prompt 8:
 * - Achievements for discoveries, collection milestones, quests, checkpoints, dimensions, and rare events.
 * - Single-grant rewards tracking.
 */
import { AchievementDefinition, ExplorationRankInfo } from '../types/game';

export const ACHIEVEMENTS_CATALOG: Record<string, AchievementDefinition> = {
  ach_first_steps: {
    id: 'ach_first_steps',
    title: 'First Footsteps',
    description: 'Awaken and survey the floating archipelago of The Verdant Reach.',
    category: 'discovery',
    icon: 'compass',
    rewards: {
      experience: 50,
      coins: 25,
    },
  },
  ach_beacon_ignited: {
    id: 'ach_beacon_ignited',
    title: 'Beacon of the Expanse',
    description: 'Awaken the Ancient Monolith Beacon to rekindle the regional sky-line.',
    category: 'checkpoints',
    icon: 'sparkles',
    rewards: {
      experience: 100,
      coins: 50,
    },
  },
  ach_all_shards: {
    id: 'ach_all_shards',
    title: 'Relic Hunter',
    description: 'Recover all 4 primordial Drift Shards scattered across the archipelago.',
    category: 'collection',
    icon: 'gem',
    rewards: {
      experience: 250,
      coins: 100,
    },
  },
  ach_master_botanist: {
    id: 'ach_master_botanist',
    title: 'Botanist of the Clouds',
    description: 'Harvest all 7 rare sky plants including Moonbloom, Lumenvine, and Rift Orchid.',
    category: 'collection',
    icon: 'flower',
    rewards: {
      experience: 200,
      coins: 75,
    },
  },
  ach_artisan: {
    id: 'ach_artisan',
    title: 'Skies Artisan',
    description: 'Craft your first field tool or wearable equipment at the workbench.',
    category: 'crafting',
    icon: 'hammer',
    rewards: {
      experience: 75,
      coins: 40,
    },
  },
  ach_ruins_explorer: {
    id: 'ach_ruins_explorer',
    title: 'Archaeologist of the Cataclysm',
    description: 'Investigate 3 ancient ruins and transcribe forgotten records of the Great Drift.',
    category: 'discovery',
    icon: 'scroll',
    rewards: {
      experience: 150,
      coins: 60,
    },
  },
  ach_undercroft: {
    id: 'ach_undercroft',
    title: 'Chamber Raider',
    description: 'Unseal and explore a concealed subterranean vault or hidden undercroft.',
    category: 'discovery',
    icon: 'key',
    rewards: {
      experience: 180,
      coins: 80,
    },
  },
  ach_red_moon_survivor: {
    id: 'ach_red_moon_survivor',
    title: 'Survivor of the Crimson Moon',
    description: 'Survive a rare Red Moon night until the morning sunlight returns.',
    category: 'event',
    icon: 'moon',
    rewards: {
      experience: 300,
      coins: 150,
    },
  },
  ach_warden_slayer: {
    id: 'ach_warden_slayer',
    title: 'Bane of the Crimson Warden',
    description: 'Confront and defeat the colossal Crimson Warden during the eclipse.',
    category: 'boss',
    icon: 'skull',
    rewards: {
      experience: 500,
      coins: 250,
    },
  },
  ach_warden_slain: {
    id: 'ach_warden_slain',
    title: 'Bane of the Crimson Warden',
    description: 'Confront and defeat the colossal Crimson Warden during the eclipse.',
    category: 'boss',
    icon: 'skull',
    rewards: {
      experience: 500,
      coins: 250,
    },
  },
  ach_combat_victor: {
    id: 'ach_combat_victor',
    title: 'Frontier Vanquisher',
    description: 'Win your first combat engagement against hostile island creatures.',
    category: 'boss',
    icon: 'sword',
    rewards: {
      experience: 100,
      coins: 50,
    },
  },
  ach_grove_conquered: {
    id: 'ach_grove_conquered',
    title: 'Primal Awakening',
    description: 'Defeat the Rootbound Guardian in the Overgrown Grove Altar.',
    category: 'boss',
    icon: 'sprout',
    rewards: {
      experience: 350,
      coins: 180,
    },
  },
  ach_colossus_conquered: {
    id: 'ach_colossus_conquered',
    title: 'Heart of Cinders',
    description: 'Extinguish the molten volcanic fury of the Ash Colossus.',
    category: 'boss',
    icon: 'flame',
    rewards: {
      experience: 400,
      coins: 200,
    },
  },
  ach_storm_conquered: {
    id: 'ach_storm_conquered',
    title: 'Eye of the Gale',
    description: 'Silence the tempest resonance of the Storm Sentinel atop Windward Promontory.',
    category: 'boss',
    icon: 'zap',
    rewards: {
      experience: 420,
      coins: 220,
    },
  },
  ach_archive_conquered: {
    id: 'ach_archive_conquered',
    title: 'Keeper of Forgotten Truths',
    description: 'Overcome the Archive Keeper in the Sunken Undercroft Vault.',
    category: 'boss',
    icon: 'key',
    rewards: {
      experience: 450,
      coins: 240,
    },
  },
  ach_sovereign_conquered: {
    id: 'ach_sovereign_conquered',
    title: 'Beyond the Dimensional Veil',
    description: 'Vanquish the Rift Sovereign at the Dimensional Gateway Nexus.',
    category: 'boss',
    icon: 'sparkles',
    rewards: {
      experience: 600,
      coins: 350,
    },
  },
  ach_rank_master: {
    id: 'ach_rank_master',
    title: 'Master of the Expanse',
    description: 'Attain the supreme Exploration Rank 5 by surveying the archipelago.',
    category: 'progression',
    icon: 'award',
    rewards: {
      experience: 400,
      coins: 200,
    },
  },
  ach_all_checkpoints: {
    id: 'ach_all_checkpoints',
    title: 'Wayfarer of the Sanctuaries',
    description: 'Discover and harmonize with all 3 ancient waystone beacons across the islands.',
    category: 'checkpoints',
    icon: 'map-pin',
    rewards: {
      experience: 200,
      coins: 100,
    },
  },
  ach_portal_pioneer: {
    id: 'ach_portal_pioneer',
    title: 'Aether Voyager',
    description: 'Discover the Dimensional Gateway and inspect the keystones for traversal.',
    category: 'discovery',
    icon: 'radio',
    rewards: {
      experience: 250,
      coins: 120,
    },
  },
};

export const EXPLORATION_RANKS: ExplorationRankInfo[] = [
  {
    rank: 1,
    title: 'Stranded Wanderer',
    requiredXp: 0,
    perkName: 'Wanderer Instinct',
    perkDescription: 'Basic survival instincts in the uncharted sky archipelago.',
  },
  {
    rank: 2,
    title: 'Island Surveyor',
    requiredXp: 150,
    perkName: 'Keen Eye',
    perkDescription: '+25% discovery detection radius on HUD and regional map.',
  },
  {
    rank: 3,
    title: 'Drift Pathfinder',
    requiredXp: 400,
    perkName: 'Fleetfoot',
    perkDescription: '+10% movement speed and -15% stamina consumption during sprinting.',
  },
  {
    rank: 4,
    title: 'Aether Cartographer',
    requiredXp: 800,
    perkName: 'Abundant Harvest',
    perkDescription: 'Harvesting wild flora and surface deposits yields +1 bonus material.',
  },
  {
    rank: 5,
    title: 'Master of the Expanse',
    requiredXp: 1400,
    perkName: 'Resonance Attunement',
    perkDescription: '+25% faster health and stamina regeneration across all biomes.',
  },
];
