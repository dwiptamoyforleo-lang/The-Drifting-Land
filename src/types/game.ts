/**
 * The Drifting Land - Core Type Definitions & Schemas
 * Comprehensive data contracts for all gameplay, progression, rendering, and persistence systems.
 */

export type GameMode = 'TITLE' | 'PLAYING' | 'PAUSED' | 'SETTINGS' | 'INVENTORY' | 'QUESTS' | 'MAP' | 'ERROR';

export type CameraMode = 'THIRD_PERSON' | 'FIRST_PERSON' | 'SECOND_PERSON';

export type TimeOfDay = 'DAWN' | 'NOON' | 'DUSK' | 'NIGHT' | 'RED_MOON';

export type WeatherType = 'CLEAR' | 'MIST' | 'AETHER_BREEZE' | 'POLLEN_DRIFT' | 'RED_ECLIPSE';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ItemCategory = 'resource' | 'relic' | 'consumable' | 'gear' | 'quest' | 'currency';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  speed: number;
  jumpForce: number;
  level: number;
  experience: number;
  experienceToNext: number;
}

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  category: ItemCategory;
  value: number; // Base vendor value in Sunstone Coins
  stackable: boolean;
  maxStack: number;
  icon: string;
  lore?: string;
  statsEffect?: {
    heal?: number;
    stamina?: number;
    speedBoostDuration?: number;
  };
}

export interface InventorySlot {
  slotId: number;
  item: ItemDefinition;
  quantity: number;
}

export interface PlayerWallet {
  sunstoneCoins: number; // Standard trader currency
  aetherEssence: number; // Rare celestial upgrade currency
}

export interface ShardRelic {
  id: string;
  name: string;
  region: string;
  position: [number, number, number];
  collected: boolean;
  loreSnippet: string;
  element: 'verdant' | 'aether' | 'solar' | 'lunar';
}

export interface BeaconStatus {
  id: string;
  name: string;
  activated: boolean;
  activationProgress: number; // 0 to 1
  requiredShards: number;
}

export interface Checkpoint {
  id: string;
  name: string;
  regionId: string;
  position: [number, number, number];
  activated: boolean;
  discovered: boolean;
}

export interface RegionDefinition {
  id: string;
  dimensionId: string;
  name: string;
  subtitle: string;
  description: string;
  fogColor: number;
  fogDensity: number;
  ambientLightColor: number;
  ambientLightGround: number;
  sunColor: number;
  spawnPoint: [number, number, number];
  weatherProfile: WeatherType[];
  discoveryLore: string;
}

export interface DimensionDefinition {
  id: string;
  name: string;
  description: string;
  gravityModifier: number;
  skyVoidColor: number;
  regions: string[];
}

export interface QuestObjective {
  id: string;
  description: string;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  type: 'COLLECT' | 'DISCOVER' | 'ACTIVATE_BEACON' | 'INTERACT_NPC';
  targetId?: string;
}

export interface QuestReward {
  experience: number;
  coins: number;
  items?: { itemId: string; quantity: number }[];
}

export interface QuestDefinition {
  id: string;
  title: string;
  giverName: string;
  regionId: string;
  description: string;
  loreSnippet: string;
  objectives: QuestObjective[];
  rewards: QuestReward;
  prerequisiteQuestId?: string;
}

export interface QuestProgress {
  questId: string;
  status: 'LOCKED' | 'AVAILABLE' | 'ACTIVE' | 'COMPLETED';
  objectives: Record<string, number>; // objectiveId -> current count
}

export type EntityType = 'CREATURE' | 'NPC' | 'COLLECTIBLE' | 'CHECKPOINT' | 'PORTAL';

export interface WorldEntityDefinition {
  id: string;
  name: string;
  type: EntityType;
  position: [number, number, number];
  rotationY?: number;
  dialogue?: string[];
  drops?: { itemId: string; chance: number; min: number; max: number }[];
  interactPrompt?: string;
}

export interface WorldTimeState {
  timeScale: number; // multiplier
  cycleTime: number; // 0.0 to 1.0 (0=dawn, 0.25=noon, 0.5=dusk, 0.75=night)
  dayCount: number;
  isRedMoon: boolean;
  phaseName: TimeOfDay;
}

export interface WeatherState {
  currentWeather: WeatherType;
  transitionProgress: number; // 0 to 1
  windIntensity: number;
  fogModifier: number;
}

export interface GameSettings {
  graphicsQuality: 'high' | 'medium' | 'low';
  fov: number;
  shadows: boolean;
  soundEnabled: boolean;
  masterVolume: number;
  invertY: boolean;
  touchControls: boolean;
  cameraMode: CameraMode;
  cameraSensitivity: number;
  cameraDistance: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'quest' | 'relic' | 'item' | 'discovery';
  timestamp: number;
  durationMs?: number;
}

export interface SaveData {
  version: number;
  timestamp: number;
  dimensionId: string;
  regionId: string;
  activeCheckpointId?: string;
  playerPosition: [number, number, number];
  playerRotationY: number;
  playerStats: PlayerStats;
  wallet: PlayerWallet;
  inventory: { itemId: string; quantity: number }[];
  quests: Record<string, QuestProgress>;
  collectedShardIds: string[];
  beaconStates: Record<string, boolean>;
  activatedCheckpoints: string[];
  worldTime: {
    cycleTime: number;
    dayCount: number;
  };
  currentWeather: WeatherType;
  settings: GameSettings;
  discoveries: string[];
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  dash: boolean;
  sprint: boolean;
  interact: boolean;
  pause: boolean;
  toggleInventory: boolean;
  toggleQuests: boolean;
  toggleMap: boolean;
  switchCamera: boolean;
  // Touch / Analog stick values (-1 to 1)
  joystickX: number;
  joystickY: number;
  // Camera rotation delta from mouse or touch drag
  lookDeltaX: number;
  lookDeltaY: number;
}
