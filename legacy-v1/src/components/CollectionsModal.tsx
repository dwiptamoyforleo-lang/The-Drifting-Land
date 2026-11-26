/**
 * Collections & Relic Archive Modal for The Drifting Land.
 * Comprehensive field guide for discovered ancient records, celestial shards,
 * flora specimens, wildlife sightings, and boss trophies.
 */

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Scroll,
  Flower2,
  Skull,
  Eye,
  Award,
  Layers,
} from 'lucide-react';
import { ShardRelic } from '../types/game';
import { AudioService } from '../services/audio';

interface CollectionsModalProps {
  shards: ShardRelic[];
  discoveries: string[];
  defeatedBosses?: string[];
  onClose: () => void;
}

type TabType = 'relics' | 'records' | 'wildlife' | 'trophies';

const ANCIENT_LORE_RECORDS = [
  {
    id: 'rec_great_drift',
    title: 'The Great Drift (First Era)',
    subtitle: 'Verdant Monolith Plaza Archive',
    snippet:
      'In the twilight of the First Dynasty, the world-core fractured into five suspended dimensional strata. To preserve humanity, ancient architects constructed the Monolith Beacons, binding skyward continents with resonance beams.',
  },
  {
    id: 'rec_portal_network',
    title: 'Trans-Dimensional Conduits',
    subtitle: 'Ruin Waypoint Stele',
    snippet:
      'The Gateways do not cross space—they cross gravitational density. To breach The Ashen Expanse or The Moonveil, one must synthesize Sunstone crystals attuned to the target dimension resonance frequency.',
  },
  {
    id: 'rec_red_moon_cycle',
    title: 'The Crimson Eclipse Phenomenon',
    subtitle: 'Astral Observation Ledger',
    snippet:
      'Every third dawn, the Blood Orbit aligns with the archipelago. Flora hyper-evolves with luminous vitality, but dormant mechanical wardens awakening from the rift breach the outer islands.',
  },
  {
    id: 'rec_sunken_machinery',
    title: 'The Submerged Astrolabes',
    subtitle: 'Sunken Archive Pedestal',
    snippet:
      'Brass mechanisms deep within the Sunken Archive regulate the tidal aether winds. When all four gears align, the celestial barrier lifts, granting entry to the Rift Frontier.',
  },
];

const FAUNA_CATALOG = [
  {
    name: 'Cloudgrazer',
    diet: 'Herbivore',
    habitat: 'Open Meadow & Verdant Isles',
    lore: 'Gentle, floating bovids that feast on sky lichen and aether blossoms. Emit soothing hums.',
  },
  {
    name: 'Emberfox',
    diet: 'Omnivore',
    habitat: 'Basalt Ridge & Thermal Vents',
    lore: 'Agile warm-furred vulpines whose tails glow with ember embers during chilly high-altitude nights.',
  },
  {
    name: 'Glasswing',
    diet: 'Nectarivore',
    habitat: 'Floral Clearings & Canopy',
    lore: 'Translucent lepidoptera whose wings refract ambient sunlight into rainbow halos.',
  },
  {
    name: 'Mossback',
    diet: 'Herbivore',
    habitat: 'Marshlands & Damp Grooves',
    lore: 'Enduring tortoise-like entities with living micro-ecosystems flourishing across their weathered carapaces.',
  },
  {
    name: 'Rift Stalker',
    diet: 'Predator (Hostile)',
    habitat: 'Dimensional Fissures',
    lore: 'Phase-shifting predators woven from dark celestial dust. Attack swiftly from shadow rifts.',
  },
];

const BOSS_TROPHIES = [
  {
    id: 'crimson_warden',
    title: 'The Crimson Warden',
    domain: 'Red Moon Eclipse',
    trophy: 'Calcified Blood Core',
    description: 'Colossal mechanical guardian awakened by the blood orbit. Defeated through agile evasions.',
  },
  {
    id: 'rootbound_guardian',
    title: 'The Ancient Sentinel',
    domain: 'Ruin Crypts',
    trophy: 'Overgrown Primordial Cog',
    description: 'Timeworn stone automaton protecting the primeval beacon key fragments.',
  },
];

