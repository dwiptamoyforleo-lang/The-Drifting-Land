/**
 * Comprehensive Settings & System Modal for The Drifting Land.
 * All settings modify actual game behavior in real-time.
 * Strictly avoids window.alert and window.confirm.
 * Includes:
 * - Graphics: Quality (High/Med/Low), Shadows, Particle Density limits
 * - Camera: Mode (Third, First, Observer), Sensitivity slider, Camera Distance
 * - Audio: Master, SFX, and Music volume controls
 * - HUD & Mobile: HUD Visibility modes, Touch controls toggle, Button Size, Haptics
 * - Data & Resets: JSON export/import, Reset to defaults, Clean expedition progress modal
 */

import React, { useState } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Smartphone,
  Download,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  Eye,
  Sliders,
  Monitor,
  Layout,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { GameSettings, CameraMode } from '../types/game';
import { StorageService, DEFAULT_SETTINGS } from '../services/storage';
import { AudioService } from '../services/audio';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onClose: () => void;
  onReloadSave: () => void;
}

type SettingsTab = 'graphics' | 'camera' | 'audio' | 'hud' | 'save';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onReloadSave,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('graphics');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<{ text: string; isError: boolean } | null>(null);
  const [confirmResetSave, setConfirmResetSave] = useState<boolean>(false);
  const [resetSettingsNotice, setResetSettingsNotice] = useState<string | null>(null);

  // Settings update helper that automatically persists
  const updateSetting = <K extends keyof GameSettings>(key: K, val: GameSettings[K]) => {
    const updated = { ...settings, [key]: val };
    onUpdateSettings(updated);
    StorageService.saveSettings(updated);

    // Synchronize live audio service
    if (key === 'masterVolume' && typeof val === 'number') {
      AudioService.setVolume(val);
    } else if (key === 'sfxVolume' && typeof val === 'number') {
      AudioService.setSfxVolume(val);
    } else if (key === 'musicVolume' && typeof val === 'number') {
      AudioService.setMusicVolume(val);
    } else if (key === 'soundEnabled' && typeof val === 'boolean') {
      AudioService.setMuted(!val);
    }
  };

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

  const handleResetSettingsToDefaults = () => {
    AudioService.playUiClick();
    onUpdateSettings({ ...DEFAULT_SETTINGS });
    StorageService.saveSettings({ ...DEFAULT_SETTINGS });
    setResetSettingsNotice('Settings reset to defaults');
    setTimeout(() => setResetSettingsNotice(null), 3000);
  };

  const handleExecuteSaveWipe = () => {
    AudioService.playUiClick();
    StorageService.clearSave();
    onReloadSave();
    setConfirmResetSave(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
    >
      <div className="w-full max-w-xl rounded-3xl bg-[#0c121d] border border-slate-700/60 p-6 sm:p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-base font-serif font-bold tracking-wider text-slate-100 uppercase">
                Game Settings
              </h2>
              <div className="text-[10px] font-mono text-slate-400">
                Live Engine Configuration & Persistence
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              AudioService.playUiClick();
              onClose();
            }}
            aria-label="Close settings"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-slate-950 border border-slate-800 mb-5 text-center">
          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('graphics');
            }}
            className={`py-2 rounded-xl text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'graphics'
                ? 'bg-emerald-600 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Graphics
          </button>
          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('camera');
            }}
            className={`py-2 rounded-xl text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-emerald-600 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Camera
          </button>
          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('audio');
            }}
            className={`py-2 rounded-xl text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'audio'
                ? 'bg-emerald-600 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Audio
          </button>
          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('hud');
            }}
            className={`py-2 rounded-xl text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'hud'
                ? 'bg-emerald-600 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            HUD/Touch
          </button>
          <button
            onClick={() => {
              AudioService.playUiClick();
              setActiveTab('save');
            }}
            className={`py-2 rounded-xl text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'save'
                ? 'bg-emerald-600 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Data
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5">
          {/* TAB: GRAPHICS */}
          {activeTab === 'graphics' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono uppercase text-slate-300 block mb-2">
                  Rendering Quality
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        AudioService.playUiClick();
                        updateSetting('graphicsQuality', q);
                        updateSetting('particleLimit', q === 'low' ? 250 : q === 'medium' ? 600 : 1200);
                        updateSetting('shadows', q !== 'low');
                      }}
                      className={`p-3 rounded-xl border text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                        settings.graphicsQuality === q
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Shadows */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Dynamic Shadows</div>
                  <div className="text-[10px] text-slate-400 font-light">
                    Real-time directional shadow mapping for sun and moon
                  </div>
                </div>
                <button
                  onClick={() => {
                    AudioService.playUiClick();
                    updateSetting('shadows', !settings.shadows);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                    settings.shadows
                      ? 'bg-emerald-600 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.shadows ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* Particle Density */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Aether Particle Limit</span>
                  <span className="text-emerald-400 font-bold">{settings.particleLimit || 600}</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="1200"
                  step="50"
                  value={settings.particleLimit || 600}
                  onChange={(e) => updateSetting('particleLimit', parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB: CAMERA */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono uppercase text-slate-300 block mb-2">
                  Perspective Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { mode: 'THIRD_PERSON', label: 'Third Person' },
                    { mode: 'FIRST_PERSON', label: 'First Person' },
                    { mode: 'SECOND_PERSON', label: 'Observer' },
                  ].map((cam) => (
                    <button
                      key={cam.mode}
                      onClick={() => {
                        AudioService.playUiClick();
                        updateSetting('cameraMode', cam.mode as CameraMode);
                      }}
                      className={`p-3 rounded-xl border text-xs font-mono tracking-wider transition-all cursor-pointer ${
                        settings.cameraMode === cam.mode
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cam.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Sensitivity Slider */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Look Sensitivity</span>
                  <span className="text-emerald-400 font-bold">
                    {(settings.cameraSensitivity || 1.0).toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.1"
                  value={settings.cameraSensitivity || 1.0}
                  onChange={(e) => updateSetting('cameraSensitivity', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Camera Distance Slider */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Orbit Distance</span>
                  <span className="text-emerald-400 font-bold">
                    {(settings.cameraDistance || 7.5).toFixed(1)}m
                  </span>
                </div>
                <input
                  type="range"
                  min="3.0"
                  max="12.0"
                  step="0.5"
                  value={settings.cameraDistance || 7.5}
                  onChange={(e) => updateSetting('cameraDistance', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Invert Pitch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs font-semibold text-slate-200">Invert Y-Axis (Pitch)</span>
                <button
                  onClick={() => {
                    AudioService.playUiClick();
                    updateSetting('invertY', !settings.invertY);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                    settings.invertY ? 'bg-emerald-600 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.invertY ? 'INVERTED' : 'STANDARD'}
                </button>
              </div>
            </div>
          )}

          {/* TAB: AUDIO */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              {/* Sound toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2">
                  {settings.soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-xs font-semibold text-slate-200">Synthesizer Master State</span>
                </div>
                <button
                  onClick={() => {
                    AudioService.playUiClick();
                    updateSetting('soundEnabled', !settings.soundEnabled);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                    settings.soundEnabled ? 'bg-emerald-600 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.soundEnabled ? 'ACTIVE' : 'MUTED'}
                </button>
              </div>

              {/* Master Volume */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Master Output</span>
                  <span className="text-emerald-400 font-bold">
                    {Math.round((settings.masterVolume ?? 0.7) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume ?? 0.7}
                  onChange={(e) => updateSetting('masterVolume', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Sound Effects Volume */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Sound Effects (SFX)</span>
                  <span className="text-emerald-400 font-bold">
                    {Math.round((settings.sfxVolume ?? 0.8) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume ?? 0.8}
                  onChange={(e) => updateSetting('sfxVolume', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Ambience & Music Volume */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Archipelago Ambience & Drones</span>
                  <span className="text-emerald-400 font-bold">
                    {Math.round((settings.musicVolume ?? 0.7) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume ?? 0.7}
                  onChange={(e) => updateSetting('musicVolume', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB: HUD & MOBILE CONTROLS */}
          {activeTab === 'hud' && (
            <div className="space-y-4">
              {/* HUD Visibility Mode */}
              <div>
                <label className="text-xs font-mono uppercase text-slate-300 block mb-2">
                  HUD Perimeter Density
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['full', 'compact', 'minimal', 'hidden'] as const).map((vis) => (
                    <button
                      key={vis}
                      onClick={() => {
                        AudioService.playUiClick();
                        updateSetting('hudVisibility', vis);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                        (settings.hudVisibility || 'full') === vis
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {vis}
                    </button>
                  ))}
                </div>
              </div>

              {/* Force Virtual Touch Controls */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Virtual Touch Screen Controls</div>
                  <div className="text-[10px] text-slate-400 font-light">
                    Displays onscreen joystick and action pads on touch devices
                  </div>
                </div>
                <button
                  onClick={() => {
                    AudioService.playUiClick();
                    updateSetting('touchControls', !settings.touchControls);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                    settings.touchControls ? 'bg-emerald-600 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.touchControls ? 'ALWAYS ON' : 'AUTO-DETECT'}
                </button>
              </div>

              {/* Touch Button Size */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Touch Button Target Size</div>
                  <div className="text-[10px] text-slate-400 font-light">
                    Scale action pad buttons for enhanced thumb reach
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {(['normal', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        AudioService.playUiClick();
                        updateSetting('mobileButtonSize', size);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase font-bold transition-colors cursor-pointer ${
                        (settings.mobileButtonSize || 'normal') === size
                          ? 'bg-emerald-600 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Haptics */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Haptic Vibration Feedback</div>
                  <div className="text-[10px] text-slate-400 font-light">
                    Micro-vibrations upon jump, strike, and interaction triggers
                  </div>
                </div>
                <button
                  onClick={() => {
                    AudioService.playUiClick();
                    updateSetting('mobileHaptics', !settings.mobileHaptics);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                    settings.mobileHaptics ? 'bg-emerald-600 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.mobileHaptics ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>
          )}

          {/* TAB: DATA & RESETS */}
          {activeTab === 'save' && (
            <div className="space-y-4">
              {/* Reset to defaults notice */}
              {resetSettingsNotice && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs font-mono text-emerald-300">
                  {resetSettingsNotice}
                </div>
              )}

              {/* Reset settings button */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Reset Settings to Defaults</div>
                  <div className="text-[10px] text-slate-400 font-light">
                    Restores graphics, audio, and camera to factory recommendations
                  </div>
                </div>
                <button
                  onClick={handleResetSettingsToDefaults}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
              </div>

              {/* Backup / Export */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-200">Export Save Backup (JSON)</div>
                <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                  Download a complete snapshot of your explorer profile, relics, and quests.
                </p>
                <button
                  onClick={handleExport}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Save File</span>
                </button>
                {exportNotice && (
                  <div className="text-[11px] font-mono text-emerald-400 text-center">
                    {exportNotice}
                  </div>
                )}
              </div>

              {/* Import */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-200">Import Save Snapshot</div>
                <label className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors cursor-pointer flex items-center justify-center gap-2">
                  <Upload className="w-3.5 h-3.5 text-purple-400" />
                  <span>Choose JSON File</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
                {importNotice && (
                  <div
                    className={`text-[11px] font-mono text-center ${
                      importNotice.isError ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {importNotice.text}
                  </div>
                )}
              </div>

              {/* Reset Expedition Progress with safety modal */}
              <div className="pt-2 border-t border-slate-800">
                {confirmResetSave ? (
                  <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-300">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span>Erase Expedition Progress?</span>
                    </div>
                    <p className="text-[11px] text-red-200/80 font-light leading-relaxed">
                      This will reset all world progress, unlocked waystones, and inventory to Day 1. This action cannot be reversed.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExecuteSaveWipe}
                        className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Yes, Erase Save
                      </button>
                      <button
                        onClick={() => setConfirmResetSave(false)}
                        className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmResetSave(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-red-950/30 hover:bg-red-950/60 border border-red-900/40 text-red-400 hover:text-red-300 text-xs font-mono transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset Expedition Progress...</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
