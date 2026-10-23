/**
 * Settings & Persistence Management Modal for The Drifting Land.
 * Includes audio settings, touch controls toggle, save backup / export / import, and controls guide.
 */

import React, { useState } from 'react';
import { X, Volume2, VolumeX, Smartphone, Download, Upload, Trash2, Check, AlertCircle, Eye, Sliders } from 'lucide-react';
import { GameSettings, CameraMode } from '../types/game';
import { StorageService } from '../services/storage';
import { AudioService } from '../services/audio';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onClose: () => void;
  onReloadSave: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onReloadSave,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'controls' | 'audio' | 'save'>('camera');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<{ text: string; isError: boolean } | null>(null);

  const currentCameraMode: CameraMode = settings.cameraMode || 'THIRD_PERSON';
  const currentCameraDistance = settings.cameraDistance ?? 6.5;
  const currentCameraSensitivity = settings.cameraSensitivity ?? 1.0;

  const handleExport = () => {
    try {
      const jsonStr = StorageService.exportSaveJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drifting_land_save_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportNotice('Save exported successfully!');
      setTimeout(() => setExportNotice(null), 3000);
    } catch {
      setExportNotice('Export failed');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageService.importSaveJson(content);
      if (res.success) {
        setImportNotice({ text: 'Save imported successfully!', isError: false });
        onReloadSave();
        setTimeout(() => setImportNotice(null), 3000);
      } else {
        setImportNotice({ text: res.error || 'Import failed', isError: true });
      }
    };
    reader.readAsText(file);
  };

  const handleResetSave = () => {
    if (window.confirm('Are you sure you want to erase your expedition progress? This cannot be undone.')) {
      StorageService.clearSave();
      onReloadSave();
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-md rounded-3xl bg-[#0c121d] border border-slate-800 p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <h2 className="text-lg font-serif font-black tracking-widest text-slate-100 uppercase">
            SETTINGS & SYSTEM
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-950 border border-slate-800/80 mb-5">
          <button
            onClick={() => setActiveTab('camera')}
            className={`py-1.5 rounded-xl text-[11px] font-mono tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'camera' ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Camera
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            className={`py-1.5 rounded-xl text-[11px] font-mono tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'controls' ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Controls
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`py-1.5 rounded-xl text-[11px] font-mono tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'audio' ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Audio
          </button>
          <button
            onClick={() => setActiveTab('save')}
            className={`py-1.5 rounded-xl text-[11px] font-mono tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'save' ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Data
          </button>
        </div>

        {/* Tab: Camera & View Settings */}
        {activeTab === 'camera' && (
          <div className="flex flex-col gap-4 text-xs font-mono">
            {/* Camera Mode Selector */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex flex-col gap-3">
              <span className="text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Camera Perspective Mode</span>
              </span>

              <div className="grid grid-cols-1 gap-2 pt-1">
                {/* Third Person */}
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, cameraMode: 'THIRD_PERSON' })}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    currentCameraMode === 'THIRD_PERSON'
                      ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="font-bold tracking-wide text-xs flex justify-between items-center">
                    <span>THIRD PERSON (Default)</span>
                    {currentCameraMode === 'THIRD_PERSON' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Orbital third-person perspective behind and above the explorer with smooth terrain clearance.
                  </p>
                </button>

                {/* First Person */}
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, cameraMode: 'FIRST_PERSON' })}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    currentCameraMode === 'FIRST_PERSON'
                      ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="font-bold tracking-wide text-xs flex justify-between items-center">
                    <span>FIRST PERSON</span>
                    {currentCameraMode === 'FIRST_PERSON' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Immersive eye-level view with hidden character mesh and realistic head pitch controls.
                  </p>
                </button>

                {/* Second Person: Observer View */}
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, cameraMode: 'SECOND_PERSON' })}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    currentCameraMode === 'SECOND_PERSON'
                      ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="font-bold tracking-wide text-xs flex justify-between items-center">
                    <span>SECOND PERSON (Observer View)</span>
                    {currentCameraMode === 'SECOND_PERSON' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    An experimental perspective where nearby NPCs or creatures watch you, with frontal surveillance fallback.
                  </p>
                </button>
              </div>
            </div>

            {/* Camera Sensitivity Slider */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-bold uppercase tracking-wider">Look Sensitivity</span>
                <span className="text-emerald-400 font-mono tabular-nums">{currentCameraSensitivity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.05"
                value={currentCameraSensitivity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateSettings({ ...settings, cameraSensitivity: val });
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.2x (Slow)</span>
                <span>1.0x (Standard)</span>
                <span>3.0x (Fast)</span>
              </div>
            </div>

            {/* Camera Distance Slider */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-bold uppercase tracking-wider">Third-Person Distance</span>
                <span className="text-emerald-400 font-mono tabular-nums">{currentCameraDistance.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min="3.0"
                max="16.0"
                step="0.5"
                value={currentCameraDistance}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateSettings({ ...settings, cameraDistance: val });
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>3.0m (Close)</span>
                <span>6.5m (Standard)</span>
                <span>16.0m (Far)</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Controls Guide */}
        {activeTab === 'controls' && (
          <div className="flex flex-col gap-4 text-xs font-mono">
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80">
              <span className="text-emerald-400 uppercase tracking-widest font-bold block mb-2">
                Desktop Keyboard & Mouse
              </span>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div><span className="text-slate-400">WASD / Arrows:</span> Movement</div>
                <div><span className="text-slate-400">Mouse:</span> Look (Pointer Lock)</div>
                <div><span className="text-slate-400">Spacebar:</span> Jump (Coyote time)</div>
                <div><span className="text-slate-400">Left Shift:</span> Sprint (Stamina)</div>
                <div><span className="text-slate-400">Key [V]:</span> Cycle Camera Mode</div>
                <div><span className="text-slate-400">Key [M]:</span> Regional Chart</div>
                <div><span className="text-slate-400">Key [I] / Tab:</span> Inventory Pouch</div>
                <div><span className="text-slate-400">Key [J] / Q:</span> Quest Journal</div>
                <div><span className="text-slate-400">Key [E]:</span> Interact / Collect</div>
                <div><span className="text-slate-400">Escape / P:</span> Pause / Resume</div>
                <div><span className="text-slate-400">Key [H]:</span> Toggle Bottom Dock</div>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80">
              <span className="text-emerald-400 uppercase tracking-widest font-bold block mb-2">
                Android & Touchscreen
              </span>
              <p className="text-slate-400 leading-relaxed mb-3">
                Left thumb controls the virtual movement stick. Right side touch controls camera look direction. Dedicated buttons provide Jump, Sprint, Interact [E], Camera Perspective [V], and Regional Chart [M].
              </p>
              <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-900">
                <span className="text-slate-300 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Always Enable Touch Controls</span>
                </span>
                <input
                  type="checkbox"
                  checked={settings.touchControls}
                  onChange={(e) => onUpdateSettings({ ...settings, touchControls: e.target.checked })}
                  className="rounded text-emerald-500 focus:ring-0 w-4 h-4"
                />
              </label>
            </div>
          </div>
        )}

        {/* Tab 2: Audio & Display */}
        {activeTab === 'audio' && (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
                  <span>Sound & Music</span>
                </span>
                <button
                  onClick={() => {
                    const next = !settings.soundEnabled;
                    AudioService.setMuted(!next);
                    onUpdateSettings({ ...settings, soundEnabled: next });
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase transition-colors cursor-pointer ${
                    settings.soundEnabled ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600/40' : 'bg-red-950/60 text-red-300 border border-red-700/40'
                  }`}
                >
                  {settings.soundEnabled ? 'Enabled' : 'Muted'}
                </button>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
                  <span>Master Volume</span>
                  <span className="tabular-nums">{Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    AudioService.setVolume(val);
                    onUpdateSettings({ ...settings, masterVolume: val });
                  }}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex flex-col gap-2">
              <span className="text-xs font-mono text-emerald-400 tracking-wider uppercase font-bold">
                Static Hosting Architecture
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                The Drifting Land runs 100% client-side with zero external server dependencies, procedural WebGL assets, and offline browser-local persistence for guaranteed GitHub Pages compatibility.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Save Data */}
        {activeTab === 'save' && (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex flex-col gap-3">
              <span className="text-xs font-mono text-emerald-400 tracking-wider uppercase font-bold">
                Export / Backup Save
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Download your single-player journey data as a JSON file to transfer between devices or browsers.
              </p>
              <button
                onClick={handleExport}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export Save File (.json)</span>
              </button>
              {exportNotice && (
                <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>{exportNotice}</span>
                </div>
              )}
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex flex-col gap-3">
              <span className="text-xs font-mono text-emerald-400 tracking-wider uppercase font-bold">
                Import Save
              </span>
              <label className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Import Save File (.json)</span>
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>
              {importNotice && (
                <div className={`text-xs font-mono flex items-center gap-1.5 ${importNotice.isError ? 'text-red-400' : 'text-emerald-400'}`}>
                  {importNotice.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{importNotice.text}</span>
                </div>
              )}
            </div>

            <div className="bg-red-950/20 p-4 rounded-2xl border border-red-900/40 flex flex-col gap-3">
              <span className="text-xs font-mono text-red-400 tracking-wider uppercase font-bold">
                Reset Save Data
              </span>
              <button
                onClick={handleResetSave}
                className="py-2.5 px-3 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-700/60 text-red-200 text-xs font-mono flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Erase All Save Data</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
