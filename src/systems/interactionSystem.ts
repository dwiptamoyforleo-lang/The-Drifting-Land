/**
 * Reusable Interaction & Discovery Management System for The Drifting Land.
 * - Zero per-frame Vector3 allocations
 * - Syncs unlocked doors, discovered chambers, deposits, and beacons with WorldStateStore
 */

import * as THREE from 'three';
import {
  InteractableType,
  InteractionPrompt,
  SaveData,
} from '../types/game';
import { DISCOVERIES_CATALOG } from '../data/discoveries';
import { AudioService } from '../services/audio';
import { NotificationSystem } from './notificationSystem';
import { InventorySystem } from './inventorySystem';
import { QuestSystem } from './questSystem';
import { CheckpointSystem } from './checkpointSystem';
import { StructuresManager, RuntimeStructure } from '../engine/structures';
import { WorldStateStore } from '../services/worldStateStore';

export interface InteractionTarget {
  id: string;
  name: string;
  type: InteractableType;
  position: THREE.Vector3;
  interactionRadius: number;
  promptText: string;
  action: () => boolean;
}

const _tmpVec3 = new THREE.Vector3();

export class InteractionSystem {
  private activePrompt: InteractionPrompt | null = null;
  private currentTarget: InteractionTarget | null = null;
  private isInteracting: boolean = false;
  private lastInteractTimestamp: number = 0;
  private readonly INTERACTION_COOLDOWN_MS = 380;

  public onPromptChange?: (prompt: string | null) => void;
  public onCameraShake?: (intensity: number) => void;
  public onSaveRequested?: () => void;
  public onTeleportRequested?: (x: number, y: number, z: number) => void;

  constructor(
    private save: SaveData,
    private inventory: InventorySystem,
    private quests: QuestSystem,
    private checkpoints: CheckpointSystem,
    private structures: StructuresManager,
    private worldStateStore?: WorldStateStore,
    private regionId: string = 'verdant_reach'
  ) {}

  public setRegion(regionId: string): void {
    this.regionId = regionId;
  }

  private readonly cachedTargetPos = new THREE.Vector3();

