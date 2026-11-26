import { createEmptySave } from './SaveSchema.js';
import { migrateSave } from './migrations.js';

const SAVE_PREFIX = 'the-drifting-land:save:v1:slot';

/**
 * Multi-slot localStorage persistence with backup verification and in-memory fallback.
 */
export class SaveManager {
  constructor() {
    this.memoryFallback = false;
    this._memory = new Map();
  }

  /**
   * @param {number} slotId
   */
  loadSlot(slotId) {
    const key = `${SAVE_PREFIX}${slotId}`;
    try {
      const rawStr = window.localStorage.getItem(key) || window.localStorage.getItem(`${key}:bak`);
      if (!rawStr) return null;
      return migrateSave(JSON.parse(rawStr));
    } catch {
      return this._memory.get(slotId) || null;
    }
  }

  /**
   * @param {number} slotId
   * @param {object} data
   */
  saveSlot(slotId, data) {
    const payload = { ...createEmptySave(slotId), ...data, slotId, updatedAt: Date.now() };
    const serialized = JSON.stringify(payload);
    const key = `${SAVE_PREFIX}${slotId}`;
    try {
      const existing = window.localStorage.getItem(key);
      if (existing) {
        window.localStorage.setItem(`${key}:bak`, existing);
      }
      window.localStorage.setItem(key, serialized);
      this.memoryFallback = false;
      return true;
    } catch {
      this.memoryFallback = true;
      this._memory.set(slotId, payload);
      return false;
    }
  }

  /**
   * @param {number} slotId
   */
  deleteSlot(slotId) {
    const key = `${SAVE_PREFIX}${slotId}`;
    this._memory.delete(slotId);
    try {
      window.localStorage.removeItem(key);
      window.localStorage.removeItem(`${key}:bak`);
    } catch {
      // Ignore
    }
  }

  listSlots() {
    return [1, 2, 3].map((slotId) => ({
      slotId,
      data: this.loadSlot(slotId),
    }));
  }
}
