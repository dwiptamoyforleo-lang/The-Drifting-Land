/**
 * Reusable Interaction & Discovery Management System for The Drifting Land.
 * Enforces:
 * - Robust proximity detection with contextual prompt generation
 * - Unified execution across keyboard [E], mouse click, and touch action
 * - Mutex lock & debouncing to completely eliminate duplicate executions
 * - Immediate success & failure audio/visual feedback
 * - Comprehensive Checkpoint attunement with respawn anchor binding
 * - Discovery tracking with persistent collection records & notification toasts
 */

import * as THREE from 'three';
import {
  InteractableType,
  InteractionPrompt,
  SaveData,
  DiscoveryDefinition,
} from '../types/game';
import { DISCOVERIES_CATALOG } from '../data/discoveries';
import { AudioService } from '../services/audio';
import { NotificationSystem } from './notificationSystem';
import { InventorySystem } from './inventorySystem';
import { QuestSystem } from './questSystem';
import { CheckpointSystem } from './checkpointSystem';
import { StructuresManager, RuntimeStructure } from '../engine/structures';

export interface InteractionTarget {
  id: string;
  name: string;
  type: InteractableType;
  position: THREE.Vector3;
  interactionRadius: number;
  promptText: string;
  action: () => boolean; // returns true if succeeded, false if failed
}

export class InteractionSystem {
  private activePrompt: InteractionPrompt | null = null;
  private currentTarget: InteractionTarget | null = null;
  private isInteracting: boolean = false;
  private lastInteractTimestamp: number = 0;
  private readonly INTERACTION_COOLDOWN_MS = 380; // 380ms debouncing guard

  // Callbacks
  public onPromptChange?: (prompt: string | null) => void;
  public onCameraShake?: (intensity: number) => void;
  public onSaveRequested?: () => void;
  public onTeleportRequested?: (x: number, y: number, z: number) => void;

  constructor(
    private save: SaveData,
    private inventory: InventorySystem,
    private quests: QuestSystem,
    private checkpoints: CheckpointSystem,
    private structures: StructuresManager
  ) {}

  /**
   * Evaluate all nearby interactables against player position
   */
  public update(playerPos: THREE.Vector3): InteractionPrompt | null {
    let nearest: InteractionTarget | null = null;
    let minDistance = Infinity;

    // 1. Structures from StructuresManager
    this.structures.structures.forEach((struct) => {
      const pos = new THREE.Vector3(...struct.position);
      const dist = playerPos.distanceTo(pos);

      if (dist <= struct.interactionRadius && dist < minDistance) {
        minDistance = dist;
        nearest = {
          id: struct.id,
          name: struct.name,
          type: struct.type as InteractableType,
          position: pos,
          interactionRadius: struct.interactionRadius,
          promptText: struct.promptText,
          action: () => this.handleStructureInteraction(struct),
        };
      }
    });

    if (nearest) {
      this.currentTarget = nearest;
      const target = nearest as InteractionTarget;
      const prompt: InteractionPrompt = {
        id: target.id,
        name: target.name,
        type: target.type,
        actionText: target.promptText,
        keyHint: '[E] or Action',
        distance: minDistance,
      };

      if (!this.activePrompt || this.activePrompt.id !== prompt.id || this.activePrompt.actionText !== prompt.actionText) {
        this.activePrompt = prompt;
        this.onPromptChange?.(prompt.actionText);
      }
      return prompt;
    } else {
      if (this.activePrompt !== null) {
        this.activePrompt = null;
        this.currentTarget = null;
        this.onPromptChange?.(null);
      }
      return null;
    }
  }

  /**
   * Execute interaction on current target with debounce lock
   */
  public executeInteraction(): boolean {
    const now = Date.now();
    if (this.isInteracting || now - this.lastInteractTimestamp < this.INTERACTION_COOLDOWN_MS) {
      return false; // Prevent multi-execution/rapid input race conditions
    }

    if (!this.currentTarget) {
      return false;
    }

    this.isInteracting = true;
    this.lastInteractTimestamp = now;

    try {
      const success = this.currentTarget.action();
      if (success) {
        this.onSaveRequested?.();
      }
      return success;
    } finally {
      setTimeout(() => {
        this.isInteracting = false;
      }, 150);
    }
  }

