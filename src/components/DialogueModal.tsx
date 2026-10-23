/**
 * NPC Dialogue Modal Component for The Drifting Land.
 * Handles interactive conversations with NPCs, lore discoveries, and quest offerings.
 */

import React, { useState, useEffect } from 'react';
import { MessageSquare, ArrowRight, X } from 'lucide-react';
import { AudioService } from '../services/audio';

interface DialogueModalProps {
  dialogue: {
    name: string;
    lines: string[];
  };
  onClose: () => void;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({ dialogue, onClose }) => {
  const [lineIndex, setLineIndex] = useState(0);

  const handleNext = () => {
    AudioService.playUiClick();
    if (lineIndex < dialogue.lines.length - 1) {
      setLineIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lineIndex, dialogue.lines.length]);

  return (
    <div className="absolute inset-x-4 bottom-24 z-40 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xl rounded-3xl bg-[#0c121d]/95 border border-emerald-800/80 p-5 sm:p-6 shadow-2xl flex flex-col gap-3">
        {/* Speaker Name Tag */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
              {dialogue.name}
            </span>
          </div>

          <span className="text-[10px] font-mono text-slate-500 tabular-nums">
            {lineIndex + 1} / {dialogue.lines.length}
          </span>
        </div>

        {/* Dialogue Text */}
        <p className="text-sm text-slate-200 leading-relaxed font-sans min-h-[48px]">
          "{dialogue.lines[lineIndex]}"
        </p>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-900">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            [Space / E to advance · Esc to close]
          </span>

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
  );
};
