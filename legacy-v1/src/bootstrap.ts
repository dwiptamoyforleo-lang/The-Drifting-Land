/**
 * Section 2 Integration Contract & Bootstrap Orchestrator for The Drifting Land.
 * - Warms module cache at page load without mutating the loader DOM.
 * - Unlocks WebAudio synchronously inside the Begin Journey user gesture.
 * - Requests mobile fullscreen only when explicitly enabled in user settings.
 * - Hides and marks loader elements inert once #game-root is fully opaque.
 * - Handles clean reload when returning to the loading screen.
 */

import { AudioService } from './services/audio';
import { isMobileUserAgent } from './services/storage';

export interface WarmupStatus {
  status: 'idle' | 'warming' | 'ready' | 'error';
  errorMessage: string | null;
}

let warmupPromise: Promise<WarmupStatus> | null = null;
let warmupStatus: WarmupStatus = { status: 'idle', errorMessage: null };

export const LOADER_SKY_COLOR = '#1b3a6b';
export const GAME_ROOT_FADE_MS = 900;

/**
 * Start dynamic import() cache-warming of Three.js and the core engine
 * while the loading screen is counting. Never renders or mutates the loader DOM.
 */
export function warmGameModules(forceRetry = false): Promise<WarmupStatus> {
  if (warmupPromise && !forceRetry && warmupStatus.status !== 'error') {
    return warmupPromise;
  }

  warmupStatus = { status: 'warming', errorMessage: null };
  warmupPromise = Promise.all([
    import('three'),
    import('./engine/gameLoop'),
  ])
    .then(() => {
      warmupStatus = { status: 'ready', errorMessage: null };
      return warmupStatus;
    })
    .catch((err: unknown) => {
      const msg =
        err instanceof Error && err.message
          ? `Unable to load game modules: ${err.message}`
          : 'Unable to load game modules. Check your connection and retry.';
      warmupStatus = { status: 'error', errorMessage: msg };
      return warmupStatus;
    });

  return warmupPromise;
}

export function getWarmupStatus(): WarmupStatus {
  return warmupStatus;
}

/**
 * Unlock WebAudio immediately inside the Begin Journey user gesture.
 */
export function unlockWebAudioOnGesture(soundEnabled: boolean): void {
  AudioService.init();
  AudioService.setMuted(!soundEnabled);
  AudioService.resume();
}

/**
 * Request fullscreen on mobile browsers ONLY if the user's setting allows.
 */
export function maybeRequestMobileFullscreen(allowFullscreen: boolean): void {
  if (!allowFullscreen || !isMobileUserAgent()) return;
  if (typeof document === 'undefined') return;
  if (document.fullscreenElement) return;

  const rootEl = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  try {
    const req = rootEl.requestFullscreen || rootEl.webkitRequestFullscreen;
    if (typeof req === 'function') {
      const result = req.call(rootEl);
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(() => {
          // Ignore browser gesture/policy denials cleanly
        });
      }
    }
  } catch {
    // Fullscreen is strictly optional
  }
}

function hideAndInertElement(el: Element | null | undefined): void {
  if (!el) return;
  if (el instanceof HTMLElement) {
    el.style.display = 'none';
  }
  el.setAttribute('inert', '');
  el.setAttribute('aria-hidden', 'true');
  if ('inert' in el) {
    (el as HTMLElement & { inert: boolean }).inert = true;
  }
}

/**
 * Once #game-root is fully opaque, hide the loader's elements (#scene, #stage, .mote)
 * and the loader host itself with inline display:none and mark them inert.
 * Runs entirely from external game code without editing the loader file.
 */
export function hideAndInertLoader(
  loaderHost: HTMLElement | null,
  loaderFrame: HTMLIFrameElement | null
): void {
  try {
    const doc = loaderFrame?.contentDocument;
    if (doc) {
      hideAndInertElement(doc.getElementById('scene'));
      hideAndInertElement(doc.getElementById('stage'));
      doc.querySelectorAll('.mote').forEach((mote) => hideAndInertElement(mote));
    }
  } catch {
    // Cross-origin access guard if ever served differently
  }

  // Also check top-level document in case loader nodes exist directly
  hideAndInertElement(document.getElementById('scene'));
  hideAndInertElement(document.getElementById('stage'));
  document.querySelectorAll('.mote').forEach((mote) => hideAndInertElement(mote));
  hideAndInertElement(loaderHost);
}

/**
 * Return to the loading screen strictly by reloading the page after saving.
 */
export function reloadToLoadingScreen(beforeReload?: () => void): void {
  try {
    beforeReload?.();
  } finally {
    window.location.reload();
  }
}
