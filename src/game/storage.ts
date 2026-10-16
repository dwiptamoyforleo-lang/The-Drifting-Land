/**
 * Local progress persistence for The Drifting World
 */
import { GameProgress, GameSettings, UserProfile } from './types';
import { INITIAL_INVENTORY_ITEMS, INITIAL_EQUIPPED_SLOTS, INITIAL_HOTBAR_IDS } from './itemDatabase';

const STORAGE_KEY_PROGRESS = 'the_drifting_world_progress_v2';
const STORAGE_KEY_PROGRESS_BACKUP = 'the_drifting_world_progress_v2_backup';
const STORAGE_KEY_SETTINGS = 'the_drifting_world_settings_v1';
const STORAGE_KEY_PROFILE = 'the_drifting_world_profile_v1';

export const DEFAULT_USER_PROFILE: UserProfile = {
  username: 'Aero_Vanguard',
  xp: 1850,
  level: 4,
  coins: 420,
  selectedSector: 1,
  unlockedSectors: [1, 2, 3, 4, 5, 6],
};

export const DEFAULT_SETTINGS: GameSettings = {
  graphicsQuality: 'balanced',
  sensitivity: 1.2,
  audioEnabled: true,
  ambientVolume: 0.7,
  sfxVolume: 0.85,
  showFps: false,
  cameraMode: 'first_person',
  joystickSize: 'medium',
  buttonOpacity: 0.85,
};

export const INITIAL_PROGRESS: GameProgress = {
  activatedAnchors: [],
  collectedFragments: [],
  resonanceDiscovered: false,
  citadelExplored: false,
  lastCheckpoint: [0, 4.2, 0],
  activatedCheckpoints: [],
  collectedResources: [],
  coins: 420,
  inventory: INITIAL_INVENTORY_ITEMS,
  equipped: INITIAL_EQUIPPED_SLOTS,
  hotbar: INITIAL_HOTBAR_IDS,
  completedQuests: [],
  redMoonWitnessed: false,
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // localStorage unavailable or parse error
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: GameSettings) {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function sanitizeProgress(parsed: Partial<GameProgress>): GameProgress {
  const coins = typeof parsed.coins === 'number' && Number.isFinite(parsed.coins) ? Math.max(0, Math.floor(parsed.coins)) : INITIAL_PROGRESS.coins;
  const lastCheckpoint: [number, number, number] = Array.isArray(parsed.lastCheckpoint) && parsed.lastCheckpoint.length === 3 && parsed.lastCheckpoint.every(n => typeof n === 'number' && Number.isFinite(n))
    ? [parsed.lastCheckpoint[0], parsed.lastCheckpoint[1], parsed.lastCheckpoint[2]]
    : INITIAL_PROGRESS.lastCheckpoint;

  return {
    ...INITIAL_PROGRESS,
    ...parsed,
    coins,
    lastCheckpoint,
    inventory: Array.isArray(parsed.inventory) ? parsed.inventory : INITIAL_INVENTORY_ITEMS,
    equipped: parsed.equipped && typeof parsed.equipped === 'object' ? { ...INITIAL_EQUIPPED_SLOTS, ...parsed.equipped } : INITIAL_EQUIPPED_SLOTS,
    hotbar: Array.isArray(parsed.hotbar) ? parsed.hotbar : INITIAL_HOTBAR_IDS,
    activatedAnchors: Array.isArray(parsed.activatedAnchors) ? parsed.activatedAnchors : [],
    collectedFragments: Array.isArray(parsed.collectedFragments) ? parsed.collectedFragments : [],
    activatedCheckpoints: Array.isArray(parsed.activatedCheckpoints) ? parsed.activatedCheckpoints : [],
    collectedResources: Array.isArray(parsed.collectedResources) ? parsed.collectedResources : [],
    completedQuests: Array.isArray(parsed.completedQuests) ? parsed.completedQuests : [],
  };
}

export function loadProgress(): GameProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (raw) {
      return sanitizeProgress(JSON.parse(raw));
    }
  } catch {
    // Primary slot error, try backup slot
    try {
      const backup = localStorage.getItem(STORAGE_KEY_PROGRESS_BACKUP);
      if (backup) {
        return sanitizeProgress(JSON.parse(backup));
      }
    } catch {
      // ignore
    }
  }
  return { ...INITIAL_PROGRESS };
}

export function saveProgress(progress: GameProgress) {
  try {
    const serialized = JSON.stringify(progress);
    // Keep previous state as backup before overwriting
    const existing = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (existing) {
      localStorage.setItem(STORAGE_KEY_PROGRESS_BACKUP, existing);
    }
    localStorage.setItem(STORAGE_KEY_PROGRESS, serialized);
  } catch {
    // ignore quota errors
  }
}

export function clearProgress(): GameProgress {
  try {
    localStorage.removeItem(STORAGE_KEY_PROGRESS);
    localStorage.removeItem(STORAGE_KEY_PROGRESS_BACKUP);
  } catch {
    // ignore
  }
  return { ...INITIAL_PROGRESS };
}

export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (raw) {
      return { ...DEFAULT_USER_PROFILE, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_USER_PROFILE };
}

export function saveUserProfile(profile: UserProfile) {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  } catch {
    // ignore
  }
}
