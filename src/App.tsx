/**
 * The Drifting Land - Root Application
 * Centralized Game State & Lifecycle Orchestrator.
 * Full-viewport Game Shell: Title Screen -> Playing -> Pause / Settings / Inventory / Quests.
 * Static-first, GitHub Pages compatible, offline-safe persistence.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameMode,
  SaveData,
  GameSettings,
  ShardRelic,
  ActiveBossState,
  CrimsonWardenState,
  WeatherType,
  EquippedGear,
  QuestDefinition,
  QuestProgress,
  TraderCatalog,
  PlayerWallet,
  Checkpoint,
} from './types/game';
import { StorageService, createInitialSave } from './services/storage';
import { GameEngine } from './engine/gameLoop';
import { GameCanvas } from './components/GameCanvas';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { PauseMenu } from './components/PauseMenu';
import { SettingsModal } from './components/SettingsModal';
import { InventoryModal } from './components/InventoryModal';
import { QuestJournalModal } from './components/QuestJournalModal';
import { MapModal } from './components/MapModal';
import { DialogueModal } from './components/DialogueModal';
import { TradeModal } from './components/TradeModal';
import { NotificationToast } from './components/NotificationToast';
import { DiagnosticScreen } from './components/DiagnosticScreen';
import { DevPanel } from './components/DevPanel';
import { DimensionTransitionScreen } from './components/DimensionTransitionScreen';
import { PortalModal } from './components/PortalModal';
import { LoadingScreen } from './components/LoadingScreen';
import { RespawnModal } from './components/RespawnModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { CollectionsModal } from './components/CollectionsModal';
import { PortalDefinition, PortalUnlockCheck } from './data/portals';
import { AudioService } from './services/audio';
import { getTraderCatalog } from './data/traders';

export default function App() {
  const [mode, setMode] = useState<GameMode>('TITLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [initPhase, setInitPhase] = useState<string>('Verifying WebGL context & shaders...');
  const [initProgress, setInitProgress] = useState<number>(15);
  const [cameraLabel, setCameraLabel] = useState<string>('THIRD PERSON');
  const [hotbar, setHotbar] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [equipped, setEquipped] = useState<EquippedGear>({ head: null, body: null, tool: null, accessory: null });
  const [trackedQuest, setTrackedQuest] = useState<{ def: QuestDefinition; progress: QuestProgress; activeObjectiveText: string } | null>(null);
  const [isDevPanelOpen, setIsDevPanelOpen] = useState<boolean>(false);
  const [bossState, setBossState] = useState<ActiveBossState | null>(null);
  const [activeTraderCatalog, setActiveTraderCatalog] = useState<TraderCatalog | null>(null);
  const [portalModalData, setPortalModalData] = useState<{ portal: PortalDefinition; check: PortalUnlockCheck } | null>(null);
  const [transitionRegionId, setTransitionRegionId] = useState<string | null>(null);
  const [activeCheckpointForRespawn, setActiveCheckpointForRespawn] = useState<Checkpoint | null>(null);

  // Persistent save, wallet, and settings
  const [activeSave, setActiveSave] = useState<SaveData>(() => StorageService.loadSave());
  const [settings, setSettings] = useState<GameSettings>(() => StorageService.loadSettings());
  const [wallet, setWallet] = useState<PlayerWallet>(() => activeSave.wallet || { driftCoins: 75, aetherEssence: 0 });
  const [saveStatus, setSaveStatus] = useState<{ lastSaved: number; isSaving?: boolean }>({ lastSaved: 0 });
  const [hasExistingSave, setHasExistingSave] = useState<boolean>(() => StorageService.hasSave());

  // In-game dynamic state callbacks
  const [stats, setStats] = useState({
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    level: 1,
    experience: 0,
    experienceToNext: 200,
  });

  const [timeState, setTimeState] = useState<{
    phase: string;
    cycleTime: number;
    dayCount: number;
    isRedMoon: boolean;
    clockTime: string;
    nextTransitionLabel: string;
    nextTransitionSeconds: number;
  }>({
    phase: 'DAWN',
    cycleTime: 0.18,
    dayCount: 1,
    isRedMoon: false,
    clockTime: '06:00',
    nextTransitionLabel: 'Sunset',
    nextTransitionSeconds: 780,
  });

  const [weatherName, setWeatherName] = useState<string>('CLEAR');

  const [relics, setRelics] = useState<{
    shards: ShardRelic[];
    collectedCount: number;
    totalCount: number;
  }>({
    shards: [],
    collectedCount: 0,
    totalCount: 4,
  });

  const [beaconActivated, setBeaconActivated] = useState<boolean>(false);
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<{
    name: string;
    roleTitle?: string;
    role?: string;
    lines: string[];
    tradeCatalogId?: string;
  } | null>(null);

  // Touch device detection
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => {
    return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  });

  // Engine instance ref
  const engineRef = useRef<GameEngine | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleOpenTrade = useCallback((catalogId: string) => {
    const catalog = getTraderCatalog(catalogId);
    if (catalog) {
      setActiveDialogue(null);
      setActiveTraderCatalog(catalog);
      setMode('TRADE');
      engineRef.current?.setMode('TRADE');
    }
  }, []);

  const handleCloseTrade = useCallback(() => {
    setActiveTraderCatalog(null);
    setMode('PLAYING');
    engineRef.current?.setMode('PLAYING');
  }, []);

  /**
   * Bootstraps the WebGL GameEngine
   */
  const initEngine = useCallback(async (container: HTMLDivElement) => {
    containerRef.current = container;
    setIsInitializing(true);
    setErrorMessage(null);

    // Dispose existing engine if present
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }

    try {
      const currentSave = StorageService.loadSave();
      setActiveSave(currentSave);
      setSettings(currentSave.settings);
      setHasExistingSave(StorageService.hasSave());

      const engine = new GameEngine(
        container,
        {
          onStatsUpdate: (newStats) => setStats(newStats),
          onTimeUpdate: (newTime) => setTimeState(newTime),
          onWeatherUpdate: (w) => setWeatherName(w),
          onRelicUpdate: (shards, collectedCount, totalCount) =>
            setRelics({ shards, collectedCount, totalCount }),
          onInteractionAvailable: (prompt) => setInteractionPrompt(prompt),
          onBeaconStateChange: (act) => setBeaconActivated(act),
          onNpcDialogue: (dialogue) => setActiveDialogue(dialogue),
          onOpenTradeModal: (catalogId) => handleOpenTrade(catalogId),
          onToggleInventoryModal: () => {
            setMode((prev) => (prev === 'INVENTORY' ? 'PLAYING' : 'INVENTORY'));
            engineRef.current?.setMode('INVENTORY');
          },
          onToggleQuestsModal: () => {
            setMode((prev) => (prev === 'QUESTS' ? 'PLAYING' : 'QUESTS'));
            engineRef.current?.setMode('QUESTS');
          },
          onToggleMapModal: () => {
            setMode((prev) => {
              const next = prev === 'MAP' ? 'PLAYING' : 'MAP';
              engineRef.current?.setMode(next);
              return next;
            });
          },
          onCameraModeChange: (_cmode, label) => {
            setCameraLabel(label);
          },
          onBossStateUpdate: (boss) => setBossState(boss),
          onDiscoveriesUpdate: (updatedDiscoveries) => {
            setActiveSave((prev) => ({ ...prev, discoveries: [...updatedDiscoveries] }));
          },
          onInspectPortal: (portal, check) => {
            setPortalModalData({ portal, check });
          },
          onStartDimensionTransition: (regionId) => {
            setTransitionRegionId(regionId);
          },
          onPlayerDefeated: (cp) => {
            setActiveCheckpointForRespawn(cp);
            setMode('RESPAWN');
          },
        },
        currentSave
      );

      await engine.init((phase, percent) => {
        setInitPhase(phase);
        setInitProgress(percent);
      });
      engineRef.current = engine;

      // Subscribe to hotbar, wallet, and equipment changes
      engine.inventory.subscribe((_slots, newWallet, newHotbar, newEquipped) => {
        setWallet({ ...newWallet });
        setHotbar([...newHotbar]);
        setEquipped({ ...newEquipped });
      });
      setWallet({ ...engine.inventory.wallet });
      setHotbar([...engine.inventory.hotbar]);
      setEquipped({ ...engine.inventory.equipped });

      // Subscribe to active quest updates
      engine.quests.subscribe(() => {
        setTrackedQuest(engine.getTrackedQuest());
      });
      setTrackedQuest(engine.getTrackedQuest());

      setCameraLabel(engine.getCameraLabel());
      setIsInitializing(false);
    } catch (err: any) {
      console.error('Engine startup failure:', err);
      setErrorMessage(err?.message || 'Failed to initialize 3D graphics rendering engine.');
      setMode('ERROR');
      setIsInitializing(false);
    }
  }, []);

  // Save on page exit / refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      engineRef.current?.persistSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Mode transitions
  const handleStartGame = (isNew: boolean, customRegionId?: string) => {
    if (isNew) {
      const cleanSave = createInitialSave();
      StorageService.saveGame(cleanSave);
      setActiveSave(cleanSave);
      setWallet({ ...cleanSave.wallet });
    }
    if (customRegionId && customRegionId !== activeSave.regionId) {
      engineRef.current?.switchDestination(customRegionId);
    }
    setMode('PLAYING');
    engineRef.current?.setMode('PLAYING');
  };

  const handleTogglePause = () => {
    if (mode === 'PLAYING') {
      setMode('PAUSED');
      engineRef.current?.setMode('PAUSED');
    } else if (
      mode === 'PAUSED' ||
      mode === 'INVENTORY' ||
      mode === 'CRAFTING' ||
      mode === 'QUESTS' ||
      mode === 'ACHIEVEMENTS' ||
      mode === 'MAP' ||
      mode === 'LEVEL_SELECT' ||
      mode === 'COLLECTIONS' ||
      mode === 'TRADE'
    ) {
      setMode('PLAYING');
      setActiveTraderCatalog(null);
      engineRef.current?.setMode('PLAYING');
    }
  };

  const handleReturnToTitle = () => {
    engineRef.current?.persistSave();
    setMode('TITLE');
    engineRef.current?.setMode('TITLE');
    setHasExistingSave(StorageService.hasSave());
    setActiveDialogue(null);
  };

  const handleSaveProgress = () => {
    engineRef.current?.persistSave();
    const updated = StorageService.loadSave();
    setActiveSave(updated);
    setHasExistingSave(true);
    setSaveStatus({ lastSaved: Date.now(), isSaving: false });
  };

  const handleToggleSound = () => {
    const nextSound = !settings.soundEnabled;
    const nextSettings = { ...settings, soundEnabled: nextSound };
    setSettings(nextSettings);
    StorageService.saveSettings(nextSettings);
    AudioService.setMuted(!nextSound);
  };

  const handleToggleRedMoon = () => {
    engineRef.current?.devToggleRedMoon();
  };

  const handleDevToggleRedMoon = (force?: boolean): boolean => {
    return engineRef.current ? engineRef.current.devToggleRedMoon(force) : false;
  };

  const handleDevJumpPhase = (phase: 'DAWN' | 'NOON' | 'DUSK' | 'NIGHT') => {
    engineRef.current?.devJumpPhase(phase);
  };

  const handleDevAdvanceTime = (seconds: number) => {
    engineRef.current?.devAdvanceTime(seconds);
  };

  const handleDevSetWeather = (weather: WeatherType) => {
    engineRef.current?.devSetWeather(weather);
  };

  const handleDevResetCooldown = () => {
    engineRef.current?.devResetRedMoonCooldown();
  };

  const handleDevTeleport = (x: number, z: number) => {
    engineRef.current?.devTeleport(x, z);
  };

  // Global F1 or ` hotkey for DevPanel
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '`' || e.code === 'F1') {
        e.preventDefault();
        setIsDevPanelOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSwitchCamera = () => {
    if (engineRef.current) {
      engineRef.current.cycleCameraMode();
      setCameraLabel(engineRef.current.getCameraLabel());
    }
  };

  const handleToggleMap = () => {
    setMode((prev) => {
      const next = prev === 'MAP' ? 'PLAYING' : 'MAP';
      engineRef.current?.setMode(next);
      return next;
    });
  };

  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
    engineRef.current?.updateSettings(newSettings);
    if (engineRef.current) {
      setCameraLabel(engineRef.current.getCameraLabel());
    }
  };

  const handleReloadSave = () => {
    if (containerRef.current) {
      initEngine(containerRef.current);
    }
  };

  const handleInteract = () => {
    engineRef.current?.handleInteract();
  };

  const handleAttack = () => {
    engineRef.current?.handleAttack();
  };

  const handleJoystickMove = (x: number, y: number) => {
    engineRef.current?.input.setJoystick(x, y);
  };

  const handleTouchAction = (action: 'jump' | 'dash' | 'interact' | 'sprint' | 'attack', active: boolean) => {
    engineRef.current?.input.setTouchAction(action, active);
  };

    const handleUseHotbarSlot = (slotIndex: number) => {
    if (!engineRef.current) return;
    engineRef.current.inventory.useHotbarSlot(slotIndex, (consumableId) => {
      engineRef.current?.useItem(consumableId);
    });
  };

  const handleUseItem = (itemId: string) => {
    engineRef.current?.useItem(itemId);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0f16] font-sans select-none text-slate-100">
      {/* Isolated WebGL Canvas */}
      <GameCanvas engineRef={engineRef} onContainerReady={initEngine} />

      {/* Global In-Game Notification Toasts */}
      <NotificationToast />

      {/* Authentic Loading Screen with genuine step progress */}
      {isInitializing && (
        <LoadingScreen
          regionId={activeSave.regionId}
          initPhase={initPhase}
          progressPercent={initProgress}
          trackedQuest={trackedQuest}
          errorMessage={errorMessage}
          onRetry={() => {
            if (containerRef.current) {
              initEngine(containerRef.current);
            }
          }}
        />
      )}

      {/* Screen: Title Screen / Main Menu */}
      {!isInitializing && mode === 'TITLE' && (
        <TitleScreen
          hasExistingSave={hasExistingSave}
          activeSave={activeSave}
          onStartGame={handleStartGame}
          onOpenSettings={() => setMode('SETTINGS')}
          soundEnabled={settings.soundEnabled}
          onToggleSound={handleToggleSound}
        />
      )}

      {/* Screen: Playing HUD */}
      {!isInitializing &&
        (mode === 'PLAYING' ||
          mode === 'PAUSED' ||
          mode === 'INVENTORY' ||
          mode === 'CRAFTING' ||
          mode === 'QUESTS' ||
          mode === 'ACHIEVEMENTS' ||
          mode === 'MAP' ||
          mode === 'LEVEL_SELECT' ||
          mode === 'COLLECTIONS') && (
          <HUD
            regionId={activeSave.regionId}
            wallet={wallet}
            saveStatus={saveStatus}
            hudVisibility={settings.hudVisibility}
            mobileButtonSize={settings.mobileButtonSize}
            mobileHaptics={settings.mobileHaptics}
            stats={stats}
            timeState={timeState}
            bossState={bossState}
            weatherName={weatherName}
            relics={relics}
            beaconActivated={beaconActivated}
            interactionPrompt={interactionPrompt}
            cameraLabel={cameraLabel}
            trackedQuest={trackedQuest}
            hotbar={hotbar}
            equipped={equipped}
            onUseHotbarSlot={handleUseHotbarSlot}
            onSwitchCamera={handleSwitchCamera}
            onOpenMap={handleToggleMap}
            onInteract={handleInteract}
            onAttack={handleAttack}
            onOpenInventory={() => {
              setMode('INVENTORY');
              engineRef.current?.setMode('INVENTORY');
            }}
            onOpenQuests={() => {
              setMode('QUESTS');
              engineRef.current?.setMode('QUESTS');
            }}
            onTogglePause={handleTogglePause}
            onToggleSound={handleToggleSound}
            soundEnabled={settings.soundEnabled}
            onToggleRedMoon={handleToggleRedMoon}
            onOpenDevPanel={() => setIsDevPanelOpen(true)}
            showTouchControls={isTouchDevice || settings.touchControls}
            onJoystickMove={handleJoystickMove}
            onTouchAction={handleTouchAction}
          />
        )}

      {/* Developer-Only Testing Suite (Separate from player settings) */}
      <DevPanel
        isOpen={isDevPanelOpen}
        onClose={() => setIsDevPanelOpen(false)}
        onToggleRedMoon={handleDevToggleRedMoon}
        onJumpPhase={handleDevJumpPhase}
        onAdvanceTime={handleDevAdvanceTime}
        onSetWeather={handleDevSetWeather}
        onResetCooldown={handleDevResetCooldown}
        onTeleport={handleDevTeleport}
        onSwitchDestination={(regionId) => engineRef.current?.switchDestination(regionId)}
        isRedMoon={timeState.isRedMoon}
        clockTime={timeState.clockTime}
        dayCount={timeState.dayCount}
      />

      {/* Dialogue Box Overlay */}
      {activeDialogue && (
        <DialogueModal
          dialogue={activeDialogue}
          onOpenTrade={(catalogId) => handleOpenTrade(catalogId)}
          onClose={() => setActiveDialogue(null)}
        />
      )}

      {/* Modal: Trader Outpost & Merchant Shop */}
      {mode === 'TRADE' && activeTraderCatalog && engineRef.current && (
        <TradeModal
          catalog={activeTraderCatalog}
          inventory={engineRef.current.inventory}
          onClose={handleCloseTrade}
        />
      )}

      {/* Modal: Regional Navigation Chart & Map */}
      {mode === 'MAP' && engineRef.current && (
        <MapModal
          regionId={activeSave.regionId}
          playerPos={engineRef.current.getPlayerPosition()}
          playerYaw={engineRef.current.getPlayerFacingAngle()}
          relics={relics.shards}
          checkpoints={engineRef.current.getCheckpoints()}
          discoveries={activeSave.discoveries}
          trackedQuest={trackedQuest}
          onFastTravel={(cpId) => engineRef.current?.fastTravel(cpId)}
          onClose={() => {
            setMode('PLAYING');
            engineRef.current?.setMode('PLAYING');
          }}
        />
      )}

      {/* Modal: Inventory Pouch & Crafting Station */}
      {(mode === 'INVENTORY' || mode === 'CRAFTING') && engineRef.current && (
        <InventoryModal
          inventory={engineRef.current.inventory}
          initialTab={mode === 'CRAFTING' ? 'crafting' : 'inventory'}
          onUseItem={handleUseItem}
          onClose={() => {
            setMode('PLAYING');
            engineRef.current?.setMode('PLAYING');
          }}
        />
      )}

      {/* Modal: Quest Journal & Achievements Codex */}
      {(mode === 'QUESTS' || mode === 'ACHIEVEMENTS') && engineRef.current && (
        <QuestJournalModal
          questSystem={engineRef.current.quests}
          achievementSystem={engineRef.current.achievements}
          initialTab={mode === 'ACHIEVEMENTS' ? 'achievements' : 'quests'}
          discoveries={activeSave.discoveries}
          onClose={() => {
            setMode('PLAYING');
            engineRef.current?.setMode('PLAYING');
          }}
        />
      )}

      {/* Modal: Level & Destination Selection */}
      {mode === 'LEVEL_SELECT' && (
        <LevelSelectModal
          currentRegionId={activeSave.regionId}
          unlockedRegionIds={Object.keys(activeSave.dimensionProgress || {})}
          explorationRank={activeSave.explorationRank}
          onSelectDestination={(id) => {
            engineRef.current?.switchDestination(id);
            setMode('PLAYING');
          }}
          onClose={() => {
            setMode('PLAYING');
            engineRef.current?.setMode('PLAYING');
          }}
        />
      )}

      {/* Modal: Collections & Archives Compendium */}
      {mode === 'COLLECTIONS' && (
        <CollectionsModal
          shards={relics.shards}
          discoveries={activeSave.discoveries}
          defeatedBosses={activeSave.defeatedBosses}
          onClose={() => {
            setMode('PLAYING');
            engineRef.current?.setMode('PLAYING');
          }}
        />
      )}

      {/* Modal: Controlled Defeat Respawn */}
      {mode === 'RESPAWN' && (
        <RespawnModal
          activeCheckpoint={activeCheckpointForRespawn}
          onRespawn={(useStarting) => {
            engineRef.current?.respawnPlayer(useStarting);
            setActiveCheckpointForRespawn(null);
            setMode('PLAYING');
          }}
        />
      )}

      {/* Modal: Pause Modal */}
      {mode === 'PAUSED' && (
        <PauseMenu
          onResume={() => {
            setMode('PLAYING');
            engineRef.current?.setMode('PLAYING');
          }}
          onSave={handleSaveProgress}
          onOpenSettings={() => setMode('SETTINGS')}
          onReturnToTitle={handleReturnToTitle}
          onOpenLevels={() => setMode('LEVEL_SELECT')}
          onOpenQuests={() => setMode('QUESTS')}
          onOpenInventory={() => setMode('INVENTORY')}
          onOpenCollections={() => setMode('COLLECTIONS')}
          regionName={activeSave.regionId}
          shardCount={relics.collectedCount}
          totalShards={relics.totalCount}
        />
      )}

      {/* Modal: Settings Modal */}
      {mode === 'SETTINGS' && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => {
            if (engineRef.current?.getMode() === 'PLAYING') {
              setMode('PLAYING');
            } else if (engineRef.current?.getMode() === 'PAUSED') {
              setMode('PAUSED');
            } else {
              setMode('TITLE');
            }
          }}
          onReloadSave={handleReloadSave}
        />
      )}

      {/* Modal: Portal Inspection & Unlock Checklist */}
      {portalModalData && (
        <PortalModal
          portal={portalModalData.portal}
          check={portalModalData.check}
          onTraverse={() => {
            const dest = portalModalData.portal.destinationRegionId;
            setPortalModalData(null);
            engineRef.current?.switchDestination(dest);
          }}
          onClose={() => setPortalModalData(null)}
        />
      )}

      {/* Atmospheric Dimension Transition Warp Screen */}
      {transitionRegionId && (
        <DimensionTransitionScreen
          destinationRegionId={transitionRegionId}
          onComplete={() => setTransitionRegionId(null)}
        />
      )}

      {/* Screen: Diagnostic & Error Screen */}
      {mode === 'ERROR' && (
        <DiagnosticScreen
          errorMessage={errorMessage || 'An unexpected error occurred.'}
          onRetry={() => {
            if (containerRef.current) {
              initEngine(containerRef.current);
            }
          }}
          onResetSaveAndRetry={() => {
            StorageService.clearSave();
            if (containerRef.current) {
              initEngine(containerRef.current);
            }
          }}
        />
      )}
    </div>
  );
}
