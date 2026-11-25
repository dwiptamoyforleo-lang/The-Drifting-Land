/**
 * Trader Catalogs & Economy Definitions for The Drifting Land.
 * Defines goods, prices in Drift Coins, merchant schedules, and stock availability.
 */

import { TraderCatalog } from '../types/game';
import { getItemDef } from './items';

export const TRADER_CATALOGS: Record<string, TraderCatalog> = {
  // 1. Trader Orin - Verdant Haven General Merchant
  trader_orin: {
    id: 'trader_orin',
    traderName: 'Trader Orin',
    title: 'Verdant Haven Outpost Supplies',
    greeting: 'Welcome, traveler! Weathering the drift takes good provisions and sharp steel. Care to browse the settlement wares?',
    canBuyPlayerItems: true,
    sellPriceMultiplier: 0.6,
    offers: [
      { itemId: 'traveler_rations', price: 12 },
      { itemId: 'drift_bread', price: 20 },
      { itemId: 'drift_bloom_nectar', price: 16 },
      { itemId: 'herbal_salve', price: 24 },
      { itemId: 'settler_iron_pick', price: 110, stock: 1 },
      { itemId: 'nomad_cloak', price: 140, stock: 1 },
      { itemId: 'iron_ingot', price: 30 },
      { itemId: 'verdant_moss_fiber', price: 10 },
      { itemId: 'torch', price: 18 },
    ],
  },

  // 2. The Mosskeeper - Ancient Botanical Creature (Daytime, Elder Grove)
  trader_mosskeeper: {
    id: 'trader_mosskeeper',
    traderName: 'The Mosskeeper',
    title: 'Primordial Grove Botanicals',
    greeting: '...Root and branch, petal and loam... You tread softly upon the drifting earth, small one. Exchange what the sun has touched...',
    canBuyPlayerItems: true,
    sellPriceMultiplier: 0.75, // Pays more for natural flora & creature fibers
    offers: [
      { itemId: 'mosskeeper_seed', price: 120, stock: 3 },
      { itemId: 'verdant_moss_fiber', price: 8 },
      { itemId: 'herbal_salve', price: 20 },
      { itemId: 'aether_surge_tonic', price: 75 },
      { itemId: 'ember_surge_tonic', price: 50 },
      { itemId: 'drift_bloom_nectar', price: 14 },
    ],
  },

  // 3. The Drift Collector - Nomad Scavenger (Afternoon & Sunset, Eastern Ridge)
  trader_collector: {
    id: 'trader_collector',
    traderName: 'The Drift Collector',
    title: 'Salvaged Archipelago Curios',
    greeting: 'Heh! Another wanderer picking through the bones of the sky. I trade in lost relics and strange mechanics from before the sundering.',
    canBuyPlayerItems: true,
    sellPriceMultiplier: 0.7, // Pays well for basalt slate, old gear, ore
    offers: [
      { itemId: 'drift_compass', price: 150, stock: 1 },
      { itemId: 'ancient_basalt_slate', price: 35 },
      { itemId: 'celestial_dust', price: 65 },
      { itemId: 'scout_turban', price: 85, stock: 1 },
      { itemId: 'iron_ingot', price: 28 },
      { itemId: 'mossback_carapace', price: 75 },
    ],
  },

  // 4. The Moon Moth - Ethereal Nocturnal Merchant (Nighttime & Red Moon, Ancient Beacon)
  trader_moon_moth: {
    id: 'trader_moon_moth',
    traderName: 'The Moon Moth',
    title: 'Nocturnal Luminary Offerings',
    greeting: '...Silver light trembles on our wings. When the sun hides below the rift, we bring the cool elixirs of the stars...',
    canBuyPlayerItems: true,
    sellPriceMultiplier: 0.8,
    offers: [
      { itemId: 'lunar_lantern', price: 210, stock: 1 },
      { itemId: 'elixir_of_clarity', price: 85 },
      { itemId: 'moon_antler_shaving', price: 95 },
      { itemId: 'celestial_dust', price: 55 },
      { itemId: 'glasswing_membrane', price: 65 },
      { itemId: 'glowhare_fur', price: 35 },
    ],
  },

  // 5. The Rift Broker - Shrouded Dimensional Trader (Near Shattered Gateway & Rift)
  trader_rift_broker: {
    id: 'trader_rift_broker',
    traderName: 'The Rift Broker',
    title: 'Dimensional Anomaly Barter',
    greeting: 'Reality frays at the edges, traveler. Coins from the surface are acceptable... provided they ring true in the void.',
    canBuyPlayerItems: true,
    sellPriceMultiplier: 0.85, // Highest payout for rare anomaly drops
    offers: [
      { itemId: 'rift_resonator_key', price: 320, stock: 1 },
      { itemId: 'aether_attunement_band', price: 850, stock: 1 },
      { itemId: 'rift_tendril', price: 110 },
      { itemId: 'bloodroot_orchid', price: 90 },
      { itemId: 'blood_essence', price: 140 },
      { itemId: 'aether_surge_tonic', price: 70 },
    ],
  },
};

export function getTraderCatalog(traderId: string): TraderCatalog | undefined {
  return TRADER_CATALOGS[traderId];
}

/**
 * Check if a special trading creature should be spawned and visible
 * based on current world time, weather, and progression state.
 */
export function isTraderAvailable(
  traderId: string,
  timeState: { cycleTime: number; isRedMoon: boolean; phaseName: string },
  discoveries: string[]
): boolean {
  switch (traderId) {
    case 'trader_orin':
      // Settlement merchant is always available
      return true;

    case 'trader_mosskeeper':
      // The Mosskeeper is diurnal (daylight hours only, ~06:00 to 18:30)
      // cycleTime: 0.0=dawn, 0.3=noon, 0.65=sunset
      return !timeState.isRedMoon && timeState.cycleTime >= 0.05 && timeState.cycleTime <= 0.65;

    case 'trader_collector':
      // The Drift Collector appears from late afternoon through dusk (~14:00 to 20:30)
      return timeState.cycleTime >= 0.35 && timeState.cycleTime <= 0.75;

    case 'trader_moon_moth':
      // The Moon Moth appears exclusively at night or during Red Moon
      return timeState.isRedMoon || timeState.cycleTime > 0.65 || timeState.cycleTime < 0.05;

    case 'trader_rift_broker':
      // The Rift Broker appears once the disturbance or gateway has been investigated
      const riftKnown =
        discoveries.includes('dimensional_gateway') ||
        discoveries.includes('disc_dimensional_gateway') ||
        discoveries.includes('disc_rift_faultline') ||
        discoveries.includes('rift_faultline');
      return Boolean(riftKnown);

    default:
      return true;
  }
}

/**
 * Compute buy price for player (buying from merchant)
 */
export function getBuyPrice(offer: { itemId: string; price: number }): number {
  return offer.price;
}

/**
 * Compute sell price for player (selling to merchant)
 */
export function getSellPrice(itemId: string, catalog: TraderCatalog): number {
  const item = getItemDef(itemId);
  if (!item) return 0;
  // Unique quest and relic items cannot be sold
  if (item.category === 'quest' || item.category === 'relic') return 0;
  return Math.max(1, Math.round(item.value * catalog.sellPriceMultiplier));
}
