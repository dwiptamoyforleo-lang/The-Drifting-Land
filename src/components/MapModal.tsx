import React, { useState } from 'react';
import { X, MapPin, Navigation, Compass, Flag } from 'lucide-react';
import { MapLocation } from '../game/mapSystem';

interface MapModalProps {
  locations: MapLocation[];
  playerPosition: { x: number; z: number };
  onClose: () => void;
  onSelectLocation: (location: MapLocation) => void;
}

export const MapModal: React.FC<MapModalProps> = ({ 
  locations, 
  playerPosition, 
  onClose, 
  onSelectLocation 
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none font-['Share_Tech_Mono',monospace]">
      <div className="max-w-3xl w-full h-[600px] bg-slate-900 border border-teal-500/40 rounded-3xl p-6 text-slate-200 relative flex flex-col shadow-2xl shadow-teal-950/50">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Compass className="w-6 h-6 text-teal-400 animate-spin-slow" />
            <h2 className="font-['Cinzel'] text-xl font-bold text-white tracking-wide">Regional Map & Discovery</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Viewport Canvas Area */}
        <div className="flex-1 relative bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
          <div 
            className="absolute inset-0 flex items-center justify-center transition-transform duration-150 ease-out"
            style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
          >
            {/* Grid Lines Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 pointer-events-none" />

            {/* Discovery Locations / Markers */}
            {locations.map((loc) => {
              const isDiscovered = loc.discovered;
              return (
                <div
                  key={loc.id}
                  onClick={() => isDiscovered && onSelectLocation(loc)}
                  className={`absolute flex flex-col items-center cursor-pointer group transition-transform ${
                    isDiscovered ? 'hover:scale-110' : 'opacity-40 cursor-not-allowed'
                  }`}
                  style={{
                    left: `calc(50% + ${loc.x}px)`,
                    top: `calc(50% + ${loc.z}px)`,
                  }}
                >
                  <div className={`p-2 rounded-xl border transition-all ${
                    isDiscovered 
                      ? 'bg-slate-900 border-teal-500/50 text-teal-400 shadow-lg shadow-teal-500/20 group-hover:border-teal-400' 
                      : 'bg-slate-900/50 border-slate-700 text-slate-600'
                  }`}>
                    {loc.type === 'portal' ? <Navigation className="w-4 h-4" /> :
                     loc.type === 'checkpoint' ? <Flag className="w-4 h-4" /> :
                     <MapPin className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] mt-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-800/80 text-slate-300 whitespace-nowrap shadow-md">
                    {isDiscovered ? loc.name : 'Uncharted Sector'}
                  </span>
                </div>
              );
            })}

            {/* Live Player Position Marker */}
            <div
              className="absolute flex flex-col items-center pointer-events-none z-20 transition-all duration-300"
              style={{
                left: `calc(50% + ${playerPosition.x}px)`,
                top: `calc(50% + ${playerPosition.z}px)`,
              }}
            >
              <div className="w-3 h-3 bg-cyan-400 rounded-full animate-ping absolute" />
              <div className="w-3 h-3 bg-cyan-300 rounded-full border-2 border-slate-950 shadow-md shadow-cyan-500/50" />
              <span className="text-[10px] mt-1 px-1.5 py-0.5 rounded bg-cyan-950/90 border border-cyan-500/40 text-cyan-200 whitespace-nowrap font-bold">
                You
              </span>
            </div>
          </div>

          {/* Zoom and Navigation HUD Controls */}
          <div className="absolute bottom-4 right-4 flex gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl backdrop-blur-sm shadow-lg">
            <button 
              onClick={() => setZoom(z => Math.min(2.5, z + 0.25))}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
              title="Zoom In"
            >
              +
            </button>
            <button 
              onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
              title="Zoom Out"
            >
              -
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
