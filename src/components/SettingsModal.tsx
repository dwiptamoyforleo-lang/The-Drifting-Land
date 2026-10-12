/**
 * Settings & Graphics Modal with Camera Mode Selector and Control Customization
 */
import React, { useState } from 'react';
import { X, Sliders, Volume2, VolumeX } from 'lucide-react';
import { GameSettings, GraphicsQuality, CameraMode } from '../game/types';
import { soundSystem } from '../game/audio';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onClose: () => void;
  onResetProgress: () => void;
  onReturnToTitle?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onResetProgress,
  onReturnToTitle,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const setQuality = (q: GraphicsQuality) => {
    onUpdateSettings({ ...settings, graphicsQuality: q });
  };

  const setCameraMode = (mode: CameraMode) => {
    onUpdateSettings({ ...settings, cameraMode: mode });
  };

  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdateSettings({ ...settings, sensitivity: val });
  };

  const toggleAudio = () => {
    const next = !settings.audioEnabled;
    soundSystem.setMuted(!next);
    onUpdateSettings({ ...settings, audioEnabled: next });
  };

  const handleAmbientVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    soundSystem.setAmbientVolume(val);
    onUpdateSettings({ ...settings, ambientVolume: val });
  };

  const handleSfxVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    soundSystem.setSfxVolume(val);
    onUpdateSettings({ ...settings, sfxVolume: val });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none overflow-y-auto font-['Share_Tech_Mono',monospace]">
      <div className="max-w-lg w-full bg-gradient-to-b from-slate-900 via-[#0a121e] to-slate-900 border border-teal-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-200 relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 transition-colors"
          aria-label="Close Settings"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-['Cinzel'] text-xl font-bold tracking-wider text-teal-200">
              Settings & Controls
            </h2>
            <p className="text-xs text-slate-400">Configure camera perspectives, sensitivity, and audio</p>
          </div>
        </div>

        <div className="space-y-6 text-sm">
          {/* Camera Perspective Mode */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2.5">
              Camera Perspective Mode (Shortcut: V)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'third_person' as CameraMode, label: 'Third-Person', sub: 'Orbital Follow' },
                { id: 'first_person' as CameraMode, label: 'First-Person', sub: 'Visor Direct' },
                { id: 'second_person' as CameraMode, label: 'Observer View', sub: 'Experimental' },
              ].map((c) => {
                const isActive = (settings.cameraMode || 'third_person') === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCameraMode(c.id)}
                    className={`py-2.5 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      isActive
                        ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="text-xs font-bold">{c.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{c.sub}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 italic">
              * Second-Person Observer View uses a nearby observer or frontal fallback angle while retaining full movement control.
            </p>
          </div>

          {/* Graphics Quality */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2.5">
              Graphics Quality Preset
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['low', 'balanced', 'high'] as GraphicsQuality[]).map((mode) => {
                const isActive = settings.graphicsQuality === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setQuality(mode)}
                    className={`py-3 px-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      isActive
                        ? 'bg-teal-950/70 border-teal-400 text-teal-200 shadow-[0_0_15px_rgba(20,184,166,0.25)]'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">{mode}</span>
                    <span className="text-[10px] text-slate-400">
                      {mode === 'low' && 'Max FPS'}
                      {mode === 'balanced' && 'Recommended'}
                      {mode === 'high' && 'Full Details'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Camera Look Sensitivity */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="uppercase tracking-wider text-slate-400 font-semibold">Camera Sensitivity</span>
              <span className="text-teal-300 font-mono">{settings.sensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={settings.sensitivity}
              onChange={handleSensitivityChange}
              className="w-full accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Touch Controls Customization */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                Joystick Size
              </label>
              <div className="flex gap-1">
                {(['small', 'medium', 'large'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => onUpdateSettings({ ...settings, joystickSize: sz })}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] uppercase font-mono border ${
                      (settings.joystickSize || 'medium') === sz
                        ? 'bg-cyan-950 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                Button Opacity
              </label>
              <input
                type="range"
                min="0.4"
                max="1.0"
                step="0.1"
                value={settings.buttonOpacity ?? 0.85}
                onChange={(e) => onUpdateSettings({ ...settings, buttonOpacity: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer mt-1"
              />
            </div>
          </div>

          {/* Audio Controls */}
          <div className="space-y-3 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                {settings.audioEnabled ? <Volume2 className="w-4 h-4 text-teal-300" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                <span>Master Sound</span>
              </div>
              <button
                onClick={toggleAudio}
                className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
                  settings.audioEnabled
                    ? 'bg-teal-950/60 border-teal-500/40 text-teal-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {settings.audioEnabled ? 'Enabled' : 'Muted'}
              </button>
            </div>
            {settings.audioEnabled && (
              <>
                <div>
                  <div className="flex justify-between text-xs mb-1 text-slate-400">
                    <span>Ocean & Wind Ambience</span>
                    <span className="font-mono text-teal-300">{Math.round(settings.ambientVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.ambientVolume}
                    onChange={handleAmbientVolume}
                    className="w-full accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1 text-slate-400">
                    <span>Crystals & Effects</span>
                    <span className="font-mono text-teal-300">{Math.round(settings.sfxVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.sfxVolume}
                    onChange={handleSfxVolume}
                    className="w-full accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-slate-800/80 flex flex-col gap-2.5">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-medium text-sm tracking-wider uppercase shadow-md shadow-teal-900/30 cursor-pointer"
          >
            Resume Exploration
          </button>
          {onReturnToTitle && (
            <button
              onClick={onReturnToTitle}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs tracking-wider uppercase border border-slate-700/60 cursor-pointer"
            >
              Return to Title Screen
            </button>
          )}
          {!showConfirmReset ? (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="w-full py-2 px-3 text-slate-500 hover:text-rose-400 text-xs transition-colors cursor-pointer text-center"
            >
              Reset World Progress
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/50 text-center">
              <p className="text-xs text-rose-300 mb-2">Reset all anchors and fragments?</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    onResetProgress();
                    setShowConfirmReset(false);
                    onClose();
                  }}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                >
                  Confirm Reset
                </button>
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
