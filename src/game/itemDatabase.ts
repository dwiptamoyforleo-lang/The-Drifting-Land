import { InventoryItem, CraftingRecipe, ItemRarity } from './types';

export const ITEM_DATABASE: Record<string, InventoryItem> = {
  'mat-stone': {
    id: 'mat-stone',
    name: 'Basalt Strata Stone',
    description: 'Dense structural stone quarried from floating platform foundations.',
    category: 'crafting_materials',
    rarity: 'common',
    quantity: 1,
    valueCoins: 12,
    icon: 'mountain',
  },
  'mat-wood': {
    id: 'mat-wood',
    name: 'Petrified Driftwood',
    description: 'Aged timber infused with cloud-resin from ancient canopy groves.',
    category: 'crafting_materials',
    rarity: 'common',
    quantity: 1,
    valueCoins: 15,
    icon: 'tree-pine',
  },
  'mat-lumenvine': {
    id: 'mat-lumenvine',
    name: 'Lumenvine Tendril',
    description: 'Bioluminescent plant fiber radiating soft teal illumination.',
    category: 'resources',
    rarity: 'uncommon',
    quantity: 1,
    valueCoins: 25,
    icon: 'sparkles',
    healAmount: 20,
  },
  'mat-celestine': {
    id: 'mat-celestine',
    name: 'Celestine Crystal Shard',
    description: 'Crystalline energy node harvested from citadel energy conduits.',
    category: 'resources',
    rarity: 'rare',
    quantity: 1,
    valueCoins: 45,
    icon: 'gem',
    staminaAmount: 35,
  },
  'mat-titanium': {
    id: 'mat-titanium',
    name: 'Titanium Conduit Alloy',
    description: 'High-strength aerospace alloy used in citadel pylons and airships.',
    category: 'crafting_materials',
    rarity: 'rare',
    quantity: 1,
    valueCoins: 60,
    icon: 'shield',
  },
  'mat-ancient-gear': {
    id: 'mat-ancient-gear',
    name: 'Ancient Clockwork Gear',
    description: 'Intricately machined brass gear recovered from ruined observation arches.',
    category: 'ancient_relics',
    rarity: 'epic',
    quantity: 1,
    valueCoins: 120,
    icon: 'hammer',
  },
  'mat-moonlit-antler': {
    id: 'mat-moonlit-antler',
    name: 'Moonlit Antler Shard',
    description: 'Blessed crystalline horn fragment bestowed by the nocturnal Moon Deer.',
    category: 'rare_loot',
    rarity: 'legendary',
    quantity: 1,
    valueCoins: 350,
    icon: 'sparkles',
    tradeOffDescription: '+25% Max Stamina & Night Vision Aura',
  },
  'tool-survey-multitool': {
    id: 'tool-survey-multitool',
    name: 'Field Survey Multi-Tool',
    description: 'Standard exploration multi-tool equipped with scanning lasers and mining torque.',
    category: 'tools_equipment',
    rarity: 'common',
    quantity: 1,
    valueCoins: 80,
    icon: 'hammer',
    equipmentSlot: 'tool',
    tradeOffDescription: '+15% Mining Efficiency',
  },
  'armor-kinetic-suit': {
    id: 'armor-kinetic-suit',
    name: 'Kinetic Exo-Weave Suit',
    description: 'Pressurized multi-layer flight suit designed for high-altitude wind shear.',
    category: 'tools_equipment',
    rarity: 'uncommon',
    quantity: 1,
    valueCoins: 150,
    icon: 'shield',
    equipmentSlot: 'protective',
    tradeOffDescription: '+25 Max HP, -35% Fall Damage',
  },
  'explore-magnetic-boots': {
    id: 'explore-magnetic-boots',
    name: 'Magnetic Thruster Boots',
    description: 'Repulsor boots allowing secure attachment to metal catwalks and increased sprint speed.',
    category: 'tools_equipment',
    rarity: 'rare',
    quantity: 1,
    valueCoins: 240,
    icon: 'zap',
    equipmentSlot: 'exploration',
    tradeOffDescription: '+20% Movement Speed',
  },
  'food-field-medkit': {
    id: 'food-field-medkit',
    name: 'Field Recovery Salve',
    description: 'Emergency restorative balm that heals +45 Health instantly.',
    category: 'food_recovery',
    rarity: 'uncommon',
    quantity: 1,
    valueCoins: 50,
    icon: 'activity',
    healAmount: 45,
  },
  'food-lumenvine-tea': {
    id: 'food-lumenvine-tea',
    name: 'Lumenvine Herbal Infusion',
    description: 'Steeped natural tea that restores +50 Stamina and clears mental fatigue.',
    category: 'food_recovery',
    rarity: 'common',
    quantity: 1,
    valueCoins: 35,
    icon: 'coffee',
    staminaAmount: 50,
  },
};

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'recipe-medkit',
    name: 'Field Recovery Salve',
    category: 'food_recovery',
    description: 'Synthesize soothing botanical salve from lumenvine fibers and stone dust.',
    resultItem: ITEM_DATABASE['food-field-medkit'],
    resultCount: 2,
    materials: [
      { itemId: 'mat-lumenvine', itemName: 'Lumenvine Tendril', count: 2, icon: 'sparkles' },
      { itemId: 'mat-stone', itemName: 'Basalt Strata Stone', count: 1, icon: 'mountain' },
    ],
  },
  {
    id: 'recipe-armor',
    name: 'Kinetic Exo-Weave Suit',
    category: 'protective',
    description: 'Weave durable titanium alloys and driftwood into a pressurized flight suit.',
    resultItem: ITEM_DATABASE['armor-kinetic-suit'],
    resultCount: 1,
    materials: [
      { itemId: 'mat-titanium', itemName: 'Titanium Conduit Alloy', count: 3, icon: 'shield' },
      { itemId: 'mat-wood', itemName: 'Petrified Driftwood', count: 4, icon: 'tree-pine' },
    ],
  },
  {
    id: 'recipe-boots',
    name: 'Magnetic Thruster Boots',
    category: 'exploration',
    description: 'Calibrate celestine crystals and ancient gears into repulsor footwear.',
    resultItem: ITEM_DATABASE['explore-magnetic-boots'],
    resultCount: 1,
    materials: [
      { itemId: 'mat-celestine', itemName: 'Celestine Crystal Shard', count: 2, icon: 'gem' },
      { itemId: 'mat-ancient-gear', itemName: 'Ancient Clockwork Gear', count: 1, icon: 'hammer' },
    ],
  },
];

export function getRarityColor(rarity: ItemRarity): { bg: string; border: string; text: string; badge: string } {
  switch (rarity) {
    case 'mythic':
    case 'legendary':
      return { bg: 'bg-amber-950/60', border: 'border-amber-400/80', text: 'text-amber-300', badge: 'bg-amber-950 text-amber-300 border-amber-500/50' };
    case 'epic':
      return { bg: 'bg-purple-950/60', border: 'border-purple-400/80', text: 'text-purple-300', badge: 'bg-purple-950 text-purple-300 border-purple-500/50' };
    case 'rare':
      return { bg: 'bg-cyan-950/60', border: 'border-cyan-400/80', text: 'text-cyan-300', badge: 'bg-cyan-950 text-cyan-300 border-cyan-500/50' };
    case 'uncommon':
      return { bg: 'bg-teal-950/60', border: 'border-teal-400/80', text: 'text-teal-300', badge: 'bg-teal-950 text-teal-300 border-teal-500/50' };
    case 'common':
    default:
      return { bg: 'bg-slate-900', border: 'border-slate-700', text: 'text-slate-300', badge: 'bg-slate-800 text-slate-300 border-slate-700' };
  }
}
