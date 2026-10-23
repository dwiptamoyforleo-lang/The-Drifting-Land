/**
 * GameCanvas Container.
 * Houses the WebGL canvas in a dedicated, isolated div.
 * React state changes in parent components do not re-render the WebGL canvas.
 * Forwards touch look (right half) and desktop pointer lock / drag to InputManager.
 */

import React, { useRef, useEffect } from 'react';
import { GameEngine } from '../engine/gameLoop';

interface GameCanvasProps {
  engineRef: React.MutableRefObject<GameEngine | null>;
  onContainerReady: (container: HTMLDivElement) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ engineRef, onContainerReady }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mountRef.current) {
      onContainerReady(mountRef.current);
    }
  }, [onContainerReady]);

  // Request pointer lock on click if desktop
  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;
    if (mountRef.current && engineRef.current?.getMode() === 'PLAYING') {
      engineRef.current.input.requestPointerLock(mountRef.current);
    }
  };

  // Pointer drag for mouse look
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;
    engineRef.current?.input.onPointerDown(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    engineRef.current?.input.onPointerMove(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    engineRef.current?.input.onPointerUp();
  };

  // Touch look on right half of screen (Android multitouch)
  const handleTouchStart = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      // Only capture touches on the right half of the screen
      if (touch.clientX > window.innerWidth * 0.45) {
        engineRef.current?.input.handleTouchLookStart(touch.clientX, touch.clientY, touch.identifier);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      engineRef.current?.input.handleTouchLookMove(touch.clientX, touch.clientY, touch.identifier);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      engineRef.current?.input.handleTouchLookEnd(touch.identifier);
    }
  };

  return (
    <div
      ref={mountRef}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none select-none overflow-hidden bg-[#0a0f16]"
      tabIndex={-1}
    />
  );
};
