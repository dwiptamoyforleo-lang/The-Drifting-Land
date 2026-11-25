/**
 * Portal Inspection & Unlock Modal for The Drifting Land.
 * Implements Prompt 11 requirements:
 * - Clear indication of unlock requirements (items, quests, rank milestones, beacon awakenings)
 * - Traversal execution when unlocked
 * - Accessible and responsive with ESC / close buttons
 */

import React, { useEffect } from 'react';
import {
  X,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Orbit,
  Sparkles,
  Layers,
} from 'lucide-react';
import { PortalDefinition, PortalUnlockCheck } from '../data/portals';
import { REGIONS, DIMENSIONS } from '../data/regions';

interface PortalModalProps {
  portal: PortalDefinition;
  check: PortalUnlockCheck;
  onTraverse: () => void;
  onClose: () => void;
}

export const PortalModal: React.FC<PortalModalProps> = ({
  portal,
  check,
  onTraverse,
  onClose,
}) => {
  const destRegion = REGIONS[portal.destinationRegionId] || REGIONS.verdant_reach;
  const destDim = DIMENSIONS[portal.destinationDimensionId] || DIMENSIONS.the_living_reach;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.code === 'KeyE' && check.isUnlocked) {
        e.preventDefault();
        onTraverse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onTraverse, check.isUnlocked]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 select-none">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${check.isUnlocked ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
              {check.isUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>{portal.name}</span>
                {portal.isReturnPortal && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                    RETURN CONDUIT
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Target: <span className="text-slate-200">{check.destinationRegionName}</span> ({check.dimensionName})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Destination Preview Card */}
          <div
            className="p-4 rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 relative overflow-hidden"
            style={{
              borderColor: check.isUnlocked ? `${destDim.themeColor}44` : '#334155',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1.5">
                <Orbit className="w-3.5 h-3.5 text-sky-400" />
                {destDim.badge || destDim.name}
              </span>
              <span className="text-xs font-mono text-emerald-400">
                {destRegion.gravityModifier ?? destDim.gravityModifier}x Gravity
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-100 mb-1">{destRegion.name}</h3>
            <p className="text-xs text-slate-400 mb-3">{destRegion.description}</p>

            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs italic text-slate-300">
              "{portal.loreQuote}"
            </div>
          </div>

          {/* Unlock Requirements Checklist */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Attunement Prerequisites</span>
              <span className="text-slate-500 font-normal">
                {check.isUnlocked ? 'All requirements satisfied' : 'Prerequisites required to activate gateway'}
              </span>
            </h4>

            {check.requirements.length === 0 ? (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>This gateway is stabilized and ready for immediate traversal.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {check.requirements.map((req, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition ${
                      req.isMet
                        ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                        : 'bg-slate-950 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    {req.isMet ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${req.isMet ? 'text-emerald-300' : 'text-slate-300'}`}>
                          {req.label}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            req.isMet
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {req.isMet ? 'SATISFIED' : 'INCOMPLETE'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{req.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            Cancel
          </button>

          {check.isUnlocked ? (
            <button
              onClick={onTraverse}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-95 rounded-xl shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <span>Step Through Gateway</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              disabled
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-slate-500 bg-slate-800/60 rounded-xl cursor-not-allowed opacity-75 border border-slate-800"
            >
              <Lock className="w-4 h-4" />
              <span>Gateway Locked</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
