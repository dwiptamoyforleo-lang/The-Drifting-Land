export type QuestCategory =
  | 'main_storyline'
    | 'side_quests'
      | 'exploration_quests'
        | 'collection_quests'
          | 'npc_tasks'
            | 'research_tasks'
              | 'crafting_quests'
                | 'boss_quests'
                  | 'dimension_quests'
                    | 'special_event_quests'
                      | 'repeatable_challenges';

                      export type QuestState = 'locked' | 'available' | 'active' | 'completed' | 'failed';

                      export interface QuestReward {
                        coins?: number;
                          items?: { itemId: string; quantity: number }[];
                            experience?: number;
                              discoveries?: string[];
                                locationUnlocks?: number[];
                                }

                                export interface Quest {
                                  id: string;
                                    name: string;
                                      category: QuestCategory;
                                        description: string;
                                          objective: string;
                                            state: QuestState;
                                              targetCount?: number;
                                                currentProgress?: number;
                                                  requirements?: { level?: number; questsCompleted?: string[]; anchorsAttuned?: number };
                                                    rewards: QuestReward;
                                                    }

                                                    export class QuestManager {
                                                      public quests: Quest[] = [
                                                          {
                                                                id: 'main_beacon_repair',
                                                                      name: 'Repair Abandoned Beacon',
                                                                            category: 'main_storyline',
                                                                                  description: 'Restore power to the dormant beacon overlooking the golden cloud sea.',
                                                                                        objective: 'Repair the abandoned beacon in Sector 1',
                                                                                              state: 'active',
                                                                                                    targetCount: 1,
                                                                                                          currentProgress: 0,
                                                                                                                rewards: { coins: 250, experience: 400, discoveries: ['Beacon Alpha Online'], locationUnlocks: [2] },
                                                                                                                    },
                                                                                                                        {
                                                                                                                              id: 'explore_ancient_tower',
                                                                                                                                    name: 'Discover Ancient Tower',
                                                                                                                                          category: 'exploration_quests',
                                                                                                                                                description: 'Locate the towering spire rising above the northern cloud banks.',
                                                                                                                                                      objective: 'Find and enter the ancient tower',
                                                                                                                                                            state: 'available',
                                                                                                                                                                  rewards: { coins: 150, experience: 300, discoveries: ['Ancient Spire Architecture'] },
                                                                                                                                                                      },
                                                                                                                                                                          {
                                                                                                                                                                                id: 'collect_rare_plants',
                                                                                                                                                                                      name: 'Bioluminescent Botany',
                                                                                                                                                                                            category: 'collection_quests',
                                                                                                                                                                                                  description: 'Gather rare glowing flora specimens for botanical research.',
                                                                                                                                                                                                        objective: 'Collect rare plants (0/5)',
                                                                                                                                                                                                              state: 'available',
                                                                                                                                                                                                                    targetCount: 5,
                                                                                                                                                                                                                          currentProgress: 0,
                                                                                                                                                                                                                                rewards: { coins: 200, experience: 350, items: [{ itemId: 'food-lumenvine-tea', quantity: 2 }] },
                                                                                                                                                                                                                                    },
                                                                                                                                                                                                                                        {
                                                                                                                                                                                                                                              id: 'boss_red_moon',
                                                                                                                                                                                                                                                    name: 'Investigate the Red Moon',
                                                                                                                                                                                                                                                          category: 'boss_quests',
                                                                                                                                                                                                                                                                description: 'Confront the Crimson Warden when Kepler-94d enters the red eclipse alignment.',
                                                                                                                                                                                                                                                                      objective: 'Defeat the Crimson Warden during the Red Moon',
                                                                                                                                                                                                                                                                            state: 'locked',
                                                                                                                                                                                                                                                                                  requirements: { anchorsAttuned: 2 },
                                                                                                                                                                                                                                                                                        rewards: { coins: 600, experience: 1000, discoveries: ['Crimson Core Relic'], locationUnlocks: [3] },
                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                              ];

                                                                                                                                                                                                                                                                                                public activeQuestId: string | null = 'main_beacon_repair';

                                                                                                                                                                                                                                                                                                  public updateProgress(questId: string, delta: number = 1) {
                                                                                                                                                                                                                                                                                                      const quest = this.quests.find(q => q.id === questId);
                                                                                                                                                                                                                                                                                                          if (!quest || quest.state !== 'active') return;

                                                                                                                                                                                                                                                                                                              if (quest.targetCount) {
                                                                                                                                                                                                                                                                                                                    quest.currentProgress = Math.min(quest.targetCount, (quest.currentProgress || 0) + delta);
                                                                                                                                                                                                                                                                                                                          if (quest.currentProgress >= quest.targetCount) {
                                                                                                                                                                                                                                                                                                                                  quest.state = 'completed';
                                                                                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                                                                                            } else {
                                                                                                                                                                                                                                                                                                                                                  quest.state = 'completed';
                                                                                                                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                                                                                                                        }

                                                                                                                                                                                                                                                                                                                                                          public setActiveQuest(questId: string) {
                                                                                                                                                                                                                                                                                                                                                              const q = this.quests.find(q => q.id === questId);
                                                                                                                                                                                                                                                                                                                                                                  if (q && q.state === 'active' || q?.state === 'available') {
                                                                                                                                                                                                                                                                                                                                                                        if (q.state === 'available') q.state = 'active';
                                                                                                                                                                                                                                                                                                                                                                              this.activeQuestId = questId;
                                                                                                                                                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                                                                                    