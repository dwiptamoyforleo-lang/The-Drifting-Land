import React, { useState } from 'react';
import { MessageSquare, X, ChevronRight, Award, Coins, Sparkles, UserCheck } from 'lucide-react';
import { DialogueNode, DialogueOption } from '../game/types';
import { soundSystem } from '../game/audio';

interface DialogueModalProps {
  dialogue: DialogueNode;
  onOptionSelect: (option: DialogueOption) => void;
  onClose: () => void;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  dialogue,
  onOptionSelect,
  onClose,
}) => {
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState<{ xp?: number; coins?: number } | null>(null);

  const handleSelect = (option: DialogueOption) => {
    soundSystem.playDialogueBeep();
    setSelectedResponse(option.response);
    if (option.rewardXp || option.rewardCoins) {
      setRewardClaimed({ xp: option.rewardXp, coins: option.rewardCoins });
    }
    onOptionSelect(option);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none font-['Share_Tech_Mono',monospace]">
      <div className="max-w-xl w-full bg-gradient-to-b from-slate-900 via-[#0b1320] to-slate-950 border border-cyan-500/50 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-200 relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* NPC Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-cyan-500/20">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.25em] text-cyan-400 uppercase">TRANSMISSION LINK: ACTIVE</div>
            <h2 className="font-['Cinzel'] text-xl font-bold tracking-wider text-white">
              {dialogue.speaker}
            </h2>
            <div className="text-xs text-slate-400 font-sans">{dialogue.title}</div>
          </div>
        </div>

        {/* Dialogue Speech Body */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 shadow-inner relative">
          <div className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            COMMUNICATION
          </div>
          <p className="text-sm font-sans text-slate-200 leading-relaxed">
            {selectedResponse ? selectedResponse : dialogue.greeting}
          </p>

          {/* Reward Alert */}
          {rewardClaimed && (
            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center gap-4 text-xs font-mono">
              <span className="text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Discovery Bonus!
              </span>
              {rewardClaimed.xp && (
                <span className="text-cyan-300 font-bold flex items-center gap-1">
                  <Award className="w-3 h-3" /> +{rewardClaimed.xp} XP
                </span>
              )}
              {rewardClaimed.coins && (
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <Coins className="w-3 h-3" /> +{rewardClaimed.coins} Coins
                </span>
              )}
            </div>
          )}
        </div>

        {/* Reply Options */}
        <div className="space-y-2 mb-4">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
            SELECT INQUIRY:
          </div>
          {dialogue.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSelect(opt)}
              className="w-full text-left p-3.5 rounded-xl bg-slate-900/70 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                <span className="text-xs font-medium text-slate-200 group-hover:text-cyan-200 font-sans">
                  {opt.label}
                </span>
              </div>
              {(opt.rewardXp || opt.rewardCoins) && (
                <span className="text-[10px] text-amber-300 bg-amber-950/50 border border-amber-500/30 px-2 py-0.5 rounded font-mono shrink-0">
                  REWARD
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
        >
          End Transmission
        </button>
      </div>
    </div>
  );
};
