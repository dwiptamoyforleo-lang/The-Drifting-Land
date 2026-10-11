import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Sliders, Monitor } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('The Drifting World encountered an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetGraphicsAndReload = () => {
    try {
      const savedSettings = localStorage.getItem('the_drifting_world_settings_v1');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      settings.graphicsQuality = 'low';
      localStorage.setItem('the_drifting_world_settings_v1', JSON.stringify(settings));
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isWebGL = this.state.error?.message?.toLowerCase().includes('webgl');

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#070b14] text-slate-100 select-none overflow-y-auto">
          <div className="max-w-lg w-full bg-slate-900/90 border border-teal-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-300">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>

            <h1 className="font-fantasy text-2xl sm:text-3xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-cyan-200 mb-2">
              {isWebGL ? 'WebGL Initialization Notice' : 'The Drifting World Exception'}
            </h1>

            <p className="text-sm text-slate-300/90 mb-6 leading-relaxed">
              {isWebGL
                ? 'Your browser or device encountered an issue initializing the 3D WebGL renderer. Hardware acceleration may be disabled or memory may be constrained.'
                : 'An unexpected exception halted the 3D world simulation.'}
            </p>

            {this.state.error && (
              <div className="mb-6 p-4 rounded-xl bg-black/50 border border-slate-800 text-left text-xs font-mono text-rose-300 overflow-x-auto max-h-36">
                <strong>Error: </strong> {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-medium text-sm tracking-wide transition-all shadow-lg shadow-teal-900/30 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Exploration</span>
              </button>

              <button
                onClick={this.handleResetGraphicsAndReload}
                className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-teal-300 border border-teal-500/30 font-medium text-sm tracking-wide transition-all cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
                <span>Switch to Low Graphics</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-4 border-t border-slate-800">
              <Monitor className="w-3.5 h-3.5 text-slate-400" />
              <span>Ensure &quot;Use hardware acceleration when available&quot; is enabled in your browser settings.</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
