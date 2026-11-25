/**
 * Adaptive Quality Governor for The Drifting Land.
 * Monitors rolling ~2s frame times and dynamically steps quality down when FPS drops
 * below ~45 FPS or carefully steps back up after sustained >= 57 FPS, with hysteresis
 * to avoid oscillation. Connects directly to Graphics setting ('low' | 'medium' | 'high' | 'auto').
 */

import { GameSettings } from '../types/game';

export type QualityTier = 'low' | 'medium' | 'high';

export interface QualityConfig {
  tier: QualityTier;
  isAuto: boolean;
  pixelRatioCap: number;
  activeLoadRadius: number;
  activeUnloadRadius: number;
  nearLoadRadius: number;
  nearUnloadRadius: number;
  farPlane: number;
  fogDensity: number;
  shadows: boolean;
  shadowMapSize: number;
  vegetationDensity: number;
  particleLimit: number;
  entityCap: number;
  maxPointLights: number;
}

export class PerformanceGovernor {
  private currentTier: QualityTier;
  private isSoftwareGl: boolean;
  private isMobile: boolean;

  // Rolling ~2 second frame-time window
  private sampleWindowMs = 0;
  private sampleFrames = 0;
  private lowFpsDuration = 0;
  private highFpsDuration = 0;
  private cooldownTimer = 0;

  private readonly DOWNGRADE_FPS = 45;
  private readonly UPGRADE_FPS = 57;
  private readonly DOWNGRADE_HOLD_SEC = 2.0;
  private readonly UPGRADE_HOLD_SEC = 6.5;
  private readonly CHANGE_COOLDOWN_SEC = 6.0;

  constructor(initialSettings: GameSettings, isSoftwareGl: boolean, isMobile: boolean) {
    this.isSoftwareGl = isSoftwareGl;
    this.isMobile = isMobile;
    this.currentTier = this.resolveInitialTier(initialSettings);
  }

  private resolveInitialTier(settings: GameSettings): QualityTier {
    if (settings.graphicsQuality !== 'auto') {
      return settings.graphicsQuality;
    }
    if (this.isSoftwareGl || this.isMobile) return 'low';
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 8;
    return cores <= 4 ? 'medium' : 'high';
  }

  public syncSettings(settings: GameSettings): void {
    if (settings.graphicsQuality !== 'auto') {
      this.currentTier = settings.graphicsQuality;
      this.resetCounters();
    } else if (this.isSoftwareGl) {
      this.currentTier = 'low';
      this.resetCounters();
    }
  }

  private resetCounters(): void {
    this.sampleWindowMs = 0;
    this.sampleFrames = 0;
    this.lowFpsDuration = 0;
    this.highFpsDuration = 0;
  }

