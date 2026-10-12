/**
 * Comprehensive Item & Recipe Database for THE DRIFTING LAND
 * Supports all 9 item categories, 6 equipment slots, stats bonuses/trade-offs,
 * and realistic crafting recipes.
 */
import { InventoryItem, CraftingRecipe, EquipmentSlot, ItemCategory, ItemRarity } from './types';

export const ITEM_DATABASE: Record<string, InventoryItem> = {
  // === 1. RESOURCES & CRAFTING MATERIALS ===
  'mat-wood': {
    id: 'mat-wood',
    name: 'Petrified Driftwood',
    description: 'Dense fibrous wood from ancient terrestrial groves carried aloft during the Great Drift.',
    category: 'crafting_materials',
    rarity: 'common',
    quantity: 1,
    maxStack: 99,
    valueCoins: 12,
    icon: 'tree-pine',
  },
  'mat-stone': {
    id: 'mat-stone',
    name: 'Basalt Strata Fragment',
    description: 'Volcanic floating stone rich in magnetic silicates, ideal for fashioning rugged tools.',
    category: 'crafting_materials',
    rarity: 'common',
    quantity: 1,
    maxStack: 99,
    valueCoins: 15,
    icon: 'mountain',
  },
  'mat-lumenvine': {
    id: 'mat-lumenvine',
    name: 'Lumenvine Fibers',
    description: 'Bioluminescent tendrils harvested from drifting sky-flora. Glows with a calming cyan radiance.',
    category: 'resources',
    rarity: 'uncommon',
    quantity: 1,
    maxStack: 99,
    valueCoins: 25,
    icon: 'sparkles',
  },
  'mat-amber-resin': {
    id: 'mat-amber-resin',
    name: 'Amber Solar Resin',
    description: 'Crystallized sap that concentrates sunset radiation, providing thermal and luminous warmth.',
    category: 'crafting_materials',
    rarity: 'uncommon',
    quantity: 1,
    maxStack: 99,
    valueCoins: 30,
    icon: 'sun',
  },
  'mat-celestine': {
    id: 'mat-celestine',
    name: 'Celestine Shard',
    description: 'Vibrant turquoise crystal harvested from high-altitude drifting citadels and floating islands.',
    category: 'resources',
    rarity: 'uncommon',
    quantity: 1,
    maxStack: 99,
    valueCoins: 45,
    icon: 'gem',
  },
  'mat-titanium': {
    id: 'mat-titanium',
    name: 'Titanium Conduit Alloy',
    description: 'Tempered aerospace alloy recovered from shattered observation decks and sky-bridge trusses.',
    category: 'crafting_materials',
    rarity: 'rare',
    quantity: 1,
    maxStack: 99,
    valueCoins: 60,
    icon: 'shield',
  },
  'mat-void-dust': {
    id: 'mat-void-dust',
    name: 'Void Drift Residue',
    description: 'Exotic particulate matter collected at the perimeter of dimensional tears and altitude rifts.',
    category: 'crafting_materials',
    rarity: 'rare',
    quantity: 1,
    maxStack: 99,
    valueCoins: 85,
    icon: 'wind',
  },
  'mat-ancient-fragment': {
    id: 'mat-ancient-fragment',
    name: 'Ancient Megastructure Fragment',
    description: 'Fractured architectural relic containing dormant computational circuits of the Pre-Drift builders.',
    category: 'quest_objects',
    rarity: 'epic',
    quantity: 1,
    maxStack: 50,
    valueCoins: 150,
    icon: 'box',
  },
  'mat-spring-water': {
    id: 'mat-spring-water',
    name: 'Floating Spring Aether',
    description: 'Zero-gravity condensed condensation gathered from cloud condensors. Highly rejuvenating.',
    category: 'resources',
    rarity: 'common',
    quantity: 1,
    maxStack: 99,
    valueCoins: 18,
    icon: 'droplet',
  },
  'mat-chrono-core': {
    id: 'mat-chrono-core',
    name: 'Chrono-Resonance Shard',
    description: 'A crystalline sliver oscillating across slight temporal offsets. Rare and unstable.',
    category: 'rare_loot',
    rarity: 'epic',
    quantity: 1,
    maxStack: 20,
    valueCoins: 220,
    icon: 'clock',
  },

  // === 2. FOOD & RECOVERY ITEMS ===
  'food-lumenvine-tea': {
    id: 'food-lumenvine-tea',
    name: 'Lumenvine Infusion',
    description: 'A soothing steeped herbal beverage that calms nerve strain and restores lost stamina.',
    category: 'food_recovery',
    rarity: 'common',
    quantity: 1,
    maxStack: 20,
    valueCoins: 28,
    icon: 'coffee',
    staminaAmount: 50,
    healAmount: 15,
  },
  'food-field-medkit': {
    id: 'food-field-medkit',
    name: 'Field Recovery Salve',
    description: 'Herbal antiseptic balm that knits kinetic impact wounds and fall bruises immediately.',
    category: 'food_recovery',
    rarity: 'uncommon',
    quantity: 1,
    maxStack: 15,
    valueCoins: 65,
    icon: 'activity',
    healAmount: 45,
    staminaAmount: 20,
  },
  'food-nanite-gel': {
    id: 'food-nanite-gel',
    name: 'Aerosol Nanite Gel',
    description: 'Pressurized biomedical spray that repairs explorer suit fractures and restores critical health.',
    category: 'food_recovery',
    rarity: 'rare',
    quantity: 1,
    maxStack: 10,
    valueCoins: 110,
    icon: 'shield-plus',
    healAmount: 85,
    staminaAmount: 40,
  },

  // === 3. TOOLS & EQUIPMENT ===
  'tool-survey-multitool': {
    id: 'tool-survey-multitool',
    name: 'Field Survey Multi-Tool',
    description: 'Standard expeditionary rotary tool for harvesting ore and surveying architecture.',
    category: 'tools_equipment',
    rarity: 'common',
    equipmentSlot: 'tool',
    quantity: 1,
    maxStack: 1,
    valueCoins: 90,
    icon: 'wrench',
    stats: {
      miningEfficiency: 1.15,
      speedMultiplier: 1.0,
    },
    tradeOffDescription: 'Standard issue. No negative trade-offs.',
  },
  'tool-lumenvine-mattock': {
    id: 'tool-lumenvine-mattock',
    name: 'Lumenvine Kinetic Mattock',
    description: 'Reinforced heavy pick infused with resonant crystal frequencies for accelerated mining.',
    category: 'tools_equipment',
    rarity: 'rare',
    equipmentSlot: 'tool',
    quantity: 1,
    maxStack: 1,
    valueCoins: 210,
    icon: 'hammer',
    stats: {
      miningEfficiency: 1.6,
      speedMultiplier: 0.94,
    },
    tradeOffDescription: '+60% resource extraction rate, but 6% heavier movement drag.',
  },
  'tool-resonance-calibrator': {
    id: 'tool-resonance-calibrator',
    name: 'Resonance Calibrator',
    description: 'A precision tuning fork that amplifies spatial anchor frequencies and accelerates attunement.',
    category: 'tools_equipment',
    rarity: 'epic',
    equipmentSlot: 'tool',
    quantity: 1,
    maxStack: 1,
    valueCoins: 350,
    icon: 'radio',
    stats: {
      miningEfficiency: 1.35,
      speedMultiplier: 1.05,
    },
    tradeOffDescription: 'Enhanced spatial attunement speed and +5% expeditionary pace.',
  },

  // === 4. PROTECTIVE GEAR ===
  'armor-kinetic-suit': {
    id: 'armor-kinetic-suit',
    name: 'Kinetic Exo-Weave Suit',
    description: 'Multi-layer composite pressurized flight suit with shock-absorbing micro-dampeners.',
    category: 'tools_equipment',
    rarity: 'uncommon',
    equipmentSlot: 'protective',
    quantity: 1,
    maxStack: 1,
    valueCoins: 160,
    icon: 'shield',
    stats: {
      maxHealthBonus: 25,
      fallDamageReduction: 0.35,
      speedMultiplier: 0.96,
    },
    tradeOffDescription: '+25 Max Health and -35% Fall Damage, but -4% sprint agility.',
  },
  'armor-aegis-shield': {
    id: 'armor-aegis-shield',
    name: 'Aegis Hazard Rig',
    description: 'Heavy shielded cuirass engineered to endure harsh dimensional radiation and Red Moon storms.',
    category: 'tools_equipment',
    rarity: 'epic',
    equipmentSlot: 'protective',
    quantity: 1,
    maxStack: 1,
    valueCoins: 420,
    icon: 'shield-alert',
    stats: {
      maxHealthBonus: 50,
      fallDamageReduction: 0.5,
      speedMultiplier: 0.9,
    },
    tradeOffDescription: '+50 Max Health and -50% Fall Damage, with -10% mobility penalty.',
  },

  // === 5. EXPLORATION EQUIPMENT ===
  'explore-lantern': {
    id: 'explore-lantern',
    name: 'Lumenvine Lantern',
    description: 'Enclosed brass luminary powered by bioluminescent fibers. Casts warm amber-cyan light in ruins.',
    category: 'tools_equipment',
    rarity: 'uncommon',
    equipmentSlot: 'exploration',
    quantity: 1,
    maxStack: 1,
    valueCoins: 130,
    icon: 'flame',
    stats: {
      illuminationRadius: 15,
      staminaRegenMultiplier: 1.1,
    },
    tradeOffDescription: 'Illuminates dark caves and ruins; provides +10% calmer stamina recovery.',
  },
  'explore-magnetic-boots': {
    id: 'explore-magnetic-boots',
    name: 'Magnetic Thruster Boots',
    description: 'Aero-thruster boots that generate upward repulsor lift, reducing fall impacts and boosting sprint.',
    category: 'tools_equipment',
    rarity: 'rare',
    equipmentSlot: 'exploration',
    quantity: 1,
    maxStack: 1,
    valueCoins: 280,
    icon: 'zap',
    stats: {
      speedMultiplier: 1.2,
      fallDamageReduction: 0.4,
      maxStaminaBonus: 15,
    },
    tradeOffDescription: '+20% Movement Speed, +15 Stamina, and -40% Fall Damage.',
  },

  // === 6. UTILITY ITEMS ===
  'util-compass': {
    id: 'item-compass',
    name: 'Aetheric Field Compass',
    description: 'Precision celestial instrument calibrated to detect magnetic anomalies and drifting anchors.',
    category: 'tools_equipment',
    rarity: 'uncommon',
    equipmentSlot: 'utility',
    quantity: 1,
    maxStack: 1,
    valueCoins: 120,
    icon: 'compass',
    stats: {
      staminaRegenMultiplier: 1.15,
    },
    tradeOffDescription: 'Guides the explorer toward spatial waypoints and aids orientation.',
  },
  'util-dimensional-scanner': {
    id: 'util-dimensional-scanner',
    name: 'Dimensional Rift Sensor',
    description: 'Handheld ocular scanner that pings dimensional tears and hidden fragment deposits.',
    category: 'tools_equipment',
    rarity: 'rare',
    equipmentSlot: 'utility',
    quantity: 1,
    maxStack: 1,
    valueCoins: 230,
    icon: 'eye',
    stats: {
      miningEfficiency: 1.25,
    },
    tradeOffDescription: 'Reveals anomalous radiation signatures across the drifting archipelago.',
  },

  // === 7. SPECIAL RELICS & RARE ARTIFACTS ===
  'relic-heart-archipelago': {
    id: 'relic-heart-archipelago',
    name: 'Heart of the Archipelago',
    description: 'Pulsing cyan relic connected to the gravity stabilization core of the floating citadels.',
    category: 'ancient_relics',
    rarity: 'relic',
    equipmentSlot: 'relic',
    quantity: 1,
    maxStack: 1,
    valueCoins: 850,
    icon: 'sparkles',
    stats: {
      maxHealthBonus: 35,
      maxStaminaBonus: 35,
      staminaRegenMultiplier: 1.3,
    },
    tradeOffDescription: 'Major ancient relic. Infuses bearer with +35 HP, +35 Stamina, and +30% Stamina Regen.',
  },
  'artifact-chrono-dial': {
    id: 'artifact-chrono-dial',
    name: 'Celestial Chrono-Dial',
    description: 'Intricate clockwork apparatus turning with the planetary transit of the turquoise gas giant.',
    category: 'rare_loot',
    rarity: 'epic',
    equipmentSlot: 'artifact',
    quantity: 1,
    maxStack: 1,
    valueCoins: 600,
    icon: 'clock',
    stats: {
      speedMultiplier: 1.12,
      fallDamageReduction: 0.25,
    },
    tradeOffDescription: '+12% Movement Speed and -25% Fall Damage through micro-gravitational warping.',
  },
  'quest-anchor-key': {
    id: 'quest-anchor-key',
    name: 'Quantum Anchor Harmonic Key',
    description: 'Attunement cipher used to unlock sealed spatial bridges and ancient transit relays.',
    category: 'quest_objects',
    rarity: 'rare',
    quantity: 1,
    maxStack: 5,
    valueCoins: 180,
    icon: 'key',
  },
};

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'recipe-multitool',
    name: 'Field Survey Multi-Tool',
    description: 'Fashion a basic multi-tool from driftwood and basalt fragments.',
    category: 'tools_equipment',
    resultItem: ITEM_DATABASE['tool-survey-multitool'],
    resultCount: 1,
    materials: [
      { itemId: 'mat-wood', itemName: 'Petrified Driftwood', count: 3, icon: 'tree-pine' },
      { itemId: 'mat-stone', itemName: 'Basalt Strata Fragment', count: 2, icon: 'mountain' },
    ],
  },
  {
    id: 'recipe-lantern',
    name: 'Lumenvine Lantern',
    description: 'Combine bioluminescent fibers with amber solar resin to create an exploration lantern.',
    category: 'exploration',
    resultItem: ITEM_DATABASE['explore-lantern'],
    resultCount: 1,
    materials: [
      { itemId: 'mat-lumenvine', itemName: 'Lumenvine Fibers', count: 4, icon: 'sparkles' },
      { itemId: 'mat-amber-resin', itemName: 'Amber Solar Resin', count: 2, icon: 'sun' },
    ],
  },
  {
    id: 'recipe-salve',
    name: 'Field Recovery Salve',
    description: 'Brew soothing lumenvine fibers and fresh spring aether into restorative medical balm.',
    category: 'food_recovery',
    resultItem: ITEM_DATABASE['food-field-medkit'],
    resultCount: 1,
    materials: [
      { itemId: 'mat-lumenvine', itemName: 'Lumenvine Fibers', count: 3, icon: 'sparkles' },
      { itemId: 'mat-spring-water', itemName: 'Floating Spring Aether', count: 2, icon: 'droplet' },
    ],
  },
  {
    id: 'recipe-nanite-gel',
    name: 'Aerosol Nanite Gel',
    description: 'Refine celestine mineral shards and void drift residue into suit repair aerosol.',
    category: 'food_recovery',
    resultItem: ITEM_DATABASE['food-nanite-gel'],
    resultCount: 1,
    materials: [
      { itemId: 'mat-celestine', itemName: 'Celestine Shard', count: 3, icon: 'gem' },
      { itemId: 'mat-void-dust', itemName: 'Void Drift Residue', count: 2, icon: 'wind' },
    ],
  },
  {
    id: 'recipe-kinetic-suit',
    name: 'Kinetic Exo-Weave Suit',
    description: 'Weave shock-absorbent protective flight suit using celestine shards and lumenvine fibers.',
    category: 'protective',
    resultItem: ITEM_DATABASE['armor-kinetic-suit'],
    resultCount: 1,
    materials: [
      { itemId: 'mat-celestine', itemName: 'Celestine Shard', count: 5, icon: 'gem' },
      { itemId: 'mat-lumenvine', itemName: 'Lumenvine Fibers', count: 4, icon: 'sparkles' },
      { itemId: 'mat-titanium', itemName: 'Titanium Conduit Alloy', count: 2, icon: 'shield' },
    ],
  },
  {
    id: 'recipe-magnetic-boots',
    name: 'Magnetic Thruster Boots',
    description: 'Assemble aero-repulsor boots from aerospace titanium alloy and void particulate.',
    category: 'exploration',
    resultItem: ITEM_DATABASE['explore-magnetic-boots'],
    resultCount: 1,
    materials: [
      { itemId: 'mat-titanium', itemName: 'Titanium Conduit Alloy', count: 4, icon: 'shield' },
      { itemId: 'mat-void-dust', itemName: 'Void Drift Residue', count: 3, icon: 'wind' },
    ],
  },
  {
    id: 'recipe-resonance-calibrator',
    name: 'Resonance Calibrator',
    description: 'Combine ancient fragments and celestine crystals to repair advanced survey equipment.',
    category: 'tools_equipment',
    resultItem: ITEM_DATABASE['tool-resonance-calibrator'],
    resultCount: 1,
    materials: [
      { itemId: 'mat-ancient-fragment', itemName: 'Ancient Megastructure Fragment', count: 2, icon: 'box' },
      { itemId: 'mat-celestine', itemName: 'Celestine Shard', count: 4, icon: 'gem' },
    ],
  },
  {
    id: 'recipe-aegis-shield',
    name: 'Aegis Hazard Rig',
    description: 'Forge heavy environmental radiation armor from titanium and void drift residue.',
    category: 'protective',
    resultItem: ITEM_DATABASE['armor-aegis-shield'],
    resultCount: 1,
    materials: [
      { itemId: 'mat-titanium', itemName: 'Titanium Conduit Alloy', count: 6, icon: 'shield' },
      { itemId: 'mat-void-dust', itemName: 'Void Drift Residue', count: 4, icon: 'wind' },
      { itemId: 'mat-amber-resin', itemName: 'Amber Solar Resin', count: 3, icon: 'sun' },
    ],
  },
  {
    id: 'recipe-anchor-key',
    name: 'Quantum Anchor Harmonic Key',
    description: 'Calibrate ancient fragments to reconstruct an access key for sealed ruins.',
    category: 'special',
    resultItem: ITEM_DATABASE['quest-anchor-key'],
    resultCount: 1,
    materials: [
      { itemId: 'mat-ancient-fragment', itemName: 'Ancient Megastructure Fragment', count: 3, icon: 'box' },
      { itemId: 'mat-celestine', itemName: 'Celestine Shard', count: 3, icon: 'gem' },
    ],
  },
  {
    id: 'recipe-heart-relic',
    name: 'Heart of the Archipelago',
    description: 'Channel chrono cores and ancient fragments into the primary gravitational relic.',
    category: 'relics',
    resultItem: ITEM_DATABASE['relic-heart-archipelago'],
    resultCount: 1,
    materials: [
      { itemId: 'mat-chrono-core', itemName: 'Chrono-Resonance Shard', count: 2, icon: 'clock' },
      { itemId: 'mat-ancient-fragment', itemName: 'Ancient Megastructure Fragment', count: 4, icon: 'box' },
      { itemId: 'mat-celestine', itemName: 'Celestine Shard', count: 6, icon: 'gem' },
    ],
  },
];

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [
  { ...ITEM_DATABASE['util-compass'], quantity: 1 },
  { ...ITEM_DATABASE['tool-survey-multitool'], quantity: 1 },
  { ...ITEM_DATABASE['food-field-medkit'], quantity: 3 },
  { ...ITEM_DATABASE['food-lumenvine-tea'], quantity: 4 },
  { ...ITEM_DATABASE['mat-wood'], quantity: 5 },
  { ...ITEM_DATABASE['mat-stone'], quantity: 4 },
  { ...ITEM_DATABASE['mat-lumenvine'], quantity: 6 },
  { ...ITEM_DATABASE['mat-celestine'], quantity: 5 },
  { ...ITEM_DATABASE['mat-spring-water'], quantity: 3 },
];

