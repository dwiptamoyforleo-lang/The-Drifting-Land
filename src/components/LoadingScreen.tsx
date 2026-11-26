import React, { useEffect, useRef } from 'react';

interface LoadingScreenProps {
  initPhase: string;
  progressPercent: number;
  ready: boolean;
  hasExistingSave: boolean;
  soundEnabled: boolean;
  onBegin: () => void;
  onOpenSettings: () => void;
  onOpenSaveSlots: () => void;
  onToggleSound: () => void;
  onRetry: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  initPhase, progressPercent, ready, hasExistingSave, soundEnabled,
  onBegin, onOpenSettings, onOpenSaveSlots, onToggleSound, onRetry,
}) => {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const syncFrame = () => {
    const frame = frameRef.current;
    if (!frame?.contentWindow) return;
    const targetOrigin = window.location.origin;
    frame.contentWindow.postMessage({
      type: ready ? 'drifting-land:ready' : 'drifting-land:progress',
      progress: progressPercent,
      phase: initPhase,
      label: ready ? 'Ready' : 'Preparing the skies',
    }, targetOrigin);
    frame.contentWindow.postMessage({ type: 'drifting-land:sound', enabled: soundEnabled }, targetOrigin);
    frame.contentWindow.postMessage({ type: 'drifting-land:save-state', ready }, targetOrigin);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      switch (event.data?.type) {
        case 'drifting-land:begin':
          if (ready) onBegin();
          break;
        case 'drifting-land:settings': onOpenSettings(); break;
        case 'drifting-land:save-slots':
          if (ready) onOpenSaveSlots();
          break;
        case 'drifting-land:toggle-sound': onToggleSound(); break;
        case 'drifting-land:retry': onRetry(); break;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [ready, onBegin, onOpenSettings, onOpenSaveSlots, onToggleSound, onRetry]);

  useEffect(syncFrame, [initPhase, progressPercent, ready, soundEnabled]);

  return (
    <iframe
      ref={frameRef}
      title="The Drifting Land loading screen"
      src="./loading-screen.html"
      onLoad={syncFrame}
      className="fixed inset-0 z-50 h-full w-full border-0"
      allow="autoplay"
      aria-label={hasExistingSave ? 'Continue your journey or manage game settings' : 'Begin your journey or manage game settings'}
    />
  );
};
