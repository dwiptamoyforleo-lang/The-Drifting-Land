/**
 * MULTIPLE DIMENSIONS TRAVEL SYSTEM
 * Manages separate playable regions, portal prerequisites, dynamic loading/unloading,
 * and security checks preventing direct URL or menu glitches into locked dimensions.
 */

export interface DimensionInfo {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  hazardLevel: 'Calm' | 'Moderate' | 'Severe' | 'Extreme';
  unlockedByDefault: boolean;
  requiredAnchors: number;
}

export const DIMENSIONS_DATABASE: DimensionInfo[] = [
  {
    id: 1,
    name: 'The Living Reach',
    subtitle: 'Primary Starting Dimension',
    description: 'Forests, rivers, hills, and beginner-friendly ruins teaching movement and exploration.',
    hazardLevel: 'Calm',
    unlockedByDefault: true,
    requiredAnchors: 0,
  },
  {
    id: 2,
    name: 'The Ashen Expanse',
    subtitle: 'Volcanic Industrial Dimension',
    description: 'Volcanic rock, glowing mineral deposits, heat-adapted flora, and dangerous routes.',
    hazardLevel: 'Moderate',
    unlockedByDefault: false,
    requiredAnchors: 1,
  },
  {
    id: 3,
    name: 'The Moonveil',
    subtitle: 'Bioluminescent Night Dimension',
    description: 'Nighttime realm featuring glowing plants, unusual wildlife, and night-dependent puzzles.',
    hazardLevel: 'Severe',
    unlockedByDefault: false,
    requiredAnchors: 2,
  },
  {
    id: 4,
    name: 'The Fractured Archive',
    subtitle: 'Ancient Knowledge Repository',
    description: 'Broken structures, research stations, ancient records, and locked chambers.',
    hazardLevel: 'Severe',
    unlockedByDefault: false,
    requiredAnchors: 3,
  },
  {
    id: 5,
    name: 'The Rift',
    subtitle: 'Origin of the Great Drift',
    description: 'Late-game dangerous region with strange geometry and distorted environmental effects.',
    hazardLevel: 'Extreme',
    unlockedByDefault: false,
    requiredAnchors: 3,
  },
];

export class DimensionManager {
  private currentDimensionId: number = 1;
  private unlockedDimensions: number[] = [1];

  constructor(savedUnlocked?: number[]) {
    if (savedUnlocked) {
      this.unlockedDimensions = savedUnlocked;
    }
  }

  public canAccessDimension(dimensionId: number, playerAnchorsCount: number): boolean {
    const dim = DIMENSIONS_DATABASE.find((d) => d.id === dimensionId);
    if (!dim) return false;
    if (dim.unlockedByDefault || this.unlockedDimensions.includes(dimensionId)) {
      return true;
    }
    return playerAnchorsCount >= dim.requiredAnchors;
  }

  public switchDimension(dimensionId: number, playerAnchorsCount: number): boolean {
    if (!this.canAccessDimension(dimensionId, playerAnchorsCount)) {
      console.warn(`Access denied to dimension ${dimensionId}: prerequisites not met.`);
      return false;
    }
    this.currentDimensionId = dimensionId;
    if (!this.unlockedDimensions.includes(dimensionId)) {
      this.unlockedDimensions.push(dimensionId);
    }
    return true;
  }

  public getCurrentDimension(): number {
    return this.currentDimensionId;
  }

  public getUnlockedList(): number[] {
    return [...this.unlockedDimensions];
  }
}