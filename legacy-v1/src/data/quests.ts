/**
 * Data-driven quest definitions for The Drifting Land.
 * Implements Prompt 8:
 * - 10 Quest Categories (main, side, exploration, collection, research, npc, crafting, boss, dimension, event)
 * - 8-step connected Initial Storyline revealing the history of the Great Drift
 * - Real game event triggers for completion
 * - Target coordinates for HUD & World Map quest markers
 */
import { QuestDefinition } from '../types/game';

export const QUEST_CATALOG: Record<string, QuestDefinition> = {
  // ==========================================
  // INITIAL STORYLINE CHAIN (8 Connected Quests)
  // ==========================================

  quest_main_1_clearing: {
    id: 'quest_main_1_clearing',
    title: 'The Awakening',
    category: 'main',
    giverName: 'Prologue',
    regionId: 'verdant_reach',
    description: 'You awaken on the sun-drenched plateau of The Verdant Reach. Orient yourself and survey the starting clearing to take in the floating archipelago.',
    loreSnippet: 'Fragments of ancient celestial architecture hover silently in the aether, remnants of an ancient terrestrial cataclysm known as the Great Drift.',
    targetLocation: [0, 4.5, 0],
    targetLocationName: 'The Verdant Reach Clearing',
    objectives: [
      {
        id: 'obj_explore_clearing',
        description: 'Survey the starting clearing of The Verdant Reach',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'EXPLORE_AREA',
        targetId: 'clearing_spawn',
        targetCoords: [0, 4.5, 0],
      },
    ],
    rewards: {
      experience: 40,
      coins: 20,
    },
  },

  quest_main_2_beacon: {
    id: 'quest_main_2_beacon',
    title: 'Gleam on the Horizon',
    category: 'main',
    giverName: 'Monolith Inscription',
    regionId: 'verdant_reach',
    description: 'Follow the stone path across the grass to discover the towering Ancient Monolith Beacon that anchors the central archipelago.',
    loreSnippet: 'The architects of the Great Drift constructed monumental beacons to bind fractured landmasses together using harmonic resonance.',
    prerequisiteQuestId: 'quest_main_1_clearing',
    targetLocation: [0, 4.0, 0],
    targetLocationName: 'Monolith Beacon Plaza',
    objectives: [
      {
        id: 'obj_discover_beacon',
        description: 'Discover the Ancient Monolith Beacon',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'DISCOVER',
        targetId: 'disc_beacon_plaza',
        targetCoords: [0, 4.0, 0],
      },
    ],
    rewards: {
      experience: 60,
      coins: 30,
    },
  },

  quest_main_3_repair: {
    id: 'quest_main_3_repair',
    title: 'Gathering the Remnants',
    category: 'main',
    giverName: 'Surveyor Ledger',
    regionId: 'verdant_reach',
    description: 'The ancient beacon dais is weathered and cracked. Gather 2 Driftwood Branches from perimeter roots and 2 Basalt Stones from riverbeds to prepare for its restoration.',
    loreSnippet: 'Dense driftwood infused with floating aether sap is resilient enough to hold ancient stone keystones in perfect alignment.',
    prerequisiteQuestId: 'quest_main_2_beacon',
    targetLocation: [12, 3.5, 14],
    targetLocationName: 'Verdant Riverbeds & Island Rim',
    objectives: [
      {
        id: 'obj_gather_wood',
        description: 'Gather Driftwood Branches',
        targetCount: 2,
        currentCount: 0,
        completed: false,
        type: 'COLLECT',
        targetId: 'driftwood_branch',
      },
      {
        id: 'obj_gather_stone',
        description: 'Gather Basalt Stones',
        targetCount: 2,
        currentCount: 0,
        completed: false,
        type: 'COLLECT',
        targetId: 'basalt_pebble',
      },
    ],
    rewards: {
      experience: 80,
      coins: 40,
      items: [{ itemId: 'traveler_rations', quantity: 2 }],
    },
  },

  quest_main_4_activate: {
    id: 'quest_main_4_activate',
    title: 'Beacon of the Expanse',
    category: 'main',
    giverName: 'Ancient Dais',
    regionId: 'verdant_reach',
    description: 'Channel celestial power into the restored dais to awaken the Ancient Monolith Beacon and re-establish the regional navigational grid.',
    loreSnippet: 'When rekindled, the central monolith casts a warm beam into the upper cloud layer, guiding aerial wayfarers across hundreds of leagues.',
    prerequisiteQuestId: 'quest_main_3_repair',
    targetLocation: [0, 4.0, 0],
    targetLocationName: 'Monolith Beacon Plaza',
    objectives: [
      {
        id: 'obj_activate_monolith',
        description: 'Awaken the Ancient Monolith Beacon',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'ACTIVATE_BEACON',
        targetId: 'verdant_monolith_beacon',
        targetCoords: [0, 4.0, 0],
      },
    ],
    rewards: {
      experience: 120,
      coins: 80,
      items: [{ itemId: 'drift_bloom_nectar', quantity: 2 }],
    },
  },

  quest_main_5_record: {
    id: 'quest_main_5_record',
    title: 'Whispers in the Stone',
    category: 'main',
    giverName: 'Beacon Echoes',
    regionId: 'verdant_reach',
    description: 'The awakened beacon has harmonized with an ancient archive. Locate and transcribe the Pioneer Homestead Ledger situated near the abandoned settlement.',
    loreSnippet: 'Engraved millennia ago, these stone tablets warn of celestial eclipses that crack the boundaries between physical matter and the void.',
    prerequisiteQuestId: 'quest_main_4_activate',
    targetLocation: [-22, 5.0, -35],
    targetLocationName: 'Hollow Drift Homestead Ledger',
    objectives: [
      {
        id: 'obj_read_record',
        description: 'Discover and read an Ancient Record Tablet',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'READ_RECORD',
        targetId: 'disc_settlement_ledger',
        targetCoords: [-22, 5.0, -35],
      },
    ],
    rewards: {
      experience: 100,
      coins: 50,
    },
  },

  quest_main_6_ruins: {
    id: 'quest_main_6_ruins',
    title: 'Shadows of the Watchtower',
    category: 'main',
    giverName: 'Historical Inquiry',
    regionId: 'verdant_reach',
    description: 'Travel north-east to investigate the Ruined Watchtower and search the surrounding masonry for the sealed Hidden Undercroft Chamber.',
    loreSnippet: 'The garrison stationed here were the first to witness the sky tear open during the Great Drift, storing their research deep underground.',
    prerequisiteQuestId: 'quest_main_5_record',
    targetLocation: [38, 12.0, 25],
    targetLocationName: 'Sunward Watchtower Overlook',
    objectives: [
      {
        id: 'obj_investigate_tower',
        description: 'Investigate the Ruined Watchtower',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'DISCOVER',
        targetId: 'disc_ruined_tower',
        targetCoords: [38, 12.0, 25],
      },
      {
        id: 'obj_discover_chamber',
        description: 'Discover the Hidden Undercroft Chamber',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'ENTER_CHAMBER',
        targetId: 'disc_hidden_chamber',
        targetCoords: [-48, 5.0, -8],
      },
    ],
    rewards: {
      experience: 150,
      coins: 75,
      items: [{ itemId: 'keystone_repair_kit', quantity: 1 }],
    },
  },

  quest_main_7_disturbance: {
    id: 'quest_main_7_disturbance',
    title: 'Ripples in the Void',
    category: 'main',
    giverName: 'Aether Disturbance',
    regionId: 'verdant_reach',
    description: 'Peculiar dimensional rifts warp the western ridge. Venture to the Dimensional Disturbance Ridge and find physical evidence of void energy.',
    loreSnippet: 'Void energy bends spatial topology, causing violet flowers like the Rift Orchid to bloom directly out of spatial fractures.',
    prerequisiteQuestId: 'quest_main_6_ruins',
    targetLocation: [-50, 6.0, -20],
    targetLocationName: 'Astral Rift Faultline',
    objectives: [
      {
        id: 'obj_locate_disturbance',
        description: 'Locate evidence of the dimensional disturbance',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'LOCATE_DISTURBANCE',
        targetId: 'disc_void_rift_island',
        targetCoords: [-50, 6.0, -20],
      },
    ],
    rewards: {
      experience: 180,
      coins: 90,
      items: [{ itemId: 'void_fragment', quantity: 1 }],
    },
  },

  quest_main_8_portal: {
    id: 'quest_main_8_portal',
    title: 'Gateway to the Aether',
    category: 'main',
    giverName: 'Ancient Gate Keystones',
    regionId: 'verdant_reach',
    description: 'Discover the first Dimensional Gateway at the edge of the Rift Valley and inspect its celestial keystones to decipher the unlock requirements.',
    loreSnippet: 'The gate frame stands unyielding against the void winds. With sufficient Aether Essence and a Keystone, the gateway will bridge to other realms.',
    prerequisiteQuestId: 'quest_main_7_disturbance',
    targetLocation: [-50, 6.0, -20],
    targetLocationName: 'Arch of the Astral Conflux',
    objectives: [
      {
        id: 'obj_discover_gateway',
        description: 'Discover the Dimensional Gateway and inspect requirements',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'DISCOVER_PORTAL',
        targetId: 'disc_dimensional_gateway',
        targetCoords: [-50, 6.0, -20],
      },
    ],
    rewards: {
      experience: 250,
      coins: 150,
      items: [{ itemId: 'aether_lantern', quantity: 1 }],
    },
  },

  // ==========================================
  // SIDE & CATEGORY QUESTS (All 10 Categories)
  // ==========================================

  quest_side_suspended_bridge: {
    id: 'quest_side_suspended_bridge',
    title: 'The Suspended Crossing',
    category: 'side',
    giverName: 'Traveler Notice',
    regionId: 'verdant_reach',
    description: 'Inspect the ancient timber Suspended Skybridge connecting the central isle to the northeastern promontory and recover the forgotten traveler satchel.',
    loreSnippet: 'Suspended above the cloud sea, the bridge groans in high aether winds, a testament to ancient engineering.',
    targetLocation: [24, 7.5, -10],
    targetLocationName: 'Suspended Skybridge',
    objectives: [
      {
        id: 'obj_inspect_bridge',
        description: 'Cross the Suspended Skybridge',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'DISCOVER',
        targetId: 'disc_suspended_bridge',
        targetCoords: [24, 7.5, -10],
      },
    ],
    rewards: {
      experience: 110,
      coins: 45,
      items: [{ itemId: 'traveler_rations', quantity: 2 }],
    },
  },

  quest_side_cartographer: {
    id: 'quest_side_cartographer',
    title: 'Surveyor of the Clouds',
    category: 'exploration',
    giverName: 'Surveyor Kaelen',
    regionId: 'verdant_reach',
    description: 'Chart the floating archipelago by discovering at least 4 unique landmark vistas and ancient waypoints.',
    loreSnippet: 'Cartographers chart the sky using triangulation between ancient beacon flames and natural geological spires.',
    targetLocation: [45, 14, 25],
    targetLocationName: 'Sunward Promontory',
    objectives: [
      {
        id: 'obj_survey_landmarks',
        description: 'Discover 4 landmark vistas across the archipelago',
        targetCount: 4,
        currentCount: 0,
        completed: false,
        type: 'DISCOVER',
      },
    ],
    rewards: {
      experience: 160,
      coins: 70,
    },
  },

  quest_coll_botanist: {
    id: 'quest_coll_botanist',
    title: 'Botanist of the Sky Isles',
    category: 'collection',
    giverName: 'Field Botanist Sola',
    regionId: 'verdant_reach',
    description: 'Harvest and catalog 4 distinct specimens of wild sky flora across the archipelago.',
    loreSnippet: 'Plants in the floating islands have adapted by metabolizing atmospheric aether rather than terrestrial soil nutrients.',
    objectives: [
      {
        id: 'obj_gather_flora',
        description: 'Gather wild flora specimens',
        targetCount: 4,
        currentCount: 0,
        completed: false,
        type: 'COLLECT',
      },
    ],
    rewards: {
      experience: 140,
      coins: 60,
      items: [{ itemId: 'herbal_salve', quantity: 2 }],
    },
  },

  quest_craft_equipment: {
    id: 'quest_craft_equipment',
    title: 'Tools of the Horizon',
    category: 'crafting',
    giverName: 'Field Manual',
    regionId: 'verdant_reach',
    description: 'Assemble a Basic Stone Pickaxe and craft an Aether Lantern to illuminate dark nights and expand mining capabilities.',
    loreSnippet: 'Hand-crafted equipment tuned with resonant crystals protects explorers from the chilling cold of the upper atmosphere.',
    objectives: [
      {
        id: 'obj_craft_tool',
        description: 'Craft field tools or equipment at the workbench',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'CRAFT',
      },
    ],
    rewards: {
      experience: 120,
      coins: 50,
      items: [{ itemId: 'celestial_surveyor_goggles', quantity: 1 }],
    },
  },

  quest_res_chronicles: {
    id: 'quest_res_chronicles',
    title: 'Chronicles of the Great Drift',
    category: 'research',
    giverName: 'Historical Codex',
    regionId: 'verdant_reach',
    description: 'Locate and study 2 ancient stone inscriptions or expedition research logs scattered among the ruins.',
    loreSnippet: 'The survivors recorded their observations on basalt tablets to resist centuries of erosion by cloud mist.',
    objectives: [
      {
        id: 'obj_study_records',
        description: 'Examine ancient inscriptions or research logs',
        targetCount: 2,
        currentCount: 0,
        completed: false,
        type: 'READ_RECORD',
      },
    ],
    rewards: {
      experience: 175,
      coins: 85,
    },
  },

  quest_npc_scholar_arin: {
    id: 'quest_npc_scholar_arin',
    title: "Scholar Arin's Astrolabe",
    category: 'npc',
    giverName: 'Scholar Arin',
    regionId: 'verdant_reach',
    description: 'Speak with Scholar Arin at the Research Camp and bring him 1 Glassleaf Shard to calibrate his celestial measuring instruments.',
    loreSnippet: 'Glassleaf crystals naturally refract polarized moonlight, revealing subtle fluctuations in the planet\'s magnetic spine.',
    targetLocation: [-22, 5, -28],
    targetLocationName: 'Expedition Research Camp',
    objectives: [
      {
        id: 'obj_talk_arin',
        description: 'Speak with Scholar Arin at the Research Camp',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'INTERACT_NPC',
        targetId: 'npc_scholar_arin',
        targetCoords: [-22, 5, -28],
      },
      {
        id: 'obj_deliver_glassleaf',
        description: 'Collect a Glassleaf Shard',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'COLLECT',
        targetId: 'glassleaf_shard',
      },
    ],
    rewards: {
      experience: 150,
      coins: 75,
      items: [{ itemId: 'elixir_of_clarity', quantity: 1 }],
    },
  },

  quest_boss_crimson: {
    id: 'quest_boss_crimson',
    title: 'Bane of the Crimson Eclipse',
    category: 'boss',
    giverName: 'Blood Moon Prophecy',
    regionId: 'verdant_reach',
    description: 'When the Red Moon ascends into the sky, confront the colossal Crimson Warden at the Blood Altar and vanquish the ancient sentinel.',
    loreSnippet: 'The Crimson Warden awakens only when the lunar eclipse aligns with the void fault line, hungering for celestial aether.',
    targetLocation: [60, 8, 55],
    targetLocationName: 'The Crimson Altar Plateau',
    objectives: [
      {
        id: 'obj_defeat_warden',
        description: 'Defeat the Crimson Warden during the Red Moon',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'DEFEAT_BOSS',
        targetId: 'crimson_warden',
        targetCoords: [60, 8, 55],
      },
    ],
    rewards: {
      experience: 500,
      coins: 250,
      items: [{ itemId: 'crimson_heart_relic', quantity: 1 }],
    },
  },

  quest_dim_traverse: {
    id: 'quest_dim_traverse',
    title: 'Beyond the Cloudveil',
    category: 'dimension',
    giverName: 'Void Resonance',
    regionId: 'verdant_reach',
    description: 'Activate the ancient Dimensional Gateway in the Rift Valley and step through into the uncharted Expanse.',
    loreSnippet: 'Beyond the terrestrial atmosphere lie endless floating archipelagos, each with unique biomes, gravity anomalies, and celestial relics.',
    prerequisiteQuestId: 'quest_main_8_portal',
    targetLocation: [-50, 6.0, -20],
    targetLocationName: 'Dimensional Gateway',
    objectives: [
      {
        id: 'obj_unlock_portal',
        description: 'Step into the awakened Dimensional Gateway',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'DISCOVER_PORTAL',
        targetId: 'disc_dimensional_gateway',
        targetCoords: [-50, 6.0, -20],
      },
    ],
    rewards: {
      experience: 400,
      coins: 200,
    },
  },

  quest_event_red_moon: {
    id: 'quest_event_red_moon',
    title: 'Crimson Night Vigil',
    category: 'event',
    giverName: 'Lunar Warning',
    regionId: 'verdant_reach',
    description: 'Survive the full duration of a rare Red Moon night until dawn returns, resisting the aggressive blood fog and void apparitions.',
    loreSnippet: 'Those who endure the blood-drenched moonlight are said to gain heightened attunement to dimensional leylines.',
    objectives: [
      {
        id: 'obj_survive_night',
        description: 'Endure the Red Moon event until dawn',
        targetCount: 1,
        currentCount: 0,
        completed: false,
        type: 'SURVIVE_RED_MOON',
      },
    ],
    rewards: {
      experience: 300,
      coins: 150,
      items: [{ itemId: 'ember_surge_tonic', quantity: 2 }],
    },
  },
};