export const CollectionsModal: React.FC<CollectionsModalProps> = ({
  shards,
  discoveries,
  defeatedBosses = [],
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('relics');

  const collectedShards = shards.filter((s) => s.collected);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="collections-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm select-none"
    >
      <div className="w-full max-w-4xl h-[85vh] max-h-[700px] bg-[#0c131f] border border-slate-700/60 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-[#0a0f18]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Scroll className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono tracking-widest uppercase text-purple-400">
                Explorer Compendium
              </div>
              <h2 id="collections-title" className="text-xl font-serif font-bold text-slate-100">
                Collections & Archives
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              AudioService.playUiClick();
              onClose();
            }}
            aria-label="Close collections modal"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800 bg-[#0c131f]">
          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('relics');
            }}
            className={`pb-3 px-3 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'relics'
                ? 'border-purple-400 text-purple-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Relics ({collectedShards.length}/{shards.length || 5})</span>
          </button>

          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('records');
            }}
            className={`pb-3 px-3 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'records'
                ? 'border-purple-400 text-purple-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Ancient Records ({ANCIENT_LORE_RECORDS.length})</span>
          </button>

          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('wildlife');
            }}
            className={`pb-3 px-3 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'wildlife'
                ? 'border-purple-400 text-purple-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flower2 className="w-3.5 h-3.5" />
            <span>Fauna Field Guide</span>
          </button>

          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('trophies');
            }}
            className={`pb-3 px-3 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'trophies'
                ? 'border-purple-400 text-purple-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Skull className="w-3.5 h-3.5" />
            <span>Boss Trophies ({defeatedBosses.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'relics' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 font-light">
                Celestial Shards resonate with ancient beacon monolithic architecture. Recover shards scattered across floating islands to restore beacon power.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {(shards.length > 0 ? shards : [
                  { id: 'shard_1', name: 'Plaza Celestial Shard', collected: true, position: [0, 4.5, 0] },
                  { id: 'shard_2', name: 'Highlands Sun Shard', collected: false, position: [10, 5, 10] },
                  { id: 'shard_3', name: 'Basalt Caldera Shard', collected: false, position: [-10, 5, 20] },
                ]).map((shard, idx) => (
                  <div
                    key={shard.id || idx}
                    className={`p-4 rounded-xl border transition-all ${
                      shard.collected
                        ? 'bg-slate-900/60 border-purple-500/40 shadow-lg'
                        : 'bg-slate-950/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          shard.collected
                            ? 'bg-purple-950/80 text-purple-400 border border-purple-500/30'
                            : 'bg-slate-900 text-slate-600 border border-slate-800'
                        }`}
                      >
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-100">
                          {shard.name || `Archipelago Shard #${idx + 1}`}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {shard.collected ? 'Attuned & Bound' : 'Awaiting Discovery'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 font-light">
                Fragments of ancient technology and historical chronicles preserved upon weathered steles and pedestal archives.
              </p>
              <div className="space-y-3">
                {ANCIENT_LORE_RECORDS.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-sm font-semibold text-slate-100 font-serif">
                        {rec.title}
                      </h4>
                      <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">
                        {rec.subtitle}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-light leading-relaxed">
                      "{rec.snippet}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'wildlife' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 font-light">
                Indigenous species adapted to high-altitude floating gravity, thermal fissures, and bioluminescent night cycles.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FAUNA_CATALOG.map((f) => (
                  <div
                    key={f.name}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-emerald-400 font-serif">
                        {f.name}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                        {f.diet}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Habitat: {f.habitat}
                    </div>
                    <p className="text-xs text-slate-300 font-light leading-relaxed">
                      {f.lore}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'trophies' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 font-light">
                Colossal entities and mechanical guardians conquered in combat.
              </p>
              <div className="space-y-3">
                {BOSS_TROPHIES.map((boss) => {
                  const isDefeated = defeatedBosses.includes(boss.id);
                  return (
                    <div
                      key={boss.id}
                      className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                        isDefeated
                          ? 'bg-slate-900/70 border-emerald-500/40 shadow-lg'
                          : 'bg-slate-950/40 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isDefeated
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}
                        >
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-100">
                            {boss.title}
                          </div>
                          <div className="text-xs text-slate-300 font-light">
                            {boss.description}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-1">
                            Trophy: {boss.trophy} · Domain: {boss.domain}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-xs font-mono">
                        {isDefeated ? (
                          <span className="text-emerald-400 font-bold">CONQUERED</span>
                        ) : (
                          <span className="text-slate-500">UNDISCOVERED</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
