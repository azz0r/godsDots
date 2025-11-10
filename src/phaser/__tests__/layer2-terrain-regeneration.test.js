/**
 * Layer 2: Terrain Regeneration Tests
 *
 * Tests for the terrain regeneration functionality exposed via dev panel.
 */

import TerrainGenerator from '../systems/TerrainGenerator';
import BiomeMapper from '../systems/BiomeMapper';
import MainScene from '../scenes/MainScene';

describe('Layer 2: Terrain Regeneration', () => {
  describe('Scene Regeneration API', () => {
    test('scene should expose regenerateTerrain method', () => {
      const scene = new MainScene();

      expect(typeof scene.regenerateTerrain).toBe('function');
    });

    test('scene should expose generateTerrain method', () => {
      const scene = new MainScene();

      expect(typeof scene.generateTerrain).toBe('function');
    });

    test('regenerating terrain should change the seed', () => {
      const scene = new MainScene();
      const originalSeed = scene.terrainSeed;

      // Mock the necessary scene methods
      scene.add = {
        graphics: jest.fn(() => ({
          clear: jest.fn(),
          destroy: jest.fn(),
          fillStyle: jest.fn(),
          fillRect: jest.fn(),
          lineStyle: jest.fn(),
          strokeRect: jest.fn()
        }))
      };

      // Wait a moment to ensure Date.now() changes
      const futureTime = Date.now() + 1000;
      jest.spyOn(Date, 'now').mockReturnValue(futureTime);

      scene.regenerateTerrain();

      expect(scene.terrainSeed).not.toBe(originalSeed);
      expect(scene.terrainSeed).toBe(futureTime);

      jest.restoreAllMocks();
    });

    test('regenerating terrain should create new terrain generator', () => {
      const scene = new MainScene();

      // Mock the necessary scene methods
      scene.add = {
        graphics: jest.fn(() => ({
          clear: jest.fn(),
          destroy: jest.fn(),
          fillStyle: jest.fn(),
          fillRect: jest.fn(),
          lineStyle: jest.fn(),
          strokeRect: jest.fn()
        }))
      };

      scene.generateTerrain(12345);
      const firstGenerator = scene.terrainGenerator;

      scene.generateTerrain(67890);
      const secondGenerator = scene.terrainGenerator;

      expect(firstGenerator).not.toBe(secondGenerator);
      expect(firstGenerator.seed).toBe(12345);
      expect(secondGenerator.seed).toBe(67890);
    });

    test('regenerating terrain should produce different maps', () => {
      // Generate two different maps
      const gen1 = new TerrainGenerator(11111);
      const gen2 = new TerrainGenerator(22222);

      const heightMap1 = gen1.generateHeightMap(50, 50);
      const heightMap2 = gen2.generateHeightMap(50, 50);

      const moistureMap1 = gen1.generateMoistureMap(50, 50);
      const moistureMap2 = gen2.generateMoistureMap(50, 50);

      const biomeMap1 = BiomeMapper.createBiomeMap(heightMap1, moistureMap1);
      const biomeMap2 = BiomeMapper.createBiomeMap(heightMap2, moistureMap2);

      // Maps with different seeds should be different
      expect(heightMap1).not.toEqual(heightMap2);
      expect(moistureMap1).not.toEqual(moistureMap2);
      expect(biomeMap1).not.toEqual(biomeMap2);
    });

    test('renderTerrain should clear existing graphics before rendering', () => {
      const scene = new MainScene();

      const mockGraphics = {
        clear: jest.fn(),
        destroy: jest.fn(),
        fillStyle: jest.fn(),
        fillRect: jest.fn(),
        lineStyle: jest.fn(),
        strokeRect: jest.fn()
      };

      scene.add = {
        graphics: jest.fn(() => mockGraphics)
      };

      // Create biome maps that match scene dimensions
      const createBiomeMap = (color) => {
        const map = [];
        for (let y = 0; y < scene.mapHeight; y++) {
          const row = [];
          for (let x = 0; x < scene.mapWidth; x++) {
            row.push({ color });
          }
          map.push(row);
        }
        return map;
      };

      // First render
      const biomeMap1 = createBiomeMap(0xFF0000);
      scene.renderTerrain(biomeMap1);

      expect(scene.terrainGraphics).toBeDefined();

      // Second render (regeneration)
      const biomeMap2 = createBiomeMap(0x00FF00);
      scene.renderTerrain(biomeMap2);

      // Should have destroyed old graphics (new graphics created in fallback mode)
      const firstGraphics = scene.terrainGraphics;
      expect(firstGraphics).toBeDefined();
      expect(firstGraphics.destroy).toHaveBeenCalled();
    });

    test('renderTerrain should call fillRect for each tile', () => {
      const scene = new MainScene();

      const mockGraphics = {
        clear: jest.fn(),
        destroy: jest.fn(),
        fillStyle: jest.fn(),
        fillRect: jest.fn()
      };

      scene.add = {
        graphics: jest.fn(() => mockGraphics)
      };

      // Create a small 3x3 biome map
      const biomeMap = [
        [{ color: 0xFF0000 }, { color: 0x00FF00 }, { color: 0x0000FF }],
        [{ color: 0xFF0000 }, { color: 0x00FF00 }, { color: 0x0000FF }],
        [{ color: 0xFF0000 }, { color: 0x00FF00 }, { color: 0x0000FF }]
      ];

      scene.mapWidth = 3;
      scene.mapHeight = 3;

      scene.renderTerrain(biomeMap);

      // Should have called fillRect 9 times (3x3 tiles)
      expect(mockGraphics.fillRect).toHaveBeenCalledTimes(9);
      // Performance optimization: removed strokeRect calls
    });
  });

  describe('Dev Panel Integration', () => {
    test('dev panel should be able to access scene methods', () => {
      // Simulate what the dev panel does
      const mockGame = {
        scene: {
          getScene: jest.fn((key) => {
            if (key === 'MainScene') {
              const scene = new MainScene();
              scene.regenerateTerrain = jest.fn();
              return scene;
            }
            return null;
          })
        }
      };

      const scene = mockGame.scene.getScene('MainScene');

      expect(scene).not.toBeNull();
      expect(typeof scene.regenerateTerrain).toBe('function');

      scene.regenerateTerrain();

      expect(scene.regenerateTerrain).toHaveBeenCalled();
    });
  });
});
