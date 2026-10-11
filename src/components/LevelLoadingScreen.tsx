import React, { useEffect, useState } from 'react';
import { Compass, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { SectorInfo } from '../game/types';

interface LevelLoadingScreenProps {
  destinationSector: SectorInfo;
  onLoadingComplete: () => void;
}

const GAMEPLAY_TIPS = [
  'Calibrate your Field Compass with [C] to toggle between First-Person and Third-Person viewports.',
  'Rare Red Moon phenomena trigger celestial eclipse events that awaken dormant ancient steles.',
  'Aerowisps flock near active energy conduits; follow their flight paths to uncover hidden Data Cores.',
  'On touch devices, use your left thumb for horizontal velocity and right thumb for panoramic inspection.',
  'Attuning all three Quantum Anchors synchronizes the celestial triad and reveals the core citadel.',
];

export const LevelLoadingScreen: React.FC<LevelLoadingScreenProps> = ({
  destinationSector,
  onLoadingComplete,
}) => {
  const [progress, setProgress] = useState<number>(10);
  const [statusText, setStatusText] = useState<string>('Allocating 3D WebGL buffers...');
  const [tipIndex] = useState<number>(() => Math.floor(Math.random() * GAMEPLAY_TIPS.length));
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const steps = [
      { pct: 28, text: 'Calibrating Kepler-94d celestial coordinates...' },
      { pct: 54, text: 'Streaming geometry for ' + destinationSector.name + '...' },
      { pct: 78, text: 'Computing atmospheric fog & thermal updrafts...' },
      { pct: 92, text: 'Syncing telemetry dials & quantum frequency...' },
      { pct: 100, text: 'Initialization complete. Engaging landing thrusters.' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].pct);
        setStatusText(steps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onLoadingComplete();
        }, 350);
      }
    }, 280);

    return () => clearInterval(interval);
  }, [destinationSector, onLoadingComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-10 bg-gradient-to-b from-[#09111e] via-[#060c17] to-[#040810] text-slate-100 select-none overflow-hidden font-['Share_Tech_Mono',monospace]">
      {/* Background radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[400px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Destination */}
      <div className="w-full max-w-2xl text-center pt-8 z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 text-xs tracking-wider uppercase mb-3">
          <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>APPROACHING DESTINATION</span>
        </div>

        <h1 className="font-['Cinzel'] text-2xl sm:text-4xl font-bold tracking-[0.2em] text-white">
          {destinationSector.name}
        </h1>
        <p className="text-xs sm:text-sm text-amber-300/90 font-mono mt-1">
          {destinationSector.subtitle}
        </p>
      </div>

      {/* Center Details & Loading Visual */}
      <div className="w-full max-w-lg mx-auto my-auto z-10 text-center">
        {/* Animated Holographic Core */}
        <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-teal-400 border-l-transparent animate-spin" style={{ animationDuration: '2.5s' }} />
          <div className="p-4 rounded-full bg-cyan-950/60 border border-cyan-400/40 text-cyan-300 shadow-[0_0_24px_rgba(6,182,212,0.4)]">
            <Sparkles className="w-8 h-8 animate-pulse text-cyan-300" />
          </div>
        </div>

        {/* Environmental Conditions */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-left grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">ELEVATION</div>
            <div className="font-bold text-cyan-300 font-mono mt-0.5">
              {destinationSector.altitudeMeters} METERS
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">DIFFICULTY RATING</div>
            <div className="font-bold text-amber-300 font-mono mt-0.5">
              {destinationSector.difficulty}
            </div>
          </div>
          <div className="col-span-2 pt-2 border-t border-slate-800/80">
            <div className="text-[10px] text-slate-500 uppercase">LOCAL HAZARDS</div>
            <div className="text-slate-300 text-[11px] font-sans mt-0.5">
              {destinationSector.creaturesAndHazards}
            </div>
          </div>
        </div>

        {/* Progress Bar driven by real stages */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-cyan-300">{statusText}</span>
            <span className="text-white font-bold">{progress}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-amber-300 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {hasError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Asset telemetry timeout.</span>
            </div>
            <button
              onClick={() => setHasError(false)}
              className="px-2.5 py-1 rounded bg-rose-600 text-white font-mono text-[10px]"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Footer Gameplay Tip */}
      <div className="w-full max-w-xl mx-auto pb-4 z-10 text-center">
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400">
          <span className="text-cyan-400 font-bold uppercase mr-1.5">TELEMETRY TIP:</span>
          <span>{GAMEPLAY_TIPS[tipIndex]}</span>
        </div>
      </div>
    </div>
  );
};
