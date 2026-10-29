/**
 * Enhanced NPC Dialogue Modal Component for The Drifting Land.
 * Handles contextual multi-page dialogue, NPC role display, and seamless transitions to Trade.
 */

import React, { useState, useEffect } from 'react';
import { MessageSquare, ArrowRight, ShoppingBag, X } from 'lucide-react';
import { AudioService } from '../services/audio';

interface DialogueModalProps {
  dialogue: {
    name: string;
    roleTitle?: string;
    role?: string;
    lines: string[];
    tradeCatalogId?: string;
  };
  onOpenTrade?: (tradeCatalogId: string) => void;
  onClose: () => void;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({ dialogue, onOpenTrade, onClose }) => {
  const [lineIndex, setLineIndex] = useState(0);

  const handleNext = () => {
    AudioService.playUiClick();
    if (lineIndex < dialogue.lines.length - 1) {
      setLineIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleTrade = () => {
    if (dialogue.tradeCatalogId && onOpenTrade) {
      AudioService.playUiClick();
      onOpenTrade(dialogue.tradeCatalogId);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'KeyT' && dialogue.tradeCatalogId) {
        e.preventDefault();
        handleTrade();
      } else if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lineIndex, dialogue.lines.length, dialogue.tradeCatalogId]);

  return (
    <div className="absolute inset-x-4 bottom-24 z-40 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xl rounded-2xl bg-[#0c121d]/98 border border-slate-700/80 p-5 sm:p-6 shadow-2xl flex flex-col gap-3">
        {/* Speaker Name & Role Tag */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
                {dialogue.name}
              </span>
              {dialogue.roleTitle && (
                <span className="text-[10px] font-mono text-slate-400">
                  — {dialogue.roleTitle}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 tabular-nums">
              {lineIndex + 1} / {dialogue.lines.length}
            </span>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 cursor-pointer p-0.5"
              title="Close Dialogue (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dialogue Body */}
        <p className="text-sm text-slate-200 leading-relaxed font-sans min-h-[48px]">
          "{dialogue.lines[lineIndex] || ''}"
        </p>

        {/* Action Controls & Trade Trigger */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-900 gap-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden sm:inline">
            [Space / E advance · Esc close]
          </span>

          <div className="flex items-center gap-2 ml-auto">
            {/* Direct Trade Trigger Button if NPC has catalog */}
            {dialogue.tradeCatalogId && (
              <button
                onClick={handleTrade}
                className="px-3.5 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900/90 border border-amber-600/60 text-amber-300 font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                title="Browse Wares / Shop (T)"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                <span>Browse Wares [T]</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            >
              <span>{lineIndex < dialogue.lines.length - 1 ? 'Next' : 'Conclude'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
