/**
 * THE EXTREMELY RARE RED MOON & CRIMSON WARDEN BOSS ENCOUNTER
 * Implements persisted calendar tracking, probability rolls (1% per night), cooldowns,
 * developer force triggers, progressive boss phases, and duplicate reward protection.
 */

import * as THREE from 'three';

export interface RedMoonState {
  isActive: boolean;
  nightCount: number;
  lastTriggeredNight: number;
  bossDefeated: boolean;
  developerForced: boolean;
}

export class RedMoonEventSystem {
  private state: RedMoonState;
  private saveKey = 'the_drifting_world_red_moon_v1';

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): RedMoonState {
    try {
      const saved = localStorage.getItem(this.saveKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return {
      isActive: false,
      nightCount: 0,
      lastTriggeredNight: -10,
      bossDefeated: false,
      developerForced: false,
    };
  }

  public persistState() {
    try {
      localStorage.setItem(this.saveKey, JSON.stringify(this.state));
    } catch {
      // fallback
    }
  }

  public checkNightTransition(isNight: boolean): boolean {
    if (!isNight) {
      if (this.state.isActive && !this.state.developerForced) {
        this.state.isActive = false;
        this.persistState();
      }
      return false;
    }

    // Already active this night
    if (this.state.isActive) return true;

    this.state.nightCount++;

    // Cooldown check (minimum 4 in-game nights between occurrences)
    const nightsSinceLast = this.state.nightCount - this.state.lastTriggeredNight;
    if (nightsSinceLast < 4) {
      this.persistState();
      return false;
    }

    // ~1% probability roll per eligible night
    const roll = Math.random();
    if (roll < 0.01) {
      this.triggerRedMoon(false);
      return true;
    }

    this.persistState();
    return false;
  }

  public forceTriggerRedMoon() {
    this.triggerRedMoon(true);
  }

  private triggerRedMoon(forced: boolean) {
    this.state.isActive = true;
    this.state.lastTriggeredNight = this.state.nightCount;
    this.state.developerForced = forced;
    this.persistState();
  }

  public grantBossRewards(): { rewarded: boolean; items: string[] } {
    if (this.state.bossDefeated) {
      return { rewarded: false, items: [] }; // Prevent duplicate reward exploits
    }
    this.state.bossDefeated = true;
    this.persistState();
    return {
      rewarded: true,
      items: [
        'Crimson Core',
        'Obsidian Crystal Shard',
        'Relic of the Eclipse',
        'Collection Entry #108: The Crimson Warden',
      ],
    };
  }
}

export class CrimsonWardenBoss {
  public health: number = 2500;
  public maxHealth: number = 2500;
  public phase: number = 1;
  public isEncounterActive: boolean = false;
  public position: THREE.Vector3 = new THREE.Vector3(0, 10, -60);

  constructor() {}

  public initiateEncounter() {
    this.isEncounterActive = true;
    this.health = this.maxHealth;
    this.phase = 1;
  }

  public takeDamage(amount: number): { defeated: boolean; nextPhase: boolean } {
    this.health = Math.max(0, this.health - amount);
    let nextPhase = false;

    if (this.health <= 1250 && this.phase === 1) {
      this.phase = 2;
      nextPhase = true;
    }

    if (this.health === 0) {
      this.isEncounterActive = false;
      return { defeated: true, nextPhase };
    }
    return { defeated: false, nextPhase };
  }
}