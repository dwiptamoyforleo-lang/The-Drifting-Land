/**
 * Checkpoint & Waystone Sanctuary System for The Drifting Land.
 * Manages player rest points, discovery lore, and safe respawn coordinates.
 */

import { Checkpoint } from '../types/game';
import { CHECKPOINTS } from '../data/regions';
import { NotificationSystem } from './notificationSystem';
import { AudioService } from '../services/audio';

export class CheckpointSystem {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private activeCheckpointId: string;

  constructor(activatedIds: string[] = ['cp_beacon_plaza'], activeId: string = 'cp_beacon_plaza') {
    this.activeCheckpointId = activeId;
    CHECKPOINTS.forEach((cp) => {
      this.checkpoints.set(cp.id, {
        ...cp,
        activated: activatedIds.includes(cp.id),
        discovered: activatedIds.includes(cp.id),
      });
    });
  }

  getActiveCheckpoint(): Checkpoint | undefined {
    return this.checkpoints.get(this.activeCheckpointId);
  }

  getCheckpoints(): Checkpoint[] {
    return Array.from(this.checkpoints.values());
  }

  checkProximity(playerPos: [number, number, number], onDiscoverCallback?: (cpId: string) => void): Checkpoint | null {
    let nearest: Checkpoint | null = null;
    let minDist = 5.0; // 5 meter interaction range

    this.checkpoints.forEach((cp) => {
      const dx = playerPos[0] - cp.position[0];
      const dz = playerPos[2] - cp.position[2];
      const dist = Math.hypot(dx, dz);

      if (dist < minDist) {
        nearest = cp;
        minDist = dist;

        if (!cp.discovered) {
          cp.discovered = true;
          cp.activated = true;
          this.activeCheckpointId = cp.id;
          NotificationSystem.notify('Sanctuary Discovered', cp.name, 'discovery', 5000);
          AudioService.playRelicCollect();
          onDiscoverCallback?.(cp.id);
        }
      }
    });

    return nearest;
  }

  activateCheckpoint(id: string): boolean {
    const cp = this.checkpoints.get(id);
    if (!cp) return false;

    cp.activated = true;
    this.activeCheckpointId = id;
    NotificationSystem.notify('Sanctuary Attuned', `Respawn anchor bound to ${cp.name}`, 'info');
    return true;
  }

  getActivatedIds(): string[] {
    return Array.from(this.checkpoints.values())
      .filter((cp) => cp.activated)
      .map((cp) => cp.id);
  }
}
