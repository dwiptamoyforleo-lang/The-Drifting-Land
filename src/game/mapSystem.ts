export interface MapLocation {
  id: string;
  name: string;
  type: 'portal' | 'checkpoint' | 'settlement' | 'ruin';
  x: number;
  z: number;
  discovered: boolean;
}

export const DEFAULT_MAP_LOCATIONS: MapLocation[] = [
  { id: 'loc-haven', name: 'Aero-Haven Hub', type: 'settlement', x: 0, z: 0, discovered: true },
  { id: 'loc-anchor-1', name: 'Anchor Alpha Citadel', type: 'portal', x: -28, z: -35, discovered: true },
  { id: 'loc-cp-bridge', name: 'Sky-Bridge Beacon', type: 'checkpoint', x: 0, z: -26, discovered: true },
  { id: 'loc-ruin', name: 'Forgotten Research Dome', type: 'ruin', x: 22, z: -34, discovered: false },
  { id: 'loc-anchor-2', name: 'Anchor Beta Spire', type: 'portal', x: -18, z: -52, discovered: false },
  { id: 'loc-anchor-3', name: 'Anchor Gamma Sanctum', type: 'portal', x: 26, z: -48, discovered: false },
];
