/**
 * Interaction system for The Drifting World.
 * Detects nearby interactables (Anchors, Fragments, Inscriptions, Citadel Core)
 * and triggers contextual actions.
 */
import * as THREE from 'three';
import { WorldManager } from './world';
import { ThreadManager } from './threads';
import { PlayerController } from './player';
import { InteractableObject, DialogueNode, HarvestableResource, WorldCheckpoint } from './types';
import { soundSystem } from './audio';

export interface InteractionState {
  currentPrompt: InteractableObject | null;
  activeInscription: { title: string; text: string } | null;
  activeDialogue: DialogueNode | null;
  bannerToast: { title: string; subtitle: string; icon?: string } | null;
}

export class InteractionManager {
  private world: WorldManager;
  private threads: ThreadManager;
  private player: PlayerController;

  public currentTarget: InteractableObject | null = null;
  public interactionRange: number = 3.6;

  // Callbacks to UI
  public onStateChange?: (state: InteractionState) => void;
  public onAnchorAttuned?: (anchorId: string) => void;
  public onFragmentFound?: (fragmentId: string) => void;
  public onResonanceUnlocked?: () => void;
  public onNpcTalk?: (dialogue: DialogueNode) => void;
  public onResourceHarvested?: (resource: HarvestableResource) => void;
  public onCheckpointActivated?: (checkpoint: WorldCheckpoint) => void;

  private bannerTimer: number = 0;
  private currentBanner: { title: string; subtitle: string; icon?: string } | null = null;
  private activeInscription: { title: string; text: string } | null = null;
  private activeDialogue: DialogueNode | null = null;

  constructor(world: WorldManager, threads: ThreadManager, player: PlayerController) {
    this.world = world;
    this.threads = threads;
    this.player = player;
  }

