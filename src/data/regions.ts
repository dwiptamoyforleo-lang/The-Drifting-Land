/**
 * Data-driven definitions for Dimensions, Regions, and Checkpoints in The Drifting Land.
 * Implements Prompt 11:
 * - 5 Dimensions: The Living Reach, The Ashen Expanse, The Moonveil, The Fractured Archive, The Rift
 * - 6 Planned Destinations / Regions:
 *   1. The Verdant Reach (forests, rivers, settlements, ruins, early quests)
 *   2. The Shattered Highlands (cliffs, floating islands, wind currents, difficult traversal)
 *   3. The Ashen Expanse (volcanic rock, heat-adapted flora, rare minerals, dangerous encounters)
 *   4. The Sunken Archive (forgotten technology, environmental puzzles, ancient records)
 *   5. The Moonveil Wilds (luminous plants, unusual wildlife, night-dependent discoveries)
 *   6. The Rift Frontier (unstable terrain, powerful creatures, late-game progression)
 * - Independent checkpoint tracking per destination
 * - Real unlock requirements based on game events, exploration rank, items, and quests
 */

import { DimensionDefinition, RegionDefinition, Checkpoint } from '../types/game';

export const DIMENSIONS: Record<string, DimensionDefinition> = {
  the_living_reach: {
    id: 'the_living_reach',
    name: 'The Living Reach',
    description: 'The primary dimension of boundless skies, floating archipelagos, lush emerald plateaus, and ancient stone monuments.',
    gravityModifier: 1.0,
    skyVoidColor: 0x060913,
    regions: ['verdant_reach', 'shattered_highlands'],
    themeColor: '#10b981',
    badge: 'Verdant Stratum',
  },
  the_ashen_expanse: {
    id: 'the_ashen_expanse',
    name: 'The Ashen Expanse',
    description: 'A subterranean volcanic caldera domain of scorched basalt crags, bubbling magma fissures, and heavy gravitational pressure.',
    gravityModifier: 1.15,
    skyVoidColor: 0x1f0806,
    regions: ['ashen_expanse'],
    themeColor: '#f97316',
    badge: 'Volcanic Core',
  },
  the_moonveil: {
    id: 'the_moonveil',
    name: 'The Moonveil',
    description: 'A twilight sanctuary submerged in perpetual lunar radiance, bioluminescent mycelium, and buoyant low gravity.',
    gravityModifier: 0.75,
    skyVoidColor: 0x12072b,
    regions: ['moonveil_wilds'],
    themeColor: '#c084fc',
    badge: 'Lunar Sanctuary',
  },
  the_fractured_archive: {
    id: 'the_fractured_archive',
    name: 'The Fractured Archive',
    description: 'A monumental suspended library of forgotten technology, brass astrolabes, and ancient runic pedestals.',
    gravityModifier: 0.85,
    skyVoidColor: 0x0a1626,
    regions: ['sunken_archive'],
    themeColor: '#38bdf8',
    badge: 'Forgotten Lore',
  },
  the_rift: {
    id: 'the_rift',
    name: 'The Rift',
    description: 'The outermost horizon where dimensional barriers fracture into anti-gravity void tears and anomalous energy.',
    gravityModifier: 0.50,
    skyVoidColor: 0x130026,
    regions: ['rift_frontier'],
    themeColor: '#a855f7',
    badge: 'Void Boundary',
  },

  // Backwards compatibility aliases for older saves
  overworld: {
    id: 'the_living_reach',
    name: 'The Living Reach',
    description: 'The primary dimension of boundless skies, floating archipelagos, and ancient stone monuments.',
    gravityModifier: 1.0,
    skyVoidColor: 0x060913,
    regions: ['verdant_reach', 'shattered_highlands'],
    themeColor: '#10b981',
    badge: 'Verdant Stratum',
  },
  aether_core: {
    id: 'the_fractured_archive',
    name: 'The Fractured Archive',
    description: 'A subterranean sub-space chamber suspended at the heart of the world rift.',
    gravityModifier: 0.85,
    skyVoidColor: 0x0a1626,
    regions: ['sunken_archive'],
    themeColor: '#38bdf8',
    badge: 'Forgotten Lore',
  },
};

