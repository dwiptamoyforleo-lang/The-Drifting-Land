import * as THREE from '../vendor/three.js';

const _delta = new THREE.Vector3();

/**
 * Carries the player seamlessly 1:1 with whichever moving island they stand upon.
 */
export class PlatformCarry {
  constructor() {
    /** @type {string | null} */
    this.groundedIslandId = null;
    this._lastPlatformPos = new THREE.Vector3();
  }

  /**
   * Call before player physics each fixed step: moves player by the platform's displacement.
   * @param {Map<string, object>} islandMap
   * @param {THREE.Vector3} playerPos
   */
  applyCarry(islandMap, playerPos) {
    if (!this.groundedIslandId) return;
    const island = islandMap.get(this.groundedIslandId);
    if (!island) {
      this.groundedIslandId = null;
      return;
    }
    _delta.copy(island.group.position).sub(this._lastPlatformPos);
    playerPos.add(_delta);
    this._lastPlatformPos.copy(island.group.position);
  }

  /**
   * Update which island the player is currently standing on.
   * @param {object | null} island
   */
  setGroundedIsland(island) {
    if (!island) {
      this.groundedIslandId = null;
      return;
    }
    this.groundedIslandId = island.id;
    this._lastPlatformPos.copy(island.group.position);
  }
}
