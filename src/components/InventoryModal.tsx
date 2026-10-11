import React, { useState } from 'react';
import { X, Backpack, Coins, Shield, Sparkles, Gem, Compass, Battery, Eye, Check } from 'lucide-react';
import { InventoryItem, UserProfile } from '../game/types';

interface InventoryModalProps {
  inventory: InventoryItem[];
  userProfile: UserProfile;
  onUseItem?: (itemId: string) => void;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  inventory,
  userProfile,
  onUseItem,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'artifact' | 'material' | 'consumable'>('all');
  const [useFeedback, setUseFeedback] = useState<string | null>(null);

  const filteredItems = selectedCategory === 'all'
    ? inventory
    : inventory.filter((item) => item.category === selectedCategory);

  const handleItemUse = (item: InventoryItem) => {
    if (onUseItem) {
      onUseItem(item.id);
    }
    setUseFeedback(`Activated ${item.name}! Suit calibrated.`);
    setTimeout(() => setUseFeedback(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none overflow-y-auto font-['Share_Tech_Mono',monospace]">
      <div className="max-w-xl w-full bg-gradient-to-b from-slate-900 via-[#0b1320] to-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-200 relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <Backpack className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] tracking-[0.25em] text-cyan-400 uppercase">EXPLORER CARGO</div>
              <h2 className="font-['Cinzel'] text-xl font-bold tracking-wider text-white">
                Inventory & Collectibles
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{userProfile.coins || 0} Coins</span>
          </div>
        </div>

        {useFeedback && (
          <div className="mb-4 py-2 px-3.5 rounded-xl bg-cyan-950/80 border border-cyan-400 text-cyan-200 text-xs text-center flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-cyan-300" />
            <span>{useFeedback}</span>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex gap-2 mb-4 text-xs">
          {(['all', 'artifact', 'material', 'consumable'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-mono uppercase tracking-wider transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Inventory Item List */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No items in this category. Explore the drifting citadels to discover relics.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                    {item.icon === 'compass' && <Compass className="w-4 h-4" />}
                    {item.icon === 'gem' && <Gem className="w-4 h-4" />}
                    {item.icon === 'shield' && <Shield className="w-4 h-4" />}
                    {item.icon === 'battery' && <Battery className="w-4 h-4" />}
                    {item.icon === 'eye' && <Eye className="w-4 h-4" />}
                    {!['compass', 'gem', 'shield', 'battery', 'eye'].includes(item.icon) && (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">{item.name}</span>
                      <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/40 px-1.5 py-0.5 rounded">
                        x{item.quantity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    {item.category}
                  </span>
                  {item.category === 'consumable' && (
                    <button
                      onClick={() => handleItemUse(item)}
                      className="px-2.5 py-1 rounded-lg bg-teal-600/80 hover:bg-teal-500 text-white text-[10px] font-bold cursor-pointer"
                    >
                      Use Item
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
