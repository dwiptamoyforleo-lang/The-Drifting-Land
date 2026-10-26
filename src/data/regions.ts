/**
 * Data-driven definitions for Dimensions, Regions, and Checkpoints in The Drifting Land.
 */

import { DimensionDefinition, RegionDefinition, Checkpoint } from '../types/game';

export const DIMENSIONS: Record<string, DimensionDefinition> = {
  overworld: {
    id: 'overworld',
    name: 'The Fractured Skies',
    description: 'The primary dimension of boundless sky, floating archipelagos, and ancient stone monuments.',
    gravityModifier: 1.0,
    skyVoidColor: 0x060913,
    regions: ['verdant_reach', 'sunward_spire', 'abyssal_drift'],
  },
  aether_core: {
    id: 'aether_core',
    name: 'The Aether Core',
    description: 'A subterranean sub-space chamber suspended at the heart of the world rift.',
    gravityModifier: 0.65,
    skyVoidColor: 0x1e1b4b,
    regions: ['sanctum_of_echoes'],
  },
};

export const REGIONS: Record<string, RegionDefinition> = {
  verdant_reach: {
    id: 'verdant_reach',
    dimensionId: 'overworld',
    name: 'The Verdant Reach',
    subtitle: 'Region I · Ancient Floating Archipelago',
    description: 'A lush expanse of rolling mossy mounds, ancient basalt pillars, and the dormant Monolith Beacon.',
    fogColor: 0x0e1726,
    fogDensity: 0.009,
    ambientLightColor: 0x7ec8e3,
    ambientLightGround: 0x1b3826,
    sunColor: 0xfff3d6,
    spawnPoint: [0, 4.5, 0],
    weatherProfile: ['CLEAR', 'MIST', 'WIND', 'CLOUDS'],
    discoveryLore: 'The first charted archipelago settled after the Great Drift severed the land from below.',
  },
  sunward_spire: {
    id: 'sunward_spire',
    dimensionId: 'overworld',
    name: 'The Sunward Spire',
    subtitle: 'Region II · Solar Heights',
    description: 'Towering jagged crags bathed in blinding perpetual light, where vertical updrafts sustain aerial ruins.',
    fogColor: 0xfef08a,
    fogDensity: 0.006,
    ambientLightColor: 0xffedd5,
    ambientLightGround: 0xb45309,
    sunColor: 0xfffbeb,
    spawnPoint: [0, 25, 0],
    weatherProfile: ['CLEAR', 'WIND'],
    discoveryLore: 'Constructed by solar priests who sought to capture solar resonance into crystal matrices.',
  },
  abyssal_drift: {
    id: 'abyssal_drift',
    dimensionId: 'overworld',
    name: 'The Abyssal Drift',
    subtitle: 'Region III · Twilight Rift',
    description: 'Shadow-draped basalt plateaus hovering at the rim of the cloud inversion, where the Red Moon burns closest.',
    fogColor: 0x31102f,
    fogDensity: 0.012,
    ambientLightColor: 0xc084fc,
    ambientLightGround: 0x180506,
    sunColor: 0xf43f5e,
    spawnPoint: [0, 5, 0],
    weatherProfile: ['MIST', 'RED_ECLIPSE'],
    discoveryLore: 'Where remnants of forgotten civilizations whisper into the endless cloud abyss.',
  },
};

export const CHECKPOINTS: Checkpoint[] = [
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
];
