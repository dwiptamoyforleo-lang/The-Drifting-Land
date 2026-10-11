/**
 * Core type definitions for The Drifting World
 */
import * as THREE from 'three';

export type GraphicsQuality = 'low' | 'balanced' | 'high';

export interface GameSettings {
  graphicsQuality: GraphicsQuality;
  sensitivity: number;        // 0.5 to 2.5
  audioEnabled: boolean;
  ambientVolume: number;     // 0.0 to 1.0
  sfxVolume: number;         // 0.0 to 1.0
  showFps: boolean;
}

export interface WorldFragment {
  id: string;
  name: string;
  lore: string;
  position: [number, number, number];
  collected: boolean;
  mesh?: THREE.Object3D;
}

export interface MagicalAnchor {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  position: [number, number, number];
  beamColor: number;
  activated: boolean;
  connectsTo: string | null;
  mesh?: THREE.Object3D;
  crystalMesh?: THREE.Mesh;
  light?: THREE.PointLight;
}

export interface InscriptionLore {
  id: string;
  title: string;
  text: string;
  position: [number, number, number];
  mesh?: THREE.Object3D;
}

export interface InteractableObject {
  id: string;
  type: 'anchor' | 'fragment' | 'inscription' | 'citadel_core';
  title: string;
  prompt: string;
  distance: number;
  position: THREE.Vector3;
  onInteract: () => void;
}

export interface GameProgress {
  activatedAnchors: string[];
  collectedFragments: string[];
  resonanceDiscovered: boolean;
  citadelExplored: boolean;
  lastCheckpoint: [number, number, number];
}

export interface TelemetryData {
  headingDegrees: number;
  temperatureCelsius: number;
  elevationMeters: number;
}

export interface UserProfile {
  username: string;
  xp: number;
  level: number;
  selectedSector: number;
  unlockedSectors: number[];
}

export interface SectorInfo {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  altitudeMeters: number;
  difficulty: 'Standard' | 'Advanced' | 'Extreme';
  spawnPoint: [number, number, number];
}

export interface PerformanceStats {
  fps: number;
  drawCalls: number;
  triangles: number;
}
