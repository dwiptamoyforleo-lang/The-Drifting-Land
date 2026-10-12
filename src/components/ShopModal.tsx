/**
 * Advanced Drift Coins Economy, Shop & Multi-Trader Marketplace
 * Implements:
 * - Drift Coins currency balance and safety locks (no negative balance, anti-double-tap)
 * - Buying and Selling tabs with stock counters
 * - Dedicated Human & Non-Human Traders (Aero-Haven, The Mosskeeper, The Drift Collector, The Moon Moth, The Rift Broker)
 * - Contextual unlocks (night/red moon, anchor requirements, quest completion)
 * - Clear purchase/sale confirmation toasts & sounds
 */
import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  Coins,
  Shield,
  Sparkles,
  Check,
  AlertCircle,
  Gem,
  Flame,
  Zap,
  Radio,
  Clock,
  Droplet,
  Coffee,
  Activity,
  TreePine,
  Mountain,
  Sun,
  Wind,
  Box,
  Key,
  Eye,
  Compass,
  ArrowRightLeft,
  Lock,
  Tag,
  Package,
  Hammer,
} from 'lucide-react';
import { InventoryItem, UserProfile, ShopItem, TimeOfDay } from '../game/types';
import { getRarityColor, ITEM_DATABASE } from '../game/itemDatabase';
import { soundSystem } from '../game/audio';

interface ShopModalProps {
  userProfile: UserProfile;
  inventory: InventoryItem[];
  timeOfDay?: TimeOfDay;
  anchorCount?: number;
  initialTraderId?: string;
  onBuyItem: (item: InventoryItem, cost: number) => void;
  onSellItem: (itemId: string, quantity: number, earnings: number) => void;
  onClose: () => void;
}

export interface TraderProfile {
  id: string;
  name: string;
  role: string;
  type: 'human' | 'creature';
  location: string;
  description: string;
  icon: string;
}

export const TRADERS: TraderProfile[] = [
  {
    id: 'trader-all',
    name: 'Unified Archipelago Market',
    role: 'All Regional Merchants',
    type: 'human',
    location: 'Cross-Sector Relay',
    description: 'Browse standard goods from all connected settlements and expeditions.',
    icon: 'bag',
  },
  {
    id: 'trader-haven',
    name: 'Trader Oakhaven',
    role: 'Aero-Haven General Outfitter',
    type: 'human',
    location: 'Sector 01: Observation Deck',
    description: 'Expeditionary survivor selling essentials, medical salves, and basic tools.',
    icon: 'user',
  },
  {
    id: 'trader-mosskeeper',
    name: 'The Mosskeeper',
    role: 'Ancient Arboreal Golem',
    type: 'creature',
    location: 'Sector 04: Geodesic Biosphere',
    description: 'Verdant non-human entity trading luminescent flora, rare seeds, and botanical tonics.',
    icon: 'tree-pine',
  },
  {
    id: 'trader-collector',
    name: 'The Drift Collector',
    role: 'Nomadic Aviary Scavenger',
    type: 'creature',
    location: 'Sector 02: Sky-Bridges',
    description: 'Feathered scrap-merchant who scavenges fragments from shattered catwalks.',
    icon: 'sparkles',
  },
  {
    id: 'trader-moon-moth',
    name: 'The Moon Moth',
    role: 'Celestial Lunar Entity',
    type: 'creature',
    location: 'Ethereal Altitudes (Night / Red Moon)',
    description: 'Mystical nocturnal moth creature that trades lunar talismans and eclipse dust.',
    icon: 'sun',
  },
  {
    id: 'trader-rift-broker',
    name: 'The Rift Broker',
    role: 'Dimensional Phase Being',
    type: 'creature',
    location: 'Sector 03: Citadel Sanctum',
    description: 'Entity oscillating between dimensional fractures, trading chrono and void tech.',
    icon: 'radio',
  },
];

