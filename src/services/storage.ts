/**
 * Browser-local persistence service for The Drifting Land.
 * Purely client-side, offline-safe, versioned, and resilient against corrupted storage.
 * Manages full game state: player stats, inventory, wallet, quests, beacons, checkpoints, and time.
 */

import { SaveData, GameSettings, PlayerStats, PlayerWallet, WeatherType } from '../types/game';

const SAVE_KEY = 'the_drifting_land_save_v1';
const SETTINGS_KEY = 'the_drifting_land_settings_v1';
const CURRENT_VERSION = 1;

export const DEFAULT_SETTINGS: GameSettings = {
  graphicsQuality: 'high',
  fov: 70,
  shadows: true,
  soundEnabled: true,
  masterVolume: 0.7,
  invertY: false,
  touchControls: false,
  cameraMode: 'THIRD_PERSON',
  cameraSensitivity: 1.0,
  cameraDistance: 7.5,
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
  sunstoneCoins: 60,
  aetherEssence: 0,
};

export function createInitialSave(): SaveData {
  return {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    dimensionId: 'overworld',
    regionId: 'verdant_reach',
    activeCheckpointId: 'cp_beacon_plaza',
    playerPosition: [0, 4.5, 0],
    playerRotationY: 0,
    playerStats: { ...DEFAULT_STATS },
    wallet: { ...DEFAULT_WALLET },
    inventory: [
      { itemId: 'traveler_rations', quantity: 2 },
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
    settings: { ...DEFAULT_SETTINGS },
    discoveries: ['The Verdant Reach', 'Ancient Floating Spire', 'Monolith Beacon Plaza'],
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
   * Load active player save data with schema validation & corruption fallback
   */
  static loadSave(): SaveData {
    if (!this.isAvailable()) {
      return createInitialSave();
    }

    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) {
        return createInitialSave();
      }

      const parsed = JSON.parse(raw);
      return this.validateAndMigrate(parsed);
    } catch (err) {
      console.warn('Corrupted save data detected. Falling back to clean save.', err);
      return createInitialSave();
    }
  }

  /**
   * Persist player save data safely
   */
  static saveGame(data: SaveData): boolean {
    if (!this.isAvailable()) return false;
    try {
      const enriched: SaveData = {
        ...data,
        timestamp: Date.now(),
        version: CURRENT_VERSION,
      };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(enriched));
      return true;
    } catch (err) {
      console.error('Failed to write save data to localStorage:', err);
      return false;
    }
  }

  /**
   * Check if an active save exists in storage
   */
  static hasSave(): boolean {
    if (!this.isAvailable()) return false;
    try {
      return !!window.localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }

  /**
   * Reset save data
   */
  static clearSave(): boolean {
    if (!this.isAvailable()) return false;
    try {
      window.localStorage.removeItem(SAVE_KEY);
      return true;
    } catch {
      return false;
    }
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
   * Export save data as JSON string for backups / device transfer
   */
  static exportSaveJson(): string {
    const data = this.loadSave();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import save data from JSON string
   */
  static importSaveJson(jsonStr: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      const validated = this.validateAndMigrate(parsed);
      this.saveGame(validated);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Invalid JSON file' };
    }
  }

  /**
   * Validate and migrate legacy or missing properties
   */
  private static validateAndMigrate(raw: any): SaveData {
    if (!raw || typeof raw !== 'object') {
      return createInitialSave();
    }

    const fallback = createInitialSave();

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
      level: Number.isFinite(raw.playerStats?.level) ? raw.playerStats.level : fallback.playerStats.level,
      experience: Number.isFinite(raw.playerStats?.experience) ? raw.playerStats.experience : fallback.playerStats.experience,
      experienceToNext: Number.isFinite(raw.playerStats?.experienceToNext) ? raw.playerStats.experienceToNext : fallback.playerStats.experienceToNext,
    };

    const wallet: PlayerWallet = {
      sunstoneCoins: Number.isFinite(raw.wallet?.sunstoneCoins) ? raw.wallet.sunstoneCoins : fallback.wallet.sunstoneCoins,
      aetherEssence: Number.isFinite(raw.wallet?.aetherEssence) ? raw.wallet.aetherEssence : fallback.wallet.aetherEssence,
    };

    return {
      version: CURRENT_VERSION,
      timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Date.now(),
      dimensionId: typeof raw.dimensionId === 'string' ? raw.dimensionId : fallback.dimensionId,
      regionId: typeof raw.regionId === 'string' ? raw.regionId : fallback.regionId,
      activeCheckpointId: typeof raw.activeCheckpointId === 'string' ? raw.activeCheckpointId : fallback.activeCheckpointId,
      playerPosition: pos,
      playerRotationY: Number.isFinite(raw.playerRotationY) ? raw.playerRotationY : 0,
      playerStats: stats,
      wallet,
      inventory: Array.isArray(raw.inventory) ? raw.inventory : fallback.inventory,
      quests: typeof raw.quests === 'object' && raw.quests !== null ? raw.quests : fallback.quests,
      collectedShardIds: Array.isArray(raw.collectedShardIds) ? raw.collectedShardIds : [],
      beaconStates: typeof raw.beaconStates === 'object' && raw.beaconStates !== null ? raw.beaconStates : fallback.beaconStates,
      activatedCheckpoints: Array.isArray(raw.activatedCheckpoints) ? raw.activatedCheckpoints : fallback.activatedCheckpoints,
      worldTime: {
        cycleTime: Number.isFinite(raw.worldTime?.cycleTime) ? raw.worldTime.cycleTime : fallback.worldTime.cycleTime,
        dayCount: Number.isFinite(raw.worldTime?.dayCount) ? raw.worldTime.dayCount : fallback.worldTime.dayCount,
      },
      currentWeather: typeof raw.currentWeather === 'string' ? (raw.currentWeather as WeatherType) : fallback.currentWeather,
      settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
      discoveries: Array.isArray(raw.discoveries) ? raw.discoveries : fallback.discoveries,
    };
  }
}
