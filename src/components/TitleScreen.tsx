/**
 * Polished, Responsive Main Menu & Hub for The Drifting Land.
 * Multi-panel tabbed architecture keeping viewport balanced and accessible.
 * - Original bespoke SVG title lockup & runic identity
 * - Live 3D animated background pass-through
 * - Tabbed navigation: Journey, Level Select, Dimensions, Codex, Inventory, Shop, Settings, Credits
 * - Saved profile & progress summary card (Rank, Level, Shards, Checkpoints, Days)
 * - Current world-event information (Red Moon phase, weather forecast, next eclipse)
 * - Version & engine runtime status bar
 */

import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Settings,
  Compass,
  Sparkles,
  Play,
  RotateCcw,
  BookOpen,
  Package,
  ShoppingBag,
  Award,
  Globe2,
  Info,
  Layers,
  ChevronRight,
  Shield,
  Coins,
  Sun,
  Moon,
  Flame,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { AudioService } from '../services/audio';
import { SaveData, RegionDefinition, TraderCatalog } from '../types/game';
import { REGIONS, DIMENSIONS } from '../data/regions';
import { ACHIEVEMENTS_CATALOG } from '../data/achievements';
import { TRADER_CATALOGS } from '../data/traders';

type MainMenuTab =
  | 'JOURNEY'
  | 'LEVELS'
  | 'DIMENSIONS'
  | 'CODEX'
  | 'INVENTORY'
  | 'SHOP'
  | 'CREDITS';

