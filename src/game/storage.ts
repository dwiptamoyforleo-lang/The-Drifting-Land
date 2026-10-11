/**
 * Local progress persistence for The Drifting World
 */
import { GameProgress, GameSettings, UserProfile } from './types';

const STORAGE_KEY_PROGRESS = 'the_drifting_world_progress_v1';
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
  cameraMode: 'third_person',
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
  inventory: [
    {
      id: 'item-compass',
      name: 'Aetheric Field Compass',
      description: 'Precision celestial instrument calibrated to detect magnetic anomalies and drifting anchors.',
      category: 'artifact',
      quantity: 1,
      valueCoins: 120,
      icon: 'compass',
    },
    {
      id: 'item-repair-gel',
      name: 'Aerosol Nanite Gel',
      description: 'Pressurized sealant used to restore explorer suit integrity and calibrate machinery.',
      category: 'consumable',
      quantity: 3,
      valueCoins: 45,
      icon: 'shield',
    },
    {
      id: 'item-celestial-shard',
      name: 'Celestine Shard',
      description: 'Vibrant turquoise crystal harvested from high-altitude drifting landmasses.',
      category: 'material',
      quantity: 5,
      valueCoins: 60,
      icon: 'gem',
    },
  ],
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

export function loadProgress(): GameProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (raw) {
      return { ...INITIAL_PROGRESS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return { ...INITIAL_PROGRESS };
}

export function saveProgress(progress: GameProgress) {
  try {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function clearProgress(): GameProgress {
  try {
    localStorage.removeItem(STORAGE_KEY_PROGRESS);
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
