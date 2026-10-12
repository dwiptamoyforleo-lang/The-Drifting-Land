/**
 * Map & Telemetry Navigation Modal (M key / Map button)
 */
import React from 'react';
import { X, MapPin, Globe2 } from 'lucide-react';

interface MapModalProps {
  currentSectorId: number;
  onClose: () => void;
}

export const MapModal: React.FC<MapModalProps> = ({ currentSectorId, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none font-['Share_Tech_Mono',monospace]">
      <div className="max-w-xl w-full bg-gradient-to-b from-slate-900 via-[#0b1320] to-slate-950 border border-cyan-500/50 rounded-3xl p-6 shadow-2xl text-slate-200 relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 transition-colors cursor-pointer"
          aria-label="Close map radar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
            <Globe2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.25em] text-cyan-400 uppercase">CELESTIAL RADAR</div>
            <h2 className="font-['Cinzel'] text-xl font-bold tracking-wider text-white">
              Kepler-94d Sector Map
            </h2>
          </div>
        </div>

        <div className="relative h-64 rounded-2xl bg-slate-950 border border-cyan-500/30 overflow-hidden flex items-center justify-center p-4 mb-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)]" />
          <div className="absolute top-12 left-16 p-3 rounded-xl bg-cyan-950/80 border border-cyan-400/50 text-center shadow-lg">
            <MapPin className="w-4 h-4 text-cyan-300 mx-auto mb-1 animate-bounce" />
            <span className="text-[10px] text-cyan-200 font-bold block">Sector 01: Observation</span>
          </div>
          <div className="absolute top-24 right-20 p-3 rounded-xl bg-slate-900/80 border border-slate-700 text-center">
            <MapPin className="w-4 h-4 text-amber-300 mx-auto mb-1" />
            <span className="text-[10px] text-slate-300 block">Sector 02: Sky-Bridges</span>
          </div>
          <div className="absolute bottom-10 left-1/3 p-3 rounded-xl bg-slate-900/80 border border-slate-700 text-center">
            <MapPin className="w-4 h-4 text-purple-300 mx-auto mb-1" />
            <span className="text-[10px] text-slate-300 block">Sector 04: Geodesic Dome</span>
          </div>
          <div className="text-xs text-slate-400 font-mono text-center z-10">
            [ CURRENT POSITION: SECTOR 0{currentSectorId} - STRATOSPHERE ALTITUDE 1,420M ]
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
        >
          Close Map Radar
        </button>
      </div>
    </div>
  );
};
