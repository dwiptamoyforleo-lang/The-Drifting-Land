/**
 * Camera Management System for The Drifting Land.
 * Implements Prompt 4 Camera Modes:
 * 1. FIRST PERSON: Eye-level perspective with wide field-of-view and hidden avatar mesh.
 * 2. THIRD PERSON: Smooth orbit follow with terrain collision avoidance and configurable distance.
 * 3. SECOND PERSON (OBSERVER VIEW): Experimental perspective tracking the player through the eyes of a nearby NPC,
 *    creature, or frontal surveillance anchor.
 */

import * as THREE from 'three';
import { CameraMode } from '../types/game';

const _desiredCamPos = new THREE.Vector3();
const _camOffset = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _observerPos = new THREE.Vector3();

export interface ObserverTarget {
  name: string;
  position: THREE.Vector3;
  eyeHeight?: number;
}

export class CameraManager {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraMode = 'THIRD_PERSON';
  public distance: number = 7.5;
  public pitch: number = 0.35; // radians
  public yaw: number = 0; // radians
  public sensitivity: number = 1.0;

  // Active observer info for HUD
  public activeObserverLabel: string = 'Third Person';

  // Screen shake kinematics
  private shakeIntensity: number = 0;
  private shakeDecay: number = 4.0;

  constructor(camera: THREE.PerspectiveCamera, initialMode: CameraMode = 'THIRD_PERSON', initialDistance = 7.5) {
    this.camera = camera;
    this.mode = initialMode;
    this.distance = initialDistance;
  }

  /**
   * Cycle between the three camera modes
   */
  cycleMode(): CameraMode {
    if (this.mode === 'THIRD_PERSON') {
      this.mode = 'FIRST_PERSON';
    } else if (this.mode === 'FIRST_PERSON') {
      this.mode = 'SECOND_PERSON';
    } else {
      this.mode = 'THIRD_PERSON';
    }
    return this.mode;
  }

  setMode(mode: CameraMode): void {
    this.mode = mode;
  }

  addShake(intensity: number): void {
    this.shakeIntensity = Math.min(1.2, this.shakeIntensity + intensity);
  }

  /**
   * Update camera position, rotation, and target based on active camera mode
   */
  update(
    delta: number,
    targetPosition: THREE.Vector3,
    facingAngle: number,
    lookDeltaX: number,
    lookDeltaY: number,
    getTerrainHeight: (x: number, z: number) => number,
    playerMeshGroup?: THREE.Group,
    nearbyObservers: ObserverTarget[] = []
  ): void {
    const dt = Math.min(delta, 0.05);

    // Consume look inputs
    if (lookDeltaX !== 0 || lookDeltaY !== 0) {
      const baseSensitivity = 0.003 * this.sensitivity;
      this.yaw -= lookDeltaX * baseSensitivity;
      const maxPitch = this.mode === 'FIRST_PERSON' ? 1.45 : 1.2;
      const minPitch = this.mode === 'FIRST_PERSON' ? -1.4 : 0.05;
      this.pitch = Math.max(minPitch, Math.min(maxPitch, this.pitch + lookDeltaY * baseSensitivity));
    }

    // 1. FIRST PERSON MODE
    if (this.mode === 'FIRST_PERSON') {
      this.activeObserverLabel = 'FIRST PERSON (EYE-LEVEL)';
      if (playerMeshGroup) {
        playerMeshGroup.visible = false; // Hide player model to prevent view obstruction
      }

      // Eye position at player head
      _desiredCamPos.copy(targetPosition);
      _desiredCamPos.y += 1.68;

      // Slight forward offset to clear visor
      const fwdX = Math.sin(this.yaw) * 0.15;
      const fwdZ = Math.cos(this.yaw) * 0.15;
      _desiredCamPos.x -= fwdX;
      _desiredCamPos.z -= fwdZ;

      // Compute look-at forward vector
      _lookTarget.x = _desiredCamPos.x - Math.sin(this.yaw) * Math.cos(this.pitch) * 10;
      _lookTarget.y = _desiredCamPos.y + Math.sin(this.pitch) * 10;
      _lookTarget.z = _desiredCamPos.z - Math.cos(this.yaw) * Math.cos(this.pitch) * 10;

      this.camera.position.copy(_desiredCamPos);
      this.camera.lookAt(_lookTarget);
    }
    // 2. SECOND PERSON (OBSERVER VIEW)
    else if (this.mode === 'SECOND_PERSON') {
      if (playerMeshGroup) {
        playerMeshGroup.visible = true;
      }

      // Find nearest suitable observer within 22 meters
      let bestObserver: ObserverTarget | null = null;
      let minObsDist = 22.0;

      for (const obs of nearbyObservers) {
        const d = targetPosition.distanceTo(obs.position);
        if (d < minObsDist && d > 1.5) {
          minObsDist = d;
          bestObserver = obs;
        }
      }

      if (bestObserver) {
        this.activeObserverLabel = `OBSERVER: ${bestObserver.name.toUpperCase()}`;
        _observerPos.copy(bestObserver.position);
        _observerPos.y += (bestObserver.eyeHeight || 1.6);
        _desiredCamPos.copy(_observerPos);
      } else {
        // Fallback: Frontal surveillance camera looking back at player
        this.activeObserverLabel = 'OBSERVER: FRONTAL SURVEILLANCE';
        const frontalDist = 6.0;
        _desiredCamPos.x = targetPosition.x + Math.sin(facingAngle) * frontalDist;
        _desiredCamPos.y = targetPosition.y + 2.0;
        _desiredCamPos.z = targetPosition.z + Math.cos(facingAngle) * frontalDist;

        // Prevent terrain clipping for frontal camera
        const groundY = getTerrainHeight(_desiredCamPos.x, _desiredCamPos.z) + 0.8;
        if (_desiredCamPos.y < groundY) {
          _desiredCamPos.y = groundY;
        }
      }

      // Damped camera position
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _desiredCamPos.x, 8, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _desiredCamPos.y, 8, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _desiredCamPos.z, 8, dt);

      // Always look directly at the player
      _lookTarget.copy(targetPosition);
      _lookTarget.y += 1.35;
      this.camera.lookAt(_lookTarget);
    }
    // 3. THIRD PERSON MODE (DEFAULT)
    else {
      this.activeObserverLabel = 'THIRD PERSON';
      if (playerMeshGroup) {
        playerMeshGroup.visible = true;
      }

      const camDist = this.distance;
      _camOffset.x = Math.sin(this.yaw) * Math.cos(this.pitch) * camDist;
      _camOffset.y = Math.sin(this.pitch) * camDist + 1.6;
      _camOffset.z = Math.cos(this.yaw) * Math.cos(this.pitch) * camDist;

      _desiredCamPos.copy(targetPosition).add(_camOffset);

      // Prevent clipping below terrain
      const groundLevel = getTerrainHeight(_desiredCamPos.x, _desiredCamPos.z) + 0.8;
      if (_desiredCamPos.y < groundLevel) {
        _desiredCamPos.y = groundLevel;
      }

      // Screen shake offset
      if (this.shakeIntensity > 0.001) {
        _desiredCamPos.x += (Math.random() - 0.5) * this.shakeIntensity;
        _desiredCamPos.y += (Math.random() - 0.5) * this.shakeIntensity;
        this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
      }

      // Smooth exponential damping
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _desiredCamPos.x, 10, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _desiredCamPos.y, 10, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _desiredCamPos.z, 10, dt);

      _lookTarget.copy(targetPosition);
      _lookTarget.y += 1.4;
      this.camera.lookAt(_lookTarget);
    }
  }
}
