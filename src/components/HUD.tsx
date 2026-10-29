/**
 * In-Game HUD for The Drifting Land.
 * Designed with strict low-occlusion discipline (>85% viewport unobstructed).
 * - Zero backdrop-filter over WebGL
 * - Tabular numbers for health, stamina, shards, XP, and level
 * - Collapsible bottom dock for cinema / exploration zen mode
 * - Integrated mobile virtual joystick & touch action triggers
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  Zap,
  Sparkles,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Compass,
  Radio,
  Package,
  BookOpen,
  Cloud,
  Eye,
  Map,
  Wrench,
  Skull,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { ShardRelic, CrimsonWardenState, EquippedGear, QuestDefinition } from '../types/game';
import { getItemDef } from '../data/items';

interface HUDProps {
  stats: {
    health: number;
    maxHealth: number;
    stamina: number;
    maxStamina: number;
    level: number;
    experience: number;
    experienceToNext: number;
  };
  timeState: {
    phase: string;
    cycleTime: number;
    dayCount: number;
    isRedMoon: boolean;
    clockTime?: string;
    nextTransitionLabel?: string;
    nextTransitionSeconds?: number;
  };
  bossState?: CrimsonWardenState | null;
  weatherName: string;
  relics: {
    shards: ShardRelic[];
    collectedCount: number;
    totalCount: number;
  };
  beaconActivated: boolean;
  interactionPrompt: string | null;
  cameraLabel: string;
  trackedQuest?: {
    def: QuestDefinition;
    activeObjectiveText: string;
  } | null;
  hotbar?: (string | null)[];
  equipped?: EquippedGear;
  onUseHotbarSlot?: (slotIndex: number) => void;
  onSwitchCamera: () => void;
  onOpenMap: () => void;
  onInteract: () => void;
  onOpenInventory: () => void;
  onOpenQuests: () => void;
  onTogglePause: () => void;
  onToggleSound: () => void;
  soundEnabled: boolean;
  onToggleRedMoon: () => void;
  onOpenDevPanel?: () => void;
  showTouchControls: boolean;
  onJoystickMove: (x: number, y: number) => void;
  onTouchAction: (action: 'jump' | 'dash' | 'interact' | 'sprint', active: boolean) => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  timeState,
  bossState,
  weatherName,
  relics,
  beaconActivated,
  interactionPrompt,
  cameraLabel,
  trackedQuest,
  hotbar = [null, null, null, null, null, null],
  equipped = { head: null, body: null, tool: null, accessory: null },
  onUseHotbarSlot,
  onSwitchCamera,
  onOpenMap,
  onInteract,
  onOpenInventory,
  onOpenQuests,
  onTogglePause,
  onToggleSound,
  soundEnabled,
  onToggleRedMoon,
  onOpenDevPanel,
  showTouchControls,
  onJoystickMove,
  onTouchAction,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Virtual joystick touch tracking
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const [joystickThumb, setJoystickThumb] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  const joyCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hotbar keyboard keys 1..6
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key >= '1' && e.key <= '6') {
        const slotIdx = parseInt(e.key, 10) - 1;
        if (slotIdx >= 0 && slotIdx < 6) {
          onUseHotbarSlot?.(slotIdx);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUseHotbarSlot]);

  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    if (joystickRef.current) {
      const rect = joystickRef.current.getBoundingClientRect();
      joyCenterRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        const dx = touch.clientX - joyCenterRef.current.x;
        const dy = touch.clientY - joyCenterRef.current.y;
        const maxDist = 42;
        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);

        const thumbX = Math.cos(angle) * clampedDist;
        const thumbY = Math.sin(angle) * clampedDist;
        setJoystickThumb({ x: thumbX, y: thumbY });

        // Normalize to -1..1
        onJoystickMove(thumbX / maxDist, thumbY / maxDist);
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setJoystickThumb({ x: 0, y: 0 });
        onJoystickMove(0, 0);
        break;
      }
    }
  };

  // Keyboard shortcut 'H' to toggle dock
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const xpPercent = Math.min(100, Math.round((stats.experience / Math.max(1, stats.experienceToNext)) * 100));

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-3 sm:p-6 overflow-hidden">
      {/* Top Bar Perimeter Clusters */}
      <div className="flex items-start justify-between w-full gap-2">
        {/* Top-Left: Player Vital Status & Quest Objective */}
        <div className="flex flex-col gap-2">
          {/* Player Vital Status Cluster */}
        <div className="flex flex-col gap-1.5 sm:gap-2 bg-[#0c121d]/90 border border-slate-800/90 rounded-2xl p-2.5 sm:p-3 shadow-xl max-w-xs pointer-events-auto">
          {/* Level Badge & XP bar */}
          <div className="flex items-center justify-between text-xs font-mono mb-0.5">
            <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px] sm:text-xs">
              LVL {stats.level}
            </span>
            <span className="text-[10px] text-slate-400 tabular-nums">
              XP {stats.experience}/{stats.experienceToNext}
            </span>
          </div>
          <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mb-0.5 sm:mb-1">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-200"
              style={{ width: `${xpPercent}%` }}
            />
          </div>

          {/* Health Bar */}
          <div className="flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
            <div className="w-24 sm:w-40 h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-emerald-400 rounded-full transition-all duration-150"
                style={{ width: `${(stats.health / stats.maxHealth) * 100}%` }}
              />
            </div>
            <span className="text-[11px] sm:text-xs font-mono tabular-nums text-slate-300 font-medium">
              {stats.health}
            </span>
          </div>

          {/* Stamina Bar */}
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <div className="w-24 sm:w-40 h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-100"
                style={{ width: `${(stats.stamina / stats.maxStamina) * 100}%` }}
              />
            </div>
            <span className="text-[11px] sm:text-xs font-mono tabular-nums text-slate-300 font-medium">
              {stats.stamina}
            </span>
          </div>
        </div>

        {/* Active Quest Objective HUD Widget */}
        {trackedQuest && (
          <button
            onClick={onOpenQuests}
            className="pointer-events-auto bg-[#0c121d]/95 hover:bg-[#152238] border border-amber-500/50 rounded-2xl px-3 py-2 shadow-xl flex items-center gap-2 transition-all max-w-[220px] sm:max-w-xs text-left cursor-pointer"
            title="Tracked Quest Objective — Click or press [J] to open Codex"
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono text-amber-300 font-bold truncate">
                {trackedQuest.def.title}
              </span>
              <span className="text-[10px] font-mono text-slate-300 truncate">
                {trackedQuest.activeObjectiveText}
              </span>
            </div>
          </button>
        )}
      </div>

        {/* Top-Center: Crimson Warden Boss Bar (or Camera Badge) */}
        <div className="pointer-events-auto flex flex-col items-center flex-1 max-w-sm sm:max-w-md mx-2">
          {bossState?.active ? (
            <div className="w-full flex flex-col items-center bg-[#150508]/95 border-2 border-red-600/80 rounded-2xl p-2 sm:p-2.5 shadow-2xl animate-pulse">
              <div className="w-full flex items-center justify-between text-xs font-mono mb-1">
                <div className="flex items-center gap-1.5 text-red-300 font-bold tracking-wider">
                  <Skull className="w-4 h-4 text-red-500 animate-spin" />
                  <span className="text-[11px] sm:text-xs">CRIMSON WARDEN</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    bossState.phase === 2
                      ? 'bg-red-800 text-white animate-bounce'
                      : 'bg-red-950 text-red-300'
                  }`}
                >
                  {bossState.phase === 2 ? 'PHASE 2: ENRAGED' : 'PHASE 1'}
                </span>
                <span className="text-[11px] font-mono tabular-nums text-red-200">
                  {bossState.health} / {bossState.maxHealth}
                </span>
              </div>

              {/* Boss HP Bar */}
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-red-800/80">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-rose-400 rounded-full transition-all duration-150"
                  style={{ width: `${(bossState.health / bossState.maxHealth) * 100}%` }}
                />
              </div>

              {/* Attack Warning Banner */}
              {bossState.attackWarning && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-300 font-bold uppercase tracking-wider animate-bounce">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span>
                    WARNING: {bossState.attackWarning.type} ({Math.round(bossState.attackWarning.progress * 100)}%)
                  </span>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onSwitchCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0c121d]/90 hover:bg-[#1a2332] active:bg-[#253245] border border-cyan-500/30 text-cyan-300 shadow-xl transition-all cursor-pointer group"
              title="Switch Camera Perspective (V)"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
              <span className="font-mono font-bold tracking-wider text-[10px] sm:text-[11px]">
                {cameraLabel}
              </span>
              <span className="hidden sm:inline-block text-[9px] text-cyan-500/70 font-mono ml-0.5">
                [V]
              </span>
            </button>
          )}
        </div>

        {/* Top-Right: Celestial Time, Countdown, Weather & Dev Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          <div className="bg-[#0c121d]/90 border border-slate-800/90 rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-xl flex items-center gap-2 sm:gap-2.5">
            {/* Phase & Clock */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono">
              {timeState.phase === 'RED_MOON' ? (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 animate-pulse" />
              ) : timeState.phase === 'NIGHT' ? (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-300" />
              ) : (
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              )}
              <span
                className={`font-semibold tracking-wider ${
                  timeState.phase === 'RED_MOON' ? 'text-red-400' : 'text-slate-200'
                }`}
              >
                {timeState.phase}
              </span>
              {timeState.clockTime && (
                <span className="text-cyan-300 font-bold tabular-nums">
                  {timeState.clockTime}
                </span>
              )}
            </div>

            {/* Countdown to next sunrise / sunset */}
            {timeState.nextTransitionLabel && typeof timeState.nextTransitionSeconds === 'number' && (
              <>
                <span className="w-px h-3 bg-slate-700 hidden md:block" />
                <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 tabular-nums hidden md:inline">
                  {timeState.nextTransitionLabel} in{' '}
                  <span className="text-amber-300 font-bold">
                    {Math.floor(timeState.nextTransitionSeconds / 60)
                      .toString()
                      .padStart(2, '0')}
                    :
                    {Math.floor(timeState.nextTransitionSeconds % 60)
                      .toString()
                      .padStart(2, '0')}
                  </span>
                </span>
              </>
            )}

            <span className="w-px h-3 bg-slate-700 hidden sm:block" />

            {/* Weather indicator */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-cyan-300">
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate max-w-[80px]">{weatherName}</span>
            </div>

            <span className="w-px h-3 bg-slate-700 hidden sm:block" />

            <span className="text-[11px] sm:text-xs font-mono text-slate-400 tabular-nums hidden sm:inline">
              DAY {timeState.dayCount}
            </span>
          </div>

          {/* Dev Suite Trigger Button */}
          {onOpenDevPanel && (
            <button
              onClick={onOpenDevPanel}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-2xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/50 text-[11px] sm:text-xs font-mono text-amber-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              title="Open Developer Testing Suite (F1 or `)"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">DEV</span>
            </button>
          )}

          <button
            onClick={onTogglePause}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-[#0c121d]/90 hover:bg-[#1a2332] border border-slate-800/90 text-[11px] sm:text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            ESC
          </button>
        </div>
      </div>

      {/* Middle Interaction Prompt Banner (Centered) */}
      {interactionPrompt && (
        <div className="my-auto mx-auto pointer-events-auto transition-all animate-bounce">
          <button
            onClick={onInteract}
            className="px-5 py-2.5 rounded-full bg-emerald-950/95 border border-emerald-400/80 text-emerald-100 font-medium text-xs sm:text-sm tracking-wide shadow-2xl flex items-center gap-2.5 cursor-pointer hover:bg-emerald-900"
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>{interactionPrompt}</span>
          </button>
        </div>
      )}

      {/* Bottom Area: Left Relic Tracker + Center Collapsible Dock */}
      <div className="relative w-full flex flex-col items-center">
        {/* Bottom Left Relics Recovered Badge */}
        <div className="hidden sm:flex absolute left-0 bottom-2 pointer-events-auto bg-[#0c121d]/90 border border-slate-800/90 rounded-2xl px-3.5 py-2 shadow-xl items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Drift Shards
            </span>
            <span className="text-xs font-mono font-bold text-emerald-300 tabular-nums">
              {relics.collectedCount} / {relics.totalCount}
            </span>
          </div>

          {beaconActivated && (
            <div className="ml-2 px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-[10px] font-mono text-emerald-300">
              BEACON AWAKENED
            </div>
          )}
        </div>

        {/* Unified Bottom Dock (Pinned to Bottom-Center) */}
        <div className="pointer-events-auto flex flex-col items-center">
          {/* Quick Hotbar (6 Slots) */}
          <div className="mb-2 flex items-center gap-1.5 sm:gap-2 bg-[#080d16]/95 border border-slate-800/90 rounded-2xl p-1.5 shadow-2xl">
            {hotbar.map((itemId, idx) => {
              const def = itemId ? getItemDef(itemId) : null;
              const isEquipped = itemId
                ? Object.values(equipped).includes(itemId)
                : false;

              return (
                <button
                  key={idx}
                  onClick={() => onUseHotbarSlot?.(idx)}
                  className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none ${
                    isEquipped
                      ? 'bg-amber-950/70 border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.35)]'
                      : def
                      ? 'bg-[#121c2d]/90 border border-slate-700/80 hover:border-slate-500 hover:bg-[#1a273e]'
                      : 'bg-slate-900/40 border border-slate-800/60 hover:border-slate-700'
                  }`}
                  title={
                    def
                      ? `[${idx + 1}] ${def.name} - ${
                          def.category === 'recovery'
                            ? 'Click or [Key] to Consume'
                            : isEquipped
                            ? 'Equipped (Click to Unequip)'
                            : 'Click to Equip'
                        }`
                      : `Slot ${idx + 1} (Empty - assign in Inventory [I])`
                  }
                >
                  {/* Slot index keybadge */}
                  <span className="absolute top-1 left-1.5 text-[9px] font-mono text-slate-400 font-bold leading-none pointer-events-none">
                    {idx + 1}
                  </span>

                  {/* Item icon or placeholder */}
                  {def ? (
                    <span className="text-base sm:text-lg select-none">
                      {def.icon || '📦'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-600 font-mono select-none">
                      -
                    </span>
                  )}

                  {/* Equipped marker indicator */}
                  {isEquipped && (
                    <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Collapse/Expand Toggle Button */}
          <button
            onClick={() => setDockCollapsed((prev) => !prev)}
            aria-label="Toggle Control Dock"
            className="mb-1.5 px-3 py-1 rounded-full bg-[#0c121d]/90 hover:bg-[#1a2332] border border-slate-800/90 text-slate-400 hover:text-slate-200 text-[11px] font-mono flex items-center gap-1 shadow-md transition-colors cursor-pointer"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show Dock (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Hide Dock (H)</span>
              </>
            )}
          </button>

          {/* Dock Body */}
          <div
            className={`transition-all duration-300 ease-out origin-bottom ${
              dockCollapsed
                ? 'opacity-0 translate-y-12 pointer-events-none h-0 overflow-hidden'
                : 'opacity-100 translate-y-0'
            }`}
          >
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-[#0c121d]/95 border border-slate-800/90 shadow-2xl">
              {/* Regional Chart / Map Button */}
              <button
                onClick={onOpenMap}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-cyan-300 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
                title="Regional Navigation Chart (M)"
              >
                <Map className="w-3.5 h-3.5 text-cyan-400" />
                <span>Chart [M]</span>
              </button>

              {/* Camera Perspective Mode Switcher */}
              <button
                onClick={onSwitchCamera}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-cyan-300 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
                title="Cycle Camera Perspective (V)"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Cam [V]</span>
              </button>

              {/* Inventory Button */}
              <button
                onClick={onOpenInventory}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-emerald-300 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
                title="Open Pouch (I / Tab)"
              >
                <Package className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pouch [I]</span>
              </button>

              {/* Quest Log Button */}
              <button
                onClick={onOpenQuests}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-amber-300 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
                title="Open Quests (J / Q)"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Quests [J]</span>
              </button>

              {/* Sound Toggle */}
              <button
                onClick={onToggleSound}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
                title="Toggle Audio"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
              </button>

              {/* Red Moon Toggle */}
              <button
                onClick={onToggleRedMoon}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-red-400 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
                title="Celestial Alignment Event"
              >
                <Radio className="w-3.5 h-3.5 text-red-400" />
                <span>Red Moon</span>
              </button>

              {/* Primary Action Button */}
              <button
                onClick={onInteract}
                className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Action [E]</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Touch Controls Layer */}
      {showTouchControls && (
        <div className="pointer-events-none absolute inset-x-3 bottom-16 sm:hidden flex justify-between items-end">
          {/* Virtual Joystick */}
          <div
            ref={joystickRef}
            onTouchStart={handleJoystickTouchStart}
            onTouchMove={handleJoystickTouchMove}
            onTouchEnd={handleJoystickTouchEnd}
            onTouchCancel={handleJoystickTouchEnd}
            className="pointer-events-auto w-24 h-24 rounded-full bg-slate-900/70 border-2 border-slate-700/60 relative flex items-center justify-center touch-none mb-1"
          >
            <div
              className="w-10 h-10 rounded-full bg-emerald-500/80 border border-emerald-300 shadow-lg absolute pointer-events-none"
              style={{
                transform: `translate(${joystickThumb.x}px, ${joystickThumb.y}px)`,
                transition: touchIdRef.current === null ? 'transform 0.15s ease-out' : 'none',
              }}
            />
          </div>

          {/* Quick Shortcuts Bar (Center/Right bottom on mobile) */}
          <div className="pointer-events-auto flex flex-col items-end gap-2.5">
            {/* Top row mini buttons: CAM, MAP, POUCH */}
            <div className="flex gap-2">
              <button
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onSwitchCamera();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-[#0c121d]/90 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] active:bg-cyan-900/60"
              >
                CAM
              </button>
              <button
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onOpenMap();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-[#0c121d]/90 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] active:bg-cyan-900/60"
              >
                MAP
              </button>
              <button
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onOpenInventory();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-[#0c121d]/90 border border-slate-700 text-slate-300 font-mono text-[10px] active:bg-slate-800"
              >
                POUCH
              </button>
            </div>

            {/* Bottom row large action buttons */}
            <div className="flex items-center gap-2">
              <button
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onTouchAction('sprint', true);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  onTouchAction('sprint', false);
                }}
                className="w-12 h-12 rounded-full bg-amber-700/80 border border-amber-400/80 text-white font-mono text-[11px] font-bold flex items-center justify-center shadow-lg active:bg-amber-600"
              >
                RUN
              </button>
              <button
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onTouchAction('jump', true);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  onTouchAction('jump', false);
                }}
                className="w-12 h-12 rounded-full bg-cyan-700/80 border border-cyan-400/80 text-white font-mono text-[11px] font-bold flex items-center justify-center shadow-lg active:bg-cyan-600"
              >
                JUMP
              </button>
              <button
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onTouchAction('interact', true);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  onTouchAction('interact', false);
                }}
                className="w-12 h-12 rounded-full bg-emerald-700/80 border border-emerald-400/80 text-white font-mono text-[11px] font-bold flex items-center justify-center shadow-lg active:bg-emerald-600"
              >
                [E]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
