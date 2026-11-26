/**
 * @fileoverview Save schema validation for The Drifting Land (v1).
 */

export const CURRENT_SAVE_VERSION = 1;

/**
 * Create a clean default save state object.
 */
export function createEmptySave(slotId = 1) {
  return {
    version: CURRENT_SAVE_VERSION,
    slotId,
    updatedAt: Date.now(),
    regionId: 'shallows',
    islandId: 'kestrel_raft',
    clockTime: 20,
    ember: 100,
    hasWayglass: false,
    litBeacons: [],
    anchoredIslands: [],
    collectedEchoes: [],
    activatedVanes: [],
    endingChosen: null,
  };
}

/**
 * Validate and sanitize parsed save data. Returns null if corrupted/unusable.
 * @param {unknown} raw
 */
export function validateSave(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const d = /** @type {Record<string, unknown>} */ (raw);
  if (typeof d.version !== 'number') return null;
  if (typeof d.islandId !== 'string' || !d.islandId) return null;

  return {
    version: CURRENT_SAVE_VERSION,
    slotId: typeof d.slotId === 'number' ? d.slotId : 1,
    updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : Date.now(),
    regionId: typeof d.regionId === 'string' ? d.regionId : 'shallows',
    islandId: d.islandId,
    clockTime: typeof d.clockTime === 'number' && Number.isFinite(d.clockTime) ? d.clockTime : 20,
    ember: typeof d.ember === 'number' ? Math.max(10, Math.min(100, d.ember)) : 100,
    hasWayglass: Boolean(d.hasWayglass),
    litBeacons: Array.isArray(d.litBeacons) ? d.litBeacons.filter((x) => typeof x === 'string') : [],
    anchoredIslands: Array.isArray(d.anchoredIslands) ? d.anchoredIslands.filter((x) => typeof x === 'string') : [],
    collectedEchoes: Array.isArray(d.collectedEchoes) ? d.collectedEchoes.filter((x) => typeof x === 'string') : [],
    activatedVanes: Array.isArray(d.activatedVanes) ? d.activatedVanes.filter((x) => typeof x === 'string') : [],
    endingChosen: typeof d.endingChosen === 'string' ? d.endingChosen : null,
  };
}
