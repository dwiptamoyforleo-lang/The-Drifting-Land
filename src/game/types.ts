import * as THREE from 'three';

export type GraphicsQuality = 'low' | 'balanced' | 'high';
export type CameraMode = 'third_person' | 'first_person' | 'second_person';
export type TimeOfDay = 'day' | 'sunset' | 'night' | 'red_moon';
export type WeatherType = 'clear' | 'windy' | 'cloudy' | 'storm';

export interface GameSettings {
  graphicsQuality: GraphicsQuality;
  renderDistance: number;
  shadowsEnabled: boolean;
  environmentalEffects: boolean;
  cameraEffects: boolean;
  uiScale: number;
  sensitivity: number;
  touchLookSensitivity: number;
  joystickSize: 'small' | 'medium' | 'large';
  buttonOpacity: number;
  audioEnabled: boolean;
  masterVolume: number;
  musicVolume: number;
  ambientVolume: number;
  sfxVolume: number;
  cameraMode: CameraMode;
  hudVisible: boolean;
  dayCycleSpeed: number;
  showFps: boolean;
}

export type ItemCategory =
  | 'resources'
  | 'food_recovery'
  | 'crafting_materials'
  | 'tools_equipment'
  | 'quest_objects'
  | 'ancient_relics'
  | 'rare_loot'
  | 'collectibles'
  | 'special_event';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'relic' | 'mythic' | 'legendary';
export type EquipmentSlot = 'tool' | 'protective' | 'exploration' | 'utility' | 'relic' | 'artifact';

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: ItemRarity;
  quantity: number;
  valueCoins: number;
  icon: string;
  equipmentSlot?: EquipmentSlot;
  tradeOffDescription?: string;
  healAmount?: number;
  staminaAmount?: number;
}

export interface UserProfile {
  username: string;
  level: number;
  xp: number;
  coins: number;
  selectedSector: number;
  unlockedSectors: number[];
  unlockedDimensions: number[];
}

export interface GameProgress {
  activatedAnchors: string[];
  activatedCheckpoints: string[];
  collectedFragments: string[];
  completedQuests: string[];
  activeQuests: Record<string, number>;
  coins: number;
  unlockedDimensions: number[];
  discoveredRegions: string[];
  resonanceDiscovered: boolean;
  bossesDefeated: string[];
  lastPosition: [number, number, number];
  currentSector: number;
  currentDimension: number;
  saveVersion: string;
  timestamp: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  category: string;
  description: string;
  resultItem: InventoryItem;
  resultCount: number;
  materials: Array<{ itemId: string; itemName: string; count: number; icon: string }>;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: ItemRarity;
  price: number;
  icon: string;
  traderId: string;
  requiredAnchorCount?: number;
  requiresNight?: boolean;
  requiresRedMoon?: boolean;
}

export interface HostileCreature {
  id: string;
  name: string;
  mobType: 'nest_scout' | 'ruin_guardian' | 'storm_ray_predator' | 'armored_golem' | 'rift_stalker' | 'ancient_titan_boss' | 'crimson_warden';
  health: number;
  maxHealth: number;
  attackPower: number;
  attackCooldown: number;
  attackTimer: number;
  detectionRange: number;
  attackRange: number;
  speed: number;
  state: 'idle' | 'chasing' | 'attacking' | 'defeated';
  position: THREE.Vector3;
  homePosition: THREE.Vector3;
  mesh: THREE.Group;
  eyeLight?: THREE.PointLight;
  lootTable: Array<{ itemId: string; chance: number; minQty: number; maxQty: number; rarity: ItemRarity }>;
  rareDropNotification?: string;
  respawnTime: number;
  respawnTimer: number;
  isBoss?: boolean;
}

export interface WorldFragment {
  id: string;
  name: string;
  lore: string;
  position: [number, number, number];
  collected: boolean;
}

export interface MagicalAnchor {
  id: string;
  name: string;
  description: string;
  position: [number, number, number];
  activated: boolean;
}

export interface WorldCheckpoint {
  id: string;
  name: string;
  sectorName: string;
  position: [number, number, number];
  activated: boolean;
}

export interface PlayerStats {
  maxHealth: number;
  maxStamina: number;
  speedMultiplier: number;
  fallDamageReduction: number;
  staminaRegenRate: number;
}

export interface PerformanceStats {
  fps: number;
  drawCalls: number;
  triangles: number;
}

export interface TelemetryData {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  currency: number;
  dayNumber: number;
  worldTime: string;
  timeToSunset: string;
  currentLocation: string;
  currentObjective: string;
  timeOfDay: TimeOfDay;
  timeLabel: string;
}

export interface SectorInfo {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  altitudeMeters: number;
  difficulty: 'Standard' | 'Advanced' | 'Extreme';
  recommendedLevel: number;
  discoveries: string[];
  creaturesAndHazards: string;
  completionPercentage: number;
  spawnPoint: [number, number, number];
}

export interface DialogueOption {
  label: string;
  response: string;
  nextDialogueId?: string;
  openShop?: boolean;
  rewardXp?: number;
  rewardCoins?: number;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  title: string;
  greeting: string;
  options: DialogueOption[];
}
