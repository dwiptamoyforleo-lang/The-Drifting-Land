/**
 * Core type definitions for The Drifting World
 */
import * as THREE from 'three';

export type GraphicsQuality = 'low' | 'balanced' | 'high';
export type CameraMode = 'third_person' | 'first_person' | 'second_person';
export type TimeOfDay = 'day' | 'sunset' | 'night' | 'red_moon';

export interface GameSettings {
  graphicsQuality: GraphicsQuality;
  sensitivity: number;        // 0.5 to 2.5
  audioEnabled: boolean;
  ambientVolume: number;     // 0.0 to 1.0
  sfxVolume: number;         // 0.0 to 1.0
  showFps: boolean;
  cameraMode: CameraMode;
  joystickSize: 'small' | 'medium' | 'large';
  buttonOpacity: number;     // 0.4 to 1.0
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'relic';

export type ItemCategory =
  | 'resources'
  | 'food_recovery'
  | 'crafting_materials'
  | 'tools_equipment'
  | 'quest_objects'
  | 'ancient_relics'
  | 'rare_loot'
  | 'collectibles'
  | 'special_event'
  // Legacy aliases for backward compatibility:
  | 'material'
  | 'artifact'
  | 'consumable'
  | 'key_item'
  | 'protective'
  | 'exploration';

export type EquipmentSlot = 'tool' | 'protective' | 'exploration' | 'utility' | 'relic' | 'artifact';

export interface ItemEquipmentStats {
  maxHealthBonus?: number;
  maxStaminaBonus?: number;
  speedMultiplier?: number;
  fallDamageReduction?: number;
  staminaRegenMultiplier?: number;
  miningEfficiency?: number;
  illuminationRadius?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity?: ItemRarity;
  quantity: number;
  maxStack?: number;
  valueCoins: number;
  icon: string;
  equipmentSlot?: EquipmentSlot;
  stats?: ItemEquipmentStats;
  healAmount?: number;
  staminaAmount?: number;
  tradeOffDescription?: string;
}

export interface PlayerEquippedGear {
  tool?: InventoryItem | null;
  protective?: InventoryItem | null;
  exploration?: InventoryItem | null;
  utility?: InventoryItem | null;
  relic?: InventoryItem | null;
  artifact?: InventoryItem | null;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  speedMultiplier: number;
  fallDamageReduction: number;
  staminaRegenRate: number;
  isSprinting: boolean;
  isExhausted: boolean;
  locationName: string;
  coordinates: [number, number, number];
  environmentalStatus: string;
  hazardLevel: 'safe' | 'caution' | 'danger';
}

export interface CraftingMaterialRequirement {
  itemId: string;
  itemName: string;
  count: number;
  icon?: string;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  category: 'tools_equipment' | 'protective' | 'exploration' | 'food_recovery' | 'relics' | 'special';
  resultItem: InventoryItem;
  resultCount: number;
  materials: CraftingMaterialRequirement[];
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  rewardXp: number;
  rewardCoins: number;
  completed: boolean;
  sectorId: number;
}

export interface WorldFragment {
  id: string;
  name: string;
  lore: string;
  position: [number, number, number];
  collected: boolean;
  mesh?: THREE.Object3D;
}

export interface MagicalAnchor {
  id: string;
  name: string;
  subtitle?: string;
  description: string;
  position: [number, number, number];
  beamColor?: number;
  activated: boolean;
  connectsTo?: string | null;
  mesh?: THREE.Object3D;
  crystalMesh?: THREE.Mesh;
  light?: THREE.PointLight;
}

export interface InscriptionLore {
  id: string;
  title: string;
  text: string;
  position: [number, number, number];
  mesh?: THREE.Object3D;
}

export interface InteractableObject {
  id: string;
  type: 'anchor' | 'fragment' | 'inscription' | 'citadel_core' | 'npc' | 'resource' | 'checkpoint' | 'wildlife' | 'trader' | 'treasure' | 'plant' | 'creature' | 'vault_mechanism';
  title: string;
  prompt: string;
  distance: number;
  position: THREE.Vector3;
  onInteract: () => void;
}

export interface LootDrop {
  itemId: string;
  chance: number;       // 0.0 to 1.0 (e.g. 0.35 for 35%)
  minQty: number;
  maxQty: number;
  rarity: ItemRarity;
}

export interface HostileCreature {
  id: string;
  name: string;
  mobType: 'nest_scout' | 'ruin_guardian' | 'storm_ray_predator' | 'armored_golem' | 'rift_stalker' | 'ancient_titan_boss';
  health: number;
  maxHealth: number;
  attackPower: number;
  attackCooldown: number;
  attackTimer: number;
  detectionRange: number;
  attackRange: number;
  speed: number;
  state: 'idle' | 'patrolling' | 'alerted' | 'chasing' | 'attacking' | 'defeated';
  position: THREE.Vector3;
  homePosition: THREE.Vector3;
  mesh?: THREE.Group;
  eyeLight?: THREE.PointLight;
  lootTable: LootDrop[];
  rareDropNotification?: string;
  respawnTime?: number;
  respawnTimer?: number;
  isBoss?: boolean;
}

export interface CustomPlant {
  id: string;
  name: string;
  species: 'lumenvine' | 'moonbloom' | 'emberfern' | 'driftroot' | 'glassleaf' | 'whispermoss' | 'rift_orchid';
  habitat: string;
  description: string;
  position: [number, number, number];
  harvestYieldItemId: string;
  harvestYieldCount: number;
  harvestRarity: ItemRarity;
  harvestCooldown: number;
  harvestTimer: number;
  isHarvested: boolean;
  requiresNight?: boolean;
  mesh?: THREE.Object3D;
  bloomLight?: THREE.PointLight;
}

export interface DialogueOption {
  label: string;
  response: string;
  nextDialogId?: string;
  rewardCoins?: number;
  rewardXp?: number;
  questTriggerId?: string;
  openShop?: boolean;
  openTradeTraderId?: string;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  title: string;
  greeting: string;
  options: DialogueOption[];
}

export interface WorldNPC {
  id: string;
  name: string;
  role: string;
  settlement?: string;
  isTrader?: boolean;
  traderId?: string;
  position: [number, number, number];
  dialogue: DialogueNode;
  mesh?: THREE.Object3D;
  behavior?: 'standing' | 'sitting' | 'patrolling' | 'tending' | 'guarding' | 'scanning' | 'stranded';
  patrolPoints?: [number, number, number][];
}

export interface WorldWildlife {
  id: string;
  name: string;
  species: 'cloudgrazer' | 'emberfox' | 'glasswing' | 'mossback' | 'storm_ray' | 'glowhare' | 'rift_stalker' | 'moon_deer';
  description: string;
  position: [number, number, number];
  homePosition: [number, number, number];
  behavior: 'grazing' | 'wandering' | 'resting' | 'fleeing' | 'hopping' | 'soaring';
  isNocturnal?: boolean;
  isLunar?: boolean;
  mesh?: THREE.Object3D;
  studied: boolean;
}

export interface TreasureCache {
  id: string;
  name: string;
  position: [number, number, number];
  coins: number;
  rewardItemId?: string;
  opened: boolean;
  mesh?: THREE.Object3D;
}

export interface HarvestableResource {
  id: string;
  name: string;
  itemType: string;
  coinValue: number;
  xpValue: number;
  position: [number, number, number];
  collected: boolean;
  mesh?: THREE.Object3D;
}

export interface WorldCheckpoint {
  id: string;
  name: string;
  sectorName: string;
  position: [number, number, number];
  activated: boolean;
  mesh?: THREE.Object3D;
  light?: THREE.PointLight;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  price: number;
  icon: string;
  rarity?: ItemRarity;
  stock?: number;
  requiredQuestId?: string;
  requiredAnchorCount?: number;
  requiresNight?: boolean;
  requiresRedMoon?: boolean;
  traderId?: string;
}

export interface GameProgress {
  activatedAnchors: string[];
  collectedFragments: string[];
  resonanceDiscovered: boolean;
  citadelExplored: boolean;
  lastCheckpoint: [number, number, number];
  activatedCheckpoints: string[];
  collectedResources: string[];
  coins: number;
  inventory: InventoryItem[];
  equipped?: {
    tool?: string | null;
    protective?: string | null;
    exploration?: string | null;
    utility?: string | null;
    relic?: string | null;
    artifact?: string | null;
  };
  hotbar?: (string | null)[]; // 6 slot item IDs
  completedQuests: string[];
  openedTreasures?: string[];
  studiedWildlife?: string[];
  discoveredSettlements?: string[];
  redMoonWitnessed: boolean;
  discoveredCreatures?: string[];
  defeatedBosses?: string[];
  unlockedVaults?: string[];
  catalogedPlants?: string[];
}

export interface WorldClockData {
  dayNumber: number;
  inGameTime: string; // e.g. "16:42"
  period: 'Dawn' | 'Day' | 'Sunset' | 'Night' | 'Red Moon Eclipse';
  nextTransitionLabel: string; // e.g. "Sunset in 02:18" or "Sunrise in 03:45"
  weatherCondition: string; // e.g. "Solar Calm", "Celestial Mist", "Red Moon Distortion"
  dayProgress: number; // 0.0 to 1.0
}

export interface TelemetryData {
  headingDegrees: number;
  temperatureCelsius: number;
  elevationMeters: number;
  timeOfDay: TimeOfDay;
  timeLabel: string;
  clock?: WorldClockData;
}

export interface UserProfile {
  username: string;
  xp: number;
  level: number;
  coins: number;
  selectedSector: number;
  unlockedSectors: number[];
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
  completionPercentage?: number;
  spawnPoint: [number, number, number];
}

export interface PerformanceStats {
  fps: number;
  drawCalls: number;
  triangles: number;
}

