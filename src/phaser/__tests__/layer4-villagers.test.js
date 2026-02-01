/**
 * Layer 4: Villager System Tests
 *
 * Tests for villager entities with pathfinding integration.
 * Validates spawning, movement, states, and pause/resume.
 */

import VillagerSystem from '../systems/VillagerSystem';
import Villager from '../entities/Villager';
import PathfindingSystem from '../systems/PathfindingSystem';
import { BIOME_TYPES } from '../config/terrainConfig';

describe('Layer 4: Villager System', () => {
  describe('VillagerSystem Initialization', () => {
    test('should initialize with empty villagers array', () => {
      const system = new VillagerSystem(null, null);

      expect(system).toBeDefined();
      expect(system.villagers).toEqual([]);
      expect(system.isPaused).toBe(false);
    });

    test('should store scene and pathfinding references', () => {
      const mockScene = { add: jest.fn() };
      const mockPathfinding = { findPath: jest.fn() };

      const system = new VillagerSystem(mockScene, mockPathfinding);

      expect(system.scene).toBe(mockScene);
      expect(system.pathfindingSystem).toBe(mockPathfinding);
    });
  });

  describe('Villager Spawning', () => {
    test('should spawn villager at specified coordinates', () => {
      const mockScene = {
        add: {
          graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            setDepth: jest.fn()
          })
        }
      };

      const system = new VillagerSystem(mockScene, null);
      const villager = system.spawnVillager(100, 100);

      expect(villager).toBeDefined();
      expect(villager.x).toBe(100);
      expect(villager.y).toBe(100);
      expect(system.villagers.length).toBe(1);
      expect(system.villagers[0]).toBe(villager);
    });

    test('should assign unique IDs to villagers', () => {
      const mockScene = {
        add: {
          graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            setDepth: jest.fn()
          })
        }
      };

      const system = new VillagerSystem(mockScene, null);
      const v1 = system.spawnVillager(100, 100);
      const v2 = system.spawnVillager(200, 200);

      expect(v1.id).toBeDefined();
      expect(v2.id).toBeDefined();
      expect(v1.id).not.toBe(v2.id);
    });

    test('should spawn multiple villagers', () => {
      const mockScene = {
        add: {
          graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            setDepth: jest.fn()
          })
        }
      };

      const system = new VillagerSystem(mockScene, null);

      system.spawnVillager(100, 100);
      system.spawnVillager(200, 200);
      system.spawnVillager(300, 300);

      expect(system.villagers.length).toBe(3);
    });
  });

  describe('Villager Entity', () => {
    test('should initialize with idle state', () => {
      const mockGraphics = {
        fillStyle: jest.fn(),
        fillCircle: jest.fn(),
        setDepth: jest.fn(),
        x: 100,
        y: 100
      };

      const villager = new Villager(1, 100, 100, mockGraphics);

      expect(villager.state).toBe('idle');
      expect(villager.currentPath).toBeNull();
      expect(villager.pathIndex).toBe(0);
    });

    test('should store position and graphics', () => {
      const mockGraphics = {
        fillStyle: jest.fn(),
        fillCircle: jest.fn(),
        setDepth: jest.fn(),
        x: 150,
        y: 250
      };

      const villager = new Villager(1, 150, 250, mockGraphics);

      expect(villager.x).toBe(150);
      expect(villager.y).toBe(250);
      expect(villager.graphics).toBe(mockGraphics);
    });

    test('should have default movement speed', () => {
      const mockGraphics = {
        fillStyle: jest.fn(),
        fillCircle: jest.fn(),
        setDepth: jest.fn()
      };

      const villager = new Villager(1, 100, 100, mockGraphics);

      expect(villager.speed).toBeGreaterThan(0);
      expect(villager.speed).toBeLessThanOrEqual(100);
    });
  });

  describe('Villager States', () => {
    test('should transition from idle to moving when given a path', () => {
      const mockGraphics = {
        fillStyle: jest.fn(),
        fillCircle: jest.fn(),
        setDepth: jest.fn()
      };

      const villager = new Villager(1, 100, 100, mockGraphics);
      const path = [
        { x: 100, y: 100 },
        { x: 101, y: 101 },
        { x: 102, y: 102 }
      ];

      villager.setPath(path);

      expect(villager.state).toBe('moving');
      expect(villager.currentPath).toBe(path);
      expect(villager.pathIndex).toBe(0);
    });

    test('should transition to idle when path is cleared', () => {
      const mockGraphics = {
        fillStyle: jest.fn(),
        fillCircle: jest.fn(),
        setDepth: jest.fn()
      };

      const villager = new Villager(1, 100, 100, mockGraphics);
      villager.setPath([{ x: 100, y: 100 }, { x: 101, y: 101 }]);

      expect(villager.state).toBe('moving');

      villager.clearPath();

      expect(villager.state).toBe('idle');
      expect(villager.currentPath).toBeNull();
    });

    test('should have paused state', () => {
      const mockGraphics = {
        fillStyle: jest.fn(),
        fillCircle: jest.fn(),
        setDepth: jest.fn()
      };

      const villager = new Villager(1, 100, 100, mockGraphics);

      villager.pause();

      expect(villager.isPaused).toBe(true);
    });

    test('should resume from paused state', () => {
      const mockGraphics = {
        fillStyle: jest.fn(),
        fillCircle: jest.fn(),
        setDepth: jest.fn()
      };

      const villager = new Villager(1, 100, 100, mockGraphics);

      villager.pause();
      expect(villager.isPaused).toBe(true);

      villager.resume();
      expect(villager.isPaused).toBe(false);
    });
  });

  describe('Pathfinding Integration', () => {
    test('should request new path when idle', () => {
      const terrainData = [
        [BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND],
        [BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND],
        [BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND]
      ];

      const pathfindingSystem = new PathfindingSystem(terrainData);

      const mockScene = {
        add: {
          graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            setDepth: jest.fn()
          })
        }
      };

      const system = new VillagerSystem(mockScene, pathfindingSystem);
      const villager = system.spawnVillager(0, 0);

      // Request path to destination (2,2 is valid for 3x3 map)
      system.assignRandomDestination(villager, 2, 2);

      expect(villager.state).toBe('moving');
      expect(villager.currentPath).not.toBeNull();
      expect(villager.currentPath.length).toBeGreaterThan(0);
    });

    test('should handle unreachable destinations gracefully', () => {
      const terrainData = [
        [BIOME_TYPES.GRASSLAND, BIOME_TYPES.DEEP_OCEAN],
        [BIOME_TYPES.DEEP_OCEAN, BIOME_TYPES.GRASSLAND]
      ];

      const pathfindingSystem = new PathfindingSystem(terrainData);

      const mockScene = {
        add: {
          graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            setDepth: jest.fn()
          })
        }
      };

      const system = new VillagerSystem(mockScene, pathfindingSystem);
      const villager = system.spawnVillager(0, 0);

      // Try to reach unreachable destination
      system.assignRandomDestination(villager, 1, 1);

      // Should stay idle if no path found
      expect(villager.state).toBe('idle');
      expect(villager.currentPath).toBeNull();
    });
  });

  describe('Movement and Update', () => {
    test('should move along path when updated', () => {
      const mockGraphics = {
        fillStyle: jest.fn(),
        fillCircle: jest.fn(),
        setDepth: jest.fn(),
        x: 0,
        y: 0
      };

      const villager = new Villager(1, 0, 0, mockGraphics);
      const path = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 20 }
      ];

      villager.setPath(path);
      villager.speed = 100; // Fast movement for testing

      // Update with large delta to move instantly
      villager.update(1000);

      // Should have progressed along path
      expect(villager.x).toBeGreaterThan(0);
      expect(villager.y).toBeGreaterThan(0);
    });

    test('should reach destination and become idle', () => {
      const mockGraphics = {
        fillStyle: jest.fn(),
        fillCircle: jest.fn(),
        setDepth: jest.fn(),
        x: 0,
        y: 0
      };

      const villager = new Villager(1, 0, 0, mockGraphics);
      const path = [
        { x: 0, y: 0 },
        { x: 1, y: 1 }
      ];

      villager.setPath(path);
      villager.speed = 10; // Slow but will reach destination

      // Update multiple times to complete path
      for (let i = 0; i < 100; i++) {
        villager.update(16); // 60 FPS
        if (villager.state === 'idle') break;
      }

      expect(villager.state).toBe('idle');
    });

    test('should not move when paused', () => {
      const mockGraphics = {
        fillStyle: jest.fn(),
        fillCircle: jest.fn(),
        setDepth: jest.fn(),
        x: 0,
        y: 0
      };

      const villager = new Villager(1, 0, 0, mockGraphics);
      const path = [
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      ];

      villager.setPath(path);
      villager.pause();

      const startX = villager.x;
      const startY = villager.y;

      villager.update(1000);

      // Should not have moved
      expect(villager.x).toBe(startX);
      expect(villager.y).toBe(startY);
    });
  });

  describe('System Update', () => {
    test('should update all villagers', () => {
      const mockScene = {
        add: {
          graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            setDepth: jest.fn(),
            clear: jest.fn()
          })
        }
      };

      const system = new VillagerSystem(mockScene, null);

      const v1 = system.spawnVillager(0, 0);
      const v2 = system.spawnVillager(10, 10);

      v1.update = jest.fn();
      v2.update = jest.fn();

      system.update(16);

      expect(v1.update).toHaveBeenCalledWith(16);
      expect(v2.update).toHaveBeenCalledWith(16);
    });

    test('should not update when system is paused', () => {
      const mockScene = {
        add: {
          graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            setDepth: jest.fn(),
            clear: jest.fn()
          })
        }
      };

      const system = new VillagerSystem(mockScene, null);
      const villager = system.spawnVillager(0, 0);

      villager.update = jest.fn();

      system.pauseAll();
      system.update(16);

      expect(villager.update).not.toHaveBeenCalled();
    });
  });

  describe('Pause and Resume', () => {
    test('should pause all villagers', () => {
      const mockScene = {
        add: {
          graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            setDepth: jest.fn()
          })
        }
      };

      const system = new VillagerSystem(mockScene, null);

      const v1 = system.spawnVillager(0, 0);
      const v2 = system.spawnVillager(10, 10);

      system.pauseAll();

      expect(system.isPaused).toBe(true);
      expect(v1.isPaused).toBe(true);
      expect(v2.isPaused).toBe(true);
    });

    test('should resume all villagers', () => {
      const mockScene = {
        add: {
          graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            setDepth: jest.fn()
          })
        }
      };

      const system = new VillagerSystem(mockScene, null);

      const v1 = system.spawnVillager(0, 0);
      const v2 = system.spawnVillager(10, 10);

      system.pauseAll();
      system.resumeAll();

      expect(system.isPaused).toBe(false);
      expect(v1.isPaused).toBe(false);
      expect(v2.isPaused).toBe(false);
    });
  });

  describe('Random Destinations', () => {
    test('should assign destination and path to villager', () => {
      const terrainData = [
        [BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND],
        [BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND],
        [BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND, BIOME_TYPES.GRASSLAND]
      ];

      const pathfindingSystem = new PathfindingSystem(terrainData);

      const mockScene = {
        add: {
          graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            setDepth: jest.fn()
          })
        }
      };

      const system = new VillagerSystem(mockScene, pathfindingSystem);
      system.setMapBounds(3, 3);

      const villager = system.spawnVillager(0, 0);

      // Use explicit destination since random picks from center +/- radius
      system.assignRandomDestination(villager, 2, 2);

      // Should have been assigned a path
      expect(villager.currentPath).not.toBeNull();
      expect(villager.state).toBe('moving');
    });
  });

  describe('Villager Cleanup', () => {
    test('should remove villager from system', () => {
      const mockScene = {
        add: {
          graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            setDepth: jest.fn(),
            destroy: jest.fn()
          })
        }
      };

      const system = new VillagerSystem(mockScene, null);
      const villager = system.spawnVillager(100, 100);

      expect(system.villagers.length).toBe(1);

      system.removeVillager(villager.id);

      expect(system.villagers.length).toBe(0);
    });

    test('should properly remove villager from system', () => {
      const mockGraphics = {
        fillStyle: jest.fn(),
        fillCircle: jest.fn(),
        setDepth: jest.fn(),
        clear: jest.fn()
      };

      const mockScene = {
        add: {
          graphics: jest.fn().mockReturnValue(mockGraphics)
        }
      };

      const system = new VillagerSystem(mockScene, null);
      const villager = system.spawnVillager(100, 100);
      const villagerId = villager.id;

      expect(system.villagers.length).toBe(1);

      system.removeVillager(villagerId);

      expect(system.villagers.length).toBe(0);
      expect(system.villagers.find(v => v.id === villagerId)).toBeUndefined();
    });

    test('should clear all villagers', () => {
      const mockScene = {
        add: {
          graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            setDepth: jest.fn(),
            destroy: jest.fn()
          })
        }
      };

      const system = new VillagerSystem(mockScene, null);

      system.spawnVillager(0, 0);
      system.spawnVillager(10, 10);
      system.spawnVillager(20, 20);

      expect(system.villagers.length).toBe(3);

      system.clearAll();

      expect(system.villagers.length).toBe(0);
    });
  });
});
