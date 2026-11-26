/**
 * Multi-Slot Save Management Modal for The Drifting Land.
 * Provides:
 * - Visual cards for Slots 1, 2, and 3
 * - Summary metadata (Expedition Level, Day count, Region, Shards, Currency, Timestamp)
 * - Safe actions: Select/Switch Active, Duplicate/Copy, Export, Import, and Reset
 * - Inline confirmation dialogs (strictly avoiding window.alert / window.confirm)
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Clock,
  MapPin,
  Sparkles,
  Copy,
  Trash2,
  Download,
  Upload,
  Check,
  AlertTriangle,
  Play,
  PlusCircle,
  Coins,
  Shield,
  Layers,
} from 'lucide-react';
import { SaveSlotMetadata } from '../types/game';
import { StorageService, MAX_SAVE_SLOTS, createInitialSave } from '../services/storage';
import { AudioService } from '../services/audio';

interface SaveSlotModalProps {
  currentSlotId: number;
  onSelectSlot: (slotId: number) => void;
  onClose: () => void;
  onSaveReloaded: () => void;
}

export const SaveSlotModal: React.FC<SaveSlotModalProps> = ({
  currentSlotId,
  onSelectSlot,
  onClose,
  onSaveReloaded,
}) => {
  const [slots, setSlots] = useState<SaveSlotMetadata[]>([]);
  const [activeSlot, setActiveSlot] = useState<number>(currentSlotId);
  const [confirmClearSlotId, setConfirmClearSlotId] = useState<number | null>(null);
  const [copyTargetFromSlot, setCopyTargetFromSlot] = useState<number | null>(null);
  const [statusNotice, setStatusNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  const refreshSlots = () => {
    setSlots(StorageService.getAllSlotsMetadata());
    setActiveSlot(StorageService.getActiveSlot());
  };

  useEffect(() => {
    refreshSlots();
  }, []);

  const showNotice = (text: string, isError = false) => {
    setStatusNotice({ text, isError });
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Switch to or load a slot
  const handleSwitchSlot = (slotId: number) => {
    AudioService.playUiClick();
    StorageService.setActiveSlot(slotId);
    setActiveSlot(slotId);
    onSelectSlot(slotId);
    showNotice(`Switched to Save Slot ${slotId}`);
  };

  // Create a clean new save in an empty slot
  const handleCreateNewInSlot = (slotId: number) => {
    AudioService.playUiClick();
    const clean = createInitialSave(slotId);
    StorageService.saveGame(clean, slotId);
    StorageService.setActiveSlot(slotId);
    refreshSlots();
    onSelectSlot(slotId);
    onSaveReloaded();
    showNotice(`Initialized new expedition in Slot ${slotId}`);
  };

  // Clear / delete a slot
  const handleExecuteClearSlot = (slotId: number) => {
    AudioService.playUiClick();
    StorageService.clearSave(slotId);
    setConfirmClearSlotId(null);
    refreshSlots();
    if (activeSlot === slotId) {
      onSaveReloaded();
    }
    showNotice(`Cleared Save Slot ${slotId}`);
  };

  // Copy slot
  const handleCopySlot = (fromSlot: number, toSlot: number) => {
    AudioService.playUiClick();
    const success = StorageService.copySlot(fromSlot, toSlot);
    setCopyTargetFromSlot(null);
    if (success) {
      refreshSlots();
      showNotice(`Successfully cloned Slot ${fromSlot} to Slot ${toSlot}`);
    } else {
      showNotice(`Failed to copy slot`, true);
    }
  };

  // Export single slot
  const handleExportSlot = (slotId: number) => {
    AudioService.playUiClick();
    try {
      const jsonStr = StorageService.exportSaveJson(slotId);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drifting_land_slot_${slotId}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotice(`Exported Slot ${slotId} JSON`);
    } catch {
      showNotice('Export failed', true);
    }
  };

  // Export full 3-slot backup bundle
  const handleExportAllSlots = () => {
    AudioService.playUiClick();
    try {
      const jsonStr = StorageService.exportAllSlotsJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drifting_land_complete_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotice('Full multi-slot archive exported!');
    } catch {
      showNotice('Full archive export failed', true);
    }
  };

  // Import into a slot
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>, targetSlot?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageService.importSaveJson(content, targetSlot);
      if (res.success) {
        refreshSlots();
        onSaveReloaded();
        showNotice('Save data imported successfully!');
      } else {
        showNotice(res.error || 'Import failed', true);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-slots-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h2 id="save-slots-title" className="text-base sm:text-lg font-bold tracking-tight text-slate-100">
                Expedition Save Slots
              </h2>
              <p className="text-xs text-slate-400">
                Independent expedition profiles with atomic write protection & local persistence
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              AudioService.playUiClick();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Status Notice Toast */}
        {statusNotice && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center gap-2 font-medium border-b ${
              statusNotice.isError
                ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
            }`}
          >
            {statusNotice.isError ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <Check className="w-4 h-4 shrink-0" />
            )}
            <span>{statusNotice.text}</span>
          </div>
        )}

        {/* Content Body: 3 Slots List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {slots.map((slot) => {
              const isActive = slot.slotId === activeSlot;
              const isConfirmingClear = confirmClearSlotId === slot.slotId;
              const formattedDate = slot.timestamp
                ? new Date(slot.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Never';

              return (
                <div
                  key={slot.slotId}
                  className={`relative p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/30'
                      : slot.isEmpty
                      ? 'bg-slate-950/40 border-slate-800 border-dashed'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Slot Header & Identity */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-300">
                          SLOT {slot.slotId}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            ACTIVE
                          </span>
                        )}
                        {slot.isEmpty && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">
                            EMPTY
                          </span>
                        )}
                      </div>

                      {/* Details if present */}
                      {!slot.isEmpty ? (
                        <div>
                          <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                            <span>Level {slot.playerLevel ?? 1} Explorer</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-cyan-400 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {slot.regionName || 'The Verdant Reach'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              {slot.shardsCount ?? 0} Relic Shards
                            </span>
                            <span className="flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-yellow-400" />
                              {slot.driftCoins ?? 0} Coins
                            </span>
                            <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                              <Clock className="w-3 h-3" />
                              Day {slot.dayCount ?? 1} · {formattedDate}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          No expedition recorded in this slot. Ready for a new journey.
                        </p>
                      )}
                    </div>

                    {/* Right: Slot Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {slot.isEmpty ? (
                        <button
                          onClick={() => handleCreateNewInSlot(slot.slotId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>New Game</span>
                        </button>
                      ) : (
                        <>
                          {!isActive && (
                            <button
                              onClick={() => handleSwitchSlot(slot.slotId)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors"
                              title="Switch to and load this slot"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Load Slot</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleExportSlot(slot.slotId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                            title="Export this slot to JSON"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setCopyTargetFromSlot(slot.slotId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                            title="Clone/duplicate to another slot"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {isConfirmingClear ? (
                            <div className="flex items-center gap-1 bg-rose-950/90 border border-rose-700/60 rounded-lg p-1">
                              <span className="text-[10px] text-rose-300 font-semibold px-1">Delete?</span>
                              <button
                                onClick={() => handleExecuteClearSlot(slot.slotId)}
                                className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmClearSlotId(null)}
                                className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmClearSlotId(slot.slotId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                              title="Clear / delete this save slot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline Clone Destination Picker */}
                  {copyTargetFromSlot === slot.slotId && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                      <span className="text-cyan-300">Copy Slot {slot.slotId} to:</span>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3]
                          .filter((targetId) => targetId !== slot.slotId)
                          .map((targetId) => (
                            <button
                              key={targetId}
                              onClick={() => handleCopySlot(slot.slotId, targetId)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-700 text-slate-200 text-xs font-mono transition-colors"
                            >
                              Slot {targetId}
                            </button>
                          ))}
                        <button
                          onClick={() => setCopyTargetFromSlot(null)}
                          className="px-2 py-1 rounded bg-slate-900 text-slate-400 hover:text-slate-200 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Backup & Data Transfer Tray */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cross-Device Backup & Archive
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportAllSlots}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Export All Slots Bundle</span>
              </button>

              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Import Save JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => handleImportFile(e)}
                />
              </label>
            </div>
            <p className="text-[11px] text-slate-500">
              Saves are kept locally in your browser storage. Export JSON files to transfer your progress between mobile and desktop devices.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Active Save Profile: Slot {activeSlot}</span>
          <button
            onClick={() => {
              AudioService.playUiClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
};
