import React, { useEffect, useRef } from 'react';

interface LoadingScreenProps {
  initPhase: string;
  progressPercent: number;
  ready: boolean;
  hasExistingSave: boolean;
  soundEnabled: boolean;
  hiddenAndInert?: boolean;
  onBegin: () => void;
  onOpenSettings: () => void;
  onOpenSaveSlots: () => void;
  onToggleSound: () => void;
  onRetry: () => void;
  onLoaderNodesReady?: (host: HTMLDivElement | null, frame: HTMLIFrameElement | null) => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  initPhase,
  progressPercent,
  ready,
  hasExistingSave,
  soundEnabled,
  hiddenAndInert = false,
  onBegin,
  onOpenSettings,
  onOpenSaveSlots,
  onToggleSound,
  onRetry,
  onLoaderNodesReady,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const startedRef = useRef<boolean>(false);

  const syncFrame = () => {
    const frame = frameRef.current;
    if (!frame?.contentWindow) return;
    const targetOrigin = window.location.origin;
    frame.contentWindow.postMessage(
      {
        type: ready ? 'drifting-land:ready' : 'drifting-land:progress',
        progress: progressPercent,
        phase: initPhase,
        label: ready ? 'Ready' : 'Preparing the skies',
      },
      targetOrigin
    );
    frame.contentWindow.postMessage(
      { type: 'drifting-land:sound', enabled: soundEnabled },
      targetOrigin
    );
    frame.contentWindow.postMessage(
      { type: 'drifting-land:save-state', ready },
      targetOrigin
    );
  };

  useEffect(() => {
    onLoaderNodesReady?.(hostRef.current, frameRef.current);
  }, [onLoaderNodesReady]);

  useEffect(() => {
    const triggerBeginOnce = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      onBegin();
    };

    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow
      ) {
        return;
      }
      switch (event.data?.type) {
        case 'drifting-land:begin':
          triggerBeginOnce();
          break;
        case 'drifting-land:settings':
          onOpenSettings();
          break;
        case 'drifting-land:save-slots':
          if (ready) onOpenSaveSlots();
          break;
        case 'drifting-land:toggle-sound':
          onToggleSound();
          break;
        case 'drifting-land:retry':
          startedRef.current = false;
          onRetry();
          break;
      }
    };

    const handleCustomBegin = () => {
      triggerBeginOnce();
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('drifting-land:begin', handleCustomBegin);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('drifting-land:begin', handleCustomBegin);
    };
  }, [ready, onBegin, onOpenSettings, onOpenSaveSlots, onToggleSound, onRetry]);

  useEffect(syncFrame, [initPhase, progressPercent, ready, soundEnabled]);

  return (
    <div
      id="loader-host"
      ref={hostRef}
      style={hiddenAndInert ? { display: 'none' } : undefined}
      aria-hidden={hiddenAndInert ? true : undefined}
      className="fixed inset-0 z-50 h-full w-full"
    >
      <iframe
        ref={frameRef}
        title="The Drifting Land loading screen"
        src="./loading-screen.html"
        onLoad={() => {
          onLoaderNodesReady?.(hostRef.current, frameRef.current);
          syncFrame();
        }}
        className="h-full w-full border-0 block"
        allow="autoplay"
        aria-label={
          hasExistingSave
            ? 'Continue your journey or manage game settings'
            : 'Begin your journey or manage game settings'
        }
      />
    </div>
  );
};
