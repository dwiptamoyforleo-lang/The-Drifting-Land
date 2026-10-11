import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pause, BookOpen, Compass, Sparkles, ChevronUp, Hand, X } from 'lucide-react';
import { GameProgress, InteractableObject, PerformanceStats } from '../game/types';
import { PlayerController } from '../game/player';

interface HUDProps {
  player: PlayerController;
  progress: GameProgress;
  currentPrompt: InteractableObject | null;
  activeInscription: { title: string; text: string } | null;
  bannerToast: { title: string; subtitle: string; icon?: string } | null;
  respawnAlpha: number;
  stats: PerformanceStats;
  showFps: boolean;
  onPause: () => void;
  onOpenJournal: () => void;
  onCloseInscription: () => void;
  onInteract: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  progress,
  currentPrompt,
  activeInscription,
  bannerToast,
  respawnAlpha,
  stats,
  showFps,
  onPause,
  onOpenJournal,
  onCloseInscription,
  onInteract,
}) => {
  // Joystick touch state
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickThumbRef = useRef<HTMLDivElement>(null);
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joystickPos, setJoystickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Camera touch-look state
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch Handlers for Virtual Joystick
  const handleJoystickTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (joystickTouchIdRef.current !== null) return;

    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;

    if (joystickBaseRef.current) {
      const rect = joystickBaseRef.current.getBoundingClientRect();
      joystickCenterRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  }, []);

  const handleJoystickTouchMove = useCallback((e: TouchEvent) => {
    if (joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const dx = touch.clientX - joystickCenterRef.current.x;
        const dy = touch.clientY - joystickCenterRef.current.y;
        const maxDist = 44; // max radius in pixels
        const dist = Math.hypot(dx, dy);

        let clampedX = dx;
        let clampedY = dy;
        if (dist > maxDist) {
          clampedX = (dx / dist) * maxDist;
          clampedY = (dy / dist) * maxDist;
        }

        setJoystickPos({ x: clampedX, y: clampedY });

        // Update player movement: forward is -dy, right is dx
        player.input.moveForward = -clampedY / maxDist;
        player.input.moveRight = clampedX / maxDist;
        break;
      }
    }
  }, [player]);

  const handleJoystickTouchEnd = useCallback((e: TouchEvent) => {
    if (joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setJoystickPos({ x: 0, y: 0 });
        player.input.moveForward = 0;
        player.input.moveRight = 0;
        break;
      }
    }
  }, [player]);

  // Touch Handlers for Camera Drag Look (right side of screen)
  const handleLookTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    // Only capture if not currently tracking
    if (lookTouchIdRef.current !== null) return;

    const touch = e.changedTouches[0];
    lookTouchIdRef.current = touch.identifier;
    lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleLookTouchMove = useCallback((e: TouchEvent) => {
    if (lookTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        const dx = touch.clientX - lastLookPosRef.current.x;
        const dy = touch.clientY - lastLookPosRef.current.y;

        player.applyLookDelta(dx, dy, true);

        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  }, [player]);

  const handleLookTouchEnd = useCallback((e: TouchEvent) => {
    if (lookTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  }, []);

  // Global window listeners for smooth continuous touch movement
  useEffect(() => {
    window.addEventListener('touchmove', handleJoystickTouchMove, { passive: false });
    window.addEventListener('touchend', handleJoystickTouchEnd);
    window.addEventListener('touchcancel', handleJoystickTouchEnd);

    window.addEventListener('touchmove', handleLookTouchMove, { passive: false });
    window.addEventListener('touchend', handleLookTouchEnd);
    window.addEventListener('touchcancel', handleLookTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleJoystickTouchMove);
      window.removeEventListener('touchend', handleJoystickTouchEnd);
      window.removeEventListener('touchcancel', handleJoystickTouchEnd);

      window.removeEventListener('touchmove', handleLookTouchMove);
      window.removeEventListener('touchend', handleLookTouchEnd);
      window.removeEventListener('touchcancel', handleLookTouchEnd);
    };
  }, [handleJoystickTouchMove, handleJoystickTouchEnd, handleLookTouchMove, handleLookTouchEnd]);

  // Objective formulation based on game progress
  const anchorCount = progress.activatedAnchors.length;
  let objectiveTitle = 'Discover the Ancient Anchors';
  let objectiveDetail = `${anchorCount}/3 Harmonized`;

  if (progress.resonanceDiscovered) {
    objectiveTitle = 'Follow the Resonance';
    objectiveDetail = 'Traverse the Light Bridge to the Drifting Sanctuary';
  } else if (anchorCount === 1) {
    objectiveDetail = '1/3 Harmonized — Seek the High Spire';
  } else if (anchorCount === 2) {
    objectiveDetail = '2/3 Harmonized — Awaken the Meridian Anchor';
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20">
      {/* Fall / Respawn Ethereal Transition Overlay */}
      <div
        className="absolute inset-0 bg-[#08121e] transition-opacity pointer-events-none z-50 flex items-center justify-center"
        style={{ opacity: respawnAlpha }}
      >
        {respawnAlpha > 0.4 && (
          <div className="text-center text-teal-300 font-fantasy text-lg tracking-widest animate-pulse">
            Returning to the Safe Dais...
          </div>
        )}
      </div>

      {/* Top Header Bar */}
      <div className="absolute top-0 inset-x-0 p-4 pt-safe flex items-start justify-between pointer-events-auto">
        {/* Objective Pill */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950/70 border border-teal-500/30 backdrop-blur-md shadow-lg shadow-black/40">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
          <div>
            <div className="text-xs uppercase tracking-widest text-teal-300 font-semibold">
              {objectiveTitle}
            </div>
            <div className="text-[11px] text-slate-300/90 font-light">
              {objectiveDetail}
            </div>
          </div>
        </div>

        {/* Top Right Quick Controls */}
        <div className="flex items-center gap-2">
          {showFps && (
            <div className="px-2.5 py-1 rounded-lg bg-black/60 border border-slate-800 text-[11px] font-mono text-teal-400">
              {stats.fps} FPS
            </div>
          )}

          <button
            onClick={onOpenJournal}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-cyan-300 border border-slate-700/60 backdrop-blur-md cursor-pointer transition-colors active:scale-95"
            aria-label="Archive"
            title="Archive & Journal"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            onClick={onPause}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 backdrop-blur-md cursor-pointer transition-colors active:scale-95"
            aria-label="Pause Menu"
            title="Pause & Settings"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Reticle / Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
        <div className="w-2 h-2 rounded-full border border-teal-300/80 bg-teal-400/40 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />

        {/* Dynamic Contextual Tooltip under reticle */}
        {currentPrompt && (
          <div className="mt-4 px-3 py-1 rounded-lg bg-slate-950/85 border border-teal-400/50 text-xs text-teal-200 font-medium backdrop-blur-md shadow-lg animate-pulse whitespace-nowrap">
            <span className="text-slate-400 mr-1.5">[E / Tap]</span>
            {currentPrompt.prompt}
          </div>
        )}
      </div>

      {/* Discovery Banner Toast Notification */}
      {bannerToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 max-w-sm w-11/12 p-3.5 rounded-2xl bg-gradient-to-r from-slate-950/90 via-teal-950/90 to-slate-950/90 border border-teal-400/60 shadow-[0_0_24px_rgba(20,184,166,0.35)] backdrop-blur-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-teal-300">
              {bannerToast.title}
            </div>
            <div className="text-xs text-slate-200">
              {bannerToast.subtitle}
            </div>
          </div>
        </div>
      )}

      {/* Inscription Reading Modal Overlay */}
      {activeInscription && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
          <div className="max-w-md w-full p-6 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-teal-500/40 shadow-2xl text-center relative">
            <button
              onClick={onCloseInscription}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 mx-auto rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-300 mb-3">
              <Compass className="w-5 h-5" />
            </div>

            <h3 className="font-fantasy text-xl font-bold text-teal-200 tracking-wide mb-3">
              {activeInscription.title}
            </h3>

            <p className="text-sm text-slate-300/90 leading-relaxed font-light italic mb-6">
              &ldquo;{activeInscription.text}&rdquo;
            </p>

            <button
              onClick={onCloseInscription}
              className="px-6 py-2 rounded-xl bg-teal-600/80 hover:bg-teal-500 text-white text-xs font-medium uppercase tracking-wider transition-all"
            >
              Close Inscription
            </button>
          </div>
        </div>
      )}

      {/* MOBILE TOUCH CONTROLS */}
      {/* 1. Virtual Movement Joystick (Bottom-Left) */}
      <div
        ref={joystickBaseRef}
        onTouchStart={handleJoystickTouchStart}
        className="absolute bottom-8 left-8 w-28 h-28 rounded-full border border-teal-500/30 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center pointer-events-auto touch-none shadow-lg shadow-black/50"
      >
        {/* Outer boundary ring */}
        <div className="absolute inset-2 rounded-full border border-teal-500/15 border-dashed" />
        {/* Thumb knob */}
        <div
          ref={joystickThumbRef}
          style={{
            transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
          }}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-teal-600 to-cyan-400 shadow-[0_0_12px_rgba(45,212,191,0.6)] border border-white/40 pointer-events-none transition-transform duration-75"
        />
      </div>

      {/* 2. Touch Look Drag Surface (Right Half) */}
      <div
        onTouchStart={handleLookTouchStart}
        className="absolute top-20 right-0 bottom-28 w-1/2 pointer-events-auto touch-none"
        aria-hidden="true"
      />

      {/* 3. Action Buttons (Bottom-Right) */}
      <div className="absolute bottom-8 right-8 flex items-center gap-4 pointer-events-auto">
        {/* Contextual Interact Button (Glows when near object) */}
        {currentPrompt && (
          <button
            onClick={onInteract}
            className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 border border-white/60 text-white shadow-[0_0_24px_rgba(45,212,191,0.7)] active:scale-90 transition-transform cursor-pointer animate-pulse"
            aria-label="Interact"
          >
            <Hand className="w-6 h-6 mb-0.5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Interact</span>
          </button>
        )}

        {/* Jump Button */}
        <button
          onClick={() => {
            player.input.jump = true;
          }}
          className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-slate-900/70 hover:bg-slate-800/80 active:scale-90 border border-teal-500/40 text-teal-200 backdrop-blur-md shadow-lg shadow-black/50 transition-all cursor-pointer"
          aria-label="Jump"
        >
          <ChevronUp className="w-7 h-7" />
          <span className="text-[9px] uppercase tracking-wider font-semibold">Jump</span>
        </button>
      </div>
    </div>
  );
};
