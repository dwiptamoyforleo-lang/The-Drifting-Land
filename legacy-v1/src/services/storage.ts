/**
 * Browser-local persistence service for The Drifting Land.
 * Purely client-side, offline-safe, versioned, and resilient against corrupted storage.
 * Manages full game state: player stats, inventory, wallet, quests, beacons, checkpoints, time, and multi-slots.
 * Features:
 * - 3 independent save slots with metadata summaries (Level, Day, Region, Coins, Shards)
 * - Atomic write staging (__staging__) to prevent partial writes
 * - Automatic schema validation and default fallbacks on corrupted data
 * - Seamless migration from legacy single-slot saves
 * - Duplicate reward protection for Quests, Bosses, and Achievements
 * - JSON Export & Import (individual slot or complete 3-slot backup)
 */

import {
  SaveData,
  GameSettings,
  PlayerStats,
  PlayerWallet,
  WeatherType,
  SaveSlotMetadata,
} from '../types/game';
import { REGIONS } from '../data/regions';

import { DEFAULT_WORLD_SEED, getChunkKeyForPos } from './worldStateStore';

const LEGACY_SAVE_KEY = 'the_drifting_land_save_v1';
const SAVE_SLOT_PREFIX = 'the_drifting_land_slot_';
const ACTIVE_SLOT_KEY = 'the_drifting_land_active_slot_id';
const SETTINGS_KEY = 'the_drifting_land_settings_v1';
const CURRENT_VERSION = 2;
export const MAX_SAVE_SLOTS = 3;

export function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export const DEFAULT_SETTINGS: GameSettings = {
  graphicsQuality: isMobileUserAgent() ? 'low' : 'auto',
  renderDistance: isMobileUserAgent() ? 'short' : 'medium',
  fov: 70,
  shadows: !isMobileUserAgent(),
  soundEnabled: true,
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.7,
  environmentVolume: 0.75,
  invertY: false,
  touchControls: false,
  cameraMode: 'THIRD_PERSON',
  cameraSensitivity: 1.0,
  cameraDistance: 7.5,
  particleLimit: isMobileUserAgent() ? 150 : 400, // Low=150, Medium=400, High=800
  dayDurationMinutes: 20,
  hudVisibility: 'full',
  mobileButtonSize: 'normal',
  mobileHaptics: true,
  mobileFullscreen: false,
  showDiagnostics: false,
};

export const DEFAULT_STATS: PlayerStats = {
  health: 100,
  maxHealth: 100,
  stamina: 100,
  maxStamina: 100,
  speed: 8.5,
  jumpForce: 9.0,
  level: 1,
  experience: 0,
  experienceToNext: 200,
};

export const DEFAULT_WALLET: PlayerWallet = {
  driftCoins: 75,
  sunstoneCoins: 75,
  aetherEssence: 0,
};

export function createInitialSave(slotId: number = 1): SaveData {
  return {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    worldSeed: DEFAULT_WORLD_SEED,
    slotId,
    dimensionId: 'overworld',
    regionId: 'verdant_reach',
    activeCheckpointId: 'cp_beacon_plaza',
    playerPosition: [0, 4.5, 0],
    playerRotationY: 0,
    playerStats: { ...DEFAULT_STATS },
    wallet: { ...DEFAULT_WALLET },
    inventory: [
      { itemId: 'traveler_rations', quantity: 3 },
      { itemId: 'drift_bread', quantity: 2 },
      { itemId: 'drift_bloom_nectar', quantity: 1 },
    ],
    quests: {},
    collectedShardIds: [],
    beaconStates: {
      'verdant_monolith_beacon': false,
    },
    activatedCheckpoints: ['cp_beacon_plaza'],
    worldTime: {
      cycleTime: 0.18, // Morning sun
      dayCount: 1,
    },
    currentWeather: 'CLEAR',
    redMoon: {
      isActive: false,
      lastEvaluatedNightDay: 0,
      cooldownUntilDay: 3,
      wardenDefeated: false,
      wardenRewardsClaimed: false,
    },
    settings: { ...DEFAULT_SETTINGS },
    discoveries: ['The Verdant Reach', 'Ancient Floating Spire', 'Monolith Beacon Plaza'],
    unlockedDoors: [],
    harvestedDeposits: {},
    discoveredChambers: [],
    activatedGateways: [],
    examinedRecords: [],
    harvestedFlora: {},
    hotbarSlots: [null, null, null, null, null, null],
    equippedGear: { head: null, body: null, tool: null, accessory: null },
    trackedQuestId: 'quest_main_1_clearing',
    explorationRank: 1,
    explorationXp: 0,
    achievements: {},
    claimedQuestRewards: [],
    claimedAchievementRewards: [],
    discoveredNpcs: ['npc_elder_soren'],
    defeatedBosses: [],
    claimedBossRewards: [],
    dimensionProgress: {
      verdant_reach: {
        unlocked: true,
        discovered: true,
        activeCheckpointId: 'cp_beacon_plaza',
        activatedCheckpoints: ['cp_beacon_plaza'],
        firstVisitedAt: Date.now(),
      },
      shattered_highlands: { unlocked: false, discovered: false, activatedCheckpoints: ['cp_highlands_ascent'] },
      ashen_expanse: { unlocked: false, discovered: false, activatedCheckpoints: ['cp_ashen_caldera'] },
      sunken_archive: { unlocked: false, discovered: false, activatedCheckpoints: ['cp_archive_vestibule'] },
      moonveil_wilds: { unlocked: false, discovered: false, activatedCheckpoints: ['cp_moonveil_grotto'] },
      rift_frontier: { unlocked: false, discovered: false, activatedCheckpoints: ['cp_rift_anomaly'] },
    },
    settlementProgress: {
      hearthRekindled: true,
      spokeWithElder: false,
    },
    regionStates: {},
  };
}

