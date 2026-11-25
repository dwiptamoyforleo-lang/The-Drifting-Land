/**
 * Upgraded Pause Menu for The Drifting Land.
 * Fast-access hub for resume, destinations, quests, inventory, settings, and safe returns.
 */

import React, { useState } from 'react';
import {
  Play,
  Save,
  Settings,
  Home,
  Check,
  Compass,
  BookOpen,
  Package,
  Scroll,
} from 'lucide-react';
import { AudioService } from '../services/audio';

interface PauseMenuProps {
  onResume: () => void;
  onSave: () => void;
  onOpenSettings: () => void;
  onReturnToTitle: () => void;
  onOpenLevels?: () => void;
  onOpenQuests?: () => void;
  onOpenInventory?: () => void;
  onOpenCollections?: () => void;
  regionName?: string;
  shardCount: number;
  totalShards: number;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onSave,
  onOpenSettings,
  onReturnToTitle,
  onOpenLevels,
  onOpenQuests,
  onOpenInventory,
  onOpenCollections,
  regionName = 'The Verdant Reach',
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
    >
      <div className="w-full max-w-sm rounded-3xl bg-[#0c121d] border border-slate-700/60 p-6 shadow-2xl flex flex-col items-center">
        {/* Title */}
        <h2 id="pause-title" className="text-xl font-serif font-black tracking-widest text-slate-100 uppercase mb-1">
          EXPEDITION PAUSED
        </h2>
        <p className="text-xs font-mono text-emerald-400 tracking-wider uppercase mb-5 text-center">
          {regionName} · {shardCount}/{totalShards} Shards Recovered
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          {/* Resume */}
          <button
            onClick={() => {
              AudioService.playUiClick();
              onResume();
            }}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Game</span>
          </button>

          {/* Quick Hub Grid (Destinations, Quests, Inventory, Collections) */}
          <div className="grid grid-cols-2 gap-2 my-1">
            {onOpenLevels && (
              <button
                onClick={() => {
                  AudioService.playUiClick();
                  onOpenLevels();
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer justify-center"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Levels</span>
              </button>
            )}

            {onOpenQuests && (
              <button
                onClick={() => {
                  AudioService.playUiClick();
                  onOpenQuests();
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer justify-center"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Quests</span>
              </button>
            )}

            {onOpenInventory && (
              <button
                onClick={() => {
                  AudioService.playUiClick();
                  onOpenInventory();
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer justify-center"
              >
                <Package className="w-3.5 h-3.5 text-cyan-400" />
                <span>Inventory</span>
              </button>
            )}

            {onOpenCollections && (
              <button
                onClick={() => {
                  AudioService.playUiClick();
                  onOpenCollections();
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer justify-center"
              >
                <Scroll className="w-3.5 h-3.5 text-purple-400" />
                <span>Codex</span>
              </button>
            )}
          </div>

          {/* Save Progress */}
          <button
            onClick={handleSaveClick}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {saveSaved ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-mono">Progress Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-slate-400" />
                <span>Save Progress Now</span>
              </>
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => {
              AudioService.playUiClick();
              onOpenSettings();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings & Controls</span>
          </button>

          {/* Return to Title */}
          <button
            onClick={() => {
              AudioService.playUiClick();
              onReturnToTitle();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors mt-1"
          >
            <Home className="w-4 h-4" />
            <span>Return to Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