  /**
   * Route structure specific interactions
   */
  private handleStructureInteraction(struct: RuntimeStructure): boolean {
    switch (struct.type) {
      case 'CHECKPOINT_BEACON':
        return this.handleBeaconActivation(struct);

      case 'RUINED_TOWER':
        return this.handleRuinedTower(struct);

      case 'HIDDEN_CHAMBER':
        return this.handleHiddenChamber(struct);

      case 'ABANDONED_SETTLEMENT':
        return this.handleAbandonedSettlement(struct);

      case 'RESEARCH_CAMP':
        return this.handleResearchCamp(struct);

      case 'LOCKED_DOOR':
        return this.handleLockedDoor(struct);

      case 'RESOURCE_DEPOSIT':
        return this.handleResourceDeposit(struct);

      case 'DIMENSIONAL_GATEWAY':
        return this.handleDimensionalGateway(struct);

      default:
        return false;
    }
  }

  /**
   * 1. Checkpoint Ancient Beacon Attunement
   */
  private handleBeaconActivation(struct: RuntimeStructure): boolean {
    const cpId = struct.id;
    const isAlreadyAttuned = this.save.activatedCheckpoints.includes(cpId);

    // Save identity and location, update respawn anchor
    this.checkpoints.activateCheckpoint(cpId);
    if (!this.save.activatedCheckpoints.includes(cpId)) {
      this.save.activatedCheckpoints.push(cpId);
    }
    this.save.activeCheckpointId = cpId;

    // Audio & Screen shake
    AudioService.playBeaconActivate();
    this.onCameraShake?.(0.65);

    // Record discovery
    const discId = cpId === 'cp_eastern_ridge' ? 'disc_beacon_promontory' : 'disc_beacon_sanctum';
    this.recordDiscovery(discId);

    // Toast feedback
    NotificationSystem.notify(
      'Ancient Beacon Attuned',
      `Sanctuary bound at ${struct.name}. Safe respawn anchor established.`,
      'discovery',
      5500
    );

    struct.promptText = `${struct.name} Attuned`;
    this.onPromptChange?.(struct.promptText);
    return true;
  }

  /**
   * 2. Ruined Watchtower Summit Astrolabe
   */
  private handleRuinedTower(struct: RuntimeStructure): boolean {
    AudioService.playRelicCollect();
    this.onCameraShake?.(0.4);

    const hasLens = this.inventory.hasItem('astrolabe_lens', 1);
    if (!hasLens) {
      this.inventory.addItem('astrolabe_lens', 1, false);
      NotificationSystem.notify('Vantage Overlook Discovered', 'Obtained Sunward Astrolabe Lens!', 'relic');
    }

    this.recordDiscovery('disc_ruined_tower');
    return true;
  }

  /**
   * 3. Hidden Chamber (Concealed Subterranean Vault)
   */
  private handleHiddenChamber(struct: RuntimeStructure): boolean {
    const isDiscovered = this.save.discoveredChambers.includes('hidden_chamber');

    if (!isDiscovered) {
      // Dissolve the illusory wall
      this.save.discoveredChambers.push('hidden_chamber');
      this.structures.triggerDissolveHiddenWall();
      AudioService.playDoorUnlock();
      this.onCameraShake?.(0.6);

      this.recordDiscovery('disc_hidden_chamber');
      NotificationSystem.notify(
        'Hidden Chamber Unveiled',
        'The cracked runic barrier dissolves into glittering stardust!',
        'discovery',
        6000
      );
      return true;
    } else {
      // Pick up the Codex of the First Drift if not yet collected
      const hasCodex = this.inventory.hasItem('codex_first_drift', 1);
      if (!hasCodex) {
        this.inventory.addItem('codex_first_drift', 1, false);
        this.inventory.addCoins(100);
        AudioService.playRelicCollect();
        this.onCameraShake?.(0.3);
        NotificationSystem.notify(
          'Ancient Relic Retrieved',
          'Acquired Codex of the First Drift & 100 Sunstone Coins',
          'relic',
          6000
        );
        return true;
      } else {
        NotificationSystem.notify(
          'Sanctum Echoes',
          'The ancient altar hums quietly with pre-drift hymns.',
          'info'
        );
        AudioService.playUiClick();
        return true;
      }
    }
  }