export const INITIAL_EQUIPPED_SLOTS: Record<EquipmentSlot, string | null> = {
  tool: 'tool-survey-multitool',
  protective: null,
  exploration: null,
  utility: 'item-compass',
  relic: null,
  artifact: null,
};

export const INITIAL_HOTBAR_IDS: (string | null)[] = [
  'tool-survey-multitool',
  'item-compass',
  'food-field-medkit',
  'food-lumenvine-tea',
  null,
  null,
];

export function getRarityColor(rarity?: ItemRarity): {
  border: string;
  bg: string;
  text: string;
  badge: string;
} {
  switch (rarity) {
    case 'relic':
      return {
        border: 'border-amber-400',
        bg: 'bg-amber-950/40',
        text: 'text-amber-300',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    case 'epic':
      return {
        border: 'border-purple-400',
        bg: 'bg-purple-950/40',
        text: 'text-purple-300',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      };
    case 'rare':
      return {
        border: 'border-cyan-400',
        bg: 'bg-cyan-950/40',
        text: 'text-cyan-300',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      };
    case 'uncommon':
      return {
        border: 'border-emerald-400',
        bg: 'bg-emerald-950/40',
        text: 'text-emerald-300',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
    case 'common':
    default:
      return {
        border: 'border-slate-700',
        bg: 'bg-slate-900/40',
        text: 'text-slate-300',
        badge: 'bg-slate-800 text-slate-300 border-slate-700',
      };
  }
}
