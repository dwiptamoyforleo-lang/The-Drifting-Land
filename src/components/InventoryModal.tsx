/**
 * Inventory Modal for The Drifting Land.
 * Grid view of gathered resources, relics, and consumables with item details & action triggers.
 */

import React, { useState, useEffect } from 'react';
import { X, Coins, Sparkles, Heart, Zap, Layers, ShieldAlert } from 'lucide-react';
import { InventorySlot, ItemDefinition, PlayerWallet } from '../types/game';
import { InventorySystem } from '../systems/inventorySystem';
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
  const [slots, setSlots] = useState<InventorySlot[]>(() => inventory.getSlots());
  const [wallet, setWallet] = useState<PlayerWallet>(() => ({ ...inventory.wallet }));
  const [selectedSlot, setSelectedSlot] = useState<InventorySlot | null>(() => slots[0] || null);

  useEffect(() => {
    const unsub = inventory.subscribe((updatedSlots, updatedWallet) => {
      setSlots(updatedSlots);
      setWallet(updatedWallet);
      if (selectedSlot) {
        const stillExists = updatedSlots.find((s) => s.slotId === selectedSlot.slotId);
        setSelectedSlot(stillExists || updatedSlots[0] || null);
      } else if (updatedSlots.length > 0) {
        setSelectedSlot(updatedSlots[0]);
      }
    });
    return unsub;
  }, [inventory, selectedSlot]);

  // Handle ESC or I key to close
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

  const totalCapacity = inventory.maxSlots;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-2xl rounded-3xl bg-[#0c121d] border border-slate-800 p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-serif font-black tracking-widest text-slate-100 uppercase">
              EXPEDITION POUCH
            </h2>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              ({slots.length}/{totalCapacity})
            </span>
          </div>

          {/* Currencies */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-amber-900/40 text-amber-300 text-xs font-mono">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="tabular-nums font-bold">{wallet.sunstoneCoins}</span>
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

        {/* Content Body: Grid on left, Item details on right */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5 overflow-hidden flex-1">
          {/* Left Grid: 24 slots */}
          <div className="sm:col-span-2 overflow-y-auto pr-1">
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2.5">
              {Array.from({ length: totalCapacity }).map((_, idx) => {
                const slot = slots.find((s) => s.slotId === idx);
                const isSelected = selectedSlot?.slotId === idx;

                if (!slot) {
                  return (
                    <div
                      key={idx}
                      className="aspect-square rounded-2xl bg-slate-950/60 border border-slate-800/40 flex items-center justify-center opacity-40"
                    >
                      <span className="text-[10px] font-mono text-slate-700">{idx + 1}</span>
                    </div>
                  );
                }

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      AudioService.playUiClick();
                      setSelectedSlot(slot);
                    }}
                    className={`aspect-square rounded-2xl p-2 relative flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-950/70 border-2 border-emerald-400 shadow-lg shadow-emerald-950/50'
                        : 'bg-slate-900/90 border border-slate-700/60 hover:bg-slate-850 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-200 text-center leading-tight line-clamp-2">
                      {slot.item.name}
                    </span>
                    {slot.quantity > 1 && (
                      <span className="absolute bottom-1.5 right-2 text-[11px] font-mono font-bold text-emerald-300 tabular-nums">
                        x{slot.quantity}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Inspector: Details of selected item */}
          <div className="sm:col-span-1 bg-slate-950/90 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between">
            {selectedSlot ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${getRarityBadge(
                      selectedSlot.item.rarity
                    )}`}
                  >
                    {selectedSlot.item.rarity}
                  </span>
                  <span className="text-xs font-mono text-slate-400 uppercase">
                    {selectedSlot.item.category}
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

                {selectedSlot.item.statsEffect && (
                  <div className="flex flex-col gap-1 pt-2 border-t border-slate-900 text-xs font-mono">
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
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center my-auto text-slate-500 text-xs text-center font-mono">
                Select an item from your pouch to inspect details.
              </div>
            )}

            {/* Action button */}
            {selectedSlot && selectedSlot.item.category === 'consumable' && (
              <button
                onClick={() => {
                  onUseItem(selectedSlot.item.id);
                }}
                className="w-full mt-4 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase font-mono tracking-wider cursor-pointer shadow-md transition-all"
              >
                Consume Item
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
