/**
 * Controlled Respawn Interface for The Drifting Land.
 * Triggers upon player exhaustion/defeat.
 * Preserves all collected items, currency, relics, and quest progress.
 * Restores health and returns explorer to attuned sanctuary waystone or starting clearing.
 */

import React from 'react';
import { Skull, ShieldCheck, MapPin, Sparkles, RefreshCw } from 'lucide-react';
import { Checkpoint } from '../types/game';
import { AudioService } from '../services/audio';

interface RespawnModalProps {
  activeCheckpoint: Checkpoint | null;
  onRespawn: (useStartingClearing: boolean) => void;
}

export const RespawnModal: React.FC<RespawnModalProps> = ({
  activeCheckpoint,
  onRespawn,
}) => {
  const handleConfirmRespawn = (useStartingClearing: boolean) => {
    AudioService.playUiClick();
    AudioService.playBeaconActivate();
    onRespawn(useStartingClearing);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="respawn-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none animate-fadeIn"
    >
      <div className="w-full max-w-md bg-[#0c131f] border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Ambient crimson flare background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

        {/* Header: Defeat status */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-950/50">
            <Skull className="w-8 h-8 animate-pulse" />
          </div>
          <div className="text-[11px] font-mono tracking-widest uppercase text-red-400 mb-1">
            Physical Equilibrium Lost
          </div>
          <h2 id="respawn-title" className="text-2xl font-serif font-bold text-slate-100">
            Expedition Interrupted
          </h2>
          <p className="text-xs text-slate-400 font-light mt-1">
            Your body dissolved into the celestial aether currents. The ancient resonance anchors your consciousness.
          </p>
        </div>

        {/* Progression Safety Reassurance Box */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-900/40 mb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Progression Guaranteed Safe</span>
          </div>
          <ul className="text-[11px] text-slate-300 space-y-1.5 pl-6 list-disc font-light leading-relaxed">
            <li>Inventory items, harvested flora, and tools preserved.</li>
            <li>All Drift Coins and Aether Essence remain intact.</li>
            <li>Quest objectives and exploration rank progress saved.</li>
            <li>Health and stamina fully replenished on awakening.</li>
          </ul>
        </div>

        {/* Awakening Target Info */}
        <div className="mb-6 p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-left">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Attuned Waystone
            </div>
            <div className="text-xs font-semibold text-slate-100">
              {activeCheckpoint ? activeCheckpoint.name : 'Verdant Monolith Sanctuary'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleConfirmRespawn(false)}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-950/60 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Awaken at Sanctuary Checkpoint</span>
          </button>

          <button
            onClick={() => handleConfirmRespawn(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs tracking-wide border border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Respawn at Starting Clearing</span>
          </button>
        </div>
      </div>
    </div>
  );
};
