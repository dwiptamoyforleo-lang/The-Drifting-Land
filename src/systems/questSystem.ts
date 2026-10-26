/**
 * Quest Progression & Journal System for The Drifting Land.
 * Tracks active quests, objective triggers, completion checks, and grants rewards.
 */

import { QuestDefinition, QuestProgress } from '../types/game';
import { QUEST_CATALOG } from '../data/quests';
import { InventorySystem } from './inventorySystem';
import { NotificationSystem } from './notificationSystem';
import { AudioService } from '../services/audio';

type QuestChangeListener = (quests: {
  active: { def: QuestDefinition; progress: QuestProgress }[];
  completed: QuestDefinition[];
}) => void;

export class QuestSystem {
  private progress: Record<string, QuestProgress> = {};
  private inventory: InventorySystem;
  private listeners: Set<QuestChangeListener> = new Set();
  private onExperienceAwarded?: (xp: number) => void;

  constructor(
    inventory: InventorySystem,
    initialProgress: Record<string, QuestProgress> = {},
    onExperienceAwarded?: (xp: number) => void
  ) {
    this.inventory = inventory;
    this.onExperienceAwarded = onExperienceAwarded;
    this.progress = { ...initialProgress };

    // Initialize default starter quests if none exist
    if (!this.progress['quest_awaken_beacon']) {
      this.startQuest('quest_awaken_beacon');
    }
    if (!this.progress['quest_lost_civilization']) {
      this.startQuest('quest_lost_civilization');
    }
  }

  subscribe(listener: QuestChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.getJournalSnapshot());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.getJournalSnapshot();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  getJournalSnapshot(): {
    active: { def: QuestDefinition; progress: QuestProgress }[];
    completed: QuestDefinition[];
  } {
    const active: { def: QuestDefinition; progress: QuestProgress }[] = [];
    const completed: QuestDefinition[] = [];

    Object.values(QUEST_CATALOG).forEach((def) => {
      const qp = this.progress[def.id];
      if (qp?.status === 'COMPLETED') {
        completed.push(def);
      } else if (qp?.status === 'ACTIVE') {
        active.push({ def, progress: qp });
      }
    });

    return { active, completed };
  }

  startQuest(questId: string): boolean {
    const def = QUEST_CATALOG[questId];
    if (!def) return false;

    if (this.progress[questId]?.status === 'COMPLETED') return false;

    const initialObjectives: Record<string, number> = {};
    def.objectives.forEach((obj) => {
      initialObjectives[obj.id] = 0;
    });

    this.progress[questId] = {
      questId,
      status: 'ACTIVE',
      objectives: initialObjectives,
    };

    NotificationSystem.notify('New Quest Begun', def.title, 'quest');
    this.notify();
    return true;
  }

  /**
   * Process gameplay triggers (e.g. collected a shard, discovered a ruin, activated beacon)
   */
  reportProgress(
    type: 'COLLECT' | 'DISCOVER' | 'ACTIVATE_BEACON' | 'INTERACT_NPC' | 'DEFEAT_BOSS',
    targetId?: string,
    amount: number = 1
  ): void {
    let stateChanged = false;

    Object.values(QUEST_CATALOG).forEach((def) => {
      const qp = this.progress[def.id];
      if (!qp || qp.status !== 'ACTIVE') return;

      def.objectives.forEach((obj) => {
        if (obj.type === type) {
          if (!obj.targetId || obj.targetId === targetId) {
            const current = qp.objectives[obj.id] || 0;
            const next = Math.min(obj.targetCount, current + amount);
            if (next !== current) {
              qp.objectives[obj.id] = next;
              stateChanged = true;

              NotificationSystem.notify(
                'Quest Objective Updated',
                `${obj.description} (${next}/${obj.targetCount})`,
                'quest'
              );
            }
          }
        }
      });

      // Check if all objectives are fulfilled
      const allComplete = def.objectives.every(
        (obj) => (qp.objectives[obj.id] || 0) >= obj.targetCount
      );

      if (allComplete && qp.status === 'ACTIVE') {
        this.completeQuest(def.id);
        stateChanged = true;
      }
    });

    if (stateChanged) {
      this.notify();
    }
  }

  private completeQuest(questId: string): void {
    const def = QUEST_CATALOG[questId];
    if (!def) return;

    this.progress[questId].status = 'COMPLETED';

    // Award Rewards
    if (def.rewards.coins) {
      this.inventory.addCoins(def.rewards.coins);
    }
    if (def.rewards.experience && this.onExperienceAwarded) {
      this.onExperienceAwarded(def.rewards.experience);
    }
    if (def.rewards.items) {
      def.rewards.items.forEach(({ itemId, quantity }) => {
        this.inventory.addItem(itemId, quantity);
      });
    }

    AudioService.playRelicCollect();
    NotificationSystem.notify('Quest Completed!', `${def.title} - Rewards Granted`, 'quest', 6000);
  }

  serialize(): Record<string, QuestProgress> {
    return { ...this.progress };
  }
}
