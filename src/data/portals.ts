/**
 * Portal Definitions & Unlock Validation for The Drifting Land.
 * Implements Prompt 11 Dimension traversal, unlock requirements, and return mechanics.
 */

import { SaveData, ItemDefinition } from '../types/game';
import { InventorySystem } from '../systems/inventorySystem';
import { QuestSystem } from '../systems/questSystem';
import { REGIONS, DIMENSIONS } from './regions';

export interface PortalDefinition {
  id: string;
  name: string;
  sourceRegionId: string;
  destinationRegionId: string;
  destinationDimensionId: string;
  position: [number, number, number];
  rotationY: number;
  vortexColor: number;
  glowColor: number;
  accentColor: number;
  loreQuote: string;
  isReturnPortal?: boolean;
}

export const PORTALS: PortalDefinition[] = [
  // ==========================================
  // OUTBOUND PORTALS (Located in The Verdant Reach)
  // ==========================================
  {
    id: 'portal_shattered_highlands',
    name: 'Shattered Highlands Gateway',
    sourceRegionId: 'verdant_reach',
    destinationRegionId: 'shattered_highlands',
    destinationDimensionId: 'the_living_reach',
    position: [36, 10.5, 22],
    rotationY: -Math.PI / 4,
    vortexColor: 0x38bdf8,
    glowColor: 0x0284c7,
    accentColor: 0xfacc15,
    loreQuote: 'A whistling aether current pulls upward towards soaring needle cliffs and vertical gales.',
  },
  {
    id: 'portal_ashen_expanse',
    name: 'Ashen Caldera Gateway',
    sourceRegionId: 'verdant_reach',
    destinationRegionId: 'ashen_expanse',
    destinationDimensionId: 'the_ashen_expanse',
    position: [-44, 4.8, 12],
    rotationY: Math.PI / 3,
    vortexColor: 0xf97316,
    glowColor: 0xea580c,
    accentColor: 0x7c2d12,
    loreQuote: 'Thermal heat radiates through ancient basalt joints, smelling of volcanic brimstone and smoldering cinder.',
  },
  {
    id: 'portal_sunken_archive',
    name: 'Sunken Archive Gateway',
    sourceRegionId: 'verdant_reach',
    destinationRegionId: 'sunken_archive',
    destinationDimensionId: 'the_fractured_archive',
    position: [-34, 4.8, 22],
    rotationY: -Math.PI / 6,
    vortexColor: 0x67e8f9,
    glowColor: 0x06b6d4,
    accentColor: 0xd97706,
    loreQuote: 'Harmonic clockwork gears hum beneath the stone dais, whispering astronomical cipher equations.',
  },
  {
    id: 'portal_moonveil_wilds',
    name: 'Moonveil Grotto Gateway',
    sourceRegionId: 'verdant_reach',
    destinationRegionId: 'moonveil_wilds',
    destinationDimensionId: 'the_moonveil',
    position: [-24, 4.8, -28],
    rotationY: Math.PI / 2,
    vortexColor: 0xc084fc,
    glowColor: 0x9333ea,
    accentColor: 0x581c87,
    loreQuote: 'Bioluminescent spores hover like gentle stars, bathed in the perpetual stillness of lunar dusk.',
  },
  {
    id: 'portal_rift_frontier',
    name: 'Arch of the Astral Conflux (The Rift)',
    sourceRegionId: 'verdant_reach',
    destinationRegionId: 'rift_frontier',
    destinationDimensionId: 'the_rift',
    position: [-50, 6.0, -20],
    rotationY: -Math.PI / 4,
    vortexColor: 0xa855f7,
    glowColor: 0x7e22ce,
    accentColor: 0x3b0764,
    loreQuote: 'Spatial distortion ripples across the stone arch. Anti-gravity void winds pull into the abyss.',
  },

  // ==========================================
  // RETURN PORTALS (Located in Each Destination Region)
  // ==========================================
  {
    id: 'portal_return_highlands',
    name: 'Return Conduit (The Verdant Reach)',
    sourceRegionId: 'shattered_highlands',
    destinationRegionId: 'verdant_reach',
    destinationDimensionId: 'the_living_reach',
    position: [0, 16.5, -8],
    rotationY: 0,
    vortexColor: 0x34d399,
    glowColor: 0x10b981,
    accentColor: 0x065f46,
    loreQuote: 'Stabilized return tether bound to the Monolith Beacon of The Verdant Reach.',
    isReturnPortal: true,
  },
  {
    id: 'portal_return_ashen',
    name: 'Return Conduit (The Verdant Reach)',
    sourceRegionId: 'ashen_expanse',
    destinationRegionId: 'verdant_reach',
    destinationDimensionId: 'the_living_reach',
    position: [0, 6.0, -8],
    rotationY: 0,
    vortexColor: 0x34d399,
    glowColor: 0x10b981,
    accentColor: 0x065f46,
    loreQuote: 'Stabilized return tether bound to the Monolith Beacon of The Verdant Reach.',
    isReturnPortal: true,
  },
  {
    id: 'portal_return_archive',
    name: 'Return Conduit (The Verdant Reach)',
    sourceRegionId: 'sunken_archive',
    destinationRegionId: 'verdant_reach',
    destinationDimensionId: 'the_living_reach',
    position: [0, 5.0, -8],
    rotationY: 0,
    vortexColor: 0x34d399,
    glowColor: 0x10b981,
    accentColor: 0x065f46,
    loreQuote: 'Stabilized return tether bound to the Monolith Beacon of The Verdant Reach.',
    isReturnPortal: true,
  },
  {
    id: 'portal_return_moonveil',
    name: 'Return Conduit (The Verdant Reach)',
    sourceRegionId: 'moonveil_wilds',
    destinationRegionId: 'verdant_reach',
    destinationDimensionId: 'the_living_reach',
    position: [0, 5.5, -8],
    rotationY: 0,
    vortexColor: 0x34d399,
    glowColor: 0x10b981,
    accentColor: 0x065f46,
    loreQuote: 'Stabilized return tether bound to the Monolith Beacon of The Verdant Reach.',
    isReturnPortal: true,
  },
  {
    id: 'portal_return_rift',
    name: 'Return Conduit (The Verdant Reach)',
    sourceRegionId: 'rift_frontier',
    destinationRegionId: 'verdant_reach',
    destinationDimensionId: 'the_living_reach',
    position: [0, 8.0, -8],
    rotationY: 0,
    vortexColor: 0x34d399,
    glowColor: 0x10b981,
    accentColor: 0x065f46,
    loreQuote: 'Stabilized return tether bound to the Monolith Beacon of The Verdant Reach.',
    isReturnPortal: true,
  },
];

