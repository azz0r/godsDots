/**
 * Layer 2: Terrain Generation System
 *
 * Generates procedural terrain using simplex noise.
 * Clean, functional implementation optimized for Phaser 3.
 */

import { createNoise2D } from 'simplex-noise';
import { TERRAIN_CONFIG } from '../config/terrainConfig';

class TerrainGenerator {
  /**
   * Create a terrain generator
   * @param {number} seed - Seed for deterministic generation
   */
  constructor(seed) {
    this.seed = seed;

    // Create noise functions with seeded PRNG
    const alea = this.createSeededRandom(seed);
    this.heightNoise = createNoise2D(alea);

    const alea2 = this.createSeededRandom(seed + 1);
    this.moistureNoise = createNoise2D(alea2);
  }

  /**
   * Create a seeded random function (Alea PRNG)
   * simplex-noise requires a function that returns [0, 1)
   */
  createSeededRandom(seed) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  /**
   * Generate height map using multi-octave simplex noise
   * @param {number} width - Map width in tiles
   * @param {number} height - Map height in tiles
   * @param {object} options - Generation options
   * @returns {number[][]} 2D array of height values (0-1)
   */
  generateHeightMap(width, height, options = {}) {
    const {
      scale = TERRAIN_CONFIG.DEFAULT_SCALE,
      octaves = TERRAIN_CONFIG.DEFAULT_OCTAVES,
      persistence = TERRAIN_CONFIG.DEFAULT_PERSISTENCE,
      lacunarity = TERRAIN_CONFIG.DEFAULT_LACUNARITY,
      useFalloff = TERRAIN_CONFIG.USE_FALLOFF,
      falloffStrength = TERRAIN_CONFIG.FALLOFF_STRENGTH
    } = options;

    const heightMap = [];

    for (let y = 0; y < height; y++) {
      const row = [];

      for (let x = 0; x < width; x++) {
        let noiseValue = this.getOctaveNoise(
          x,
          y,
          scale,
          octaves,
          persistence,
          lacunarity,
          this.heightNoise
        );

        // Normalize to 0-1 range FIRST
        noiseValue = (noiseValue + 1) / 2;
        noiseValue = Math.max(0, Math.min(1, noiseValue));

        // THEN apply island falloff if enabled
        if (useFalloff) {
          const falloff = this.calculateFalloff(x, y, width, height, falloffStrength);
          noiseValue = noiseValue * (1 - falloff);
        }

        row.push(noiseValue);
      }

      heightMap.push(row);
    }

    return heightMap;
  }

  /**
   * Generate moisture map using simplex noise
   * @param {number} width - Map width in tiles
   * @param {number} height - Map height in tiles
   * @param {object} options - Generation options
   * @returns {number[][]} 2D array of moisture values (0-1)
   */
  generateMoistureMap(width, height, options = {}) {
    const {
      scale = TERRAIN_CONFIG.DEFAULT_SCALE * 1.5, // Slightly different scale
      octaves = 3, // Fewer octaves for smoother variation
      persistence = TERRAIN_CONFIG.DEFAULT_PERSISTENCE,
      lacunarity = TERRAIN_CONFIG.DEFAULT_LACUNARITY
    } = options;

    const moistureMap = [];

    for (let y = 0; y < height; y++) {
      const row = [];

      for (let x = 0; x < width; x++) {
        let noiseValue = this.getOctaveNoise(
          x,
          y,
          scale,
          octaves,
          persistence,
          lacunarity,
          this.moistureNoise
        );

        // Normalize to 0-1 range
        noiseValue = (noiseValue + 1) / 2;
        noiseValue = Math.max(0, Math.min(1, noiseValue));

        row.push(noiseValue);
      }

      moistureMap.push(row);
    }

    return moistureMap;
  }

  /**
   * Get noise value with multiple octaves (fractal noise)
   * @private
   */
  getOctaveNoise(x, y, scale, octaves, persistence, lacunarity, noiseFunc) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      const sampleX = (x / scale) * frequency;
      const sampleY = (y / scale) * frequency;

      const noiseValue = noiseFunc(sampleX, sampleY);
      total += noiseValue * amplitude;

      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }

  /**
   * Calculate falloff for island generation
   * Creates a gradient from center to edges
   * @private
   */
  calculateFalloff(x, y, width, height, strength) {
    // Normalize coordinates to -1 to 1 range
    const nx = (x / width) * 2 - 1;
    const ny = (y / height) * 2 - 1;

    // Calculate distance from center
    const distance = Math.sqrt(nx * nx + ny * ny);

    // Apply falloff curve
    const falloff = Math.pow(distance, strength);

    return Math.max(0, Math.min(1, falloff));
  }

  /**
   * Get terrain config for reference
   */
  static getConfig() {
    return TERRAIN_CONFIG;
  }
}

export default TerrainGenerator;
