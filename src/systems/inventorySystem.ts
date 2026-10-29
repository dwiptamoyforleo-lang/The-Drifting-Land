/**
 * Central Inventory, Hotbar, Equipment & Crafting System for The Drifting Land.
 * Provides:
 * - Deterministic item slot management & stack limits
 * - Dynamic sorting (Name, Rarity, Quantity, Value) & filtering by category
 * - 6-slot Quick Hotbar binding with keyboard & touch triggers
 * - Equipment slots (Head, Body, Tool, Accessory) with active player stat bonuses
 * - Atomic crafting engine with recipe verification, material consumption, and duplicate prevention
 * - Full offline-safe serialization
 */

import {
  InventorySlot,
  ItemDefinition,
  ItemCategory,
  ItemRarity,
  PlayerWallet,
  EquipmentSlotType,
  EquippedGear,
  CraftingRecipe,
} from '../types/game';
import { getItemDef } from '../data/items';
import { CRAFTING_RECIPES, getRecipeDef } from '../data/recipes';
import { NotificationSystem } from './notificationSystem';
import { AudioService } from '../services/audio';

export type InventorySortOption = 'name' | 'rarity' | 'quantity' | 'value' | 'category';
export type InventoryFilterCategory = 'all' | 'resource' | 'crafting_material' | 'tool' | 'equipment' | 'recovery' | 'relic' | 'quest';

type InventoryChangeListener = (
  slots: InventorySlot[],
  wallet: PlayerWallet,
  hotbar: (string | null)[],
  equipped: EquippedGear
) => void;

export class InventorySystem {
  public maxSlots: number = 24;
  private slots: InventorySlot[] = [];
  public wallet: PlayerWallet;
  public hotbar: (string | null)[] = [null, null, null, null, null, null];
  public equipped: EquippedGear = { head: null, body: null, tool: null, accessory: null };
  public onRecipeCrafted?: (recipeId: string, outputItemId: string) => void;

  private isCraftingBusy: boolean = false;
  private lastCraftTimestamp: number = 0;
  private listeners: Set<InventoryChangeListener> = new Set();

  constructor(
    initialItems: { itemId: string; quantity: number }[] = [],
    initialWallet: PlayerWallet = { driftCoins: 75, aetherEssence: 0 },
    initialHotbar: (string | null)[] = [],
    initialEquipped: EquippedGear = {}
  ) {
    const coins = initialWallet.driftCoins ?? initialWallet.sunstoneCoins ?? 75;
    this.wallet = {
      driftCoins: coins,
      sunstoneCoins: coins,
      aetherEssence: initialWallet.aetherEssence || 0,
    };

    if (Array.isArray(initialHotbar) && initialHotbar.length > 0) {
      for (let i = 0; i < 6; i++) {
        this.hotbar[i] = initialHotbar[i] || null;
      }
    }

    if (initialEquipped) {
      this.equipped = {
        head: initialEquipped.head || null,
        body: initialEquipped.body || null,
        tool: initialEquipped.tool || null,
        accessory: initialEquipped.accessory || null,
      };
    }

    // Populate initial items
    initialItems.forEach(({ itemId, quantity }) => {
      this.addItem(itemId, quantity, false);
    });

    // Default starting tool on hotbar if in inventory
    if (this.hotbar.every((h) => h === null) && this.slots.length > 0) {
      this.slots.forEach((s, idx) => {
        if (idx < 6) this.hotbar[idx] = s.item.id;
      });
    }
  }

