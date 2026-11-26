/**
 * Contextual NPC Dialogue Database & Engine for The Drifting Land.
 * Dynamically resolves spoken lines based on:
 * - Active / completed quest progress
 * - Discovered world landmarks and structures
 * - Celestial time of day and Red Moon eclipse state
 * - Weather conditions and player exploration rank
 */

import { NpcRole } from '../types/game';

export interface DialogueContext {
  timePhase: string;
  isRedMoon: boolean;
  weatherName: string;
  explorationRank: number;
  beaconActivated: boolean;
  discoveries: string[];
  activeQuestId?: string | null;
  completedQuestIds: string[];
}

export interface NpcDialogueNode {
  speakerName: string;
  role: NpcRole;
  roleTitle: string;
  lines: string[];
  tradeCatalogId?: string;
  actionPrompt?: string;
}

export const NPC_REGISTRY: Record<string, {
  name: string;
  role: NpcRole;
  roleTitle: string;
  tradeCatalogId?: string;
}> = {
  npc_elder_soren: {
    name: 'Elder Soren',
    role: 'VILLAGE_LEADER',
    roleTitle: 'Leader of Verdant Haven',
  },
  npc_trader_orin: {
    name: 'Trader Orin',
    role: 'MERCHANT',
    roleTitle: 'Settlement Quartermaster',
    tradeCatalogId: 'trader_orin',
  },
  npc_elian_mason: {
    name: 'Elian the Stonemason',
    role: 'SETTLER',
    roleTitle: 'Homestead Mason & Smith',
  },
  npc_mira_homesteader: {
    name: 'Mira the Homesteader',
    role: 'SETTLER',
    roleTitle: 'Botanist & Hearthkeeper',
  },
  npc_wayfarer_ren: {
    name: 'Wayfarer Ren',
    role: 'TRAVELER',
    roleTitle: 'Wandering Drift Explorer',
  },
  npc_surveyor_kaelen: {
    name: 'Surveyor Kaelen',
    role: 'RESEARCHER',
    roleTitle: 'Verdant Reach Cartographer',
  },
  npc_archivist_vaelen: {
    name: 'Archivist Vaelen',
    role: 'RESEARCHER',
    roleTitle: 'Scholar of the First Drift',
  },
  npc_scout_kira: {
    name: 'Scout Kira',
    role: 'SCOUT',
    roleTitle: 'Watchtower Lookout',
  },
  npc_fenn_cartographer: {
    name: 'Fenn the Stranded',
    role: 'LOST_EXPLORER',
    roleTitle: 'Shipwrecked Cartographer',
  },
  // Trading Creatures
  npc_mosskeeper: {
    name: 'The Mosskeeper',
    role: 'TRADING_CREATURE',
    roleTitle: 'Primordial Grove Guardian',
    tradeCatalogId: 'trader_mosskeeper',
  },
  npc_drift_collector: {
    name: 'The Drift Collector',
    role: 'TRADING_CREATURE',
    roleTitle: 'Nomad Scavenger',
    tradeCatalogId: 'trader_collector',
  },
  npc_moon_moth: {
    name: 'The Moon Moth',
    role: 'TRADING_CREATURE',
    roleTitle: 'Luminescent Night Entity',
    tradeCatalogId: 'trader_moon_moth',
  },
  npc_rift_broker: {
    name: 'The Rift Broker',
    role: 'TRADING_CREATURE',
    roleTitle: 'Shrouded Dimensional Dealer',
    tradeCatalogId: 'trader_rift_broker',
  },
};

/**
 * Resolves contextual dialogue lines for an NPC based on live game state
 */
