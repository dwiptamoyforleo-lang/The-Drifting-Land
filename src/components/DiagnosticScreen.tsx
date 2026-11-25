/**
 * Startup Diagnostic & WebGL Recovery Screen for The Drifting Land.
 * Displays detailed hardware/WebGL capability info, per-attempt errors,
 * Android Chrome troubleshooting tips, Copy Diagnostics, Reload, and Retry actions.
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Cpu,
  Layers,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';
import { WebGLDiagnosticReport } from '../types/game';

interface DiagnosticScreenProps {
  errorMessage: string;
  diagnosticReport?: WebGLDiagnosticReport | null;
  onRetry: () => void;
  onResetSaveAndRetry?: () => void;
  onReloadPage?: () => void;
}

export const DiagnosticScreen: React.FC<DiagnosticScreenProps> = ({
  errorMessage,
  diagnosticReport,
  onRetry,
  onResetSaveAndRetry,
  onReloadPage,
}) => {
  const [copied, setCopied] = useState(false);

  const buildCopyText = (): string => {
    if (!diagnosticReport) {
      return `The Drifting Land - Engine Error\nMessage: ${errorMessage}\nUserAgent: ${
        typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
      }\nDPR: ${typeof window !== 'undefined' ? window.devicePixelRatio : 1}`;
    }

    const attemptsText = diagnosticReport.attempts.length
      ? diagnosticReport.attempts
          .map(
            (a) =>
              `  #${a.attempt} [${a.label}]: ${a.success ? 'OK' : `FAILED -> ${a.error || 'Unknown'}`}`
          )
          .join('\n')
      : '  (No fallback attempts recorded)';

    return [
      '=== The Drifting Land WebGL Diagnostics ===',
      `Timestamp: ${diagnosticReport.timestamp}`,
      `Summary: ${diagnosticReport.summary}`,
      `WebGL2 Available: ${diagnosticReport.webgl2Available ? 'Yes' : 'No'}`,
      `WebGL1 Available: ${diagnosticReport.webgl1Available ? 'Yes' : 'No'}`,
      `GPU Renderer: ${diagnosticReport.gpuRenderer}`,
      `GPU Vendor: ${diagnosticReport.gpuVendor}`,
      `Software Renderer: ${diagnosticReport.isSoftwareGl ? 'Yes' : 'No'}`,
      `Mobile UA: ${diagnosticReport.isMobile ? 'Yes' : 'No'}`,
      `DPR: ${diagnosticReport.devicePixelRatio}`,
      `Screen: ${diagnosticReport.screenSize} | Viewport: ${diagnosticReport.viewportSize}`,
      diagnosticReport.contextCreationError
        ? `Context Creation Event: ${diagnosticReport.contextCreationError}`
        : '',
      `User Agent: ${diagnosticReport.userAgent}`,
      'Initialization Attempts:',
      attemptsText,
    ]
      .filter(Boolean)
      .join('\n');
  };

  const handleCopyDiagnostics = async () => {
    const text = buildCopyText();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard failure silently
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0a0e14] text-slate-100 overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl bg-[#0f172a] border border-red-900/60 p-5 sm:p-7 shadow-2xl flex flex-col items-center text-center my-auto max-h-[94vh] overflow-y-auto">
        <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-700/50 flex items-center justify-center mb-3 text-red-400 shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h1 className="text-lg sm:text-xl font-serif font-black tracking-widest text-slate-100 uppercase mb-1">
          ENGINE INITIALIZATION NOTICE
        </h1>

        <p className="text-[11px] font-mono text-slate-400 tracking-wider mb-4">
          The Drifting Land · Hardware &amp; Browser Diagnostics
        </p>

        {/* Primary error summary */}
        <div className="w-full bg-slate-950/90 rounded-2xl p-3.5 border border-slate-800 text-left font-mono text-xs text-red-300 leading-relaxed mb-4">
          <div>{diagnosticReport?.summary || errorMessage}</div>
          {diagnosticReport?.contextCreationError && (
            <div className="mt-1.5 text-[11px] text-amber-300">
              Driver status: {diagnosticReport.contextCreationError}
            </div>
          )}
        </div>

        {/* Technical Telemetry Grid */}
        {diagnosticReport && (
          <div className="w-full bg-slate-950/70 rounded-2xl p-3.5 border border-slate-800/90 text-left font-mono text-[11px] space-y-2 mb-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
                Detected Environment
              </span>
              <button
                onClick={handleCopyDiagnostics}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Diagnostics'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
              <div className="text-slate-400">
                WebGL2:{' '}
                <span className={diagnosticReport.webgl2Available ? 'text-emerald-400' : 'text-rose-400'}>
                  {diagnosticReport.webgl2Available ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <div className="text-slate-400">
                WebGL1:{' '}
                <span className={diagnosticReport.webgl1Available ? 'text-emerald-400' : 'text-rose-400'}>
                  {diagnosticReport.webgl1Available ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <div className="text-slate-400">
                Software GL:{' '}
                <span className={diagnosticReport.isSoftwareGl ? 'text-amber-300' : 'text-slate-200'}>
                  {diagnosticReport.isSoftwareGl ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="text-slate-400">
                DPR / Screen:{' '}
                <span className="text-slate-200">
                  {diagnosticReport.devicePixelRatio}x · {diagnosticReport.screenSize}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 break-words">
              GPU Renderer: <span className="text-slate-200">{diagnosticReport.gpuRenderer}</span>
            </div>

            <div className="text-[10px] text-slate-500 break-all">
              UA: {diagnosticReport.userAgent}
            </div>

            {diagnosticReport.attempts.length > 0 && (
              <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
                <div className="text-[10px] text-slate-300 font-semibold uppercase">
                  Startup Attempts:
                </div>
                {diagnosticReport.attempts.map((a) => (
                  <div key={a.attempt} className="text-[10px] text-slate-400 leading-snug">
                    <span className="text-slate-300">#{a.attempt} {a.label}:</span>{' '}
                    <span className={a.success ? 'text-emerald-400' : 'text-rose-300'}>
                      {a.error || 'OK'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mobile Chrome Troubleshooting Tips */}
        <div className="w-full bg-slate-900/50 rounded-2xl p-3.5 border border-slate-800/80 text-left text-[11px] text-slate-300 leading-relaxed mb-5 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
            <Cpu className="w-4 h-4 shrink-0" />
            <span>Troubleshooting on Android Chrome</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
            <li>Close other browser tabs and background apps, then reload this page.</li>
            <li>Turn off <strong className="text-slate-200">Battery Saver</strong> and <strong className="text-slate-200">Data Saver / Lite mode</strong>.</li>
            <li>Check that <strong className="text-slate-200">Hardware Acceleration</strong> is enabled in browser/device settings.</li>
            <li>Fully close and reopen Chrome (Android Chrome can block WebGL for the rest of a session after a GPU crash).</li>
            <li>If Chrome still blocks WebGL, try opening the page in Firefox or Samsung Internet.</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
          <button
            onClick={onRetry}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Startup</span>
          </button>

          <button
            onClick={onReloadPage || (() => window.location.reload())}
            className="py-2.5 px-4 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/70 border border-cyan-600/50 text-cyan-200 font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reload Page</span>
          </button>

          {onResetSaveAndRetry && (
            <button
              onClick={onResetSaveAndRetry}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Clean Save &amp; Retry</span>
            </button>
          )}
        </div>

        {!diagnosticReport && (
          <button
            onClick={handleCopyDiagnostics}
            className="mt-3 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Diagnostics Copied!' : 'Copy Diagnostics'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