  subscribe(listener: InventoryChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.getSlots(), { ...this.wallet }, [...this.hotbar], { ...this.equipped });
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.getSlots();
    const walletSnapshot = { ...this.wallet };
    const hotbarSnapshot = [...this.hotbar];
    const equippedSnapshot = { ...this.equipped };
    this.listeners.forEach((fn) => fn(snapshot, walletSnapshot, hotbarSnapshot, equippedSnapshot));
  }

  getSlots(): InventorySlot[] {
    return [...this.slots];
  }

  getItemCount(itemId: string): number {
    return this.slots
      .filter((s) => s.item.id === itemId)
      .reduce((sum, s) => sum + s.quantity, 0);
  }

  hasItem(itemId: string, minQuantity: number = 1): boolean {
    return this.getItemCount(itemId) >= minQuantity;
  }

  /**
   * Filter slots by category
   */
  getFilteredSlots(filter: InventoryFilterCategory): InventorySlot[] {
    if (filter === 'all') return this.getSlots();

    return this.slots.filter((s) => {
      const cat = s.item.category;
      if (filter === 'resource') return cat === 'resource';
      if (filter === 'crafting_material') return cat === 'crafting_material';
      if (filter === 'tool') return cat === 'tool';
      if (filter === 'equipment') return cat === 'equipment' || cat === 'gear';
      if (filter === 'recovery') return cat === 'recovery' || cat === 'consumable';
      if (filter === 'relic') return cat === 'relic' || cat === 'collectible' || cat === 'event_reward';
      if (filter === 'quest') return cat === 'quest';
      return false;
    });
  }

  /**
   * Sort slots by specified criteria
   */
  getSortedSlots(slotsToSort: InventorySlot[], sortOption: InventorySortOption): InventorySlot[] {
    const list = [...slotsToSort];
    const rarityRank: Record<ItemRarity, number> = {
      legendary: 5,
      epic: 4,
      rare: 3,
      uncommon: 2,
      common: 1,
    };

    switch (sortOption) {
      case 'name':
        return list.sort((a, b) => a.item.name.localeCompare(b.item.name));
      case 'rarity':
        return list.sort((a, b) => rarityRank[b.item.rarity] - rarityRank[a.item.rarity]);
      case 'quantity':
        return list.sort((a, b) => b.quantity - a.quantity);
      case 'value':
        return list.sort((a, b) => b.item.value - a.item.value);
      case 'category':
        return list.sort((a, b) => a.item.category.localeCompare(b.item.category));
      default:
        return list;
    }
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

    // Clear from hotbar if zero remaining
    if (this.getItemCount(itemId) <= 0) {
      for (let h = 0; h < this.hotbar.length; h++) {
        if (this.hotbar[h] === itemId) {
          this.hotbar[h] = null;
        }
      }
    }

    this.notify();
    return true;
  }

  /**
   * Currency & Trading Management (Drift Coins)
   */
  getCoins(): number {
    return this.wallet.driftCoins ?? this.wallet.sunstoneCoins ?? 0;
  }

  addCoins(amount: number, label = 'Drift Coins'): void {
    if (amount <= 0) return;
    const current = this.getCoins();
    this.wallet.driftCoins = current + amount;
    this.wallet.sunstoneCoins = this.wallet.driftCoins;
    NotificationSystem.notify(label, `+${amount} Drift Coins`, 'info');
    this.notify();
  }

  removeCoins(amount: number): boolean {
    const current = this.getCoins();
    if (amount <= 0 || current < amount) return false;
    this.wallet.driftCoins = current - amount;
    this.wallet.sunstoneCoins = this.wallet.driftCoins;
    this.notify();
    return true;
  }

  /**
   * Execute atomic purchase transaction
   * - Subtracts coins, adds items, verifies capacity, prevents negative balance
   */
  buyItem(itemId: string, quantity: number, unitPrice: number): { success: boolean; message: string } {
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return { success: false, message: 'Invalid purchase quantity.' };
    }
    const def = getItemDef(itemId);
    if (!def) {
      return { success: false, message: 'Unknown item catalog entry.' };
    }
    const totalCost = quantity * unitPrice;
    if (this.getCoins() < totalCost) {
      return { success: false, message: `Insufficient Drift Coins. Requires ${totalCost} Coins (Have ${this.getCoins()}).` };
    }

    // Verify slot capacity if item cannot fit into existing stack
    const existingSlot = this.slots.find((s) => s.item.id === itemId && s.quantity < s.item.maxStack);
    if (!existingSlot && this.slots.length >= this.maxSlots) {
      return { success: false, message: 'Pouch is full! Free up a slot before purchasing.' };
    }

    // Atomic debit & credit
    const coinDeducted = this.removeCoins(totalCost);
    if (!coinDeducted) {
      return { success: false, message: 'Transaction error deducting coins.' };
    }

    const itemAdded = this.addItem(itemId, quantity, true);
    if (!itemAdded) {
      // Rollback coins if pouch somehow failed to accept item
      this.addCoins(totalCost, 'Refund');
      return { success: false, message: 'Pouch could not receive item. Coins refunded.' };
    }

    AudioService.playUiClick();
    NotificationSystem.notify('Trade Purchase', `Bought ${quantity}x ${def.name} for ${totalCost} Coins`, 'item');
    return { success: true, message: `Purchased ${quantity}x ${def.name} for ${totalCost} Drift Coins.` };
  }

  /**
   * Execute atomic sale transaction
   * - Validates item count, removes items, adds currency, prevents duplication
   */
  sellItem(itemId: string, quantity: number, unitPrice: number): { success: boolean; message: string } {
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return { success: false, message: 'Invalid sale quantity.' };
    }
    const def = getItemDef(itemId);
    if (!def) {
      return { success: false, message: 'Unknown item.' };
    }
    if (def.category === 'quest' || def.category === 'relic') {
      return { success: false, message: 'Cannot sell unique relics or quest items.' };
    }
    const owned = this.getItemCount(itemId);
    if (owned < quantity) {
      return { success: false, message: `You only possess ${owned}x ${def.name} to sell.` };
    }

    const totalGain = quantity * unitPrice;
    const removed = this.removeItem(itemId, quantity);
    if (!removed) {
      return { success: false, message: 'Failed to extract item from pouch.' };
    }

    this.addCoins(totalGain, 'Trade Sale');
    AudioService.playUiClick();
    NotificationSystem.notify('Trade Sale', `Sold ${quantity}x ${def.name} for ${totalGain} Coins`, 'item');
    return { success: true, message: `Sold ${quantity}x ${def.name} for ${totalGain} Drift Coins.` };
  }

  /**
   * Equip gear into appropriate slot
   */
  equipItem(itemId: string): boolean {
    const itemDef = getItemDef(itemId);
    if (!itemDef || !itemDef.equipSlot || !this.hasItem(itemId, 1)) return false;

    const slotType = itemDef.equipSlot;
    const previous = this.equipped[slotType];

    this.equipped[slotType] = itemId;

    AudioService.playUiClick();
    NotificationSystem.notify('Gear Equipped', `Equipped ${itemDef.name} (${slotType.toUpperCase()})`, 'item');

    this.notify();
    return true;
  }

  /**
   * Unequip gear from slot
   */
  unequipItem(slotType: EquipmentSlotType): boolean {
    const current = this.equipped[slotType];
    if (!current) return false;

    const itemDef = getItemDef(current);
    this.equipped[slotType] = null;

    AudioService.playUiClick();
    if (itemDef) {
      NotificationSystem.notify('Gear Unequipped', `Removed ${itemDef.name}`, 'info');
    }

    this.notify();
    return true;
  }

  /**
   * Calculate cumulative stat bonuses granted by equipped gear
   */
  getEquipBonuses(): {
    healthBonus: number;
    staminaBonus: number;
    speedBonus: number;
    miningBonus: number;
    lightRadius: number;
  } {
    const bonuses = {
      healthBonus: 0,
      staminaBonus: 0,
      speedBonus: 0,
      miningBonus: 0,
      lightRadius: 0,
    };

    Object.values(this.equipped).forEach((itemId) => {
      if (!itemId) return;
      const def = getItemDef(itemId);
      if (def?.equipBonus) {
        if (def.equipBonus.healthBonus) bonuses.healthBonus += def.equipBonus.healthBonus;
        if (def.equipBonus.staminaBonus) bonuses.staminaBonus += def.equipBonus.staminaBonus;
        if (def.equipBonus.speedBonus) bonuses.speedBonus += def.equipBonus.speedBonus;
        if (def.equipBonus.miningBonus) bonuses.miningBonus += def.equipBonus.miningBonus;
        if (def.equipBonus.lightRadius) bonuses.lightRadius = Math.max(bonuses.lightRadius, def.equipBonus.lightRadius);
      }
    });

    return bonuses;
  }

  /**
   * Hotbar slot assignment
   */
  assignToHotbar(hotbarIndex: number, itemId: string | null): boolean {
    if (hotbarIndex < 0 || hotbarIndex >= 6) return false;

    if (itemId !== null && !this.hasItem(itemId, 1)) {
      return false;
    }

    this.hotbar[hotbarIndex] = itemId;
    this.notify();
    return true;
  }

  /**
   * Use hotbar slot action (Equip or Consume)
   */
  useHotbarSlot(hotbarIndex: number, onUseConsumable: (itemId: string) => void): boolean {
    if (hotbarIndex < 0 || hotbarIndex >= 6) return false;
    const itemId = this.hotbar[hotbarIndex];
    if (!itemId) return false;

    const itemDef = getItemDef(itemId);
    if (!itemDef) return false;

    if (itemDef.category === 'consumable' || itemDef.category === 'recovery') {
      onUseConsumable(itemId);
      return true;
    } else if (itemDef.equipSlot) {
      if (this.equipped[itemDef.equipSlot] === itemId) {
        this.unequipItem(itemDef.equipSlot);
      } else {
        this.equipItem(itemId);
      }
      return true;
    }

    return false;
  }

  /**
   * Atomic Recipe Crafting Engine
   * Validates ingredients, consumes materials, awards product, and prevents duplicate requests
   */
  craftRecipe(recipeId: string): { success: boolean; message: string } {
    const now = Date.now();
    if (this.isCraftingBusy || now - this.lastCraftTimestamp < 350) {
      return { success: false, message: 'Crafting in progress...' };
    }

    const recipe = getRecipeDef(recipeId);
    if (!recipe) {
      return { success: false, message: 'Invalid or unknown recipe.' };
    }

    // 1. Verify all ingredients exist in sufficient quantity
    for (const ing of recipe.ingredients) {
      const currentCount = this.getItemCount(ing.itemId);
      if (currentCount < ing.quantity) {
        const itemDef = getItemDef(ing.itemId);
        AudioService.playDoorLocked();
        return {
          success: false,
          message: `Insufficient materials: Need ${ing.quantity}x ${itemDef?.name || ing.itemId} (Have ${currentCount})`,
        };
      }
    }

    // 2. Lock execution mutex
    this.isCraftingBusy = true;
    this.lastCraftTimestamp = now;

    try {
      // 3. Atomically consume ingredients
      for (const ing of recipe.ingredients) {
        this.removeItem(ing.itemId, ing.quantity);
      }

      // 4. Award crafted item
      this.addItem(recipe.result.itemId, recipe.result.quantity, false);
      this.onRecipeCrafted?.(recipeId, recipe.result.itemId);

      // 5. Sound & Screen Feedback
      AudioService.playRelicCollect();
      const resultDef = getItemDef(recipe.result.itemId);

      NotificationSystem.notify(
        'Crafting Completed',
        `Crafted ${recipe.result.quantity}x ${resultDef?.name || recipe.name}!`,
        'discovery',
        5000
      );

      this.notify();
      return { success: true, message: `Crafted ${recipe.name}` };
    } finally {
      setTimeout(() => {
        this.isCraftingBusy = false;
      }, 100);
    }
  }

  /**
   * Serialize for save storage
   */
  serialize(): { itemId: string; quantity: number }[] {
    return this.slots.map((s) => ({
      itemId: s.item.id,
      quantity: s.quantity,
    }));
  }
}