  public update(playerPos: THREE.Vector3): InteractionPrompt | null {
    let nearestStruct: RuntimeStructure | null = null;
    let minDistance = Infinity;

    for (const struct of this.structures.structures.values()) {
      _tmpVec3.set(struct.position[0], struct.position[1], struct.position[2]);
      const dist = playerPos.distanceTo(_tmpVec3);

      if (dist <= struct.interactionRadius && dist < minDistance) {
        minDistance = dist;
        nearestStruct = struct;
      }
    }

    if (nearestStruct) {
      const s = nearestStruct;
      this.cachedTargetPos.set(s.position[0], s.position[1], s.position[2]);
      const target: InteractionTarget = {
        id: s.id,
        name: s.name,
        type: s.type as InteractableType,
        position: this.cachedTargetPos,
        interactionRadius: s.interactionRadius,
        promptText: s.promptText,
        action: () => this.handleStructureInteraction(s),
      };
      this.currentTarget = target;

      const prompt: InteractionPrompt = {
        id: s.id,
        name: s.name,
        type: s.type as InteractableType,
        actionText: s.promptText,
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

  public executeInteraction(): boolean {
    const now = Date.now();
    if (this.isInteracting || now - this.lastInteractTimestamp < this.INTERACTION_COOLDOWN_MS) {
      return false;
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

  private handleBeaconActivation(struct: RuntimeStructure): boolean {
    const cpId = struct.id;

    this.checkpoints.activateCheckpoint(cpId);
    if (!this.save.activatedCheckpoints.includes(cpId)) {
      this.save.activatedCheckpoints.push(cpId);
    }
    this.save.activeCheckpointId = cpId;
    this.worldStateStore?.markStructureActivated(
      this.regionId,
      struct.position[0],
      struct.position[2],
      cpId
    );

    AudioService.playBeaconActivate();
    this.onCameraShake?.(0.65);

    const discId = cpId === 'cp_eastern_ridge' ? 'disc_beacon_promontory' : 'disc_beacon_sanctum';
    this.recordDiscovery(discId);

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

  private handleRuinedTower(struct: RuntimeStructure): boolean {
    AudioService.playRelicCollect();
    this.onCameraShake?.(0.4);
    this.worldStateStore?.markStructureActivated(
      this.regionId,
      struct.position[0],
      struct.position[2],
      struct.id
    );

    const hasLens = this.inventory.hasItem('astrolabe_lens', 1);
    if (!hasLens) {
      this.inventory.addItem('astrolabe_lens', 1, false);
      NotificationSystem.notify('Vantage Overlook Discovered', 'Obtained Sunward Astrolabe Lens!', 'relic');
    }

    this.recordDiscovery('disc_ruined_tower');
    return true;
  }

  private handleHiddenChamber(struct: RuntimeStructure): boolean {
    const isDiscovered = this.save.discoveredChambers.includes('hidden_chamber');

    if (!isDiscovered) {
      this.save.discoveredChambers.push('hidden_chamber');
      this.worldStateStore?.markChamberDiscovered(
        this.regionId,
        struct.position[0],
        struct.position[2],
        'hidden_chamber'
      );
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

  private handleAbandonedSettlement(_struct: RuntimeStructure): boolean {
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

  private handleResearchCamp(_struct: RuntimeStructure): boolean {
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

  private handleLockedDoor(struct: RuntimeStructure): boolean {
    const isUnlocked = this.save.unlockedDoors.includes('sanctum_arch_gate');
    if (isUnlocked) {
      NotificationSystem.notify('Sanctum Gate', 'The massive stone portcullis is open.', 'info');
      AudioService.playUiClick();
      return true;
    }

    const hasKey = this.inventory.hasItem('sanctum_key', 1);
    if (!hasKey) {
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

    this.save.unlockedDoors.push('sanctum_arch_gate');
    this.worldStateStore?.markDoorUnlocked(
      this.regionId,
      struct.position[0],
      struct.position[2],
      'sanctum_arch_gate'
    );
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

  private handleResourceDeposit(struct: RuntimeStructure): boolean {
    const depositId = struct.id;
    const now = Date.now();
    const lastHarvest = this.save.harvestedDeposits[depositId] || 0;
    const cooldownDuration = 30000;

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

    this.save.harvestedDeposits[depositId] = now;
    this.worldStateStore?.setDepositHarvested(
      this.regionId,
      struct.position[0],
      struct.position[2],
      depositId,
      now
    );
    AudioService.playMiningHit();
    this.onCameraShake?.(0.25);

    if (depositId === 'res_lumicite_vein') {
      const qty = Math.floor(Math.random() * 2) + 2;
      this.inventory.addItem('lumicite_shard', qty);
      this.quests.reportProgress('COLLECT', 'lumicite_shard', qty);
      this.recordDiscovery('disc_lumicite_vein');
      NotificationSystem.notify('Mined Lumicite', `Obtained ${qty}x Lumicite Crystals!`, 'item');
    } else {
      const qty = Math.floor(Math.random() * 2) + 2;
      this.inventory.addItem('aetherium_ore', qty);
      this.quests.reportProgress('COLLECT', 'aetherium_ore', qty);
      this.recordDiscovery('disc_aetherium_deposit');
      NotificationSystem.notify('Mined Aetherium', `Obtained ${qty}x Raw Aetherium Ore!`, 'item');
    }

    return true;
  }

  private handleDimensionalGateway(_struct: RuntimeStructure): boolean {
    AudioService.playGatewayTeleport();
    this.onCameraShake?.(0.9);

    this.recordDiscovery('disc_dimensional_gateway');
    NotificationSystem.notify(
      'Dimensional Gateway Traversed',
      'Spatial conflux folds the sky! Translocated across the archipelago.',
      'discovery',
      5500
    );

    this.onTeleportRequested?.(38, 12, 25);
    return true;
  }

  public recordDiscovery(discoveryId: string): void {
    if (this.save.discoveries.includes(discoveryId)) {
      return;
    }

    const def = DISCOVERIES_CATALOG[discoveryId];
    this.save.discoveries.push(discoveryId);

    AudioService.playDiscoveryFanfare();

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
