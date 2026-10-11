/**
 * HUD for THE DRIFTING LAND
 * Faithfully matches the exact UI and layout in image_a02531e0.jpg:
 * - Top-Left: "THE DRIFTING LAND" elegant serif typography
 * - Top-Center: Horizontal scrolling compass heading tape (degrees 100 - 240)
 * - Top-Right: "EXPLORE THE DRIFTING LANDS" mission objective banner
 * - Center: Precise '+' crosshair
 * - Bottom-Right: Temperature meter, Elevation meter with glowing diamond indicator, build info
 * - Mobile Touch Controls: Virtual joystick, touch-look surface, jump & contextual interact
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pause, BookOpen, ChevronUp, Hand, X, Thermometer, Mountain, Eye, Video, Target } from 'lucide-react';
import { GameProgress, InteractableObject, PerformanceStats, TelemetryData, CameraMode } from '../game/types';
import { PlayerController } from '../game/player';

interface HUDProps {
  player: PlayerController;
  progress: GameProgress;
  currentPrompt: InteractableObject | null;
  activeInscription: { title: string; text: string } | null;
  bannerToast: { title: string; subtitle: string; icon?: string } | null;
  respawnAlpha: number;
  stats: PerformanceStats;
  telemetry: TelemetryData;
  showFps: boolean;
  onPause: () => void;
  onOpenJournal: () => void;
  onOpenQuests?: () => void;
  onCloseInscription: () => void;
  onInteract: () => void;
  onToggleCamera: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  progress,
  currentPrompt,
  activeInscription,
  bannerToast,
  respawnAlpha,
  stats,
  telemetry,
  showFps,
  onPause,
  onOpenJournal,
  onOpenQuests,
  onCloseInscription,
  onInteract,
  onToggleCamera,
}) => {
  // Virtual joystick touch state
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
        const maxDist = 44;
        const dist = Math.hypot(dx, dy);

        let clampedX = dx;
        let clampedY = dy;
        if (dist > maxDist) {
          clampedX = (dx / dist) * maxDist;
          clampedY = (dy / dist) * maxDist;
        }

        setJoystickPos({ x: clampedX, y: clampedY });

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

  // Touch Handlers for Camera Look
  const handleLookTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
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

  // Calculate compass tape ticks based on current heading
  const currentHeading = telemetry.headingDegrees;
  // Render a window of degrees centered on currentHeading
  const tapeOffsets = [-60, -40, -20, 0, 20, 40, 60];

  const getHeadingLabel = (deg: number) => {
    const normalized = (deg + 360) % 360;
    if (normalized === 0 || normalized === 360) return 'N';
    if (normalized === 90) return 'E';
    if (normalized === 180) return 'S';
    if (normalized === 270) return 'W';
    return String(normalized);
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20 font-['Share_Tech_Mono',monospace]">
      {/* Ethereal Respawn Fade Overlay */}
      <div
        className="absolute inset-0 bg-[#070b14] transition-opacity pointer-events-none z-50 flex items-center justify-center"
        style={{ opacity: respawnAlpha }}
      >
        {respawnAlpha > 0.4 && (
          <div className="text-center text-cyan-300 font-['Cinzel'] text-xl tracking-widest animate-pulse">
            RETURNING TO OBSERVATION DECK...
          </div>
        )}
      </div>

      {/* 1. TOP-LEFT TITLE: "THE DRIFTING LAND" (Exact Typography from Image!) */}
      <div className="absolute top-5 left-6 pointer-events-auto">
        <div className="font-['Cinzel'] text-slate-100 tracking-[0.25em] leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          <div className="text-[11px] font-medium tracking-[0.35em] text-slate-300/80 mb-1">THE</div>
          <div className="text-2xl sm:text-3xl font-bold tracking-[0.2em] text-white">DRIFTING</div>
          <div className="text-2xl sm:text-3xl font-bold tracking-[0.2em] text-white mt-0.5">LAND</div>
        </div>
      </div>

      {/* 2. TOP-CENTER COMPASS TAPE (Exact Match from Screenshot Header!) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
        {/* Downward Reticle Marker */}
        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-white mb-1 drop-shadow" />

        {/* Compass Tape Numbers & Ticks */}
        <div className="flex items-center gap-6 px-4 py-1 rounded bg-black/45 border-y border-white/20 text-xs font-mono text-slate-300 backdrop-blur-sm">
          {tapeOffsets.map((offset) => {
            const deg = currentHeading + offset;
            const isCenter = offset === 0;
            return (
              <div key={offset} className={`flex flex-col items-center ${isCenter ? 'text-white font-bold scale-110' : 'text-slate-400/80'}`}>
                <span className="text-[10px] leading-tight">{getHeadingLabel(deg)}</span>
                <span className={`w-0.5 ${isCenter ? 'h-3 bg-white' : 'h-1.5 bg-slate-500'}`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. TOP-RIGHT OBJECTIVE & CONTROLS BANNER (Exact Match from Screenshot!) */}
      <div className="absolute top-5 right-6 flex items-start gap-3 pointer-events-auto">
        <div
          onClick={onOpenQuests}
          className="px-4 py-2 rounded bg-black/60 hover:bg-black/80 border border-white/20 hover:border-cyan-400/50 backdrop-blur-md text-right shadow-lg cursor-pointer transition-all group"
          title="Click to view Mission Objectives & Quests"
        >
          <div className="flex items-center justify-end gap-2 mb-0.5">
            {telemetry.timeOfDay === 'red_moon' ? (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500 text-rose-300 font-bold animate-pulse">
                RED MOON ECLIPSE
              </span>
            ) : (
              <span className="text-[9px] font-mono text-cyan-300">
                {telemetry.timeLabel || 'SOLAR CYCLE'}
              </span>
            )}
            <div className="text-[11px] uppercase tracking-[0.2em] text-amber-300/90 font-semibold group-hover:text-amber-200">
              EXPLORE THE DRIFTING LANDS
            </div>
          </div>
          <div className="text-[10px] text-slate-300 group-hover:text-cyan-200 font-mono mt-0.5">
            {progress.resonanceDiscovered
              ? 'TRANSIT CORRIDOR SYNCHRONIZED · PROCEED TO SECTOR 9'
              : `SURVEY TELEMETRY BEACONS [${progress.activatedAnchors.length}/3]`}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleCamera}
            className="px-2.5 py-1.5 rounded bg-black/60 hover:bg-slate-800 text-teal-300 border border-white/20 backdrop-blur-md cursor-pointer transition-colors flex items-center gap-1 text-[10px] font-mono"
            title="Toggle Perspective (First-Person / Third-Person / Second-Person)"
          >
            <Video className="w-3.5 h-3.5" />
            <span className="uppercase">
              {player.cameraMode === 'first_person' ? '1ST' : player.cameraMode === 'second_person' ? '2ND' : '3RD'}
            </span>
          </button>
          {onOpenQuests && (
            <button
              onClick={onOpenQuests}
              className="p-2 rounded bg-black/60 hover:bg-slate-800 text-amber-300 border border-white/20 backdrop-blur-md cursor-pointer transition-colors"
              title="Quests & Missions"
            >
              <Target className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onOpenJournal}
            className="p-2 rounded bg-black/60 hover:bg-slate-800 text-cyan-300 border border-white/20 backdrop-blur-md cursor-pointer transition-colors"
            title="Telemetry Logs"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <button
            onClick={onPause}
            className="p-2 rounded bg-black/60 hover:bg-slate-800 text-slate-200 border border-white/20 backdrop-blur-md cursor-pointer transition-colors"
            title="System Settings"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. CENTER RETICLE: Subtle Precision '+' Crosshair (Exact Match from Screenshot!) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
        <div className="relative w-4 h-4 flex items-center justify-center">
          <div className="w-3.5 h-[1.5px] bg-white/70 drop-shadow" />
          <div className="absolute h-3.5 w-[1.5px] bg-white/70 drop-shadow" />
        </div>

        {/* Dynamic Context Prompt */}
        {currentPrompt && (
          <div className="mt-4 px-3 py-1 rounded bg-black/80 border border-cyan-400 text-xs text-cyan-300 font-mono tracking-wider backdrop-blur-md animate-pulse">
            [E / TAP] {currentPrompt.prompt}
          </div>
        )}
      </div>

      {/* 5. BOTTOM-RIGHT TELEMETRY METERS & BUILD INFO (Exact Match from Screenshot!) */}
      <div className="absolute bottom-5 right-6 pointer-events-auto flex flex-col items-end gap-2">
        <div className="px-4 py-3 rounded-lg bg-black/70 border border-white/20 backdrop-blur-md w-56 shadow-2xl text-xs space-y-2.5">
          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                Temperature
              </span>
              <span className="font-mono text-amber-300">{telemetry.temperatureCelsius}°C</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-400 transition-all duration-300"
                style={{ width: `${Math.min(100, (telemetry.temperatureCelsius / 35) * 100)}%` }}
              />
            </div>
          </div>

          {/* Elevation */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Mountain className="w-3.5 h-3.5 text-cyan-400" />
                Elevation
              </span>
              <span className="font-mono text-cyan-300">{telemetry.elevationMeters} m</span>
            </div>
            <div className="relative w-full h-1.5 rounded-full bg-slate-800 flex items-center">
              <div
                className="h-full bg-cyan-400 transition-all duration-300"
                style={{ width: `${Math.min(100, (telemetry.elevationMeters / 2000) * 100)}%` }}
              />
              {/* Glowing diamond milestone indicator matching screenshot! */}
              <div
                className="absolute w-2.5 h-2.5 bg-slate-100 rotate-45 shadow-[0_0_8px_rgba(56,189,248,0.9)] border border-cyan-400"
                style={{ right: '4px' }}
              />
            </div>
          </div>
        </div>

        {/* Build & Engine Readout matching bottom right of screenshot */}
        <div className="text-[10px] text-slate-400/80 font-mono tracking-wider">
          BUILD V1.2.7 | FPS: {stats.fps} | ENGINE: THREE.JS (WEBGL)
        </div>
      </div>

      {/* Discovery Banner Toast Notification */}
      {bannerToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 max-w-sm w-11/12 p-3 rounded-xl bg-black/85 border border-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.4)] backdrop-blur-md pointer-events-auto">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-300">
            {bannerToast.title}
          </div>
          <div className="text-xs text-slate-200 mt-0.5">
            {bannerToast.subtitle}
          </div>
        </div>
      )}

      {/* Inscription Terminal Log Modal */}
      {activeInscription && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm pointer-events-auto">
          <div className="max-w-md w-full p-6 rounded-2xl bg-slate-950 border border-cyan-400/60 shadow-2xl relative text-left">
            <button
              onClick={onCloseInscription}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-xs font-mono text-cyan-400 tracking-widest uppercase mb-1">
              TERMINAL TELEMETRY ARCHIVE
            </div>
            <h3 className="font-['Cinzel'] text-xl font-bold text-white mb-4">
              {activeInscription.title}
            </h3>

            <p className="text-sm font-mono text-slate-300 leading-relaxed mb-6 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              {activeInscription.text}
            </p>

            <button
              onClick={onCloseInscription}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all"
            >
              DISMISS LOG
            </button>
          </div>
        </div>
      )}

      {/* MOBILE CONTROLS (Optimized for Android Touchscreens) */}
      {/* 1. Virtual Joystick (Bottom-Left) */}
      <div
        ref={joystickBaseRef}
        onTouchStart={handleJoystickTouchStart}
        className="absolute bottom-8 left-8 w-28 h-28 rounded-full border border-cyan-500/30 bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-auto touch-none shadow-xl"
      >
        <div className="absolute inset-2 rounded-full border border-cyan-500/15 border-dashed" />
        <div
          ref={joystickThumbRef}
          style={{
            transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
          }}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-400 shadow-[0_0_12px_rgba(6,182,212,0.6)] border border-white/50 pointer-events-none transition-transform duration-75"
        />
      </div>

      {/* 2. Touch-Look Drag Surface (Right Half of Screen) */}
      <div
        onTouchStart={handleLookTouchStart}
        className="absolute top-20 right-0 bottom-28 w-1/2 pointer-events-auto touch-none"
        aria-hidden="true"
      />

      {/* 3. Mobile Jump & Interact Buttons */}
      <div className="absolute bottom-8 right-64 flex items-center gap-3 pointer-events-auto">
        {currentPrompt && (
          <button
            onClick={onInteract}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.8)] active:scale-90 transition-transform cursor-pointer animate-pulse"
            aria-label="Interact"
          >
            <Hand className="w-5 h-5 mb-0.5" />
            <span className="text-[8px] font-bold uppercase">USE</span>
          </button>
        )}

        <button
          onClick={() => {
            player.input.jump = true;
          }}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-black/60 hover:bg-slate-800 border border-white/30 text-white backdrop-blur-md active:scale-90 transition-all cursor-pointer"
          aria-label="Jump"
        >
          <ChevronUp className="w-6 h-6" />
          <span className="text-[8px] font-bold uppercase">JUMP</span>
        </button>
      </div>
    </div>
  );
};
