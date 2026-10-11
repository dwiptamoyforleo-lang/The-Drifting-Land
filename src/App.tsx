/**
 * The Drifting World — Main Application Root
 * Mobile-optimized First-Person Fantasy Exploration Game
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import {
  GameProgress,
  GameSettings,
  InteractableObject,
  PerformanceStats,
  MagicalAnchor,
  WorldFragment,
} from './game/types';
import {
  loadProgress,
  saveProgress,
  clearProgress,
  loadSettings,
  saveSettings,
} from './game/storage';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { SettingsModal } from './components/SettingsModal';
import { JournalModal } from './components/JournalModal';
import { soundSystem } from './game/audio';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // High-level App State
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showJournal, setShowJournal] = useState<boolean>(false);

  // Settings & Progress
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [progress, setProgress] = useState<GameProgress>(loadProgress);

  // In-Game Interaction & UI states
  const [currentPrompt, setCurrentPrompt] = useState<InteractableObject | null>(null);
  const [activeInscription, setActiveInscription] = useState<{ title: string; text: string } | null>(null);
  const [bannerToast, setBannerToast] = useState<{ title: string; subtitle: string; icon?: string } | null>(null);
  const [respawnAlpha, setRespawnAlpha] = useState<number>(0);
  const [stats, setStats] = useState<PerformanceStats>({ fps: 60, drawCalls: 0, triangles: 0 });

  // References to world objects for Archive modal
  const [worldAnchors, setWorldAnchors] = useState<MagicalAnchor[]>([]);
  const [worldFragments, setWorldFragments] = useState<WorldFragment[]>([]);

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

    // Save references to anchor/fragment definitions for the journal
    setWorldAnchors([...engine.world.anchors]);
    setWorldFragments([...engine.world.fragments]);

    // Setup Event Listeners from Engine
    engine.interactions.onStateChange = (state) => {
      setCurrentPrompt(state.currentPrompt);
      setActiveInscription(state.activeInscription);
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
    };

    engine.interactions.onResonanceUnlocked = () => {
      setProgress((prev) => {
        const next = { ...prev, resonanceDiscovered: true };
        saveProgress(next);
        return next;
      });
    };

    engine.onRespawnEffect = (alpha) => {
      setRespawnAlpha(alpha);
    };

    engine.onPerformanceUpdate = (newStats) => {
      setStats(newStats);
    };

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Start exploration from Title Screen
  const handleStartGame = () => {
    setGameStarted(true);
    if (engineRef.current) {
      engineRef.current.start();
      engineRef.current.resume();
    }
    soundSystem.startAudio();
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
    if (engineRef.current) {
      engineRef.current.pause();
    }
  };

  // Settings updates
  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    if (engineRef.current) {
      engineRef.current.applyQualitySettings(newSettings.graphicsQuality);
      engineRef.current.setSensitivity(newSettings.sensitivity);
    }
  };

  // Reset Progress
  const handleResetProgress = () => {
    const cleared = clearProgress();
    setProgress(cleared);
    // Reload page to re-seed clean 3D environment seamlessly
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

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#070b14] select-none touch-none">
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Title Screen (when exploration hasn't started) */}
      {!gameStarted && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenSettings={() => setShowSettings(true)}
          onOpenJournal={() => setShowJournal(true)}
          onResetProgress={handleResetProgress}
          progress={progress}
        />
      )}

      {/* In-Game HUD (when active) */}
      {gameStarted && engineRef.current && (
        <HUD
          player={engineRef.current.player}
          progress={progress}
          currentPrompt={currentPrompt}
          activeInscription={activeInscription}
          bannerToast={bannerToast}
          respawnAlpha={respawnAlpha}
          stats={stats}
          showFps={settings.showFps}
          onPause={handlePause}
          onOpenJournal={() => setShowJournal(true)}
          onCloseInscription={handleCloseInscription}
          onInteract={handleTriggerInteract}
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
          onClose={() => setShowJournal(false)}
        />
      )}
    </div>
  );
}
