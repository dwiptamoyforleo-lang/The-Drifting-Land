/**
 * Level & Destination Selection Interface for The Drifting Land.
 * Allows browsing all 6 archipelagos/strata across the 5 dimensions,
 * inspecting environmental gravity, danger tiers, discovery lore, and leaping to unlocked destinations.
 */

import React, { useState } from 'react';
import {
  X,
  Compass,
  Lock,
  Sparkles,
  ArrowRight,
  Flame,
  Moon,
  Library,
  Zap,
  CheckCircle,
} from 'lucide-react';
import { REGIONS, DIMENSIONS } from '../data/regions';
import { RegionDefinition } from '../types/game';
import { AudioService } from '../services/audio';

interface LevelSelectModalProps {
  currentRegionId?: string;
  unlockedRegionIds?: string[];
  explorationRank?: number;
  onSelectDestination: (regionId: string) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentRegionId = 'verdant_reach',
  unlockedRegionIds = ['verdant_reach'],
  explorationRank = 1,
  onSelectDestination,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string>(currentRegionId);

  const regionList = Object.values(REGIONS);
  const selectedRegion = REGIONS[selectedId] || regionList[0];
  const dimension = DIMENSIONS[selectedRegion.dimensionId] || DIMENSIONS.the_living_reach;

  const isUnlocked = unlockedRegionIds.includes(selectedId) || selectedRegion.id === 'verdant_reach';

  const handleTravel = (region: RegionDefinition) => {
    if (!isUnlocked) return;
    AudioService.playUiClick();
    AudioService.playGatewayTeleport();
    onSelectDestination(region.id);
  };

  const getDimensionIcon = (dimId: string) => {
    switch (dimId) {
      case 'the_ashen_expanse':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'the_moonveil':
        return <Moon className="w-4 h-4 text-purple-400" />;
      case 'the_fractured_archive':
        return <Library className="w-4 h-4 text-sky-400" />;
      case 'the_rift':
        return <Zap className="w-4 h-4 text-rose-400" />;
      default:
        return <Compass className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-select-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm select-none"
    >
      <div className="w-full max-w-4xl h-[90vh] max-h-[700px] bg-[#0c131f] border border-slate-700/60 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-[#0a0f18]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono tracking-widest uppercase text-emerald-400">
                Archipelago Cartography · Rank {explorationRank}
              </div>
              <h2 id="level-select-title" className="text-xl font-serif font-bold text-slate-100">
                Destinations & Strata
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              AudioService.playUiClick();
              onClose();
            }}
            aria-label="Close destinations modal"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Left list & Right detail */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Destination List (5 cols) */}
          <div className="md:col-span-5 border-r border-slate-800 overflow-y-auto p-4 space-y-2.5">
            {regionList.map((reg) => {
              const regDim = DIMENSIONS[reg.dimensionId] || DIMENSIONS.the_living_reach;
              const regUnlocked = unlockedRegionIds.includes(reg.id) || reg.id === 'verdant_reach';
              const isSelected = reg.id === selectedId;
              const isCurrent = reg.id === currentRegionId;

              return (
                <button
                  key={reg.id}
                  onClick={() => {
                    AudioService.playUiClick();
                    setSelectedId(reg.id);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500/50 shadow-lg'
                      : 'bg-slate-900/40 hover:bg-slate-800/50 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${regDim.themeColor}15`,
                        borderColor: `${regDim.themeColor}35`,
                      }}
                    >
                      {getDimensionIcon(reg.dimensionId)}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-100 truncate">
                          {reg.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-mono text-emerald-400">
                            (Current)
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {regDim.name} · Gravity {Math.round((reg.gravityModifier ?? regDim.gravityModifier) * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {regUnlocked ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Destination Details (7 cols) */}
          <div className="md:col-span-7 p-6 overflow-y-auto flex flex-col justify-between bg-slate-950/40">
            <div className="space-y-6">
              {/* Stratum Tag & Title */}
              <div>
                <div className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: dimension.themeColor }}
                  />
                  <span style={{ color: dimension.themeColor }}>
                    {dimension.name} · {dimension.badge}
                  </span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-slate-100">
                  {selectedRegion.name}
                </h3>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-300 font-light leading-relaxed">
                {selectedRegion.description}
              </p>

              {/* Environmental Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    Local Gravity
                  </div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    {Math.round((selectedRegion.gravityModifier ?? dimension.gravityModifier) * 100)}% Standard
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    Stratum Subtitle
                  </div>
                  <div className="text-xs font-bold text-amber-400 mt-0.5 truncate">
                    {selectedRegion.subtitle || 'Floating Archipelago'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    Dimensional Strata
                  </div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    {dimension.regions.length} Linked Isles
                  </div>
                </div>
              </div>

              {/* Unlock Requirement Feedback */}
              {!isUnlocked && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                    <Lock className="w-4 h-4" />
                    <span>Dimensional Gateway Sealed</span>
                  </div>
                  <p className="text-xs text-amber-200/80 font-light leading-relaxed">
                    {selectedRegion.unlockRequirement?.description ||
                      'Discover the ancient stone portal in The Verdant Reach and attune the dimensional core to breach the veil.'}
                  </p>
                </div>
              )}
            </div>

            {/* Travel CTA */}
            <div className="pt-6 border-t border-slate-800 mt-6 flex items-center justify-between gap-4">
              <div className="text-xs text-slate-400 font-mono">
                {isUnlocked
                  ? 'Safe dimensional conduit established.'
                  : 'Gateway locked by ancient wards.'}
              </div>

              <button
                disabled={!isUnlocked}
                onClick={() => handleTravel(selectedRegion)}
                className={`px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center gap-2 ${
                  isUnlocked
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-950/60 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                }`}
              >
                <span>{selectedRegion.id === currentRegionId ? 'Current Region' : 'Leap Destination'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
