import * as THREE from '../vendor/three.js';

/**
 * Local-space heightfield + platform/bridge/obstacle collision solver for floating islands.
 */

/**
 * Check if local (lx, lz) lies on a rectangular dock or plank bridge extending from the island.
 * @param {number} lx
 * @param {number} lz
 * @param {object} bridge
 * @returns {number | null} Local surface Y if standing on bridge, else null.
 */
function sampleBridgeHeight(lx, lz, bridge) {
  const cos = Math.cos(-(bridge.yaw || 0));
  const sin = Math.sin(-(bridge.yaw || 0));
  const dx = lx - (bridge.x || 0);
  const dz = lz - (bridge.z || 0);
  const rx = dx * cos - dz * sin;
  const rz = dx * sin + dz * cos;
  const hw = (bridge.width || 3.2) * 0.5;
  const hl = (bridge.length || 6) * 0.5;
  if (Math.abs(rx) <= hw && Math.abs(rz) <= hl) {
    const t = (rz + hl) / Math.max(0.01, bridge.length || 6);
    const yStart = bridge.yStart ?? 0;
    const yEnd = bridge.yEnd ?? yStart;
    return THREE.MathUtils.lerp(yStart, yEnd, t);
  }
  return null;
}

/**
 * Compute walkable surface height in world space for a given island at world (wx, wz).
 * Returns null if (wx, wz) is outside the island's walkable footprint.
 * @param {object} island
 * @param {number} wx
 * @param {number} wz
 * @returns {number | null}
 */
export function sampleIslandSurfaceY(island, wx, wz) {
  const pos = island.group.position;
  const lx = wx - pos.x;
  const lz = wz - pos.z;
  const r = island.radius;
  const distSq = lx * lx + lz * lz;

  let bestLocalY = null;

  if (distSq <= r * r) {
    const dist = Math.sqrt(distSq);
    const norm = dist / Math.max(0.01, r);
    // Gentle domed plateau with bevelled terrace near edge
    const crown = Math.max(0, 1 - norm * norm) * (island.crownHeight ?? 0.55);
    const rimDrop = norm > 0.86 ? ((norm - 0.86) / 0.14) * 0.35 : 0;
    bestLocalY = crown - rimDrop;
  }

  if (Array.isArray(island.bridges)) {
    for (const b of island.bridges) {
      if (b.requiresVane && !b.extended) continue;
      const by = sampleBridgeHeight(lx, lz, b);
      if (by !== null && (bestLocalY === null || by > bestLocalY)) {
        bestLocalY = by;
      }
    }
  }

  if (bestLocalY === null) return null;
  return pos.y + bestLocalY;
}

/**
 * Push player horizontally out of cylindrical ruin pillars or closed vane gates on an island.
 * @param {object} island
 * @param {THREE.Vector3} playerPos
 * @param {number} playerRadius
 */
export function resolveObstacleCollisions(island, playerPos, playerRadius = 0.42) {
  if (!Array.isArray(island.colliders) || island.colliders.length === 0) return;
  const base = island.group.position;
  for (const col of island.colliders) {
    if (col.active === false) continue;
    const cx = base.x + col.x;
    const cy = base.y + (col.y || 0);
    const cz = base.z + col.z;
    if (playerPos.y > cy + (col.height || 4) || playerPos.y + 1.75 < cy) continue;

    const dx = playerPos.x - cx;
    const dz = playerPos.z - cz;
    const minDist = (col.radius || 0.6) + playerRadius;
    const dSq = dx * dx + dz * dz;
    if (dSq < minDist * minDist && dSq > 1e-6) {
      const d = Math.sqrt(dSq);
      const push = minDist - d;
      playerPos.x += (dx / d) * push;
      playerPos.z += (dz / d) * push;
    }
  }
}
