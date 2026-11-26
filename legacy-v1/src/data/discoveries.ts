/**
 * Data catalog of unique Discoveries across The Drifting Land.
 * Uses stable IDs, rich narrative lore, categories, coordinates, and rewards.
 */

import { DiscoveryDefinition } from '../types/game';

export const DISCOVERIES_CATALOG: Record<string, DiscoveryDefinition> = {
  // Beacons & Sanctuaries
  disc_beacon_plaza: {
    id: 'disc_beacon_plaza',
    name: 'Monolith Beacon Plaza',
    category: 'BEACON',
    region: 'The Verdant Reach',
    subtitle: 'Heart of the Archipelago',
    description: 'The monumental tiered basalt dais anchoring the center of the floating islands.',
    lore: 'Erected by the architects of the Great Drift. Its concentric bronze rings harmonize with the aether winds.',
    icon: 'compass',
    coordinates: [0, 4.0, 0],
    experienceReward: 50,
  },
  disc_beacon_promontory: {
    id: 'disc_beacon_promontory',
    name: 'Sunward Promontory Beacon',
    category: 'BEACON',
    region: 'The Verdant Reach',
    subtitle: 'Eastern Sky Lookout',
    description: 'An ancient guiding beacon overlooking the open sea of clouds to the east.',
    lore: 'Once beamed solar navigational pulses to aerial galleons traversing between island clusters.',
    icon: 'compass',
    coordinates: [38, 7.5, 25],
    experienceReward: 75,
  },
  disc_beacon_sanctum: {
    id: 'disc_beacon_sanctum',
    name: 'Sunken Sanctum Beacon',
    category: 'BEACON',
    region: 'The Verdant Reach',
    subtitle: 'Sanctuary of the Ancients',
    description: 'A secluded sanctuary sheltered beneath the overhang of the western crags.',
    lore: 'Kept alive by subterranean aether fissures, this sacred ground provided rest for ancient pilgrims.',
    icon: 'compass',
    coordinates: [-34, 5.0, 18],
    experienceReward: 75,
  },

  // Structures & Ruins
  disc_ruined_tower: {
    id: 'disc_ruined_tower',
    name: 'Sunward Watchtower Overlook',
    category: 'RUINS',
    region: 'The Verdant Reach',
    subtitle: 'High Overlook & Celestial Astrolabe',
    description: 'A weathered octagonal watchtower rising above the eastern perimeter cliffs.',
    lore: 'Stargazers of old mounted astronomical lenses here to map celestial tides and the ominous red moon orbits.',
    icon: 'eye',
    coordinates: [38, 12.0, 25],
    experienceReward: 100,
  },
  disc_hidden_chamber: {
    id: 'disc_hidden_chamber',
    name: 'Echoes of the First Drift',
    category: 'CHAMBER',
    region: 'The Verdant Reach',
    subtitle: 'Concealed Subterranean Sanctum',
    description: 'A secret vault carved into the basalt core behind a fractured illusory wall.',
    lore: 'Sealed during the sundering of the continents. Within lies the venerated stone codex of island architects.',
    icon: 'box',
    coordinates: [-48, 2.8, -8],
    experienceReward: 125,
  },
  disc_abandoned_settlement: {
    id: 'disc_abandoned_settlement',
    name: 'Hollow Drift Homestead',
    category: 'LOCATION',
    region: 'The Verdant Reach',
    subtitle: 'Lost Pioneer Settlement',
    description: 'A cluster of overgrown timber shelters and a stone hearth abandoned decades ago.',
    lore: 'The initial homesteaders cultivated drift moss and harvested mountain rainfall before unpredictable rift storms forced evacuation.',
    icon: 'home',
    coordinates: [-22, 3.2, -35],
    experienceReward: 80,
  },
  disc_research_camp: {
    id: 'disc_research_camp',
    name: "Surveyor Kaelen's Research Outpost",
    category: 'STRUCTURE',
    region: 'The Verdant Reach',
    subtitle: 'Cartographer Field Camp',
    description: 'An active scientific expedition outpost equipped with surveying instruments and drafting charts.',
    lore: 'Maintained by the Royal Cartographic Guild to monitor micro-fractures in the island anti-gravity field.',
    icon: 'map',
    coordinates: [12, 4.2, 28],
    experienceReward: 60,
  },
  disc_suspended_bridge: {
    id: 'disc_suspended_bridge',
    name: 'River Gorge Suspension Bridge',
    category: 'STRUCTURE',
    region: 'The Verdant Reach',
    subtitle: 'Timber & Braided Cable Crossing',
    description: 'A rustic timber suspension bridge spanning the rushing torrent of the Whispering River.',
    lore: 'Constructed from ironwood timbers that withstand the moisture of the spray and violent thermal updrafts.',
    icon: 'navigation',
    coordinates: [24, 3.8, -10],
    experienceReward: 40,
  },
  disc_locked_door: {
    id: 'disc_locked_door',
    name: 'Sunken Sanctum Arch Gate',
    category: 'RUINS',
    region: 'The Verdant Reach',
    subtitle: 'Constellation Sealed Portal',
    description: 'A heavy bronze and stone portcullis bearing celestial cipher engravings.',
    lore: 'Requires the Sanctum Rune Key to break the electrostatic seal holding the gate in place.',
    icon: 'key',
    coordinates: [-38, 4.8, 22],
    experienceReward: 90,
  },

  // Resource Deposits
  disc_lumicite_vein: {
    id: 'disc_lumicite_vein',
    name: 'Resonant Lumicite Crystal Vein',
    category: 'FLORA',
    region: 'The Verdant Reach',
    subtitle: 'Deep Earth Crystal Outcrop',
    description: 'A rich geological fissure bursting with radiant azure crystals.',
    lore: 'These crystals act as natural power conduits, storing solar light and discharging gentle warmth at dusk.',
    icon: 'gem',
    coordinates: [-16, 3.5, 32],
    experienceReward: 45,
  },
  disc_aetherium_deposit: {
    id: 'disc_aetherium_deposit',
    name: 'Celestial Aetherium Ore Cluster',
    category: 'STRUCTURE',
    region: 'The Verdant Reach',
    subtitle: 'Anti-Gravitational Mineral Node',
    description: 'Gleaming golden ore nodes jutting upward from an exposed bedrock seam.',
    lore: 'Aetherium ore possesses inverse gravitational polarity, making it essential for sky-faring vessels and stabilizing anchors.',
    icon: 'box',
    coordinates: [-28, 4.0, 6],
    experienceReward: 50,
  },

  // Gateways & Anomalies
  disc_dimensional_gateway: {
    id: 'disc_dimensional_gateway',
    name: 'Arch of the Astral Conflux',
    category: 'STRUCTURE',
    region: 'The Verdant Reach',
    subtitle: 'Dimensional Translocation Gateway',
    description: 'A colossal monolithic arch humming with spatial distortion and glowing nebula vortexes.',
    lore: 'Directly bridges the physical plane with distant celestial heights of the Sunward Spire.',
    icon: 'zap',
    coordinates: [-50, 4.6, -20],
    experienceReward: 120,
  },
  disc_void_rift_island: {
    id: 'disc_void_rift_island',
    name: 'The Shattered Void Rift Islet',
    category: 'LOCATION',
    region: 'The Verdant Reach',
    subtitle: 'Abyssal Outcropping',
    description: 'A fractured islet floating over the deep cloud inversion where the Crimson Warden awakens.',
    lore: 'Here the boundary between reality and the abyss is paper-thin. Under the Red Moon, the gate awakens.',
    icon: 'skull',
    coordinates: [0, -6.0, 75],
    experienceReward: 150,
  },

  // Flora, Fauna & Lore Records
  disc_aether_wisp: {
    id: 'disc_aether_wisp',
    name: 'Luminescent Aether Wisps',
    category: 'CREATURE',
    region: 'The Verdant Reach',
    subtitle: 'Buoyant Atmospheric Organism',
    description: 'Gentle, floating spirits composed of condensed atmospheric static and pure curiosity.',
    lore: 'They congregate near ancient machinery, drawn to the rhythmic hum of ancient power conduits.',
    icon: 'sparkles',
    coordinates: [14, 5.0, -8],
    experienceReward: 35,
  },
  disc_settlement_ledger: {
    id: 'disc_settlement_ledger',
    name: "The Pioneer's Final Ledger",
    category: 'RECORD',
    region: 'The Verdant Reach',
    subtitle: 'Historical Chronicle',
    description: 'A preserved record of daily life in the Hollow Drift settlement before the evacuation.',
    lore: '"The red sky appeared again last night. We cannot sustain the perimeter gardens if the beasts keep multiplying. Tomorrow, we build the sky skiff."',
    icon: 'book',
    coordinates: [-22, 3.5, -35],
    experienceReward: 60,
  },
};

export function getDiscoveryDef(id: string): DiscoveryDefinition | undefined {
  return DISCOVERIES_CATALOG[id];
}

export function getAllDiscoveries(): DiscoveryDefinition[] {
  return Object.values(DISCOVERIES_CATALOG);
}
