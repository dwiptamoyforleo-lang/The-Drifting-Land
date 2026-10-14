import { WorldManager } from './world';
import { ThreadManager } from './threads';
import { PlayerController } from './player';

export class InteractionManager {
  private world: WorldManager;
  private player: PlayerController;
  public currentPrompt: string | null = null;
  private toastMessage: string | null = null;

  constructor(world: WorldManager, threads: ThreadManager, player: PlayerController) {
    this.world = world;
    this.player = player;
  }

  public update(delta: number) {
    // Check proximity to anchors or NPCs
    const pPos = this.player.position;
    for (const anchor of this.world.anchors) {
      const dist = pPos.distanceTo({ x: anchor.position[0], y: anchor.position[1], z: anchor.position[2] } as THREE.Vector3);
      if (dist < 4.0 && !anchor.activated) {
        this.currentPrompt = `Press E to Harmonize ${anchor.name}`;
        return;
      }
    }
    this.currentPrompt = null;
  }

  public triggerCurrentInteract() {
    if (this.currentPrompt) {
      this.showToast('HARMONIZED', 'Magical Anchor successfully attuned!');
    }
  }

  public showToast(title: string, msg: string) {
    this.toastMessage = `${title}: ${msg}`;
    setTimeout(() => {
      this.toastMessage = null;
    }, 3500);
  }
}
