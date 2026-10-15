/**
 * Advanced Inventory & Equipment Modal for THE DRIFTING LAND
 * Supports all 9 item categories, 6 equipment slots with benefits & trade-offs,
 * item details panel, sorting, category filtering, hotbar assignment,
 * use/equip/discard actions, and real game data connectivity.
 */
import React, { useState } from 'react';
import {
  X,
  Backpack,
  Coins,
  Shield,
  Sparkles,
  Gem,
  Compass,
  Zap,
  Eye,
  Check,
  Hammer,
  Flame,
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
  ArrowUpDown,
  Trash2,
  Bookmark,
  Heart,
  Sliders,
} from 'lucide-react';
import {
  InventoryItem,
  UserProfile,
  ItemCategory,
  ItemRarity,
  EquipmentSlot,
  PlayerStats,
} from '../game/types';
import { getRarityColor } from '../game/itemDatabase';
import { soundSystem } from '../game/audio';

interface InventoryModalProps {
  inventory: InventoryItem[];
  userProfile: UserProfile;
  equipped: Record<EquipmentSlot, string | null>;
  playerStats?: PlayerStats;
  hotbar: (string | null)[];
  onUseItem?: (itemId: string) => void;
  onEquipItem?: (itemId: string, slot: EquipmentSlot) => void;
  onUnequipItem?: (slot: EquipmentSlot) => void;
  onAssignHotbar?: (itemId: string, slotIndex: number) => void;
  onDiscardItem?: (itemId: string) => void;
  onOpenCrafting?: () => void;
  onClose: () => void;
}

type SortOption = 'name' | 'rarity' | 'category' | 'quantity';

