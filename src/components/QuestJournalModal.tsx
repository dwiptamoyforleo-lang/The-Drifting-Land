/**
 * Quest & Discovery Journal Modal for The Drifting Land.
 * Implements Prompt 8:
 * - 10 Quest Categories with filtering and detailed objective tracking
 * - Selected active quest tracking with target coordinates
 * - Meaningful Exploration Rank progression view with active perks
 * - Comprehensive Achievements view with unlock timestamps and rewards
 * - Discovered landmarks and ancient records archive
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
  Award,
  Lock,
  Star,
  Layers,
  ChevronRight,
  Filter,
  Check,
} from 'lucide-react';
import { QuestDefinition, QuestProgress, QuestCategory } from '../types/game';
import { QuestSystem, QuestJournalSnapshot } from '../systems/questSystem';
import { AchievementSystem, UnlockedAchievementRecord } from '../systems/achievementSystem';
import { getAllDiscoveries, DISCOVERIES_CATALOG } from '../data/discoveries';
import { EXPLORATION_RANKS } from '../data/achievements';

interface QuestJournalModalProps {
  questSystem: QuestSystem;
  achievementSystem?: AchievementSystem;
  discoveries?: string[];
  onClose: () => void;
}

const CATEGORY_LABELS: Record<QuestCategory | 'all', string> = {
  all: 'All Categories',
  main: 'Storyline',
  side: 'Side Tasks',
  exploration: 'Exploration',
  collection: 'Collection',
  research: 'Research',
  npc: 'NPC Quests',
  crafting: 'Crafting',
  boss: 'Boss Encounters',
  dimension: 'Dimensional',
  event: 'Events',
};

export const QuestJournalModal: React.FC<QuestJournalModalProps> = ({
  questSystem,
  achievementSystem,
  discoveries = [],
  onClose,
}) => {
  const [mainTab, setMainTab] = useState<'quests' | 'ranks' | 'achievements'>('quests');
  const [questFilter, setQuestFilter] = useState<'all' | 'active' | 'completed' | 'available'>('all');
  const [categoryFilter, setCategoryFilter] = useState<QuestCategory | 'all'>('all');
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  const [snapshot, setSnapshot] = useState<QuestJournalSnapshot>(() =>
    questSystem.getJournalSnapshot()
  );
  const [achievements, setAchievements] = useState<UnlockedAchievementRecord[]>(() =>
    achievementSystem ? achievementSystem.getAll() : []
  );

  useEffect(() => {
    const unsubQuests = questSystem.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
    });
    let unsubAch: (() => void) | undefined;
    if (achievementSystem) {
      unsubAch = achievementSystem.subscribe((newAch) => {
        setAchievements(newAch);
      });
    }
    return () => {
      unsubQuests();
      unsubAch?.();
    };
  }, [questSystem, achievementSystem]);

  // Default select first available/active quest
  useEffect(() => {
    if (!selectedQuestId) {
      if (snapshot.trackedQuestId) {
        setSelectedQuestId(snapshot.trackedQuestId);
      } else if (snapshot.active.length > 0) {
        setSelectedQuestId(snapshot.active[0].def.id);
      } else if (snapshot.completed.length > 0) {
        setSelectedQuestId(snapshot.completed[0].id);
      }
    }
  }, [snapshot, selectedQuestId]);

  // Filter quest list
  const allQuests: { def: QuestDefinition; status: 'active' | 'completed' | 'available'; progress?: QuestProgress }[] = [
    ...snapshot.active.map((q) => ({ def: q.def, status: 'active' as const, progress: q.progress })),
    ...snapshot.available.map((def) => ({ def, status: 'available' as const })),
    ...snapshot.completed.map((def) => ({ def, status: 'completed' as const })),
  ];

  const filteredQuests = allQuests.filter((entry) => {
    if (questFilter !== 'all' && entry.status !== questFilter) return false;
    if (categoryFilter !== 'all' && entry.def.category !== categoryFilter) return false;
    return true;
  });

  const selectedEntry = allQuests.find((q) => q.def.id === selectedQuestId) || allQuests[0];

  const allDiscoveriesList = getAllDiscoveries();
  const discoveredCount = allDiscoveriesList.filter((d) => discoveries.includes(d.id)).length;
  const unlockedAchCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-5xl h-[90vh] bg-[#0c121d] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#080d16]/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-600/50 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-mono tracking-wide text-white">
                Archipelago Codex & Journal
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="text-cyan-300">Rank {snapshot.explorationRank}: {snapshot.currentRankInfo.title}</span>
                <span>•</span>
                <span>{snapshot.active.length} Active Quests</span>
                <span>•</span>
                <span>{unlockedAchCount}/{achievements.length} Achievements</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setMainTab('quests')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                mainTab === 'quests'
                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Quests
            </button>
            <button
              onClick={() => setMainTab('ranks')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                mainTab === 'ranks'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Exploration & Lore
            </button>
            <button
              onClick={() => setMainTab('achievements')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                mainTab === 'achievements'
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Achievements
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Journal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab 1: Quests View */}
        {mainTab === 'quests' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Column: Filter & Quest List */}
            <div className="w-full md:w-5/12 border-r border-slate-800/80 flex flex-col bg-[#0a0f19]">
              {/* Category Filter Pills */}
              <div className="p-3 border-b border-slate-800/60 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Filter className="w-3 h-3 text-cyan-400" /> Filter State:
                  </span>
                  <div className="flex gap-1">
                    {(['all', 'active', 'available', 'completed'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setQuestFilter(s)}
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono cursor-pointer ${
                          questFilter === s
                            ? 'bg-cyan-900/60 text-cyan-200 border border-cyan-500/50'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Dropdown */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="w-full bg-[#121c2d] border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quest List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {filteredQuests.length === 0 ? (
                  <div className="py-12 text-center text-xs font-mono text-slate-500">
                    No quests found matching current filter.
                  </div>
                ) : (
                  filteredQuests.map(({ def, status }) => {
                    const isSelected = selectedEntry?.def.id === def.id;
                    const isTracked = snapshot.trackedQuestId === def.id;

                    return (
                      <div
                        key={def.id}
                        onClick={() => setSelectedQuestId(def.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-[#152238] border-cyan-500/80 shadow-md'
                            : 'bg-[#0f1726]/80 border-slate-800/80 hover:bg-[#131d2e] hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded ${
                              def.category === 'main'
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40'
                                : def.category === 'boss'
                                ? 'bg-red-950/80 text-red-300 border border-red-600/40'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {def.category}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isTracked && (
                              <span className="flex items-center gap-0.5 text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-600/40">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                Tracked
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-mono font-bold uppercase ${
                                status === 'completed'
                                  ? 'text-emerald-400'
                                  : status === 'active'
                                  ? 'text-cyan-400'
                                  : 'text-slate-500'
                              }`}
                            >
                              {status}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                          {def.title}
                        </span>

                        <span className="text-[11px] text-slate-400 line-clamp-1">
                          {def.description}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Detailed Quest Inspector */}
            <div className="w-full md:w-7/12 flex flex-col overflow-y-auto bg-[#0c121d] p-5 space-y-5">
              {selectedEntry ? (
                <>
                  {/* Title & Tracker Button */}
                  <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
                          {selectedEntry.def.category} Quest
                        </span>
                        {selectedEntry.def.giverName && (
                          <span className="text-xs font-mono text-slate-400">
                            Giver: {selectedEntry.def.giverName}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold font-mono text-white">
                        {selectedEntry.def.title}
                      </h3>
                      {selectedEntry.def.targetLocationName && (
                        <div className="flex items-center gap-1 text-xs font-mono text-cyan-400 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Target: {selectedEntry.def.targetLocationName}</span>
                        </div>
                      )}
                    </div>

                    {selectedEntry.status === 'active' && (
                      <button
                        onClick={() => questSystem.setTrackedQuest(selectedEntry.def.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          snapshot.trackedQuestId === selectedEntry.def.id
                            ? 'bg-amber-600/30 text-amber-300 border border-amber-500/60 shadow-md'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            snapshot.trackedQuestId === selectedEntry.def.id
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-400'
                          }`}
                        />
                        <span>
                          {snapshot.trackedQuestId === selectedEntry.def.id
                            ? 'Tracked'
                            : 'Track Quest'}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Synopsis Description */}
                  <div className="bg-[#101726] border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {selectedEntry.def.description}
                  </div>

                  {/* Lore Clue Snippet */}
                  {selectedEntry.def.loreSnippet && (
                    <div className="border-l-2 border-cyan-500/70 pl-3.5 py-1 text-xs font-mono italic text-cyan-200/90 bg-cyan-950/20 rounded-r-lg">
                      "{selectedEntry.def.loreSnippet}"
                    </div>
                  )}

                  {/* Objectives Checklist with Progress */}
                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Objectives Checklist
                    </h4>
                    <div className="space-y-2">
                      {selectedEntry.def.objectives.map((obj) => {
                        const current =
                          selectedEntry.progress?.objectives[obj.id] ||
                          (selectedEntry.status === 'completed' ? obj.targetCount : 0);
                        const isDone = current >= obj.targetCount;
                        const progressRatio = Math.min(1, current / obj.targetCount);

                        return (
                          <div
                            key={obj.id}
                            className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                              isDone
                                ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-200'
                                : 'bg-[#101726] border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs sm:text-sm font-mono">
                              <div className="flex items-center gap-2">
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                                )}
                                <span>{obj.description}</span>
                              </div>
                              <span className="font-bold tabular-nums">
                                {current} / {obj.targetCount}
                              </span>
                            </div>

                            {/* Objective Progress Bar */}
                            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isDone ? 'bg-emerald-500' : 'bg-cyan-500'
                                }`}
                                style={{ width: `${progressRatio * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rewards Breakdown */}
                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Gem className="w-3.5 h-3.5 text-amber-400" />
                      Completion Rewards
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                      {selectedEntry.def.rewards.experience > 0 && (
                        <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 flex items-center gap-2 text-cyan-300">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          <span>+{selectedEntry.def.rewards.experience} EXP</span>
                        </div>
                      )}
                      {selectedEntry.def.rewards.coins > 0 && (
                        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-center gap-2 text-amber-300">
                          <Coins className="w-4 h-4 text-amber-400" />
                          <span>+{selectedEntry.def.rewards.coins} Coins</span>
                        </div>
                      )}
                      {selectedEntry.def.rewards.items?.map((item) => (
                        <div
                          key={item.itemId}
                          className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-2 text-emerald-300 truncate"
                        >
                          <Gem className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="truncate">
                            x{item.quantity} {item.itemId.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="m-auto text-center text-xs font-mono text-slate-500">
                  Select a quest to inspect details.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Exploration Ranks & Discovered Lore */}
        {mainTab === 'ranks' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-6">
            {/* Exploration Rank Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/80 to-[#101726] border border-cyan-600/40 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                    Active Exploration Standing
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold font-mono text-white">
                    Rank {snapshot.explorationRank}: {snapshot.currentRankInfo.title}
                  </h3>
                  <p className="text-xs font-mono text-cyan-200 mt-0.5">
                    Active Perk: <span className="font-bold text-white">{snapshot.currentRankInfo.perkName}</span> — {snapshot.currentRankInfo.perkDescription}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs text-slate-400">Exploration XP: </span>
                  <span className="text-sm font-bold text-cyan-300 tabular-nums">
                    {snapshot.explorationXp}
                  </span>
                  {snapshot.nextRankInfo && (
                    <span className="text-xs text-slate-500"> / {snapshot.nextRankInfo.requiredXp} XP</span>
                  )}
                </div>
              </div>

              {/* Progress Bar to next rank */}
              {snapshot.nextRankInfo && (
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700/60">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (snapshot.explorationXp / snapshot.nextRankInfo.requiredXp) * 100
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Exploration Rank Ladders */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-cyan-400" />
                Exploration Rank Privileges
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {EXPLORATION_RANKS.map((r) => {
                  const isCurrent = r.rank === snapshot.explorationRank;
                  const isUnlocked = snapshot.explorationRank >= r.rank;

                  return (
                    <div
                      key={r.rank}
                      className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                        isCurrent
                          ? 'bg-cyan-950/40 border-cyan-500 shadow-md ring-1 ring-cyan-500/40'
                          : isUnlocked
                          ? 'bg-[#101726] border-emerald-800/40 text-slate-300'
                          : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-white">Rank {r.rank}: {r.title}</span>
                        {isUnlocked ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                            <Lock className="w-3 h-3" /> {r.requiredXp} XP
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-cyan-300 font-semibold">
                        {r.perkName}
                      </span>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        {r.perkDescription}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Discovered Landmarks & Records */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  Discovered Landmarks ({discoveredCount} / {allDiscoveriesList.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allDiscoveriesList.map((disc) => {
                  const isFound = discoveries.includes(disc.id);

                  return (
                    <div
                      key={disc.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isFound
                          ? 'bg-[#101726] border-slate-700/80 text-slate-200'
                          : 'bg-slate-950/40 border-slate-900 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono mb-1">
                        <span className="font-bold text-white">
                          {isFound ? disc.name : 'Unknown Discovery'}
                        </span>
                        <span className="text-[10px] uppercase text-cyan-400">
                          {isFound ? disc.category : 'Undiscovered'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {isFound ? disc.lore || disc.description : 'Explore the archipelago to uncover this ancient site.'}
                      </p>
                      {isFound && disc.coordinates && (
                        <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                          Coordinates: [{disc.coordinates[0]}, {disc.coordinates[2]}]
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Achievements */}
        {mainTab === 'achievements' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold font-mono text-white">
                  Archipelago Achievements
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {unlockedAchCount} of {achievements.length} Unlocked
                </span>
              </div>
              <div className="text-right text-xs font-mono text-amber-300">
                <span>Total Bonus Coins Earned: </span>
                <span className="font-bold tabular-nums">
                  {achievements
                    .filter((a) => a.unlocked)
                    .reduce((acc, curr) => acc + curr.def.rewards.coins, 0)}{' '}
                  Coins
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {achievements.map(({ def, unlocked, timestamp }) => (
                <div
                  key={def.id}
                  className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                    unlocked
                      ? 'bg-[#101726] border-amber-600/50 shadow-md ring-1 ring-amber-500/20'
                      : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl border shrink-0 ${
                      unlocked
                        ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-600'
                    }`}
                  >
                    {unlocked ? <Award className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold font-mono text-white truncate">
                        {def.title}
                      </h4>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {def.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      {def.description}
                    </p>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-2">
                      <span className="text-amber-400/90">
                        +{def.rewards.experience} XP • +{def.rewards.coins} Coins
                      </span>
                      {unlocked && timestamp && (
                        <span>
                          Unlocked {new Date(timestamp).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