export const REGIONS: Record<string, RegionDefinition> = {
  // 1. The Verdant Reach (Starting Playable Destination)
  verdant_reach: {
    id: 'verdant_reach',
    dimensionId: 'the_living_reach',
    name: 'The Verdant Reach',
    subtitle: 'Destination I · Ancient Floating Archipelago',
    description: 'A lush expanse of rolling mossy mounds, the Whispering River, rustic settlements, and the central Monolith Beacon.',
    fogColor: 0x0e1726,
    fogDensity: 0.009,
    ambientLightColor: 0x7ec8e3,
    ambientLightGround: 0x1b3826,
    sunColor: 0xfff3d6,
    spawnPoint: [0, 4.5, 0],
    weatherProfile: ['CLEAR', 'MIST', 'WIND', 'CLOUDS'],
    discoveryLore: 'The first charted archipelago settled after the Great Drift severed the land from below.',
    gravityModifier: 1.0,
    unlockedByDefault: true,
  },

  // 2. The Shattered Highlands
  shattered_highlands: {
    id: 'shattered_highlands',
    dimensionId: 'the_living_reach',
    name: 'The Shattered Highlands',
    subtitle: 'Destination II · High Altitude Aerial Spires',
    description: 'Sheer vertical cliffs, suspended stone stepping-stones, and powerful updraft wind rings that launch travelers across the sky.',
    fogColor: 0x38bdf8,
    fogDensity: 0.007,
    ambientLightColor: 0xe0f2fe,
    ambientLightGround: 0x0369a1,
    sunColor: 0xfffbeb,
    spawnPoint: [0, 16.5, 0],
    weatherProfile: ['WIND', 'STORMS', 'CLEAR'],
    discoveryLore: 'Carved by millenniums of high-altitude gales, ancient scouts built updraft wind-chutes to leap between soaring needle cliffs.',
    gravityModifier: 0.95,
    unlockedByDefault: false,
    unlockRequirement: {
      description: 'Requires awakening the Verdant Monolith Beacon and attaining Exploration Rank 2 (Wayfarer).',
      minExplorationRank: 2,
      requiredBeaconActivated: true,
    },
  },

  // 3. The Ashen Expanse
  ashen_expanse: {
    id: 'ashen_expanse',
    dimensionId: 'the_ashen_expanse',
    name: 'The Ashen Expanse',
    subtitle: 'Destination III · Scorched Volcanic Caldera',
    description: 'Dark volcanic basalt crags, bubbling rivers of glowing magma, heat-adapted cinder vines, and the dormant Ash Colossus.',
    fogColor: 0x451a03,
    fogDensity: 0.012,
    ambientLightColor: 0xfed7aa,
    ambientLightGround: 0x7c2d12,
    sunColor: 0xf97316,
    spawnPoint: [0, 6.0, 0],
    weatherProfile: ['MIST', 'RED_ECLIPSE', 'CLEAR'],
    discoveryLore: 'Subterranean fire trapped within floating basalt slabs keeps this volcanic caldera eternally smoldering above the cloud sea.',
    gravityModifier: 1.15,
    unlockedByDefault: false,
    unlockRequirement: {
      description: 'Requires collecting 4x Basalt Stones to reinforce thermal gear and attaining Exploration Rank 3 (Trailblazer).',
      minExplorationRank: 3,
      requiredItems: [{ itemId: 'basalt_pebble', name: 'Basalt Stone', quantity: 4 }],
    },
  },

  // 4. The Sunken Archive
  sunken_archive: {
    id: 'sunken_archive',
    dimensionId: 'the_fractured_archive',
    name: 'The Sunken Archive',
    subtitle: 'Destination IV · Forgotten Technology Repository',
    description: 'A subterranean sanctum of carved geometric masonry, revolving brass astrolabes, runic cipher pedestals, and ancient records.',
    fogColor: 0x0f172a,
    fogDensity: 0.008,
    ambientLightColor: 0xbae6fd,
    ambientLightGround: 0x0284c7,
    sunColor: 0x38bdf8,
    spawnPoint: [0, 5.0, 0],
    weatherProfile: ['CLEAR', 'MIST'],
    discoveryLore: 'Constructed by the First Chroniclers to preserve the astronomical equations and dimensional tether coordinates of the Drift.',
    gravityModifier: 0.85,
    unlockedByDefault: false,
    unlockRequirement: {
      description: 'Requires discovering at least 3 ancient records or ruins across the archipelago.',
      requiredDiscoveriesCount: 3,
    },
  },

  // 5. The Moonveil Wilds
  moonveil_wilds: {
    id: 'moonveil_wilds',
    dimensionId: 'the_moonveil',
    name: 'The Moonveil Wilds',
    subtitle: 'Destination V · Bioluminescent Lunar Sanctuary',
    description: 'A realm submerged in perpetual midnight twilight, populated by giant glowing mushrooms, luminescent spores, and buoyant gravity.',
    fogColor: 0x2e1065,
    fogDensity: 0.011,
    ambientLightColor: 0xe9d5ff,
    ambientLightGround: 0x581c87,
    sunColor: 0xc084fc,
    spawnPoint: [0, 5.5, 0],
    weatherProfile: ['MIST', 'CLEAR'],
    discoveryLore: 'Bathed in uninterrupted starlight, the flora of the Moonveil synthesizes celestial dust into nocturnal luminescence.',
    gravityModifier: 0.75,
    unlockedByDefault: false,
    unlockRequirement: {
      description: 'Requires offering 2x Drift Bloom Nectar to awaken the lunar flora resonance.',
      requiredItems: [{ itemId: 'drift_bloom_nectar', name: 'Drift Bloom Nectar', quantity: 2 }],
    },
  },

  // 6. The Rift Frontier
  rift_frontier: {
    id: 'rift_frontier',
    dimensionId: 'the_rift',
    name: 'The Rift Frontier',
    subtitle: 'Destination VI · Unstable Void Boundary',
    description: 'Fractured obsidian islands drifting in zero-g silence, raw spatial tears emitting violet rays, and late-game void anomalies.',
    fogColor: 0x2e0249,
    fogDensity: 0.015,
    ambientLightColor: 0xf3e8ff,
    ambientLightGround: 0x3b0764,
    sunColor: 0xa855f7,
    spawnPoint: [0, 8.0, 0],
    weatherProfile: ['DIMENSIONAL_DISTURBANCE', 'RED_ECLIPSE', 'MIST'],
    discoveryLore: 'The edge of the known universe where gravitational equations unravel into pure aetheric potential.',
    gravityModifier: 0.50,
    unlockedByDefault: false,
    unlockRequirement: {
      description: 'Requires completing "Gateway to the Aether" (Quest 8) and reaching Exploration Rank 4 (Rift Specialist).',
      requiredQuestId: 'quest_main_8_portal',
      minExplorationRank: 4,
    },
  },

  // Backwards compatibility entries for older saves
  sunward_spire: {
    id: 'shattered_highlands',
    dimensionId: 'the_living_reach',
    name: 'The Shattered Highlands',
    subtitle: 'Destination II · High Altitude Aerial Spires',
    description: 'Sheer vertical cliffs and suspended stone stepping-stones.',
    fogColor: 0x38bdf8,
    fogDensity: 0.007,
    ambientLightColor: 0xe0f2fe,
    ambientLightGround: 0x0369a1,
    sunColor: 0xfffbeb,
    spawnPoint: [0, 16.5, 0],
    weatherProfile: ['WIND', 'CLEAR'],
    discoveryLore: 'High altitude aerial spires.',
    gravityModifier: 0.95,
  },
  abyssal_drift: {
    id: 'rift_frontier',
    dimensionId: 'the_rift',
    name: 'The Rift Frontier',
    subtitle: 'Destination VI · Unstable Void Boundary',
    description: 'Fractured obsidian islands drifting in zero-g silence.',
    fogColor: 0x2e0249,
    fogDensity: 0.015,
    ambientLightColor: 0xf3e8ff,
    ambientLightGround: 0x3b0764,
    sunColor: 0xa855f7,
    spawnPoint: [0, 8.0, 0],
    weatherProfile: ['DIMENSIONAL_DISTURBANCE'],
    discoveryLore: 'The edge of the known universe.',
    gravityModifier: 0.50,
  },
};

