/**
 * Quest Progression & Journal System for The Drifting Land.
 * Implements Prompt 8:
 * - 10 Quest Categories with unique definitions and objectives.
 * - 8-step connected initial storyline with automatic prerequisite chaining.
 * - Selected active tracked quest with HUD & Map objective targets.
 * - Single-grant atomic rewards prevention.
 * - Meaningful Exploration Rank progression (Ranks 1-5 with real perks).
 */
import {
  QuestDefinition,
  QuestProgress,
  QuestCategory,
  QuestObjectiveType,
  ExplorationRankInfo,
} from '../types/game';
import { QUEST_CATALOG } from '../data/quests';
import { EXPLORATION_RANKS } from '../data/achievements';
import { InventorySystem } from './inventorySystem';
import { NotificationSystem } from './notificationSystem';
import { AudioService } from '../services/audio';

export interface QuestJournalSnapshot {
  active: { def: QuestDefinition; progress: QuestProgress }[];
  completed: QuestDefinition[];
  available: QuestDefinition[];
  trackedQuestId: string | null;
  explorationRank: number;
  explorationXp: number;
  currentRankInfo: ExplorationRankInfo;
  nextRankInfo: ExplorationRankInfo | null;
}

type QuestChangeListener = (snapshot: QuestJournalSnapshot) => void;

export class QuestSystem {
  private progress: Record<string, QuestProgress> = {};
  private inventory: InventorySystem;
  private trackedQuestId: string | null = 'quest_main_1_clearing';
  private claimedRewards: Set<string> = new Set();
  public explorationRank: number = 1;
  public explorationXp: number = 0;
  private listeners: Set<QuestChangeListener> = new Set();
  private onExperienceAwarded?: (xp: number) => void;
  public onRankChanged?: (newRank: number, perkName: string) => void;