interface TitleScreenProps {
  hasExistingSave: boolean;
  activeSave?: SaveData | null;
  onStartGame: (isNew: boolean, destinationRegionId?: string) => void;
  onOpenSettings: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasExistingSave,
  activeSave,
  onStartGame,
  onOpenSettings,
  soundEnabled,
  onToggleSound,
}) => {
  const [activeTab, setActiveTab] = useState<MainMenuTab>('JOURNEY');

  // Listen for Enter or Space to quickly start game when on JOURNEY tab
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.code === 'Enter' || e.code === 'Space') && activeTab === 'JOURNEY') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') return;
        e.preventDefault();
        onStartGame(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStartGame, activeTab]);

  const stats = activeSave?.playerStats;
  const wallet = activeSave?.wallet;
  const currentRegion = REGIONS[activeSave?.regionId || 'verdant_reach'] || REGIONS.verdant_reach;
  const currentDimension = DIMENSIONS[currentRegion.dimensionId] || DIMENSIONS.the_living_reach;

  const totalAchievements = Object.values(ACHIEVEMENTS_CATALOG).length;
  const unlockedAchievementsCount = Object.keys(activeSave?.achievements || {}).filter(
    (k) => activeSave?.achievements?.[k]?.unlocked
  ).length;

  const completedQuestsCount = Object.keys(activeSave?.quests || {}).filter(
    (k) => activeSave?.quests?.[k]?.status === 'completed'
  ).length;

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-8 select-none overflow-hidden bg-gradient-to-b from-[#080d18]/70 via-transparent to-[#080d18]/90">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between w-full">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1 sm:gap-2 p-1 rounded-2xl bg-[#0b121e]/85 border border-slate-800/80 shadow-2xl backdrop-blur-md overflow-x-auto max-w-[80vw]">
          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('JOURNEY');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'JOURNEY'
                ? 'bg-emerald-600 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Journey</span>
          </button>

          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('LEVELS');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'LEVELS'
                ? 'bg-emerald-600 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Levels</span>
          </button>

          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('DIMENSIONS');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'DIMENSIONS'
                ? 'bg-emerald-600 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Dimensions</span>
          </button>

          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('CODEX');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CODEX'
                ? 'bg-emerald-600 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Codex</span>
          </button>

          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('INVENTORY');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'INVENTORY'
                ? 'bg-emerald-600 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Collection</span>
          </button>

          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('SHOP');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'SHOP'
                ? 'bg-emerald-600 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Shop</span>
          </button>

          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('CREDITS');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CREDITS'
                ? 'bg-emerald-600 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Credits</span>
          </button>
        </div>

        {/* Action Controls: Sound & Settings */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSound}
            aria-label="Toggle Sound"
            className="p-2.5 rounded-xl bg-[#0b121e]/85 hover:bg-[#1f2937] border border-slate-700/60 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer shadow-lg"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="p-2.5 rounded-xl bg-[#0b121e]/85 hover:bg-[#1f2937] border border-slate-700/60 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer shadow-lg"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Tab Panels Area */}
      <div className="my-auto max-w-4xl mx-auto w-full py-4 flex flex-col items-center">
        {/* TAB 1: JOURNEY / PLAY HUB */}
        {activeTab === 'JOURNEY' && (
          <div className="flex flex-col items-center text-center w-full">
            {/* Bespoke SVG Title Lockup */}
            <div className="w-full max-w-lg mb-3 drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)]">
              <svg viewBox="0 0 540 90" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M40 76 L220 76 M320 76 L500 76" stroke="#059669" strokeWidth="1.5" strokeOpacity="0.5" />
                <polygon points="270,70 276,76 270,82 264,76" fill="#34d399" />
                <text
                  x="270"
                  y="40"
                  textAnchor="middle"
                  className="fill-slate-100 font-serif font-black tracking-[0.22em] text-3xl sm:text-4xl"
                  style={{ letterSpacing: '0.24em', textShadow: '0 4px 18px rgba(16,185,129,0.35)' }}
                >
                  THE DRIFTING LAND
                </text>
                <text
                  x="270"
                  y="62"
                  textAnchor="middle"
                  className="fill-emerald-400 font-mono text-[10px] tracking-[0.38em] uppercase"
                >
                  ATMOSPHERIC OPEN-WORLD PROGRESSION
                </text>
              </svg>
            </div>

            <p className="text-slate-300 text-sm max-w-lg mx-auto mb-6 font-light leading-relaxed">
              Explore floating archipelagos, restore ancient monolith beacons, attune with trans-dimensional portals, and uncover the forgotten history of the Great Drift.
            </p>

            {/* Profile & World Event Row */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mb-6 text-left">
              {/* Profile Summary Card */}
              <div className="p-4 rounded-2xl bg-[#0c131f]/90 border border-slate-800 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Explorer Profile
                  </span>
                  <span>Rank {activeSave?.explorationRank || 1}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-mono block">Level</span>
                    <span className="font-bold text-slate-100 text-sm">{stats?.level || 1}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-mono block">Days Survived</span>
                    <span className="font-bold text-slate-100 text-sm">Day {activeSave?.worldTime?.dayCount || 1}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-mono block">Checkpoints</span>
                    <span className="font-bold text-slate-100 text-sm">
                      {activeSave?.activatedCheckpoints?.length || 1} Attuned
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-mono block">Relic Shards</span>
                    <span className="font-bold text-slate-100 text-sm">
                      {activeSave?.collectedShardIds?.length || 0}/5 Found
                    </span>
                  </div>
                </div>
              </div>

              {/* World Event Information Card */}
              <div className="p-4 rounded-2xl bg-[#0c131f]/90 border border-slate-800 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between text-xs font-mono text-amber-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    {activeSave?.redMoon?.isActive ? (
                      <Moon className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                    ) : (
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    Archipelago Weather
                  </span>
                  <span className="uppercase text-[10px]">{activeSave?.currentWeather || 'Clear Sky'}</span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="text-slate-300 font-medium">
                    {activeSave?.redMoon?.isActive
                      ? 'BLOOD ORBIT ECLIPSE ACTIVE'
                      : 'Equilibrium Solar Alignment'}
                  </div>
                  <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                    {activeSave?.redMoon?.isActive
                      ? 'Corrupted sentinels roam freely. Defeat the Crimson Warden to cleanse the islands.'
                      : 'Winds are steady across The Verdant Reach. Beacon resonance channels are stable.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Launch CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              {hasExistingSave ? (
                <>
                  <button
                    onClick={() => {
                      AudioService.playUiClick();
                      onStartGame(false);
                    }}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-sm tracking-wide shadow-xl shadow-emerald-950/70 hover:shadow-emerald-900/60 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Continue Journey</span>
                  </button>
                  <button
                    onClick={() => {
                      AudioService.playUiClick();
                      onStartGame(true);
                    }}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs tracking-wide border border-slate-700/60 transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>New Expedition</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    AudioService.playUiClick();
                    onStartGame(true);
                  }}
                  className="w-full sm:w-auto px-10 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-sm tracking-wide shadow-xl shadow-emerald-950/80 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Begin Expedition</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LEVEL SELECTION */}
        {activeTab === 'LEVELS' && (
          <div className="w-full p-6 rounded-2xl bg-[#0c131f]/95 border border-slate-800 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-serif font-bold text-slate-100">
                  Archipelago Destinations
                </h3>
                <p className="text-xs text-slate-400">
                  Six unique regional archipelagos suspended across the Great Drift.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.values(REGIONS).map((reg) => {
                const isUnlocked =
                  reg.id === 'verdant_reach' ||
                  (activeSave?.dimensionProgress?.[reg.dimensionId]?.unlocked ?? false);
                return (
                  <div
                    key={reg.id}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-200">{reg.name}</span>
                        {isUnlocked ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                        {reg.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                      <span>Gravity: {Math.round((reg.gravityModifier ?? 1.0) * 100)}%</span>
                      <button
                        onClick={() => {
                          AudioService.playUiClick();
                          onStartGame(false, reg.id);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Launch</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: DIMENSIONS */}
        {activeTab === 'DIMENSIONS' && (
          <div className="w-full p-6 rounded-2xl bg-[#0c131f]/95 border border-slate-800 shadow-2xl backdrop-blur-md">
            <div className="mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-lg font-serif font-bold text-slate-100">
                The Five Dimensional Strata
              </h3>
              <p className="text-xs text-slate-400">
                Distinct cosmic planes fractured during the Great Drift, each bound by unique gravitational constants.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.values(DIMENSIONS).map((dim) => (
                <div
                  key={dim.id}
                  className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: dim.themeColor }}
                      />
                      <h4 className="text-sm font-semibold text-slate-100">{dim.name}</h4>
                      <span className="text-[10px] font-mono text-slate-400 ml-auto">
                        {dim.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-light leading-relaxed mb-2">
                      {dim.description}
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Gravity Constant: {Math.round(dim.gravityModifier * 100)}% Standard
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CODEX (Quests & Achievements) */}
        {activeTab === 'CODEX' && (
          <div className="w-full p-6 rounded-2xl bg-[#0c131f]/95 border border-slate-800 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-serif font-bold text-slate-100">
                  Archipelago Codex
                </h3>
                <p className="text-xs text-slate-400">
                  Data-driven quests, achievements, and exploration progression.
                </p>
              </div>
              <div className="text-xs font-mono text-emerald-400">
                {unlockedAchievementsCount}/{totalAchievements} Achievements
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <BookOpen className="w-4 h-4" />
                  <span>Quest Progression</span>
                </div>
                <div className="text-xl font-bold text-slate-100">
                  {completedQuestsCount} Quests Completed
                </div>
                <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                  The initial 8-step storyline leads from the Starting Clearing through the Ancient Beacon to the first Dimensional Portal.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-purple-400">
                  <Award className="w-4 h-4" />
                  <span>Exploration Ranks</span>
                </div>
                <div className="text-xl font-bold text-slate-100">
                  Rank {activeSave?.explorationRank || 1} / 5
                </div>
                <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                  Earn exploration XP by attuning waystones, cataloging flora, finding relics, and uncovering ancient chamber steles.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: INVENTORY & COLLECTION */}
        {activeTab === 'INVENTORY' && (
          <div className="w-full p-6 rounded-2xl bg-[#0c131f]/95 border border-slate-800 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-serif font-bold text-slate-100">
                  Expedition Pouch & Wallet
                </h3>
                <p className="text-xs text-slate-400">
                  Harvested flora, tools, relics, and archipelago currencies.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-amber-300 font-bold">
                  {wallet?.driftCoins ?? 75} Drift Coins
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-purple-300 font-bold">
                  {wallet?.aetherEssence ?? 0} Aether
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(activeSave?.inventory && activeSave.inventory.length > 0
                ? activeSave.inventory.slice(0, 8)
                : [
                    { itemId: 'traveler_rations', quantity: 3 },
                    { itemId: 'drift_bread', quantity: 2 },
                    { itemId: 'drift_bloom_nectar', quantity: 1 },
                  ]
              ).map((slot, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left"
                >
                  <div className="text-xs font-semibold text-slate-200 capitalize">
                    {slot.itemId.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400 mt-1">
                    Qty: {slot.quantity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: SHOP PREVIEW */}
        {activeTab === 'SHOP' && (
          <div className="w-full p-6 rounded-2xl bg-[#0c131f]/95 border border-slate-800 shadow-2xl backdrop-blur-md">
            <div className="mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-lg font-serif font-bold text-slate-100">
                Trading Outpost Catalogs
              </h3>
              <p className="text-xs text-slate-400">
                Merchants and specialized purveyors stationed at settlement sanctuaries.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.values(TRADER_CATALOGS) as TraderCatalog[]).map((cat) => (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800"
                >
                  <div className="text-xs font-bold text-slate-100 mb-1">{cat.traderName}</div>
                  <div className="text-[10px] font-mono text-emerald-400 mb-2">
                    {cat.title}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {cat.greeting}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: CREDITS */}
        {activeTab === 'CREDITS' && (
          <div className="w-full p-6 rounded-2xl bg-[#0c131f]/95 border border-slate-800 shadow-2xl backdrop-blur-md space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-serif font-bold text-slate-100">
                The Drifting Land
              </h3>
              <p className="text-xs text-slate-400">
                An atmospheric 3D procedural survival adventure.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="font-mono text-emerald-400 uppercase text-[10px] block">World & Rendering</span>
                <p className="text-slate-300 font-light mt-1">
                  Three.js WebGL 2.0 Engine, custom procedural terrain generators, and atmospheric shaders.
                </p>
              </div>
              <div>
                <span className="font-mono text-purple-400 uppercase text-[10px] block">Procedural Audio</span>
                <p className="text-slate-300 font-light mt-1">
                  Synthetic Web Audio API engine. Wind drones, harmonic chords, and acoustic SFX.
                </p>
              </div>
              <div>
                <span className="font-mono text-amber-400 uppercase text-[10px] block">Architecture</span>
                <p className="text-slate-300 font-light mt-1">
                  Data-driven quest graphs, regional gravitation, entity schedules, and client persistence.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            WebGL Active
          </span>
          <span className="text-slate-600">·</span>
          <span>v1.2.0 Engine</span>
          <span className="text-slate-600">·</span>
          <span className="hidden sm:inline">60 FPS Target</span>
        </div>

        <div className="text-[11px] text-slate-500">
          Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">[SPACE]</kbd> or{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">[ENTER]</kbd> to launch expedition
        </div>
      </div>
    </div>
  );
};
