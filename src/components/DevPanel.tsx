/**
 * Developer-Only Testing Suite for The Drifting Land.
 * Strictly separate from ordinary player settings.
 * Allows instant verification of:
 * - Red Moon event trigger, ending, and cooldown reset
 * - Time jumping (Dawn, Noon, Dusk, Night) and 24h clock advance
 * - Weather simulation patterns (Clear, Rain, Storms, Mist, Wind, Dimensional Disturbance)
 * - Crimson Warden boss state reset & fast teleportation
 */

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  X,
  Moon,
  Sun,
  Cloud,
  Zap,
  MapPin,
  Clock,
  RotateCcw,
  Skull,
  Radio,
  Flame,
} from 'lucide-react';
import { WeatherType } from '../types/game';

interface DevPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleRedMoon: (force?: boolean) => boolean;
  onJumpPhase: (phase: 'DAWN' | 'NOON' | 'DUSK' | 'NIGHT') => void;
  onAdvanceTime: (seconds: number) => void;
  onSetWeather: (weather: WeatherType) => void;
  onResetCooldown: () => void;
  onTeleport: (x: number, z: number) => void;
  isRedMoon: boolean;
  clockTime: string;
  dayCount: number;
}

export const DevPanel: React.FC<DevPanelProps> = ({
  isOpen,
  onClose,
  onToggleRedMoon,
  onJumpPhase,
  onAdvanceTime,
  onSetWeather,
  onResetCooldown,
  onTeleport,
  isRedMoon,
  clockTime,
  dayCount,
}) => {
  const [fastCycle, setFastCycle] = useState(false);

  // Keyboard shortcut '~' or 'F1' to toggle
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '`' || e.code === 'F1') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 pointer-events-auto backdrop-blur-xs">
      <div className="bg-[#0b0f19] border border-amber-500/40 rounded-2xl w-full max-w-xl shadow-2xl p-5 text-slate-200 font-mono flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-amber-400">
            <Wrench className="w-5 h-5" />
            <h2 className="text-sm font-bold tracking-wider uppercase">
              Developer Testing Suite
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current State Info Banner */}
        <div className="mt-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Day:</span> <span className="text-amber-300 font-bold">{dayCount}</span>
            <span className="mx-2 text-slate-600">|</span>
            <span className="text-slate-400">Clock:</span> <span className="text-cyan-300 font-bold">{clockTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Red Moon:</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isRedMoon ? 'bg-red-950 text-red-300 border border-red-600' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isRedMoon ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
        </div>

        {/* Section 1: Red Moon Event Controls */}
        <div className="mt-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
            <Radio className="w-3.5 h-3.5" />
            <span>Red Moon Alignment Controls</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={() => onToggleRedMoon(true)}
              className="p-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-600/60 text-red-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer font-bold transition-colors"
            >
              <Flame className="w-4 h-4 text-red-400" />
              <span>Force Start Event</span>
            </button>

            <button
              onClick={() => onToggleRedMoon(false)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span>Force End Event</span>
            </button>

            <button
              onClick={onResetCooldown}
              className="p-2.5 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-600/60 text-amber-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              title="Clears cooldown and roll locks so 1% roll or boss encounter can test freely"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Reset Cooldown</span>
            </button>
          </div>
        </div>

        {/* Section 2: Celestial Time Machine */}
        <div className="mt-5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>Celestial Clock & Phase Jumping</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => onJumpPhase('DAWN')}
              className="p-2 rounded-xl bg-amber-950/50 hover:bg-amber-900/70 border border-amber-600/40 text-amber-200 text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Dawn (06:00)</span>
            </button>

            <button
              onClick={() => onJumpPhase('NOON')}
              className="p-2 rounded-xl bg-sky-950/50 hover:bg-sky-900/70 border border-sky-600/40 text-sky-200 text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              <span>Noon (12:00)</span>
            </button>

            <button
              onClick={() => onJumpPhase('DUSK')}
              className="p-2 rounded-xl bg-fuchsia-950/50 hover:bg-fuchsia-900/70 border border-fuchsia-600/40 text-fuchsia-200 text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <Moon className="w-3.5 h-3.5 text-fuchsia-300" />
              <span>Dusk (19:00)</span>
            </button>

            <button
              onClick={() => onJumpPhase('NIGHT')}
              className="p-2 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/70 border border-indigo-600/40 text-indigo-200 text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-300" />
              <span>Night (22:00)</span>
            </button>
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onAdvanceTime(300)} // 5 in-game minutes
              className="flex-1 py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 cursor-pointer"
            >
              +5 Minutes
            </button>
            <button
              onClick={() => onAdvanceTime(1200)} // 1 in-game hour
              className="flex-1 py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 cursor-pointer"
            >
              +1 Hour
            </button>
            <button
              onClick={() => onAdvanceTime(3600)} // 3 in-game hours
              className="flex-1 py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 cursor-pointer"
            >
              +3 Hours
            </button>
          </div>
        </div>

        {/* Section 3: Weather Simulator */}
        <div className="mt-5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
            <Cloud className="w-3.5 h-3.5" />
            <span>Weather Simulation Patterns</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => onSetWeather('CLEAR')}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs cursor-pointer"
            >
              Clear Skies
            </button>
            <button
              onClick={() => onSetWeather('MIST')}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs cursor-pointer"
            >
              Highland Mist
            </button>
            <button
              onClick={() => onSetWeather('WIND')}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs cursor-pointer"
            >
              Gale Winds
            </button>
            <button
              onClick={() => onSetWeather('RAIN')}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs cursor-pointer"
            >
              Rain Showers
            </button>
            <button
              onClick={() => onSetWeather('STORMS')}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs cursor-pointer"
            >
              Celestial Storms
            </button>
            <button
              onClick={() => onSetWeather('DIMENSIONAL_DISTURBANCE')}
              className="p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-600/40 text-purple-200 text-xs cursor-pointer col-span-2 sm:col-span-1"
            >
              Dimensional Warp
            </button>
            <button
              onClick={() => onSetWeather('RED_ECLIPSE')}
              className="p-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-600/40 text-red-200 text-xs cursor-pointer col-span-2 sm:col-span-1"
            >
              Red Eclipse
            </button>
          </div>
        </div>

        {/* Section 4: Fast Landmark Teleportation */}
        <div className="mt-5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
            <MapPin className="w-3.5 h-3.5" />
            <span>Fast Landmark Teleport</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onTeleport(0, 0)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Monolith Beacon [0, 0]</span>
            </button>

            <button
              onClick={() => onTeleport(-52, -45)}
              className="p-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-600/50 text-red-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer font-bold"
            >
              <Skull className="w-3.5 h-3.5 text-red-400" />
              <span>Rift Crater Boss [-52, -45]</span>
            </button>

            <button
              onClick={() => onTeleport(-34, 18)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Sunken Ruins [-34, 18]</span>
            </button>

            <button
              onClick={() => onTeleport(38, 25)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Promontory Tower [38, 25]</span>
            </button>

            <button
              onClick={() => onTeleport(-22, -35)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Hollow Homestead [-22, -35]</span>
            </button>

            <button
              onClick={() => onTeleport(12, 28)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Research Camp [12, 28]</span>
            </button>

            <button
              onClick={() => onTeleport(24, -10)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Suspension Bridge [24, -10]</span>
            </button>

            <button
              onClick={() => onTeleport(-48, -8)}
              className="p-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Hidden Chamber [-48, -8]</span>
            </button>

            <button
              onClick={() => onTeleport(-50, -20)}
              className="p-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/50 text-indigo-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Dimensional Gateway [-50, -20]</span>
            </button>

            <button
              onClick={() => onTeleport(-16, 32)}
              className="p-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-700/50 text-cyan-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Lumicite Vein [-16, 32]</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
