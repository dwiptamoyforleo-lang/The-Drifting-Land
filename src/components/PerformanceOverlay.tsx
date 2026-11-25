/**
 * Live Performance & Engine Diagnostics Overlay.
 * Displays real-time WebGL metrics:
 * - FPS and measured frame rendering time (ms)
 * - WebGL Draw calls and rendered triangles
 * - Active geometries and textures in GPU memory
 * - Active graphics preset and device pixel ratio
 */

import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { EngineDiagnostics, GameSettings } from '../types/game';

interface PerformanceOverlayProps {
  diagnostics: EngineDiagnostics;
  settings: GameSettings;
  isSoftwareGl?: boolean;
}

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = React.memo(({
  diagnostics,
  settings,
  isSoftwareGl,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const fpsColor =
    diagnostics.fps >= 50
      ? 'text-emerald-400'
      : diagnostics.fps >= 30
      ? 'text-amber-400'
      : 'text-rose-400';

  const frameTimeColor =
    diagnostics.frameTimeMs <= 17
      ? 'text-emerald-400'
      : diagnostics.frameTimeMs <= 33
      ? 'text-amber-400'
      : 'text-rose-400';

  const tierLabel = diagnostics.activeQualityTier || settings.graphicsQuality;

  return (
    <aside
      aria-label="Engine Performance Diagnostics"
      className="fixed top-14 left-3 z-40 font-mono text-[11px] select-none pointer-events-auto bg-slate-950/95 border border-slate-700/70 rounded-xl shadow-xl p-2.5 max-w-xs text-slate-200"
    >
      {/* Top summary row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-300">DIAG [F3]</span>
          <span className={`font-bold tabular-nums ${fpsColor}`}>
            {diagnostics.fps} <span className="text-[9px] font-normal text-slate-400">FPS</span>
          </span>
          <span className={`tabular-nums ${frameTimeColor}`}>
            {diagnostics.frameTimeMs} <span className="text-[9px] font-normal text-slate-400">ms</span>
          </span>
        </div>
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title={isExpanded ? 'Collapse' : 'Expand full stats'}
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded technical details */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1 text-[10px]">
          <div className="flex justify-between items-center text-slate-400 gap-4">
            <span>Quality / Render:</span>
            <span className="text-cyan-300 font-semibold uppercase">
              {tierLabel}
              {diagnostics.isAutoQuality ? ' (AUTO)' : ''} · {settings.renderDistance}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-400 gap-4">
            <span>Chunks (A/N/U):</span>
            <span className="text-emerald-300 tabular-nums font-semibold">
              {diagnostics.activeChunks ?? 0} / {diagnostics.nearChunks ?? 0} / {diagnostics.unloadedChunks ?? 0}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-400 gap-4">
            <span>Visible Entities:</span>
            <span className="text-slate-200 tabular-nums">{diagnostics.entityCount ?? 0}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400 gap-4">
            <span>Draw Calls:</span>
            <span className="text-slate-200 tabular-nums">{diagnostics.drawCalls}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400 gap-4">
            <span>Triangles:</span>
            <span className="text-slate-200 tabular-nums">
              {diagnostics.triangles.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-400 gap-4">
            <span>GPU Geo / Tex:</span>
            <span className="text-slate-200 tabular-nums">
              {diagnostics.geometries} / {diagnostics.textures}
            </span>
          </div>

          {isSoftwareGl && (
            <div className="mt-1 px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-600/40 text-amber-300 text-[9px]">
              Software WebGL rasterizer active
            </div>
          )}
        </div>
      )}
    </aside>
  );
});
