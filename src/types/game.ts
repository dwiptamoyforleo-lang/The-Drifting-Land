/**
 * The Drifting Land - Core Type Definitions & Schemas
 * Comprehensive data contracts for all gameplay, progression, rendering, and persistence systems.
 */

export type GameMode = 'TITLE' | 'PLAYING' | 'PAUSED' | 'SETTINGS' | 'INVENTORY' | 'QUESTS' | 'MAP' | 'TRADE' | 'ERROR';

export type CameraMode = 'THIRD_PERSON' | 'FIRST_PERSON' | 'SECOND_PERSON';

export type TimeOfDay = 'DAWN' | 'NOON' | 'DUSK' | 'NIGHT' | 'RED_MOON';

export type WeatherType =
  | 'CLEAR'
  | 'MIST'
  | 'WIND'
  | 'RAIN'
  | 'CLOUDS'
  | 'STORMS'
  | 'DIMENSIONAL_DISTURBANCE'
  | 'RED_ECLIPSE';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ItemCategory =
  | 'resource'
  | 'crafting_material'
  | 'tool'
  | 'equipment'
  | 'recovery'
  | 'quest'
  | 'relic'
  | 'collectible'
  | 'event_reward'
  | 'consumable'
  | 'gear'
  | 'currency';

export type EquipmentSlotType = 'head' | 'body' | 'tool' | 'accessory';

export interface EquippedGear {
  head?: string | null;
  body?: string | null;
  tool?: string | null;
  accessory?: string | null;
}

export interface CraftingIngredient {
  itemId: string;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  category: 'tools' | 'equipment' | 'recovery' | 'structures' | 'relics';
  description: string;
  ingredients: CraftingIngredient[];
  result: {
    itemId: string;
    quantity: number;
  };
  station?: 'hand' | 'research_camp' | 'any';
  icon: string;
}

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
  equipSlot?: EquipmentSlotType;
  equipBonus?: {
    healthBonus?: number;
    staminaBonus?: number;
    speedBonus?: number;
    miningBonus?: number;
    lightRadius?: number;
  };
  statsEffect?: {
    heal?: number;
    stamina?: number;
    speedBoostDuration?: number;
    maxHealthBoost?: number;
    maxStaminaBoost?: number;
  };
}

export interface InventorySlot {
  slotId: number;
  item: ItemDefinition;
  quantity: number;
}

export interface PlayerWallet {
  driftCoins: number; // Standard archipelago currency (Drift Coins)
  sunstoneCoins?: number; // Backwards-compatible alias
  aetherEssence: number; // Rare celestial upgrade currency
}

export interface TradeOffer {
  itemId: string;
  price: number; // in Drift Coins
  stock?: number; // optional stock limit (-1 for unlimited)
}

export interface TraderCatalog {
  id: string;
  traderName: string;
  title: string;
  greeting: string;
  offers: TradeOffer[];
  canBuyPlayerItems: boolean;
  sellPriceMultiplier: number;
}

export type NpcRole =
  | 'SETTLER'
  | 'RESEARCHER'
  | 'MERCHANT'
  | 'SCOUT'
  | 'TRAVELER'
  | 'LOST_EXPLORER'
  | 'VILLAGE_LEADER'
  | 'TRADING_CREATURE';

export type NpcBehaviorState = 'WALKING' | 'RESTING' | 'GUARDING' | 'TRADING' | 'SHELTERING';

export interface NpcSchedule {
  dayBehavior: NpcBehaviorState;
  nightBehavior: NpcBehaviorState;
  stormBehavior: NpcBehaviorState;
  redMoonBehavior: NpcBehaviorState;
  patrolPoints?: [number, number, number][];
  homePosition: [number, number, number];
  shelterPosition: [number, number, number];
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

export type QuestCategory =
  | 'main'
  | 'side'
  | 'exploration'
  | 'collection'
  | 'research'
  | 'npc'
  | 'crafting'
  | 'boss'
  | 'dimension'
  | 'event';

export type QuestState = 'locked' | 'available' | 'active' | 'completed' | 'LOCKED' | 'AVAILABLE' | 'ACTIVE' | 'COMPLETED';

export type QuestObjectiveType =
  | 'EXPLORE_AREA'
  | 'COLLECT'
  | 'DISCOVER'
  | 'ACTIVATE_BEACON'
  | 'READ_RECORD'
  | 'ENTER_CHAMBER'
  | 'LOCATE_DISTURBANCE'
  | 'DISCOVER_PORTAL'
  | 'CRAFT'
  | 'INTERACT_NPC'
  | 'DEFEAT_BOSS'
  | 'SURVIVE_RED_MOON';

export interface QuestObjective {
  id: string;
  description: string;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  type: QuestObjectiveType;
  targetId?: string;
  targetCoords?: [number, number, number];
}

export interface QuestReward {
  experience: number;
  coins: number;
  items?: { itemId: string; quantity: number }[];
}

export interface QuestDefinition {
  id: string;
  title: string;
  category: QuestCategory;
  giverName: string;
  regionId: string;
  description: string;
  loreSnippet: string;
  objectives: QuestObjective[];
  rewards: QuestReward;
  prerequisiteQuestId?: string;
  targetLocation?: [number, number, number];
  targetLocationName?: string;
}

export interface QuestProgress {
  questId: string;
  status: QuestState;
  objectives: Record<string, number>; // objectiveId -> current count
  rewardsClaimed?: boolean;
  completedAt?: number;
}

export type AchievementCategory =
  | 'discovery'
  | 'collection'
  | 'crafting'
  | 'checkpoints'
  | 'boss'
  | 'progression'
  | 'event';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  secret?: boolean;
  rewards: {
    experience: number;
    coins: number;
  };
}

