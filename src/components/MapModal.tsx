/**
 * Regional Chart & Navigation Map for The Drifting Land.
 * Implements Prompt 8:
 * - Real-time player position & facing yaw arrow.
 * - Discovered landmarks, settlements, known traders, and portals.
 * - Fog of War: Does NOT reveal undiscovered secrets automatically.
 * - Active tracked quest destination marker with pulsing beacon pin and distance.
 * - Fast travel between activated checkpoints when at a sanctuary.
 */
import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Compass,
  Sparkles,
  Navigation,
  Flag,
  Radio,
  Eye,
  Star,
  Zap,
} from 'lucide-react';
import { ShardRelic, Checkpoint, QuestDefinition, QuestProgress } from '../types/game';
import { DISCOVERIES_CATALOG } from '../data/discoveries';

interface MapModalProps {
  playerPos: [number, number, number];
  playerYaw: number;
  relics: ShardRelic[];
  checkpoints: Checkpoint[];
  discoveries?: string[];
  trackedQuest?: { def: QuestDefinition; progress: QuestProgress } | null;
  onFastTravel?: (targetCheckpointId: string) => void;
  onClose: () => void;
}

export const MapModal: React.FC<MapModalProps> = ({
  playerPos,
  playerYaw,
  relics,
  checkpoints,
  discoveries = [],
  trackedQuest,
  onFastTravel,
  onClose,
}) => {
  const [selectedPin, setSelectedPin] = useState<{
    id: string;
    name: string;
    type: string;
    coords: [number, number];
    description: string;
    canFastTravel?: boolean;
    checkpointId?: string;
  } | null>(null);

  // Close with ESC or M
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

  // Player heading in degrees (0 = North/ -Z, 90 = East / +X, etc.)
  const deg = Math.round(((-playerYaw * 180) / Math.PI + 360) % 360);
  const compassDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const headingLabel = compassDirections[Math.floor(((deg + 22.5) % 360) / 45)];

  // Active quest marker coordinates if available
  const questCoords = trackedQuest?.def.targetLocation
    ? {
        x: mapScale(trackedQuest.def.targetLocation[0]),
        y: mapScale(trackedQuest.def.targetLocation[2]),
        worldX: trackedQuest.def.targetLocation[0],
        worldZ: trackedQuest.def.targetLocation[2],
        title: trackedQuest.def.title,
        locName: trackedQuest.def.targetLocationName || 'Quest Destination',
      }
    : null;

  const distToQuest = questCoords
    ? Math.round(
        Math.hypot(
          questCoords.worldX - playerPos[0],
          questCoords.worldZ - playerPos[2]
        )
      )
    : null;

  // Check if player is currently near an activated checkpoint (enables Fast Travel)
  const nearestCheckpoint = checkpoints.find(
    (cp) =>
      cp.activated &&
      Math.hypot(cp.position[0] - playerPos[0], cp.position[2] - playerPos[2]) < 12
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#0c121d] border border-slate-700/80 rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-600/50 text-cyan-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-mono tracking-wide text-white">
                Archipelago Regional Chart
              </h2>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                <span>
                  Position: [{Math.round(playerPos[0])}, {Math.round(playerPos[2])}]
                </span>
                <span>•</span>
                <span>Heading: {headingLabel} ({deg}°)</span>
                {distToQuest !== null && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 font-bold">
                      Quest Target: {distToQuest}m
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Map"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chart Canvas Area */}
        <div className="relative w-full aspect-[4/3] max-h-[55vh] bg-[#080d16] border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
          <svg viewBox="0 0 400 400" className="w-full h-full select-none">
            {/* Background Sky Expanse Grid */}
            <defs>
              <pattern id="skyGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#152136" strokeWidth="0.8" />
              </pattern>
              <radialGradient id="islandGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0f1c2d" stopOpacity="0.9" />
                <stop offset="70%" stopColor="#0b1420" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#080d16" stopOpacity="0.0" />
              </radialGradient>
              <radialGradient id="portalGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </radialGradient>
            </defs>

            <rect width="400" height="400" fill="url(#skyGrid)" />

            {/* Archipelago Floating Island Silhouettes */}
            {/* Main Central Island */}
            <path
              d="M 120 180 Q 150 110 230 130 T 290 190 T 260 270 T 170 280 T 110 220 Z"
              fill="url(#islandGradient)"
              stroke="#1e324d"
              strokeWidth="1.5"
            />
            {/* North-East Promontory Spire */}
            <path
              d="M 270 110 Q 320 80 340 120 T 310 160 T 260 130 Z"
              fill="url(#islandGradient)"
              stroke="#1e324d"
              strokeWidth="1.2"
            />
            {/* Far West Rift Island */}
            <path
              d="M 50 180 Q 70 130 110 150 T 115 240 T 60 230 Z"
              fill="url(#islandGradient)"
              stroke="#1e324d"
              strokeWidth="1.2"
            />

            {/* Fog of War - Clouds over unexplored western rift if undiscovered */}
            {!discoveries.includes('disc_dimensional_gateway') && !discoveries.includes('gateway_rift_valley') && (
              <g opacity="0.65">
                <circle cx={mapScale(-50)} cy={mapScale(-20)} r="26" fill="#1e293b" />
                <circle cx={mapScale(-40)} cy={mapScale(-15)} r="20" fill="#1e293b" />
                <text
                  x={mapScale(-45)}
                  y={mapScale(-18)}
                  textAnchor="middle"
                  className="fill-slate-500 text-[9px] font-mono font-bold"
                >
                  Unexplored Mist
                </text>
              </g>
            )}

            {/* 1. Ancient Beacon Plaza (Center - Always Known) */}
            <g
              transform="translate(200, 200)"
              className="cursor-pointer"
              onClick={() =>
                setSelectedPin({
                  id: 'beacon_plaza',
                  name: 'Monolith Beacon Plaza',
                  type: 'Ancient Beacon',
                  coords: [0, 0],
                  description:
                    'The central monolithic dais harmonizing the floating islands with the sky leylines.',
                })
              }
            >
              <circle cx="0" cy="0" r="14" fill="#065f46" fillOpacity="0.4" stroke="#34d399" strokeWidth="1.5" />
              <polygon points="0,-7 7,5 -7,5" fill="#34d399" />
              <text x="0" y="20" textAnchor="middle" className="fill-emerald-300 text-[8px] font-mono font-bold tracking-wider">
                MONOLITH BEACON
              </text>
            </g>

            {/* 2. Ruined Watchtower (East/North-East) */}
            {(discoveries.includes('disc_ruined_tower') || Math.hypot(playerPos[0] - 38, playerPos[2] - 25) < 30) && (
              <g
                transform={`translate(${mapScale(38)}, ${mapScale(25)})`}
                className="cursor-pointer"
                onClick={() =>
                  setSelectedPin({
                    id: 'ruin_tower',
                    name: 'Ruined Watchtower',
                    type: 'Ancient Ruins',
                    coords: [35, -45],
                    description:
                      'Crumbling stonework garrison overlooking the cloud bank. Undercroft entrance located nearby.',
                  })
                }
              >
                <polygon points="0,-8 7,6 -7,6" fill="#78350f" stroke="#fbbf24" strokeWidth="1.5" />
                <text x="0" y="16" textAnchor="middle" className="fill-amber-300 text-[8px] font-mono font-bold">
                  WATCHTOWER
                </text>
              </g>
            )}

            {/* 3. Verdant Haven Settlement (South-West) */}
            {(discoveries.includes('disc_abandoned_settlement') || Math.hypot(playerPos[0] - (-22), playerPos[2] - (-35)) < 30) && (
              <g
                transform={`translate(${mapScale(-22)}, ${mapScale(-35)})`}
                className="cursor-pointer"
                onClick={() =>
                  setSelectedPin({
                    id: 'camp_research',
                    name: 'Verdant Haven Settlement',
                    type: 'Pioneer Settlement & Outpost',
                    coords: [-22, -35],
                    description:
                      'A thriving haven of island pioneers, home to Elder Soren, Trader Orin, and the warm community hearth.',
                  })
                }
              >
                <polygon points="0,-7 7,6 -7,6" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5" />
                <text x="0" y="15" textAnchor="middle" className="fill-blue-300 text-[8px] font-mono font-bold">
                  VERDANT HAVEN
                </text>
              </g>
            )}

            {/* 4. Sunward Promontory Beacon (East Spire) */}
            {(discoveries.includes('disc_beacon_promontory') || Math.hypot(playerPos[0] - 45, playerPos[2] - 25) < 30) && (
              <g
                transform={`translate(${mapScale(45)}, ${mapScale(25)})`}
                className="cursor-pointer"
                onClick={() =>
                  setSelectedPin({
                    id: 'beacon_promontory',
                    name: 'Sunward Promontory Beacon',
                    type: 'Waypoint Beacon',
                    coords: [45, 25],
                    description:
                      'An elevated sky lookout and beacon guiding travelers navigating eastward.',
                  })
                }
              >
                <circle cx="0" cy="0" r="6" fill="#047857" stroke="#34d399" strokeWidth="1.2" />
                <text x="0" y="14" textAnchor="middle" className="fill-emerald-300 text-[8px] font-mono font-bold">
                  PROMONTORY
                </text>
              </g>
            )}

            {/* 5. Hidden Undercroft Chamber (Only if discovered) */}
            {discoveries.includes('disc_chamber_undercroft') && (
              <g
                transform={`translate(${mapScale(-48)}, ${mapScale(-8)})`}
                className="cursor-pointer"
                onClick={() =>
                  setSelectedPin({
                    id: 'chamber_undercroft',
                    name: 'Hidden Undercroft Vault',
                    type: 'Secret Chamber',
                    coords: [-48, -8],
                    description:
                      'Subterranean vault housing forgotten archival records of the Great Drift.',
                  })
                }
              >
                <rect x="-5" y="-5" width="10" height="10" fill="#065f46" stroke="#34d399" strokeWidth="1" rx="2" />
                <text x="0" y="14" textAnchor="middle" className="fill-emerald-300 text-[8px] font-mono font-bold">
                  UNDERCROFT
                </text>
              </g>
            )}

            {/* 6. Dimensional Gateway (Rift Valley) */}
            {(discoveries.includes('gateway_rift_valley') || discoveries.includes('disc_rift_gateway') || discoveries.includes('disc_dimensional_gateway')) && (
              <g
                transform={`translate(${mapScale(-50)}, ${mapScale(-20)})`}
                className="cursor-pointer"
                onClick={() =>
                  setSelectedPin({
                    id: 'gateway_rift',
                    name: 'Dimensional Gateway',
                    type: 'Aether Portal',
                    coords: [-50, -20],
                    description:
                      'Ancient gateway pulsing with void resonance. Requires Aether Essence to traverse realms.',
                  })
                }
              >
                <circle cx="0" cy="0" r="10" fill="none" stroke="#a855f7" strokeWidth="2" strokeDasharray="3 2" />
                <circle cx="0" cy="0" r="4" fill="#a855f7" />
                <text x="0" y="18" textAnchor="middle" className="fill-purple-300 text-[8px] font-mono font-bold">
                  PORTAL
                </text>
              </g>
            )}

            {/* Checkpoints / Waystones */}
            {checkpoints.map((cp) => {
              const cx = mapScale(cp.position[0]);
              const cy = mapScale(cp.position[2]);
              const isActivated = cp.activated;

              return (
                <g
                  key={cp.id}
                  transform={`translate(${cx}, ${cy})`}
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedPin({
                      id: cp.id,
                      name: cp.name,
                      type: 'Respawn Waystone',
                      coords: [Math.round(cp.position[0]), Math.round(cp.position[2])],
                      description: isActivated
                        ? 'Attuned Waystone. You will respawn here upon defeat.'
                        : 'Unactivated Waystone. Approach and interact to harmonize.',
                      canFastTravel: isActivated && nearestCheckpoint && nearestCheckpoint.id !== cp.id,
                      checkpointId: cp.id,
                    })
                  }
                >
                  <circle
                    cx="0"
                    cy="0"
                    r="6"
                    fill={isActivated ? '#10b981' : '#334155'}
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                  {isActivated && (
                    <circle cx="0" cy="0" r="10" fill="none" stroke="#10b981" strokeWidth="0.8" opacity="0.6" />
                  )}
                </g>
              );
            })}

            {/* Drift Shards (if still uncollected) */}
            {relics.map((shard) => {
              if (shard.collected) return null;
              const sx = mapScale(shard.position[0]);
              const sy = mapScale(shard.position[2]);
              return (
                <g key={shard.id} transform={`translate(${sx}, ${sy})`}>
                  <circle cx="0" cy="0" r="4" fill="#f59e0b" stroke="#fef08a" strokeWidth="1" />
                </g>
              );
            })}

            {/* Active Quest Target Marker */}
            {questCoords && (
              <g transform={`translate(${questCoords.x}, ${questCoords.y})`}>
                <circle cx="0" cy="0" r="14" fill="#fbbf24" fillOpacity="0.25" className="animate-ping" />
                <polygon points="0,-10 7,0 0,10 -7,0" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                <text
                  x="0"
                  y="-14"
                  textAnchor="middle"
                  className="fill-amber-300 text-[9px] font-mono font-bold tracking-wide shadow"
                >
                  [!] QUEST TARGET
                </text>
              </g>
            )}

            {/* Player Location Marker with Heading Cone */}
            <g transform={`translate(${playerChartX}, ${playerChartY}) rotate(${deg})`}>
              <circle cx="0" cy="0" r="9" fill="#0284c7" fillOpacity="0.35" />
              <polygon points="0,-12 7,7 -7,7" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          </svg>
        </div>

        {/* Selected Landmark Details Pane */}
        {selectedPin ? (
          <div className="mt-3 p-3.5 rounded-xl bg-[#101726] border border-cyan-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-white text-sm">{selectedPin.name}</span>
                <span className="text-[10px] text-cyan-400 uppercase">[{selectedPin.type}]</span>
              </div>
              <p className="text-slate-400 text-[11px] max-w-xl">{selectedPin.description}</p>
              <span className="text-slate-500 text-[10px] mt-0.5 block">
                Coords: [{selectedPin.coords[0]}, {selectedPin.coords[1]}]
              </span>
            </div>

            {selectedPin.canFastTravel && onFastTravel && selectedPin.checkpointId && (
              <button
                onClick={() => {
                  onFastTravel(selectedPin.checkpointId!);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-lg"
              >
                <Zap className="w-3.5 h-3.5" />
                Fast Travel
              </button>
            )}
          </div>
        ) : (
          <div className="mt-3 p-2.5 rounded-xl bg-[#101726]/60 border border-slate-800 text-center text-xs font-mono text-slate-500">
            Click any discovered landmark, beacon, or waystone to view details.
          </div>
        )}

        {/* Map Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-[11px] font-mono text-slate-400 border-t border-slate-800 mt-3">
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
            <span>Ruins</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
            <span>Portal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
            <span>Camp</span>
          </div>
          {trackedQuest && (
            <div className="flex items-center gap-1.5 text-amber-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block rotate-45" />
              <span>Quest Target</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