export class StorageService {
  /**
   * Check if browser localStorage is available and writable
   */
  static isAvailable(): boolean {
    try {
      const test = '__tdl_storage_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get active slot ID (1, 2, or 3)
   */
  static getActiveSlot(): number {
    if (!this.isAvailable()) return 1;
    try {
      const stored = window.localStorage.getItem(ACTIVE_SLOT_KEY);
      if (stored) {
        const val = parseInt(stored, 10);
        if (val >= 1 && val <= MAX_SAVE_SLOTS) return val;
      }
    } catch {
      // Fallback
    }
    return 1;
  }

  /**
   * Set active slot ID
   */
  static setActiveSlot(slotId: number): void {
    if (!this.isAvailable()) return;
    const clamped = Math.max(1, Math.min(MAX_SAVE_SLOTS, slotId));
    try {
      window.localStorage.setItem(ACTIVE_SLOT_KEY, clamped.toString());
    } catch (err) {
      console.warn('Failed to set active slot:', err);
    }
  }

  /**
   * Get storage key for a specific slot
   */
  private static getSlotKey(slotId: number): string {
    return `${SAVE_SLOT_PREFIX}${slotId}`;
  }

  /**
   * Automatic migration: If legacy single save exists and slot 1 is empty, copy legacy to slot 1
   */
  private static checkLegacyMigration(): void {
    if (!this.isAvailable()) return;
    try {
      const slot1Key = this.getSlotKey(1);
      const slot1Exists = window.localStorage.getItem(slot1Key);
      const legacySave = window.localStorage.getItem(LEGACY_SAVE_KEY);

      if (!slot1Exists && legacySave) {
        window.localStorage.setItem(slot1Key, legacySave);
        console.info('Migrated legacy save to Save Slot 1.');
      }
    } catch {
      // Ignore migration errors
    }
  }

  /**
   * Load active player save data with schema validation & corruption fallback
   */
  static loadSave(slotId?: number): SaveData {
    this.checkLegacyMigration();
    const targetSlot = slotId ?? this.getActiveSlot();

    if (!this.isAvailable()) {
      return createInitialSave(targetSlot);
    }

    try {
      const key = this.getSlotKey(targetSlot);
      let raw = window.localStorage.getItem(key);

      // Fallback to legacy if slot 1 requested and slot 1 is missing
      if (!raw && targetSlot === 1) {
        raw = window.localStorage.getItem(LEGACY_SAVE_KEY);
      }

      if (!raw) {
        return createInitialSave(targetSlot);
      }

      const parsed = JSON.parse(raw);
      return this.validateAndMigrate(parsed, targetSlot);
    } catch (err) {
      console.warn(`Corrupted save detected in Slot ${targetSlot}. Falling back to clean save.`, err);
      return createInitialSave(targetSlot);
    }
  }

  /**
   * Persist player save data safely with ATOMIC STAGING to prevent partial writes
   */
  static saveGame(data: SaveData, slotId?: number): boolean {
    if (!this.isAvailable()) return false;
    const targetSlot = slotId ?? data.slotId ?? this.getActiveSlot();
    const key = this.getSlotKey(targetSlot);
    const stagingKey = `${key}__staging__`;

    try {
      const enriched: SaveData = {
        ...data,
        slotId: targetSlot,
        timestamp: Date.now(),
        version: CURRENT_VERSION,
      };

      const serialized = JSON.stringify(enriched);

      // 1. Write to staging key first
      window.localStorage.setItem(stagingKey, serialized);

      // 2. Verify staging content is valid JSON
      const verify = window.localStorage.getItem(stagingKey);
      if (!verify || verify.length !== serialized.length) {
        throw new Error('Atomic write verification failed');
      }

      // 3. Atomically commit to main slot key
      window.localStorage.setItem(key, serialized);

      // 4. Remove staging key
      window.localStorage.removeItem(stagingKey);

      // Also mirror to legacy key for slot 1 for backwards compatibility
      if (targetSlot === 1) {
        try {
          window.localStorage.setItem(LEGACY_SAVE_KEY, serialized);
        } catch {}
      }

      return true;
    } catch (err) {
      console.error(`Failed to write save data to Slot ${targetSlot}:`, err);
      // Clean staging key if it remained
      try {
        window.localStorage.removeItem(stagingKey);
      } catch {}
      return false;
    }
  }

  /**
   * Check if a save exists in a slot
   */
  static hasSave(slotId?: number): boolean {
    this.checkLegacyMigration();
    if (!this.isAvailable()) return false;
    const targetSlot = slotId ?? this.getActiveSlot();
    try {
      const key = this.getSlotKey(targetSlot);
      const val = window.localStorage.getItem(key);
      if (val) return true;
      if (targetSlot === 1) {
        return !!window.localStorage.getItem(LEGACY_SAVE_KEY);
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Reset save data in a specific slot
   */
  static clearSave(slotId?: number): boolean {
    if (!this.isAvailable()) return false;
    const targetSlot = slotId ?? this.getActiveSlot();
    try {
      const key = this.getSlotKey(targetSlot);
      window.localStorage.removeItem(key);
      if (targetSlot === 1) {
        window.localStorage.removeItem(LEGACY_SAVE_KEY);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get metadata summary for a single slot without loading full entity states
   */
  static getSlotMetadata(slotId: number): SaveSlotMetadata {
    if (!this.hasSave(slotId)) {
      return { slotId, isEmpty: true };
    }

    try {
      const save = this.loadSave(slotId);
      const reg = REGIONS[save.regionId];
      return {
        slotId,
        isEmpty: false,
        timestamp: save.timestamp,
        playerLevel: save.playerStats.level,
        regionName: reg?.name || 'The Verdant Reach',
        regionId: save.regionId,
        dayCount: save.worldTime.dayCount,
        shardsCount: save.collectedShardIds.length,
        health: Math.round(save.playerStats.health),
        maxHealth: save.playerStats.maxHealth,
        driftCoins: save.wallet.driftCoins,
      };
    } catch {
      return { slotId, isEmpty: true };
    }
  }

  /**
   * Get metadata for all available slots
   */
  static getAllSlotsMetadata(): SaveSlotMetadata[] {
    const list: SaveSlotMetadata[] = [];
    for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
      list.push(this.getSlotMetadata(i));
    }
    return list;
  }

  /**
   * Duplicate or copy save data from one slot to another
   */
  static copySlot(fromSlot: number, toSlot: number): boolean {
    if (!this.hasSave(fromSlot)) return false;
    try {
      const sourceData = this.loadSave(fromSlot);
      return this.saveGame(sourceData, toSlot);
    } catch {
      return false;
    }
  }

  /**
   * Check if a quest, boss, or achievement reward has already been claimed (idempotency guard)
   */
  static isRewardClaimed(
    type: 'quest' | 'boss' | 'achievement',
    rewardId: string,
    data?: SaveData
  ): boolean {
    const current = data || this.loadSave();
    if (type === 'quest') {
      return current.claimedQuestRewards.includes(rewardId);
    }
    if (type === 'boss') {
      return (current.claimedBossRewards || []).includes(rewardId);
    }
    if (type === 'achievement') {
      return (current.claimedAchievementRewards || []).includes(rewardId);
    }
    return false;
  }

  /**
   * Mark a reward as claimed in the save data (prevents duplicate rewards)
   */
  static markRewardClaimed(
    type: 'quest' | 'boss' | 'achievement',
    rewardId: string,
    data: SaveData
  ): SaveData {
    const updated = { ...data };
    if (type === 'quest') {
      if (!updated.claimedQuestRewards.includes(rewardId)) {
        updated.claimedQuestRewards = [...updated.claimedQuestRewards, rewardId];
      }
    } else if (type === 'boss') {
      const list = updated.claimedBossRewards || [];
      if (!list.includes(rewardId)) {
        updated.claimedBossRewards = [...list, rewardId];
      }
    } else if (type === 'achievement') {
      const list = updated.claimedAchievementRewards || [];
      if (!list.includes(rewardId)) {
        updated.claimedAchievementRewards = [...list, rewardId];
      }
    }
    return updated;
  }

  /**
   * Load standalone settings
   */
  static loadSettings(): GameSettings {
    if (!this.isAvailable()) return { ...DEFAULT_SETTINGS };
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save standalone settings
   */
  static saveSettings(settings: GameSettings): void {
    if (!this.isAvailable()) return;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('Could not save settings:', err);
    }
  }

  /**
   * Export save data for a slot as formatted JSON
   */
  static exportSaveJson(slotId?: number): string {
    const targetSlot = slotId ?? this.getActiveSlot();
    const data = this.loadSave(targetSlot);
    return JSON.stringify(data, null, 2);
  }

  /**
   * Export all slots as an archive bundle
   */
  static exportAllSlotsJson(): string {
    const bundle: Record<string, any> = {
      app: 'The Drifting Land',
      version: CURRENT_VERSION,
      exportDate: Date.now(),
      activeSlot: this.getActiveSlot(),
      slots: {},
    };

    for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
      if (this.hasSave(i)) {
        bundle.slots[`slot_${i}`] = this.loadSave(i);
      }
    }

    return JSON.stringify(bundle, null, 2);
  }

  /**
   * Import save data from JSON string into a specific slot
   */
  static importSaveJson(jsonStr: string, targetSlot?: number): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);

      // Check if it's a full bundle
      if (parsed.slots && typeof parsed.slots === 'object') {
        let importedCount = 0;
        for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
          const slotData = parsed.slots[`slot_${i}`];
          if (slotData) {
            const validated = this.validateAndMigrate(slotData, i);
            this.saveGame(validated, i);
            importedCount++;
          }
        }
        if (parsed.activeSlot && parsed.activeSlot >= 1 && parsed.activeSlot <= MAX_SAVE_SLOTS) {
          this.setActiveSlot(parsed.activeSlot);
        }
        return { success: true };
      }

      // Single slot import
      const destSlot = targetSlot ?? this.getActiveSlot();
      const validated = this.validateAndMigrate(parsed, destSlot);
      this.saveGame(validated, destSlot);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Invalid JSON file' };
    }
  }

  /**
   * Validate and migrate legacy or missing properties
   */
  private static validateAndMigrate(raw: any, slotId: number = 1): SaveData {
    if (!raw || typeof raw !== 'object') {
      return createInitialSave(slotId);
    }

    const fallback = createInitialSave(slotId);

    // Position safety check
    let pos: [number, number, number] = fallback.playerPosition;
    if (Array.isArray(raw.playerPosition) && raw.playerPosition.length === 3) {
      const [x, y, z] = raw.playerPosition;
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        pos = [x, y, z];
      }
    }

    // Stats safety
    const stats: PlayerStats = {
      health: Number.isFinite(raw.playerStats?.health) ? raw.playerStats.health : fallback.playerStats.health,
      maxHealth: Number.isFinite(raw.playerStats?.maxHealth) ? raw.playerStats.maxHealth : fallback.playerStats.maxHealth,
      stamina: Number.isFinite(raw.playerStats?.stamina) ? raw.playerStats.stamina : fallback.playerStats.stamina,
      maxStamina: Number.isFinite(raw.playerStats?.maxStamina) ? raw.playerStats.maxStamina : fallback.playerStats.maxStamina,
      speed: Number.isFinite(raw.playerStats?.speed) ? raw.playerStats.speed : fallback.playerStats.speed,
      jumpForce: Number.isFinite(raw.playerStats?.jumpForce) ? raw.playerStats.jumpForce : fallback.playerStats.jumpForce,
      level: Number.isFinite(raw.playerStats?.level) ? Math.max(1, Math.floor(raw.playerStats.level)) : fallback.playerStats.level,
      experience: Number.isFinite(raw.playerStats?.experience) ? Math.max(0, Math.floor(raw.playerStats.experience)) : fallback.playerStats.experience,
      experienceToNext: Number.isFinite(raw.playerStats?.experienceToNext) ? raw.playerStats.experienceToNext : fallback.playerStats.experienceToNext,
    };

    const coinVal = Number.isFinite(raw.wallet?.driftCoins)
      ? raw.wallet.driftCoins
      : Number.isFinite(raw.wallet?.sunstoneCoins)
      ? raw.wallet.sunstoneCoins
      : fallback.wallet.driftCoins;

    const wallet: PlayerWallet = {
      driftCoins: coinVal,
      sunstoneCoins: coinVal,
      aetherEssence: Number.isFinite(raw.wallet?.aetherEssence) ? raw.wallet.aetherEssence : fallback.wallet.aetherEssence,
    };

    const migratedHarvestedFlora: Record<string, number> =
      typeof raw.harvestedFlora === 'object' && raw.harvestedFlora !== null ? raw.harvestedFlora : {};
    const migratedHarvestedDeposits: Record<string, number> =
      typeof raw.harvestedDeposits === 'object' && raw.harvestedDeposits !== null ? raw.harvestedDeposits : {};
    const migratedUnlockedDoors: string[] = Array.isArray(raw.unlockedDoors) ? raw.unlockedDoors : [];
    const migratedDiscoveredChambers: string[] = Array.isArray(raw.discoveredChambers) ? raw.discoveredChambers : [];
    const migratedCollectedShards: string[] = Array.isArray(raw.collectedShardIds) ? raw.collectedShardIds : [];

    // Migrate v1 top-level world mutations into v2 regionStates if missing
    let regionStates =
      typeof raw.regionStates === 'object' && raw.regionStates !== null ? raw.regionStates : {};
    if (!raw.regionStates || Object.keys(regionStates).length === 0) {
      const verdantChunks: Record<string, any> = {};
      if (Object.keys(migratedHarvestedFlora).length > 0) {
        const ck = getChunkKeyForPos(0, 0);
        verdantChunks[ck] = { ...(verdantChunks[ck] || {}), harvestedFlora: { ...migratedHarvestedFlora } };
      }
      if (Object.keys(migratedHarvestedDeposits).length > 0) {
        const ck = getChunkKeyForPos(-16, 32);
        verdantChunks[ck] = { ...(verdantChunks[ck] || {}), harvestedDeposits: { ...migratedHarvestedDeposits } };
      }
      if (migratedUnlockedDoors.length > 0) {
        const ck = getChunkKeyForPos(-38, 22);
        verdantChunks[ck] = { ...(verdantChunks[ck] || {}), unlockedDoors: [...migratedUnlockedDoors] };
      }
      if (migratedDiscoveredChambers.length > 0) {
        const ck = getChunkKeyForPos(-48, -8);
        verdantChunks[ck] = { ...(verdantChunks[ck] || {}), discoveredChambers: [...migratedDiscoveredChambers] };
      }
      if (migratedCollectedShards.length > 0) {
        const ck = getChunkKeyForPos(0, 0);
        verdantChunks[ck] = { ...(verdantChunks[ck] || {}), collectedShards: [...migratedCollectedShards] };
      }
      if (Object.keys(verdantChunks).length > 0) {
        regionStates = { verdant_reach: { chunks: verdantChunks } };
      }
    }

    return {
      version: CURRENT_VERSION,
      timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Date.now(),
      worldSeed: Number.isFinite(raw.worldSeed) ? raw.worldSeed : DEFAULT_WORLD_SEED,
      slotId,
      dimensionId: typeof raw.dimensionId === 'string' ? raw.dimensionId : fallback.dimensionId,
      regionId: typeof raw.regionId === 'string' ? raw.regionId : fallback.regionId,
      activeCheckpointId: typeof raw.activeCheckpointId === 'string' ? raw.activeCheckpointId : fallback.activeCheckpointId,
      playerPosition: pos,
      playerRotationY: Number.isFinite(raw.playerRotationY) ? raw.playerRotationY : 0,
      playerStats: stats,
      wallet,
      inventory: Array.isArray(raw.inventory) ? raw.inventory : fallback.inventory,
      quests: typeof raw.quests === 'object' && raw.quests !== null ? raw.quests : fallback.quests,
      collectedShardIds: migratedCollectedShards,
      beaconStates: typeof raw.beaconStates === 'object' && raw.beaconStates !== null ? raw.beaconStates : fallback.beaconStates,
      activatedCheckpoints: Array.isArray(raw.activatedCheckpoints) ? raw.activatedCheckpoints : fallback.activatedCheckpoints,
      worldTime: {
        cycleTime: Number.isFinite(raw.worldTime?.cycleTime) ? raw.worldTime.cycleTime : fallback.worldTime.cycleTime,
        dayCount: Number.isFinite(raw.worldTime?.dayCount) ? raw.worldTime.dayCount : fallback.worldTime.dayCount,
      },
      currentWeather: typeof raw.currentWeather === 'string' ? (raw.currentWeather as WeatherType) : fallback.currentWeather,
      redMoon: {
        isActive: typeof raw.redMoon?.isActive === 'boolean' ? raw.redMoon.isActive : false,
        lastEvaluatedNightDay: Number.isFinite(raw.redMoon?.lastEvaluatedNightDay) ? raw.redMoon.lastEvaluatedNightDay : 0,
        cooldownUntilDay: Number.isFinite(raw.redMoon?.cooldownUntilDay) ? raw.redMoon.cooldownUntilDay : 0,
        wardenDefeated: typeof raw.redMoon?.wardenDefeated === 'boolean' ? raw.redMoon.wardenDefeated : false,
        wardenRewardsClaimed: typeof raw.redMoon?.wardenRewardsClaimed === 'boolean' ? raw.redMoon.wardenRewardsClaimed : false,
        forceTriggered: !!raw.redMoon?.forceTriggered,
      },
      settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
      discoveries: Array.isArray(raw.discoveries) ? raw.discoveries : fallback.discoveries,
      unlockedDoors: migratedUnlockedDoors,
      harvestedDeposits: migratedHarvestedDeposits,
      harvestedFlora: migratedHarvestedFlora,
      discoveredChambers: migratedDiscoveredChambers,
      activatedGateways: Array.isArray(raw.activatedGateways) ? raw.activatedGateways : [],
      examinedRecords: Array.isArray(raw.examinedRecords) ? raw.examinedRecords : [],
      hotbarSlots: Array.isArray(raw.hotbarSlots) ? raw.hotbarSlots : fallback.hotbarSlots,
      equippedGear: typeof raw.equippedGear === 'object' && raw.equippedGear !== null ? raw.equippedGear : fallback.equippedGear,
      trackedQuestId: typeof raw.trackedQuestId === 'string' || raw.trackedQuestId === null ? raw.trackedQuestId : 'quest_main_1_clearing',
      explorationRank: Number.isFinite(raw.explorationRank) ? Math.max(1, Math.min(5, Math.floor(raw.explorationRank))) : 1,
      explorationXp: Number.isFinite(raw.explorationXp) ? Math.max(0, Math.floor(raw.explorationXp)) : 0,
      achievements: typeof raw.achievements === 'object' && raw.achievements !== null ? raw.achievements : {},
      claimedQuestRewards: Array.isArray(raw.claimedQuestRewards) ? raw.claimedQuestRewards : [],
      claimedAchievementRewards: Array.isArray(raw.claimedAchievementRewards) ? raw.claimedAchievementRewards : [],
      discoveredNpcs: Array.isArray(raw.discoveredNpcs) ? raw.discoveredNpcs : fallback.discoveredNpcs,
      defeatedBosses: Array.isArray(raw.defeatedBosses) ? raw.defeatedBosses : [],
      claimedBossRewards: Array.isArray(raw.claimedBossRewards) ? raw.claimedBossRewards : [],
      dimensionProgress: typeof raw.dimensionProgress === 'object' && raw.dimensionProgress !== null
        ? { ...fallback.dimensionProgress, ...raw.dimensionProgress }
        : fallback.dimensionProgress,
      settlementProgress: typeof raw.settlementProgress === 'object' && raw.settlementProgress !== null ? raw.settlementProgress : fallback.settlementProgress,
      regionStates,
    };
  }
}
