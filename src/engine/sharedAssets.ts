/**
 * Shared Geometry, Material, and Glow Sprite Registry for The Drifting Land.
 * Centralizes reusable GPU resources across chunk streaming, instanced foliage/rocks,
 * flora nodes, structures, and pooled entities so identical objects share draw state
 * and GPU buffers without redundant allocations or premature disposal.
 */

import * as THREE from 'three';
import { TextureGenerator } from './textures';

class SharedAssetRegistry {
  private geometries: Map<string, THREE.BufferGeometry> = new Map();
  private materials: Map<string, THREE.Material> = new Map();
  private glowSpriteMaterials: Map<number, THREE.SpriteMaterial> = new Map();

  public getGeometry(key: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let geo = this.geometries.get(key);
    if (!geo) {
      geo = factory();
      (geo as any).__isSharedAsset = true;
      this.geometries.set(key, geo);
    }
    return geo;
  }

  public getMaterial<T extends THREE.Material>(key: string, factory: () => T): T {
    let mat = this.materials.get(key) as T | undefined;
    if (!mat) {
      mat = factory();
      (mat as any).__isSharedAsset = true;
      this.materials.set(key, mat);
    }
    return mat;
  }

  /**
   * Shared additive radial glow sprite material (replaces expensive per-object PointLights)
   */
  public getGlowSpriteMaterial(colorHex: number, opacity = 0.72): THREE.SpriteMaterial {
    const key = ((colorHex & 0xffffff) << 8) | Math.round(opacity * 255);
    let mat = this.glowSpriteMaterials.get(key);
    if (!mat) {
      const tex = TextureGenerator.createCrystalGlowTexture();
      mat = new THREE.SpriteMaterial({
        map: tex,
        color: colorHex,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      (mat as any).__isSharedAsset = true;
      this.glowSpriteMaterials.set(key, mat);
    }
    return mat;
  }

  public createGlowSprite(colorHex: number, scale = 2.2, opacity = 0.72): THREE.Sprite {
    const mat = this.getGlowSpriteMaterial(colorHex, opacity);
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(scale, scale, 1);
    return sprite;
  }

  /**
   * Safely dispose an Object3D subtree while skipping shared geometries/materials/textures
   */
  public disposeObject3DSafe(root: THREE.Object3D): void {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry && !(mesh.geometry as any).__isSharedAsset) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          for (const m of mesh.material) {
            if (m && !(m as any).__isSharedAsset) m.dispose();
          }
        } else if (!(mesh.material as any).__isSharedAsset) {
          mesh.material.dispose();
        }
      }
    });
  }

  public disposeAll(): void {
    this.geometries.forEach((g) => g.dispose());
    this.geometries.clear();
    this.materials.forEach((m) => m.dispose());
    this.materials.clear();
    this.glowSpriteMaterials.forEach((m) => m.dispose());
    this.glowSpriteMaterials.clear();
  }
}

export const SharedAssets = new SharedAssetRegistry();
