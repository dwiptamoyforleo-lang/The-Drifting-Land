/**
 * Signature Thread System for The Drifting World.
 * Handles Anchor Threads (glowing energetic arcs connecting compatible anchors)
 * and Resonance Threads (reveals hidden floating islands when resonance arrangement is achieved).
 */
import * as THREE from 'three';
import { MagicalAnchor } from './types';
import { soundSystem } from './audio';

export interface ActiveThread {
  id: string;
  fromAnchorId: string;
  toAnchorId: string;
  lineMesh: THREE.Line | THREE.Mesh;
  light: THREE.PointLight;
  color: number;
}

export class ThreadManager {
  private scene: THREE.Scene;
  public activeThreads: ActiveThread[] = [];
  public resonanceAchieved: boolean = false;
  private resonanceAnimTimer: number = 0;
  private resonanceFlashLight?: THREE.DirectionalLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Creates a glowing energetic Bezier curve line between two anchors
   */
  public connectAnchors(anchorA: MagicalAnchor, anchorB: MagicalAnchor): ActiveThread {
    const threadId = `${anchorA.id}-${anchorB.id}`;

    // Check if thread already exists
    const existing = this.activeThreads.find(t => t.id === threadId);
    if (existing) return existing;

    const start = new THREE.Vector3(...anchorA.position).add(new THREE.Vector3(0, 2.4, 0));
    const end = new THREE.Vector3(...anchorB.position).add(new THREE.Vector3(0, 2.4, 0));

    // Calculate midpoint arc with upward bulge
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += 4.5; // gentle celestial arc

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = curve.getPoints(24);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    // Glowing cyan/teal line material
    const material = new THREE.LineBasicMaterial({
      color: 0x67e8f9,
      linewidth: 3,
      transparent: true,
      opacity: 0.85,
    });

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    // Midpoint pulse light
    const pulseLight = new THREE.PointLight(0x22d3ee, 1.2, 18);
    pulseLight.position.copy(mid);
    this.scene.add(pulseLight);

    const thread: ActiveThread = {
      id: threadId,
      fromAnchorId: anchorA.id,
      toAnchorId: anchorB.id,
      lineMesh: line,
      light: pulseLight,
      color: 0x22d3ee,
    };

    this.activeThreads.push(thread);
    return thread;
  }

  /**
   * Check if all three anchors are activated and initiate the Resonance Sequence
   */
  public evaluateResonance(anchors: MagicalAnchor[]): boolean {
    const alpha = anchors.find(a => a.id === 'anchor-alpha');
    const beta = anchors.find(a => a.id === 'anchor-beta');
    const gamma = anchors.find(a => a.id === 'anchor-gamma');

    if (!alpha || !beta || !gamma) return false;

    // Connect Alpha and Beta if both active
    if (alpha.activated && beta.activated) {
      this.connectAnchors(alpha, beta);
    }

    // Connect Beta and Gamma if both active
    if (beta.activated && gamma.activated) {
      this.connectAnchors(beta, gamma);
    }

    // Complete the triangle if all three active
    if (alpha.activated && beta.activated && gamma.activated && !this.resonanceAchieved) {
      this.connectAnchors(gamma, alpha);
      this.triggerResonance();
      return true;
    }

    return false;
  }

  private triggerResonance() {
    this.resonanceAchieved = true;
    this.resonanceAnimTimer = 3.5;

    // Play celestial resonance chord
    soundSystem.playResonanceDiscovered();

    // Create dramatic overhead flash light
    this.resonanceFlashLight = new THREE.DirectionalLight(0x5eead4, 2.5);
    this.resonanceFlashLight.position.set(0, 80, -50);
    this.scene.add(this.resonanceFlashLight);

    // Temporarily lighten atmospheric fog color for majestic ethereal reveal
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(0x133852);
    }
  }

  public update(time: number, delta: number) {
    // Pulse existing threads gently
    const pulse = 0.65 + Math.sin(time * 3.2) * 0.25;

    this.activeThreads.forEach(thread => {
      if (thread.lineMesh instanceof THREE.Line) {
        const mat = thread.lineMesh.material as THREE.LineBasicMaterial;
        mat.opacity = pulse;
      }
      thread.light.intensity = 1.0 + Math.sin(time * 4.0) * 0.4;
    });

    // Handle resonance sky flare decay
    if (this.resonanceAnimTimer > 0) {
      this.resonanceAnimTimer -= delta;

      if (this.resonanceFlashLight) {
        this.resonanceFlashLight.intensity = Math.max(0, this.resonanceAnimTimer * 0.8);
        if (this.resonanceAnimTimer <= 0) {
          this.scene.remove(this.resonanceFlashLight);
          this.resonanceFlashLight = undefined;

          // Return fog to serene deep twilight
          if (this.scene.fog instanceof THREE.FogExp2) {
            this.scene.fog.color.setHex(0x0a1626);
          }
        }
      }
    }
  }
}
