import React from 'react';
import { X, Award, Heart, Sparkles, Code2, Palette, Music } from 'lucide-react';

interface CreditsModalProps {
  onClose: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none overflow-y-auto font-['Share_Tech_Mono',monospace]">
      <div className="max-w-md w-full bg-gradient-to-b from-slate-900 via-[#0b1320] to-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-200 relative my-auto text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 mb-3">
            <Award className="w-7 h-7" />
          </div>
          <div className="text-[10px] tracking-[0.25em] text-cyan-400 uppercase">PROJECT ARCHIVES</div>
          <h2 className="font-['Cinzel'] text-2xl font-bold tracking-widest text-white mt-1">
            THE DRIFTING LAND
          </h2>
          <p className="text-xs text-slate-400 mt-1">Master Exploration & Survival Build</p>
        </div>

        {/* Roles */}
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-center gap-2 text-cyan-300 font-bold mb-1">
              <Code2 className="w-4 h-4" />
              <span>Lead Engineering & Simulation</span>
            </div>
            <p className="text-slate-400">Three.js WebGL Engine · Procedural Kinematics · Mobile Controls</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-center gap-2 text-amber-300 font-bold mb-1">
              <Palette className="w-4 h-4" />
              <span>World Architecture & Art Direction</span>
            </div>
            <p className="text-slate-400">Kepler-94d Megacity Citadels · Amber Cloud Seas · Rare Red Moon</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-center gap-2 text-teal-300 font-bold mb-1">
              <Music className="w-4 h-4" />
              <span>Soundtrack & Procedural Audio</span>
            </div>
            <p className="text-slate-400">Web Audio API Synth · Celestial Drone Pads · Harmonic Chimes</p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <span>Crafted with</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
          <span>for Open-World Exploration on GitHub Pages</span>
        </div>
      </div>
    </div>
  );
};
