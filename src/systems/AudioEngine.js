/**
 * @fileoverview Procedural WebAudio atmospheric soundscape and sound effects.
 */

export class AudioEngine {
  constructor(soundEnabled = true) {
    this.enabled = soundEnabled;
    /** @type {AudioContext | null} */
    this.ctx = null;
    /** @type {GainNode | null} */
    this.master = null;
    /** @type {GainNode | null} */
    this.windGain = null;
    this._started = false;
  }

  /**
   * Attach or create an unlocked AudioContext inside user interaction.
   * @param {AudioContext | null} [existingCtx]
   */
  init(existingCtx = null) {
    if (this._started) return;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      this.ctx = existingCtx || (AudioCtor ? new AudioCtor() : null);
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.38 : 0.0;
      this.master.connect(this.ctx.destination);

      // Soft sky wind via filtered pink-ish noise buffer
      const sr = this.ctx.sampleRate;
      const len = sr * 3;
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      let b0 = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.98 * b0 + white * 0.04;
        data[i] = b0 * 0.7;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 460;

      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.2;

      src.connect(filter);
      filter.connect(this.windGain);
      this.windGain.connect(this.master);
      src.start();
      this._started = true;
    } catch {
      // Audio optional
    }
  }

  setEnabled(next) {
    this.enabled = Boolean(next);
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.enabled ? 0.38 : 0.0, this.ctx.currentTime, 0.08);
    }
  }

  updateWind(gliding, speed) {
    if (!this.windGain || !this.ctx || !this.enabled) return;
    const target = gliding ? 0.42 : 0.16 + Math.min(0.18, speed * 0.015);
    this.windGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.15);
  }

  _tone(freq, duration, type = 'sine', vol = 0.22, slideTo = null) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    g.gain.setValueAtTime(0.001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  playStep() {
    this._tone(110 + Math.random() * 25, 0.07, 'triangle', 0.08, 65);
  }

  playJump() {
    this._tone(210, 0.18, 'sine', 0.12, 340);
  }

  playBeaconLit() {
    this._tone(293.66, 0.9, 'triangle', 0.22);
    setTimeout(() => this._tone(440, 1.1, 'sine', 0.18), 90);
    setTimeout(() => this._tone(587.33, 1.4, 'sine', 0.16), 190);
  }

  playEcho() {
    this._tone(523.25, 0.85, 'sine', 0.18);
    setTimeout(() => this._tone(783.99, 1.0, 'sine', 0.14), 110);
  }

  playWindcall() {
    this._tone(330, 0.45, 'triangle', 0.16, 620);
  }

  playWayglass(on) {
    this._tone(on ? 480 : 360, 0.28, 'sine', 0.12, on ? 660 : 280);
  }

  playLampHit() {
    this._tone(140, 0.45, 'sawtooth', 0.14, 72);
  }
}
