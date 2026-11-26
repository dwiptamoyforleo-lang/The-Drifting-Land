import { CURRENT_SAVE_VERSION, validateSave } from './SaveSchema.js';

/**
 * Migrate legacy/v0 save shapes forward cleanly to CURRENT_SAVE_VERSION.
 * @param {unknown} raw
 */
export function migrateSave(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const data = { /** @type {Record<string, unknown>} */ ...raw };

  if (typeof data.version !== 'number' || data.version < 1) {
    data.version = CURRENT_SAVE_VERSION;
    if (!data.islandId && typeof data.regionId === 'string') {
      data.islandId = 'kestrel_raft';
    }
    if (!Array.isArray(data.activatedVanes)) {
      data.activatedVanes = [];
    }
  }

  return validateSave(data);
}
