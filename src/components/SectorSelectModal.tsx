/**
 * Sector & Level Selection Screen for The Drifting Land
 * Allows players to:
 * - Select level / sector to explore
 * - Edit and customize their username
 * - View XP progress bar and level rank
 * - Review mission parameters and deploy directly into the level
 */
import React, { useState } from 'react';
import {
  Compass,
  User,
  Zap,
  Award,
  Layers,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Edit2,
  Check,
  Play,
  Lock,
} from 'lucide-react';
import { UserProfile, SectorInfo, GameProgress } from '../game/types';

interface SectorSelectModalProps {
  userProfile: UserProfile;
  progress: GameProgress;
  onUpdateProfile: (updated: UserProfile) => void;
  onSelectSectorAndLaunch: (sectorId: number) => void;
  onBackToTitle: () => void;
}

export const SECTORS: SectorInfo[] = [
  {
    id: 1,
    name: 'Sector 01: Observation Deck',
    subtitle: 'Primary Telemetry Hub & Central Citadel',
    description: 'High-altitude catwalk overlooking the golden cloud sea and the colossal turquoise gas giant. Features the primary telemetry terminal and bridge approach.',
    altitudeMeters: 1420,
    difficulty: 'Standard',
    spawnPoint: [0, 4.2, 0],
  },
  {
    id: 2,
    name: 'Sector 02: Sky-Bridge Transit',
    subtitle: 'Elevated Corridor & Flying Speeders',
    description: 'Narrow transit gantry suspended above the amber cloud abyss. Watch aerial speeders navigate the flight corridors and calibrate Anchor Beta.',
    altitudeMeters: 1680,
    difficulty: 'Advanced',
    spawnPoint: [0, 4.2, -26],
  },
  {
    id: 3,
    name: 'Sector 03: Geodesic Stratosphere',
    subtitle: 'Research Dome & Quantum Core',
    description: 'High-altitude crystalline research dome crowning the eastern towers. Final vertex of the quantum anchor network.',
    altitudeMeters: 2100,
    difficulty: 'Extreme',
    spawnPoint: [22, 4.2, -34],
  },
];

