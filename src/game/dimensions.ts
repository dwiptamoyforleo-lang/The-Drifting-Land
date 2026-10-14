export interface DimensionInfo {
  id: number;
  name: string;
  requiredAnchors: number;
  description: string;
}

export const DIMENSIONS_DATABASE: DimensionInfo[] = [
  { id: 1, name: 'Kepler Prime (Material Stratosphere)', requiredAnchors: 0, description: 'Primary atmospheric layer above the gas giant.' },
  { id: 2, name: 'The Quantum Aether', requiredAnchors: 1, description: 'Harmonic sub-space where gravitational vectors fluctuate.' },
  { id: 3, name: 'The Crimson Eclipse Dimension', requiredAnchors: 2, description: 'Time-distorted reality accessible during Red Moon alignments.' },
  { id: 4, name: 'The Void Expanse', requiredAnchors: 3, description: 'Outer orbital sector beyond the atmospheric boundary.' },
];

export class DimensionManager {
  public currentDimension: number = 1;

  public switchDimension(dimId: number, activatedAnchorsCount: number): boolean {
    const dim = DIMENSIONS_DATABASE.find(d => d.id === dimId);
    if (!dim) return false;
    if (activatedAnchorsCount >= dim.requiredAnchors) {
      this.currentDimension = dimId;
      return true;
    }
    return false;
  }
}
