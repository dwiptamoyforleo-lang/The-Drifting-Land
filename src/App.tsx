/**
 * Fully Integrated Application Core for THE DRIFTING LAND
 * Connects GameEngine, HUD, TitleScreen, Modals (Inventory, Crafting, Shop, Settings, Map, Dimensions, Journal, Credits, Dialogue),
 * LocalStorage persistence with versioning, and performance telemetry.
 */
import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { SectorSelectModal } from './components/SectorSelectModal';
import { InventoryModal } from './components/InventoryModal';
import { CraftingModal } from './components/CraftingModal';
import { ShopModal } from './components/ShopModal';
import { SettingsModal } from './components/SettingsModal';
import { MapModal } from './components/MapModal';
import { DimensionsModal } from './components/DimensionsModal';
import { JournalModal } from './components/JournalModal';
import { CreditsModal } from './components/CreditsModal';
import { DialogueModal } from './components/DialogueModal';
import {
  GameSettings,
  UserProfile,
  GameProgress,
  InventoryItem,
  EquipmentSlot,
  CraftingRecipe,
  PerformanceStats,
  TelemetryData,
  PlayerStats,
} from './game/types';
import { DEFAULT_MAP_LOCATIONS, MapLocation } from './game/mapSystem';
import { DIMENSIONS_DATABASE } from './game/dimensions';
import { ITEM_DATABASE } from './game/itemDatabase';
import { soundSystem } from './game/audio';

const STORAGE_KEY_SETTINGS = 'the_drifting_world_settings_v2';
const STORAGE_KEY_PROGRESS = 'the_drifting_world_progress_v2';
const STORAGE_KEY_PROFILE = 'the_drifting_world_profile_v2';
const STORAGE_KEY_INVENTORY = 'the_drifting_world_inventory_v2';

const DEFAULT_SETTINGS: GameSettings = {
  graphicsQuality: 'balanced',
  renderDistance: 500,
  shadowsEnabled: true,
  environmentalEffects: true,
  cameraEffects: true,
  uiScale: 1.0,
  sensitivity: 1.0,
  touchLookSensitivity: 1.0,
  joystickSize: 'medium',
  buttonOpacity: 0.85,
  audioEnabled: true,
  masterVolume: 0.8,
  musicVolume: 0.7,
  ambientVolume: 0.7,
  sfxVolume: 0.8,
  cameraMode: 'third_person',
  hudVisible: true,
  dayCycleSpeed: 1.0,
  showFps: false,
};

const DEFAULT_PROFILE: UserProfile = {
  username: 'Sky_Vanguard',
  level: 1,
  xp: 120,
  coins: 250,
  selectedSector: 1,
  unlockedSectors: [1, 2],
  unlockedDimensions: [1, 2],
};

const DEFAULT_PROGRESS: GameProgress = {
  activatedAnchors: ['anchor-1'],
  activatedCheckpoints: ['cp-1'],
  collectedFragments: ['frag-1'],
  completedQuests: [],
  activeQuests: { 'quest-anchors': 1 },
  coins: 250,
  unlockedDimensions: [1, 2],
  discoveredRegions: ['Aero-Haven Hub'],
  resonanceDiscovered: false,
  bossesDefeated: [],
  lastPosition: [0, 4.2, 0],
  currentSector: 1,
  currentDimension: 1,
  saveVersion: '2.0.0',
  timestamp: Date.now(),
};

