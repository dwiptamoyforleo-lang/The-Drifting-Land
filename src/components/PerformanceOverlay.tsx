/**
 * Live Performance & Engine Diagnostics Overlay.
 * Displays real-time WebGL metrics:
 * - FPS and measured frame rendering time (ms)
 * - WebGL Draw calls and rendered triangles
 * - Active geometries and textures in GPU memory
 * - Active graphics preset and device pixel ratio
 */

import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Cpu, Layers } from 'lucide-react';
import { GameSettings } from '../types/game';

interface PerformanceOverlayProps {
  diagnostics: {
    fps: number;
    frameTimeMs: number;
    drawCalls: number;
    triangles: number;
    geometries: number;
    textures: number;
  };
  settings: GameSettings;
  isSoftwareGl?: boolean;
}

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({
  diagnostics,
  settings,
  isSoftwareGl,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Performance status color
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

  return (
    <aside
      aria-label="Engine Performance Diagnostics"
      className="fixed top-14 left-3 z-40 font-mono text-[11px] select-none pointer-events-auto bg-slate-950/85 backdrop-blur border border-slate-700/60 rounded-xl shadow-xl p-2.5 max-w-xs text-slate-200"
    >
      {/* Top summary row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-300">GPU DIAG</span>
          <span className={`font-bold tabular-nums ${fpsColor}`}>
            {diagnostics.fps} <span className="text-[9px] font-normal text-slate-400">FPS</span>
          </span>
          <span className={`tabular-nums ${frameTimeColor}`}>
            {diagnostics.frameTimeMs} <span className="text-[9px] font-normal text-slate-400">ms</span>
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand full stats'}
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded technical details */}
      {isExpanded && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5 text-[10px]">
          <div className="flex justify-between items-center text-slate-400">
            <span>Preset / Render:</span>
            <span className="text-cyan-300 font-semibold uppercase">
              {settings.graphicsQuality} · {settings.renderDistance}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Draw Calls:</span>
            <span className="text-slate-200 tabular-nums">{diagnostics.drawCalls}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Triangles:</span>
            <span className="text-slate-200 tabular-nums">
              {diagnostics.triangles.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>GPU Geometries:</span>
            <span className="text-slate-200 tabular-nums">{diagnostics.geometries}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Textures:</span>
            <span className="text-slate-200 tabular-nums">{diagnostics.textures}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Particle Cap:</span>
            <span className="text-slate-200 tabular-nums">{settings.particleLimit}</span>
          </div>

          {isSoftwareGl && (
            <div className="mt-1 px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-600/40 text-amber-300 text-[9px]">
              Software WebGL rasterizer active
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