export function getContextualDialogue(npcId: string, ctx: DialogueContext): NpcDialogueNode {
  const meta = NPC_REGISTRY[npcId] || {
    name: 'Unknown Islander',
    role: 'TRAVELER' as NpcRole,
    roleTitle: 'Islander',
  };

  let lines: string[] = [];

  // Red Moon universal danger overrides
  if (ctx.isRedMoon) {
    switch (npcId) {
      case 'npc_elder_soren':
        lines = [
          'The Crimson Warden has awakened in the rift! Keep your weapons drawn and shelter by the hearth!',
          'The crimson eclipse twists the minds of beasts and turns the wind to blood. Survive until dawn, traveler!',
        ];
        break;
      case 'npc_trader_orin':
        lines = [
          'A Red Moon! If you need tonics or rations, buy them quickly before the creatures break our perimeter!',
        ];
        break;
      case 'npc_scout_kira':
        lines = [
          'I see shadows surging from the western fissure! The sky itself is bleeding crimson!',
          'Do not linger on open ledges—the Warden’s gaze reaches across all islands tonight!',
        ];
        break;
      case 'npc_mira_homesteader':
        lines = [
          'The flowers outside are closing and dripping bitter resin. Stay inside the light of our lanterns!',
        ];
        break;
      case 'npc_moon_moth':
        lines = [
          '...The red eclipse thrums in our antennae. Darkness thickens, but our silver light endures. Trade with us while the stars hide...',
        ];
        break;
      case 'npc_rift_broker':
        lines = [
          'The veil is at its thinnest. The Crimson Warden tears at the anchors. Excellent conditions for rare barter...',
        ];
        break;
      default:
        lines = [
          'The sky has turned to blood... Hold fast until the eclipse recedes!',
        ];
    }
    return {
      speakerName: meta.name,
      role: meta.role,
      roleTitle: meta.roleTitle,
      lines,
      tradeCatalogId: meta.tradeCatalogId,
    };
  }

  // Weather-specific alerts
  if (ctx.weatherName === 'STORMS' || ctx.weatherName === 'RAIN') {
    if (npcId === 'npc_elian_mason') {
      return {
        speakerName: meta.name,
        role: meta.role,
        roleTitle: meta.roleTitle,
        lines: [
          'Heavy squalls tonight! The basalt stays firm, but watch your footing along the floating rim cliffs.',
          'Storm Rays love this electrical charge in the air—look up if you hear that high hum!',
        ],
      };
    }
  }

  // Standard Contextual Progression
  switch (npcId) {
    case 'npc_elder_soren':
      if (ctx.discoveries.includes('dimensional_gateway') || ctx.discoveries.includes('disc_dimensional_gateway')) {
        lines = [
          'You found the Shattered Gateway at the edge of the world? By the ancestors...',
          'It was sealed generations ago during the Great Drift to keep the fractured void from devouring the Reach.',
          'If you have the courage to unlock it, the path to the Sunward Spire and other dimensions lies beyond.',
        ];
      } else if (ctx.discoveries.includes('ruined_watchtower') || ctx.discoveries.includes('disc_ruined_tower')) {
        lines = [
          'Scout Kira tells me you ascended the Ruined Watchtower. The old sentinels used that perch to watch the skies.',
          'Did you spot the disturbances toward the western rift? Strange vibrations have been shaking our foundation.',
        ];
      } else if (ctx.beaconActivated) {
        lines = [
          'The Monolith Beacon is ignited! Its brilliant beam cuts through the morning fog across the entire archipelago.',
          'You have given Verdant Haven hope, explorer. Our settlers can work in safety under its protective aura.',
          'Investigate the ancient ruins to the east—the old sentinels left records of how this island was severed.',
        ];
      } else {
        lines = [
          'Welcome to Verdant Haven, child of the drift. Long ago, the Great Drift tore our continent into these floating reaches.',
          'Our settlement barely holds on. The central Monolith Beacon at the clearing lies dormant and broken.',
          'If you can gather stone and repair the beacon dais, its light will guide travelers and stabilize the island.',
        ];
      }
      break;

    case 'npc_trader_orin':
      if (ctx.explorationRank >= 3) {
        lines = [
          'Back again, Fleetfoot! News travels fast—they say you can outrun the island winds.',
          'I keep fresh rations, tempered picks, and sturdy cloaks in stock. What can I get you today?',
        ];
      } else {
        lines = [
          'Greetings! I am Trader Orin. I supply the pioneers with tools, food, and medicine.',
          'Have Drift Coins? I buy raw materials, ore, and creature fibers, and sell outfitting gear for your travels.',
        ];
      }
      break;

    case 'npc_elian_mason':
      lines = [
        'Hmph! Working basalt is honest work. These stone blocks keep the cold mountain draft out of our shelters.',
        'If you find raw iron ore or basalt slate in the hills, bring it by Trader Orin or use the workbench to forge tools.',
        'A good pickaxe doubles your mining yield on those crystal-veined boulders!',
      ];
      break;

    case 'npc_mira_homesteader':
      if (ctx.timePhase === 'NIGHT') {
        lines = [
          'Even in the dark, the nocturnal flora breathes. Moonblooms only open when the sun slips below the clouds.',
          'Glowhares come right up to the garden fence at night—their luminescent fur is so soft.',
        ];
      } else {
        lines = [
          'Good morning! I bake our daily sun-bread and tend the whisper moss planters.',
          'Wild berries and drift nectar make the best healing salves. Never venture into the wilderness without medicine!',
        ];
      }
      break;

    case 'npc_wayfarer_ren':
      lines = [
        'Ah, sit by the campfire for a moment, friend. The wind out on the skybridge has teeth.',
        'Did you see the Cloudgrazers roaming the central meadows? Gentle giants, they are. They feed on floating cloud-plankton.',
        'And out near the rocky crags, watch for Emberfoxes. Quick as a spark, but they warm the heart.',
      ];
      break;

    case 'npc_surveyor_kaelen':
      if (ctx.beaconActivated) {
        lines = [
          'Incredible! My instruments are reading stable harmonic resonance from the beacon!',
          'With the light restored, my charts of the Verdant Reach are nearly complete. Check the codex in your journal!',
        ];
      } else {
        lines = [
          'Greetings, explorer! The air on The Verdant Reach carries the scent of ancient resin today.',
          'The central beacon has slumbered since the Great Drift divided the realms.',
          'Repair the conduit with iron and stone, then align the four primal shards on the dais!',
        ];
      }
      break;

    case 'npc_archivist_vaelen':
      if (ctx.discoveries.includes('hidden_chamber') || ctx.discoveries.includes('disc_hidden_chamber')) {
        lines = [
          'You broke the runic seal on the subterranean undercrofts? Marvelous!',
          'The Codex of the First Drift details the dimensional rupture that severed our world into floating islands.',
          'Keep searching—the past holds the key to mending these fractured skies.',
        ];
      } else {
        lines = [
          'These weathered runes predate our settlement by many centuries.',
          'They speak of a catastrophic celestial convergence—the day gravity itself was shattered.',
        ];
      }
      break;

    case 'npc_scout_kira':
      lines = [
        'Watch your step along the tower ramparts! The wind shears hard up here.',
        'From this height, you can track the migratory loops of the Storm Rays gliding in the upper thermal currents.',
        'Toward the west, past the sunken grove... there is a rift that pulses with unnatural violet light. Tread carefully.',
      ];
      break;

    case 'npc_fenn_cartographer':
      lines = [
        'Oh, thank the celestial light! A friendly face!',
        'My skiff clipped a basalt spire and crashed on these isolated rocks. I thought I would be marooned here forever!',
        'Take this navigational sketch and drift coins as my heartfelt thanks for finding me!',
      ];
      break;

    case 'npc_mosskeeper':
      lines = [
        '...Root and branch, petal and loam... You tread softly upon the drifting earth, small one.',
        '...I tend the ancient seeds of the first grove. Bring me fibers from the wild, and take the vitality of the green...',
      ];
      break;

    case 'npc_drift_collector':
      lines = [
        'Heh! Another wanderer picking through the bones of the sky!',
        'I collect strange junk from the old days before the sundering. If you have basalt slate or beast carapaces, I pay in cold Drift Coins!',
      ];
      break;

    case 'npc_moon_moth':
      lines = [
        '...Silver light trembles upon our wings. When the sun hides below the clouds, we bring the cool elixirs of the stars...',
        '...Trade with us under the quiet glow of the moon, traveler...',
      ];
      break;

    case 'npc_rift_broker':
      lines = [
        'The veil is delicate. What slips through the rift cannot easily return.',
        'I deal in dimensional artifacts and anomaly keys. Bring your Drift Coins if you seek to pierce the void.',
      ];
      break;

    default:
      lines = ['Greetings, traveler. May the drifting winds carry you safely.'];
  }

  return {
    speakerName: meta.name,
    role: meta.role,
    roleTitle: meta.roleTitle,
    lines,
    tradeCatalogId: meta.tradeCatalogId,
  };
}
