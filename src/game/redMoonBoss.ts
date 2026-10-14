import * => THREE from 'three';

export class RedMoonEventSystem {
  private redMoonActive: boolean = false;
  private timeSinceLastEvent: number = 0;

  public checkNightTransition(isNight: boolean): boolean {
    if (isNight) {
      this.timeSinceLastEvent += 1;
      if (this.timeSinceLastEvent >= 3 || Math.random() < 0.4) {
        this.redMoonActive = true;
        return true;
      }
    } else {
      this.redMoonActive = false;
    }
    return false;
  }

  public forceTriggerRedMoon() {
    this.redMoonActive = true;
  }

  public isActive(): boolean {
    return this.redMoonActive;
  }
}

export class CrimsonWardenBoss {
  public health: number = 2500;
  public maxHealth: number = 2500;
  public name: string = 'The Crimson Warden';
  public active: boolean = false;

  public spawn() {
    this.active = true;
    this.health = this.maxHealth;
  }
}