export interface PortalUnlockCheck {
  isUnlocked: boolean;
  destinationRegionName: string;
  dimensionName: string;
  lore: string;
  requirements: {
    label: string;
    description: string;
    isMet: boolean;
  }[];
}

/**
 * Validates whether the player meets real in-game milestones to traverse a portal
 */
export function checkPortalUnlock(
  portal: PortalDefinition,
  save: SaveData,
  inventory: InventorySystem,
  quests: QuestSystem
): PortalUnlockCheck {
  // Return conduits are always accessible
  if (portal.isReturnPortal) {
    return {
      isUnlocked: true,
      destinationRegionName: 'The Verdant Reach',
      dimensionName: 'The Living Reach',
      lore: portal.loreQuote,
      requirements: [
        {
          label: 'Safe Return Conduit',
          description: 'Attuned tether directly to The Verdant Reach clearing.',
          isMet: true,
        },
      ],
    };
  }

  const destRegion = REGIONS[portal.destinationRegionId];
  const destDim = DIMENSIONS[portal.destinationDimensionId];
  const req = destRegion?.unlockRequirement;

  if (!req || destRegion.unlockedByDefault) {
    return {
      isUnlocked: true,
      destinationRegionName: destRegion?.name || 'Unknown Realm',
      dimensionName: destDim?.name || 'The Fractured Skies',
      lore: portal.loreQuote,
      requirements: [],
    };
  }

  const requirementsList: { label: string; description: string; isMet: boolean }[] = [];

  // 1. Check Exploration Rank
  if (req.minExplorationRank) {
    const playerRank = save.explorationRank || 1;
    const isMet = playerRank >= req.minExplorationRank;
    requirementsList.push({
      label: `Exploration Rank ${req.minExplorationRank}+`,
      description: `Requires Exploration Rank ${req.minExplorationRank} (Current: Rank ${playerRank})`,
      isMet,
    });
  }

  // 2. Check Beacon Awakening
  if (req.requiredBeaconActivated) {
    const isBeaconAwake = !!save.beaconStates['verdant_monolith_beacon'];
    requirementsList.push({
      label: 'Awaken Monolith Beacon',
      description: 'Channel celestial power into the Verdant Monolith Beacon dais.',
      isMet: isBeaconAwake,
    });
  }

  // 3. Check Required Quest
  if (req.requiredQuestId) {
    const qProgress = save.quests[req.requiredQuestId];
    const isCompleted = qProgress?.status === 'completed' || qProgress?.status === 'COMPLETED';
    requirementsList.push({
      label: 'Complete Gateway Quest',
      description: 'Decipher the celestial gateway runes in "Gateway to the Aether" (Quest 8).',
      isMet: isCompleted,
    });
  }

  // 4. Check Required Items
  if (req.requiredItems && req.requiredItems.length > 0) {
    for (const item of req.requiredItems) {
      const currentQty = inventory.getItemCount(item.itemId);
      const isMet = currentQty >= item.quantity;
      requirementsList.push({
        label: `${item.name} (${currentQty}/${item.quantity})`,
        description: `Possess at least ${item.quantity}x ${item.name} in inventory pouch.`,
        isMet,
      });
    }
  }

  // 5. Check Discoveries
  if (req.requiredDiscoveriesCount) {
    const count = save.discoveries ? save.discoveries.length : 0;
    const isMet = count >= req.requiredDiscoveriesCount;
    requirementsList.push({
      label: `Archipelago Discoveries (${count}/${req.requiredDiscoveriesCount})`,
      description: `Survey and document at least ${req.requiredDiscoveriesCount} points of interest.`,
      isMet,
    });
  }

  const isUnlocked = requirementsList.every((r) => r.isMet);

  return {
    isUnlocked,
    destinationRegionName: destRegion.name,
    dimensionName: destDim?.name || 'The Fractured Skies',
    lore: portal.loreQuote,
    requirements: requirementsList,
  };
}
