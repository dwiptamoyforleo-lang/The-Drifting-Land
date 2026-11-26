/**
 * Trade Modal Interface for The Drifting Land.
 * Responsive buying and selling shop interface with:
 * - Tabular prices in Drift Coins
 * - Real-time balance and inventory quantity verification
 * - Dynamic quantity steppers with min/max caps
 * - Immediate feedback on insufficient coins, pouch capacity limits, and invalid sales
 * - Safe close handling via [ESC] and close button to prevent freezing the player
 */

import React, { useState, useEffect } from 'react';
import { ShoppingBag, ArrowDownLeft, ArrowUpRight, X, AlertCircle, CheckCircle, Coins } from 'lucide-react';
import { TraderCatalog, InventorySlot } from '../types/game';
import { InventorySystem } from '../systems/inventorySystem';
import { getItemDef } from '../data/items';
import { getBuyPrice, getSellPrice } from '../data/traders';
import { AudioService } from '../services/audio';

interface TradeModalProps {
  catalog: TraderCatalog;
  inventory: InventorySystem;
  onClose: () => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({ catalog, inventory, onClose }) => {
  const [activeTab, setActiveTab] = useState<'BUY' | 'SELL'>('BUY');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Live state from inventory
  const [slots, setSlots] = useState<InventorySlot[]>(() => inventory.getSlots());
  const [coins, setCoins] = useState<number>(() => inventory.getCoins());

  useEffect(() => {
    const unsub = inventory.subscribe((updatedSlots) => {
      setSlots(updatedSlots);
      setCoins(inventory.getCoins());
    });
    return unsub;
  }, [inventory]);

  // Safe Escape key handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        onClose();
      } else if (e.code === 'Tab') {
        e.preventDefault();
        setActiveTab((prev) => (prev === 'BUY' ? 'SELL' : 'BUY'));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const getQty = (id: string) => quantities[id] || 1;

  const setQty = (id: string, delta: number, maxLimit: number) => {
    const current = getQty(id);
    const next = Math.max(1, Math.min(maxLimit, current + delta));
    setQuantities((prev) => ({ ...prev, [id]: next }));
  };

  const handleBuy = (itemId: string, unitPrice: number, stockLimit?: number) => {
    const qty = getQty(itemId);
    const result = inventory.buyItem(itemId, qty, unitPrice);
    if (result.success) {
      setStatusMessage({ text: result.message, type: 'success' });
      // Reset quantity stepper
      setQuantities((prev) => ({ ...prev, [itemId]: 1 }));
    } else {
      setStatusMessage({ text: result.message, type: 'error' });
      AudioService.playUiClick();
    }
  };

  const handleSell = (itemId: string, unitPrice: number) => {
    const qty = getQty(itemId);
    const result = inventory.sellItem(itemId, qty, unitPrice);
    if (result.success) {
      setStatusMessage({ text: result.message, type: 'success' });
      setQuantities((prev) => ({ ...prev, [itemId]: 1 }));
    } else {
      setStatusMessage({ text: result.message, type: 'error' });
      AudioService.playUiClick();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-3xl bg-[#0a0f18] border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-slate-800/90 flex items-center justify-between bg-[#0e1624]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-600/50 flex items-center justify-center text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-mono font-bold text-slate-100 tracking-wide">
                  {catalog.traderName}
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {catalog.title}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans italic line-clamp-1 max-w-md">
                "{catalog.greeting}"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Player Wallet Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/40 shadow-inner">
              <Coins className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400">Drift Coins</span>
                <span className="text-sm font-mono font-bold text-amber-300 tabular-nums">
                  {coins.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Shop (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Feedback Bar */}
        <div className="px-5 py-2.5 bg-[#080d16] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('BUY')}
              className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'BUY'
                  ? 'bg-amber-600 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Purchase Wares</span>
            </button>

            <button
              onClick={() => setActiveTab('SELL')}
              className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'SELL'
                  ? 'bg-emerald-600 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Sell from Pouch</span>
            </button>
          </div>

          {/* Inline Status Message */}
          {statusMessage && (
            <div
              className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-lg ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-600/60 text-emerald-300'
                  : 'bg-rose-950/80 border border-rose-600/60 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Goods Catalog View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 min-h-[300px]">
          {activeTab === 'BUY' ? (
            /* Merchant Offers Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {catalog.offers.map((offer) => {
                const def = getItemDef(offer.itemId);
                if (!def) return null;
                const price = getBuyPrice(offer);
                const qty = getQty(offer.itemId);
                const totalCost = price * qty;
                const canAfford = coins >= totalCost;
                const maxBuyable = Math.max(1, Math.floor(coins / Math.max(1, price)));

                return (
                  <div
                    key={offer.itemId}
                    className="p-3.5 rounded-xl bg-[#0e1624] border border-slate-800/90 flex flex-col justify-between hover:border-slate-700 transition-colors gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl p-2 rounded-lg bg-slate-900 border border-slate-800">
                          {def.icon || '📦'}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold text-slate-100">{def.name}</span>
                            <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              {def.rarity}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{def.description}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <span className="text-xs font-bold text-amber-300 tabular-nums">{price} Coins</span>
                        {offer.stock && offer.stock > 0 && (
                          <div className="text-[10px] text-slate-500">Stock: {offer.stock}</div>
                        )}
                      </div>
                    </div>

                    {/* Stepper & Action Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                      {def.stackable ? (
                        <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                          <button
                            onClick={() => setQty(offer.itemId, -1, maxBuyable)}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-xs font-mono text-slate-200 tabular-nums">
                            {qty}
                          </span>
                          <button
                            onClick={() => setQty(offer.itemId, 1, maxBuyable)}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">Single item</span>
                      )}

                      <button
                        onClick={() => handleBuy(offer.itemId, price, offer.stock)}
                        disabled={!canAfford}
                        className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                          canAfford
                            ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 cursor-pointer shadow-md'
                            : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <span>Buy</span>
                        <span className="tabular-nums">({totalCost} Coins)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Player Pouch Inventory for Sale */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {slots.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs">
                  Your pouch is empty. Forage flora, mine minerals, or defeat creatures to gather sellable wares!
                </div>
              ) : (
                slots.map((slot) => {
                  const def = slot.item;
                  const unitSellPrice = getSellPrice(def.id, catalog);
                  const isSellable = unitSellPrice > 0;
                  const qty = Math.min(getQty(def.id), slot.quantity);
                  const totalGain = unitSellPrice * qty;

                  return (
                    <div
                      key={slot.slotId}
                      className="p-3.5 rounded-xl bg-[#0e1624] border border-slate-800/90 flex flex-col justify-between hover:border-slate-700 transition-colors gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl p-2 rounded-lg bg-slate-900 border border-slate-800">
                            {def.icon || '📦'}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono font-bold text-slate-100">{def.name}</span>
                              <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                                (Own {slot.quantity})
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{def.description}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 font-mono">
                          {isSellable ? (
                            <span className="text-xs font-bold text-emerald-400 tabular-nums">
                              {unitSellPrice} Coins
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-mono uppercase">Unsellable</span>
                          )}
                        </div>
                      </div>

                      {/* Stepper & Action Button */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                        {slot.quantity > 1 ? (
                          <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                            <button
                              onClick={() => setQty(def.id, -1, slot.quantity)}
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-xs font-mono text-slate-200 tabular-nums">
                              {qty}
                            </span>
                            <button
                              onClick={() => setQty(def.id, 1, slot.quantity)}
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                            <button
                              onClick={() => setQuantities((prev) => ({ ...prev, [def.id]: slot.quantity }))}
                              className="px-1.5 py-0.5 text-[9px] font-mono uppercase text-slate-400 hover:text-white"
                            >
                              Max
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">
                            Quantity: 1
                          </span>
                        )}

                        <button
                          onClick={() => handleSell(def.id, unitSellPrice)}
                          disabled={!isSellable}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                            isSellable
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 cursor-pointer shadow-md'
                              : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          <span>Sell</span>
                          <span className="tabular-nums">({totalGain} Coins)</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-5 py-3 border-t border-slate-800/90 bg-[#070b12] flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span>[Tab] Switch Buy/Sell</span>
            <span>[Esc] Close Shop</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs cursor-pointer transition-colors"
          >
            Leave Trader
          </button>
        </div>
      </div>
    </div>
  );
};
