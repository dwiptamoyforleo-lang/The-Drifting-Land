import React from 'react';
import { X, ShoppingBag, Coins, Shield, Sparkles, Check, ArrowRight } from 'lucide-react';
import { InventoryItem, UserProfile } from '../game/types';

interface ShopModalProps {
  userProfile: UserProfile;
  inventory: InventoryItem[];
  onBuyItem: (item: InventoryItem, cost: number) => void;
  onClose: () => void;
}

export const SHOP_CATALOG: Array<{
  id: string;
  name: string;
  description: string;
  category: 'material' | 'artifact' | 'consumable' | 'key_item';
  price: number;
  icon: string;
}> = [
  {
    id: 'shop-hyper-boots',
    name: 'Aetheric Grav-Boots',
    description: 'Stabilizes explorer footing during high-velocity sky-bridge traversal.',
    category: 'artifact',
    price: 180,
    icon: 'zap',
  },
  {
    id: 'shop-energy-cell',
    name: 'Harmonic Quantum Cell',
    description: 'Pre-charged plasma battery that accelerates anchor harmonization.',
    category: 'consumable',
    price: 95,
    icon: 'battery',
  },
  {
    id: 'shop-red-moon-charm',
    name: 'Tears of Kepler (Red Moon Charm)',
    description: 'Rare talisman forged from celestial eclipse dust. Protects against gravitational distortions.',
    category: 'artifact',
    price: 320,
    icon: 'moon',
  },
  {
    id: 'shop-bio-scanner',
    name: 'Bioluminescent Flora Scanner',
    description: 'Spectral optic module for logging rare flora and wildlife behavior.',
    category: 'key_item',
    price: 150,
    icon: 'eye',
  },
  {
    id: 'shop-nanite-pack',
    name: 'Industrial Nanite Pack x5',
    description: 'Emergency composite spray to patch breaches and mechanical consoles.',
    category: 'consumable',
    price: 80,
    icon: 'shield',
  },
];

export const ShopModal: React.FC<ShopModalProps> = ({
  userProfile,
  inventory,
  onBuyItem,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none overflow-y-auto font-['Share_Tech_Mono',monospace]">
      <div className="max-w-2xl w-full bg-gradient-to-b from-slate-900 via-[#0b1320] to-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-200 relative my-auto">
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
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] tracking-[0.25em] text-amber-400 uppercase">CELESTIAL MARKETPLACE</div>
              <h2 className="font-['Cinzel'] text-xl font-bold tracking-wider text-white">
                Sky Bazaar & Outfitter
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-sm font-bold">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{userProfile.coins || 0} COINS</span>
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
          {SHOP_CATALOG.map((item) => {
            const hasPurchased = inventory.some((inv) => inv.id === item.id);
            const canAfford = (userProfile.coins || 0) >= item.price;

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-100">{item.name}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold font-mono">
                    <Coins className="w-3.5 h-3.5" />
                    <span>{item.price} Coins</span>
                  </div>

                  {hasPurchased ? (
                    <span className="flex items-center gap-1 text-[11px] text-teal-400 font-bold">
                      <Check className="w-3.5 h-3.5" /> Owned
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        if (canAfford) {
                          onBuyItem(
                            {
                              id: item.id,
                              name: item.name,
                              description: item.description,
                              category: item.category,
                              quantity: 1,
                              valueCoins: item.price,
                              icon: item.icon,
                            },
                            item.price
                          );
                        }
                      }}
                      disabled={!canAfford}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        canAfford
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950/40 active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? 'Purchase' : 'Insufficient Coins'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
          Find celestial coins by attuning ancient anchors and exploring distant citadels.
        </div>
      </div>
    </div>
  );
};
