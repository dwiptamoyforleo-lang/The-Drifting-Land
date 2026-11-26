/**
 * @fileoverview Fixed-timestep 60 Hz simulation loop with GPU rAF and software-WebGL afterDraw pacing.
 */

export const FIXED_DT = 1 / 60;

export class GameLoop {
  /**
   * @param {{
   *   fixedUpdate: (dt: number) => void,
   *   renderFrame: (alpha: number, frameDt: number) => void,
   *   renderer: import('three').WebGLRenderer,
   *   isSoftwareGl: boolean
   * }} options
   */
  constructor({ fixedUpdate, renderFrame, renderer, isSoftwareGl }) {
    this.fixedUpdate = fixedUpdate;
    this.renderFrame = renderFrame;
    this.renderer = renderer;
    this.isSoftwareGl = isSoftwareGl;
    this.running = false;
    this._rafId = 0;
    this._timerId = 0;
    this._lastMs = 0;
    this._accumulator = 0;
    this._boundTick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._lastMs = performance.now();
    this._accumulator = 0;
    this._rafId = window.requestAnimationFrame(this._boundTick);
  }

  stop() {
    this.running = false;
    if (this._rafId) {
      window.cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
    if (this._timerId) {
      window.clearTimeout(this._timerId);
      this._timerId = 0;
    }
  }

  /**
   * Pace next frame cleanly on software WebGL via fenceSync + 80ms cooldown.
   * @param {() => void} cb
   */
  _afterDraw(cb) {
    const gl = /** @type {WebGL2RenderingContext | null} */ (this.renderer.getContext());
    if (!gl || typeof gl.fenceSync !== 'function') {
      this._timerId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (!this.running) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this._timerId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this._timerId = window.setTimeout(cb, 80);
      }
    };
    this._timerId = window.setTimeout(poll, 5);
  }

  _tick() {
    if (!this.running) return;

    const nowMs = performance.now();
    const rawDt = Math.min(0.1, Math.max(0, (nowMs - this._lastMs) / 1000));
    this._lastMs = nowMs;
    this._accumulator += rawDt;

    let steps = 0;
    while (this._accumulator >= FIXED_DT && steps < 5) {
      this.fixedUpdate(FIXED_DT);
      this._accumulator -= FIXED_DT;
      steps++;
    }
    if (steps === 5) {
      this._accumulator = 0;
    }

    this.renderFrame(this._accumulator / FIXED_DT, rawDt);

    if (this.isSoftwareGl) {
      this._afterDraw(this._boundTick);
    } else {
      this._rafId = window.requestAnimationFrame(this._boundTick);
    }
  }
}
