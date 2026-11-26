import * as THREE from '../vendor/three.js';

const MAX_PITCH = Math.PI * 0.46;

/**
 * First-person camera controller supporting Pointer Lock, drag-look fallback, and touch look.
 */
export class FirstPersonCamera {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} canvasEl
   */
  constructor(camera, canvasEl) {
    this.camera = camera;
    this.canvasEl = canvasEl;
    this.yaw = 0;
    this.pitch = -0.05;
    this.sensitivity = 0.0022;
    this.pointerLocked = false;
    this._dragging = false;
    this._lastX = 0;
    this._lastY = 0;
    this.enabled = true;

    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onPointerLockChange = this._handlePointerLockChange.bind(this);
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseUp = () => { this._dragging = false; };

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    canvasEl.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  requestLock() {
    if (!this.enabled) return;
    if (document.pointerLockElement === this.canvasEl) return;
    if (typeof this.canvasEl.requestPointerLock === 'function') {
      try {
        const res = this.canvasEl.requestPointerLock();
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch {
        // Fallback to drag-look seamlessly inside restricted iframes
      }
    }
  }

  releaseLock() {
    if (document.pointerLockElement === this.canvasEl && document.exitPointerLock) {
      try {
        document.exitPointerLock();
      } catch {
        // Ignore
      }
    }
    this._dragging = false;
  }

  /**
   * Apply look delta from touch swipe or pointer movement.
   * @param {number} dx
   * @param {number} dy
   * @param {number} [scale=1]
   */
  applyLookDelta(dx, dy, scale = 1) {
    if (!this.enabled) return;
    this.yaw -= dx * this.sensitivity * scale;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - dy * this.sensitivity * scale,
      -MAX_PITCH,
      MAX_PITCH
    );
  }

  /**
   * @param {THREE.Vector3} eyePos
   */
  syncCamera(eyePos) {
    this.camera.position.copy(eyePos);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  /**
   * @param {number} yaw
   * @param {number} [pitch]
   */
  setAngles(yaw, pitch = -0.05) {
    this.yaw = yaw;
    this.pitch = THREE.MathUtils.clamp(pitch, -MAX_PITCH, MAX_PITCH);
  }

  _handlePointerLockChange() {
    this.pointerLocked = document.pointerLockElement === this.canvasEl;
  }

  _handleMouseDown(ev) {
    if (!this.enabled || ev.button !== 0) return;
    this._dragging = true;
    this._lastX = ev.clientX;
    this._lastY = ev.clientY;
    // Try pointer lock on desktop non-touch clicks
    if (window.matchMedia('(pointer: fine)').matches) {
      this.requestLock();
    }
  }

  _handleMouseMove(ev) {
    if (!this.enabled) return;
    if (this.pointerLocked) {
      this.applyLookDelta(ev.movementX || 0, ev.movementY || 0, 1);
    } else if (this._dragging) {
      const dx = ev.clientX - this._lastX;
      const dy = ev.clientY - this._lastY;
      this._lastX = ev.clientX;
      this._lastY = ev.clientY;
      this.applyLookDelta(dx, dy, 1.35);
    }
  }

  dispose() {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    this.canvasEl.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
  }
}
