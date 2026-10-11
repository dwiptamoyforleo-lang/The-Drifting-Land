import React, { useState } from 'react';
import { X, BookOpen, Sparkles, Compass, CheckCircle2, Circle } from 'lucide-react';
import { GameProgress, WorldFragment, MagicalAnchor } from '../game/types';

interface JournalModalProps {
  progress: GameProgress;
  anchors: MagicalAnchor[];
  fragments: WorldFragment[];
  onClose: () => void;
}

export const JournalModal: React.FC<JournalModalProps> = ({
  progress,
  anchors,
  fragments,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'anchors' | 'fragments'>('anchors');

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none overflow-y-auto">
      <div className="max-w-md w-full bg-gradient-to-b from-slate-900 via-[#0b1320] to-slate-900 border border-teal-500/40 rounded-3xl p-6 shadow-2xl text-slate-200 relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-fantasy text-xl font-bold tracking-wider text-teal-200">
              The Celestial Archive
            </h2>
            <p className="text-xs text-slate-400">Discoveries and Threads of the Drifting Realm</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-950/60 border border-slate-800 p-1 mb-5">
          <button
            onClick={() => setActiveTab('anchors')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'anchors'
                ? 'bg-teal-600/80 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Anchors ({progress.activatedAnchors.length}/3)
          </button>
          <button
            onClick={() => setActiveTab('fragments')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'fragments'
                ? 'bg-teal-600/80 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fragments ({progress.collectedFragments.length}/4)
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {activeTab === 'anchors' && (
            <>
              {anchors.map((anchor) => {
                const isHarmonized = progress.activatedAnchors.includes(anchor.id);
                return (
                  <div
                    key={anchor.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isHarmonized
                        ? 'bg-teal-950/30 border-teal-500/40 text-slate-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {isHarmonized ? (
                          <CheckCircle2 className="w-4 h-4 text-teal-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-600" />
                        )}
                        <span className="font-semibold text-xs tracking-wide">
                          {anchor.name}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-slate-800/80">
                        {isHarmonized ? 'Harmonized' : 'Dormant'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-light ml-6 leading-relaxed">
                      {isHarmonized ? anchor.description : 'Undiscovered or waiting for celestial attunement.'}
                    </p>
                  </div>
                );
              })}

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
                <span className="text-teal-300 font-semibold">Resonance Status: </span>
                {progress.resonanceDiscovered ? (
                  <span className="text-cyan-300 font-medium">Awakened! The Drifting Citadel is anchored.</span>
                ) : (
                  <span className="text-slate-400">Harmonize all three anchors to form the Resonance Thread.</span>
                )}
              </div>
            </>
          )}

          {activeTab === 'fragments' && (
            <>
              {fragments.map((frag) => {
                const isFound = progress.collectedFragments.includes(frag.id);
                return (
                  <div
                    key={frag.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isFound
                        ? 'bg-cyan-950/30 border-cyan-500/40 text-slate-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {isFound ? (
                          <Sparkles className="w-4 h-4 text-cyan-300" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-600" />
                        )}
                        <span className="font-semibold text-xs tracking-wide">
                          {isFound ? frag.name : 'Unknown Shard'}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-slate-800/80">
                        {isFound ? 'Discovered' : 'Lost'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-light ml-6 leading-relaxed italic">
                      {isFound ? `"${frag.lore}"` : 'Scattered somewhere among the drifting islands.'}
                    </p>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors"
        >
          Close Archive
        </button>
      </div>
    </div>
  );
};
