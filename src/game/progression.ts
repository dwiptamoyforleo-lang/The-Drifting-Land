export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  icon: string;
}

export class ProgressionManager {
  public explorationRank: number = 1;
  public discoveriesCount: number = 0;
  public creatureResearch: string[] = [];
  public plantCollection: string[] = [];
  public bossRecords: string[] = [];
  public dimensionCompletions: number[] = [];

  public badges: AchievementBadge[] = [
    { id: 'first_checkpoint', name: 'First Checkpoint', description: 'Activate your initial check-in beacon.', unlocked: true, icon: 'compass' },
    { id: 'five_plants', name: 'Botanist', description: 'Discover five unique plant species.', unlocked: false, icon: 'tree-pine' },
    { id: 'red_moon_event', name: 'Crimson Eclipse', description: 'Encounter the Red Moon phenomenon.', unlocked: false, icon: 'sparkles' },
    { id: 'defeat_boss', name: 'Warden Bane', description: 'Defeat the Crimson Warden boss.', unlocked: false, icon: 'shield' },
  ];

  public unlockBadge(badgeId: string) {
    const badge = this.badges.find(b => b.id === badgeId);
    if (badge && !badge.unlocked) {
      badge.unlocked = true;
      this.explorationRank += 1;
    }
  }
}
