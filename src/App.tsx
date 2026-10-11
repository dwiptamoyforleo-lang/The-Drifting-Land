/**
 * THE DRIFTING LAND — Main Application Root
 * Mobile-optimized Third-Person Sci-Fi Exploration Game
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
  HarvestableResource,
  UserProfile,
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
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { SettingsModal } from './components/SettingsModal';
import { JournalModal } from './components/JournalModal';
import { OrientationLockModal } from './components/OrientationLockModal';
import { SectorSelectModal, SECTORS } from './components/SectorSelectModal';
import { QuestsModal, INITIAL_QUESTS } from './components/QuestsModal';
import { DimensionsModal, DIMENSIONS } from './components/DimensionsModal';
import { InventoryModal } from './components/InventoryModal';
import { ShopModal } from './components/ShopModal';
import { CreditsModal } from './components/CreditsModal';
import { LevelLoadingScreen } from './components/LevelLoadingScreen';
import { DialogueModal } from './components/DialogueModal';
import { soundSystem } from './game/audio';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // High-level App State
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showJournal, setShowJournal] = useState<boolean>(false);
  const [showSectorSelect, setShowSectorSelect] = useState<boolean>(false);
  const [showDimensions, setShowDimensions] = useState<boolean>(false);
  const [showQuests, setShowQuests] = useState<boolean>(false);
  const [showInventory, setShowInventory] = useState<boolean>(false);
  const [showShop, setShowShop] = useState<boolean>(false);
  const [showCredits, setShowCredits] = useState<boolean>(false);

  // Loading Screen State
  const [isLoadingLevel, setIsLoadingLevel] = useState<boolean>(false);
  const [loadingDestination, setLoadingDestination] = useState<typeof SECTORS[0]>(SECTORS[0]);

  // Quests & Dimensions State
  const [quests, setQuests] = useState<typeof INITIAL_QUESTS>(INITIAL_QUESTS);
  const [currentDimension, setCurrentDimension] = useState<number>(1);
  const [unlockedDimensions, setUnlockedDimensions] = useState<number[]>([1, 2, 3]);

  // Settings, Progress & User Profile
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [progress, setProgress] = useState<GameProgress>(loadProgress);
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile);

  // In-Game Interaction & UI states
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

  // References to world objects for Archive modal
  const [worldAnchors, setWorldAnchors] = useState<MagicalAnchor[]>([]);
  const [worldFragments, setWorldFragments] = useState<WorldFragment[]>([]);
  const [worldCheckpoints, setWorldCheckpoints] = useState<WorldCheckpoint[]>([]);
  const [activeDialogue, setActiveDialogue] = useState<DialogueNode | null>(null);

  // Initialize Three.js Engine once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const initialSettings = loadSettings();
    const engine = new GameEngine(containerRef.current, initialSettings);
    engineRef.current = engine;

    // Restore saved progress
    const saved = loadProgress();
    engine.restoreProgress(
      saved.activatedAnchors,
      saved.collectedFragments,
      saved.resonanceDiscovered
    );

    // Save references to anchor/fragment/checkpoint definitions for the journal
    setWorldAnchors([...engine.world.anchors]);
    setWorldFragments([...engine.world.fragments]);
    setWorldCheckpoints([...engine.world.checkpoints]);

    // Setup Event Listeners from Engine
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

      // Award +250 XP for attuning a quantum anchor!
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

      // Award +100 XP for synchronizing recall checkpoint
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
        const newItem = {
          id: `inv-${resource.id}`,
          name: resource.name,
          description: `Harvested from the drifting catwalks. High resonant conductivity.`,
          category: resource.itemType as any,
          quantity: 1,
          valueCoins: resource.coinValue,
          icon: resource.itemType === 'artifact' ? 'sparkles' : 'gem',
        };
        const updatedInv = [...(prev.inventory || []), newItem];
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

      // Award +150 XP for recovering an encrypted data core!
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

      // Award +500 XP bonus for full resonance!
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
  }, []);

  // Start exploration from Title Screen
  const handleStartGame = () => {
    setGameStarted(true);
    setShowSectorSelect(false);
    if (engineRef.current) {
      engineRef.current.resume();
    }
    soundSystem.startAudio();
  };

  // Launch into a chosen Sector with loading sequence
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

    // Award +50 flight XP for deploying
    setUserProfile((prev) => {
      const updated = { ...prev, selectedSector: loadingDestination.id, xp: prev.xp + 50 };
      saveUserProfile(updated);
      return updated;
    });

    handleStartGame();
  };

  // New Game
  const handleNewGame = () => {
    const cleared = clearProgress();
    setProgress(cleared);
    handleSelectSectorAndLaunch(1);
  };

  // Toggle Camera Mode
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
        nextMode === 'first_person' ? '1st-Person Direct Visor' : nextMode === 'second_person' ? '2nd-Person Cinematic Reverse' : '3rd-Person Orbital'
      );
    }
  }, []);

  // Marketplace Buy Item
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

  // Shift Dimension
  const handleSelectDimension = (dimId: number) => {
    setCurrentDimension(dimId);
    setShowDimensions(false);
    if (engineRef.current) {
      if (dimId === 3) {
        // Red Moon Dimension
        engineRef.current.world.triggerRareRedMoonEvent();
        engineRef.current.interactions.showToast(
          'DIMENSIONAL RIFT OPENED',
          'Kepler-94d enters celestial red moon alignment!'
        );
      } else if (dimId === 2) {
        // Quantum Aether
        engineRef.current.world.setTimeOfDay('night');
        engineRef.current.interactions.showToast(
          'QUANTUM AETHER',
          'Gravitational matrix fluctuating. Anchors hyper-charged.'
        );
      } else {
        engineRef.current.world.setTimeOfDay('day');
        engineRef.current.interactions.showToast(
          'MATERIAL REALM',
          'Returned to Kepler-94d primary stratosphere.'
        );
      }
    }
  };

  // Pause menu
  const handlePause = () => {
    setIsPaused(true);
    setShowSettings(true);
    if (engineRef.current) {
      engineRef.current.pause();
    }
  };

  const handleResume = () => {
    setIsPaused(false);
    setShowSettings(false);
    if (engineRef.current) {
      engineRef.current.resume();
    }
  };

  const handleReturnToTitle = () => {
    setIsPaused(false);
    setShowSettings(false);
    setGameStarted(false);
    setShowSectorSelect(false);
  };

  // Settings updates
  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    if (engineRef.current) {
      engineRef.current.applyQualitySettings(newSettings.graphicsQuality);
      engineRef.current.setSensitivity(newSettings.sensitivity);
      if (newSettings.cameraMode) {
        engineRef.current.player.setCameraMode(newSettings.cameraMode);
      }
    }
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    saveUserProfile(updatedProfile);
  };

  // Reset Progress
  const handleResetProgress = () => {
    const cleared = clearProgress();
    setProgress(cleared);
    window.location.reload();
  };

  // Contextual Interact trigger
  const handleTriggerInteract = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.interactions.triggerCurrentInteract();
    }
  }, []);

  const handleCloseInscription = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.interactions.closeInscription();
    }
  }, []);

  const handleCloseDialogue = useCallback(() => {
    setActiveDialogue(null);
    if (engineRef.current) {
      engineRef.current.interactions.closeDialogue();
    }
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

  // Synchronize Quests with current exploration progress
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
      {/* 0. Mandatory Orientation Lock Gate (Landscape Required) */}
      <OrientationLockModal />

      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Dynamic Level Loading Screen */}
      {isLoadingLevel && (
        <LevelLoadingScreen
          destinationSector={loadingDestination}
          onLoadingComplete={handleLoadingComplete}
        />
      )}

      {/* Title Screen (when exploration hasn't started and not selecting sector) */}
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

      {/* Level / Sector Select Screen & User Profile (XP & Username) */}
      {showSectorSelect && !isLoadingLevel && (
        <SectorSelectModal
          userProfile={userProfile}
          progress={progress}
          onUpdateProfile={handleUpdateProfile}
          onSelectSectorAndLaunch={handleSelectSectorAndLaunch}
          onBackToTitle={() => setShowSectorSelect(false)}
        />
      )}

      {/* In-Game HUD (when active) */}
      {gameStarted && engineRef.current && !isLoadingLevel && (
        <HUD
          player={engineRef.current.player}
          progress={progress}
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
          onCloseInscription={handleCloseInscription}
          onInteract={handleTriggerInteract}
          onToggleCamera={handleToggleCamera}
        />
      )}

      {/* Survivor & NPC Transmission Modal */}
      {activeDialogue && (
        <DialogueModal
          dialogue={activeDialogue}
          onOptionSelect={handleDialogueOptionSelect}
          onClose={handleCloseDialogue}
        />
      )}

      {/* Dimensions Modal */}
      {showDimensions && (
        <DimensionsModal
          unlockedDimensions={unlockedDimensions}
          currentDimension={currentDimension}
          onSelectDimension={handleSelectDimension}
          onClose={() => setShowDimensions(false)}
        />
      )}

      {/* Quests Modal */}
      {showQuests && (
        <QuestsModal
          quests={quests}
          onClose={() => setShowQuests(false)}
        />
      )}

      {/* Inventory Modal */}
      {showInventory && (
        <InventoryModal
          inventory={progress.inventory || []}
          userProfile={userProfile}
          onClose={() => setShowInventory(false)}
        />
      )}

      {/* Shop Modal */}
      {showShop && (
        <ShopModal
          userProfile={userProfile}
          inventory={progress.inventory || []}
          onBuyItem={handleBuyItem}
          onClose={() => setShowShop(false)}
        />
      )}

      {/* Credits Modal */}
      {showCredits && (
        <CreditsModal
          onClose={() => setShowCredits(false)}
        />
      )}

      {/* Settings / Pause Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={handleResume}
          onResetProgress={handleResetProgress}
          onReturnToTitle={gameStarted ? handleReturnToTitle : undefined}
        />
      )}

      {/* Celestial Journal / Archive Modal */}
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
