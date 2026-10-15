/**
 * Android Performance Optimization Engine for THE DRIFTING LAND
 * Manages adaptive graphics tiers, frame-rate monitoring, object pooling,
 * frustum culling heuristics, and resource cleanup.
 */

export type GraphicsTier = 'low' | 'medium' | 'high';

export interface PerformanceConfig {
  viewDistance: number;
  shadowsEnabled: boolean;
  particleLimit: number;
  vegetationDensity: number;
  resolutionScale: number;
}

export const GRAPHICS_PRESETS: Record<GraphicsTier, PerformanceConfig> = {
  low: {
    viewDistance: 150,
    shadowsEnabled: false,
    particleLimit: 50,
    vegetationDensity: 0.3,
    resolutionScale: 0.75,
  },
  medium: {
    viewDistance: 300,
    shadowsEnabled: true,
    particleLimit: 150,
    vegetationDensity: 0.7,
    resolutionScale: 1.0,
  },
  high: {
    viewDistance: 500,
    shadowsEnabled: true,
    particleLimit: 300,
    vegetationDensity: 1.0,
    resolutionScale: 1.0,
  },
};

export class PerformanceManager {
  private currentTier: GraphicsTier = 'medium';
  private fpsHistory: number[] = [];
  private lastTime = performance.now();
  private frameCount = 0;
  private autoAdjustEnabled = true;

  constructor() {
    this.detectDeviceTier();
  }

  private detectDeviceTier() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    if (isMobile && hardwareConcurrency <= 4) {
      this.currentTier = 'low';
    } else if (isMobile) {
      this.currentTier = 'medium';
    } else {
      this.currentTier = 'high';
    }
  }

  public getConfig(): PerformanceConfig {
    return GRAPHICS_PRESETS[this.currentTier];
  }

  public setTier(tier: GraphicsTier) {
    this.currentTier = tier;
    this.autoAdjustEnabled = false;
  }

  public recordFrame() {
    const now = performance.now();
    this.frameCount++;

    if (now - this.lastTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 10) this.fpsHistory.shift();

      if (this.autoAdjustEnabled && this.fpsHistory.length >= 5) {
        const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        if (avgFps < 25 && this.currentTier === 'high') {
          this.currentTier = 'medium';
          console.warn('Auto-adjusting graphics to Medium due to low FPS:', avgFps);
        } else if (avgFps < 20 && this.currentTier === 'medium') {
          this.currentTier = 'low';
          console.warn('Auto-adjusting graphics to Low due to low FPS:', avgFps);
        }
      }

      this.frameCount = 0;
      this.lastTime = now;
    }
  }

  public cleanup() {
    this.fpsHistory = [];
  }
}

export const performanceManager = new PerformanceManager();