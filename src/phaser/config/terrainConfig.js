/**
 * Layer 2: Terrain and Biome Configuration
 *
 * Defines biome types, height levels, and terrain generation parameters.
 * This is a clean, simple system optimized for Phaser 3.
 */

/**
 * Height levels for terrain (0-4 scale)
 */
export const HEIGHT_LEVELS = {
  DEEP_OCEAN: 0,    // Impassable water
  SHALLOW_WATER: 1, // Slow movement
  LAND: 2,          // Normal movement
  HILLS: 3,         // Slower movement, tactical advantage
  MOUNTAIN: 4       // Very slow/impassable
};

/**
 * Biome type definitions with rendering and gameplay properties
 */
export const BIOME_TYPES = {
  DEEP_OCEAN: {
    name: 'Deep Ocean',
    color: 0x1a3a52,      // Dark blue
    height: HEIGHT_LEVELS.DEEP_OCEAN,
    passable: false,
    movementCost: Infinity
  },

  SHALLOW_WATER: {
    name: 'Shallow Water',
    color: 0x2e5c8a,      // Medium blue
    height: HEIGHT_LEVELS.SHALLOW_WATER,
    passable: true,
    movementCost: 3.0     // 3x slower than land
  },

  BEACH: {
    name: 'Beach',
    color: 0xf4e4c1,      // Sandy tan
    height: HEIGHT_LEVELS.LAND,
    passable: true,
    movementCost: 1.2     // Slightly slower than grassland
  },

  GRASSLAND: {
    name: 'Grassland',
    color: 0x6b8e23,      // Olive green
    height: HEIGHT_LEVELS.LAND,
    passable: true,
    movementCost: 1.0     // Base movement speed
  },

  FOREST: {
    name: 'Forest',
    color: 0x2d5016,      // Dark green
    height: HEIGHT_LEVELS.LAND,
    passable: true,
    movementCost: 1.5     // 50% slower than grassland
  },

  HILLS: {
    name: 'Hills',
    color: 0x8b7355,      // Brown
    height: HEIGHT_LEVELS.HILLS,
    passable: true,
    movementCost: 2.0     // 2x slower than grassland
  },

  MOUNTAIN: {
    name: 'Mountain',
    color: 0x696969,      // Gray
    height: HEIGHT_LEVELS.MOUNTAIN,
    passable: false,      // Can make passable with high movement cost later
    movementCost: 5.0
  }
};

/**
 * Terrain generation parameters
 */
export const TERRAIN_CONFIG = {
  // Noise generation
  DEFAULT_SCALE: 50,          // Lower = larger features
  DEFAULT_OCTAVES: 4,          // More octaves = more detail
  DEFAULT_PERSISTENCE: 0.5,    // How much each octave contributes
  DEFAULT_LACUNARITY: 2.0,     // Frequency multiplier per octave

  // Island generation
  USE_FALLOFF: true,           // Create island-like maps
  FALLOFF_STRENGTH: 3,         // Higher = steeper edges
  FALLOFF_OFFSET: 0.2,         // Adjust island size

  // Height thresholds (0-1 range, normalized noise)
  THRESHOLD_DEEP_OCEAN: 0.25,
  THRESHOLD_SHALLOW_WATER: 0.35,
  THRESHOLD_LAND: 0.45,
  THRESHOLD_HILLS: 0.70,
  THRESHOLD_MOUNTAIN: 0.85,

  // Moisture thresholds (for land biomes)
  THRESHOLD_LOW_MOISTURE: 0.3,
  THRESHOLD_HIGH_MOISTURE: 0.6,

  // Tile size for Phaser rendering
  TILE_SIZE: 16,               // Each tile is 16x16 pixels

  // Default map size
  DEFAULT_MAP_WIDTH: 100,      // 100 tiles wide
  DEFAULT_MAP_HEIGHT: 100      // 100 tiles tall
};
