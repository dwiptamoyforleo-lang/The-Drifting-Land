/**
 * Pause Menu for The Drifting Land.
 * Clean, lightweight modal for game pausing, manual saving, and navigation.
 */

import React, { useState } from 'react';
import { Play, Save, Settings, Home, Check } from 'lucide-react';
import { AudioService } from '../services/audio';

interface PauseMenuProps {
  onResume: () => void;
  onSave: () => void;
  onOpenSettings: () => void;
  onReturnToTitle: () => void;
  shardCount: number;
  totalShards: number;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onSave,
  onOpenSettings,
  onReturnToTitle,
  shardCount,
  totalShards,
}) => {
  const [saveSaved, setSaveSaved] = useState(false);

  const handleSaveClick = () => {
    AudioService.playUiClick();
    onSave();
    setSaveSaved(true);
    setTimeout(() => setSaveSaved(false), 2000);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-sm rounded-3xl bg-[#0c121d] border border-slate-800 p-6 shadow-2xl flex flex-col items-center">
        {/* Title */}
        <h2 className="text-xl font-serif font-black tracking-widest text-slate-100 uppercase mb-1">
          JOURNEY PAUSED
        </h2>
        <p className="text-xs font-mono text-emerald-400 tracking-wider uppercase mb-6">
          The Verdant Reach · {shardCount}/{totalShards} Shards Recovered
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => {
              AudioService.playUiClick();
              onResume();
            }}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40"
          >
            <Play className="w-4 h-4" />
            <span>Resume Game</span>
          </button>

          <button
            onClick={handleSaveClick}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-slate-200 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {saveSaved ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Progress Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Progress</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              AudioService.playUiClick();
              onOpenSettings();
            }}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-slate-200 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Settings & Controls</span>
          </button>

          <button
            onClick={() => {
              AudioService.playUiClick();
              onReturnToTitle();
            }}
            className="w-full py-3 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-slate-400 hover:text-slate-200 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Return to Title</span>
          </button>
        </div>
      </div>
    </div>
  );
};
