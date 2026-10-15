/**
 * THE DRIFTING LAND - Complete Master Game Application
 * An open-world 3D sci-fi exploration and survival game.
 * First-person perspective, procedural living world, survival vitals,
 * harvesting, crafting, hostile creatures, quests, economy, and mobile controls.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { CraftingModal } from './components/CraftingModal';
import { MapModal } from './components/MapModal';
import { QuestsModal } from './components/QuestsModal';
import { ShopModal } from './components/ShopModal';
import { JournalModal } from './components/JournalModal';
import { SettingsModal } from './components/SettingsModal';
import { DialogueModal } from './components/DialogueModal';
import { SectorSelectModal, SECTORS } from './components/SectorSelectModal';
import { DimensionsModal } from './components/DimensionsModal';
import { CreditsModal } from './components/CreditsModal';
import { TitleScreen } from './components/TitleScreen';
import { LevelLoadingScreen } from './components/LevelLoadingScreen';
import { OrientationLockModal } from './components/OrientationLockModal';
import {
  loadProgress,
  saveProgress,
  clearProgress,
  loadSettings,
  saveSettings,
  loadUserProfile,
  saveUserProfile,
  INITIAL_PROGRESS,
} from './game/storage';
import { ITEM_DATABASE, INITIAL_HOTBAR_IDS, INITIAL_INVENTORY_ITEMS, INITIAL_EQUIPPED_SLOTS } from './game/itemDatabase';
import { QuestManager } from './game/quests';
import { MapSystem, MapLocation } from './game/mapSystem';
import { soundSystem } from './game/audio';
import {
  GameProgress,
  GameSettings,
  UserProfile,
  PlayerStats,
  TelemetryData,
  WorldClockData,
  DialogueNode,
  DialogueOption,
  CraftingRecipe,
  EquipmentSlot,
  InventoryItem,
  SectorInfo,
} from './game/types';
import { ChevronUp, Zap, Sparkles, Sword } from 'lucide-react';

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const questManagerRef = useRef<QuestManager>(new QuestManager());
  const mapSystemRef = useRef<MapSystem>(new MapSystem());

  // Game LifeCycle States
  const [inTitleScreen, setInTitleScreen] = useState<boolean>(true);
  const [isLoadingLevel, setIsLoadingLevel] = useState<boolean>(false);
  const [currentSector, setCurrentSector] = useState<SectorInfo>(SECTORS[0]);
  const [currentDimension, setCurrentDimension] = useState<number>(1);
  const [unlockedDimensions, setUnlockedDimensions] = useState<number[]>([1, 2, 3]);

  // Player & Progression State
  const [progress, setProgress] = useState<GameProgress>(() => loadProgress());
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());

  // Active Modals & Dialogs
  const [activeModal, setActiveModal] = useState<
    null | 'inventory' | 'crafting' | 'map' | 'quests' | 'shop' | 'journal' | 'settings' | 'sectorSelect' | 'dimensions' | 'credits' | 'pause'
  >(null);
  const [activeDialogue, setActiveDialogue] = useState<DialogueNode | null>(null);
  const [activeInscription, setActiveInscription] = useState<{ title: string; text: string } | null>(null);

  // Live Gameplay Telemetry
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    speedMultiplier: 1.0,
    fallDamageReduction: 0.0,
    staminaRegenRate: 16.0,
    isSprinting: false,
    isExhausted: false,
    locationName: 'Observation Dais',
    coordinates: [0, 4.2, 0],
    environmentalStatus: 'Pressurized Stratosphere',
    hazardLevel: 'safe',
  });

  const [telemetry, setTelemetry] = useState<TelemetryData>({
    headingDegrees: 0,
    temperatureCelsius: 18,
    elevationMeters: 1420,
    timeOfDay: 'day',
    timeLabel: 'SOLAR CYCLE: MIDDAY',
  });

  const [worldClock, setWorldClock] = useState<WorldClockData>({
    dayNumber: 1,
    inGameTime: '12:00',
    period: 'Day',
    nextTransitionLabel: 'Sunset in 06:40',
    weatherCondition: 'Clear Stratosphere',
    dayProgress: 0.5,
  });

  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ title: string; subtitle: string; icon?: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [selectedHotbarSlot, setSelectedHotbarSlot] = useState<number>(0);
  const [damageFlash, setDamageFlash] = useState<boolean>(false);
  const [respawnAlpha, setRespawnAlpha] = useState<number>(0);

  // Mobile Touch Controls
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  const touchJoystickRef = useRef<{ active: boolean; startX: number; startY: number; currentX: number; currentY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const touchLookRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });
  const [joystickPos, setJoystickPos] = useState<{ x: number; y: number } | null>(null);

  // Initialize Engine when container mounts
  useEffect(() => {
    if (!containerRef.current || engineRef.current) return;

    // Detect mobile touch
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);

    const initialSettings: GameSettings = {
      ...settings,
      cameraMode: 'first_person', // Ensure first-person default
    };

    const engine = new GameEngine(containerRef.current, initialSettings);
    engineRef.current = engine;

    // Apply saved progress (anchors, fragments)
    engine.restoreProgress(
      progress.activatedAnchors,
      progress.collectedFragments,
      progress.resonanceDiscovered
    );

    // Callbacks from GameEngine
    engine.onStatsUpdate = (stats) => {
      setPlayerStats(stats);
    };

    engine.onTelemetryUpdate = (data) => {
      setTelemetry(data);
      if (engine.world) {
        setWorldClock(engine.world.clockData);
      }
    };

    engine.onDamageEffect = (_amount) => {
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 260);
    };

    engine.onRespawnEffect = (alpha) => {
      setRespawnAlpha(alpha);
    };

    engine.onLootAcquired = (itemId, count) => {
      addItemToInventory(itemId, count);
    };

    // Interaction system callbacks
    engine.interactions.onStateChange = (state) => {
      setInteractionPrompt(state.currentPrompt ? state.currentPrompt.prompt : null);
      setActiveDialogue(state.activeDialogue);
      setActiveInscription(state.activeInscription);
      setToastMessage(state.bannerToast);
    };

    engine.interactions.onAnchorAttuned = (anchorId) => {
      setProgress((prev) => {
        if (prev.activatedAnchors.includes(anchorId)) return prev;
        const updated = {
          ...prev,
          activatedAnchors: [...prev.activatedAnchors, anchorId],
        };
        saveProgress(updated);
        return updated;
      });
      setUserProfile((prev) => {
        const updated = { ...prev, xp: prev.xp + 450, coins: prev.coins + 150 };
        saveUserProfile(updated);
        return updated;
      });
    };

    engine.interactions.onFragmentFound = (fragmentId) => {
      setProgress((prev) => {
        if (prev.collectedFragments.includes(fragmentId)) return prev;
        const updated = {
          ...prev,
          collectedFragments: [...prev.collectedFragments, fragmentId],
        };
        saveProgress(updated);
        return updated;
      });
      setUserProfile((prev) => {
        const updated = { ...prev, xp: prev.xp + 250, coins: prev.coins + 75 };
        saveUserProfile(updated);
        return updated;
      });
    };

    engine.interactions.onPlantHarvested = (itemId, count) => {
      addItemToInventory(itemId, count);
    };

    engine.interactions.onCheckpointActivated = (cp) => {
      mapSystemRef.current.discoverLocation(cp.id);
      setProgress((prev) => {
        if (prev.activatedCheckpoints?.includes(cp.id)) return prev;
        const updated = {
          ...prev,
          activatedCheckpoints: [...(prev.activatedCheckpoints || []), cp.id],
          lastCheckpoint: cp.position,
        };
        saveProgress(updated);
        return updated;
      });
    };

    // Keyboard shortcut handlers hooked through engine
    engine.onOpenInventory = () => setActiveModal((prev) => (prev === 'inventory' ? null : 'inventory'));
    engine.onOpenCrafting = () => setActiveModal((prev) => (prev === 'crafting' ? null : 'crafting'));
    engine.onOpenMap = () => setActiveModal((prev) => (prev === 'map' ? null : 'map'));
    engine.onOpenQuests = () => setActiveModal((prev) => (prev === 'quests' ? null : 'quests'));
    engine.onHotbarUse = (slotIndex) => handleUseHotbarSlot(slotIndex);

    // Initial first-person camera mode application
    engine.player.setCameraMode('first_person');

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Inventory Helper: Add item or increase count
  const addItemToInventory = useCallback((itemId: string, count: number = 1) => {
    setProgress((prev) => {
      const inv = [...prev.inventory];
      const existingIdx = inv.findIndex((i) => i.id === itemId);

      if (existingIdx >= 0) {
        inv[existingIdx] = {
          ...inv[existingIdx],
          quantity: inv[existingIdx].quantity + count,
        };
      } else {
        const dbItem = ITEM_DATABASE[itemId];
        if (dbItem) {
          inv.push({
            ...dbItem,
            quantity: count,
          });
        } else {
          inv.push({
            id: itemId,
            name: itemId.replace(/-/g, ' ').toUpperCase(),
            description: 'Rare exploration specimen.',
            category: 'resources',
            rarity: 'uncommon',
            quantity: count,
            valueCoins: 45,
            icon: 'sparkles',
          });
        }
      }

      const updated = { ...prev, inventory: inv };
      saveProgress(updated);
      return updated;
    });

    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 600);
  }, []);

  // Consume or use an item
  const handleUseItem = useCallback((itemId: string) => {
    const item = progress.inventory.find((i) => i.id === itemId);
    if (!item) return;

    if (item.healAmount || item.category === 'food_recovery') {
      const heal = item.healAmount || 35;
      const stamina = item.staminaAmount || 45;
      engineRef.current?.player.heal(heal);
      engineRef.current?.player.restoreStamina(stamina);
      soundSystem.playHeal();
      engineRef.current?.interactions.showToast('VITALITY RESTORED', `Recovered +${heal} Health & +${stamina} Stamina.`);
    }

    // Decrement item
    setProgress((prev) => {
      const inv = prev.inventory
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0);

      const updated = { ...prev, inventory: inv };
      saveProgress(updated);
      return updated;
    });
  }, [progress.inventory]);

  // Equip / Unequip gear
  const handleEquipItem = useCallback((itemId: string, slot: EquipmentSlot) => {
    const item = progress.inventory.find((i) => i.id === itemId);
    if (!item) return;

    setProgress((prev) => {
      const updatedEquipped = {
        ...prev.equipped,
        [slot]: itemId,
      };
      const updated = { ...prev, equipped: updatedEquipped };
      saveProgress(updated);
      return updated;
    });

    soundSystem.playEquipItem();
    engineRef.current?.interactions.showToast('GEAR EQUIPPED', `${item.name} slotted to ${slot}.`);

    // Recalculate player stats from equipment
    if (item.stats) {
      if (item.stats.maxHealthBonus) {
        engineRef.current!.player.maxHealth = 100 + item.stats.maxHealthBonus;
      }
      if (item.stats.speedMultiplier) {
        engineRef.current!.player.speedMultiplier = item.stats.speedMultiplier;
      }
      if (item.stats.fallDamageReduction) {
        engineRef.current!.player.fallDamageReduction = item.stats.fallDamageReduction;
      }
    }
  }, [progress.inventory]);

  const handleUnequipItem = useCallback((slot: EquipmentSlot) => {
    setProgress((prev) => {
      const updatedEquipped = {
        ...prev.equipped,
        [slot]: null,
      };
      const updated = { ...prev, equipped: updatedEquipped };
      saveProgress(updated);
      return updated;
    });
    soundSystem.playEquipItem();
  }, []);

  const safeHotbar: (string | null)[] = progress.hotbar || INITIAL_HOTBAR_IDS;
  const safeEquipped: Record<EquipmentSlot, string | null> = {
    tool: progress.equipped?.tool || INITIAL_EQUIPPED_SLOTS.tool || null,
    protective: progress.equipped?.protective || INITIAL_EQUIPPED_SLOTS.protective || null,
    exploration: progress.equipped?.exploration || INITIAL_EQUIPPED_SLOTS.exploration || null,
    utility: progress.equipped?.utility || INITIAL_EQUIPPED_SLOTS.utility || null,
    relic: progress.equipped?.relic || INITIAL_EQUIPPED_SLOTS.relic || null,
    artifact: progress.equipped?.artifact || INITIAL_EQUIPPED_SLOTS.artifact || null,
  };
  const safeInventory: InventoryItem[] = progress.inventory || INITIAL_INVENTORY_ITEMS;

  // Hotbar Slot Use
  const handleUseHotbarSlot = useCallback((slotIndex: number) => {
    setSelectedHotbarSlot(slotIndex);
    const itemId = safeHotbar[slotIndex];
    if (itemId) {
      handleUseItem(itemId);
    } else {
      // Execute primary weapon/tool swing
      engineRef.current?.player.performAttack();
    }
  }, [safeHotbar, handleUseItem]);

  // Crafting Handler
  const handleCraftRecipe = useCallback((recipe: CraftingRecipe) => {
    setProgress((prev) => {
      let inv = [...prev.inventory];

      // Deduct materials
      recipe.materials.forEach((req) => {
        const target = inv.find((i) => i.id === req.itemId);
        if (target) {
          target.quantity -= req.count;
        }
      });
      inv = inv.filter((i) => i.quantity > 0);

      // Add result item
      const existingResult = inv.find((i) => i.id === recipe.resultItem.id);
      if (existingResult) {
        existingResult.quantity += recipe.resultCount;
      } else {
        inv.push({
          ...recipe.resultItem,
          quantity: recipe.resultCount,
        });
      }

      const updated = { ...prev, inventory: inv };
      saveProgress(updated);
      return updated;
    });

    soundSystem.playCraftSuccess();
    engineRef.current?.interactions.showToast('FABRICATION COMPLETE', `Crafted ${recipe.name} (+${recipe.resultCount}).`);
  }, []);

  // Shop Buy/Sell Handlers
  const handleBuyItem = useCallback((item: InventoryItem, cost: number) => {
    if (userProfile.coins < cost) return;

    setUserProfile((prev) => {
      const updated = { ...prev, coins: prev.coins - cost };
      saveUserProfile(updated);
      return updated;
    });

    addItemToInventory(item.id, 1);
    soundSystem.playCraftSuccess();
  }, [userProfile.coins, addItemToInventory]);

  const handleSellItem = useCallback((itemId: string, quantity: number, earnings: number) => {
    setProgress((prev) => {
      const inv = prev.inventory
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - quantity } : i))
        .filter((i) => i.quantity > 0);
      const updated = { ...prev, inventory: inv };
      saveProgress(updated);
      return updated;
    });

    setUserProfile((prev) => {
      const updated = { ...prev, coins: prev.coins + earnings };
      saveUserProfile(updated);
      return updated;
    });

    soundSystem.playHarvestTone();
  }, []);

  // Update Settings
  const handleUpdateSettings = useCallback((newSettings: GameSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    if (engineRef.current) {
      engineRef.current.applyQualitySettings(newSettings.graphicsQuality);
      engineRef.current.setSensitivity(newSettings.sensitivity);
    }
  }, []);

  // Launch Sector Level
  const handleSelectSectorAndLaunch = useCallback((sectorId: number) => {
    const target = SECTORS.find((s) => s.id === sectorId) || SECTORS[0];
    setCurrentSector(target);
    setIsLoadingLevel(true);
    setActiveModal(null);
  }, []);

  const handleLevelLoadingComplete = useCallback(() => {
    setIsLoadingLevel(false);
    setInTitleScreen(false);
    if (engineRef.current) {
      engineRef.current.player.position.set(currentSector.spawnPoint[0], currentSector.spawnPoint[1], currentSector.spawnPoint[2]);
      engineRef.current.player.lastCheckpoint.set(currentSector.spawnPoint[0], currentSector.spawnPoint[1], currentSector.spawnPoint[2]);
      engineRef.current.resume();
    }
  }, [currentSector]);

  // Touch Virtual Joystick Handlers
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchJoystickRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
    };
    setJoystickPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    if (!touchJoystickRef.current.active) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchJoystickRef.current.startX;
    const dy = touch.clientY - touchJoystickRef.current.startY;
    const maxRadius = 45;
    const distance = Math.min(maxRadius, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);

    const normX = (Math.cos(angle) * distance) / maxRadius;
    const normY = (Math.sin(angle) * distance) / maxRadius;

    if (engineRef.current) {
      engineRef.current.player.input.moveForward = -normY;
      engineRef.current.player.input.moveRight = normX;
    }
  };

  const handleJoystickTouchEnd = () => {
    touchJoystickRef.current.active = false;
    setJoystickPos(null);
    if (engineRef.current) {
      engineRef.current.player.input.moveForward = 0;
      engineRef.current.player.input.moveRight = 0;
    }
  };

  // Touch Camera Look Handlers (Right side of screen)
  const handleLookTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchLookRef.current = {
      active: true,
      lastX: touch.clientX,
      lastY: touch.clientY,
    };
  };

  const handleLookTouchMove = (e: React.TouchEvent) => {
    if (!touchLookRef.current.active) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchLookRef.current.lastX;
    const dy = touch.clientY - touchLookRef.current.lastY;

    if (engineRef.current) {
      engineRef.current.player.applyLookDelta(dx, dy, true);
    }

    touchLookRef.current.lastX = touch.clientX;
    touchLookRef.current.lastY = touch.clientY;
  };

  const handleLookTouchEnd = () => {
    touchLookRef.current.active = false;
  };

  // Convert progress hotbar to items
  const hotbarDisplayItems = safeHotbar.map((itemId) => {
    if (!itemId) return null;
    const item = safeInventory.find((i) => i.id === itemId);
    if (!item) return null;
    return {
      id: item.id,
      name: item.name,
      count: item.quantity,
      icon: item.icon === 'sparkles' ? '✨' : item.icon === 'shield' ? '🛡️' : item.icon === 'gem' ? '💎' : '📦',
    };
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#070b14] text-slate-100 select-none touch-none">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* Damage Hurt Vignette Effect */}
      {damageFlash && (
        <div className="absolute inset-0 pointer-events-none z-30 bg-red-600/25 border-4 border-red-500/60 animate-pulse transition-opacity duration-150" />
      )}

      {/* Respawn Blackout Transition */}
      {respawnAlpha > 0.01 && (
        <div
          className="absolute inset-0 pointer-events-none z-40 bg-black flex flex-col items-center justify-center transition-opacity"
          style={{ opacity: respawnAlpha }}
        >
          <div className="text-cyan-400 font-['Cinzel'] text-2xl tracking-[0.2em] animate-pulse">
            RE-ANCHORING CONSCIOUSNESS
          </div>
          <div className="text-slate-400 text-xs font-mono mt-2">Harmonizing with nearest checkpoint...</div>
        </div>
      )}

      {/* Active Toast Notification */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 border border-teal-400/40 px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <div className="text-[10px] font-mono tracking-widest uppercase text-teal-400">{toastMessage.title}</div>
            <div className="text-xs font-bold text-white">{toastMessage.subtitle}</div>
          </div>
        </div>
      )}

      {/* Title Screen */}
      {inTitleScreen && (
        <TitleScreen
          onStartGame={() => {
            setInTitleScreen(false);
            engineRef.current?.resume();
          }}
          onNewGame={() => {
            const fresh = clearProgress();
            setProgress(fresh);
            setInTitleScreen(false);
            engineRef.current?.restoreProgress([], [], false);
            engineRef.current?.resume();
          }}
          onOpenSectorSelect={() => setActiveModal('sectorSelect')}
          onOpenDimensions={() => setActiveModal('dimensions')}
          onOpenQuests={() => setActiveModal('quests')}
          onOpenInventory={() => setActiveModal('inventory')}
          onOpenShop={() => setActiveModal('shop')}
          onOpenSettings={() => setActiveModal('settings')}
          onOpenJournal={() => setActiveModal('journal')}
          onOpenCredits={() => setActiveModal('credits')}
          onResetProgress={() => {
            const fresh = clearProgress();
            setProgress(fresh);
          }}
          progress={progress}
        />
      )}

      {/* Level Loading Transition */}
      {isLoadingLevel && (
        <LevelLoadingScreen
          destinationSector={currentSector}
          onLoadingComplete={handleLevelLoadingComplete}
        />
      )}

      {/* In-Game HUD Interface */}
      {!inTitleScreen && !isLoadingLevel && (
        <HUD
          health={playerStats.health}
          maxHealth={playerStats.maxHealth}
          stamina={playerStats.stamina}
          maxStamina={playerStats.maxStamina}
          currency={userProfile.coins}
          dayNumber={worldClock.dayNumber}
          worldTime={worldClock.inGameTime}
          timeToSunset={worldClock.nextTransitionLabel}
          currentLocation={playerStats.locationName}
          currentObjective={`Attune Quantum Anchors (${progress.activatedAnchors.length}/3)`}
          hotbarItems={hotbarDisplayItems}
          selectedHotbarSlot={selectedHotbarSlot}
          contextPrompt={interactionPrompt}
          activeEvent={telemetry.timeOfDay === 'red_moon' ? 'Crimson Red Moon' : null}
          saveStatus={saveStatus}
          cameraMode="First Person"
          onOpenMenu={(menuName) => setActiveModal(menuName as any)}
          onSelectHotbarSlot={(slot) => handleUseHotbarSlot(slot)}
          onInteract={() => engineRef.current?.interactions.triggerCurrentInteract()}
          isHUDHidden={Boolean(activeModal || activeDialogue || activeInscription)}
        />
      )}

      {/* Mobile Touch Controls Layer */}
      {isTouchDevice && !inTitleScreen && !isLoadingLevel && !activeModal && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Left Side: Virtual Movement Joystick */}
          <div
            className="absolute bottom-8 left-8 w-36 h-36 rounded-full border border-teal-400/20 bg-black/30 backdrop-blur-sm pointer-events-auto flex items-center justify-center touch-none"
            onTouchStart={handleJoystickTouchStart}
            onTouchMove={handleJoystickTouchMove}
            onTouchEnd={handleJoystickTouchEnd}
          >
            <div className="w-14 h-14 rounded-full bg-teal-500/40 border border-teal-300/60 shadow-lg flex items-center justify-center">
              <span className="text-[10px] font-bold font-mono text-teal-200">MOVE</span>
            </div>
          </div>

          {/* Right Side: Touch Look Camera Trackpad */}
          <div
            className="absolute top-24 bottom-24 right-0 w-1/2 pointer-events-auto touch-none"
            onTouchStart={handleLookTouchStart}
            onTouchMove={handleLookTouchMove}
            onTouchEnd={handleLookTouchEnd}
          />

          {/* Bottom Right: Touch Action Buttons */}
          <div className="absolute bottom-8 right-8 flex gap-3 pointer-events-auto">
            {/* Sprint Toggle */}
            <button
              onClick={() => {
                if (engineRef.current) {
                  engineRef.current.player.input.sprint = !engineRef.current.player.input.sprint;
                }
              }}
              className="w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-400/40 text-cyan-200 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer"
            >
              <Zap className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-0.5">Sprint</span>
            </button>

            {/* Jump Button */}
            <button
              onClick={() => {
                if (engineRef.current) {
                  engineRef.current.player.input.jump = true;
                }
              }}
              className="w-14 h-14 rounded-2xl bg-teal-950/80 border border-teal-400/40 text-teal-200 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer"
            >
              <ChevronUp className="w-6 h-6" />
              <span className="text-[8px] font-bold uppercase">Jump</span>
            </button>

            {/* Strike / Tool Action Button */}
            <button
              onClick={() => {
                if (engineRef.current) {
                  engineRef.current.player.performAttack();
                }
              }}
              className="w-14 h-14 rounded-2xl bg-amber-950/80 border border-amber-400/50 text-amber-200 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer"
            >
              <Sword className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-0.5">Strike</span>
            </button>
          </div>
        </div>
      )}

      {/* In-Game Modals */}
      {activeModal === 'inventory' && (
        <InventoryModal
          inventory={safeInventory}
          userProfile={userProfile}
          equipped={safeEquipped}
          playerStats={playerStats}
          hotbar={safeHotbar}
          onUseItem={handleUseItem}
          onEquipItem={handleEquipItem}
          onUnequipItem={handleUnequipItem}
          onAssignHotbar={(itemId, slotIndex) => {
            setProgress((prev) => {
              const hb = [...(prev.hotbar || INITIAL_HOTBAR_IDS)];
              hb[slotIndex] = itemId;
              const updated = { ...prev, hotbar: hb };
              saveProgress(updated);
              return updated;
            });
          }}
          onDiscardItem={(itemId) => {
            setProgress((prev) => {
              const inv = prev.inventory.filter((i) => i.id !== itemId);
              const updated = { ...prev, inventory: inv };
              saveProgress(updated);
              return updated;
            });
          }}
          onOpenCrafting={() => setActiveModal('crafting')}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'crafting' && (
        <CraftingModal
          inventory={progress.inventory}
          onCraftRecipe={handleCraftRecipe}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'map' && (
        <MapModal
          locations={mapSystemRef.current.locations}
          playerPosition={{ x: playerStats.coordinates[0], z: playerStats.coordinates[2] }}
          onSelectLocation={(loc) => {
            engineRef.current?.interactions.showToast('WAYPOINT MARKED', `Beacon locked on ${loc.name}.`);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'quests' && (
        <QuestsModal
          quests={questManagerRef.current.quests}
          onSelectActiveQuest={(id) => {
            const q = questManagerRef.current.quests.find((x) => x.id === id);
            if (q) {
              engineRef.current?.interactions.showToast('QUEST TRACKED', q.name);
            }
            setActiveModal(null);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'shop' && (
        <ShopModal
          userProfile={userProfile}
          inventory={progress.inventory}
          timeOfDay={telemetry.timeOfDay}
          anchorCount={progress.activatedAnchors.length}
          onBuyItem={handleBuyItem}
          onSellItem={handleSellItem}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'journal' && (
        <JournalModal
          progress={progress}
          anchors={engineRef.current?.world.anchors || []}
          fragments={engineRef.current?.world.fragments || []}
          checkpoints={engineRef.current?.world.checkpoints || []}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={() => {
            const fresh = clearProgress();
            setProgress(fresh);
            engineRef.current?.restoreProgress([], [], false);
            setActiveModal(null);
          }}
          onReturnToTitle={() => {
            setActiveModal(null);
            setInTitleScreen(true);
            engineRef.current?.pause();
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'sectorSelect' && (
        <SectorSelectModal
          userProfile={userProfile}
          progress={progress}
          onUpdateProfile={(updated) => {
            setUserProfile(updated);
            saveUserProfile(updated);
          }}
          onSelectSectorAndLaunch={handleSelectSectorAndLaunch}
          onBackToTitle={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'dimensions' && (
        <DimensionsModal
          unlockedDimensions={unlockedDimensions}
          currentDimension={currentDimension}
          onSelectDimension={(dimId) => {
            setCurrentDimension(dimId);
            engineRef.current?.interactions.showToast('REALM SHIFT', `Resonance tuned to Dimension ${dimId}.`);
            setActiveModal(null);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'credits' && (
        <CreditsModal onClose={() => setActiveModal(null)} />
      )}

      {/* Pause Menu Overlay */}
      {activeModal === 'pause' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-xs w-full bg-slate-900 border border-teal-500/40 rounded-3xl p-6 text-center space-y-3 font-['Share_Tech_Mono',monospace]">
            <h3 className="font-['Cinzel'] text-xl font-bold text-white mb-4">EXPEDITION PAUSED</h3>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Resume Journey
            </button>
            <button
              onClick={() => setActiveModal('settings')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Settings & Audio
            </button>
            <button
              onClick={() => {
                saveProgress(progress);
                setSaveStatus('saved');
                engineRef.current?.interactions.showToast('SAVED', 'Expedition log updated.');
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Save Game
            </button>
            <button
              onClick={() => {
                setActiveModal(null);
                setInTitleScreen(true);
                engineRef.current?.pause();
              }}
              className="w-full py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-500/30 text-red-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Title Screen
            </button>
          </div>
        </div>
      )}

      {/* Dialogue Modal */}
      {activeDialogue && (
        <DialogueModal
          dialogue={activeDialogue}
          onOptionSelect={(_option) => {
            // Options handle rewards and dialogue progression
          }}
          onClose={() => {
            engineRef.current?.interactions.closeDialogue();
          }}
        />
      )}

      {/* Ancient Inscription Modal */}
      {activeInscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-['Share_Tech_Mono',monospace]">
          <div className="max-w-md w-full bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 text-slate-200 relative shadow-2xl">
            <div className="text-[10px] tracking-[0.25em] text-cyan-400 uppercase mb-1">ANCIENT INSCRIPTION</div>
            <h3 className="font-['Cinzel'] text-lg font-bold text-white mb-3">{activeInscription.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans mb-6">{activeInscription.text}</p>
            <button
              onClick={() => engineRef.current?.interactions.closeInscription()}
              className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              Close Inscription
            </button>
          </div>
        </div>
      )}

      {/* Orientation Lock Prompt for mobile devices */}
      <OrientationLockModal />
    </div>
  );
}

export default App;