  /**
   * 4. Abandoned Settlement (Pioneer Homestead)
   */
  private handleAbandonedSettlement(struct: RuntimeStructure): boolean {
    const hasLedger = this.inventory.hasItem('settlement_ledger', 1);
    if (!hasLedger) {
      this.inventory.addItem('settlement_ledger', 1, false);
      this.inventory.addItem('traveler_rations', 2);
      this.inventory.addItem('verdant_moss_fiber', 3);
      this.inventory.addCoins(45);
      AudioService.playRelicCollect();

      this.recordDiscovery('disc_abandoned_settlement');
      this.recordDiscovery('disc_settlement_ledger');
      NotificationSystem.notify(
        'Homestead Ledger Recovered',
        'Pioneer diary salvaged alongside rations and supplies.',
        'item',
        6000
      );
      return true;
    } else {
      AudioService.playUiClick();
      NotificationSystem.notify(
        'Hollow Drift Homestead',
        'Weathered timber and stone hearth, sheltered from high winds.',
        'info'
      );
      return true;
    }
  }

  /**
   * 5. Research Camp (Surveyor Kaelen's Outpost)
   */
  private handleResearchCamp(struct: RuntimeStructure): boolean {
    AudioService.playUiClick();
    this.recordDiscovery('disc_research_camp');

    const hasTonic = this.inventory.hasItem('aether_surge_tonic', 1);
    if (!hasTonic) {
      this.inventory.addItem('aether_surge_tonic', 1);
      NotificationSystem.notify(
        'Field Notes Examined',
        'Studied cartographic drift charts. Obtained Aether Surge Tonic!',
        'item',
        5000
      );
    } else {
      NotificationSystem.notify(
        "Cartographer's Charts",
        'Survey records confirm subtle gravitational shifts during Red Moon nights.',
        'info'
      );
    }
    return true;
  }

  /**
   * 6. Locked Door (Antiquity Sanctum Gate)
   */
  private handleLockedDoor(struct: RuntimeStructure): boolean {
    const isUnlocked = this.save.unlockedDoors.includes('sanctum_arch_gate');
    if (isUnlocked) {
      NotificationSystem.notify('Sanctum Gate', 'The massive stone portcullis is open.', 'info');
      AudioService.playUiClick();
      return true;
    }

    const hasKey = this.inventory.hasItem('sanctum_key', 1);
    if (!hasKey) {
      // Failure feedback
      AudioService.playDoorLocked();
      this.onCameraShake?.(0.2);
      NotificationSystem.notify(
        'Gate Firmly Locked',
        'Requires Sanctum Rune Key. Search the ruins of Hollow Drift homestead!',
        'danger',
        5000
      );
      return false;
    }

    // Success unlock!
    this.save.unlockedDoors.push('sanctum_arch_gate');
    this.structures.triggerUnlockDoor();
    AudioService.playDoorUnlock();
    this.onCameraShake?.(0.5);

    this.recordDiscovery('disc_locked_door');
    NotificationSystem.notify(
      'Sanctum Gate Unlocked',
      'The ancient runic key turns! Heavy stone pillars grind into the foundation.',
      'discovery',
      6000
    );
    return true;
  }

