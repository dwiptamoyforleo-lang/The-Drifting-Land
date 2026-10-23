/**
 * Procedural Texture Generator for The Drifting Land.
 * Pure HTML5 Canvas generation with zero external asset dependencies (Zero 404s).
 * Enforces SRGBColorSpace and maximum anisotropy for crisp rendering at grazing angles.
 */

import * as THREE from 'three';

export class TextureGenerator {
  private static cachedTextures: Map<string, THREE.CanvasTexture> = new Map();

  /**
   * Procedural Verdant Grass & Moss Terrain Texture
   */
  static createGrassTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
    const key = `verdant_grass_${maxAnisotropy}`;
    if (this.cachedTextures.has(key)) return this.cachedTextures.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base verdant tone
    ctx.fillStyle = '#244e36';
    ctx.fillRect(0, 0, size, size);

    // Micro-fibers and organic mottling
    const numBlades = 14000;
    for (let i = 0; i < numBlades; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const shade = Math.random();

      if (shade > 0.65) {
        ctx.fillStyle = 'rgba(52, 211, 153, 0.35)'; // Vibrant emerald green
      } else if (shade > 0.35) {
        ctx.fillStyle = 'rgba(20, 55, 38, 0.45)'; // Deep forest shadow
      } else {
        ctx.fillStyle = 'rgba(134, 239, 172, 0.2)'; // Sunlit moss
      }

      ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }

    // Subtle stone specks
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = 'rgba(75, 85, 99, 0.25)';
      ctx.fillRect(x, y, 3, 3);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;

    this.cachedTextures.set(key, texture);
    return texture;
  }

  /**
   * Procedural Ancient Runic Stone Texture
   */
  static createStoneTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
    const key = `ancient_stone_${maxAnisotropy}`;
    if (this.cachedTextures.has(key)) return this.cachedTextures.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Weathered basalt/granite base
    ctx.fillStyle = '#333a44';
    ctx.fillRect(0, 0, size, size);

    // Noise layers for granite texture
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const v = Math.random();
      ctx.fillStyle = v > 0.5 ? 'rgba(75, 85, 99, 0.35)' : 'rgba(15, 23, 42, 0.4)';
      ctx.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }

    // Weathering cracks & fissures
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      let cx = Math.random() * size;
      let cy = Math.random() * size;
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 5; s++) {
        cx += (Math.random() - 0.5) * 80;
        cy += (Math.random() - 0.5) * 80;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Faint ancient runic engravings
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.28)';
    ctx.lineWidth = 3;
    const runes = [
      [[80, 80], [130, 80], [105, 140], [80, 80]],
      [[280, 180], [280, 250], [330, 215]],
      [[160, 340], [210, 310], [210, 380]],
      [[380, 90], [420, 140], [380, 190]],
    ];
    for (const r of runes) {
      ctx.beginPath();
      ctx.moveTo(r[0][0], r[0][1]);
      for (let k = 1; k < r.length; k++) {
        ctx.lineTo(r[k][0], r[k][1]);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;

    this.cachedTextures.set(key, texture);
    return texture;
  }

  /**
   * Procedural Overgrown Ancient Path Cobblestone Texture
   */
  static createPathTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
    const key = `ancient_path_${maxAnisotropy}`;
    if (this.cachedTextures.has(key)) return this.cachedTextures.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Earthy soil background
    ctx.fillStyle = '#262d26';
    ctx.fillRect(0, 0, size, size);

    // Weathered flagstone pavers with moss in between
    const stoneSize = 64;
    for (let py = 4; py < size; py += stoneSize) {
      for (let px = 4; px < size; px += stoneSize) {
        const jitterX = (Math.random() - 0.5) * 6;
        const jitterY = (Math.random() - 0.5) * 6;
        const w = stoneSize - 10 + (Math.random() - 0.5) * 6;
        const h = stoneSize - 10 + (Math.random() - 0.5) * 6;

        ctx.fillStyle = Math.random() > 0.5 ? '#4b5563' : '#374151';
        ctx.beginPath();
        ctx.roundRect(px + jitterX, py + jitterY, w, h, 6);
        ctx.fill();

        // Paver surface texture
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(px + jitterX + 4, py + jitterY + 4, w - 8, h - 8);

        // Moss specks on stones
        if (Math.random() > 0.4) {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
          ctx.beginPath();
          ctx.arc(px + jitterX + w / 2, py + jitterY + h / 2, 4 + Math.random() * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;

    this.cachedTextures.set(key, texture);
    return texture;
  }

  /**
   * Procedural River Water Texture (Luminous Cyan / Turquoise Ripples)
   */
  static createWaterTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
    const key = `river_water_${maxAnisotropy}`;
    if (this.cachedTextures.has(key)) return this.cachedTextures.get(key)!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Deep cyan basin
    ctx.fillStyle = '#0e7490';
    ctx.fillRect(0, 0, size, size);

    // Wave caustics
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const rad = 6 + Math.random() * 18;

      const grad = ctx.createRadialGradient(x, y, 2, x, y, rad);
      grad.addColorStop(0, 'rgba(103, 232, 249, 0.45)'); // Bright luminous cyan
      grad.addColorStop(0.5, 'rgba(34, 211, 238, 0.2)');
      grad.addColorStop(1, 'rgba(14, 116, 144, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;

    this.cachedTextures.set(key, texture);
    return texture;
  }

  /**
   * Procedural Tree Bark Texture
   */
  static createBarkTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
    const key = `tree_bark_${maxAnisotropy}`;
    if (this.cachedTextures.has(key)) return this.cachedTextures.get(key)!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#3d2516';
    ctx.fillRect(0, 0, size, size);

    // Vertical striations
    for (let x = 0; x < size; x += 3) {
      const alpha = 0.25 + Math.random() * 0.4;
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(88, 52, 33, ${alpha})` : `rgba(22, 13, 8, ${alpha})`;
      ctx.fillRect(x, 0, 2 + Math.random() * 2, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;

    this.cachedTextures.set(key, texture);
    return texture;
  }

  /**
   * Procedural Crystal Radiance Texture
   */
  static createCrystalGlowTexture(): THREE.CanvasTexture {
    const key = 'crystal_glow';
    if (this.cachedTextures.has(key)) return this.cachedTextures.get(key)!;

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(167, 243, 208, 1)'); // Soft mint glow
    grad.addColorStop(0.4, 'rgba(52, 211, 153, 0.6)');
    grad.addColorStop(0.8, 'rgba(16, 185, 129, 0.15)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    this.cachedTextures.set(key, texture);
    return texture;
  }
}
