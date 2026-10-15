/**
 * Comprehensive Multi-Panel Interface System for THE DRIFTING LAND
 * Implements Inventory, Quests, Map, Crafting, Settings, and Pause panels.
 */
import React, { useState } from 'react';

interface GameMenusProps {
  activeMenu: string | null;
  onClose: () => void;
}

export const GameMenus: React.FC<GameMenusProps> = ({ activeMenu, onClose }) => {
  const [settingsTab, setSettingsTab] = useState<'graphics' | 'audio' | 'gameplay'>('graphics');
  const [graphicsQuality, setGraphicsQuality] = useState<'low' | 'medium' | 'high' | 'auto'>('auto');

  if (!activeMenu) return null;

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans text-white select-none">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-zinc-900 border-b border-white/10">
          <h2 className="text-xl font-bold uppercase tracking-wider text-amber-400 capitalize">{activeMenu}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-gray-300 hover:text-white font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeMenu === 'inventory' && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-zinc-900/90 border border-white/10 rounded-xl flex flex-col items-center justify-center relative hover:border-amber-400/50 cursor-pointer transition group"
                >
                  <span className="text-3xl group-hover:scale-110 transition">
                    {i < 5 ? ['📦', '⚔️', '🛡️', '🧪', '📜'][i] : ''}
                  </span>
                  <span className="absolute bottom-1 right-2 text-[10px] text-gray-400 font-mono">
                    {i < 5 ? '1' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeMenu === 'quests' && (
            <div className="space-y-4">
              <div className="bg-zinc-900/80 p-4 rounded-xl border border-white/10">
                <h3 className="font-bold text-amber-300 text-base">The Sky Shard Mystery</h3>
                <p className="text-sm text-gray-300 mt-1">
                  Investigate the ancient floating monolith near the northern ridge and retrieve the fractured core.
                </p>
                <div className="mt-3 text-xs text-emerald-400 font-semibold">
                  Status: In Progress (2/3 Shards Collected)
                </div>
              </div>
              <div className="bg-zinc-900/80 p-4 rounded-xl border border-white/10 opacity-60">
                <h3 className="font-bold text-gray-300 text-base">Whispers in the Mist</h3>
                <p className="text-sm text-gray-400 mt-1">Talk to the settlement elder after sunset.</p>
                <div className="mt-3 text-xs text-gray-400 font-semibold">Status: Completed</div>
              </div>
            </div>
          )}

          {activeMenu === 'map' && (
            <div className="w-full h-96 bg-zinc-900 rounded-xl border border-white/10 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-zinc-950 to-zinc-950"></div>
              <div className="text-center z-10">
                <span className="text-4xl">🗺️</span>
                <p className="text-sm text-gray-400 mt-2 font-mono">
                  [ World Map: Sector 7 - The Drifting Archipelago ]
                </p>
              </div>
            </div>
          )}

          {activeMenu === 'crafting' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['Aether Blade', 'Reinforced Leather Armor', 'Health Elixir', 'Sky Glider'].map((item, idx) => (
                <div key={idx} className="bg-zinc-900/90 p-4 rounded-xl border border-white/10 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white">{item}</h4>
                    <p className="text-xs text-gray-400 mt-1">Requires: 3x Iron Shards, 2x Wood</p>
                  </div>
                  <button className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-md active:scale-95 cursor-pointer">
                    Craft
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeMenu === 'settings' && (
            <div className="space-y-6">
              <div className="flex gap-2 border-b border-white/10 pb-4">
                {(['graphics', 'audio', 'gameplay'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSettingsTab(tab)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                      settingsTab === tab
                        ? 'bg-amber-500 text-white shadow-lg'
                        : 'bg-zinc-900 text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {settingsTab === 'graphics' && (
                <div className="space-y-4">
                  <div className="text-sm font-semibold text-gray-300">Graphics Preset (Android Optimized)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['low', 'medium', 'high', 'auto'] as const).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setGraphicsQuality(preset)}
                        className={`p-3 rounded-xl border text-center font-bold capitalize transition cursor-pointer ${
                          graphicsQuality === preset
                            ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                            : 'border-white/10 bg-zinc-900/80 text-gray-400 hover:bg-zinc-800'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {settingsTab === 'audio' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-300">Master Volume</label>
                    <input type="range" min="0" max="100" defaultValue="80" className="w-full mt-2 accent-amber-500" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-300">Ambience & Weather Volume</label>
                    <input type="range" min="0" max="100" defaultValue="70" className="w-full mt-2 accent-amber-500" />
                  </div>
                </div>
              )}

              {settingsTab === 'gameplay' && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-400">
                    Touch joystick auto-centers dynamically on Android touch input. Keyboard controls: WASD to move, Space to jump, Shift to sprint, E to interact.
                  </div>
                </div>
              )}
            </div>
          )}

          {activeMenu === 'pause' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <button
                onClick={onClose}
                className="w-64 bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-bold shadow-lg transition cursor-pointer"
              >
                Resume Game
              </button>
              <button
                onClick={onClose}
                className="w-64 bg-zinc-900 hover:bg-zinc-800 text-white py-3 rounded-xl font-bold border border-white/10 transition cursor-pointer"
              >
                Save & Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};