export const EXPANDED_SHOP_CATALOG: ShopItem[] = [
  // 1. Aero-Haven Outfitter
  {
    id: 'food-field-medkit',
    name: 'Field Recovery Salve',
    description: 'Herbal balm that restores +45 Health and eases kinetic bruises.',
    category: 'food_recovery',
    rarity: 'uncommon',
    price: 55,
    icon: 'activity',
    traderId: 'trader-haven',
  },
  {
    id: 'food-nanite-gel',
    name: 'Aerosol Nanite Gel',
    description: 'Biomedical pressure spray restoring +85 Health and stabilizing suit integrity.',
    category: 'food_recovery',
    rarity: 'rare',
    price: 110,
    icon: 'shield',
    traderId: 'trader-haven',
  },
  {
    id: 'tool-survey-multitool',
    name: 'Field Survey Multi-Tool',
    description: 'High-torque expeditionary tool that accelerates mineral extraction.',
    category: 'tools_equipment',
    rarity: 'common',
    price: 90,
    icon: 'hammer',
    traderId: 'trader-haven',
  },
  {
    id: 'armor-kinetic-suit',
    name: 'Kinetic Exo-Weave Suit',
    description: 'Pressurized multi-layer flight suit (+25 Max HP, -35% Fall Damage).',
    category: 'tools_equipment',
    rarity: 'uncommon',
    price: 160,
    icon: 'shield',
    requiredAnchorCount: 1,
    traderId: 'trader-haven',
  },

  // 2. The Mosskeeper (Creature Trader)
  {
    id: 'mat-lumenvine',
    name: 'Lumenvine Tendril Bundle x3',
    description: 'Fresh bioluminescent tendrils harvested from untouched cloud-groves.',
    category: 'resources',
    rarity: 'uncommon',
    price: 60,
    icon: 'sparkles',
    traderId: 'trader-mosskeeper',
  },
  {
    id: 'food-lumenvine-tea',
    name: 'Lumenvine Herbal Infusion x2',
    description: 'Steeped natural tea that calms stamina exhaustion and restores +50 Stamina.',
    category: 'food_recovery',
    rarity: 'common',
    price: 45,
    icon: 'coffee',
    traderId: 'trader-mosskeeper',
  },
  {
    id: 'explore-lantern',
    name: 'Lumenvine Lantern',
    description: 'Handcrafted luminary powered by live moss fibers; lights up dark ruins.',
    category: 'tools_equipment',
    rarity: 'uncommon',
    price: 130,
    icon: 'flame',
    requiredAnchorCount: 1,
    traderId: 'trader-mosskeeper',
  },

  // 3. The Drift Collector (Creature Trader)
  {
    id: 'mat-titanium',
    name: 'Titanium Conduit Alloy x2',
    description: 'Aerospace structural alloy salvaged from collapsed observation wings.',
    category: 'crafting_materials',
    rarity: 'rare',
    price: 110,
    icon: 'shield',
    traderId: 'trader-collector',
  },
  {
    id: 'mat-wood',
    name: 'Petrified Driftwood x5',
    description: 'Salvaged ancient wood from pre-drift groves drifting in the lower fog.',
    category: 'crafting_materials',
    rarity: 'common',
    price: 40,
    icon: 'tree-pine',
    traderId: 'trader-collector',
  },
  {
    id: 'tool-lumenvine-mattock',
    name: 'Lumenvine Kinetic Mattock',
    description: 'Scavenged heavy pick (+60% mining speed, -6% movement drag).',
    category: 'tools_equipment',
    rarity: 'rare',
    price: 210,
    icon: 'hammer',
    requiredAnchorCount: 2,
    traderId: 'trader-collector',
  },

  // 4. The Moon Moth (Nocturnal / Lunar Creature)
  {
    id: 'mat-amber-resin',
    name: 'Amber Solar Resin x3',
    description: 'Solar sap that concentrated sunset radiation before the eclipse.',
    category: 'crafting_materials',
    rarity: 'uncommon',
    price: 75,
    icon: 'sun',
    requiresNight: true,
    traderId: 'trader-moon-moth',
  },
  {
    id: 'artifact-chrono-dial',
    name: 'Celestial Chrono-Dial',
    description: 'Intricate clockwork apparatus attuned to planetary transits (+12% speed).',
    category: 'rare_loot',
    rarity: 'epic',
    price: 450,
    icon: 'clock',
    requiresNight: true,
    traderId: 'trader-moon-moth',
  },
  {
    id: 'shop-red-moon-charm',
    name: 'Tears of Kepler (Red Moon Charm)',
    description: 'Rare talisman forged from crimson lunar dust. Protects against gravitational distortions.',
    category: 'ancient_relics',
    rarity: 'relic',
    price: 550,
    icon: 'sparkles',
    requiresRedMoon: true,
    traderId: 'trader-moon-moth',
  },

  // 5. The Rift Broker (Dimensional Gateway Creature)
  {
    id: 'mat-void-dust',
    name: 'Void Drift Residue x3',
    description: 'Exotic particulate matter collected at the perimeter of dimensional tears.',
    category: 'crafting_materials',
    rarity: 'rare',
    price: 180,
    icon: 'wind',
    requiredAnchorCount: 2,
    traderId: 'trader-rift-broker',
  },
  {
    id: 'explore-magnetic-boots',
    name: 'Magnetic Thruster Boots',
    description: 'Repulsor boots providing +20% movement speed and -40% fall impact.',
    category: 'tools_equipment',
    rarity: 'rare',
    price: 280,
    icon: 'zap',
    requiredAnchorCount: 2,
    traderId: 'trader-rift-broker',
  },
  {
    id: 'relic-heart-archipelago',
    name: 'Heart of the Archipelago',
    description: 'Primary gravitational relic of the drifting citadels (+35 HP, +35 Stamina).',
    category: 'ancient_relics',
    rarity: 'relic',
    price: 750,
    icon: 'sparkles',
    requiredAnchorCount: 3,
    traderId: 'trader-rift-broker',
  },
];

