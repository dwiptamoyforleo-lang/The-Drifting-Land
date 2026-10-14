/**
 * Complete HUD and Game Interface System for THE DRIFTING LAND
 * Displays real-time player vitals, hotbar, world time, quests, currency,
 * contextual interaction prompts, active events, and camera states.
 */

import React from 'react';

interface HUDProps {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  currency: number;
  dayNumber: number;
  worldTime: string; // e.g., "14:30"
  timeToSunset: string; // e.g., "3h 15m"
  currentLocation: string;
  currentObjective: string;
  hotbarItems: Array<{ id: string; name: string; count: number; icon: string } | null>;
  selectedHotbarSlot: number;
  contextPrompt: string | null;
  activeEvent: string | null;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  cameraMode: string;
  onOpenMenu: (menuName: string) => void;
  onSelectHotbarSlot: (slot: number) => void;
  onInteract: () => void;
  isHUDHidden?: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  health,
  maxHealth,
  stamina,
  maxStamina,
  currency,
  dayNumber,
  worldTime,
  timeToSunset,
  currentLocation,
  currentObjective,
  hotbarItems,
  selectedHotbarSlot,
  contextPrompt,
  activeEvent,
  saveStatus,
  cameraMode,
  onOpenMenu,
  onSelectHotbarSlot,
  onInteract,
  isHUDHidden = false,
}) => {
  if (isHUDHidden) return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none font-sans text-white flex flex-col justify-between p-4 z-20">
      {/* Top Bar: Location, Time, Day, Currency, Save Status */}
      <div className="flex justify-between items-start w-full">
        <div className="flex flex-col bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-lg pointer-events-auto">
          <div className="text-xs uppercase tracking-wider text-amber-400 font-bold">Location</div>
          <div className="text-sm font-semibold">{currentLocation}</div>
          <div className="text-xs text-gray-400 mt-1">Camera: <span className="text-white capitalize">{cameraMode}</span></div>
        </div>

        <div className="flex items-center gap-4 bg-black/60 backdrop-blur-md px-5 py-2 rounded-xl border border-white/10 shadow-lg pointer-events-auto">
          <div className="text-center">
            <div className="text-xs text-gray-400">Day {dayNumber}</div>
            <div className="text-lg font-bold font-mono text-amber-300">{worldTime}</div>
          </div>
          <div className="h-8 w-[1px] bg-white/20"></div>
          <div className="text-xs text-gray-300">
            <div>Sunset in: <span className="text-orange-400 font-semibold">{timeToSunset}</span></div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="font-bold text-amber-200">{currency} Shards</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-xs flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${saveStatus === 'saved' ? 'bg-emerald-400' : saveStatus === 'saving' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`}></span>
            <span className="capitalize">{saveStatus === 'saved' ? 'Game Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved Changes'}</span>
          </div>
          <button
            onClick={() => onOpenMenu('pause')}
            className="bg-zinc-800/80 hover:bg-zinc-700 text-white px-4 py-1.5 rounded-lg border border-white/20 text-sm font-medium shadow-md transition active:scale-95"
          >
            Menu
          </button>
        </div>
      </div>

      {/* Center Area: Contextual Prompt & Active Event */}
      <div className="flex flex-col items-center justify-center my-auto pointer-events-none gap-3">
        {activeEvent && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-200 px-6 py-2 rounded-full shadow-2xl animate-pulse text-sm font-bold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            Active Event: {activeEvent}
          </div>
        )}

        {contextPrompt && (
          <button
            onClick={onInteract}
            className="pointer-events-auto bg-amber-600/90 hover:bg-amber-500 text-white px-6 py-2.5 rounded-xl shadow-xl font-bold flex items-center gap-3 border border-amber-400/50 transition transform hover:scale-105 active:scale-95 animate-bounce"
          >
            <span className="bg-black/30 px-2 py-0.5 rounded text-xs font-mono">E / Tap</span>
            {contextPrompt}
          </button>
        )}
      </div>

      {/* Bottom Area: Vitals, Quests, Hotbar */}
      <div className="flex justify-between items-end w-full">
        {/* Vitals & Objective */}
        <div className="flex flex-col gap-3 max-w-xs pointer-events-auto">
          {/* Vitals */}
          <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 space-y-2 shadow-lg">
            {/* Health Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-red-400">Health</span>
                <span>{Math.ceil(health)} / {maxHealth}</span>
              </div>
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden border border-red-900/50">
                <div
                  className="bg-gradient-to-r from-red-600 to-red-400 h-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, (health / maxHealth) * 100))}%` }}
                ></div>
              </div>
            </div>

            {/* Stamina Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-emerald-400">Stamina</span>
                <span>{Math.ceil(stamina)} / {maxStamina}</span>
              </div>
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden border border-emerald-900/50">
                <div
                  className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, (stamina / maxStamina) * 100))}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Current Objective */}
          <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg">
            <div className="text-xs uppercase tracking-wider text-amber-400 font-bold mb-1">Current Objective</div>
            <div className="text-xs text-gray-200 leading-relaxed">{currentObjective}</div>
          </div>
        </div>

        {/* Hotbar */}
        <div className="flex gap-2 bg-black/60 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto">
          {hotbarItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSelectHotbarSlot(idx)}
              className={`relative w-14 h-14 rounded-xl flex flex-col items-center justify-center transition border ${
                selectedHotbarSlot === idx
                  ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                  : 'bg-zinc-900/80 border-white/10 hover:border-white/30'
              }`}
            >
              <span className="absolute top-1 left-1.5 text-[10px] font-mono text-gray-400">{idx + 1}</span>
              {item ? (
                <>
                  <span className="text-2xl mt-1">{item.icon}</span>
                  {item.count > 1 && (
                    <span className="absolute bottom-1 right-1.5 text-[10px] font-bold bg-black/80 px-1 rounded text-white">
                      {item.count}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs text-zinc-600">-</span>
              )}
            </button>
          ))}
        </div>

        {/* Quick Menu Buttons (Inventory, Quests, Map, Crafting, Settings) */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {['inventory', 'quests', 'map', 'crafting', 'shop', 'settings'].map((menu) => (
            <button
              key={menu}
              onClick={() => onOpenMenu(menu)}
              className="bg-zinc-900/80 hover:bg-zinc-800 text-white px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold uppercase tracking-wider shadow-md transition active:scale-95"
            >
              {menu}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
