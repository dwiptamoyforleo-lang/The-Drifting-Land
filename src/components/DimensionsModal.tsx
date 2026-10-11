import React from 'react';
import { X, Globe2, Lock, Unlock, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';

interface DimensionsModalProps {
  unlockedDimensions: number[];
  currentDimension: number;
  onSelectDimension: (dimId: number) => void;
  onClose: () => void;
}

export const DIMENSIONS = [
  {
    id: 1,
    name: 'Kepler Prime (Material Stratosphere)',
    subtitle: 'Standard Celestial Realm',
    description: 'The golden amber cloud sea and sprawling citadels of the primary material dimension.',
    hazardLevel: 'Calm',
    unlocked: true,
    color: '#06b6d4',
  },
  {
    id: 2,
    name: 'The Quantum Aether',
    subtitle: 'Harmonic Resonance Sub-Space',
    description: 'An inverted dimension formed by active quantum anchors where gravity vectors fluctuate and ethereal bridges shimmer.',
    hazardLevel: 'Moderate',
    unlocked: true,
    color: '#a855f7',
  },
  {
    id: 3,
    name: 'The Crimson Eclipse Dimension',
    subtitle: 'Red Moon Event Spacetime',
    description: 'A perilous, time-distorted reality accessible during the rare Red Moon alignment. Home to ancient relics and unstable gravitational anomalies.',
    hazardLevel: 'Severe',
    unlocked: true,
    color: '#ef4444',
  },
  {
    id: 4,
    name: 'The Void Expanse',
    subtitle: 'Outer Perimeter Beyond the Atmosphere',
    description: 'Zero-pressure stellar corridor overlooking the star system. Demands high progression and specialized kinetic shielding.',
    hazardLevel: 'Extreme',
    unlocked: false,
    color: '#64748b',
  },
];

export const DimensionsModal: React.FC<DimensionsModalProps> = ({
  unlockedDimensions,
  currentDimension,
  onSelectDimension,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none overflow-y-auto font-['Share_Tech_Mono',monospace]">
      <div className="max-w-2xl w-full bg-gradient-to-b from-slate-900 via-[#0b1320] to-slate-900 border border-purple-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-200 relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300">
            <Globe2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.25em] text-purple-400 uppercase">SPATIAL RIFT MATRIX</div>
            <h2 className="font-['Cinzel'] text-xl font-bold tracking-wider text-white">
              Dimensional Portals
            </h2>
          </div>
        </div>

        {/* Dimensions List */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {DIMENSIONS.map((dim) => {
            const isUnlocked = dim.unlocked || unlockedDimensions.includes(dim.id);
            const isActive = currentDimension === dim.id;

            return (
              <div
                key={dim.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-purple-950/40 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                    : isUnlocked
                    ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/30 border-slate-900 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white font-['Cinzel']">
                      {dim.name}
                    </span>
                    {isUnlocked ? (
                      <span className="flex items-center gap-1 text-[10px] text-teal-400 font-mono px-2 py-0.5 rounded bg-teal-950/60 border border-teal-500/30">
                        <Unlock className="w-3 h-3" /> UNLOCKED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        <Lock className="w-3 h-3" /> LOCKED
                      </span>
                    )}
                  </div>

                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                    dim.hazardLevel === 'Calm' ? 'bg-cyan-950/60 text-cyan-300' :
                    dim.hazardLevel === 'Moderate' ? 'bg-purple-950/60 text-purple-300' :
                    dim.hazardLevel === 'Severe' ? 'bg-rose-950/60 text-rose-300' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {dim.hazardLevel}
                  </span>
                </div>

                <div className="text-xs text-purple-300 font-mono mb-1">
                  {dim.subtitle}
                </div>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  {dim.description}
                </p>

                {isUnlocked && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-end">
                    <button
                      onClick={() => onSelectDimension(dim.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Shift Dimension</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
