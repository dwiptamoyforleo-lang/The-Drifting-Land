/**
 * Crafting & Fabrication Modal for THE DRIFTING LAND
 * Implements full recipe system, material checks with live inventory counts,
 * category filters, crafting sound feedback, and real item generation.
 */
import React, { useState } from 'react';
import {
  X,
  Hammer,
  Sparkles,
  Check,
  AlertCircle,
  Shield,
  Compass,
  Gem,
  Flame,
  Zap,
  Radio,
  Clock,
  Droplet,
  Coffee,
  Activity,
  TreePine,
  Mountain,
  Sun,
  Wind,
  Box,
  Key,
} from 'lucide-react';
import { InventoryItem, CraftingRecipe } from '../game/types';
import { CRAFTING_RECIPES, getRarityColor } from '../game/itemDatabase';
import { soundSystem } from '../game/audio';

interface CraftingModalProps {
  inventory: InventoryItem[];
  onCraftRecipe: (recipe: CraftingRecipe) => void;
  onClose: () => void;
}

export const CraftingModal: React.FC<CraftingModalProps> = ({
  inventory,
  onCraftRecipe,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeRecipeId, setActiveRecipeId] = useState<string>(CRAFTING_RECIPES[0]?.id || '');
  const [craftingFeedback, setCraftingFeedback] = useState<string | null>(null);

  // Helper to count available count of an item in inventory
  const getItemCount = (itemId: string): number => {
    const found = inventory.find((i) => i.id === itemId);
    return found ? found.quantity : 0;
  };

  const filteredRecipes = CRAFTING_RECIPES.filter((recipe) => {
    const matchesCat = selectedCategory === 'all' || recipe.category === selectedCategory;
    const matchesQuery =
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const activeRecipe = CRAFTING_RECIPES.find((r) => r.id === activeRecipeId) || filteredRecipes[0];

  const canCraft = (recipe: CraftingRecipe): boolean => {
    return recipe.materials.every((mat) => getItemCount(mat.itemId) >= mat.count);
  };

  const handleCraft = (recipe: CraftingRecipe) => {
    if (!canCraft(recipe)) return;

    soundSystem.playCraftSuccess();
    onCraftRecipe(recipe);

    setCraftingFeedback(`Fabricated ${recipe.resultCount}x ${recipe.resultItem.name}! Added to cargo.`);
    setTimeout(() => {
      setCraftingFeedback(null);
    }, 3000);
  };

  const renderIcon = (iconName: string, className: string = 'w-4 h-4') => {
    switch (iconName) {
      case 'hammer':
        return <Hammer className={className} />;
      case 'wrench':
        return <Hammer className={className} />;
      case 'flame':
        return <Flame className={className} />;
      case 'shield':
      case 'shield-alert':
      case 'shield-plus':
        return <Shield className={className} />;
      case 'zap':
        return <Zap className={className} />;
      case 'radio':
        return <Radio className={className} />;
      case 'clock':
        return <Clock className={className} />;
      case 'droplet':
        return <Droplet className={className} />;
      case 'coffee':
        return <Coffee className={className} />;
      case 'activity':
        return <Activity className={className} />;
      case 'tree-pine':
        return <TreePine className={className} />;
      case 'mountain':
        return <Mountain className={className} />;
      case 'sun':
        return <Sun className={className} />;
      case 'wind':
        return <Wind className={className} />;
      case 'box':
        return <Box className={className} />;
      case 'key':
        return <Key className={className} />;
      case 'compass':
        return <Compass className={className} />;
      case 'gem':
      default:
        return <Gem className={className} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md select-none overflow-y-auto font-['Share_Tech_Mono',monospace]">
      <div className="max-w-4xl w-full bg-gradient-to-b from-slate-900 via-[#0b1320] to-slate-950 border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-200 relative my-auto flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <Hammer className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] tracking-[0.25em] text-cyan-400 uppercase">EXPEDITION WORKBENCH</div>
              <h2 className="font-['Cinzel'] text-xl font-bold tracking-wider text-white">
                Fabrication & Synthesis
              </h2>
            </div>
          </div>
          <div className="hidden sm:block text-right pr-12">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Aetheric Forge</div>
            <div className="text-xs text-cyan-300 font-mono">STATUS: RESONANCE STABLE</div>
          </div>
        </div>

        {/* Feedback Banner */}
        {craftingFeedback && (
          <div className="mb-3 py-2 px-3 rounded-xl bg-cyan-950/90 border border-cyan-400 text-cyan-200 text-xs flex items-center justify-center gap-2 animate-bounce">
            <Check className="w-4 h-4 text-cyan-300" />
            <span>{craftingFeedback}</span>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 text-xs shrink-0">
          {[
            { id: 'all', label: 'All Recipes' },
            { id: 'tools_equipment', label: 'Tools' },
            { id: 'protective', label: 'Protective Gear' },
            { id: 'exploration', label: 'Exploration' },
            { id: 'food_recovery', label: 'Recovery & Salves' },
            { id: 'relics', label: 'Relics & Special' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-mono text-[11px] uppercase tracking-wider transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-cyan-600 text-white font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-[360px]">
          {/* Left Column: Recipe List (5 cols) */}
          <div className="md:col-span-5 space-y-2 overflow-y-auto pr-1 max-h-[360px]">
            {filteredRecipes.map((recipe) => {
              const craftable = canCraft(recipe);
              const isSelected = activeRecipe?.id === recipe.id;
              const rarityStyle = getRarityColor(recipe.resultItem.rarity);

              return (
                <div
                  key={recipe.id}
                  onClick={() => setActiveRecipeId(recipe.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-slate-800/80 border-cyan-400 shadow-lg'
                      : 'bg-slate-950/60 border-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className={`p-2 rounded-xl ${rarityStyle.bg} border ${rarityStyle.border} ${rarityStyle.text} shrink-0`}>
                      {renderIcon(recipe.resultItem.icon)}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-bold text-xs text-slate-100 truncate">{recipe.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Yields: {recipe.resultCount}x {recipe.resultItem.name}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {craftable ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-bold">
                        READY
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500">
                        NEED MATS
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Recipe Details & Crafting Action (7 cols) */}
          <div className="md:col-span-7 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto">
            {activeRecipe ? (
              <div className="space-y-4">
                {/* Result Item Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-850">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-2xl ${getRarityColor(activeRecipe.resultItem.rarity).bg} border ${
                        getRarityColor(activeRecipe.resultItem.rarity).border
                      } ${getRarityColor(activeRecipe.resultItem.rarity).text}`}
                    >
                      {renderIcon(activeRecipe.resultItem.icon, 'w-6 h-6')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-['Cinzel'] text-base font-bold text-white">
                          {activeRecipe.resultItem.name}
                        </h3>
                        <span
                          className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded border ${
                            getRarityColor(activeRecipe.resultItem.rarity).badge
                          }`}
                        >
                          {activeRecipe.resultItem.rarity || 'common'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-sans mt-0.5 leading-relaxed">
                        {activeRecipe.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Trade-off and Stats Info */}
                {activeRecipe.resultItem.tradeOffDescription && (
                  <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-200">
                    <span className="font-bold uppercase tracking-wider text-cyan-300 mr-1.5">Effect:</span>
                    {activeRecipe.resultItem.tradeOffDescription}
                  </div>
                )}

                {/* Required Materials List */}
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
                    <span>Required Components</span>
                    <span className="text-[10px] text-slate-400">Inventory Status</span>
                  </div>

                  <div className="space-y-2">
                    {activeRecipe.materials.map((mat) => {
                      const available = getItemCount(mat.itemId);
                      const hasEnough = available >= mat.count;

                      return (
                        <div
                          key={mat.itemId}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                            hasEnough
                              ? 'bg-slate-900/60 border-slate-800 text-slate-200'
                              : 'bg-rose-950/20 border-rose-900/40 text-rose-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-slate-800 text-cyan-300">
                              {renderIcon(mat.icon || 'gem')}
                            </div>
                            <span className="font-medium">{mat.itemName}</span>
                          </div>

                          <div className="flex items-center gap-2 font-mono">
                            <span
                              className={`font-bold ${
                                hasEnough ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {available} / {mat.count}
                            </span>
                            {hasEnough ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Craft Button */}
                <div className="pt-2">
                  <button
                    onClick={() => handleCraft(activeRecipe)}
                    disabled={!canCraft(activeRecipe)}
                    className={`w-full py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      canCraft(activeRecipe)
                        ? 'bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-850 text-slate-500 cursor-not-allowed border border-slate-800'
                    }`}
                  >
                    <Hammer className="w-4 h-4" />
                    <span>
                      {canCraft(activeRecipe)
                        ? `Fabricate ${activeRecipe.resultItem.name}`
                        : 'Insufficient Materials'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Select a recipe from the list to view requirements.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
