/**
 * Regional Chart & Navigation Map for The Drifting Land.
 * Displays stylized top-down archipelago overview with landmarks,
 * player coordinates, waystones, and drift shards.
 */

import React, { useEffect } from 'react';
import { X, MapPin, Compass, Sparkles, Navigation, Flag } from 'lucide-react';
import { ShardRelic, Checkpoint } from '../types/game';

interface MapModalProps {
  playerPos: [number, number, number];
  playerYaw: number;
  relics: ShardRelic[];
  checkpoints: Checkpoint[];
  onClose: () => void;
}

export const MapModal: React.FC<MapModalProps> = ({
  playerPos,
  playerYaw,
  relics,
  checkpoints,
  onClose,
}) => {
  // Handle ESC or M key to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyM') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // World coordinates (-70 to 70) mapped to SVG chart (40 to 360)
  const mapScale = (val: number) => 200 + (val / 75) * 150;

  const playerChartX = mapScale(playerPos[0]);
  const playerChartY = mapScale(playerPos[2]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-lg rounded-3xl bg-[#0c121d] border border-slate-800 p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-serif font-black tracking-widest text-slate-100 uppercase">
                THE VERDANT REACH CHART
              </h2>
              <span className="text-[10px] font-mono text-slate-400">
                POS: [{Math.round(playerPos[0])}, {Math.round(playerPos[1])}, {Math.round(playerPos[2])}]
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close map"
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Map Canvas / SVG Chart */}
        <div className="relative aspect-square w-full rounded-2xl bg-[#060913] border border-slate-800/80 overflow-hidden p-2 flex items-center justify-center">
          <svg viewBox="0 0 400 400" className="w-full h-full select-none">
            {/* Grid Lines */}
            <circle cx="200" cy="200" r="170" fill="none" stroke="#1e293b" strokeDasharray="4 4" strokeWidth="1" />
            <circle cx="200" cy="200" r="110" fill="none" stroke="#1e293b" strokeDasharray="4 4" strokeWidth="1" />
            <line x1="200" y1="20" x2="200" y2="380" stroke="#1e293b" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="20" y1="200" x2="380" y2="200" stroke="#1e293b" strokeWidth="1" strokeOpacity="0.4" />

            {/* Archipelago Island Silhouette */}
            <path
              d="M 200,45 C 290,55 355,130 355,200 C 355,280 280,350 200,355 C 115,350 45,280 45,200 C 45,120 115,45 200,45 Z"
              fill="#132e22"
              stroke="#059669"
              strokeWidth="2"
              fillOpacity="0.85"
            />

            {/* Whispering River Curve */}
            <path
              d="M 230,90 Q 250,160 280,240"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="5"
              strokeLinecap="round"
              strokeOpacity="0.75"
            />

            {/* Landmarks Icons & Labels */}
            {/* 1. Ancient Beacon (Center) */}
            <g transform="translate(200, 200)">
              <circle cx="0" cy="0" r="12" fill="#047857" fillOpacity="0.4" stroke="#34d399" strokeWidth="1.5" />
              <polygon points="0,-6 6,4 -6,4" fill="#34d399" />
              <text x="0" y="20" textAnchor="middle" className="fill-emerald-300 text-[9px] font-mono font-bold tracking-wider">
                BEACON DAIS
              </text>
            </g>

            {/* 2. Sunken Ruin Sanctum (South-West) */}
            <g transform={`translate(${mapScale(-34)}, ${mapScale(18)})`}>
              <rect x="-8" y="-8" width="16" height="16" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" rx="3" />
              <text x="0" y="18" textAnchor="middle" className="fill-slate-300 text-[8px] font-mono font-bold">
                RUIN SANCTUM
              </text>
            </g>

            {/* 3. Sunward Promontory Watchtower (East) */}
            <g transform={`translate(${mapScale(38)}, ${mapScale(25)})`}>
              <polygon points="0,-9 8,6 -8,6" fill="#78350f" stroke="#fbbf24" strokeWidth="1.5" />
              <text x="0" y="18" textAnchor="middle" className="fill-amber-300 text-[8px] font-mono font-bold">
                WATCHTOWER
              </text>
            </g>

            {/* 4. Whispering Waterfall & Suspension Bridge (North-East) */}
            <g transform={`translate(${mapScale(24)}, ${mapScale(-10)})`}>
              <line x1="-8" y1="-3" x2="8" y2="3" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
              <text x="0" y="14" textAnchor="middle" className="fill-amber-300 text-[8px] font-mono font-bold">
                SUSPENSION BRIDGE
              </text>
            </g>

            {/* 5. Hollow Drift Homestead (North-West) */}
            <g transform={`translate(${mapScale(-22)}, ${mapScale(-35)})`}>
              <rect x="-6" y="-6" width="12" height="12" fill="#334155" stroke="#94a3b8" strokeWidth="1" rx="2" />
              <text x="0" y="14" textAnchor="middle" className="fill-slate-300 text-[8px] font-mono font-bold">
                HOMESTEAD
              </text>
            </g>

            {/* 6. Surveyor Research Camp (South-East) */}
            <g transform={`translate(${mapScale(12)}, ${mapScale(28)})`}>
              <polygon points="0,-6 6,5 -6,5" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1" />
              <text x="0" y="14" textAnchor="middle" className="fill-blue-300 text-[8px] font-mono font-bold">
                RESEARCH CAMP
              </text>
            </g>

            {/* 7. Hidden Chamber (Far West) */}
            <g transform={`translate(${mapScale(-48)}, ${mapScale(-8)})`}>
              <circle cx="0" cy="0" r="5" fill="#065f46" stroke="#34d399" strokeWidth="1" />
              <text x="0" y="14" textAnchor="middle" className="fill-emerald-300 text-[8px] font-mono font-bold">
                HIDDEN VAULT
              </text>
            </g>

            {/* 8. Dimensional Gateway (West Ridge) */}
            <g transform={`translate(${mapScale(-50)}, ${mapScale(-20)})`}>
              <circle cx="0" cy="0" r="7" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeDasharray="2 2" />
              <circle cx="0" cy="0" r="3" fill="#6366f1" />
              <text x="0" y="15" textAnchor="middle" className="fill-indigo-300 text-[8px] font-mono font-bold">
                GATEWAY
              </text>
            </g>

            {/* Checkpoints */}
            {checkpoints.map((cp) => {
              const cx = mapScale(cp.position[0]);
              const cy = mapScale(cp.position[2]);
              return (
                <g key={cp.id} transform={`translate(${cx}, ${cy})`}>
                  <circle cx="0" cy="0" r="5" fill={cp.activated ? '#10b981' : '#64748b'} stroke="#ffffff" strokeWidth="1" />
                </g>
              );
            })}

            {/* Collectible Drift Shards */}
            {relics.map((shard) => {
              if (shard.collected) return null;
              const sx = mapScale(shard.position[0]);
              const sy = mapScale(shard.position[2]);
              return (
                <g key={shard.id} transform={`translate(${sx}, ${sy})`}>
                  <circle cx="0" cy="0" r="5" fill="#f59e0b" stroke="#fef08a" strokeWidth="1" />
                </g>
              );
            })}

            {/* Player Location Marker with Heading Arrow */}
            <g transform={`translate(${playerChartX}, ${playerChartY}) rotate(${(-playerYaw * 180) / Math.PI})`}>
              <circle cx="0" cy="0" r="8" fill="#38bdf8" fillOpacity="0.4" />
              <polygon points="0,-10 6,6 -6,6" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-[11px] font-mono text-slate-400 border-t border-slate-900 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            <span>You</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span>Beacon</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>Drift Shards</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
            <span>Waystones</span>
          </div>
        </div>
      </div>
    </div>
  );
};