  constructor(
    inventory: InventorySystem,
    initialProgress: Record<string, QuestProgress> = {},
    initialClaimedRewards: string[] = [],
    initialTrackedQuestId: string | null = 'quest_main_1_clearing',
    initialExplorationRank: number = 1,
    initialExplorationXp: number = 0,
    onExperienceAwarded?: (xp: number) => void
  ) {
    this.inventory = inventory;
    this.onExperienceAwarded = onExperienceAwarded;
    this.progress = { ...initialProgress };
    this.claimedRewards = new Set(initialClaimedRewards);
    this.trackedQuestId = initialTrackedQuestId;
    this.explorationRank = Math.max(1, Math.min(5, initialExplorationRank));
    this.explorationXp = Math.max(0, initialExplorationXp);

    // Initialize default storyline starter quest if not already recorded
    if (!this.progress['quest_main_1_clearing']) {
      this.startQuest('quest_main_1_clearing', true);
    }

    // Default starter side quests
    if (!this.progress['quest_coll_botanist']) {
      this.startQuest('quest_coll_botanist', true);
    }
    if (!this.progress['quest_side_cartographer']) {
      this.startQuest('quest_side_cartographer', true);
    }

    // Ensure tracked quest is valid
    if (!this.trackedQuestId || !this.progress[this.trackedQuestId] || this.progress[this.trackedQuestId].status === 'COMPLETED') {
      const firstActive = Object.values(QUEST_CATALOG).find(
        (q) => this.progress[q.id]?.status === 'ACTIVE'
      );
      this.trackedQuestId = firstActive ? firstActive.id : 'quest_main_1_clearing';
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

  getJournalSnapshot(): QuestJournalSnapshot {
    const active: { def: QuestDefinition; progress: QuestProgress }[] = [];
    const completed: QuestDefinition[] = [];
    const available: QuestDefinition[] = [];

    Object.values(QUEST_CATALOG).forEach((def) => {
      const qp = this.progress[def.id];
      if (qp?.status === 'COMPLETED') {
        completed.push(def);
      } else if (qp?.status === 'ACTIVE') {
        active.push({ def, progress: qp });
      } else {
        // Check if requirements are satisfied
        const prereqMet = !def.prerequisiteQuestId || this.progress[def.prerequisiteQuestId]?.status === 'COMPLETED';
        if (prereqMet) {
          available.push(def);
        }
      }
    });

    const rankIdx = Math.max(0, Math.min(EXPLORATION_RANKS.length - 1, this.explorationRank - 1));
    const currentRankInfo = EXPLORATION_RANKS[rankIdx];
    const nextRankInfo = rankIdx < EXPLORATION_RANKS.length - 1 ? EXPLORATION_RANKS[rankIdx + 1] : null;

    return {
      active,
      completed,
      available,
      trackedQuestId: this.trackedQuestId,
      explorationRank: this.explorationRank,
      explorationXp: this.explorationXp,
      currentRankInfo,
      nextRankInfo,
    };
  }

  getTrackedQuest(): { def: QuestDefinition; progress: QuestProgress } | null {
    if (!this.trackedQuestId) return null;
    const def = QUEST_CATALOG[this.trackedQuestId];
    const progress = this.progress[this.trackedQuestId];
    if (def && progress && progress.status === 'ACTIVE') {
      return { def, progress };
    }
    // Fallback to first active
    for (const d of Object.values(QUEST_CATALOG)) {
      const p = this.progress[d.id];
      if (p && p.status === 'ACTIVE') {
        this.trackedQuestId = d.id;
        return { def: d, progress: p };
      }
    }
    return null;
  }

  setTrackedQuest(questId: string | null): void {
    this.trackedQuestId = questId;
    if (questId && QUEST_CATALOG[questId]) {
      NotificationSystem.notify('Quest Tracked', QUEST_CATALOG[questId].title, 'quest', 3000);
    }
    this.notify();
  }

  startQuest(questId: string, silent = false): boolean {
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
      rewardsClaimed: false,
    };

    if (!silent) {
      AudioService.playUiClick();
      NotificationSystem.notify('New Quest Begun', `⚔ ${def.title}`, 'quest', 5000);
    }

    // Auto-track if no quest is currently active
    if (!this.trackedQuestId || this.progress[this.trackedQuestId]?.status === 'COMPLETED') {
      this.trackedQuestId = questId;
    }

    this.notify();
    return true;
  }

  /**
   * Process genuine gameplay triggers
   */
  reportProgress(type: QuestObjectiveType, targetId?: string, amount = 1): void {
    let stateChanged = false;

    Object.values(QUEST_CATALOG).forEach((def) => {
      const qp = this.progress[def.id];
      if (!qp || qp.status !== 'ACTIVE') return;

      def.objectives.forEach((obj) => {
        if (obj.type === type) {
          // If objective specifies a targetId, verify match
          const targetMatches =
            !obj.targetId ||
            obj.targetId === targetId ||
            (targetId && (targetId.includes(obj.targetId) || obj.targetId.includes(targetId)));
          if (targetMatches) {
            const current = qp.objectives[obj.id] || 0;
            const next = Math.min(obj.targetCount, current + amount);
            if (next !== current) {
              qp.objectives[obj.id] = next;
              stateChanged = true;
              NotificationSystem.notify(
                'Objective Progress',
                `${obj.description} (${next}/${obj.targetCount})`,
                'quest',
                3500
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
    this.progress[questId].completedAt = Date.now();

    // Prevent duplicate reward claims
    if (!this.claimedRewards.has(questId)) {
      this.claimedRewards.add(questId);
      this.progress[questId].rewardsClaimed = true;

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

      // Add exploration XP
      this.addExplorationXp(Math.max(50, Math.floor(def.rewards.experience * 0.75)));
    }

    AudioService.playRelicCollect();
    NotificationSystem.notify('Quest Completed!', `✔ ${def.title} — Rewards Granted`, 'quest', 6500);

    // Auto-unlock & start next storyline quest in chain
    let nextStoryQuestId: string | null = null;
    Object.values(QUEST_CATALOG).forEach((other) => {
      if (other.prerequisiteQuestId === questId && (!this.progress[other.id] || this.progress[other.id].status === 'LOCKED')) {
        this.startQuest(other.id);
        if (other.category === 'main') {
          nextStoryQuestId = other.id;
        }
      }
    });

    // If the completed quest was tracked, switch to the next storyline quest
    if (this.trackedQuestId === questId && nextStoryQuestId) {
      this.trackedQuestId = nextStoryQuestId;
    }
  }

  /**
   * Add Exploration XP and check for rank promotions
   */
  addExplorationXp(amount: number): void {
    this.explorationXp += Math.max(0, amount);
    let newRank = 1;

    for (let i = EXPLORATION_RANKS.length - 1; i >= 0; i--) {
      if (this.explorationXp >= EXPLORATION_RANKS[i].requiredXp) {
        newRank = EXPLORATION_RANKS[i].rank;
        break;
      }
    }

    if (newRank > this.explorationRank) {
      this.explorationRank = newRank;
      const rankInfo = EXPLORATION_RANKS[newRank - 1];
      AudioService.playRelicCollect();
      NotificationSystem.notify(
        'Exploration Rank Promoted!',
        `★ Rank ${newRank}: ${rankInfo.title} (${rankInfo.perkName})`,
        'quest',
        7000
      );
      this.onRankChanged?.(newRank, rankInfo.perkName);
    }

    this.notify();
  }

  /**
   * Get active exploration perks for gameplay controllers
   */
  getExplorationPerks(): {
    detectionBonus: number;
    sprintSpeedBonus: number;
    staminaEfficiency: number;
    harvestBonus: number;
    regenBonus: number;
  } {
    return {
      detectionBonus: this.explorationRank >= 2 ? 0.25 : 0.0,
      sprintSpeedBonus: this.explorationRank >= 3 ? 0.10 : 0.0,
      staminaEfficiency: this.explorationRank >= 3 ? 0.15 : 0.0,
      harvestBonus: this.explorationRank >= 4 ? 1 : 0,
      regenBonus: this.explorationRank >= 5 ? 0.25 : 0.0,
    };
  }

  serialize(): Record<string, QuestProgress> {
    return { ...this.progress };
  }

  getClaimedRewards(): string[] {
    return Array.from(this.claimedRewards);
  }

  getTrackedQuestId(): string | null {
    return this.trackedQuestId;
  }
}
