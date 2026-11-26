import * as THREE from '../vendor/three.js';
import { CYCLE_SECONDS } from '../core/DriftClock.js';

const _posA = new THREE.Vector3();
const _posB = new THREE.Vector3();

/**
 * Evaluates deterministic closed-orbit island position at global cycle time T.
 * Fixed/anchored islands return their locked position.
 * @param {object} def
 * @param {number} T
 * @param {THREE.Vector3} out
 * @returns {THREE.Vector3}
 */
export function evaluateOrbitPosition(def, T, out) {
  const effectiveT = def.anchored && def.anchoredTime !== null ? def.anchoredTime : T;
  const orbit = def.orbit;
  if (!orbit || (orbit.rx === 0 && orbit.rz === 0 && !orbit.bob)) {
    return out.set(def.basePos[0], def.basePos[1], def.basePos[2]);
  }
  const k = orbit.k || 1;
  const omega = (Math.PI * 2 * k) / CYCLE_SECONDS;
  const angle = omega * effectiveT + (orbit.phase || 0);
  const x = def.basePos[0] + Math.cos(angle) * (orbit.rx || 0);
  const z = def.basePos[2] + Math.sin(angle) * (orbit.rz || 0);
  const y = def.basePos[1] + Math.sin(angle * 2) * (orbit.bob || 0);
  return out.set(x, y, z);
}

/**
 * Compute alignment timing info between a drifting island and its target neighbor.
 * Returns edge distance now and seconds until closest alignment within the next cycle.
 * @param {object} island
 * @param {object} targetIsland
 * @param {number} currentT
 */
export function computeAlignmentInfo(island, targetIsland, currentT) {
  evaluateOrbitPosition(island, currentT, _posA);
  evaluateOrbitPosition(targetIsland, currentT, _posB);
  const curDist = _posA.distanceTo(_posB);
  const combinedReach = (island.radius || 8) + (targetIsland.radius || 8) + 4.5;
  if (island.anchored) {
    return {
      alignedNow: curDist <= combinedReach,
      secondsToBest: 0,
      minDist: curDist,
    };
  }

  let bestDt = 0;
  let minDist = Infinity;
  const period = CYCLE_SECONDS / (island.orbit?.k || 1);
  const samples = 72;
  for (let i = 0; i < samples; i++) {
    const dt = (i / samples) * period;
    evaluateOrbitPosition(island, currentT + dt, _posA);
    evaluateOrbitPosition(targetIsland, currentT + dt, _posB);
    const d = _posA.distanceTo(_posB);
    if (d < minDist) {
      minDist = d;
      bestDt = dt;
    }
  }

  return {
    alignedNow: curDist <= combinedReach || curDist <= minDist + 1.8,
    secondsToBest: Math.round(bestDt),
    minDist,
  };
}