export const InventoryModal: React.FC<InventoryModalProps> = ({
  inventory,
  userProfile,
  equipped,
  playerStats,
  hotbar,
  onUseItem,
  onEquipItem,
  onUnequipItem,
  onAssignHotbar,
  onDiscardItem,
  onOpenCrafting,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'equipment'>('inventory');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(inventory[0]?.id || null);
  const [sortBy, setSortBy] = useState<SortOption>('rarity');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showHotbarPicker, setShowHotbarPicker] = useState<boolean>(false);

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const selectedItem = inventory.find((i) => i.id === selectedItemId) || inventory[0] || null;

  // Filter items
  const filteredItems = inventory.filter((item) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === item.category) return true;
    // Handle category aliases
    if (selectedCategory === 'tools_equipment' && (item.category === 'tools_equipment' || item.equipmentSlot)) return true;
    if (selectedCategory === 'resources' && (item.category === 'resources' || item.category === 'material')) return true;
    if (selectedCategory === 'food_recovery' && (item.category === 'food_recovery' || item.category === 'consumable')) return true;
    if (selectedCategory === 'ancient_relics' && (item.category === 'ancient_relics' || item.category === 'artifact')) return true;
    return false;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'quantity') return b.quantity - a.quantity;
    if (sortBy === 'category') return a.category.localeCompare(b.category);
    if (sortBy === 'rarity') {
      const rarityRank: Record<ItemRarity, number> = {
        mythic: 7,
        legendary: 6,
        relic: 5,
        epic: 4,
        rare: 3,
        uncommon: 2,
        common: 1,
      };
      const rankA = rarityRank[a.rarity || 'common'] || 1;
      const rankB = rarityRank[b.rarity || 'common'] || 1;
      return rankB - rankA;
    }
    return 0;
  });

  const handleUse = (item: InventoryItem) => {
    if (onUseItem) {
      onUseItem(item.id);
      showNotification(`Consumed ${item.name}! Health and stamina restored.`);
    }
  };

  const handleEquip = (item: InventoryItem) => {
    if (item.equipmentSlot && onEquipItem) {
      soundSystem.playEquipItem();
      onEquipItem(item.id, item.equipmentSlot);
      showNotification(`Equipped ${item.name} into ${item.equipmentSlot} slot.`);
    }
  };

  const handleUnequip = (slot: EquipmentSlot) => {
    if (onUnequipItem) {
      soundSystem.playEquipItem();
      onUnequipItem(slot);
      showNotification(`Unequipped ${slot} gear.`);
    }
  };

  const handleDiscard = (item: InventoryItem) => {
    if (onDiscardItem) {
      onDiscardItem(item.id);
      showNotification(`Discarded ${item.name}.`);
      if (selectedItemId === item.id) {
        setSelectedItemId(null);
      }
    }
  };

  const handleAssignHotbar = (slotIndex: number) => {
    if (selectedItem && onAssignHotbar) {
      onAssignHotbar(selectedItem.id, slotIndex);
      setShowHotbarPicker(false);
      showNotification(`Assigned ${selectedItem.name} to Hotbar Slot [${slotIndex + 1}].`);
    }
  };

  const renderIcon = (iconName: string, className: string = 'w-4 h-4') => {
    switch (iconName) {
      case 'hammer':
      case 'wrench':
        return <Hammer className={className} />;
      case 'flame':
        return <Flame className={className} />;
      case 'shield':
      case 'shield-alert':
      case 'shield-plus':
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
      case 'gem':
      default:
        return <Gem className={className} />;
    }
  };

  // Helper to find item object by ID
  const getEquippedItem = (itemId: string | null | undefined): InventoryItem | null => {
    if (!itemId) return null;
    return inventory.find((i) => i.id === itemId) || null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md select-none overflow-y-auto font-['Share_Tech_Mono',monospace]">
      <div className="max-w-5xl w-full bg-gradient-to-b from-slate-900 via-[#0b1320] to-slate-950 border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-200 relative my-auto flex flex-col max-h-[92vh]">
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
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <Backpack className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] tracking-[0.25em] text-cyan-400 uppercase">EXPEDITION MANIFEST</div>
              <h2 className="font-['Cinzel'] text-xl font-bold tracking-wider text-white">
                Cargo & Equipment Loadout
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 pr-10">
            {onOpenCrafting && (
              <button
                onClick={onOpenCrafting}
                className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Hammer className="w-3.5 h-3.5" />
                <span>Crafting Workbench</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{userProfile.coins || 0} Coins</span>
            </div>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className="mb-3 py-2 px-3 rounded-xl bg-cyan-950/90 border border-cyan-400 text-cyan-200 text-xs flex items-center justify-center gap-2 animate-bounce">
            <Check className="w-4 h-4 text-cyan-300" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Main Tabs (Cargo Inventory vs Equipment Gear) */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-slate-850 text-xs shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-1.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'inventory'
                  ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Backpack className="w-4 h-4" />
              <span>Cargo Items ({inventory.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('equipment')}
              className={`px-4 py-1.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'equipment'
                  ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Equipped Loadout (6 Slots)</span>
            </button>
          </div>

          {activeTab === 'inventory' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" /> Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort inventory items"
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 font-mono cursor-pointer"
              >
                <option value="rarity">Rarity</option>
                <option value="name">Name</option>
                <option value="category">Category</option>
                <option value="quantity">Quantity</option>
              </select>
            </div>
          )}
        </div>

        {activeTab === 'inventory' ? (
          <>
            {/* Category Filter Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 text-[11px] shrink-0 font-mono">
              {[
                { id: 'all', label: 'All' },
                { id: 'resources', label: 'Resources' },
                { id: 'food_recovery', label: 'Food & Recovery' },
                { id: 'crafting_materials', label: 'Crafting Materials' },
                { id: 'tools_equipment', label: 'Tools & Gear' },
                { id: 'quest_objects', label: 'Quest Objects' },
                { id: 'ancient_relics', label: 'Ancient Relics' },
                { id: 'rare_loot', label: 'Rare Loot' },
                { id: 'collectibles', label: 'Collectibles' },
                { id: 'special_event', label: 'Special Event' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-xl whitespace-nowrap uppercase tracking-wider transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-600/80 text-white font-bold border border-cyan-400'
                      : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-850'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* 2-Column: Inventory List + Item Details Panel */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-[340px]">
              {/* Item Grid/List (7 cols) */}
              <div className="md:col-span-7 space-y-2 overflow-y-auto pr-1 max-h-[350px]">
                {sortedItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No items in this category. Explore the drifting citadels and harvest resources.
                  </div>
                ) : (
                  sortedItems.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    const rarityStyle = getRarityColor(item.rarity);
                    const isEquipped = Object.values(equipped).includes(item.id);
                    const isHotbarAssigned = hotbar.includes(item.id);

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-slate-800/80 border-cyan-400 shadow-lg'
                            : 'bg-slate-950/60 border-slate-850 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div
                            className={`p-2 rounded-xl ${rarityStyle.bg} border ${rarityStyle.border} ${rarityStyle.text} shrink-0`}
                          >
                            {renderIcon(item.icon)}
                          </div>
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-100 truncate">{item.name}</span>
                              <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/40 px-1.5 py-0.2 rounded shrink-0">
                                x{item.quantity}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-sans truncate mt-0.5">
                              {item.description}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0 font-mono text-[10px]">
                          {isEquipped && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500 text-amber-300 font-bold">
                              EQUIPPED
                            </span>
                          )}
                          {isHotbarAssigned && !isEquipped && (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500 text-cyan-300">
                              HOTBAR
                            </span>
                          )}
                          <span className={`px-1.5 py-0.2 rounded border ${rarityStyle.badge}`}>
                            {item.rarity || 'common'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Item Details Panel (5 cols) */}
              <div className="md:col-span-5 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto">
                {selectedItem ? (
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-850">
                      <div
                        className={`p-3 rounded-2xl ${getRarityColor(selectedItem.rarity).bg} border ${
                          getRarityColor(selectedItem.rarity).border
                        } ${getRarityColor(selectedItem.rarity).text}`}
                      >
                        {renderIcon(selectedItem.icon, 'w-6 h-6')}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-['Cinzel'] text-sm sm:text-base font-bold text-white">
                            {selectedItem.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded border ${
                              getRarityColor(selectedItem.rarity).badge
                            }`}
                          >
                            {selectedItem.rarity || 'common'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Value: {selectedItem.valueCoins}c
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      {selectedItem.description}
                    </p>

                    {selectedItem.tradeOffDescription && (
                      <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800 text-[11px] text-cyan-200">
                        <span className="font-bold text-cyan-300 uppercase tracking-wider mr-1">
                          Properties:
                        </span>
                        {selectedItem.tradeOffDescription}
                      </div>
                    )}

                    {selectedItem.healAmount && (
                      <div className="flex items-center gap-2 text-xs text-emerald-300 font-mono">
                        <Heart className="w-3.5 h-3.5" />
                        <span>Restores {selectedItem.healAmount} Health</span>
                      </div>
                    )}

                    {selectedItem.staminaAmount && (
                      <div className="flex items-center gap-2 text-xs text-amber-300 font-mono">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Restores {selectedItem.staminaAmount} Stamina</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 space-y-2">
                      {/* Consumable Use */}
                      {(selectedItem.healAmount || selectedItem.staminaAmount || selectedItem.category === 'food_recovery' || selectedItem.category === 'consumable') && (
                        <button
                          onClick={() => handleUse(selectedItem)}
                          className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Activity className="w-4 h-4" />
                          <span>Consume / Apply Item</span>
                        </button>
                      )}

                      {/* Gear Equip */}
                      {selectedItem.equipmentSlot && (
                        <button
                          onClick={() => handleEquip(selectedItem)}
                          className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Shield className="w-4 h-4" />
                          <span>
                            {Object.values(equipped).includes(selectedItem.id)
                              ? 'Re-Equip Slot'
                              : `Equip to [${selectedItem.equipmentSlot.toUpperCase()}]`}
                          </span>
                        </button>
                      )}

                      {/* Hotbar Assignment */}
                      <button
                        onClick={() => setShowHotbarPicker(!showHotbarPicker)}
                        className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Assign to Hotbar (1-6)</span>
                      </button>

                      {showHotbarPicker && (
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-6 gap-1">
                          {[0, 1, 2, 3, 4, 5].map((slotIdx) => (
                            <button
                              key={slotIdx}
                              onClick={() => handleAssignHotbar(slotIdx)}
                              className="py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 font-mono text-xs font-bold transition-colors cursor-pointer"
                            >
                              [{slotIdx + 1}]
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Discard */}
                      <button
                        onClick={() => handleDiscard(selectedItem)}
                        className="w-full py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/40 text-rose-300 text-[11px] font-mono tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Discard 1 Unit</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    Select an item to view details and available actions.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Equipment Tab (6 Slots + Active Stats Breakdown) */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-[350px]">
            {/* 6 Equipment Slots (7 cols) */}
            <div className="md:col-span-7 space-y-2.5 overflow-y-auto pr-1 max-h-[350px]">
              {(
                [
                  { slot: 'tool', label: 'Tools', sub: 'Mining & Surveying' },
                  { slot: 'protective', label: 'Protective Gear', sub: 'Exo-Weave Suit & Armor' },
                  { slot: 'exploration', label: 'Exploration Equipment', sub: 'Thrusters & Lanterns' },
                  { slot: 'utility', label: 'Utility Items', sub: 'Compass & Scanners' },
                  { slot: 'relic', label: 'Special Relics', sub: 'Great Drift Relics' },
                  { slot: 'artifact', label: 'Rare Artifacts', sub: 'Celestial Apparatus' },
                ] as const
              ).map(({ slot, label, sub }) => {
                const itemId = equipped[slot];
                const item = getEquippedItem(itemId);
                const rarityStyle = item ? getRarityColor(item.rarity) : null;

                return (
                  <div
                    key={slot}
                    className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          rarityStyle
                            ? `${rarityStyle.bg} border ${rarityStyle.border} ${rarityStyle.text}`
                            : 'bg-slate-900 border border-slate-800 text-slate-500'
                        }`}
                      >
                        {item ? renderIcon(item.icon) : <Sliders className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                          {label}
                        </div>
                        <div className="font-bold text-xs text-white">
                          {item ? item.name : <span className="text-slate-500">Empty Slot</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                          {item ? item.tradeOffDescription : sub}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {item ? (
                        <button
                          onClick={() => handleUnequip(slot)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/60 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-rose-200 text-[10px] font-mono font-bold transition-all cursor-pointer"
                        >
                          Unequip
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveTab('inventory');
                            setSelectedCategory('tools_equipment');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-600 text-cyan-300 text-[10px] font-mono transition-all cursor-pointer"
                        >
                          Equip
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Character Stats Panel (5 cols) */}
            <div className="md:col-span-5 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-3.5">
                <div className="pb-2.5 border-b border-slate-850">
                  <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                    EXPLORER VANGUARD
                  </div>
                  <h3 className="font-['Cinzel'] text-lg font-bold text-white">
                    {userProfile.username || 'Aero_Vanguard'}
                  </h3>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Level {userProfile.level} Explorer | XP: {userProfile.xp}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <Heart className="w-3.5 h-3.5" /> Max Health
                    </span>
                    <span className="font-bold text-white">
                      {playerStats?.maxHealth || 100} HP
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <Zap className="w-3.5 h-3.5" /> Max Stamina
                    </span>
                    <span className="font-bold text-white">
                      {playerStats?.maxStamina || 100} ST
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <Activity className="w-3.5 h-3.5" /> Movement Pace
                    </span>
                    <span className="font-bold text-cyan-300">
                      {playerStats ? Math.round(playerStats.speedMultiplier * 100) : 100}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="flex items-center gap-1.5 text-purple-400">
                      <Shield className="w-3.5 h-3.5" /> Fall Resistance
                    </span>
                    <span className="font-bold text-purple-300">
                      {playerStats?.fallDamageReduction || 0}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Sparkles className="w-3.5 h-3.5" /> Stamina Regen
                    </span>
                    <span className="font-bold text-emerald-300">
                      {playerStats?.staminaRegenRate || 24} / sec
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-850 text-[10px] text-slate-400 leading-relaxed">
                  Gear modifications automatically apply to sprint speed, impact dampening, and survivability in harsh dimensional altitudes.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