  public update(delta: number) {
    // Decay banner toast
    if (this.bannerTimer > 0) {
      this.bannerTimer -= delta;
      if (this.bannerTimer <= 0) {
        this.currentBanner = null;
        this.emitState();
      }
    }

    // Check distances to interactables using zero-allocation scalar math
    const px = this.player.position.x;
    const py = this.player.position.y;
    const pz = this.player.position.z;

    let closestTarget: InteractableObject | null = null;
    let minDistanceSq = this.interactionRange * this.interactionRange;

    // 1. Checkpoints
    const checkpoints = this.world.checkpoints;
    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      const pos = cp.position;
      const dx = px - pos[0];
      const dy = py - pos[1];
      const dz = pz - pos[2];
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        const dist = Math.sqrt(distSq);
        closestTarget = {
          id: cp.id,
          type: 'checkpoint',
          title: cp.name,
          prompt: cp.activated ? 'Checkpoint Active' : `Activate ${cp.name}`,
          distance: dist,
          position: new THREE.Vector3(pos[0], pos[1], pos[2]),
          onInteract: () => this.handleCheckpointInteract(cp.id),
        };
      }
    }

    // 2. NPCs / Survivors
    const npcs = this.world.npcs;
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const nx = npc.mesh ? npc.mesh.position.x : npc.position[0];
      const ny = npc.mesh ? npc.mesh.position.y : npc.position[1];
      const nz = npc.mesh ? npc.mesh.position.z : npc.position[2];
      const dx = px - nx;
      const dy = py - ny;
      const dz = pz - nz;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        const dist = Math.sqrt(distSq);
        closestTarget = {
          id: npc.id,
          type: 'npc',
          title: npc.name,
          prompt: `Speak with ${npc.name} (${npc.role})`,
          distance: dist,
          position: new THREE.Vector3(nx, ny, nz),
          onInteract: () => this.handleNpcInteract(npc.id),
        };
      }
    }

    // 3. Harvestable Resources
    const resources = this.world.resources;
    for (let i = 0; i < resources.length; i++) {
      const res = resources[i];
      if (res.collected) continue;
      const pos = res.position;
      const dx = px - pos[0];
      const dy = py - pos[1];
      const dz = pz - pos[2];
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        const dist = Math.sqrt(distSq);
        closestTarget = {
          id: res.id,
          type: 'resource',
          title: res.name,
          prompt: `Harvest ${res.name} (+${res.coinValue}c)`,
          distance: dist,
          position: new THREE.Vector3(pos[0], pos[1], pos[2]),
          onInteract: () => this.handleResourceInteract(res.id),
        };
      }
    }

    // 4. Anchors
    const anchors = this.world.anchors;
    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];
      const pos = anchor.position;
      const dx = px - pos[0];
      const dy = py - pos[1];
      const dz = pz - pos[2];
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        const dist = Math.sqrt(distSq);
        closestTarget = {
          id: anchor.id,
          type: 'anchor',
          title: anchor.name,
          prompt: anchor.activated ? 'Anchor Harmonized' : 'Attune Ancient Anchor',
          distance: dist,
          position: new THREE.Vector3(pos[0], pos[1], pos[2]),
          onInteract: () => this.handleAnchorInteract(anchor.id),
        };
      }
    }

    // 5. World Fragments
    const fragments = this.world.fragments;
    for (let i = 0; i < fragments.length; i++) {
      const frag = fragments[i];
      if (frag.collected) continue;
      const pos = frag.position;
      const dx = px - pos[0];
      const dy = py - pos[1];
      const dz = pz - pos[2];
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        const dist = Math.sqrt(distSq);
        closestTarget = {
          id: frag.id,
          type: 'fragment',
          title: frag.name,
          prompt: 'Absorb World Fragment',
          distance: dist,
          position: new THREE.Vector3(pos[0], pos[1], pos[2]),
          onInteract: () => this.handleFragmentInteract(frag.id),
        };
      }
    }

    // 6. Inscription Steles
    const inscriptions = this.world.inscriptions;
    for (let i = 0; i < inscriptions.length; i++) {
      const insc = inscriptions[i];
      const pos = insc.position;
      const dx = px - pos[0];
      const dy = py - pos[1];
      const dz = pz - pos[2];
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        const dist = Math.sqrt(distSq);
        closestTarget = {
          id: insc.id,
          type: 'inscription',
          title: insc.title,
          prompt: 'Read Ancient Inscription',
          distance: dist,
          position: new THREE.Vector3(pos[0], pos[1], pos[2]),
          onInteract: () => this.handleInscriptionInteract(insc.id),
        };
      }
    }

    // If close enough and player auto-picks fragment or presses interact
    const currentTargetId = this.currentTarget ? this.currentTarget.id : null;
    const currentTargetPrompt = this.currentTarget ? this.currentTarget.prompt : null;
    const nextTargetId = closestTarget ? (closestTarget as InteractableObject).id : null;
    const nextTargetPrompt = closestTarget ? (closestTarget as InteractableObject).prompt : null;

    const targetChanged =
      nextTargetId !== currentTargetId ||
      nextTargetPrompt !== currentTargetPrompt;

    // Keep the freshest target/action without re-rendering the React HUD every frame.
    this.currentTarget = closestTarget;
    if (targetChanged) {
      this.emitState();
    }
  }

  public triggerCurrentInteract() {
    if (this.currentTarget) {
      this.currentTarget.onInteract();
    }
  }

  public closeInscription() {
    this.activeInscription = null;
    this.emitState();
  }

  public closeDialogue() {
    this.activeDialogue = null;
    this.emitState();
  }

  private handleCheckpointInteract(checkpointId: string) {
    const cp = this.world.checkpoints.find(c => c.id === checkpointId);
    if (!cp) return;

    cp.activated = true;
    this.player.setCheckpoint(new THREE.Vector3(...cp.position));
    soundSystem.playCheckpointActivated();

    if (cp.light) {
      cp.light.color.setHex(0x38bdf8);
      cp.light.intensity = 4.0;
    }

    this.showToast('CHECKPOINT SYNCHRONIZED', `${cp.name} is now your active recall matrix.`, 4.0);

    if (this.onCheckpointActivated) {
      this.onCheckpointActivated(cp);
    }

    this.emitState();
  }

  private handleResourceInteract(resourceId: string) {
    const res = this.world.resources.find(r => r.id === resourceId);
    if (!res || res.collected) return;

    res.collected = true;
    if (res.mesh) {
      res.mesh.visible = false;
    }

    soundSystem.playHarvestTone();
    this.showToast('RESOURCE HARVESTED', `Acquired ${res.name} (+${res.coinValue} Coins, +${res.xpValue} XP)`);

    if (this.onResourceHarvested) {
      this.onResourceHarvested(res);
    }

    this.currentTarget = null;
    this.emitState();
  }

  private handleNpcInteract(npcId: string) {
    const npc = this.world.npcs.find(n => n.id === npcId);
    if (!npc) return;

    soundSystem.playDialogueBeep();
    this.activeDialogue = npc.dialogue;
    if (this.onNpcTalk) {
      this.onNpcTalk(npc.dialogue);
    }
    this.emitState();
  }

  private handleAnchorInteract(anchorId: string) {
    const anchor = this.world.anchors.find(a => a.id === anchorId);
    if (!anchor) return;

    if (anchor.activated) {
      this.showToast(anchor.name, 'Already vibrating in celestial resonance.');
      return;
    }

    anchor.activated = true;
    soundSystem.playAnchorAttuned();

    // Checkpoint player at this safe anchor dais
    this.player.setCheckpoint(new THREE.Vector3(...anchor.position));

    // Increase crystal glow
    if (anchor.crystalMesh) {
      const mat = anchor.crystalMesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.4;
    }
    if (anchor.light) {
      anchor.light.intensity = 4.0;
    }

    this.showToast('Anchor Attuned', `${anchor.name} is now humming with spatial intent.`);

    if (this.onAnchorAttuned) {
      this.onAnchorAttuned(anchor.id);
    }

    // Evaluate Resonance Thread
    const resonanceTriggered = this.threads.evaluateResonance(this.world.anchors);
    if (resonanceTriggered) {
      this.world.revealResonanceCitadel();
      this.showToast('RESONANCE AWAKENED', 'The Drifting Citadel rises from the turquoise deep!', 6.0);
      if (this.onResonanceUnlocked) {
        this.onResonanceUnlocked();
      }
    }

    this.emitState();
  }

  private handleFragmentInteract(fragmentId: string) {
    const frag = this.world.fragments.find(f => f.id === fragmentId);
    if (!frag || frag.collected) return;

    frag.collected = true;
    if (frag.mesh) {
      frag.mesh.visible = false;
    }

    soundSystem.playFragmentCollected();
    this.showToast('World Fragment Recovered', `Discovered: ${frag.name}`);

    if (this.onFragmentFound) {
      this.onFragmentFound(frag.id);
    }

    this.currentTarget = null;
    this.emitState();
  }

  private handleInscriptionInteract(inscId: string) {
    const insc = this.world.inscriptions.find(i => i.id === inscId);
    if (!insc) return;

    soundSystem.playInscriptionTone();
    this.activeInscription = {
      title: insc.title,
      text: insc.text,
    };
    this.emitState();
  }

  public showToast(title: string, subtitle: string, durationSec: number = 3.5) {
    this.currentBanner = { title, subtitle };
    this.bannerTimer = durationSec;
    this.emitState();
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        currentPrompt: this.currentTarget,
        activeInscription: this.activeInscription,
        activeDialogue: this.activeDialogue,
        bannerToast: this.currentBanner,
      });
    }
  }
}
