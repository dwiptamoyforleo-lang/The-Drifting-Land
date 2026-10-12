/**
 * THE DRIFTING LAND - Main Application Root
 * Integrated with complete camera modes, keyboard shortcuts (V, Shift, F, M, Tab/I, J, Esc),
 * and touchscreen mobile controls.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GameEngine } from './game/engine';
import {
  GameProgress,
  GameSettings,
  InteractableObject,
  PerformanceStats,
  TelemetryData,
  MagicalAnchor,
  WorldFragment,
  WorldCheckpoint,
  DialogueNode,
  DialogueOption,
  UserProfile,
  PlayerStats,
  EquipmentSlot,
  CraftingRecipe,
  InventoryItem,
} from './game/types';
import {
  loadProgress,
  saveProgress,
  clearProgress,
  loadSettings,
  saveSettings,
  loadUserProfile,
  saveUserProfile,
} from './game/storage';
import { ITEM_DATABASE } from './game/itemDatabase';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { SettingsModal } from './components/SettingsModal';
import { JournalModal } from './components/JournalModal';
import { OrientationLockModal } from './components/OrientationLockModal';
import { SectorSelectModal, SECTORS } from './components/SectorSelectModal';
import { QuestsModal, INITIAL_QUESTS } from './components/QuestsModal';
import { DimensionsModal } from './components/DimensionsModal';
import { InventoryModal } from './components/InventoryModal';
import { CraftingModal } from './components/CraftingModal';
import { ShopModal } from './components/ShopModal';
import { CreditsModal } from './components/CreditsModal';
import { LevelLoadingScreen } from './components/LevelLoadingScreen';
import { DialogueModal } from './components/DialogueModal';
import { MapModal } from './components/MapModal';
import { soundSystem } from './game/audio';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showJournal, setShowJournal] = useState<boolean>(false);
  const [showSectorSelect, setShowSectorSelect] = useState<boolean>(false);
  const [showDimensions, setShowDimensions] = useState<boolean>(false);
  const [showQuests, setShowQuests] = useState<boolean>(false);
  const [showInventory, setShowInventory] = useState<boolean>(false);
  const [showCrafting, setShowCrafting] = useState<boolean>(false);
  const [showShop, setShowShop] = useState<boolean>(false);
  const [showCredits, setShowCredits] = useState<boolean>(false);
  const [showMap, setShowMap] = useState<boolean>(false);
  const [isLoadingLevel, setIsLoadingLevel] = useState<boolean>(false);
  const [loadingDestination, setLoadingDestination] = useState<typeof SECTORS[0]>(SECTORS[0]);

  const [playerStats, setPlayerStats] = useState<PlayerStats | undefined>(undefined);
  const [damageAlpha, setDamageAlpha] = useState<number>(0);

  const [quests, setQuests] = useState<typeof INITIAL_QUESTS>(INITIAL_QUESTS);
  const [currentDimension, setCurrentDimension] = useState<number>(1);
  const [unlockedDimensions, setUnlockedDimensions] = useState<number[]>([1, 2, 3]);

  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [progress, setProgress] = useState<GameProgress>(loadProgress);
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile);

  const [currentPrompt, setCurrentPrompt] = useState<InteractableObject | null>(null);
  const [activeInscription, setActiveInscription] = useState<{ title: string; text: string } | null>(null);
  const [bannerToast, setBannerToast] = useState<{ title: string; subtitle: string; icon?: string } | null>(null);
  const [respawnAlpha, setRespawnAlpha] = useState<number>(0);
  const [stats, setStats] = useState<PerformanceStats>({ fps: 60, drawCalls: 0, triangles: 0 });
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    headingDegrees: 140,
    temperatureCelsius: 18.4,
    elevationMeters: 1420,
    timeOfDay: 'sunset',
    timeLabel: 'SOLAR CYCLE: AMBER TWILIGHT',
  });

  const [worldAnchors, setWorldAnchors] = useState<MagicalAnchor[]>([]);
  const [worldFragments, setWorldFragments] = useState<WorldFragment[]>([]);
  const [worldCheckpoints, setWorldCheckpoints] = useState<WorldCheckpoint[]>([]);
  const [activeDialogue, setActiveDialogue] = useState<DialogueNode | null>(null);

  const handleHotbarUseRef = useRef<(slotIndex: number) => void>(() => {});

  // Damage vignette decay effect
  useEffect(() => {
    if (damageAlpha <= 0) return;
    const timer = setInterval(() => {
      setDamageAlpha((prev) => Math.max(0, prev - 0.08));
    }, 40);
    return () => clearInterval(timer);
  }, [damageAlpha]);

  const applyEquipmentStatsToPlayer = useCallback(
    (equippedSlots: Record<EquipmentSlot, string | null>, currentInv: InventoryItem[]) => {
      if (!engineRef.current) return;
      const statsList = Object.values(equippedSlots)
        .filter((id): id is string => Boolean(id))
        .map((id) => currentInv.find((i) => i.id === id)?.stats);
      engineRef.current.player.applyEquipmentStats(statsList);
    },
    []
  );

  const handleUseItem = useCallback(
    (itemId: string) => {
      const item = (progress.inventory || []).find((i) => i.id === itemId);
      if (!item) return;

      if (engineRef.current) {
        if (item.healAmount) {
          engineRef.current.player.heal(item.healAmount);
        }
        if (item.staminaAmount) {
          engineRef.current.player.restoreStamina(item.staminaAmount);
        }
        engineRef.current.interactions.showToast(
          'ITEM CONSUMED',
          `Used ${item.name}. ${item.healAmount ? `+${item.healAmount} HP ` : ''}${
            item.staminaAmount ? `+${item.staminaAmount} Stamina` : ''
          }`
        );
      }

      setProgress((prev) => {
        const updatedInv = prev.inventory
          .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
          .filter((i) => i.quantity > 0);
        const next = { ...prev, inventory: updatedInv };
        saveProgress(next);
        return next;
      });
    },
    [progress.inventory]
  );

  const handleEquipItem = useCallback(
    (itemId: string, slot: EquipmentSlot) => {
      const item = (progress.inventory || []).find((i) => i.id === itemId);
      if (!item) return;

      setProgress((prev) => {
        const nextEquipped = {
          ...(prev.equipped || {}),
          [slot]: itemId,
        };
        applyEquipmentStatsToPlayer(nextEquipped as Record<EquipmentSlot, string | null>, prev.inventory);
        const next = { ...prev, equipped: nextEquipped };
        saveProgress(next);
        return next;
      });

      if (engineRef.current) {
        engineRef.current.interactions.showToast(
          'EQUIPMENT LOADED',
          `Equipped ${item.name} to [${slot.toUpperCase()}]`
        );
      }
    },
    [progress.inventory, applyEquipmentStatsToPlayer]
  );

  const handleUnequipItem = useCallback(
    (slot: EquipmentSlot) => {
      setProgress((prev) => {
        const nextEquipped = {
          ...(prev.equipped || {}),
          [slot]: null,
        };
        applyEquipmentStatsToPlayer(nextEquipped as Record<EquipmentSlot, string | null>, prev.inventory);
        const next = { ...prev, equipped: nextEquipped };
        saveProgress(next);
        return next;
      });

      if (engineRef.current) {
        engineRef.current.interactions.showToast('EQUIPMENT REMOVED', `Unequipped ${slot} gear.`);
      }
    },
    [progress.inventory, applyEquipmentStatsToPlayer]
  );

  const handleAssignHotbar = useCallback((itemId: string, slotIndex: number) => {
    setProgress((prev) => {
      const nextHotbar = [...(prev.hotbar || [null, null, null, null, null, null])];
      nextHotbar[slotIndex] = itemId;
      const next = { ...prev, hotbar: nextHotbar };
      saveProgress(next);
      return next;
    });
  }, []);

  const handleHotbarUse = useCallback(
    (slotIndex: number) => {
      const itemId = (progress.hotbar || [])[slotIndex];
      if (!itemId) {
        if (engineRef.current) {
          engineRef.current.interactions.showToast('EMPTY HOTBAR SLOT', `Slot [${slotIndex + 1}] has no item assigned.`);
        }
        return;
      }
      const item = (progress.inventory || []).find((i) => i.id === itemId);
      if (!item) return;

      if (item.healAmount || item.staminaAmount || item.category === 'food_recovery' || item.category === 'consumable') {
        handleUseItem(item.id);
      } else if (item.equipmentSlot) {
        const isEquipped = (progress.equipped as Record<EquipmentSlot, string | null>)?.[item.equipmentSlot] === item.id;
        if (isEquipped) {
          handleUnequipItem(item.equipmentSlot);
        } else {
          handleEquipItem(item.id, item.equipmentSlot);
        }
      } else {
        if (engineRef.current) {
          engineRef.current.interactions.showToast(item.name, item.description);
        }
      }
    },
    [progress.hotbar, progress.inventory, progress.equipped, handleUseItem, handleEquipItem, handleUnequipItem]
  );

  useEffect(() => {
    handleHotbarUseRef.current = handleHotbarUse;
  }, [handleHotbarUse]);

  const handleCraftRecipe = useCallback((recipe: CraftingRecipe) => {
    setProgress((prev) => {
      let updatedInv = [...prev.inventory];
      recipe.materials.forEach((mat) => {
        const existing = updatedInv.find((i) => i.id === mat.itemId);
        if (existing) {
          const remaining = existing.quantity - mat.count;
          if (remaining > 0) {
            updatedInv = updatedInv.map((i) => (i.id === mat.itemId ? { ...i, quantity: remaining } : i));
          } else {
            updatedInv = updatedInv.filter((i) => i.id !== mat.itemId);
          }
        }
      });

      const existingResult = updatedInv.find((i) => i.id === recipe.resultItem.id);
      if (existingResult) {
        updatedInv = updatedInv.map((i) =>
          i.id === recipe.resultItem.id ? { ...i, quantity: i.quantity + recipe.resultCount } : i
        );
      } else {
        updatedInv = [...updatedInv, { ...recipe.resultItem, quantity: recipe.resultCount }];
      }

      const next = { ...prev, inventory: updatedInv };
      saveProgress(next);
      return next;
    });

    if (engineRef.current) {
      engineRef.current.interactions.showToast(
        'FABRICATION COMPLETE',
        `Synthesized ${recipe.resultCount}x ${recipe.resultItem.name}!`
      );
    }
  }, []);

  const handleDiscardItem = useCallback((itemId: string) => {
    setProgress((prev) => {
      const updatedInv = prev.inventory
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0);

      const nextEquipped = { ...(prev.equipped || {}) };
      Object.keys(nextEquipped).forEach((slot) => {
        if (nextEquipped[slot as EquipmentSlot] === itemId && !updatedInv.some((i) => i.id === itemId)) {
          nextEquipped[slot as EquipmentSlot] = null;
        }
      });

      const next = { ...prev, inventory: updatedInv, equipped: nextEquipped };
      saveProgress(next);
      return next;
    });
  }, []);

  const handleToggleCamera = useCallback(() => {
    if (engineRef.current) {
      const nextMode = engineRef.current.player.toggleCameraMode();
      setSettings((prev) => {
        const next = { ...prev, cameraMode: nextMode };
        saveSettings(next);
        return next;
      });
      engineRef.current.interactions.showToast(
        'Perspective Shifted',
        nextMode === 'first_person' ? '1st-Person Direct Visor' : nextMode === 'second_person' ? '2nd-Person Observer View' : '3rd-Person Orbital'
      );
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const initialSettings = loadSettings();
    const engine = new GameEngine(containerRef.current, initialSettings);
    engineRef.current = engine;

    const saved = loadProgress();
    engine.restoreProgress(
      saved.activatedAnchors,
      saved.collectedFragments,
      saved.resonanceDiscovered
    );

    setWorldAnchors([...engine.world.anchors]);
    setWorldFragments([...engine.world.fragments]);
    setWorldCheckpoints([...engine.world.checkpoints]);

    engine.onToggleCamera = handleToggleCamera;
    engine.onOpenInventory = () => setShowInventory(true);
    engine.onOpenCrafting = () => setShowCrafting(true);
    engine.onOpenQuests = () => setShowQuests(true);
    engine.onOpenMap = () => setShowMap(true);

    engine.onStatsUpdate = (newStats) => {
      setPlayerStats(newStats);
    };

    engine.onDamageEffect = (amount, reason) => {
      setDamageAlpha(0.75);
      engine.interactions.showToast('IMPACT DAMAGE', `${reason}: -${amount} HP`, 2.5);
    };

    engine.onHotbarUse = (slotIndex) => {
      handleHotbarUseRef.current(slotIndex);
    };

    // Apply saved equipped stats to player
    if (saved.equipped && saved.inventory) {
      const statsList = Object.values(saved.equipped)
        .filter(Boolean)
        .map((id) => (saved.inventory as InventoryItem[]).find((i) => i.id === id)?.stats);
      engine.player.applyEquipmentStats(statsList);
    }

    engine.interactions.onStateChange = (state) => {
      setCurrentPrompt(state.currentPrompt);
      setActiveInscription(state.activeInscription);
      setActiveDialogue(state.activeDialogue);
      setBannerToast(state.bannerToast);
    };

    engine.interactions.onAnchorAttuned = (anchorId) => {
      setProgress((prev) => {
        const next = {
          ...prev,
          activatedAnchors: Array.from(new Set([...prev.activatedAnchors, anchorId])),
        };
        saveProgress(next);
        return next;
      });
      setUserProfile((prev) => {
        const newXp = prev.xp + 250;
        const newLevel = Math.floor(newXp / 800) + 1;
        const updated = { ...prev, xp: newXp, level: Math.max(prev.level, newLevel) };
        saveUserProfile(updated);
        return updated;
      });
    };

    engine.interactions.onCheckpointActivated = (checkpoint) => {
      setProgress((prev) => {
        const next = {
          ...prev,
          activatedCheckpoints: Array.from(new Set([...(prev.activatedCheckpoints || []), checkpoint.id])),
          lastCheckpoint: checkpoint.position,
        };
        saveProgress(next);
        return next;
      });
      setUserProfile((prev) => {
        const newXp = prev.xp + 100;
        const newLevel = Math.floor(newXp / 800) + 1;
        const updated = { ...prev, xp: newXp, level: Math.max(prev.level, newLevel) };
        saveUserProfile(updated);
        return updated;
      });
    };

    engine.interactions.onResourceHarvested = (resource) => {
      setProgress((prev) => {
        const nextResources = Array.from(new Set([...(prev.collectedResources || []), resource.id]));
        const dbItem = ITEM_DATABASE[resource.itemType];
        const itemToAdd: InventoryItem = dbItem
          ? { ...dbItem, quantity: 1 }
          : {
              id: `inv-${resource.id}`,
              name: resource.name,
              description: `Harvested from the drifting catwalks. High resonant conductivity.`,
              category: 'resources',
              rarity: 'uncommon',
              quantity: 1,
              valueCoins: resource.coinValue,
              icon: 'gem',
            };

        const existing = prev.inventory.find((i) => i.id === itemToAdd.id);
        let updatedInv: InventoryItem[];
        if (existing) {
          updatedInv = prev.inventory.map((i) =>
            i.id === itemToAdd.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        } else {
          updatedInv = [...prev.inventory, itemToAdd];
        }

        const next = {
          ...prev,
          collectedResources: nextResources,
          inventory: updatedInv,
          coins: (prev.coins || 0) + resource.coinValue,
        };
        saveProgress(next);
        return next;
      });
      setUserProfile((prev) => {
        const newCoins = prev.coins + resource.coinValue;
        const newXp = prev.xp + resource.xpValue;
        const newLevel = Math.floor(newXp / 800) + 1;
        const updated = { ...prev, coins: newCoins, xp: newXp, level: Math.max(prev.level, newLevel) };
        saveUserProfile(updated);
        return updated;
      });
    };

    engine.interactions.onNpcTalk = (dialogue) => {
      setQuests((prev) =>
        prev.map((q) => (q.id === 'quest-survivors' ? { ...q, currentCount: Math.min(q.targetCount, q.currentCount + 1), completed: q.currentCount + 1 >= q.targetCount } : q))
      );
    };

    engine.interactions.onFragmentFound = (fragId) => {
      setProgress((prev) => {
        const next = {
          ...prev,
          collectedFragments: Array.from(new Set([...prev.collectedFragments, fragId])),
        };
        saveProgress(next);
        return next;
      });
      setUserProfile((prev) => {
        const newXp = prev.xp + 150;
        const newLevel = Math.floor(newXp / 800) + 1;
        const updated = { ...prev, xp: newXp, level: Math.max(prev.level, newLevel) };
        saveUserProfile(updated);
        return updated;
      });
    };

    engine.interactions.onResonanceUnlocked = () => {
      setProgress((prev) => {
        const next = { ...prev, resonanceDiscovered: true };
        saveProgress(next);
        return next;
      });
      setUserProfile((prev) => {
        const newXp = prev.xp + 500;
        const newLevel = Math.floor(newXp / 800) + 1;
        const updated = { ...prev, xp: newXp, level: Math.max(prev.level, newLevel) };
        saveUserProfile(updated);
        return updated;
      });
    };

    engine.onRespawnEffect = (alpha) => {
      setRespawnAlpha(alpha);
    };

    engine.onPerformanceUpdate = (newStats) => {
      setStats(newStats);
    };

    engine.onTelemetryUpdate = (data) => {
      setTelemetry(data);
    };

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [handleToggleCamera]);

  const handleStartGame = () => {
    setGameStarted(true);
    setShowSectorSelect(false);
    if (engineRef.current) engineRef.current.resume();
    soundSystem.startAudio();
  };

  const handleSelectSectorAndLaunch = (sectorId: number) => {
    const sector = SECTORS.find((s) => s.id === sectorId) || SECTORS[0];
    setLoadingDestination(sector);
    setIsLoadingLevel(true);
    setShowSectorSelect(false);
  };

  const handleLoadingComplete = () => {
    setIsLoadingLevel(false);
    if (engineRef.current) {
      engineRef.current.player.position.set(
        loadingDestination.spawnPoint[0],
        Math.max(4.2, loadingDestination.spawnPoint[1]),
        loadingDestination.spawnPoint[2]
      );
      engineRef.current.player.velocity.set(0, 0, 0);
      engineRef.current.player.isGrounded = true;
      engineRef.current.player.setCheckpoint(new THREE.Vector3(...loadingDestination.spawnPoint));
    }
    setUserProfile((prev) => {
      const updated = { ...prev, selectedSector: loadingDestination.id, xp: prev.xp + 50 };
      saveUserProfile(updated);
      return updated;
    });
    handleStartGame();
  };

  const handleNewGame = () => {
    const cleared = clearProgress();
    setProgress(cleared);
    handleSelectSectorAndLaunch(1);
  };

  const handleBuyItem = (item: any, cost: number) => {
    if ((userProfile.coins || 0) < cost) return;
    setUserProfile((prev) => {
      const next = { ...prev, coins: prev.coins - cost };
      saveUserProfile(next);
      return next;
    });
    setProgress((prev) => {
      const existing = prev.inventory.find((i) => i.id === item.id);
      let updatedInv;
      if (existing) {
        updatedInv = prev.inventory.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
        updatedInv = [...prev.inventory, item];
      }
      const nextProgress = { ...prev, inventory: updatedInv, coins: (prev.coins || 0) - cost };
      saveProgress(nextProgress);
      return nextProgress;
    });
    soundSystem.playFragmentCollected();
  };

  const handleSelectDimension = (dimId: number) => {
    setCurrentDimension(dimId);
    setShowDimensions(false);
    if (engineRef.current) {
      if (dimId === 3) {
        engineRef.current.world.triggerRareRedMoonEvent();
        engineRef.current.interactions.showToast('DIMENSIONAL RIFT OPENED', 'Kepler-94d enters celestial red moon alignment!');
      } else if (dimId === 2) {
        engineRef.current.world.setTimeOfDay('night');
        engineRef.current.interactions.showToast('QUANTUM AETHER', 'Gravitational matrix fluctuating. Anchors hyper-charged.');
      } else {
        engineRef.current.world.setTimeOfDay('day');
        engineRef.current.interactions.showToast('MATERIAL REALM', 'Returned to Kepler-94d primary stratosphere.');
      }
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    setShowSettings(true);
    if (engineRef.current) engineRef.current.pause();
  };

  const handleResume = () => {
    setIsPaused(false);
    setShowSettings(false);
    if (engineRef.current) engineRef.current.resume();
  };

  const handleReturnToTitle = () => {
    setIsPaused(false);
    setShowSettings(false);
    setGameStarted(false);
    setShowSectorSelect(false);
  };

  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    if (engineRef.current) {
      engineRef.current.applyQualitySettings(newSettings.graphicsQuality);
      engineRef.current.setSensitivity(newSettings.sensitivity);
      if (newSettings.cameraMode) engineRef.current.player.setCameraMode(newSettings.cameraMode);
    }
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    saveUserProfile(updatedProfile);
  };

  const handleResetProgress = () => {
    const cleared = clearProgress();
    setProgress(cleared);
    window.location.reload();
  };

  const handleTriggerInteract = useCallback(() => {
    if (engineRef.current) engineRef.current.interactions.triggerCurrentInteract();
  }, []);

  const handleCloseInscription = useCallback(() => {
    if (engineRef.current) engineRef.current.interactions.closeInscription();
  }, []);

  const handleCloseDialogue = useCallback(() => {
    setActiveDialogue(null);
    if (engineRef.current) engineRef.current.interactions.closeDialogue();
  }, []);

  const handleDialogueOptionSelect = useCallback((option: DialogueOption) => {
    if (option.rewardCoins || option.rewardXp) {
      setUserProfile((prev) => {
        const nextCoins = prev.coins + (option.rewardCoins || 0);
        const nextXp = prev.xp + (option.rewardXp || 0);
        const nextLevel = Math.floor(nextXp / 800) + 1;
        const updated = { ...prev, coins: nextCoins, xp: nextXp, level: Math.max(prev.level, nextLevel) };
        saveUserProfile(updated);
        return updated;
      });
      setProgress((prev) => {
        const next = { ...prev, coins: (prev.coins || 0) + (option.rewardCoins || 0) };
        saveProgress(next);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id === 'quest-1') {
          const count = progress.activatedAnchors.length;
          return { ...q, currentCount: count, completed: count >= q.targetCount };
        }
        if (q.id === 'quest-2') {
          const count = progress.collectedFragments.length;
          return { ...q, currentCount: count, completed: count >= q.targetCount };
        }
        if (q.id === 'quest-checkpoints') {
          const count = progress.activatedCheckpoints?.length || 0;
          return { ...q, currentCount: count, completed: count >= q.targetCount };
        }
        if (q.id === 'quest-harvest') {
          const count = progress.collectedResources?.length || 0;
          return { ...q, currentCount: count, completed: count >= q.targetCount };
        }
        if (q.id === 'quest-3' && (progress.redMoonWitnessed || telemetry.timeOfDay === 'red_moon')) {
          return { ...q, currentCount: 1, completed: true };
        }
        return q;
      })
    );
  }, [progress, telemetry.timeOfDay]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#070b14] select-none touch-none">
      <OrientationLockModal />
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {isLoadingLevel && (
        <LevelLoadingScreen
          destinationSector={loadingDestination}
          onLoadingComplete={handleLoadingComplete}
        />
      )}

      {!gameStarted && !showSectorSelect && !isLoadingLevel && (
        <TitleScreen
          onStartGame={handleStartGame}
          onNewGame={handleNewGame}
          onOpenSectorSelect={() => setShowSectorSelect(true)}
          onOpenDimensions={() => setShowDimensions(true)}
          onOpenQuests={() => setShowQuests(true)}
          onOpenInventory={() => setShowInventory(true)}
          onOpenShop={() => setShowShop(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenJournal={() => setShowJournal(true)}
          onOpenCredits={() => setShowCredits(true)}
          onResetProgress={handleResetProgress}
          progress={progress}
        />
      )}

      {showSectorSelect && !isLoadingLevel && (
        <SectorSelectModal
          userProfile={userProfile}
          progress={progress}
          onUpdateProfile={handleUpdateProfile}
          onSelectSectorAndLaunch={handleSelectSectorAndLaunch}
          onBackToTitle={() => setShowSectorSelect(false)}
        />
      )}

      {gameStarted && engineRef.current && !isLoadingLevel && (
        <HUD
          player={engineRef.current.player}
          progress={progress}
          settings={settings}
          playerStats={playerStats}
          damageAlpha={damageAlpha}
          currentPrompt={currentPrompt}
          activeInscription={activeInscription}
          bannerToast={bannerToast}
          respawnAlpha={respawnAlpha}
          stats={stats}
          telemetry={telemetry}
          showFps={settings.showFps}
          onPause={handlePause}
          onOpenJournal={() => setShowJournal(true)}
          onOpenQuests={() => setShowQuests(true)}
          onOpenInventory={() => setShowInventory(true)}
          onOpenCrafting={() => setShowCrafting(true)}
          onOpenMap={() => setShowMap(true)}
          onCloseInscription={handleCloseInscription}
          onInteract={handleTriggerInteract}
          onToggleCamera={handleToggleCamera}
          onHotbarUse={handleHotbarUse}
        />
      )}

      {activeDialogue && (
        <DialogueModal
          dialogue={activeDialogue}
          onOptionSelect={handleDialogueOptionSelect}
          onClose={handleCloseDialogue}
        />
      )}

      {showDimensions && (
        <DimensionsModal
          unlockedDimensions={unlockedDimensions}
          currentDimension={currentDimension}
          onSelectDimension={handleSelectDimension}
          onClose={() => setShowDimensions(false)}
        />
      )}

      {showQuests && (
        <QuestsModal
          quests={quests}
          onClose={() => setShowQuests(false)}
        />
      )}

      {showInventory && (
        <InventoryModal
          inventory={progress.inventory || []}
          userProfile={userProfile}
          equipped={(progress.equipped as Record<EquipmentSlot, string | null>) || {
            tool: null,
            protective: null,
            exploration: null,
            utility: null,
            relic: null,
            artifact: null,
          }}
          playerStats={playerStats}
          hotbar={progress.hotbar || [null, null, null, null, null, null]}
          onUseItem={handleUseItem}
          onEquipItem={handleEquipItem}
          onUnequipItem={handleUnequipItem}
          onAssignHotbar={handleAssignHotbar}
          onDiscardItem={handleDiscardItem}
          onOpenCrafting={() => {
            setShowInventory(false);
            setShowCrafting(true);
          }}
          onClose={() => setShowInventory(false)}
        />
      )}

      {showCrafting && (
        <CraftingModal
          inventory={progress.inventory || []}
          onCraftRecipe={handleCraftRecipe}
          onClose={() => setShowCrafting(false)}
        />
      )}

      {showShop && (
        <ShopModal
          userProfile={userProfile}
          inventory={progress.inventory || []}
          onBuyItem={handleBuyItem}
          onClose={() => setShowShop(false)}
        />
      )}

      {showMap && (
        <MapModal
          currentSectorId={userProfile.selectedSector || 1}
          onClose={() => setShowMap(false)}
        />
      )}

      {showCredits && (
        <CreditsModal
          onClose={() => setShowCredits(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={handleResume}
          onResetProgress={handleResetProgress}
          onReturnToTitle={gameStarted ? handleReturnToTitle : undefined}
        />
      )}

      {showJournal && (
        <JournalModal
          progress={progress}
          anchors={worldAnchors}
          fragments={worldFragments}
          checkpoints={worldCheckpoints}
          onClose={() => setShowJournal(false)}
        />
      )}
    </div>
  );
}
