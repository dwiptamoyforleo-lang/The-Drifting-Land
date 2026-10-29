/**
 * Comprehensive Inventory, Equipment & Crafting Modal for The Drifting Land.
 * Implements Prompt 7:
 * - Sorting by Name, Rarity, Quantity, Value
 * - Category filtering (Resources, Crafting Materials, Tools, Equipment, Recovery, Relics, Quests)
 * - Hotbar slot binding ([1] to [6])
 * - Equipment inspection & gear stat bonuses
 * - Data-driven atomic crafting interface with real-time material requirements check
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Coins,
  Sparkles,
  Heart,
  Zap,
  Layers,
  Wrench,
  Shield,
  Eye,
  Hammer,
  ArrowUpDown,
  Filter,
  Package,
  CheckCircle2,
  AlertCircle,
  Flame,
  Droplet,
  Compass,
} from 'lucide-react';
import {
  InventorySlot,
  ItemDefinition,
  PlayerWallet,
  EquipmentSlotType,
  EquippedGear,
} from '../types/game';
import {
  InventorySystem,
  InventorySortOption,
  InventoryFilterCategory,
} from '../systems/inventorySystem';
import { CRAFTING_RECIPES } from '../data/recipes';
import { getItemDef } from '../data/items';
import { AudioService } from '../services/audio';

interface InventoryModalProps {
  inventory: InventorySystem;
  onUseItem: (itemId: string) => void;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  inventory,
  onUseItem,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'crafting' | 'equipment'>('inventory');

  const [slots, setSlots] = useState<InventorySlot[]>(() => inventory.getSlots());
  const [wallet, setWallet] = useState<PlayerWallet>(() => ({ ...inventory.wallet }));
  const [hotbar, setHotbar] = useState<(string | null)[]>(() => [...inventory.hotbar]);
  const [equipped, setEquipped] = useState<EquippedGear>(() => ({ ...inventory.equipped }));

  const [selectedSlot, setSelectedSlot] = useState<InventorySlot | null>(() => slots[0] || null);
  const [filterCategory, setFilterCategory] = useState<InventoryFilterCategory>('all');
  const [sortOption, setSortOption] = useState<InventorySortOption>('rarity');

  const [craftingCategory, setCraftingCategory] = useState<string>('all');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(CRAFTING_RECIPES[0]?.id || '');

  useEffect(() => {
    const unsub = inventory.subscribe((updatedSlots, updatedWallet, updatedHotbar, updatedEquipped) => {
      setSlots(updatedSlots);
      setWallet(updatedWallet);
      setHotbar(updatedHotbar);
      setEquipped(updatedEquipped);

      if (selectedSlot) {
        const stillExists = updatedSlots.find((s) => s.item.id === selectedSlot.item.id);
        setSelectedSlot(stillExists || updatedSlots[0] || null);
      } else if (updatedSlots.length > 0) {
        setSelectedSlot(updatedSlots[0]);
      }
    });
    return unsub;
  }, [inventory, selectedSlot]);

  // Handle ESC or I or Tab key to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyI' || e.code === 'Tab') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'text-amber-400 bg-amber-950/60 border-amber-500/40';
      case 'epic':
        return 'text-purple-400 bg-purple-950/60 border-purple-500/40';
      case 'rare':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40';
      case 'uncommon':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-700/40';
    }
  };

  const filteredSlots = inventory.getSortedSlots(
    inventory.getFilteredSlots(filterCategory),
    sortOption
  );

  const equipBonuses = inventory.getEquipBonuses();
  const selectedRecipe = CRAFTING_RECIPES.find((r) => r.id === selectedRecipeId) || CRAFTING_RECIPES[0];

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/75">
      <div className="w-full max-w-3xl rounded-3xl bg-[#0c121d] border border-slate-800 p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <Package className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-serif font-black tracking-widest text-slate-100 uppercase">
              EXPEDITION POUCH & WORKSHOP
            </h2>
          </div>

          {/* Currencies & Close */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-amber-900/40 text-amber-300 text-xs font-mono">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="tabular-nums font-bold">{wallet.driftCoins ?? wallet.sunstoneCoins ?? 0} Drift Coins</span>
            </div>

            <button
              onClick={onClose}
              aria-label="Close inventory"
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab switcher: Inventory | Crafting | Equipment */}
        <div className="flex items-center gap-2 pt-3 pb-2">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-1.5 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/60'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/40'
            }`}
          >
            Inventory ({slots.length}/{inventory.maxSlots})
          </button>
          <button
            onClick={() => setActiveTab('crafting')}
            className={`px-4 py-1.5 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'crafting'
                ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/60'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/40'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>Field Crafting</span>
          </button>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`px-4 py-1.5 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'equipment'
                ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/60'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/40'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Equipment</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: INVENTORY POUCH & SORTING & FILTERING              */}
        {/* ========================================================= */}
        {activeTab === 'inventory' && (
          <div className="flex flex-col flex-1 overflow-hidden pt-1">
            {/* Filter Pills & Sort Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-900 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    ['all', 'All'],
                    ['resource', 'Resources'],
                    ['crafting_material', 'Materials'],
                    ['tool', 'Tools'],
                    ['equipment', 'Gear'],
                    ['recovery', 'Recovery'],
                    ['relic', 'Relics'],
                    ['quest', 'Quest'],
                  ] as [InventoryFilterCategory, string][]
                ).map(([cat, label]) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] uppercase font-mono tracking-wider transition-colors cursor-pointer ${
                      filterCategory === cat
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/40 font-bold'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-950'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] uppercase text-slate-500">Sort:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as InventorySortOption)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-[11px] focus:outline-none cursor-pointer"
                >
                  <option value="rarity">Rarity (High-Low)</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="quantity">Quantity (High-Low)</option>
                  <option value="value">Value (Coins)</option>
                  <option value="category">Category</option>
                </select>
              </div>
            </div>

            {/* Grid & Details Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 overflow-hidden flex-1">
              {/* Left Grid: 24 slots */}
              <div className="sm:col-span-2 overflow-y-auto pr-1">
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: inventory.maxSlots }).map((_, idx) => {
                    const slot = filteredSlots[idx];
                    const isSelected = selectedSlot && slot && selectedSlot.item.id === slot.item.id;
                    const isHotbarAssigned = slot && hotbar.includes(slot.item.id);
                    const hotbarSlotIndex = slot ? hotbar.indexOf(slot.item.id) : -1;

                    if (!slot) {
                      return (
                        <div
                          key={idx}
                          className="aspect-square rounded-2xl bg-slate-950/40 border border-slate-900/80 flex items-center justify-center opacity-30"
                        >
                          <span className="text-[10px] font-mono text-slate-700">{idx + 1}</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={slot.item.id + idx}
                        onClick={() => {
                          AudioService.playUiClick();
                          setSelectedSlot(slot);
                        }}
                        className={`aspect-square rounded-2xl p-2 relative flex flex-col items-center justify-center cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-950/80 border-2 border-emerald-400 shadow-lg shadow-emerald-950/50'
                            : 'bg-slate-900/90 border border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                        }`}
                      >
                        {isHotbarAssigned && (
                          <span className="absolute top-1 left-1.5 px-1 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold border border-amber-500/40">
                            #{hotbarSlotIndex + 1}
                          </span>
                        )}

                        <span className="text-xs font-bold text-slate-200 text-center leading-tight line-clamp-2">
                          {slot.item.name}
                        </span>

                        {slot.quantity > 1 && (
                          <span className="absolute bottom-1 right-2 text-[11px] font-mono font-bold text-emerald-300 tabular-nums">
                            x{slot.quantity}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Inspector: Details of selected item */}
              <div className="sm:col-span-1 bg-slate-950/90 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between overflow-y-auto">
                {selectedSlot ? (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${getRarityBadge(
                          selectedSlot.item.rarity
                        )}`}
                      >
                        {selectedSlot.item.rarity}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
                        {selectedSlot.item.category.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100 leading-snug">
                      {selectedSlot.item.name}
                    </h3>

                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      {selectedSlot.item.description}
                    </p>

                    {selectedSlot.item.lore && (
                      <p className="text-[11px] text-emerald-400/80 italic border-l-2 border-emerald-800/80 pl-2">
                        "{selectedSlot.item.lore}"
                      </p>
                    )}

                    {/* Stats Effect (Recovery/Consumable) */}
                    {selectedSlot.item.statsEffect && (
                      <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-900 text-xs font-mono">
                        {selectedSlot.item.statsEffect.heal && (
                          <div className="flex items-center gap-1.5 text-rose-400">
                            <Heart className="w-3.5 h-3.5" />
                            <span>Restores +{selectedSlot.item.statsEffect.heal} Health</span>
                          </div>
                        )}
                        {selectedSlot.item.statsEffect.stamina && (
                          <div className="flex items-center gap-1.5 text-amber-400">
                            <Zap className="w-3.5 h-3.5" />
                            <span>Restores +{selectedSlot.item.statsEffect.stamina} Stamina</span>
                          </div>
                        )}
                        {selectedSlot.item.statsEffect.speedBoostDuration && (
                          <div className="flex items-center gap-1.5 text-cyan-400">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>+{selectedSlot.item.statsEffect.speedBoostDuration}s Sprint Surge</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Equipment Bonuses */}
                    {selectedSlot.item.equipBonus && (
                      <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-900 text-xs font-mono text-emerald-300">
                        <span className="text-[10px] uppercase text-slate-500 font-bold">Equipment Perks</span>
                        {selectedSlot.item.equipBonus.healthBonus && (
                          <span>+{selectedSlot.item.equipBonus.healthBonus} Max Health</span>
                        )}
                        {selectedSlot.item.equipBonus.staminaBonus && (
                          <span>+{selectedSlot.item.equipBonus.staminaBonus} Max Stamina</span>
                        )}
                        {selectedSlot.item.equipBonus.speedBonus && (
                          <span>+{Math.round(selectedSlot.item.equipBonus.speedBonus * 10)}% Movement Speed</span>
                        )}
                        {selectedSlot.item.equipBonus.miningBonus && (
                          <span>+{selectedSlot.item.equipBonus.miningBonus} Mining Efficiency</span>
                        )}
                        {selectedSlot.item.equipBonus.lightRadius && (
                          <span>+{selectedSlot.item.equipBonus.lightRadius}m Aether Light Radius</span>
                        )}
                      </div>
                    )}

                    {/* Quick Hotbar Mapping Buttons */}
                    <div className="pt-2 border-t border-slate-900">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                        Map to Hotbar Slot:
                      </span>
                      <div className="flex items-center gap-1">
                        {[0, 1, 2, 3, 4, 5].map((hIdx) => {
                          const isHere = hotbar[hIdx] === selectedSlot.item.id;
                          return (
                            <button
                              key={hIdx}
                              onClick={() => {
                                inventory.assignToHotbar(hIdx, isHere ? null : selectedSlot.item.id);
                                AudioService.playUiClick();
                              }}
                              className={`flex-1 py-1 rounded text-center text-[10px] font-mono cursor-pointer border transition-colors ${
                                isHere
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/80 font-bold'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                              }`}
                            >
                              {hIdx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center my-auto text-slate-500 text-xs text-center font-mono">
                    Select an item from your pouch to inspect details.
                  </div>
                )}

                {/* Primary Action Button */}
                {selectedSlot && (
                  <div className="pt-3">
                    {selectedSlot.item.category === 'consumable' || selectedSlot.item.category === 'recovery' ? (
                      <button
                        onClick={() => onUseItem(selectedSlot.item.id)}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase font-mono tracking-wider cursor-pointer shadow-md transition-all"
                      >
                        Consume Item
                      </button>
                    ) : selectedSlot.item.equipSlot ? (
                      <button
                        onClick={() => {
                          const slotType = selectedSlot.item.equipSlot!;
                          if (equipped[slotType] === selectedSlot.item.id) {
                            inventory.unequipItem(slotType);
                          } else {
                            inventory.equipItem(selectedSlot.item.id);
                          }
                        }}
                        className={`w-full py-2 px-3 rounded-xl font-bold text-xs uppercase font-mono tracking-wider cursor-pointer shadow-md transition-all ${
                          equipped[selectedSlot.item.equipSlot!] === selectedSlot.item.id
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-700 hover:bg-amber-900'
                            : 'bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 hover:from-emerald-500'
                        }`}
                      >
                        {equipped[selectedSlot.item.equipSlot!] === selectedSlot.item.id
                          ? 'Unequip Gear'
                          : 'Equip Gear'}
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: FIELD CRAFTING WORKSHOP                            */}
        {/* ========================================================= */}
        {activeTab === 'crafting' && (
          <div className="flex flex-col flex-1 overflow-hidden pt-1">
            {/* Crafting Categories Filter */}
            <div className="flex items-center gap-1.5 pb-2.5 border-b border-slate-900 text-xs font-mono">
              {['all', 'tools', 'equipment', 'recovery', 'structures'].map((cCat) => (
                <button
                  key={cCat}
                  onClick={() => setCraftingCategory(cCat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-mono tracking-wider transition-colors cursor-pointer ${
                    craftingCategory === cCat
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 font-bold'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-950'
                  }`}
                >
                  {cCat}
                </button>
              ))}
            </div>

            {/* Recipes Grid & Recipe Inspector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 overflow-hidden flex-1">
              {/* Recipe list */}
              <div className="overflow-y-auto pr-1 flex flex-col gap-2">
                {CRAFTING_RECIPES.filter(
                  (r) => craftingCategory === 'all' || r.category === craftingCategory
                ).map((recipe) => {
                  const isSelected = selectedRecipe?.id === recipe.id;
                  const canCraft = recipe.ingredients.every(
                    (ing) => inventory.getItemCount(ing.itemId) >= ing.quantity
                  );

                  return (
                    <button
                      key={recipe.id}
                      onClick={() => {
                        AudioService.playUiClick();
                        setSelectedRecipeId(recipe.id);
                      }}
                      className={`p-3 rounded-2xl text-left border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-950/80 border-emerald-500 shadow-md'
                          : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                            canCraft ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          <Hammer className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">{recipe.name}</h4>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">
                            {recipe.category}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          canCraft
                            ? 'text-emerald-400 border-emerald-800 bg-emerald-950/60'
                            : 'text-slate-500 border-slate-800 bg-slate-950'
                        }`}
                      >
                        {canCraft ? 'READY' : 'MISSING'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Recipe Workbench Inspector */}
              <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between overflow-y-auto">
                {selectedRecipe ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-emerald-400 bg-emerald-950 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                        {selectedRecipe.category}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Yields {selectedRecipe.result.quantity}x
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100">{selectedRecipe.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      {selectedRecipe.description}
                    </p>

                    {/* Required Ingredients Breakdown */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-900">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">
                        Required Materials
                      </span>

                      {selectedRecipe.ingredients.map((ing) => {
                        const def = getItemDef(ing.itemId);
                        const have = inventory.getItemCount(ing.itemId);
                        const isSatisfied = have >= ing.quantity;

                        return (
                          <div
                            key={ing.itemId}
                            className={`p-2 rounded-xl flex items-center justify-between text-xs font-mono border ${
                              isSatisfied
                                ? 'bg-slate-900/60 border-slate-800 text-slate-200'
                                : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                            }`}
                          >
                            <span className="font-sans font-medium">{def?.name || ing.itemId}</span>
                            <span className="font-bold tabular-nums">
                              {have} / {ing.quantity}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Atomic Craft Button */}
                {selectedRecipe && (
                  <button
                    onClick={() => {
                      inventory.craftRecipe(selectedRecipe.id);
                    }}
                    disabled={
                      !selectedRecipe.ingredients.every(
                        (ing) => inventory.getItemCount(ing.itemId) >= ing.quantity
                      )
                    }
                    className="w-full mt-4 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-bold text-xs uppercase font-mono tracking-wider cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Hammer className="w-4 h-4" />
                    <span>Assemble & Craft</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: EQUIPMENT DOLL & ACTIVE STAT BONUSES               */}
        {/* ========================================================= */}
        {activeTab === 'equipment' && (
          <div className="flex flex-col flex-1 overflow-hidden pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 overflow-y-auto">
              {/* Equipped Gear Slots */}
              <div className="flex flex-col gap-2.5">
                {(['head', 'body', 'tool', 'accessory'] as EquipmentSlotType[]).map((slotKey) => {
                  const itemId = equipped[slotKey];
                  const itemDef = itemId ? getItemDef(itemId) : null;

                  return (
                    <div
                      key={slotKey}
                      className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                          {slotKey === 'head' && <Eye className="w-4 h-4" />}
                          {slotKey === 'body' && <Shield className="w-4 h-4" />}
                          {slotKey === 'tool' && <Wrench className="w-4 h-4" />}
                          {slotKey === 'accessory' && <Sparkles className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase text-slate-500 block">
                            {slotKey}
                          </span>
                          <h4 className="text-xs font-bold text-slate-200">
                            {itemDef ? itemDef.name : 'Empty Slot'}
                          </h4>
                        </div>
                      </div>

                      {itemDef && (
                        <button
                          onClick={() => inventory.unequipItem(slotKey)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
                        >
                          Unequip
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Cumulative Passive Stat Perks */}
              <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-mono uppercase text-emerald-400 font-bold tracking-wider mb-2">
                    Active Equipment Perks
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Stat augmentations applied in real time from worn gear.
                  </p>

                  <div className="flex flex-col gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-rose-400" /> Max Health
                      </span>
                      <span className="text-rose-300 font-bold tabular-nums">
                        +{equipBonuses.healthBonus}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" /> Max Stamina
                      </span>
                      <span className="text-amber-300 font-bold tabular-nums">
                        +{equipBonuses.staminaBonus}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Movement Velocity
                      </span>
                      <span className="text-cyan-300 font-bold tabular-nums">
                        +{Math.round(equipBonuses.speedBonus * 10)}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-emerald-400" /> Mining Power
                      </span>
                      <span className="text-emerald-300 font-bold tabular-nums">
                        +{equipBonuses.miningBonus}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400" /> Lantern Halo Radius
                      </span>
                      <span className="text-amber-300 font-bold tabular-nums">
                        +{equipBonuses.lightRadius}m
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-500 pt-3 border-t border-slate-900">
                  Tip: Assign recovery and gear to hotbar slots [1-6] for instant access.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