export const ShopModal: React.FC<ShopModalProps> = ({
  userProfile,
  inventory,
  timeOfDay = 'sunset',
  anchorCount = 0,
  initialTraderId = 'trader-all',
  onBuyItem,
  onSellItem,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [selectedTraderId, setSelectedTraderId] = useState<string>(initialTraderId);
  const [transactionFeedback, setTransactionFeedback] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const showNotification = (msg: string) => {
    setTransactionFeedback(msg);
    setTimeout(() => setTransactionFeedback(null), 3000);
  };

  const currentCoins = userProfile.coins || 0;

  // Filter catalog by trader
  const filteredCatalog = EXPANDED_SHOP_CATALOG.filter((item) => {
    if (selectedTraderId === 'trader-all') return true;
    return item.traderId === selectedTraderId;
  });

  const activeTrader = TRADERS.find((t) => t.id === selectedTraderId) || TRADERS[0];

  // Check item unlock requirements
  const checkUnlock = (item: ShopItem): { unlocked: boolean; reason?: string } => {
    if (item.requiredAnchorCount && anchorCount < item.requiredAnchorCount) {
      return {
        unlocked: false,
        reason: `Requires ${item.requiredAnchorCount} Attuned Anchors [Current: ${anchorCount}]`,
      };
    }
    if (item.requiresNight && timeOfDay !== 'night' && timeOfDay !== 'red_moon') {
      return {
        unlocked: false,
        reason: 'Available only during Night or Red Moon cycle',
      };
    }
    if (item.requiresRedMoon && timeOfDay !== 'red_moon') {
      return {
        unlocked: false,
        reason: 'Available exclusively during celestial Red Moon eclipse',
      };
    }
    return { unlocked: true };
  };

  const handleBuy = (item: ShopItem) => {
    if (isProcessing) return;
    const { unlocked, reason } = checkUnlock(item);
    if (!unlocked) {
      showNotification(`Locked: ${reason}`);
      return;
    }
    if (currentCoins < item.price) {
      showNotification(`Insufficient Drift Coins! Need ${item.price}c (Have ${currentCoins}c).`);
      return;
    }

    setIsProcessing(true);
    soundSystem.playHarvestTone();

    const fullItem: InventoryItem = ITEM_DATABASE[item.id] || {
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      rarity: item.rarity || 'common',
      quantity: 1,
      valueCoins: item.price,
      icon: item.icon,
    };

    onBuyItem(fullItem, item.price);
    showNotification(`Purchased ${item.name} for ${item.price} Drift Coins!`);

    setTimeout(() => {
      setIsProcessing(false);
    }, 300);
  };

  const handleSell = (item: InventoryItem, sellAll: boolean = false) => {
    if (isProcessing || item.quantity <= 0) return;
    setIsProcessing(true);

    const countToSell = sellAll ? item.quantity : 1;
    // Sell price is 60% of original value (minimum 5 coins)
    const unitSellPrice = Math.max(5, Math.round((item.valueCoins || 20) * 0.6));
    const totalEarnings = unitSellPrice * countToSell;

    soundSystem.playFragmentCollected();
    onSellItem(item.id, countToSell, totalEarnings);
    showNotification(`Sold ${countToSell}x ${item.name} for +${totalEarnings} Drift Coins!`);

    setTimeout(() => {
      setIsProcessing(false);
    }, 300);
  };

  const renderIcon = (iconName: string, className: string = 'w-4 h-4') => {
    switch (iconName) {
      case 'hammer':
        return <Hammer className={className} />;
      case 'flame':
        return <Flame className={className} />;
      case 'shield':
        return <Shield className={className} />;
      case 'zap':
        return <Zap className={className} />;
      case 'radio':
        return <Radio className={className} />;
      case 'clock':
        return <Clock className={className} />;
      case 'droplet':
        return <Droplet className={className} />;
      case 'coffee':
        return <Coffee className={className} />;
      case 'activity':
        return <Activity className={className} />;
      case 'tree-pine':
        return <TreePine className={className} />;
      case 'mountain':
        return <Mountain className={className} />;
      case 'sun':
        return <Sun className={className} />;
      case 'wind':
        return <Wind className={className} />;
      case 'box':
        return <Box className={className} />;
      case 'key':
        return <Key className={className} />;
      case 'eye':
        return <Eye className={className} />;
      case 'compass':
        return <Compass className={className} />;
      case 'sparkles':
        return <Sparkles className={className} />;
      case 'gem':
      default:
        return <Gem className={className} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md select-none overflow-y-auto font-['Share_Tech_Mono',monospace]">
      <div className="max-w-4xl w-full bg-gradient-to-b from-slate-900 via-[#0b1320] to-slate-950 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-200 relative my-auto flex flex-col max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] tracking-[0.25em] text-amber-400 uppercase">
                SKY BAZAAR & TRADING POSTS
              </div>
              <h2 className="font-['Cinzel'] text-xl font-bold tracking-wider text-white">
                Drift Coins Marketplace
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-10">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-300 text-sm font-bold shadow-lg">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{currentCoins} DRIFT COINS</span>
            </div>
          </div>
        </div>

        {/* Notification Toast */}
        {transactionFeedback && (
          <div className="mb-3 py-2 px-3 rounded-xl bg-amber-950/90 border border-amber-400 text-amber-200 text-xs flex items-center justify-center gap-2 animate-bounce">
            <Check className="w-4 h-4 text-amber-300" />
            <span>{transactionFeedback}</span>
          </div>
        )}

        {/* Mode Selector (Buy vs Sell) */}
        <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('buy')}
              className={`px-4 py-1.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'buy'
                  ? 'bg-amber-600 text-white shadow-[0_0_14px_rgba(245,158,11,0.4)]'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Buy Supplies</span>
            </button>
            <button
              onClick={() => setActiveTab('sell')}
              className={`px-4 py-1.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'sell'
                  ? 'bg-emerald-600 text-white shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Sell Cargo & Loot</span>
            </button>
          </div>

          {activeTab === 'buy' && (
            <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
              Trader: <span className="text-amber-300 font-bold">{activeTrader.name}</span>
            </div>
          )}
        </div>

        {activeTab === 'buy' ? (
          <>
            {/* Trader Filter Tabs (Human and Non-Human Creatures) */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 text-[11px] shrink-0 font-mono">
              {TRADERS.map((trader) => (
                <button
                  key={trader.id}
                  onClick={() => setSelectedTraderId(trader.id)}
                  className={`px-2.5 py-1 rounded-xl whitespace-nowrap uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedTraderId === trader.id
                      ? 'bg-amber-600/80 text-white font-bold border border-amber-400 shadow-md'
                      : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-850'
                  }`}
                >
                  <Tag className="w-3 h-3 text-amber-400" />
                  <span>{trader.name}</span>
                  {trader.type === 'creature' && (
                    <span className="text-[9px] px-1 rounded bg-purple-900/60 text-purple-300 border border-purple-500/40">
                      Creature
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Active Trader Lore Banner */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 mb-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300">{activeTrader.name}</span>
                <span className="text-slate-400 font-sans">({activeTrader.role})</span>
              </div>
              <span className="text-[10px] text-cyan-300 font-mono hidden md:inline">
                {activeTrader.location}
              </span>
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 overflow-y-auto pr-1 max-h-[360px]">
              {filteredCatalog.map((item) => {
                const { unlocked, reason } = checkUnlock(item);
                const canAfford = currentCoins >= item.price;
                const rarityStyle = getRarityColor(item.rarity);
                const alreadyOwned = inventory.some((i) => i.id === item.id);

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      unlocked
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/40 border-slate-900 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div
                            className={`p-2 rounded-xl ${rarityStyle.bg} border ${rarityStyle.border} ${rarityStyle.text} shrink-0`}
                          >
                            {renderIcon(item.icon)}
                          </div>
                          <div className="overflow-hidden">
                            <span className="font-bold text-xs text-white truncate block">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono uppercase">
                              {item.category}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded border ${rarityStyle.badge}`}>
                          {item.rarity || 'common'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 font-sans mt-1 leading-relaxed">
                        {item.description}
                      </p>

                      {!unlocked && reason && (
                        <div className="mt-2 text-[10px] font-mono text-rose-300 bg-rose-950/40 border border-rose-900/60 p-1.5 rounded-lg flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-rose-400 shrink-0" />
                          <span>{reason}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-xs">
                      <div className="flex items-center gap-1.5 font-bold font-mono text-amber-300">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>{item.price}c</span>
                      </div>

                      <button
                        onClick={() => handleBuy(item)}
                        disabled={!unlocked || !canAfford || isProcessing}
                        className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                          !unlocked
                            ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                            : canAfford
                            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg active:scale-95'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {!unlocked ? (
                          'Locked'
                        ) : canAfford ? (
                          <>
                            <ShoppingBag className="w-3 h-3" />
                            <span>Purchase</span>
                          </>
                        ) : (
                          'Need Coins'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* SELLING TAB: Sell Cargo, Materials & Rare Loot */
          <div className="flex-1 overflow-y-auto pr-1 max-h-[390px] space-y-2.5">
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-400">
                Merchants purchase collected minerals, biological tendrils, and salvaged relics at fair barter exchange rates.
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0 ml-2">
                EXCHANGE ACTIVE
              </span>
            </div>

            {inventory.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                Your cargo hold is currently empty. Explore the drifting citadels to harvest materials!
              </div>
            ) : (
              inventory.map((item) => {
                const unitSellPrice = Math.max(5, Math.round((item.valueCoins || 20) * 0.6));
                const totalSellValue = unitSellPrice * item.quantity;
                const rarityStyle = getRarityColor(item.rarity);

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={`p-2.5 rounded-xl ${rarityStyle.bg} border ${rarityStyle.border} ${rarityStyle.text} shrink-0`}
                      >
                        {renderIcon(item.icon)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white truncate">{item.name}</span>
                          <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/60 px-1.5 py-0.2 rounded shrink-0">
                            x{item.quantity} in Cargo
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans truncate mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono">
                        <div className="text-xs text-emerald-300 font-bold flex items-center justify-end gap-1">
                          <Coins className="w-3 h-3 text-amber-400" />
                          <span>+{unitSellPrice}c ea</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Total: +{totalSellValue}c
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSell(item, false)}
                          disabled={isProcessing}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-700 text-slate-200 hover:text-white text-[11px] font-mono font-bold transition-all cursor-pointer border border-slate-700"
                          title="Sell 1 unit"
                        >
                          Sell 1
                        </button>
                        {item.quantity > 1 && (
                          <button
                            onClick={() => handleSell(item, true)}
                            disabled={isProcessing}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono font-bold transition-all cursor-pointer shadow-md"
                            title="Sell all stack"
                          >
                            Sell All ({item.quantity})
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
