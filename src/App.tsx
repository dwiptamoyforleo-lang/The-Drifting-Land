/**
 * The Drifting Land - Root Application
 * Centralized Game State & Lifecycle Orchestrator.
 * Full-viewport Game Shell: Title Screen -> Playing -> Pause / Settings / Inventory / Quests.
 * Static-first, GitHub Pages compatible, offline-safe persistence.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, SaveData, GameSettings, ShardRelic, CrimsonWardenState, WeatherType } from './types/game';
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
import { NotificationToast } from './components/NotificationToast';
import { DiagnosticScreen } from './components/DiagnosticScreen';
import { DevPanel } from './components/DevPanel';
import { AudioService } from './services/audio';

export default function App() {
  const [mode, setMode] = useState<GameMode>('TITLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [cameraLabel, setCameraLabel] = useState<string>('THIRD PERSON');
  const [isDevPanelOpen, setIsDevPanelOpen] = useState<boolean>(false);
  const [bossState, setBossState] = useState<CrimsonWardenState | null>(null);

  // Persistent save and settings
  const [activeSave, setActiveSave] = useState<SaveData>(() => StorageService.loadSave());
  const [settings, setSettings] = useState<GameSettings>(() => StorageService.loadSettings());
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
  const [activeDialogue, setActiveDialogue] = useState<{ name: string; lines: string[] } | null>(null);

  // Touch device detection
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => {
    return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  });

  // Engine instance ref
  const engineRef = useRef<GameEngine | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
        },
        currentSave
      );

      await engine.init();
      engineRef.current = engine;
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
  const handleStartGame = (isNew: boolean) => {
    if (isNew) {
      const cleanSave = createInitialSave();
      StorageService.saveGame(cleanSave);
      setActiveSave(cleanSave);
    }
    setMode('PLAYING');
    engineRef.current?.setMode('PLAYING');
  };

  const handleTogglePause = () => {
    if (mode === 'PLAYING') {
      setMode('PAUSED');
      engineRef.current?.setMode('PAUSED');
    } else if (mode === 'PAUSED' || mode === 'INVENTORY' || mode === 'QUESTS' || mode === 'MAP') {
      setMode('PLAYING');
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
    setHasExistingSave(true);
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
    if (newSettings.cameraMode && engineRef.current) {
      engineRef.current.setCameraMode(newSettings.cameraMode);
      setCameraLabel(engineRef.current.getCameraLabel());
    }
    if (newSettings.cameraDistance !== undefined && engineRef.current) {
      engineRef.current.setCameraDistance(newSettings.cameraDistance);
    }
    if (newSettings.cameraSensitivity !== undefined && engineRef.current) {
      engineRef.current.setCameraSensitivity(newSettings.cameraSensitivity);
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

  const handleJoystickMove = (x: number, y: number) => {
    engineRef.current?.input.setJoystick(x, y);
  };

  const handleTouchAction = (action: 'jump' | 'dash' | 'interact' | 'sprint', active: boolean) => {
    engineRef.current?.input.setTouchAction(action, active);
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

      {/* Loading overlay during initial shader compile */}
      {isInitializing && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0f16] text-slate-200">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mb-4" />
          <h2 className="text-sm font-mono tracking-widest uppercase text-emerald-400">
            Generating The Verdant Reach
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Synthesizing procedural archipelago...
          </p>
        </div>
      )}

      {/* Screen: Title Screen */}
      {!isInitializing && mode === 'TITLE' && (
        <TitleScreen
          hasExistingSave={hasExistingSave}
          onStartGame={handleStartGame}
          onOpenSettings={() => setMode('SETTINGS')}
          soundEnabled={settings.soundEnabled}
          onToggleSound={handleToggleSound}
        />
      )}

      {/* Screen: Playing HUD */}
      {!isInitializing && (mode === 'PLAYING' || mode === 'PAUSED' || mode === 'INVENTORY' || mode === 'QUESTS' || mode === 'MAP') && (
        <HUD
          stats={stats}
          timeState={timeState}
          bossState={bossState}
          weatherName={weatherName}
          relics={relics}
          beaconActivated={beaconActivated}
          interactionPrompt={interactionPrompt}
          cameraLabel={cameraLabel}
          onSwitchCamera={handleSwitchCamera}
          onOpenMap={handleToggleMap}
          onInteract={handleInteract}
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
        isRedMoon={timeState.isRedMoon}
        clockTime={timeState.clockTime}
        dayCount={timeState.dayCount}
      />

      {/* Dialogue Box Overlay */}
      {activeDialogue && (
        <DialogueModal
          dialogue={activeDialogue}
          onClose={() => setActiveDialogue(null)}
        />
      )}

      {/* Modal: Regional Navigation Chart & Map */}
      {mode === 'MAP' && engineRef.current && (
        <MapModal
          playerPos={engineRef.current.getPlayerPosition()}
          playerYaw={engineRef.current.getPlayerFacingAngle()}
          relics={relics.shards}
          checkpoints={engineRef.current.getCheckpoints()}
          onClose={() => {
            setMode('PLAYING');
            engineRef.current?.setMode('PLAYING');
          }}
        />
      )}

      {/* Modal: Inventory Pouch */}
      {mode === 'INVENTORY' && engineRef.current && (
        <InventoryModal
          inventory={engineRef.current.inventory}
          onUseItem={handleUseItem}
          onClose={() => {
            setMode('PLAYING');
            engineRef.current?.setMode('PLAYING');
          }}
        />
      )}

      {/* Modal: Quest Journal */}
      {mode === 'QUESTS' && engineRef.current && (
        <QuestJournalModal
          questSystem={engineRef.current.quests}
          discoveries={activeSave.discoveries}
          onClose={() => {
            setMode('PLAYING');
            engineRef.current?.setMode('PLAYING');
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