  /**
   * Record one rendered frame and return true if the effective quality tier changed.
   */
  public recordFrame(frameMs: number, elapsedDt: number, settings: GameSettings): boolean {
    if (settings.graphicsQuality !== 'auto' || this.isSoftwareGl) {
      return false;
    }

    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - elapsedDt);
    }

    this.sampleWindowMs += frameMs;
    this.sampleFrames += 1;

    // Evaluate rolling ~2 second window
    if (this.sampleWindowMs < 2000 && this.sampleFrames < 60) {
      return false;
    }

    const avgFrameMs = this.sampleWindowMs / Math.max(1, this.sampleFrames);
    const windowSec = this.sampleWindowMs / 1000;
    const avgFps = 1000 / Math.max(1, avgFrameMs);

    this.sampleWindowMs = 0;
    this.sampleFrames = 0;

    if (this.cooldownTimer > 0) {
      return false;
    }

    if (avgFps < this.DOWNGRADE_FPS) {
      this.lowFpsDuration += windowSec;
      this.highFpsDuration = 0;
      if (this.lowFpsDuration >= this.DOWNGRADE_HOLD_SEC && this.currentTier !== 'low') {
        this.currentTier = this.currentTier === 'high' ? 'medium' : 'low';
        this.lowFpsDuration = 0;
        this.cooldownTimer = this.CHANGE_COOLDOWN_SEC;
        return true;
      }
    } else if (avgFps >= this.UPGRADE_FPS) {
      this.highFpsDuration += windowSec;
      this.lowFpsDuration = 0;
      const maxAutoTier: QualityTier = this.isMobile ? 'medium' : 'high';
      if (this.highFpsDuration >= this.UPGRADE_HOLD_SEC && this.currentTier !== maxAutoTier) {
        if (this.currentTier === 'low') {
          this.currentTier = 'medium';
        } else if (this.currentTier === 'medium' && maxAutoTier === 'high') {
          this.currentTier = 'high';
        }
        this.highFpsDuration = 0;
        this.cooldownTimer = this.CHANGE_COOLDOWN_SEC;
        return true;
      }
    } else {
      // Comfort zone: decay counters smoothly to prevent jitter
      this.lowFpsDuration = Math.max(0, this.lowFpsDuration - windowSec * 0.5);
      this.highFpsDuration = Math.max(0, this.highFpsDuration - windowSec * 0.5);
    }

    return false;
  }

  public getTier(): QualityTier {
    return this.currentTier;
  }

  public getConfig(settings: GameSettings): QualityConfig {
    const tier = settings.graphicsQuality === 'auto' ? this.currentTier : settings.graphicsQuality;
    const isAuto = settings.graphicsQuality === 'auto';
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    let pixelRatioCap = 1.0;
    let activeLoadRadius = 56;
    let activeUnloadRadius = 68;
    let nearLoadRadius = 110;
    let nearUnloadRadius = 128;
    let vegetationDensity = 0.75;
    let entityCap = 16;
    let shadowMapSize = 512;
    let maxPointLights = 2;

    if (this.isSoftwareGl || tier === 'low') {
      pixelRatioCap = this.isSoftwareGl ? 1.0 : Math.min(dpr, 1.0);
      activeLoadRadius = 46;
      activeUnloadRadius = 58;
      nearLoadRadius = 92;
      nearUnloadRadius = 108;
      vegetationDensity = 0.45;
      entityCap = 10;
      shadowMapSize = 0;
      maxPointLights = 1;
    } else if (tier === 'medium') {
      pixelRatioCap = this.isMobile ? Math.min(dpr, 1.25) : Math.min(dpr, 1.5);
      activeLoadRadius = 62;
      activeUnloadRadius = 76;
      nearLoadRadius = 128;
      nearUnloadRadius = 148;
      vegetationDensity = 0.75;
      entityCap = 16;
      shadowMapSize = 512;
      maxPointLights = 2;
    } else {
      pixelRatioCap = this.isMobile ? Math.min(dpr, 1.25) : Math.min(dpr, 2.0);
      activeLoadRadius = 80;
      activeUnloadRadius = 96;
      nearLoadRadius = 175;
      nearUnloadRadius = 200;
      vegetationDensity = 1.0;
      entityCap = 24;
      shadowMapSize = 1024;
      maxPointLights = 4;
    }

    // Honor explicit renderDistance while bounding Low tier cleanly
    let farPlane = 160;
    let fogDensity = 0.010;
    if (settings.renderDistance === 'short' || tier === 'low') {
      farPlane = 95;
      fogDensity = 0.015;
    } else if (settings.renderDistance === 'medium' || tier === 'medium') {
      farPlane = 160;
      fogDensity = 0.010;
    } else {
      farPlane = 240;
      fogDensity = 0.007;
    }

    const tierParticleCap = tier === 'low' ? 140 : tier === 'medium' ? 360 : 800;
    const particleLimit = Math.min(settings.particleLimit || tierParticleCap, tierParticleCap);

    return {
      tier,
      isAuto,
      pixelRatioCap,
      activeLoadRadius,
      activeUnloadRadius,
      nearLoadRadius,
      nearUnloadRadius,
      farPlane,
      fogDensity,
      shadows: settings.shadows && !this.isSoftwareGl && tier !== 'low',
      shadowMapSize,
      vegetationDensity,
      particleLimit,
      entityCap,
      maxPointLights,
    };
  }
}