const INITIAL_INVENTORY: InventoryItem[] = [
  { ...ITEM_DATABASE['tool-survey-multitool'], quantity: 1 },
  { ...ITEM_DATABASE['food-field-medkit'], quantity: 3 },
  { ...ITEM_DATABASE['mat-stone'], quantity: 12 },
  { ...ITEM_DATABASE['mat-wood'], quantity: 8 },
  { ...ITEM_DATABASE['mat-lumenvine'], quantity: 5 },
];

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Persistent States
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  const [progress, setProgress] = useState<GameProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROGRESS);
      return saved ? JSON.parse(saved) : DEFAULT_PROGRESS;
    } catch {
      return DEFAULT_PROGRESS;
    }
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INVENTORY);
      return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
    } catch {
      return INITIAL_INVENTORY;
    }
  });

  // Gameplay UI States
  const [isInGame, setIsInGame] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [hotbar, setHotbar] = useState<(string | null)[]>(['tool-survey-multitool', 'food-field-medkit', null, null, null, null]);
  const [selectedHotbarSlot, setSelectedHotbarSlot] = useState<number>(0);
  const [equipped, setEquipped] = useState<Record<EquipmentSlot, string | null>>({
    tool: 'tool-survey-multitool',
    protective: null,
    exploration: null,
    utility: null,
    relic: null,
    artifact: null,
  });

  // Telemetry & Stats State
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    currency: 250,
    dayNumber: 1,
    worldTime: '12:00',
    timeToSunset: '4h 00m',
    currentLocation: 'Sector 01: Aero-Haven Observation Deck',
    currentObjective: 'Harmonize the 3 Magical Anchors across the archipelago.',
    timeOfDay: 'day',
    timeLabel: 'SOLAR CYCLE: MIDDAY',
  });

  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    maxHealth: 100,
    maxStamina: 100,
    speedMultiplier: 1.0,
    fallDamageReduction: 10,
    staminaRegenRate: 24,
  });

  const [fpsStats, setFpsStats] = useState<PerformanceStats>({ fps: 60, drawCalls: 0, triangles: 0 });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [respawnAlpha, setRespawnAlpha] = useState<number>(0);

  // Save Persistence
  useEffect(() => {
    try {
      setSaveStatus('saving');
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(inventory));
      setTimeout(() => setSaveStatus('saved'), 400);
    } catch {
      setSaveStatus('unsaved');
    }
  }, [settings, profile, progress, inventory]);

  // Initialize Game Engine when entering world
  useEffect(() => {
    if (!isInGame || !containerRef.current) return;
    const engine = new GameEngine(containerRef.current, settings);
    engineRef.current = engine;

    engine.onPerformanceUpdate = (stats) => setFpsStats(stats);
    engine.onTelemetryUpdate = (data) => setTelemetry(data);
    engine.onStatsUpdate = (stats) => setPlayerStats(stats);
    engine.onRespawnEffect = (alpha) => setRespawnAlpha(alpha);
    engine.onToggleCamera = () => {
      const modes: EquipmentSlot[] = ['third_person' as unknown as EquipmentSlot, 'first_person' as unknown as EquipmentSlot, 'second_person' as unknown as EquipmentSlot];
      // Cycle camera modes
      const current = settings.cameraMode;
      const next = current === 'third_person' ? 'first_person' : current === 'first_person' ? 'second_person' : 'third_person';
      setSettings((s) => ({ ...s, cameraMode: next }));
      engine.player.setCameraMode(next);
    };

    engine.onOpenInventory = () => setActiveModal('inventory');
    engine.onOpenCrafting = () => setActiveModal('crafting');
    engine.onOpenMap = () => setActiveModal('map');
    engine.onHotbarUse = (idx) => {
      setSelectedHotbarSlot(idx);
      const itemId = hotbar[idx];
      if (itemId) {
        const item = inventory.find((i) => i.id === itemId);
        if (item && item.healAmount) {
          engine.player.heal(item.healAmount);
          // Decrement item
          setInventory((inv) =>
            inv
              .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
              .filter((i) => i.quantity > 0)
          );
        }
      }
    };

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [isInGame]);

  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    if (engineRef.current) {
      engineRef.current.applyQualitySettings(newSettings.graphicsQuality);
      engineRef.current.setSensitivity(newSettings.sensitivity);
      engineRef.current.player.setCameraMode(newSettings.cameraMode);
    }
  };

  const handleCraftRecipe = (recipe: CraftingRecipe) => {
    // Deduct materials
    setInventory((inv) => {
      let updated = [...inv];
      recipe.materials.forEach((mat) => {
        const found = updated.find((i) => i.id === mat.itemId);
        if (found) {
          found.quantity -= mat.count;
        }
      });
      updated = updated.filter((i) => i.quantity > 0);

      // Add result
      const existingResult = updated.find((i) => i.id === recipe.resultItem.id);
      if (existingResult) {
        existingResult.quantity += recipe.resultCount;
      } else {
        updated.push({ ...recipe.resultItem, quantity: recipe.resultCount });
      }
      return updated;
    });
  };

  return (
    <ErrorBoundary>
      <div className="relative w-full h-full overflow-hidden bg-[#070b14] text-slate-100 select-none font-sans">
        {/* 3D WebGL Canvas Container */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        {/* Respawn / Death Fade Overlay */}
        {respawnAlpha > 0 && (
          <div
            className="absolute inset-0 bg-black pointer-events-none z-40 transition-opacity duration-300"
            style={{ opacity: respawnAlpha }}
          >
            <div className="absolute inset-0 flex items-center justify-center font-['Cinzel'] text-2xl text-rose-400 tracking-widest">
              RESPAWNING ACROSS THE DRIFT...
            </div>
          </div>
        )}

        {/* Title Screen if not in game */}
        {!isInGame && (
          <TitleScreen
            onStartGame={() => setIsInGame(true)}
            onNewGame={() => {
              setProgress(DEFAULT_PROGRESS);
              setInventory(INITIAL_INVENTORY);
              setIsInGame(true);
            }}
            onOpenSectorSelect={() => setActiveModal('sector_select')}
            onOpenDimensions={() => setActiveModal('dimensions')}
            onOpenQuests={() => setActiveModal('quests')}
            onOpenInventory={() => setActiveModal('inventory')}
            onOpenShop={() => setActiveModal('shop')}
            onOpenSettings={() => setActiveModal('settings')}
            onOpenJournal={() => setActiveModal('journal')}
            onOpenCredits={() => setActiveModal('credits')}
            onResetProgress={() => {
              setProgress(DEFAULT_PROGRESS);
              setInventory(INITIAL_INVENTORY);
            }}
            progress={progress}
          />
        )}

        {/* Active HUD in-game */}
        {isInGame && settings.hudVisible && (
          <HUD
            health={telemetry.health}
            maxHealth={telemetry.maxHealth}
            stamina={telemetry.stamina}
            maxStamina={telemetry.maxStamina}
            currency={profile.coins}
            dayNumber={telemetry.dayNumber}
            worldTime={telemetry.worldTime}
            timeToSunset={telemetry.timeToSunset}
            currentLocation={telemetry.currentLocation}
            currentObjective={telemetry.currentObjective}
            hotbarItems={hotbar.map((id) => (id ? inventory.find((i) => i.id === id) || null : null))}
            selectedHotbarSlot={selectedHotbarSlot}
            contextPrompt={null}
            activeEvent={null}
            saveStatus={saveStatus}
            cameraMode={settings.cameraMode}
            onOpenMenu={(menu) => {
              if (menu === 'pause' || menu === 'settings') setActiveModal('settings');
              else if (menu === 'inventory') setActiveModal('inventory');
              else if (menu === 'crafting') setActiveModal('crafting');
              else if (menu === 'shop') setActiveModal('shop');
              else if (menu === 'map') setActiveModal('map');
              else if (menu === 'quests') setActiveModal('quests');
            }}
            onSelectHotbarSlot={(slot) => {
              setSelectedHotbarSlot(slot);
              engineRef.current?.onHotbarUse?.(slot);
            }}
            onInteract={() => {}}
          />
        )}

        {/* Modals */}
        {activeModal === 'settings' && (
          <SettingsModal
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onClose={() => setActiveModal(null)}
            onResetProgress={() => setProgress(DEFAULT_PROGRESS)}
            onReturnToTitle={() => {
              setIsInGame(false);
              setActiveModal(null);
            }}
          />
        )}

        {activeModal === 'inventory' && (
          <InventoryModal
            inventory={inventory}
            userProfile={profile}
            equipped={equipped}
            playerStats={playerStats}
            hotbar={hotbar}
            onUseItem={(itemId) => {
              const item = inventory.find((i) => i.id === itemId);
              if (item && item.healAmount && engineRef.current) {
                engineRef.current.player.heal(item.healAmount);
                setInventory((inv) =>
                  inv.map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i)).filter((i) => i.quantity > 0)
                );
              }
            }}
            onEquipItem={(itemId, slot) => {
              setEquipped((eq) => ({ ...eq, [slot]: itemId }));
            }}
            onUnequipItem={(slot) => {
              setEquipped((eq) => ({ ...eq, [slot]: null }));
            }}
            onAssignHotbar={(itemId, slotIndex) => {
              setHotbar((hb) => {
                const next = [...hb];
                next[slotIndex] = itemId;
                return next;
              });
            }}
            onDiscardItem={(itemId) => {
              setInventory((inv) =>
                inv.map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i)).filter((i) => i.quantity > 0)
              );
            }}
            onOpenCrafting={() => setActiveModal('crafting')}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'crafting' && (
          <CraftingModal
            inventory={inventory}
            onCraftRecipe={handleCraftRecipe}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'shop' && (
          <ShopModal
            userProfile={profile}
            inventory={inventory}
            anchorCount={progress.activatedAnchors.length}
            onBuyItem={(item, cost) => {
              setProfile((p) => ({ ...p, coins: p.coins - cost }));
              setInventory((inv) => {
                const existing = inv.find((i) => i.id === item.id);
                if (existing) {
                  return inv.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
                }
                return [...inv, { ...item, quantity: 1 }];
              });
            }}
            onSellItem={(itemId, qty, earnings) => {
              setProfile((p) => ({ ...p, coins: p.coins + earnings }));
              setInventory((inv) =>
                inv.map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - qty } : i)).filter((i) => i.quantity > 0)
              );
            }}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'map' && (
          <MapModal
            locations={DEFAULT_MAP_LOCATIONS}
            playerPosition={{ x: 0, z: 0 }}
            onClose={() => setActiveModal(null)}
            onSelectLocation={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'dimensions' && (
          <DimensionsModal
            unlockedDimensions={profile.unlockedDimensions}
            currentDimension={progress.currentDimension}
            onSelectDimension={(dimId) => {
              setProgress((p) => ({ ...p, currentDimension: dimId }));
              setActiveModal(null);
            }}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'journal' && (
          <JournalModal
            progress={progress}
            anchors={[]}
            fragments={[]}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'credits' && (
          <CreditsModal onClose={() => setActiveModal(null)} />
        )}

        {activeModal === 'sector_select' && (
          <SectorSelectModal
            userProfile={profile}
            progress={progress}
            onUpdateProfile={(updated) => setProfile(updated)}
            onSelectSectorAndLaunch={(sectorId) => {
              setProfile((p) => ({ ...p, selectedSector: sectorId }));
              setIsInGame(true);
              setActiveModal(null);
            }}
            onBackToTitle={() => setActiveModal(null)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
export default App;
