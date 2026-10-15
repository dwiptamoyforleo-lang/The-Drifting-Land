import React, { useState } from 'react';
import { X, CheckCircle2, Circle, Target, Award } from 'lucide-react';
import { Quest } from '../game/quests';

interface QuestsModalProps {
  quests: Quest[];
  onClose: () => void;
  onSelectActiveQuest: (id: string) => void;
}

export const QuestsModal: React.FC<QuestsModalProps> = ({ quests, onClose, onSelectActiveQuest }) => {
  const [filter, setFilter] = useState<string>('all');

  const filteredQuests = quests.filter(q => filter === 'all' || q.category === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none font-['Share_Tech_Mono',monospace]">
      <div className="max-w-2xl w-full bg-slate-900 border border-teal-500/40 rounded-3xl p-6 text-slate-200 relative">
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-6 h-6 text-teal-400" />
          <h2 className="font-['Cinzel'] text-xl font-bold text-white">Quest Journal & Challenges</h2>
        </div>
        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 text-xs">
          {['all', 'main_storyline', 'exploration_quests', 'collection_quests', 'boss_quests'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-lg uppercase ${filter === cat ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {filteredQuests.map(q => (
            <div key={q.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {q.state === 'completed' ? <CheckCircle2 className="w-4 h-4 text-teal-400" /> : <Circle className="w-4 h-4 text-slate-500" />}
                  <h3 className="font-bold text-sm text-white">{q.name}</h3>
                </div>
                <p className="text-xs text-slate-400 font-sans ml-6">{q.description}</p>
                <div className="ml-6 mt-2 text-[11px] text-cyan-300 font-mono">Objective: {q.objective}</div>
              </div>
              <button
                onClick={() => onSelectActiveQuest(q.id)}
                className="px-3 py-1.5 rounded-lg bg-teal-950 border border-teal-500/40 text-teal-300 text-xs"
              >
                Track
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
