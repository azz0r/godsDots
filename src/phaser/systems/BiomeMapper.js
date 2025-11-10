/**
 * Layer 2: Biome Mapping System
 *
 * Maps height and moisture values to biome types.
 * Simple, clean logic using thresholds.
 */

import { BIOME_TYPES, TERRAIN_CONFIG } from '../config/terrainConfig';

class BiomeMapper {
  /**
   * Get biome type based on height and moisture
   * @param {number} height - Normalized height (0-1)
   * @param {number} moisture - Normalized moisture (0-1)
   * @returns {object} Biome object with properties
   */
  static getBiome(height, moisture) {
    // Deep ocean
    if (height < TERRAIN_CONFIG.THRESHOLD_DEEP_OCEAN) {
      return BIOME_TYPES.DEEP_OCEAN;
    }

    // Shallow water
    if (height < TERRAIN_CONFIG.THRESHOLD_SHALLOW_WATER) {
      return BIOME_TYPES.SHALLOW_WATER;
    }

    // Mountains (very high elevation, regardless of moisture)
    if (height >= TERRAIN_CONFIG.THRESHOLD_MOUNTAIN) {
      return BIOME_TYPES.MOUNTAIN;
    }

    // Hills (high elevation, regardless of moisture)
    if (height >= TERRAIN_CONFIG.THRESHOLD_HILLS) {
      return BIOME_TYPES.HILLS;
    }

    // Land biomes (vary by moisture)
    if (height >= TERRAIN_CONFIG.THRESHOLD_LAND) {
      // Low moisture = beach
      if (moisture < TERRAIN_CONFIG.THRESHOLD_LOW_MOISTURE) {
        return BIOME_TYPES.BEACH;
      }

      // High moisture = forest
      if (moisture >= TERRAIN_CONFIG.THRESHOLD_HIGH_MOISTURE) {
        return BIOME_TYPES.FOREST;
      }

      // Medium moisture = grassland
      return BIOME_TYPES.GRASSLAND;
    }

    // Default to shallow water (shouldn't reach here)
    return BIOME_TYPES.SHALLOW_WATER;
  }

  /**
   * Create a 2D biome map from height and moisture maps
   * @param {number[][]} heightMap - 2D array of height values
   * @param {number[][]} moistureMap - 2D array of moisture values
   * @returns {object[][]} 2D array of biome objects
   */
  static createBiomeMap(heightMap, moistureMap) {
    const height = heightMap.length;
    const width = heightMap[0].length;
    const biomeMap = [];

    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const biome = this.getBiome(heightMap[y][x], moistureMap[y][x]);
        row.push(biome);
      }
      biomeMap.push(row);
    }

    return biomeMap;
  }

  /**
   * Convert biome map to tile indices for Phaser Tilemap
   * @param {object[][]} biomeMap - 2D array of biome objects
   * @returns {number[][]} 2D array of tile indices
   */
  static biomeMapToTileIndices(biomeMap) {
    const tileMap = [];

    for (let y = 0; y < biomeMap.length; y++) {
      const row = [];
      for (let x = 0; x < biomeMap[y].length; x++) {
        const biome = biomeMap[y][x];
        // Use height as tile index (0-4)
        row.push(biome.height);
      }
      tileMap.push(row);
    }

    return tileMap;
  }
}

export default BiomeMapper;