export const SectorSelectModal: React.FC<SectorSelectModalProps> = ({
  userProfile,
  progress,
  onUpdateProfile,
  onSelectSectorAndLaunch,
  onBackToTitle,
}) => {
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>(userProfile.username);
  const [selectedSectorId, setSelectedSectorId] = useState<number>(userProfile.selectedSector || 1);

  const handleSaveUsername = () => {
    const trimmed = usernameInput.trim() || 'SkyFarer';
    setIsEditingName(false);
    onUpdateProfile({ ...userProfile, username: trimmed });
  };

  const selectedSector = SECTORS.find((s) => s.id === selectedSectorId) || SECTORS[0];

  // Calculate XP towards next level (e.g. 1000 XP per level)
  const nextLevelXp = userProfile.level * 800;
  const currentLevelBaseXp = (userProfile.level - 1) * 800;
  const xpInCurrentLevel = Math.max(0, userProfile.xp - currentLevelBaseXp);
  const xpNeeded = nextLevelXp - currentLevelBaseXp;
  const xpPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeeded) * 100));

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-[#09111e]/95 via-[#060a12]/98 to-[#040810] text-slate-100 select-none overflow-y-auto font-['Share_Tech_Mono',monospace]">
      {/* Background ambient accents */}
      <div className="absolute top-1/4 left-1/3 w-[450px] h-[350px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between pt-2 pb-4 border-b border-white/10 z-10">
        <button
          onClick={onBackToTitle}
          className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs uppercase tracking-wider transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Title Screen</span>
        </button>

        <div className="text-center">
          <div className="text-[10px] tracking-[0.25em] text-cyan-400 uppercase">
            EXPLORATION TELEMETRY DISPATCH
          </div>
          <h1 className="font-['Cinzel'] text-xl sm:text-2xl font-bold tracking-[0.2em] text-white">
            MISSION & LEVEL SELECT
          </h1>
        </div>

        <div className="text-right text-[10px] text-slate-400 font-mono hidden sm:block">
          STATUS: ONLINE<br />
          PLANET: KEPLER-94D
        </div>
      </div>

      {/* Main Container: 2-Column Grid */}
      <div className="w-full max-w-5xl my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 z-10">
        {/* Left Column: User Profile & XP Card (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-400/50 text-cyan-300">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest">CALLSIGN / USERNAME</div>
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <input
                        type="text"
                        value={usernameInput}
                        maxLength={18}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        className="bg-slate-900 border border-cyan-400 text-white text-xs px-2 py-0.5 rounded font-mono w-28 focus:outline-none"
                        autoFocus
                      />
                      <button onClick={handleSaveUsername} className="p-1 rounded bg-cyan-600 text-white">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-bold text-sm text-white">{userProfile.username}</span>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-slate-400 hover:text-cyan-300 cursor-pointer"
                        title="Edit Username"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-bold">
                LVL {userProfile.level}
              </div>
            </div>

            {/* XP Bar */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex justify-between text-[11px] text-slate-300">
                <span className="flex items-center gap-1 text-cyan-300">
                  <Zap className="w-3.5 h-3.5" />
                  Exploration XP
                </span>
                <span className="font-mono text-cyan-400">
                  {userProfile.xp} / {nextLevelXp} XP
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 text-right">
                {xpPercent}% to Level {userProfile.level + 1}
              </div>
            </div>

            {/* Explorer Stats */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">BEACONS</div>
                <div className="font-bold text-cyan-300 text-sm mt-0.5">
                  {progress.activatedAnchors.length} / 3
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">DATA CORES</div>
                <div className="font-bold text-amber-300 text-sm mt-0.5">
                  {progress.collectedFragments.length} / 4
                </div>
              </div>
            </div>
          </div>

          {/* Quick Rank Badge */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">CURRENT RANK</div>
              <div className="text-xs font-bold text-slate-200">
                {userProfile.level >= 5 ? 'Master Stratosphere Surveyor' : 'Veteran Sky Farer'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Level / Sector Selection (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>SELECT FLIGHT SECTOR</span>
            </div>

            {SECTORS.map((sector) => {
              const isSelected = selectedSectorId === sector.id;
              const isUnlocked = userProfile.unlockedSectors.includes(sector.id);

              return (
                <div
                  key={sector.id}
                  onClick={() => {
                    if (isUnlocked) {
                      setSelectedSectorId(sector.id);
                      onUpdateProfile({ ...userProfile, selectedSector: sector.id });
                    }
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                      : isUnlocked
                      ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/30 border-slate-900 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-['Cinzel'] tracking-wide">
                          {sector.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">
                          {sector.altitudeMeters}m ALT
                        </span>
                      </div>
                      <div className="text-xs text-amber-300/90 font-mono mt-0.5">
                        {sector.subtitle}
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans mt-1.5 leading-relaxed">
                        {sector.description}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                        sector.difficulty === 'Standard' ? 'bg-teal-950/60 text-teal-300 border border-teal-500/30' :
                        sector.difficulty === 'Advanced' ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30' :
                        'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                      }`}>
                        {sector.difficulty}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] text-cyan-400 flex items-center gap-1 font-bold mt-2">
                          ACTIVE <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Launch Button */}
          <div className="pt-2">
            <button
              onClick={() => onSelectSectorAndLaunch(selectedSectorId)}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 active:scale-[0.98] text-white font-['Cinzel'] font-bold text-lg tracking-[0.2em] uppercase shadow-[0_0_30px_rgba(6,182,212,0.45)] border border-cyan-300/40 transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>DEPLOY INTO {selectedSector.name.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer System Specs */}
      <div className="w-full max-w-5xl text-center text-[10px] text-slate-500 border-t border-white/5 pt-3">
        THE DRIFTING LAND · THIRD-PERSON SIMULATION ENGINE · TELEMETRY READY
      </div>
    </div>
  );
};
