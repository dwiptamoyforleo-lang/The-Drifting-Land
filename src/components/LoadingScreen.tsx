/**
 * Atmospheric & Authentic Loading Screen for The Drifting Land.
 * Strictly adheres to authentic progression (no fake simulated delays).
 * Displays destination lore, rotating gameplay tips, active quest objective,
 * live initialization phase indicator, and recoverable error handling with retry.
 */

import React, { useState, useEffect } from 'react';
import { Compass, RotateCw, AlertTriangle, Sparkles, BookOpen, ChevronRight } from 'lucide-react';
import { REGIONS, DIMENSIONS } from '../data/regions';
import { QuestDefinition } from '../types/game';

interface LoadingScreenProps {
  regionId?: string;
  initPhase: string;
  progressPercent: number;
  trackedQuest?: {
    def: QuestDefinition;
    activeObjectiveText: string;
  } | null;
  errorMessage?: string | null;
  onRetry?: () => void;
}

const GAMEPLAY_TIPS = [
  'Attune with ancient stone Monoliths to establish permanent checkpoint respawn waystones across the archipelago.',
  'During a Red Moon eclipse, celestial flora bloom with twice the potency, but aggressive Corrupted Sentinels roam freely.',
  'Equip mined Sunstones and distilled Aether Crystals to permanently boost stamina regeneration and movement speed.',
  'Each dimension features unique gravitational laws. The Ashen Expanse is heavy (+15%), while The Moonveil floats (-25%).',
  'Visit merchant outposts to trade harvested flora and polished minerals for rare tools, rations, and portal keys.',
  'Crouch or sprint near wild creatures like the Cloudgrazer or Emberfox; sudden rushing will cause them to flee.',
  'Examine stone tablets and ancient archives to uncover the history of the Great Drift and decipher portal schematics.',
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  regionId = 'verdant_reach',
  initPhase,
  progressPercent,
  trackedQuest,
  errorMessage,
  onRetry,
}) => {
  const [tipIndex, setTipIndex] = useState<number>(0);

  // Rotate tips periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % GAMEPLAY_TIPS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const region = REGIONS[regionId] || REGIONS.verdant_reach;
  const dimension = DIMENSIONS[region.dimensionId] || DIMENSIONS.the_living_reach;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col justify-between p-6 sm:p-12 bg-[#060a11] text-slate-100 select-none overflow-hidden"
    >
      {/* Background celestial nebula glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 transition-colors duration-1000"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 40%, ${dimension.themeColor}22 0%, transparent 70%), radial-gradient(ellipse 40% 30% at 80% 85%, #05966915 0%, transparent 60%)`,
        }}
      />

      {/* Top Header: Destination Identity & Stratum */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner"
            style={{
              backgroundColor: `${dimension.themeColor}15`,
              borderColor: `${dimension.themeColor}40`,
              color: dimension.themeColor,
            }}
          >
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-mono tracking-widest uppercase text-slate-400">
              Entering Stratum · {dimension.name}
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-wide text-slate-100">
              {region.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <span>Gravity: {Math.round((region.gravityModifier ?? dimension.gravityModifier) * 100)}%</span>
          <span className="text-slate-600">·</span>
          <span>{region.subtitle || 'Floating Stratum'}</span>
        </div>
      </div>

      {/* Centerpiece: Active Quest Objective & Regional Lore */}
      <div className="relative z-10 my-auto max-w-xl mx-auto w-full flex flex-col items-center text-center">
        {errorMessage ? (
          <div className="w-full p-6 rounded-2xl bg-red-950/40 border border-red-500/40 shadow-2xl backdrop-blur-md text-left">
            <div className="flex items-center gap-3 text-red-400 mb-2">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-semibold">Engine Initialization Failed</h2>
            </div>
            <p className="text-sm text-red-200/90 leading-relaxed font-mono mb-6">
              {errorMessage}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-red-950/60 cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCw className="w-4 h-4" />
                <span>Retry Engine Initialization</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-6">
            {/* Pulsing dimensional rune insignia */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ backgroundColor: dimension.themeColor }}
              />
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center border shadow-2xl rotate-45 transform"
                style={{
                  backgroundColor: '#0c131f',
                  borderColor: `${dimension.themeColor}50`,
                }}
              >
                <Sparkles
                  className="w-8 h-8 -rotate-45"
                  style={{ color: dimension.themeColor }}
                />
              </div>
            </div>

            {/* Region description */}
            <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed max-w-md">
              {region.description}
            </p>

            {/* Current Active Quest Objective if available */}
            {trackedQuest && (
              <div className="w-full p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-left">
                <div className="flex items-center gap-2 text-[11px] font-mono tracking-wider uppercase text-emerald-400 mb-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Current Objective · {trackedQuest.def.title}</span>
                </div>
                <div className="text-xs text-slate-200 font-medium">
                  {trackedQuest.activeObjectiveText}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer: Real Progress Bar & Rotating Tips */}
      <div className="relative z-10 flex flex-col gap-4 border-t border-slate-800/80 pt-4">
        {/* Real Progress Indicator */}
        {!errorMessage && (
          <div className="w-full">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {initPhase}
              </span>
              <span className="text-slate-400 font-bold tabular-nums">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${Math.max(5, Math.min(100, progressPercent))}%`,
                  backgroundColor: dimension.themeColor,
                  boxShadow: `0 0 12px ${dimension.themeColor}`,
                }}
              />
            </div>
          </div>
        )}

        {/* Gameplay Tip Rotator */}
        <div className="flex items-start justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-start gap-2.5">
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono uppercase tracking-wider">
              Tip
            </span>
            <p className="leading-relaxed line-clamp-2">
              {GAMEPLAY_TIPS[tipIndex]}
            </p>
          </div>
          <button
            onClick={() => setTipIndex((prev) => (prev + 1) % GAMEPLAY_TIPS.length)}
            aria-label="Next Tip"
            className="shrink-0 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