export interface ExplorationRankInfo {
  rank: number;
  title: string;
  requiredXp: number;
  perkName: string;
  perkDescription: string;
}

export type EntityType = 'CREATURE' | 'NPC' | 'COLLECTIBLE' | 'CHECKPOINT' | 'PORTAL' | 'BOSS' | 'TRADER';

export interface WorldEntityDefinition {
  id: string;
  name: string;
  type: EntityType;
  position: [number, number, number];
  rotationY?: number;
  dialogue?: string[];
  role?: NpcRole;
  roleTitle?: string;
  tradeCatalogId?: string;
  schedule?: NpcSchedule;
  drops?: { itemId: string; chance: number; min: number; max: number }[];
  interactPrompt?: string;
}

export interface WorldTimeState {
  timeScale: number; // multiplier
  cycleTime: number; // 0.0 to 1.0 (0=dawn, 0.65=sunset, 1.0=dawn)
  dayCount: number;
  isRedMoon: boolean;
  phaseName: TimeOfDay;
  clockTime: string; // e.g. "14:24"
  nextTransitionLabel: string; // "Sunset" or "Sunrise"
  nextTransitionSeconds: number; // accurate remaining seconds until next sunrise/sunset
  dayDurationSeconds: number; // e.g. 1200 (20 real minutes)
}

export interface WeatherState {
  currentWeather: WeatherType;
  transitionProgress: number; // 0 to 1
  windIntensity: number;
  fogModifier: number;
  precipitationIntensity: number; // 0 to 1
}

export interface RedMoonSaveState {
  isActive: boolean;
  lastEvaluatedNightDay: number; // prevents browser refresh rerolls
  cooldownUntilDay: number;
  wardenDefeated: boolean;
  wardenRewardsClaimed: boolean;
  forceTriggered?: boolean;
}

export interface CrimsonWardenState {
  active: boolean;
  health: number;
  maxHealth: number;
  phase: 1 | 2;
  attackWarning: {
    type: string;
    progress: number;
    x: number;
    z: number;
    radius: number;
  } | null;
  isDefeated: boolean;
  defeatedMessage?: string;
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
  particleLimit: number; // Low=250, Medium=600, High=1200
  dayDurationMinutes: number; // default 20
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'quest' | 'relic' | 'item' | 'discovery' | 'danger';
  timestamp: number;
  durationMs?: number;
}

export type InteractableType =
  | 'CHECKPOINT_BEACON'
  | 'RUINED_TOWER'
  | 'HIDDEN_CHAMBER'
  | 'ABANDONED_SETTLEMENT'
  | 'RESEARCH_CAMP'
  | 'SUSPENDED_BRIDGE'
  | 'LOCKED_DOOR'
  | 'RESOURCE_DEPOSIT'
  | 'DIMENSIONAL_GATEWAY'
  | 'SHARD'
  | 'NPC'
  | 'CREATURE'
  | 'BOSS';

export interface InteractionPrompt {
  id: string;
  name: string;
  type: InteractableType;
  actionText: string;
  keyHint?: string;
  distance: number;
}

export type DiscoveryCategory =
  | 'LOCATION'
  | 'RUINS'
  | 'STRUCTURE'
  | 'FLORA'
  | 'CREATURE'
  | 'RECORD'
  | 'CHAMBER'
  | 'BEACON';

export interface DiscoveryDefinition {
  id: string;
  name: string;
  category: DiscoveryCategory;
  region: string;
  subtitle: string;
  description: string;
  lore: string;
  icon: string;
  coordinates: [number, number, number];
  experienceReward: number;
}

export interface ObstacleCollider {
  type: 'box' | 'cylinder';
  x: number;
  y: number;
  z: number;
  radius?: number; // for cylinder
  height?: number;
  width?: number; // for box
  depth?: number; // for box
  walkableTop?: boolean; // e.g. bridge deck or steps
  topY?: number;
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
  redMoon: RedMoonSaveState;
  settings: GameSettings;
  discoveries: string[];
  unlockedDoors: string[];
  harvestedDeposits: Record<string, number>;
  harvestedFlora: Record<string, number>;
  discoveredChambers: string[];
  activatedGateways: string[];
  examinedRecords: string[];
  hotbarSlots: (string | null)[];
  equippedGear: EquippedGear;
  trackedQuestId?: string | null;
  explorationRank: number;
  explorationXp: number;
  achievements: Record<string, { unlocked: boolean; timestamp: number }>;
  claimedQuestRewards: string[];
  discoveredNpcs?: string[];
  settlementProgress?: {
    hearthRekindled: boolean;
    spokeWithElder?: boolean;
    traderStock?: Record<string, number>;
  };
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
