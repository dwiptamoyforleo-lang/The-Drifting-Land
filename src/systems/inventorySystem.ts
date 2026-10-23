/**
 * Central Inventory & Currency Management System for The Drifting Land.
 * Provides predictable item storage, stacking, consumption, and currency tracking.
 */

import { InventorySlot, ItemDefinition, PlayerWallet } from '../types/game';
import { getItemDef } from '../data/items';
import { NotificationSystem } from './notificationSystem';
import { AudioService } from '../services/audio';

type InventoryChangeListener = (slots: InventorySlot[], wallet: PlayerWallet) => void;

export class InventorySystem {
  public maxSlots: number = 24;
  private slots: InventorySlot[] = [];
  public wallet: PlayerWallet;
  private listeners: Set<InventoryChangeListener> = new Set();

  constructor(
    initialItems: { itemId: string; quantity: number }[] = [],
    initialWallet: PlayerWallet = { sunstoneCoins: 50, aetherEssence: 0 }
  ) {
    this.wallet = { ...initialWallet };

    // Initialize with starter inventory if provided
    initialItems.forEach(({ itemId, quantity }) => {
      this.addItem(itemId, quantity, false);
    });
  }

  subscribe(listener: InventoryChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.getSlots(), { ...this.wallet });
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.getSlots();
    const walletSnapshot = { ...this.wallet };
    this.listeners.forEach((fn) => fn(snapshot, walletSnapshot));
  }

  getSlots(): InventorySlot[] {
    return [...this.slots];
  }

  getItemCount(itemId: string): number {
    return this.slots
      .filter((s) => s.item.id === itemId)
      .reduce((sum, s) => sum + s.quantity, 0);
  }

  /**
   * Add item into inventory, respecting stack limits and vacant slots
   */
  addItem(itemId: string, quantity: number = 1, showToast = true): boolean {
    const itemDef = getItemDef(itemId);
    if (!itemDef || quantity <= 0) return false;

    let remaining = quantity;

    // 1. Try stacking into existing non-full slots if stackable
    if (itemDef.stackable) {
      for (const slot of this.slots) {
        if (slot.item.id === itemId && slot.quantity < itemDef.maxStack) {
          const space = itemDef.maxStack - slot.quantity;
          const toAdd = Math.min(space, remaining);
          slot.quantity += toAdd;
          remaining -= toAdd;
          if (remaining <= 0) break;
        }
      }
    }

    // 2. Add remaining to new slots
    while (remaining > 0 && this.slots.length < this.maxSlots) {
      const toAdd = itemDef.stackable ? Math.min(itemDef.maxStack, remaining) : 1;
      const newSlot: InventorySlot = {
        slotId: this.slots.length,
        item: itemDef,
        quantity: toAdd,
      };
      this.slots.push(newSlot);
      remaining -= toAdd;
      if (!itemDef.stackable && remaining > 0) continue;
    }

    if (showToast) {
      NotificationSystem.notify(
        'Item Acquired',
        `+${quantity} ${itemDef.name}`,
        itemDef.category === 'relic' ? 'relic' : 'item'
      );
      AudioService.playUiClick();
    }

    this.notify();
    return remaining === 0;
  }

  /**
   * Remove quantity of an item
   */
  removeItem(itemId: string, quantity: number = 1): boolean {
    if (this.getItemCount(itemId) < quantity) return false;

    let remaining = quantity;
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const slot = this.slots[i];
      if (slot.item.id === itemId) {
        if (slot.quantity <= remaining) {
          remaining -= slot.quantity;
          this.slots.splice(i, 1);
        } else {
          slot.quantity -= remaining;
          remaining = 0;
        }
        if (remaining <= 0) break;
      }
    }

    // Re-index slots
    this.slots.forEach((s, idx) => (s.slotId = idx));
    this.notify();
    return true;
  }

  /**
   * Add currency to wallet
   */
  addCoins(amount: number): void {
    if (amount <= 0) return;
    this.wallet.sunstoneCoins += amount;
    NotificationSystem.notify('Sunstone Coins', `+${amount} Coins`, 'info');
    this.notify();
  }

  /**
   * Deduct currency from wallet
   */
  spendCoins(amount: number): boolean {
    if (this.wallet.sunstoneCoins < amount) return false;
    this.wallet.sunstoneCoins -= amount;
    this.notify();
    return true;
  }

  /**
   * Export inventory state for persistence
   */
  serialize(): { itemId: string; quantity: number }[] {
    return this.slots.map((s) => ({
      itemId: s.item.id,
      quantity: s.quantity,
    }));
  }
}
