/**
 * Unified Input Manager for The Drifting Land.
 * Handles:
 * - Desktop: WASD movement, Space jump, Shift sprint/dash, E interact, V switch camera,
 *   I/Tab inventory, J quests, M map, Esc pause, and pointer lock mouse look.
 * - Android: Multitouch virtual joystick (left), touch-look drag area (right),
 *   on-screen sprint/jump/interact/camera/map buttons.
 * - Window blur and visibility change cleanup.
 */

import { InputState } from '../types/game';

export class InputManager {
  public state: InputState;
  private keyMap: Map<string, boolean> = new Map();

  // Pointer drag & Pointer Lock tracking
  private isPointerDown: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;
  private isPointerLocked: boolean = false;
  private lookTouchId: number | null = null;
  private lastTouchLookX: number = 0;
  private lastTouchLookY: number = 0;

  // Callbacks
  private onPauseCallback?: () => void;
  private onInteractCallback?: () => void;
  private onToggleInventoryCallback?: () => void;
  private onToggleQuestsCallback?: () => void;
  private onToggleMapCallback?: () => void;
  private onSwitchCameraCallback?: () => void;

  constructor(
    onPause?: () => void,
    onInteract?: () => void,
    onToggleInventory?: () => void,
    onToggleQuests?: () => void,
    onToggleMap?: () => void,
    onSwitchCamera?: () => void
  ) {
    this.onPauseCallback = onPause;
    this.onInteractCallback = onInteract;
    this.onToggleInventoryCallback = onToggleInventory;
    this.onToggleQuestsCallback = onToggleQuests;
    this.onToggleMapCallback = onToggleMap;
    this.onSwitchCameraCallback = onSwitchCamera;

    this.state = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      dash: false,
      sprint: false,
      interact: false,
      pause: false,
      toggleInventory: false,
      toggleQuests: false,
      toggleMap: false,
      switchCamera: false,
      joystickX: 0,
      joystickY: 0,
      lookDeltaX: 0,
      lookDeltaY: 0,
    };

    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('mousemove', this.handleMouseMove);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Prevent default scrolling on navigation/game keys
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
      e.preventDefault();
    }

    if (e.repeat) return;
    this.keyMap.set(e.code, true);

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.state.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.state.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.state.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.state.right = true;
        break;
      case 'Space':
        this.state.jump = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.state.sprint = true;
        this.state.dash = true;
        break;
      case 'KeyE':
        this.state.interact = true;
        this.onInteractCallback?.();
        break;
      case 'KeyV':
        this.state.switchCamera = true;
        this.onSwitchCameraCallback?.();
        break;
      case 'KeyM':
        this.state.toggleMap = true;
        this.onToggleMapCallback?.();
        break;
      case 'KeyI':
      case 'Tab':
        this.state.toggleInventory = true;
        this.onToggleInventoryCallback?.();
        break;
      case 'KeyJ':
      case 'KeyQ':
        this.state.toggleQuests = true;
        this.onToggleQuestsCallback?.();
        break;
      case 'Escape':
      case 'KeyP':
        this.state.pause = true;
        this.onPauseCallback?.();
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keyMap.set(e.code, false);

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.state.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.state.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.state.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.state.right = false;
        break;
      case 'Space':
        this.state.jump = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.state.sprint = false;
        this.state.dash = false;
        break;
      case 'KeyE':
        this.state.interact = false;
        break;
    }
  };

  private handleBlur = (): void => {
    this.resetInputs();
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.resetInputs();
    }
  };

  private handlePointerLockChange = (): void => {
    this.isPointerLocked = document.pointerLockElement !== null;
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.isPointerLocked) {
      this.state.lookDeltaX += e.movementX;
      this.state.lookDeltaY += e.movementY;
    }
  };

  public requestPointerLock(element: HTMLElement): void {
    if (!this.isPointerLocked && document.pointerLockElement === null) {
      element.requestPointerLock?.();
    }
  }

  public exitPointerLock(): void {
    if (document.pointerLockElement !== null) {
      document.exitPointerLock?.();
    }
  }

  public resetInputs(): void {
    this.keyMap.clear();
    this.state.forward = false;
    this.state.backward = false;
    this.state.left = false;
    this.state.right = false;
    this.state.jump = false;
    this.state.dash = false;
    this.state.sprint = false;
    this.state.interact = false;
    this.state.toggleInventory = false;
    this.state.toggleQuests = false;
    this.state.toggleMap = false;
    this.state.switchCamera = false;
    this.state.joystickX = 0;
    this.state.joystickY = 0;
    this.state.lookDeltaX = 0;
    this.state.lookDeltaY = 0;
    this.isPointerDown = false;
    this.lookTouchId = null;
  }

  // Pointer dragging on canvas when not pointer locked
  public onPointerDown = (clientX: number, clientY: number): void => {
    if (!this.isPointerLocked) {
      this.isPointerDown = true;
      this.lastPointerX = clientX;
      this.lastPointerY = clientY;
    }
  };

  public onPointerMove = (clientX: number, clientY: number): void => {
    if (!this.isPointerLocked && this.isPointerDown) {
      const dx = clientX - this.lastPointerX;
      const dy = clientY - this.lastPointerY;
      this.state.lookDeltaX += dx;
      this.state.lookDeltaY += dy;
      this.lastPointerX = clientX;
      this.lastPointerY = clientY;
    }
  };

  public onPointerUp = (): void => {
    this.isPointerDown = false;
  };

  // Dedicated Right-Side Touch Look Area (Android Multitouch)
  public handleTouchLookStart = (clientX: number, clientY: number, id: number): void => {
    this.lookTouchId = id;
    this.lastTouchLookX = clientX;
    this.lastTouchLookY = clientY;
  };

  public handleTouchLookMove = (clientX: number, clientY: number, id: number): void => {
    if (this.lookTouchId === id) {
      const dx = clientX - this.lastTouchLookX;
      const dy = clientY - this.lastTouchLookY;
      this.state.lookDeltaX += dx * 1.5;
      this.state.lookDeltaY += dy * 1.5;
      this.lastTouchLookX = clientX;
      this.lastTouchLookY = clientY;
    }
  };

  public handleTouchLookEnd = (id: number): void => {
    if (this.lookTouchId === id) {
      this.lookTouchId = null;
    }
  };

  // Virtual Joystick input (-1 to 1)
  public setJoystick = (x: number, y: number): void => {
    this.state.joystickX = Math.max(-1, Math.min(1, x));
    this.state.joystickY = Math.max(-1, Math.min(1, y));
  };

  // Touch action triggers
  public setTouchAction = (
    action: 'jump' | 'sprint' | 'dash' | 'interact' | 'camera' | 'map',
    active: boolean
  ): void => {
    if (action === 'jump') this.state.jump = active;
    if (action === 'sprint') {
      this.state.sprint = active;
      this.state.dash = active;
    }
    if (action === 'dash') this.state.dash = active;
    if (action === 'interact') {
      this.state.interact = active;
      if (active) this.onInteractCallback?.();
    }
    if (action === 'camera' && active) {
      this.onSwitchCameraCallback?.();
    }
    if (action === 'map' && active) {
      this.onToggleMapCallback?.();
    }
  };

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    document.removeEventListener('mousemove', this.handleMouseMove);
  }
}
