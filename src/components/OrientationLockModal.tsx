/**
 * Orientation Lock Gate for The Drifting Land
 * Displays a mandatory screen asking users to rotate their device to landscape
 * before the game loads or starts.
 */
import React, { useEffect, useState } from 'react';
import { Smartphone, RotateCw, CheckCircle2 } from 'lucide-react';

interface OrientationLockModalProps {
  onDismissOverride?: () => void;
}

export const OrientationLockModal: React.FC<OrientationLockModalProps> = ({
  onDismissOverride,
}) => {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    return window.innerHeight > window.innerWidth;
  });

  const [forceBypass, setForceBypass] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // In portrait if height exceeds width
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait || forceBypass) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-[#070b14] text-slate-100 select-none overflow-hidden font-['Share_Tech_Mono',monospace]">
      {/* Background ambient sci-fi glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none" />

      <div className="relative z-10 max-w-sm w-full bg-slate-950/90 border border-cyan-400/40 rounded-3xl p-7 text-center shadow-2xl backdrop-blur-xl">
        {/* Animated Rotating Phone Device Icon */}
        <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-ping" />
          <div className="relative p-4 rounded-2xl bg-cyan-950/60 border border-cyan-400/50 text-cyan-300 shadow-[0_0_24px_rgba(6,182,212,0.5)]">
            <Smartphone className="w-10 h-10 animate-[bounce_2s_infinite]" />
          </div>
          <RotateCw className="absolute -bottom-1 -right-1 w-6 h-6 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
        </div>

        {/* Header */}
        <div className="text-[10px] tracking-[0.25em] text-cyan-400 uppercase mb-1">
          SYSTEM ORIENTATION LOCK
        </div>
        <h2 className="font-['Cinzel'] text-2xl font-bold text-white tracking-widest mb-3">
          PLEASE ROTATE YOUR DEVICE
        </h2>

        <p className="text-xs text-slate-300 leading-relaxed font-sans mb-6">
          <strong className="text-cyan-300">The Drifting Land</strong> requires <b>Landscape Mode</b> to render wide telemetry, third-person panoramic flight corridors, and telemetry dials.
        </p>

        {/* Rotate Indicator */}
        <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-amber-300 mb-6">
          <RotateCw className="w-3.5 h-3.5 animate-spin" />
          <span>Turn phone horizontally to unlock</span>
        </div>

        {/* Bypass / Desktop Override button */}
        <button
          onClick={() => {
            setForceBypass(true);
            if (onDismissOverride) onDismissOverride();
          }}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-300 hover:text-white text-xs font-mono uppercase tracking-wider border border-slate-700 transition-all cursor-pointer"
        >
          Proceed in Current Aspect
        </button>
      </div>
    </div>
  );
};
