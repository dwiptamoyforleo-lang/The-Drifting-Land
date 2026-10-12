import React, { useState } from 'react';
import { X, CheckCircle2, Circle, Target, Award, Sparkles, Compass } from 'lucide-react';
import { Quest } from '../game/types';

interface QuestsModalProps {
  quests: Quest[];
  onClose: () => void;
}

export const INITIAL_QUESTS: Quest[] = [
  {
    id: 'quest-1',
    title: 'Harmonize the Triad',
    description: 'Attune all 3 Quantum Anchors across the Observation Deck and Eastern Towers.',
    targetCount: 3,
    currentCount: 0,
    rewardXp: 500,
    rewardCoins: 250,
    completed: false,
    sectorId: 1,
  },
  {
    id: 'quest-2',
    title: 'Archive of Kepler',
    description: 'Recover encrypted Data Cores scattered across the suspended sky-bridges.',
    targetCount: 4,
    currentCount: 0,
    rewardXp: 400,
    rewardCoins: 200,
    completed: false,
    sectorId: 2,
  },
  {
    id: 'quest-checkpoints',
    title: 'Survey Matrix Checkpoints',
    description: 'Synchronize the 4 ancient quantum recall beacons to establish safe respawn footholds.',
    targetCount: 4,
    currentCount: 1,
    rewardXp: 450,
    rewardCoins: 200,
    completed: false,
    sectorId: 1,
  },
  {
    id: 'quest-harvest',
    title: 'Aether Harvest & Salvage',
    description: 'Harvest glowing Aether Crystals and ancient titanium scraps along the catwalks.',
    targetCount: 4,
    currentCount: 0,
    rewardXp: 350,
    rewardCoins: 180,
    completed: false,
    sectorId: 1,
  },
  {
    id: 'quest-survivors',
    title: 'Vanguard Contact Network',
    description: 'Converse with lost explorers, merchants, and keepers across the archipelago.',
    targetCount: 4,
    currentCount: 0,
    rewardXp: 300,
    rewardCoins: 150,
    completed: false,
    sectorId: 1,
  },
  {
    id: 'quest-haven',
    title: 'Haven Settlement Restoration',
    description: 'Confer with Overseer Bennett and Trader Oakhaven to supply the sky colony.',
    targetCount: 2,
    currentCount: 0,
    rewardXp: 400,
    rewardCoins: 220,
    completed: false,
    sectorId: 1,
  },
  {
    id: 'quest-lost-scout',
    title: 'Signal in the Void',
    description: 'Locate and assist Lost Scout Corin stranded upon the lower catwalk fracture.',
    targetCount: 1,
    currentCount: 0,
    rewardXp: 500,
    rewardCoins: 250,
    completed: false,
    sectorId: 2,
  },
  {
    id: 'quest-guardian',
    title: 'Audience with Guardian Aeon',
    description: 'Seek the Ancient Golem Sentinel guarding the entrance to the Drifting Citadel.',
    targetCount: 1,
    currentCount: 0,
    rewardXp: 600,
    rewardCoins: 300,
    completed: false,
    sectorId: 3,
  },
  {
    id: 'quest-3',
    title: 'Witness the Red Moon',
    description: 'Survive the celestial eclipse when Kepler-94d shifts into the ominous Red Moon phase.',
    targetCount: 1,
    currentCount: 0,
    rewardXp: 750,
    rewardCoins: 400,
    completed: false,
    sectorId: 5,
  },
];

export const QuestsModal: React.FC<QuestsModalProps> = ({ quests, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none overflow-y-auto font-['Share_Tech_Mono',monospace]">
      <div className="max-w-xl w-full bg-gradient-to-b from-slate-900 via-[#0b1320] to-slate-900 border border-teal-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-200 relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-300">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.25em] text-teal-400 uppercase">MISSION OBJECTIVES</div>
            <h2 className="font-['Cinzel'] text-xl font-bold tracking-wider text-white">
              Quests & Achievements
            </h2>
          </div>
        </div>

        {/* Quest List */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {quests.map((q) => {
            const isDone = q.completed;
            const progressPct = Math.min(100, Math.round((q.currentCount / q.targetCount) * 100));

            return (
              <div
                key={q.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isDone
                    ? 'bg-teal-950/30 border-teal-500/40'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2.5">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                    )}
                    <h3 className={`text-sm font-bold ${isDone ? 'text-teal-200' : 'text-slate-100'}`}>
                      {q.title}
                    </h3>
                  </div>

                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                    isDone ? 'bg-teal-900/60 text-teal-300 border border-teal-500/40' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {isDone ? 'COMPLETED' : `${q.currentCount}/${q.targetCount}`}
                  </span>
                </div>

                <p className="text-xs text-slate-400 font-sans ml-7 leading-relaxed">
                  {q.description}
                </p>

                {/* Progress bar and rewards */}
                <div className="ml-7 mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-cyan-300 font-bold">+{q.rewardXp} XP</span>
                    <span className="text-amber-300 font-bold">+{q.rewardCoins} Coins</span>
                  </div>

                  <div className="w-24 h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-teal-400 transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
