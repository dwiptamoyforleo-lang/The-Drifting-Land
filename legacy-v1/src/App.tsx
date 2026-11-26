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
  EngineDiagnostics,
  WebGLDiagnosticReport,
} from './types/game';
import { StorageService, createInitialSave } from './services/storage';
import { GameEngine } from './engine/gameLoop';
import { WebGLInitError } from './engine/renderer';
import { GameCanvas } from './components/GameCanvas';
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
import { SaveSlotModal } from './components/SaveSlotModal';
import { PerformanceOverlay } from './components/PerformanceOverlay';
import { PortalDefinition, PortalUnlockCheck } from './data/portals';
import { AudioService } from './services/audio';
import { getTraderCatalog } from './data/traders';
import {
  GAME_ROOT_FADE_MS,
  LOADER_SKY_COLOR,
  getWarmupStatus,
  hideAndInertLoader,
  maybeRequestMobileFullscreen,
  reloadToLoadingScreen,
  unlockWebAudioOnGesture,
  warmGameModules,
} from './bootstrap';

type GameRootTransitionPhase = 'IDLE' | 'FADING_IN' | 'WAKING' | 'REVEALING' | 'ACTIVE' | 'ERROR';

export default function App() {
  const [mode, setMode] = useState<GameMode>('TITLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diagnosticReport, setDiagnosticReport] = useState<WebGLDiagnosticReport | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [initPhase, setInitPhase] = useState<string>('Verifying WebGL context & shaders...');
  const [initProgress, setInitProgress] = useState<number>(15);
  const [cameraLabel, setCameraLabel] = useState<string>('THIRD PERSON');
  const [hotbar, setHotbar] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [equipped, setEquipped] = useState<EquippedGear>({ head: null, body: null, tool: null, accessory: null });
  const [trackedQuest, setTrackedQuest] = useState<{ def: QuestDefinition; progress: QuestProgress; activeObjectiveText: string } | null>(null);
  const [isDevPanelOpen, setIsDevPanelOpen] = useState<boolean>(false);
  const [isSaveSlotsOpen, setIsSaveSlotsOpen] = useState<boolean>(false);
  const [bossState, setBossState] = useState<ActiveBossState | null>(null);
  const [activeTraderCatalog, setActiveTraderCatalog] = useState<TraderCatalog | null>(null);
  const [portalModalData, setPortalModalData] = useState<{ portal: PortalDefinition; check: PortalUnlockCheck } | null>(null);
  const [transitionRegionId, setTransitionRegionId] = useState<string | null>(null);
  const [activeCheckpointForRespawn, setActiveCheckpointForRespawn] = useState<Checkpoint | null>(null);

  // Persistent save, wallet, active slot, and settings
  const [activeSlotId, setActiveSlotId] = useState<number>(() => StorageService.getActiveSlot());
  const [activeSave, setActiveSave] = useState<SaveData>(() => StorageService.loadSave());
  const [settings, setSettings] = useState<GameSettings>(() => StorageService.loadSettings());
  const [wallet, setWallet] = useState<PlayerWallet>(() => activeSave.wallet || { driftCoins: 75, aetherEssence: 0 });
  const [saveStatus, setSaveStatus] = useState<{ lastSaved: number; isSaving?: boolean }>({ lastSaved: 0 });
  const [hasExistingSave, setHasExistingSave] = useState<boolean>(() => StorageService.hasSave());

  // Live Performance Diagnostics Telemetry
  const [diagnostics, setDiagnostics] = useState<EngineDiagnostics>({
    fps: 60,
    frameTimeMs: 16.6,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    activeChunks: 0,
    nearChunks: 0,
    unloadedChunks: 0,
    entityCount: 0,
    activeQualityTier: 'medium',
    isAutoQuality: true,
  });

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

  // Engine instance & concurrency guard refs
  const engineRef = useRef<GameEngine | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initLockRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const loaderHostRef = useRef<HTMLDivElement | null>(null);
  const loaderFrameRef = useRef<HTMLIFrameElement | null>(null);

  // Section 2 #game-root fade & readiness transition state
  const [transitionPhase, setTransitionPhase] = useState<GameRootTransitionPhase>('IDLE');
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [loaderInert, setLoaderInert] = useState<boolean>(false);
  const [curtainOpaque, setCurtainOpaque] = useState<boolean>(false);

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
   * Bootstraps the WebGL GameEngine safely with concurrency lock & 1-frame disposal yield
   */
  const initEngine = useCallback(async (container: HTMLDivElement) => {
    containerRef.current = container;
    if (initLockRef.current) {
      return;
    }
    initLockRef.current = true;
    setIsInitializing(true);
    setErrorMessage(null);
    setDiagnosticReport(null);
    setInitPhase('Initializing Three.js WebGL pipeline...');
    setInitProgress(15);

    try {
      // Dispose any previous engine completely and wait one animation frame so the browser frees the old WebGL context
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      if (!isMountedRef.current) return;

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
          onDiagnosticsUpdate: (diag) => setDiagnostics(diag),
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
          onContextUnrecoverable: (report) => {
            setDiagnosticReport(report);
            setErrorMessage(report.summary);
            setIsInitializing(false);
            setMode('ERROR');
          },
        },
        currentSave
      );

      const started = await engine.init((phase, percent) => {
        if (!isMountedRef.current) return;
        setInitPhase(phase);
        setInitProgress(percent);
      });

      if (!started || !isMountedRef.current) {
        engine.dispose();
        return;
      }

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
      setMode('TITLE');
      setIsInitializing(false);
    } catch (err: unknown) {
      console.error('Engine startup failure:', err);
      if (err instanceof WebGLInitError) {
        setDiagnosticReport(err.report);
        setErrorMessage(err.message);
      } else {
        setDiagnosticReport(null);
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to initialize 3D graphics rendering engine.'
        );
      }
      setMode('ERROR');
      setIsInitializing(false);
    } finally {
      initLockRef.current = false;
    }
  }, [handleOpenTrade]);

  // Clean up WebGL context cleanly on root unmount (StrictMode / navigation safe)
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  // Save on page exit / refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      engineRef.current?.persistSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleStartGame = useCallback(
    (isNew: boolean, customRegionId?: string) => {
      if (isNew) {
        const cleanSave = createInitialSave(activeSlotId);
        StorageService.saveGame(cleanSave, activeSlotId);
        setActiveSave(cleanSave);
        setWallet({ ...cleanSave.wallet });
      }
      if (customRegionId && customRegionId !== activeSave.regionId) {
        engineRef.current?.switchDestination(customRegionId);
      }
      setMode('PLAYING');
      engineRef.current?.setMode('PLAYING');
    },
    [activeSave.regionId, activeSlotId]
  );

  const handleBeginFromLoader = useCallback(() => {
    // 1. Unlock WebAudio synchronously on the Begin Journey user gesture
    unlockWebAudioOnGesture(settings.soundEnabled);
    // 2. Request fullscreen on mobile only if the user explicitly enabled it
    maybeRequestMobileFullscreen(Boolean(settings.mobileFullscreen));

    setTransitionError(null);
    setCurtainOpaque(false);
    setTransitionPhase('FADING_IN');

    // Kick off fade-in from loader sky colour (#1b3a6b) on next animation frame
    requestAnimationFrame(() => {
      if (isMountedRef.current) {
        setCurtainOpaque(true);
      }
    });
  }, [settings.mobileFullscreen, settings.soundEnabled]);

  // Complete the 900ms fade-in, verify module/engine readiness, hide/inert loader, and reveal game
  useEffect(() => {
    if (transitionPhase !== 'FADING_IN') return;
    const timer = window.setTimeout(() => {
      if (!isMountedRef.current) return;
      const warmup = getWarmupStatus();
      if (warmup.status === 'error') {
        setTransitionError(warmup.errorMessage || 'Unable to load game modules.');
        setTransitionPhase('ERROR');
        return;
      }
      if (mode === 'ERROR') {
        setTransitionError(errorMessage || 'Failed to initialize 3D graphics rendering engine.');
        setTransitionPhase('ERROR');
        return;
      }
      if (isInitializing || warmup.status === 'warming' || !engineRef.current) {
        setTransitionPhase('WAKING');
        return;
      }

      hideAndInertLoader(loaderHostRef.current, loaderFrameRef.current);
      setLoaderInert(true);
      handleStartGame(!hasExistingSave);
      setTransitionPhase('REVEALING');
    }, GAME_ROOT_FADE_MS);

    return () => window.clearTimeout(timer);
  }, [transitionPhase, mode, errorMessage, isInitializing, hasExistingSave, handleStartGame]);

  // While in WAKING ("Waking the drift..."), finish transition as soon as engine/modules become ready
  useEffect(() => {
    if (transitionPhase !== 'WAKING') return;
    const warmup = getWarmupStatus();
    if (warmup.status === 'error') {
      setTransitionError(warmup.errorMessage || 'Unable to load game modules.');
      setTransitionPhase('ERROR');
      return;
    }
    if (mode === 'ERROR') {
      setTransitionError(errorMessage || 'Failed to initialize 3D graphics rendering engine.');
      setTransitionPhase('ERROR');
      return;
    }
    if (!isInitializing && warmup.status === 'ready' && engineRef.current) {
      hideAndInertLoader(loaderHostRef.current, loaderFrameRef.current);
      setLoaderInert(true);
      handleStartGame(!hasExistingSave);
      setTransitionPhase('REVEALING');
    }
  }, [transitionPhase, isInitializing, mode, errorMessage, hasExistingSave, handleStartGame]);

  // Dissolve the sky veil smoothly once the live 3D scene has started
  useEffect(() => {
    if (transitionPhase !== 'REVEALING') return;
    const timer = window.setTimeout(() => {
      if (isMountedRef.current) {
        setTransitionPhase('ACTIVE');
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [transitionPhase]);

  const handleRetryTransition = useCallback(() => {
    setTransitionError(null);
    setTransitionPhase('WAKING');
    warmGameModules(true).then((res) => {
      if (!isMountedRef.current) return;
      if (res.status === 'error') {
        setTransitionError(res.errorMessage || 'Unable to load game modules.');
        setTransitionPhase('ERROR');
        return;
      }
      if (containerRef.current && !initLockRef.current && !engineRef.current) {
        initEngine(containerRef.current);
      }
    });
  }, [initEngine]);

  const handleSelectSaveSlot = (slotId: number) => {
    setActiveSlotId(slotId);
    StorageService.setActiveSlot(slotId);
    const loaded = StorageService.loadSave(slotId);
    setActiveSave(loaded);
    setWallet({ ...loaded.wallet });
    setHasExistingSave(StorageService.hasSave(slotId));
    if (containerRef.current) {
      initEngine(containerRef.current);
    }
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
    reloadToLoadingScreen(() => {
      engineRef.current?.persistSave();
    });
  };

  const handleSaveProgress = () => {
    setSaveStatus({ lastSaved: Date.now(), isSaving: true });
    setTimeout(() => {
      engineRef.current?.persistSave();
      const updated = StorageService.loadSave(activeSlotId);
      setActiveSave(updated);
      setHasExistingSave(true);
      setSaveStatus({ lastSaved: Date.now(), isSaving: false });
    }, 150);
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

  // Global F1 / ` hotkey for DevPanel, and F3 hotkey for Performance Diagnostics overlay
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '`' || e.code === 'F1') {
        e.preventDefault();
        setIsDevPanelOpen((prev) => !prev);
      } else if (e.code === 'F3') {
        e.preventDefault();
        setSettings((prev) => {
          const next = { ...prev, showDiagnostics: !prev.showDiagnostics };
          StorageService.saveSettings(next);
          engineRef.current?.updateSettings(next);
          return next;
        });
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

  const handleLoaderNodesReady = useCallback(
    (host: HTMLDivElement | null, frame: HTMLIFrameElement | null) => {
      loaderHostRef.current = host;
      loaderFrameRef.current = frame;
    },
    []
  );

  const showLoader =
    !loaderInert &&
    (isInitializing ||
      mode === 'TITLE' ||
      transitionPhase === 'FADING_IN' ||
      (mode === 'SETTINGS' && engineRef.current?.getMode() === 'TITLE'));

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0f16] font-sans select-none text-slate-100">
      {/* Custom floating-island loading and title screen */}
      {showLoader && mode !== 'ERROR' && (
        <LoadingScreen
          initPhase={initPhase}
          progressPercent={initProgress}
          ready={!isInitializing}
          hasExistingSave={hasExistingSave}
          soundEnabled={settings.soundEnabled}
          hiddenAndInert={loaderInert}
          onBegin={handleBeginFromLoader}
          onOpenSettings={() => setMode('SETTINGS')}
          onOpenSaveSlots={() => setIsSaveSlotsOpen(true)}
          onToggleSound={handleToggleSound}
          onLoaderNodesReady={handleLoaderNodesReady}
          onRetry={() => {
            if (containerRef.current) initEngine(containerRef.current);
          }}
        />
      )}

      {/* Full-viewport #game-root container above the loader */}
      <div
        id="game-root"
        className={
          transitionPhase !== 'IDLE' && transitionPhase !== 'ACTIVE'
            ? 'fixed inset-0 z-[60] w-full h-full overflow-hidden'
            : 'relative w-full h-full overflow-hidden'
        }
      >
        {/* Isolated WebGL Canvas */}
        <GameCanvas engineRef={engineRef} onContainerReady={initEngine} />

        {/* Global In-Game Notification Toasts */}
        <NotificationToast />

        {/* Sky-colour (#1b3a6b) 900ms fade-in curtain + Waking the drift / error fallback */}
        {transitionPhase !== 'IDLE' && transitionPhase !== 'ACTIVE' && (
          <div
            role={transitionPhase === 'ERROR' ? 'alert' : 'status'}
            aria-live="polite"
            style={{
              backgroundColor: LOADER_SKY_COLOR,
              opacity:
                transitionPhase === 'REVEALING'
                  ? 0
                  : transitionPhase === 'FADING_IN' && !curtainOpaque
                  ? 0
                  : 1,
              transitionDuration: transitionPhase === 'REVEALING' ? '450ms' : `${GAME_ROOT_FADE_MS}ms`,
              pointerEvents: transitionPhase === 'REVEALING' ? 'none' : 'auto',
            }}
            className="fixed inset-0 z-[65] flex items-center justify-center p-6 transition-opacity ease-out"
          >
            {transitionPhase === 'WAKING' && (
              <div className="max-w-sm w-full rounded-2xl border border-[#f3ecd8]/25 bg-[#1d2326]/90 px-6 py-5 text-center shadow-2xl">
                <div className="text-xs uppercase tracking-[0.22em] text-[#f6c978] font-serif font-bold mb-2">
                  The Drifting Land
                </div>
                <p className="text-base font-serif text-[#f3ecd8] tracking-wide">
                  Waking the drift…
                </p>
              </div>
            )}

            {transitionPhase === 'ERROR' && (
              <div className="max-w-md w-full rounded-2xl border border-red-400/40 bg-[#1d2326]/95 p-6 text-center shadow-2xl">
                <h2 className="text-base font-serif font-bold uppercase tracking-widest text-[#f6c978] mb-2">
                  Unable to Start Journey
                </h2>
                <p className="text-xs font-mono text-[#f3ecd8]/90 mb-5 leading-relaxed">
                  {transitionError || 'Failed to load game modules. Check your connection and retry.'}
                </p>
                <button
                  onClick={handleRetryTransition}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-b from-[#8a8e8e] to-[#565b5d] border-2 border-[#2f3537] text-[#f3ecd8] font-serif font-bold text-xs uppercase tracking-widest cursor-pointer hover:brightness-110"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
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
            activeSlotId={activeSlotId}
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
          onOpenSaveSlots={() => setIsSaveSlotsOpen(true)}
        />
      )}

      {/* Modal: Save Slots Manager */}
      {isSaveSlotsOpen && (
        <SaveSlotModal
          currentSlotId={activeSlotId}
          onSelectSlot={handleSelectSaveSlot}
          onClose={() => setIsSaveSlotsOpen(false)}
          onSaveReloaded={handleReloadSave}
        />
      )}

      {/* Live Engine Diagnostics Overlay */}
      {settings.showDiagnostics && mode !== 'ERROR' && !isInitializing && (
        <PerformanceOverlay
          diagnostics={diagnostics}
          settings={settings}
          isSoftwareGl={engineRef.current?.isSoftwareGl()}
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
          diagnosticReport={diagnosticReport}
          onRetry={() => {
            if (containerRef.current && !initLockRef.current) {
              initEngine(containerRef.current);
            }
          }}
          onResetSaveAndRetry={() => {
            StorageService.clearSave();
            setHasExistingSave(false);
            if (containerRef.current && !initLockRef.current) {
              initEngine(containerRef.current);
            }
          }}
          onReloadPage={() => window.location.reload()}
        />
      )}
      </div>
    </div>
  );
}