export const CHECKPOINTS: Checkpoint[] = [
  // 1. Verdant Reach Checkpoints
  {
    id: 'cp_beacon_plaza',
    name: 'Monolith Beacon Plaza',
    regionId: 'verdant_reach',
    position: [0, 4.0, 0],
    activated: true,
    discovered: true,
  },
  {
    id: 'cp_eastern_ridge',
    name: 'Sunward Promontory Waystone',
    regionId: 'verdant_reach',
    position: [38, 7.5, 25],
    activated: false,
    discovered: false,
  },
  {
    id: 'cp_elder_groove',
    name: 'Sunken Ruin Sanctum Waystone',
    regionId: 'verdant_reach',
    position: [-34, 5.0, 18],
    activated: false,
    discovered: false,
  },

  // 2. Shattered Highlands Checkpoints
  {
    id: 'cp_highlands_ascent',
    name: 'Ascent Spire Anchor',
    regionId: 'shattered_highlands',
    position: [0, 16.0, 0],
    activated: true,
    discovered: true,
  },
  {
    id: 'cp_aero_shelf',
    name: 'Gale Pillar Sanctum',
    regionId: 'shattered_highlands',
    position: [24, 28.0, -18],
    activated: false,
    discovered: false,
  },

  // 3. Ashen Expanse Checkpoints
  {
    id: 'cp_ashen_caldera',
    name: 'Caldera Gateway Shrine',
    regionId: 'ashen_expanse',
    position: [0, 5.5, 0],
    activated: true,
    discovered: true,
  },
  {
    id: 'cp_basalt_forge',
    name: 'Basalt Smelter Outpost',
    regionId: 'ashen_expanse',
    position: [-28, 8.0, 22],
    activated: false,
    discovered: false,
  },

  // 4. Sunken Archive Checkpoints
  {
    id: 'cp_archive_vestibule',
    name: 'Grand Vestibule Astrolabe',
    regionId: 'sunken_archive',
    position: [0, 4.5, 0],
    activated: true,
    discovered: true,
  },
  {
    id: 'cp_chronos_dais',
    name: 'Chronos Cipher Chamber',
    regionId: 'sunken_archive',
    position: [20, 6.0, -25],
    activated: false,
    discovered: false,
  },

  // 5. Moonveil Wilds Checkpoints
  {
    id: 'cp_moonveil_grotto',
    name: 'Luminescent Grotto Anchor',
    regionId: 'moonveil_wilds',
    position: [0, 5.0, 0],
    activated: true,
    discovered: true,
  },
  {
    id: 'cp_twilight_grove',
    name: 'Starlight Spore Canopy',
    regionId: 'moonveil_wilds',
    position: [-25, 6.5, -20],
    activated: false,
    discovered: false,
  },

  // 6. Rift Frontier Checkpoints
  {
    id: 'cp_rift_anomaly',
    name: 'Singularity Threshold',
    regionId: 'rift_frontier',
    position: [0, 7.5, 0],
    activated: true,
    discovered: true,
  },
  {
    id: 'cp_event_horizon',
    name: 'Null-G Monolith',
    regionId: 'rift_frontier',
    position: [18, 12.0, 26],
    activated: false,
    discovered: false,
  },
];