  /**
   * 7. Resource Deposits (Lumicite & Aetherium)
   */
  private handleResourceDeposit(struct: RuntimeStructure): boolean {
    const depositId = struct.id;
    const now = Date.now();
    const lastHarvest = this.save.harvestedDeposits[depositId] || 0;
    const cooldownDuration = 30000; // 30 second node respawn cooldown

    if (now - lastHarvest < cooldownDuration) {
      const remainingSec = Math.ceil((cooldownDuration - (now - lastHarvest)) / 1000);
      AudioService.playDoorLocked();
      NotificationSystem.notify(
        'Deposit Depleted',
        `Mineral resonance recharging... Available in ${remainingSec}s`,
        'info',
        3000
      );
      return false;
    }

    // Success mining!
    this.save.harvestedDeposits[depositId] = now;
    AudioService.playMiningHit();
    this.onCameraShake?.(0.25);

    if (depositId === 'res_lumicite_vein') {
      const qty = Math.floor(Math.random() * 2) + 2; // 2-3 crystals
      this.inventory.addItem('lumicite_shard', qty);
      this.quests.reportProgress('COLLECT', 'lumicite_shard', qty);
      this.recordDiscovery('disc_lumicite_vein');
      NotificationSystem.notify('Mined Lumicite', `Obtained ${qty}x Lumicite Crystals!`, 'item');
    } else {
      const qty = Math.floor(Math.random() * 2) + 2; // 2-3 ore
      this.inventory.addItem('aetherium_ore', qty);
      this.quests.reportProgress('COLLECT', 'aetherium_ore', qty);
      this.recordDiscovery('disc_aetherium_deposit');
      NotificationSystem.notify('Mined Aetherium', `Obtained ${qty}x Raw Aetherium Ore!`, 'item');
    }

    return true;
  }

  /**
   * 8. Dimensional Gateway (Arch of Astral Conflux)
   */
  private handleDimensionalGateway(struct: RuntimeStructure): boolean {
    AudioService.playGatewayTeleport();
    this.onCameraShake?.(0.9);

    this.recordDiscovery('disc_dimensional_gateway');
    NotificationSystem.notify(
      'Dimensional Gateway Traversed',
      'Spatial conflux folds the sky! Translocated across the archipelago.',
      'discovery',
      5500
    );

    // Teleport player to the high Promontory Watchtower or Shattered Rift Island
    this.onTeleportRequested?.(38, 12, 25);
    return true;
  }

  /**
   * Record a discovery with rewards, notifications, and persistent tracking
   */
  public recordDiscovery(discoveryId: string): void {
    if (this.save.discoveries.includes(discoveryId)) {
      return; // Already discovered
    }

    const def = DISCOVERIES_CATALOG[discoveryId];
    this.save.discoveries.push(discoveryId);

    // Audio fanfare
    AudioService.playDiscoveryFanfare();

    // Reward XP
    if (def?.experienceReward) {
      NotificationSystem.notify(
        `Discovery: ${def.name}`,
        `${def.subtitle} · +${def.experienceReward} XP`,
        'discovery',
        6000
      );
    } else if (def) {
      NotificationSystem.notify(`Discovered: ${def.name}`, def.subtitle, 'discovery', 5000);
    }

    // Quest & Exploration progression triggers
    this.quests.reportProgress('DISCOVER', discoveryId, 1);
    this.quests.addExplorationXp(def?.experienceReward || 50);

    if (discoveryId.includes('chamber')) {
      this.quests.reportProgress('ENTER_CHAMBER', discoveryId, 1);
    }
    if (discoveryId.includes('record') || discoveryId.includes('ledger') || discoveryId.includes('cataclysm')) {
      this.quests.reportProgress('READ_RECORD', discoveryId, 1);
    }
    if (discoveryId.includes('gateway') || discoveryId.includes('portal')) {
      this.quests.reportProgress('DISCOVER_PORTAL', discoveryId, 1);
    }
    if (discoveryId.includes('rift') || discoveryId.includes('disturbance')) {
      this.quests.reportProgress('LOCATE_DISTURBANCE', discoveryId, 1);
    }

    this.onSaveRequested?.();
  }
}
