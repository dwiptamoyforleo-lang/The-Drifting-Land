/**
 * Quest & Discovery Journal Modal for The Drifting Land.
 * Displays active & completed quests, objective checklists, reward summaries,
 * and the comprehensive Discovery Logbook of explored ruins, beacons, chambers, and lore.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Circle,
  Coins,
  Compass,
  MapPin,
  Eye,
  BookOpen,
  Gem,
  Home,
  Shield,
  Radio,
} from 'lucide-react';
import { QuestDefinition, QuestProgress } from '../types/game';
import { QuestSystem } from '../systems/questSystem';
import { getAllDiscoveries, DISCOVERIES_CATALOG } from '../data/discoveries';

interface QuestJournalModalProps {
  questSystem: QuestSystem;
  discoveries?: string[];
  onClose: () => void;
}

export const QuestJournalModal: React.FC<QuestJournalModalProps> = ({
  questSystem,
  discoveries = [],
  onClose,
}) => {
  const [tab, setTab] = useState<'active' | 'completed' | 'discoveries'>('active');
  const [journal, setJournal] = useState<{
    active: { def: QuestDefinition; progress: QuestProgress }[];
    completed: QuestDefinition[];
  }>(() => questSystem.getJournalSnapshot());

  const allDiscoveriesList = getAllDiscoveries();
  const discoveredCount = allDiscoveriesList.filter(
    (d) => discoveries.includes(d.id) || discoveries.includes(d.name)
  ).length;

  useEffect(() => {
    const unsub = questSystem.subscribe((updated) => {
      setJournal(updated);
    });
    return unsub;
  }, [questSystem]);

  // Handle ESC or J or Q key to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyJ' || e.code === 'KeyQ') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'BEACON':
        return { text: 'BEACON', color: 'text-emerald-300 border-emerald-800 bg-emerald-950/80' };
      case 'RUINS':
        return { text: 'RUINS', color: 'text-amber-300 border-amber-800 bg-amber-950/80' };
      case 'CHAMBER':
        return { text: 'CHAMBER', color: 'text-cyan-300 border-cyan-800 bg-cyan-950/80' };
      case 'LOCATION':
        return { text: 'SETTLEMENT', color: 'text-sky-300 border-sky-800 bg-sky-950/80' };
      case 'STRUCTURE':
        return { text: 'STRUCTURE', color: 'text-indigo-300 border-indigo-800 bg-indigo-950/80' };
      case 'RECORD':
        return { text: 'LORE RECORD', color: 'text-purple-300 border-purple-800 bg-purple-950/80' };
      default:
        return { text: category, color: 'text-slate-300 border-slate-800 bg-slate-900' };
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-xl rounded-3xl bg-[#0c121d] border border-slate-800 p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-serif font-black tracking-widest text-slate-100 uppercase">
              EXPEDITION LOGBOOK
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close logbook"
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800/80 mb-4">
          <button
            onClick={() => setTab('active')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer ${
              tab === 'active'
                ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Quests ({journal.active.length})
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer ${
              tab === 'completed'
                ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Completed ({journal.completed.length})
          </button>
          <button
            onClick={() => setTab('discoveries')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer ${
              tab === 'discoveries'
                ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Discoveries ({discoveredCount}/{allDiscoveriesList.length})
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
          {/* TAB 1: ACTIVE QUESTS */}
          {tab === 'active' && journal.active.length === 0 && (
            <div className="text-center py-12 text-xs font-mono text-slate-500">
              No active quests in your journal. Speak with wandering scouts or inspect ancient ruins to discover missions.
            </div>
          )}

          {tab === 'active' &&
            journal.active.map(({ def, progress }) => (
              <div
                key={def.id}
                className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{def.title}</h3>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                      Giver: {def.giverName}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-[10px] font-mono text-emerald-300">
                    IN PROGRESS
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{def.description}</p>

                {/* Objectives Checklist */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-900">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Objectives
                  </span>
                  {def.objectives.map((obj) => {
                    const current = progress.objectives[obj.id] || 0;
                    const isDone = current >= obj.targetCount;
                    return (
                      <div key={obj.id} className="flex items-center gap-2 text-xs">
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        )}
                        <span className={`font-sans ${isDone ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                          {obj.description}
                        </span>
                        <span className="ml-auto text-[11px] font-mono text-emerald-400 tabular-nums font-bold">
                          {current}/{obj.targetCount}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Rewards preview */}
                <div className="flex items-center gap-3 pt-2 text-[11px] font-mono text-slate-400 border-t border-slate-900/50">
                  <span className="text-slate-500">Rewards:</span>
                  <span className="text-amber-400 flex items-center gap-1">
                    <Coins className="w-3 h-3" /> +{def.rewards.coins} Coins
                  </span>
                  <span className="text-cyan-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> +{def.rewards.experience} XP
                  </span>
                </div>
              </div>
            ))}

          {/* TAB 2: COMPLETED QUESTS */}
          {tab === 'completed' && journal.completed.length === 0 && (
            <div className="text-center py-12 text-xs font-mono text-slate-500">
              No completed expeditions recorded yet.
            </div>
          )}

          {tab === 'completed' &&
            journal.completed.map((def) => (
              <div
                key={def.id}
                className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/60 flex flex-col gap-2 opacity-80"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-300 line-through">{def.title}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-900 text-[10px] font-mono text-emerald-400">
                    COMPLETED
                  </span>
                </div>
                <p className="text-xs text-slate-500">{def.description}</p>
              </div>
            ))}

          {/* TAB 3: DISCOVERY RECORDS */}
          {tab === 'discoveries' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1 text-xs font-mono text-slate-400">
                <span>Archaeological Survey of The Verdant Reach</span>
                <span className="text-emerald-400 font-bold">
                  {discoveredCount} / {allDiscoveriesList.length} Cataloged
                </span>
              </div>

              {allDiscoveriesList.map((disc) => {
                const isFound = discoveries.includes(disc.id) || discoveries.includes(disc.name);
                const badge = getCategoryBadge(disc.category);

                return (
                  <div
                    key={disc.id}
                    className={`rounded-2xl p-4 border transition-all ${
                      isFound
                        ? 'bg-slate-950/80 border-slate-800 flex flex-col gap-2'
                        : 'bg-slate-950/30 border-slate-900/60 opacity-60 flex flex-col gap-1'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isFound ? (
                          <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <h4 className={`text-sm font-bold ${isFound ? 'text-slate-100' : 'text-slate-500'}`}>
                          {isFound ? disc.name : '??? [Uncharted Discovery]'}
                        </h4>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono border ${badge.color}`}>
                        {badge.text}
                      </span>
                    </div>

                    {isFound ? (
                      <>
                        <span className="text-[11px] font-mono text-emerald-400/90">
                          {disc.subtitle} · Pos: [{Math.round(disc.coordinates[0])}, {Math.round(disc.coordinates[2])}]
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">{disc.description}</p>
                        <p className="text-xs font-serif italic text-slate-400 border-l-2 border-emerald-500/40 pl-2.5 py-0.5 bg-slate-900/40 rounded-r-lg">
                          "{disc.lore}"
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-600 italic">
                        Explore the floating archipelago, inspect ancient structures, and climb high vantage points to uncover this entry.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
