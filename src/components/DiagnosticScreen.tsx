/**
 * Startup Diagnostic & WebGL Recovery Screen for The Drifting Land.
 * Provides actionable error messages and retry mechanisms rather than a blank screen.
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Cpu, Layers } from 'lucide-react';

interface DiagnosticScreenProps {
  errorMessage: string;
  onRetry: () => void;
  onResetSaveAndRetry?: () => void;
}

export const DiagnosticScreen: React.FC<DiagnosticScreenProps> = ({
  errorMessage,
  onRetry,
  onResetSaveAndRetry,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-[#0a0e14] text-slate-100">
      <div className="w-full max-w-lg rounded-3xl bg-[#0f172a] border border-red-900/60 p-8 shadow-2xl flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-700/50 flex items-center justify-center mb-5 text-red-400">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-serif font-black tracking-widest text-slate-100 uppercase mb-2">
          ENGINE INITIALIZATION NOTICE
        </h1>

        <p className="text-xs font-mono text-slate-400 tracking-wider mb-6">
          The Drifting Land · Hardware & Browser Diagnostics
        </p>

        <div className="w-full bg-slate-950/90 rounded-2xl p-4 border border-slate-800 text-left font-mono text-xs text-red-300 leading-relaxed mb-6 overflow-x-auto">
          <code>{errorMessage}</code>
        </div>

        <div className="w-full bg-slate-900/40 rounded-2xl p-4 border border-slate-800/80 text-left text-xs text-slate-400 leading-relaxed mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>WebGL Acceleration Required</span>
          </div>
          <p>
            Please ensure hardware acceleration is enabled in your browser settings and your graphics drivers are up to date.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onRetry}
            className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Startup</span>
          </button>

          {onResetSaveAndRetry && (
            <button
              onClick={onResetSaveAndRetry}
              className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Clean Save & Retry</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
