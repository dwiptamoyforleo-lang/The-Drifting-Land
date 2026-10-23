/**
 * Atmospheric Title Screen for The Drifting Land.
 * Uses a live background 3D camera pan over the floating archipelago.
 * Bespoke inline SVG title lockup, 30-40% negative space, clear Start CTA.
 */

import React, { useEffect } from 'react';
import { Volume2, VolumeX, Settings, Compass, Sparkles } from 'lucide-react';
import { AudioService } from '../services/audio';

interface TitleScreenProps {
  hasExistingSave: boolean;
  onStartGame: (isNew: boolean) => void;
  onOpenSettings: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasExistingSave,
  onStartGame,
  onOpenSettings,
  soundEnabled,
  onToggleSound,
}) => {
  // Listen for Enter or Space to quickly start game
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartGame(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStartGame]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 sm:p-12 z-20">
      {/* Top Bar with Audio & Settings */}
      <div className="flex items-center justify-between w-full">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111827]/80 border border-emerald-900/40 text-emerald-300 text-xs tracking-wider uppercase">
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>Region I: The Verdant Reach</span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onToggleSound}
            aria-label="Toggle Sound"
            className="p-2.5 rounded-xl bg-[#111827]/80 hover:bg-[#1f2937] border border-slate-700/60 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="p-2.5 rounded-xl bg-[#111827]/80 hover:bg-[#1f2937] border border-slate-700/60 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup with negative space */}
      <div className="flex flex-col items-center justify-center my-auto text-center max-w-2xl mx-auto">
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono tracking-widest uppercase">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Fractured World Odyssey</span>
        </div>

        {/* Bespoke Inline SVG Title Lockup */}
        <div className="w-full max-w-lg mb-4 drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]">
          <svg viewBox="0 0 540 90" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Ambient decorative rune line */}
            <path d="M40 76 L220 76 M320 76 L500 76" stroke="#059669" strokeWidth="1.5" strokeOpacity="0.5" />
            <polygon points="270,70 276,76 270,82 264,76" fill="#34d399" />
            {/* Title Typographic Lockup */}
            <text
              x="270"
              y="40"
              textAnchor="middle"
              className="fill-slate-100 font-serif font-black tracking-[0.22em] text-3xl sm:text-4xl"
              style={{ letterSpacing: '0.24em', textShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
            >
              THE DRIFTING LAND
            </text>
            <text
              x="270"
              y="62"
              textAnchor="middle"
              className="fill-emerald-400 font-mono text-[10px] tracking-[0.38em] uppercase"
            >
              AN ATMOSPHERIC OPEN-WORLD SURVIVAL
            </text>
          </svg>
        </div>

        <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto mb-8 font-light leading-relaxed">
          The ancient realm fractured in the Great Drift. Explore the verdant floating isles, awaken forgotten beacons, and gather lost celestial relics.
        </p>

        {/* Action Buttons */}
        <div className="pointer-events-auto flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {hasExistingSave ? (
            <>
              <button
                onClick={() => {
                  AudioService.playUiClick();
                  onStartGame(false);
                }}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-950/60 hover:shadow-emerald-900/50 transition-all cursor-pointer"
              >
                Continue Journey
              </button>
              <button
                onClick={() => {
                  AudioService.playUiClick();
                  onStartGame(true);
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#111827]/90 hover:bg-[#1f2937] border border-slate-700/80 text-slate-200 hover:text-white font-medium text-sm transition-all cursor-pointer"
              >
                New Expedition
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                AudioService.playUiClick();
                onStartGame(true);
              }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-sm sm:text-base tracking-wide shadow-xl shadow-emerald-950/80 hover:shadow-emerald-900/60 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Embark on The Verdant Reach</span>
            </button>
          )}
        </div>
      </div>

      {/* Flat Control-Hint Line as strictly required by Craft Guidelines */}
      <div className="text-center">
        <p className="text-slate-400/90 text-xs font-mono tracking-widest uppercase">
          WASD / Arrows Move · Space Jump · Shift Dash · E Interact · Esc Pause
        </p>
      </div>
    </div>
  );
};
