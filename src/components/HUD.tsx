/**
 * HUD for THE DRIFTING LAND
 * Complete desktop shortcuts and Android touchscreen controls with virtual joystick,
 * live Player Health & Stamina survival bars, environmental status, interactive Hotbar (1-6),
 * touch look, sprint, jump, interact, primary action, camera switch, crafting, inventory, quests, map, and pause.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pause,
  BookOpen,
  ChevronUp,
  Hand,
  X,
  Thermometer,
  Mountain,
  Video,
  Target,
  Zap,
  Backpack,
  Globe2,
  Heart,
  Hammer,
  Shield,
  Compass,
  Gem,
  Flame,
  Radio,
  Clock,
  Droplet,
  Coffee,
  Activity,
  TreePine,
  Sun,
  Wind,
  Box,
  Key,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import {
  GameProgress,
  InteractableObject,
  PerformanceStats,
  TelemetryData,
  GameSettings,
  PlayerStats,
  InventoryItem,
} from '../game/types';
import { PlayerController } from '../game/player';

interface HUDProps {
  player: PlayerController;
  progress: GameProgress;
  settings: GameSettings;
  playerStats?: PlayerStats;
  damageAlpha?: number;
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
  onOpenInventory?: () => void;
  onOpenCrafting?: () => void;
  onOpenMap?: () => void;
  onCloseInscription: () => void;
  onInteract: () => void;
  onToggleCamera: () => void;
  onHotbarUse?: (slotIndex: number) => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  progress,
  settings,
  playerStats,
  damageAlpha = 0,
  currentPrompt,
  activeInscription,
  bannerToast,
  respawnAlpha,
  stats,
  telemetry,
  onPause,
  onOpenJournal,
  onOpenQuests,
  onOpenInventory,
  onOpenCrafting,
  onOpenMap,
  onCloseInscription,
  onInteract,
  onToggleCamera,
  onHotbarUse,
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickThumbRef = useRef<HTMLDivElement>(null);
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joystickPos, setJoystickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
  }, [player]);

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

  const currentHeading = telemetry.headingDegrees;
  const tapeOffsets = [-60, -40, -20, 0, 20, 40, 60];
  const getHeadingLabel = (deg: number) => {
    const normalized = (deg + 360) % 360;
    if (normalized === 0 || normalized === 360) return 'N';
    if (normalized === 90) return 'E';
    if (normalized === 180) return 'S';
    if (normalized === 270) return 'W';
    return String(normalized);
  };

  const opacityVal = settings.buttonOpacity ?? 0.85;
  const joystickSizeClass =
    settings.joystickSize === 'small' ? 'w-24 h-24' : settings.joystickSize === 'large' ? 'w-36 h-36' : 'w-28 h-28';

  const health = playerStats?.health ?? Math.round(player.health);
  const maxHealth = playerStats?.maxHealth ?? player.maxHealth;
  const healthPercent = Math.max(0, Math.min(100, (health / maxHealth) * 100));

  const stamina = playerStats?.stamina ?? Math.round(player.stamina);
  const maxStamina = playerStats?.maxStamina ?? player.maxStamina;
  const staminaPercent = Math.max(0, Math.min(100, (stamina / maxStamina) * 100));
  const isExhausted = playerStats?.isExhausted ?? player.isExhausted;

  const hotbarSlots = progress.hotbar || [null, null, null, null, null, null];

  const getHotbarItem = (itemId: string | null): InventoryItem | null => {
    if (!itemId) return null;
    return progress.inventory.find((i) => i.id === itemId) || null;
  };

  const renderItemIcon = (iconName: string, className: string = 'w-4 h-4') => {
    switch (iconName) {
      case 'hammer':
      case 'wrench':
        return <Hammer className={className} />;
      case 'flame':
        return <Flame className={className} />;
      case 'shield':
      case 'shield-alert':
      case 'shield-plus':
        return <Shield className={className} />;
      case 'zap':
        return <Zap className={className} />;
      case 'radio':
        return <Radio className={className} />;
      case 'clock':
        return <Clock className={className} />;
      case 'droplet':
        return <Droplet className={className} />;
      case 'coffee':
        return <Coffee className={className} />;
      case 'activity':
        return <Activity className={className} />;
      case 'tree-pine':
        return <TreePine className={className} />;
      case 'mountain':
        return <Mountain className={className} />;
      case 'sun':
        return <Sun className={className} />;
      case 'wind':
        return <Wind className={className} />;
      case 'box':
        return <Box className={className} />;
      case 'key':
        return <Key className={className} />;
      case 'eye':
        return <Eye className={className} />;
      case 'compass':
        return <Compass className={className} />;
      case 'gem':
      default:
        return <Gem className={className} />;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20 font-['Share_Tech_Mono',monospace]">
      {/* Damage Flash Red Vignette */}
      {damageAlpha > 0 && (
        <div
          className="absolute inset-0 pointer-events-none z-45 transition-opacity duration-150"
          style={{
            opacity: damageAlpha,
            background: 'radial-gradient(ellipse at center, rgba(244,63,94,0) 40%, rgba(225,29,72,0.65) 100%)',
          }}
        />
      )}

      {/* Respawn Black Screen */}
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

      {/* Top-Left: Player Title & Survival Stats (Health, Stamina, Location) */}
      <div className="absolute top-4 left-5 pointer-events-auto flex flex-col gap-2">
        <div className="font-['Cinzel'] text-slate-100 tracking-[0.25em] leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          <div className="text-[10px] font-medium tracking-[0.3em] text-slate-400">THE DRIFTING LAND</div>
        </div>

        {/* Health & Stamina HUD Card */}
        <div className="px-3.5 py-2.5 rounded-2xl bg-black/75 border border-white/20 backdrop-blur-md shadow-2xl w-60 sm:w-68 space-y-2">
          {/* Health Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="flex items-center gap-1.5 text-rose-300 font-bold">
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-500/30" />
                HEALTH
              </span>
              <span className="font-mono text-slate-200">
                {health} / {maxHealth}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-200 ${
                  healthPercent > 50
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : healthPercent > 25
                    ? 'bg-gradient-to-r from-amber-500 to-rose-400'
                    : 'bg-rose-500 animate-pulse'
                }`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>

          {/* Stamina Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-500/30" />
                STAMINA
              </span>
              <span className="font-mono text-slate-200">
                {isExhausted ? (
                  <span className="text-rose-400 font-bold animate-pulse text-[10px]">EXHAUSTED</span>
                ) : (
                  `${stamina} / ${maxStamina}`
                )}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-100 ${
                  isExhausted
                    ? 'bg-rose-500'
                    : 'bg-gradient-to-r from-amber-400 to-cyan-400'
                }`}
                style={{ width: `${staminaPercent}%` }}
              />
            </div>
          </div>

          {/* Location & Status Line */}
          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="truncate max-w-[150px]">
              {playerStats?.locationName || 'Sector 01: Observation Deck'}
            </span>
            {playerStats?.hazardLevel === 'danger' ? (
              <span className="text-rose-400 font-bold flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3" /> VOID RISK
              </span>
            ) : (
              <span className="text-emerald-400 font-bold">STABLE</span>
            )}
          </div>
        </div>
      </div>

      {/* Top Center Compass */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-white mb-1 drop-shadow" />
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

      {/* Second-Person Observer View Indicator Badge */}
      {player.cameraMode === 'second_person' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-cyan-950/85 border border-cyan-400/60 backdrop-blur-md text-[10px] font-mono text-cyan-200 flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.35)] animate-pulse pointer-events-none z-20">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>OBSERVER VIEW: {player.activeObserverName || 'Observation Matrix'}</span>
        </div>
      )}

      {/* Top-Right Quests & Quick Nav */}
      <div className="absolute top-4 right-5 flex items-start gap-2.5 pointer-events-auto">
        <div
          onClick={onOpenQuests}
          className="px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black/80 border border-white/20 hover:border-cyan-400/50 backdrop-blur-md text-right shadow-lg cursor-pointer transition-all group"
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
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300/90 font-semibold group-hover:text-amber-200">
              MISSION OBJECTIVE
            </div>
          </div>
          <div className="text-[10px] text-slate-300 group-hover:text-cyan-200 font-mono mt-0.5">
            {progress.resonanceDiscovered
              ? 'TRANSIT CORRIDOR SYNCHRONIZED   PROCEED TO SECTOR 9'
              : `SURVEY TELEMETRY BEACONS [${progress.activatedAnchors.length}/3]`}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleCamera}
            className="px-2.5 py-1.5 rounded-xl bg-black/60 hover:bg-slate-800 text-teal-300 border border-white/20 backdrop-blur-md cursor-pointer transition-colors flex items-center gap-1 text-[10px] font-mono"
            title="Toggle Camera View (V key)"
          >
            <Video className="w-3.5 h-3.5" />
            <span className="uppercase">
              {player.cameraMode === 'first_person' ? '1ST' : player.cameraMode === 'second_person' ? '2ND' : '3RD'}
            </span>
          </button>

          {onOpenCrafting && (
            <button
              onClick={onOpenCrafting}
              className="p-2 rounded-xl bg-black/60 hover:bg-slate-800 text-amber-300 border border-white/20 backdrop-blur-md cursor-pointer transition-colors"
              title="Crafting Workbench (C)"
            >
              <Hammer className="w-4 h-4" />
            </button>
          )}

          {onOpenInventory && (
            <button
              onClick={onOpenInventory}
              className="p-2 rounded-xl bg-black/60 hover:bg-slate-800 text-cyan-300 border border-white/20 backdrop-blur-md cursor-pointer transition-colors"
              title="Inventory Cargo & Equipment (Tab / I)"
            >
              <Backpack className="w-4 h-4" />
            </button>
          )}

          {onOpenMap && (
            <button
              onClick={onOpenMap}
              className="p-2 rounded-xl bg-black/60 hover:bg-slate-800 text-purple-300 border border-white/20 backdrop-blur-md cursor-pointer transition-colors"
              title="Map (M)"
            >
              <Globe2 className="w-4 h-4" />
            </button>
          )}

          {onOpenQuests && (
            <button
              onClick={onOpenQuests}
              className="p-2 rounded-xl bg-black/60 hover:bg-slate-800 text-amber-300 border border-white/20 backdrop-blur-md cursor-pointer transition-colors"
              title="Quests Journal (J)"
            >
              <Target className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenJournal}
            className="p-2 rounded-xl bg-black/60 hover:bg-slate-800 text-cyan-300 border border-white/20 backdrop-blur-md cursor-pointer transition-colors"
            title="Archive Logs"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            onClick={onPause}
            className="p-2 rounded-xl bg-black/60 hover:bg-slate-800 text-slate-200 border border-white/20 backdrop-blur-md cursor-pointer transition-colors"
            title="Pause (Esc)"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Crosshair & Interaction Prompt */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
        <div className="relative w-4 h-4 flex items-center justify-center">
          <div className="w-3.5 h-[1.5px] bg-white/70 drop-shadow" />
          <div className="absolute h-3.5 w-[1.5px] bg-white/70 drop-shadow" />
        </div>
        {currentPrompt && (
          <div className="mt-4 px-3.5 py-1.5 rounded-xl bg-black/85 border border-cyan-400 text-xs text-cyan-300 font-mono tracking-wider backdrop-blur-md animate-pulse shadow-lg">
            [E / TAP] {currentPrompt.prompt}
          </div>
        )}
      </div>

      {/* Bottom Center: Interactive Hotbar (1-6) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-2xl bg-black/75 border border-white/20 backdrop-blur-md shadow-2xl">
        {hotbarSlots.map((itemId, idx) => {
          const item = getHotbarItem(itemId);
          return (
            <button
              key={idx}
              onClick={() => onHotbarUse?.(idx)}
              className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                item
                  ? 'bg-slate-900/90 border-cyan-500/40 hover:border-cyan-400 hover:scale-105 active:scale-95 shadow-md'
                  : 'bg-black/40 border-slate-800/80 text-slate-600'
              }`}
              title={item ? `${item.name} [Press ${idx + 1}]` : `Slot ${idx + 1} Empty`}
            >
              <span className="absolute top-0.5 left-1 text-[8px] font-mono text-slate-400">
                {idx + 1}
              </span>
              {item ? (
                <>
                  <div className="text-cyan-300 mb-0.5">
                    {renderItemIcon(item.icon, 'w-4 h-4 sm:w-5 sm:h-5')}
                  </div>
                  {item.quantity > 1 && (
                    <span className="absolute bottom-0.5 right-1 text-[8px] font-mono text-amber-300 font-bold">
                      x{item.quantity}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[10px] text-slate-700">--</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Right Telemetry */}
      <div className="absolute bottom-4 right-5 pointer-events-auto flex flex-col items-end gap-2">
        <div className="px-3.5 py-2.5 rounded-xl bg-black/70 border border-white/20 backdrop-blur-md w-52 shadow-2xl text-xs space-y-2">
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-0.5">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                Temp
              </span>
              <span className="font-mono text-amber-300">{telemetry.temperatureCelsius} C</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-400 transition-all duration-300"
                style={{ width: `${Math.min(100, (telemetry.temperatureCelsius / 35) * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-0.5">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Mountain className="w-3.5 h-3.5 text-cyan-400" />
                Altitude
              </span>
              <span className="font-mono text-cyan-300">{telemetry.elevationMeters} m</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-300"
                style={{ width: `${Math.min(100, (telemetry.elevationMeters / 2000) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Banner Toast Notification */}
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

      {/* Active Inscription Modal */}
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

      {/* Mobile Touch Virtual Joystick */}
      <div
        ref={joystickBaseRef}
        onTouchStart={handleJoystickTouchStart}
        style={{ opacity: opacityVal }}
        className={`absolute bottom-6 left-6 ${joystickSizeClass} rounded-full border border-cyan-500/30 bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-auto touch-none shadow-xl`}
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

      {/* Mobile Touch Look Swipe Surface */}
      <div
        onTouchStart={handleLookTouchStart}
        className="absolute top-20 right-0 bottom-28 w-1/2 pointer-events-auto touch-none"
        aria-hidden="true"
      />

      {/* Mobile Action Buttons (Right Side) */}
      <div
        style={{ opacity: opacityVal }}
        className="absolute bottom-6 right-58 sm:right-64 flex items-center gap-2 pointer-events-auto"
      >
        {currentPrompt && (
          <button
            onClick={onInteract}
            className="flex flex-col items-center justify-center w-13 h-13 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.8)] active:scale-90 transition-transform cursor-pointer animate-pulse"
            aria-label="Interact"
          >
            <Hand className="w-5 h-5 mb-0.5" />
            <span className="text-[8px] font-bold uppercase">USE</span>
          </button>
        )}
        <button
          onClick={() => {
            player.input.primaryAction = true;
          }}
          className="flex flex-col items-center justify-center w-11 h-11 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-200 active:scale-90 transition-all cursor-pointer"
          title="Primary Action (F)"
        >
          <Zap className="w-4 h-4" />
          <span className="text-[7px] font-bold uppercase">TOOL</span>
        </button>
        <button
          onClick={() => {
            player.input.sprint = !player.input.sprint;
          }}
          className={`flex flex-col items-center justify-center w-11 h-11 rounded-full border text-xs font-bold transition-all cursor-pointer ${
            player.input.sprint
              ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.6)]'
              : 'bg-black/60 border-white/30 text-slate-300'
          }`}
          title="Sprint Toggle"
        >
          <span className="text-[7px]">SPRINT</span>
          <span className="text-[8px] font-mono">{player.input.sprint ? 'ON' : 'OFF'}</span>
        </button>
        <button
          onClick={() => {
            player.input.jump = true;
          }}
          className="flex flex-col items-center justify-center w-13 h-13 rounded-full bg-black/60 hover:bg-slate-800 border border-white/30 text-white backdrop-blur-md active:scale-90 transition-all cursor-pointer"
          aria-label="Jump"
        >
          <ChevronUp className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase">JUMP</span>
        </button>
      </div>
    </div>
  );
};
