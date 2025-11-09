/**
 * Layer 2: Terrain Generation System Tests
 *
 * Testing Strategy:
 * 1. TerrainGenerator creates height maps using simplex-noise
 * 2. BiomeMapper converts height + moisture to biome types
 * 3. Integration with Phaser Tilemap system
 * 4. Deterministic generation (same seed = same map)
 */

import { createNoise2D } from 'simplex-noise';
import TerrainGenerator from '../systems/TerrainGenerator';
import BiomeMapper from '../systems/BiomeMapper';
import { BIOME_TYPES, HEIGHT_LEVELS } from '../config/terrainConfig';

describe('Layer 2: Terrain Generation System', () => {
  describe('TerrainGenerator', () => {
    test('should create terrain generator with seed', () => {
      const generator = new TerrainGenerator(12345);

      expect(generator).toBeDefined();
      expect(generator.seed).toBe(12345);
    });

    test('should generate deterministic height map', () => {
      const generator1 = new TerrainGenerator(12345);
      const generator2 = new TerrainGenerator(12345);

      const map1 = generator1.generateHeightMap(10, 10);
      const map2 = generator2.generateHeightMap(10, 10);

      expect(map1).toEqual(map2);
    });

    test('should generate height map with correct dimensions', () => {
      const generator = new TerrainGenerator(12345);
      const map = generator.generateHeightMap(20, 15);

      expect(map.length).toBe(15); // height (rows)
      expect(map[0].length).toBe(20); // width (cols)
    });

    test('should generate height values between 0 and 1', () => {
      const generator = new TerrainGenerator(12345);
      const map = generator.generateHeightMap(50, 50);

      for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
          expect(map[y][x]).toBeGreaterThanOrEqual(0);
          expect(map[y][x]).toBeLessThanOrEqual(1);
        }
      }
    });

    test('should support octaves parameter', () => {
      const generator = new TerrainGenerator(12345);
      const map1 = generator.generateHeightMap(10, 10, { octaves: 1 });
      const map2 = generator.generateHeightMap(10, 10, { octaves: 4 });

      // Both should generate valid maps
      expect(map1.length).toBe(10);
      expect(map2.length).toBe(10);

      // Maps with different octaves should produce different results
      expect(map1).not.toEqual(map2);
    });

    test('should support scale parameter', () => {
      const generator = new TerrainGenerator(12345);
      const map1 = generator.generateHeightMap(20, 20, { scale: 10 });
      const map2 = generator.generateHeightMap(20, 20, { scale: 100 });

      // Both should generate valid maps
      expect(map1.length).toBe(20);
      expect(map2.length).toBe(20);

      // Maps with different scales should produce different results
      expect(map1).not.toEqual(map2);
    });

    test('should generate island-like terrain when using circular falloff', () => {
      const generator = new TerrainGenerator(12345);
      const map = generator.generateHeightMap(50, 50, {
        useFalloff: true,
        falloffStrength: 5  // Stronger falloff for island effect
      });

      // Edges should be mostly water (low values)
      const edgeValues = [
        map[0][0], map[0][49], map[49][0], map[49][49], // corners
        map[0][25], map[49][25], map[25][0], map[25][49] // edge midpoints
      ];

      const avgEdgeHeight = edgeValues.reduce((a, b) => a + b) / edgeValues.length;
      const centerHeight = map[25][25];

      // With falloff, edges should be significantly lower than center
      expect(avgEdgeHeight).toBeLessThan(centerHeight * 0.8); // Edges at least 20% lower
      expect(centerHeight).toBeGreaterThan(avgEdgeHeight); // Center higher than edges
    });
  });

  describe('BiomeMapper', () => {
    test('should map low height to deep water', () => {
      const biome = BiomeMapper.getBiome(0.1, 0.5);

      expect(biome).toBe(BIOME_TYPES.DEEP_OCEAN);
    });

    test('should map medium-low height to shallow water', () => {
      const biome = BiomeMapper.getBiome(0.3, 0.5);

      expect(biome).toBe(BIOME_TYPES.SHALLOW_WATER);
    });

    test('should map medium height with low moisture to beach', () => {
      const biome = BiomeMapper.getBiome(0.5, 0.2);

      expect(biome).toBe(BIOME_TYPES.BEACH);
    });

    test('should map medium height with medium moisture to grassland', () => {
      const biome = BiomeMapper.getBiome(0.5, 0.5);

      expect(biome).toBe(BIOME_TYPES.GRASSLAND);
    });

    test('should map medium height with high moisture to forest', () => {
      const biome = BiomeMapper.getBiome(0.5, 0.8);

      expect(biome).toBe(BIOME_TYPES.FOREST);
    });

    test('should map high height to hills', () => {
      const biome = BiomeMapper.getBiome(0.75, 0.5);

      expect(biome).toBe(BIOME_TYPES.HILLS);
    });

    test('should map very high height to mountains', () => {
      const biome = BiomeMapper.getBiome(0.9, 0.5);

      expect(biome).toBe(BIOME_TYPES.MOUNTAIN);
    });

    test('should return biome with properties', () => {
      const biome = BiomeMapper.getBiome(0.5, 0.5);

      expect(biome).toHaveProperty('name');
      expect(biome).toHaveProperty('color');
      expect(biome).toHaveProperty('height');
      expect(biome).toHaveProperty('passable');
    });
  });

  describe('Terrain Config', () => {
    test('should define all biome types', () => {
      expect(BIOME_TYPES).toHaveProperty('DEEP_OCEAN');
      expect(BIOME_TYPES).toHaveProperty('SHALLOW_WATER');
      expect(BIOME_TYPES).toHaveProperty('BEACH');
      expect(BIOME_TYPES).toHaveProperty('GRASSLAND');
      expect(BIOME_TYPES).toHaveProperty('FOREST');
      expect(BIOME_TYPES).toHaveProperty('HILLS');
      expect(BIOME_TYPES).toHaveProperty('MOUNTAIN');
    });

    test('should define height levels', () => {
      expect(HEIGHT_LEVELS).toHaveProperty('DEEP_OCEAN');
      expect(HEIGHT_LEVELS).toHaveProperty('SHALLOW_WATER');
      expect(HEIGHT_LEVELS).toHaveProperty('LAND');
      expect(HEIGHT_LEVELS).toHaveProperty('HILLS');
      expect(HEIGHT_LEVELS).toHaveProperty('MOUNTAIN');
    });

    test('height levels should be numeric and sequential', () => {
      expect(HEIGHT_LEVELS.DEEP_OCEAN).toBe(0);
      expect(HEIGHT_LEVELS.SHALLOW_WATER).toBe(1);
      expect(HEIGHT_LEVELS.LAND).toBe(2);
      expect(HEIGHT_LEVELS.HILLS).toBe(3);
      expect(HEIGHT_LEVELS.MOUNTAIN).toBe(4);
    });

    test('biomes should have valid colors', () => {
      Object.values(BIOME_TYPES).forEach(biome => {
        expect(typeof biome.color).toBe('number');
        expect(biome.color).toBeGreaterThanOrEqual(0x000000);
        expect(biome.color).toBeLessThanOrEqual(0xFFFFFF);
      });
    });
  });

  describe('Integration Tests', () => {
    test('should generate complete biome map from height and moisture', () => {
      const generator = new TerrainGenerator(12345);
      const heightMap = generator.generateHeightMap(50, 50);
      const moistureMap = generator.generateMoistureMap(50, 50);

      const biomeMap = BiomeMapper.createBiomeMap(heightMap, moistureMap);

      expect(biomeMap.length).toBe(50);
      expect(biomeMap[0].length).toBe(50);
      expect(biomeMap[0][0]).toHaveProperty('name');
    });

    test('should generate consistent maps with same seed', () => {
      const gen1 = new TerrainGenerator(99999);
      const gen2 = new TerrainGenerator(99999);

      const map1 = gen1.generateHeightMap(30, 30);
      const map2 = gen2.generateHeightMap(30, 30);

      expect(map1).toEqual(map2);
    });

    test('should generate different maps with different seeds', () => {
      const gen1 = new TerrainGenerator(11111);
      const gen2 = new TerrainGenerator(22222);

      const map1 = gen1.generateHeightMap(30, 30);
      const map2 = gen2.generateHeightMap(30, 30);

      expect(map1).not.toEqual(map2);
    });
  });
});

/**
 * Helper: Calculate variance of 2D array
 */
function calculateVariance(map) {
  const flat = map.flat();
  const mean = flat.reduce((a, b) => a + b) / flat.length;
  const variance = flat.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / flat.length;
  return variance;
}
