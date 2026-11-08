/**
 * Atmospheric Dimension Transition Screen for The Drifting Land.
 * Implements Prompt 11 lightweight atmospheric transitions with warp animations and dimensional status.
 */

import React, { useEffect, useState } from 'react';
import { Compass, Sparkles, Orbit, Wind, Flame, ShieldAlert, ArrowRight } from 'lucide-react';
import { REGIONS, DIMENSIONS } from '../data/regions';

interface DimensionTransitionScreenProps {
  destinationRegionId: string;
  onComplete: () => void;
}

export const DimensionTransitionScreen: React.FC<DimensionTransitionScreenProps> = ({
  destinationRegionId,
  onComplete,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Tuning Aetheric Conduit...');

  const region = REGIONS[destinationRegionId] || REGIONS.verdant_reach;
  const dimension = DIMENSIONS[region.dimensionId] || DIMENSIONS.the_living_reach;

  useEffect(() => {
    const steps = [
      { progress: 20, text: 'Tuning Aetheric Conduit...' },
      { progress: 50, text: 'Harmonizing Gravitational Field...' },
      { progress: 80, text: 'Materializing Dimension Topography...' },
      { progress: 100, text: 'Conflux Established. Entering...' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].progress);
        setStatusText(steps[currentStep].text);
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 350);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [onComplete]);

  // Visual accents
  const gravityText = `${region.gravityModifier ?? dimension.gravityModifier}x Gravity`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md text-white select-none overflow-hidden animate-fadeIn">
      {/* Background radial warp glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 animate-pulse duration-1000"
        style={{
          background: `radial-gradient(circle at center, ${dimension.themeColor || '#10b981'}33 0%, rgba(2, 6, 23, 0.95) 70%)`,
        }}
      />

      {/* Floating geometric warp rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full border border-slate-700/40 animate-spin duration-[20s]" />
        <div className="absolute w-[360px] h-[360px] rounded-full border border-dashed border-emerald-500/30 animate-spin duration-[12s] reverse" />
        <div className="absolute w-[220px] h-[220px] rounded-full border border-sky-400/25 animate-ping duration-[3s]" />
      </div>

      {/* Center content container */}
      <div className="relative z-10 max-w-lg w-full mx-6 p-8 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl text-center">
        {/* Dimension badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4">
          <Orbit className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          <span>{dimension.name}</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400">{gravityText}</span>
        </div>

        {/* Destination Title */}
        <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-1">
          {region.name}
        </h2>
        <p className="text-sm font-medium text-slate-400 mb-6">
          {region.subtitle}
        </p>

        {/* Atmospheric Lore snippet */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl mb-6 text-left">
          <p className="text-xs text-slate-300 italic leading-relaxed">
            "{region.discoveryLore}"
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-950 rounded-full h-2 mb-3 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-sky-400 to-indigo-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status text */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>{statusText}</span>
          <span>{progress}%</span>
        </div>
      </div>
    </div>
  );
};
