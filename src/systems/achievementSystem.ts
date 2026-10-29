/**
 * Achievement System for The Drifting Land.
 * Implements Prompt 8:
 * - Unlocks achievements based on genuine gameplay milestones.
 * - Single-grant rewards preventing duplicate exploitation.
 * - Save state persistence and notification dispatch.
 */
import { AchievementDefinition, SaveData } from '../types/game';
import { ACHIEVEMENTS_CATALOG } from '../data/achievements';
import { InventorySystem } from './inventorySystem';
import { NotificationSystem } from './notificationSystem';
import { AudioService } from '../services/audio';

export interface UnlockedAchievementRecord {
  def: AchievementDefinition;
  unlocked: boolean;
  timestamp?: number;
}

type AchievementListener = (achievements: UnlockedAchievementRecord[]) => void;

export class AchievementSystem {
  private unlockedMap: Record<string, { unlocked: boolean; timestamp: number }> = {};
  private inventory: InventorySystem;
  private onExperienceAwarded?: (xp: number) => void;
  private listeners: Set<AchievementListener> = new Set();

  constructor(
    inventory: InventorySystem,
    initialUnlocked: Record<string, { unlocked: boolean; timestamp: number }> = {},
    onExperienceAwarded?: (xp: number) => void
  ) {
    this.inventory = inventory;
    this.unlockedMap = { ...initialUnlocked };
    this.onExperienceAwarded = onExperienceAwarded;
  }

  subscribe(listener: AchievementListener): () => void {
    this.listeners.add(listener);
    listener(this.getAll());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const records = this.getAll();
    this.listeners.forEach((fn) => fn(records));
  }

  getAll(): UnlockedAchievementRecord[] {
    return Object.values(ACHIEVEMENTS_CATALOG).map((def) => {
      const entry = this.unlockedMap[def.id];
      return {
        def,
        unlocked: !!entry?.unlocked,
        timestamp: entry?.timestamp,
      };
    });
  }

  isUnlocked(achId: string): boolean {
    return !!this.unlockedMap[achId]?.unlocked;
  }

  unlock(achId: string, silent = false): boolean {
    const def = ACHIEVEMENTS_CATALOG[achId];
    if (!def) return false;
    if (this.unlockedMap[achId]?.unlocked) return false;

    this.unlockedMap[achId] = {
      unlocked: true,
      timestamp: Date.now(),
    };

    // Single-grant reward distribution
    if (def.rewards.coins > 0) {
      this.inventory.addCoins(def.rewards.coins);
    }
    if (def.rewards.experience > 0 && this.onExperienceAwarded) {
      this.onExperienceAwarded(def.rewards.experience);
    }

    if (!silent) {
      AudioService.playRelicCollect();
      NotificationSystem.notify(
        'Achievement Unlocked!',
        `★ ${def.title} — ${def.description}`,
        'quest',
        6500
      );
    }

    this.notify();
    return true;
  }

  /**
   * Check milestone conditions against current world progress
   */
  evaluateMilestones(save: SaveData): void {
    // 1. First steps
    this.unlock('ach_first_steps');

    // 2. Beacon awakened
    if (save.beaconStates['verdant_monolith_beacon']) {
      this.unlock('ach_beacon_ignited');
    }

    // 3. All shards
    if (save.collectedShardIds && save.collectedShardIds.length >= 4) {
      this.unlock('ach_all_shards');
    }

    // 4. Wayfarer checkpoints
    if (save.activatedCheckpoints && save.activatedCheckpoints.length >= 3) {
      this.unlock('ach_all_checkpoints');
    }

    // 5. Archaeologist (ruins & records)
    if (save.examinedRecords && save.examinedRecords.length >= 2 && save.discoveries.length >= 3) {
      this.unlock('ach_ruins_explorer');
    }

    // 6. Chamber raider
    if (save.discoveredChambers && save.discoveredChambers.length >= 1) {
      this.unlock('ach_undercroft');
    }

    // 7. Portal pioneer
    if (save.discoveries && (save.discoveries.includes('gateway_rift_valley') || save.discoveries.includes('disc_rift_gateway') || save.discoveries.includes('disc_dimensional_gateway'))) {
      this.unlock('ach_portal_pioneer');
    }

    // 8. Warden slayer
    if (save.redMoon?.wardenDefeated) {
      this.unlock('ach_warden_slayer');
    }

    // 9. Exploration Rank 5
    if (save.explorationRank >= 5) {
      this.unlock('ach_rank_master');
    }
  }

  serialize(): Record<string, { unlocked: boolean; timestamp: number }> {
    return { ...this.unlockedMap };
  }
}
