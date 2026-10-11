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
  });

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

      // Award +250 XP for attuning a quantum anchor!
      setUserProfile((prev) => {
        const newXp = prev.xp + 250;
        const newLevel = Math.floor(newXp / 800) + 1;
        const updated = { ...prev, xp: newXp, level: Math.max(prev.level, newLevel) };
        saveUserProfile(updated);
        return updated;
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

  // Launch directly into a chosen Sector
  const handleSelectSectorAndLaunch = (sectorId: number) => {
    const sector = SECTORS.find((s) => s.id === sectorId) || SECTORS[0];

    if (engineRef.current) {
      // Teleport character to chosen sector's spawn location safely on solid floor
      engineRef.current.player.position.set(
        sector.spawnPoint[0],
        Math.max(4.2, sector.spawnPoint[1]),
        sector.spawnPoint[2]
      );
      engineRef.current.player.velocity.set(0, 0, 0);
      engineRef.current.player.isGrounded = true;
      engineRef.current.player.setCheckpoint(new THREE.Vector3(...sector.spawnPoint));
    }

    // Award +50 flight XP for deploying
    setUserProfile((prev) => {
      const updated = { ...prev, selectedSector: sectorId, xp: prev.xp + 50 };
      saveUserProfile(updated);
      return updated;
    });

    handleStartGame();
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

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#070b14] select-none touch-none">
      {/* 0. Mandatory Orientation Lock Gate (Landscape Required) */}
      <OrientationLockModal />

      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Title Screen (when exploration hasn't started and not selecting sector) */}
      {!gameStarted && !showSectorSelect && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenSectorSelect={() => setShowSectorSelect(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenJournal={() => setShowJournal(true)}
          onResetProgress={handleResetProgress}
          progress={progress}
        />
      )}

      {/* Level / Sector Select Screen & User Profile (XP & Username) */}
      {showSectorSelect && (
        <SectorSelectModal
          userProfile={userProfile}
          progress={progress}
          onUpdateProfile={handleUpdateProfile}
          onSelectSectorAndLaunch={handleSelectSectorAndLaunch}
          onBackToTitle={() => setShowSectorSelect(false)}
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
          telemetry={telemetry}
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
