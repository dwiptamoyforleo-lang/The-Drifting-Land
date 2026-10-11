import React from 'react';
import { Play, Settings, RotateCcw, BookOpen, Compass, Sparkles } from 'lucide-react';
import { GameProgress } from '../game/types';

interface TitleScreenProps {
  onStartGame: () => void;
  onNewGame: () => void;
  onOpenSectorSelect: () => void;
  onOpenDimensions: () => void;
  onOpenQuests: () => void;
  onOpenInventory: () => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
  onOpenJournal: () => void;
  onOpenCredits: () => void;
  onResetProgress: () => void;
  progress: GameProgress;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onNewGame,
  onOpenSectorSelect,
  onOpenDimensions,
  onOpenQuests,
  onOpenInventory,
  onOpenShop,
  onOpenSettings,
  onOpenJournal,
  onOpenCredits,
  onResetProgress,
  progress,
}) => {
  const hasProgress = progress.activatedAnchors.length > 0 || progress.collectedFragments.length > 0;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-[#09111e]/90 via-[#060c17]/95 to-[#040810] text-slate-100 select-none overflow-y-auto font-['Share_Tech_Mono',monospace]">
      {/* Decorative ambient background accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[340px] bg-teal-500/10 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/3 w-[360px] h-[260px] bg-cyan-600/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Header / Brand */}
      <div className="w-full max-w-xl mx-auto pt-4 sm:pt-8 text-center z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-teal-500/30 bg-teal-950/40 text-teal-300 text-xs tracking-wider uppercase mb-3 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Open-World Sci-Fi Exploration</span>
        </div>

        <h1 className="font-['Cinzel'] text-3xl sm:text-5xl md:text-6xl font-bold tracking-[0.22em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-amber-200 drop-shadow-[0_2px_22px_rgba(6,182,212,0.5)]">
          THE DRIFTING LAND
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-slate-300 font-light tracking-[0.18em] uppercase max-w-md mx-auto">
          Atmospheric Exploration · Survival & Discovery
        </p>

        {hasProgress && (
          <div className="mt-3 inline-flex items-center gap-3 px-4 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700/40 text-xs text-slate-300">
            <span>Anchors: <strong className="text-teal-300">{progress.activatedAnchors.length}/3</strong></span>
            <span>Fragments: <strong className="text-cyan-300">{progress.collectedFragments.length}/4</strong></span>
            <span>Coins: <strong className="text-amber-300">{progress.coins || 0}</strong></span>
          </div>
        )}
      </div>

      {/* Primary Actions & Grid Layout */}
      <div className="w-full max-w-md mx-auto my-auto py-4 z-10 flex flex-col gap-2.5">
        {/* Main Continue / Start Buttons */}
        <button
          onClick={onStartGame}
          className="group relative flex items-center justify-center gap-3 w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 active:scale-[0.98] text-white font-medium text-base sm:text-lg tracking-wider uppercase shadow-[0_0_28px_rgba(6,182,212,0.45)] transition-all duration-200 border border-cyan-300/40 cursor-pointer font-['Cinzel']"
        >
          <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
          <span>{hasProgress ? 'Continue Exploration' : 'Begin Journey'}</span>
        </button>

        {hasProgress && (
          <button
            onClick={onNewGame}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 active:scale-[0.98] text-slate-300 hover:text-white text-xs tracking-wider border border-slate-700/60 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>New Game</span>
          </button>
        )}

        {/* 2-Column Menu Grid */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={onOpenSectorSelect}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 active:scale-[0.98] text-cyan-200 text-xs tracking-wide border border-cyan-500/40 backdrop-blur-md transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>Level Selection</span>
          </button>

          <button
            onClick={onOpenDimensions}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 active:scale-[0.98] text-purple-200 text-xs tracking-wide border border-purple-500/40 backdrop-blur-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Dimensions</span>
          </button>

          <button
            onClick={onOpenQuests}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 active:scale-[0.98] text-teal-200 text-xs tracking-wide border border-teal-500/30 backdrop-blur-md transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-teal-400" />
            <span>Quests & Goals</span>
          </button>

          <button
            onClick={onOpenInventory}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 active:scale-[0.98] text-cyan-200 text-xs tracking-wide border border-slate-700/60 backdrop-blur-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Inventory</span>
          </button>

          <button
            onClick={onOpenShop}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 active:scale-[0.98] text-amber-200 text-xs tracking-wide border border-amber-500/40 backdrop-blur-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Marketplace</span>
          </button>

          <button
            onClick={onOpenJournal}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/70 active:scale-[0.98] text-slate-300 text-xs tracking-wide border border-slate-800 backdrop-blur-md transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-slate-400" />
            <span>Archive Logs</span>
          </button>
        </div>

        {/* Secondary options row */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={onOpenSettings}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 active:scale-[0.98] text-slate-300 text-xs tracking-wide border border-slate-700/60 transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
          </button>

          <button
            onClick={onOpenCredits}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/70 active:scale-[0.98] text-slate-300 text-xs tracking-wide border border-slate-800 transition-all cursor-pointer"
          >
            <span>Credits</span>
          </button>
        </div>
      </div>

      {/* Footer controls guide */}
      <div className="w-full max-w-lg mx-auto pb-4 text-center text-xs text-slate-400/80 z-10">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 py-2 px-4 rounded-xl bg-slate-950/40 border border-slate-800/60 backdrop-blur-sm">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-teal-400" />
            <strong>Mobile:</strong> Left thumb joystick, right thumb look, tap to interact
          </span>
          <span>
            <strong>Desktop:</strong> WASD to move, Mouse to look, Space to jump, E to interact
          </span>
        </div>
      </div>
    </div>
  );
};
