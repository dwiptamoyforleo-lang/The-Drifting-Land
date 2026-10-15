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
  public onPlantHarvested?: (itemId: string, count: number) => void;

  private bannerTimer: number = 0;
  private currentBanner: { title: string; subtitle: string; icon?: string } | null = null;
  private activeInscription: { title: string; text: string } | null = null;
  private activeDialogue: DialogueNode | null = null;

  private proximityTimer: number = 0;

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

    // Throttle proximity scanning to 20 Hz (50ms) to prevent per-frame loop overhead
    this.proximityTimer += delta;
    if (this.proximityTimer < 0.05) return;
    this.proximityTimer = 0;

    // Check distances to interactables using zero-allocation scalar math
    const px = this.player.position.x;
    const py = this.player.position.y;
    const pz = this.player.position.z;

    const minDistanceSq = this.interactionRange * this.interactionRange;
    let bestType: 'checkpoint' | 'npc' | 'resource' | 'anchor' | 'fragment' | 'inscription' | null = null;
    let bestIndex = -1;
    let bestDistSq = minDistanceSq;

    // 1. Checkpoints
    const checkpoints = this.world.checkpoints;
    for (let i = 0; i < checkpoints.length; i++) {
      const pos = checkpoints[i].position;
      const dx = px - pos[0];
      const dy = py - pos[1];
      const dz = pz - pos[2];
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestType = 'checkpoint';
        bestIndex = i;
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
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestType = 'npc';
        bestIndex = i;
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
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestType = 'resource';
        bestIndex = i;
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
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestType = 'anchor';
        bestIndex = i;
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
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestType = 'fragment';
        bestIndex = i;
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
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestType = 'inscription';
        bestIndex = i;
      }
    }

    // 7. Custom Plants
    if (this.world.plantsManager && this.world.plantsManager.plants) {
      const plants = this.world.plantsManager.plants;
      for (let i = 0; i < plants.length; i++) {
        const pl = plants[i];
        if (pl.isHarvested) continue;
        const dx = px - pl.position[0];
        const dy = py - pl.position[1];
        const dz = pz - pl.position[2];
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestType = 'resource';
          bestIndex = 1000 + i;
        }
      }
    }

    // 8. Moon Deer (Sacred Non-Harmful Encounter)
    if (this.world.creaturesManager && !this.world.creaturesManager.moonDeerStudied) {
      const mPos = this.world.creaturesManager.moonDeerPosition;
      const dx = px - mPos.x;
      const dy = py - mPos.y;
      const dz = pz - mPos.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < bestDistSq && distSq < 16.0) {
        bestDistSq = distSq;
        bestType = 'npc';
        bestIndex = 9999;
      }
    }

    if (bestType === null) {
      if (this.currentTarget !== null) {
        this.currentTarget = null;
        this.emitState();
      }
      return;
    }

    const dist = Math.sqrt(bestDistSq);

    if (bestType === 'checkpoint') {
      const cp = checkpoints[bestIndex];
      const nextPrompt = cp.activated ? 'Checkpoint Active' : `Activate ${cp.name}`;
      if (!this.currentTarget || this.currentTarget.id !== cp.id || this.currentTarget.prompt !== nextPrompt) {
        this.currentTarget = {
          id: cp.id,
          type: 'checkpoint',
          title: cp.name,
          prompt: nextPrompt,
          distance: dist,
          position: new THREE.Vector3(cp.position[0], cp.position[1], cp.position[2]),
          onInteract: () => this.handleCheckpointInteract(cp.id),
        };
        this.emitState();
      } else {
        this.currentTarget.distance = dist;
      }
    } else if (bestType === 'npc') {
      if (bestIndex === 9999) {
        const nextPrompt = 'Commune with Celestial Moon Deer';
        if (!this.currentTarget || this.currentTarget.id !== 'moon-deer' || this.currentTarget.prompt !== nextPrompt) {
          this.currentTarget = {
            id: 'moon-deer',
            type: 'npc',
            title: 'Moon Deer',
            prompt: nextPrompt,
            distance: dist,
            position: this.world.creaturesManager!.moonDeerPosition.clone(),
            onInteract: () => this.handleMoonDeerInteract(),
          };
          this.emitState();
        } else {
          this.currentTarget.distance = dist;
        }
      } else {
        const npc = npcs[bestIndex];
        const nextPrompt = `Speak with ${npc.name} (${npc.role})`;
        if (!this.currentTarget || this.currentTarget.id !== npc.id || this.currentTarget.prompt !== nextPrompt) {
          const nx = npc.mesh ? npc.mesh.position.x : npc.position[0];
          const ny = npc.mesh ? npc.mesh.position.y : npc.position[1];
          const nz = npc.mesh ? npc.mesh.position.z : npc.position[2];
          this.currentTarget = {
            id: npc.id,
            type: 'npc',
            title: npc.name,
            prompt: nextPrompt,
            distance: dist,
            position: new THREE.Vector3(nx, ny, nz),
            onInteract: () => this.handleNpcInteract(npc.id),
          };
          this.emitState();
        } else {
          this.currentTarget.distance = dist;
        }
      }
    } else if (bestType === 'resource') {
      if (bestIndex >= 1000) {
        const p = this.world.plantsManager!.plants[bestIndex - 1000];
        const nextPrompt = `Harvest ${p.name}`;
        if (!this.currentTarget || this.currentTarget.id !== p.id || this.currentTarget.prompt !== nextPrompt) {
          this.currentTarget = {
            id: p.id,
            type: 'resource',
            title: p.name,
            prompt: nextPrompt,
            distance: dist,
            position: new THREE.Vector3(p.position[0], p.position[1], p.position[2]),
            onInteract: () => this.handlePlantInteract(p.id),
          };
          this.emitState();
        } else {
          this.currentTarget.distance = dist;
        }
      } else {
        const res = resources[bestIndex];
        const nextPrompt = `Harvest ${res.name} (+${res.coinValue}c)`;
        if (!this.currentTarget || this.currentTarget.id !== res.id || this.currentTarget.prompt !== nextPrompt) {
          this.currentTarget = {
            id: res.id,
            type: 'resource',
            title: res.name,
            prompt: nextPrompt,
            distance: dist,
            position: new THREE.Vector3(res.position[0], res.position[1], res.position[2]),
            onInteract: () => this.handleResourceInteract(res.id),
          };
          this.emitState();
        } else {
          this.currentTarget.distance = dist;
        }
      }
    } else if (bestType === 'anchor') {
      const a = anchors[bestIndex];
      const nextPrompt = a.activated ? 'Anchor Harmonized' : 'Attune Ancient Anchor';
      if (!this.currentTarget || this.currentTarget.id !== a.id || this.currentTarget.prompt !== nextPrompt) {
        this.currentTarget = {
          id: a.id,
          type: 'anchor',
          title: a.name,
          prompt: nextPrompt,
          distance: dist,
          position: new THREE.Vector3(a.position[0], a.position[1], a.position[2]),
          onInteract: () => this.handleAnchorInteract(a.id),
        };
        this.emitState();
      } else {
        this.currentTarget.distance = dist;
      }
    } else if (bestType === 'fragment') {
      const f = fragments[bestIndex];
      const nextPrompt = 'Absorb World Fragment';
      if (!this.currentTarget || this.currentTarget.id !== f.id || this.currentTarget.prompt !== nextPrompt) {
        this.currentTarget = {
          id: f.id,
          type: 'fragment',
          title: f.name,
          prompt: nextPrompt,
          distance: dist,
          position: new THREE.Vector3(f.position[0], f.position[1], f.position[2]),
          onInteract: () => this.handleFragmentInteract(f.id),
        };
        this.emitState();
      } else {
        this.currentTarget.distance = dist;
      }
    } else if (bestType === 'inscription') {
      const ins = inscriptions[bestIndex];
      const nextPrompt = 'Read Ancient Inscription';
      if (!this.currentTarget || this.currentTarget.id !== ins.id || this.currentTarget.prompt !== nextPrompt) {
        this.currentTarget = {
          id: ins.id,
          type: 'inscription',
          title: ins.title,
          prompt: nextPrompt,
          distance: dist,
          position: new THREE.Vector3(ins.position[0], ins.position[1], ins.position[2]),
          onInteract: () => this.handleInscriptionInteract(ins.id),
        };
        this.emitState();
      } else {
        this.currentTarget.distance = dist;
      }
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

  private handlePlantInteract(plantId: string) {
    if (!this.world.plantsManager) return;
    const result = this.world.plantsManager.harvestPlant(plantId);
    if (result.success) {
      soundSystem.playPlantHarvest();
      this.showToast('HARVEST SUCCESS', `${result.name} gathered (+${result.count})`);
      if (this.onPlantHarvested) {
        this.onPlantHarvested(result.itemId, result.count);
      }
    } else {
      this.showToast('HARVEST NOTICE', result.message);
    }
    this.currentTarget = null;
    this.emitState();
  }

  private handleMoonDeerInteract() {
    if (!this.world.creaturesManager) return;
    const result = this.world.creaturesManager.communeWithMoonDeer();
    if (result.success) {
      soundSystem.playRareItemDrop();
      this.showToast('SACRED COMMUNION', result.message);
      if (this.onPlantHarvested) {
        this.onPlantHarvested(result.itemId, 1);
      }
    } else {
      this.showToast('RESEARCH NOTICE', result.message);
    }
    this.currentTarget = null;
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
