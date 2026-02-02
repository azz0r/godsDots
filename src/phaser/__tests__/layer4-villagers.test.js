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

/** Create a mock scene with the APIs VillagerSystem needs */
function createMockScene() {
  return {
    add: {
      circle: jest.fn().mockReturnValue({
        setDepth: jest.fn(),
        setStrokeStyle: jest.fn(),
        setFillStyle: jest.fn(),
        setAlpha: jest.fn(),
        destroy: jest.fn(),
        x: 0,
        y: 0,
        alpha: 1,
      }),
    },
  };
}

describe('Layer 4: Villager System', () => {
  describe('VillagerSystem Initialization', () => {
    test('should initialize with empty villagers array', () => {
      const system = new VillagerSystem(null, null);

      expect(system).toBeDefined();
      expect(system.villagers).toEqual([]);
      expect(system.isPaused).toBe(false);
    });

    test('should store scene and pathfinding references', () => {
      const mockScene = createMockScene();
      const mockPathfinding = { findPath: jest.fn() };

      const system = new VillagerSystem(mockScene, mockPathfinding);

      expect(system.scene).toBe(mockScene);
      expect(system.pathfindingSystem).toBe(mockPathfinding);
    });
  });

  describe('Villager Spawning', () => {
    test('should spawn villager at specified coordinates', () => {
      const system = new VillagerSystem(createMockScene(), null);
      const villager = system.spawnVillager(100, 100);

      expect(villager).toBeDefined();
      expect(villager.x).toBe(100);
      expect(villager.y).toBe(100);
      expect(system.villagers.length).toBe(1);
    });

    test('should assign unique IDs to villagers', () => {
      const system = new VillagerSystem(createMockScene(), null);
      const v1 = system.spawnVillager(100, 100);
      const v2 = system.spawnVillager(200, 200);

      expect(v1.id).not.toBe(v2.id);
    });

    test('should spawn multiple villagers', () => {
      const system = new VillagerSystem(createMockScene(), null);

      system.spawnVillager(100, 100);
      system.spawnVillager(200, 200);
      system.spawnVillager(300, 300);

      expect(system.villagers.length).toBe(3);
    });
  });

  describe('Villager Entity', () => {
    test('should initialize with idle state', () => {
      const villager = new Villager(1, 100, 100);

      expect(villager.state).toBe('idle');
      expect(villager.currentPath).toBeNull();
      expect(villager.pathIndex).toBe(0);
    });

    test('should store position', () => {
      const villager = new Villager(1, 150, 250);

      expect(villager.x).toBe(150);
      expect(villager.y).toBe(250);
    });

    test('should have default movement speed', () => {
      const villager = new Villager(1, 100, 100);

      expect(villager.speed).toBeGreaterThan(0);
      expect(villager.speed).toBeLessThanOrEqual(100);
    });
  });

  describe('Villager States', () => {
    test('should transition from idle to moving when given a path', () => {
      const villager = new Villager(1, 100, 100);
      const path = [
        { x: 100, y: 100 },
        { x: 101, y: 101 },
        { x: 102, y: 102 }
      ];

      villager.setPath(path);

      expect(villager.state).toBe('moving');
      expect(villager.currentPath).toBe(path);
    });

    test('should transition to idle when path is cleared', () => {
      const villager = new Villager(1, 100, 100);
      villager.setPath([{ x: 100, y: 100 }, { x: 101, y: 101 }]);
      expect(villager.state).toBe('moving');

      villager.clearPath();
      expect(villager.state).toBe('idle');
      expect(villager.currentPath).toBeNull();
    });

    test('should have paused state', () => {
      const villager = new Villager(1, 100, 100);
      villager.pause();
      expect(villager.isPaused).toBe(true);
    });

    test('should resume from paused state', () => {
      const villager = new Villager(1, 100, 100);
      villager.pause();
      villager.resume();
      expect(villager.isPaused).toBe(false);
    });

    test('should enter worship state', () => {
      const villager = new Villager(1, 100, 100);
      villager.startWorship('temple_1');
      expect(villager.state).toBe('worshipping');
      expect(villager.worshipTempleId).toBe('temple_1');
      expect(villager.worshipTimer).toBeGreaterThan(0);
    });

    test('should end worship and return to idle', () => {
      const villager = new Villager(1, 100, 100);
      villager.startWorship('temple_1');
      villager.endWorship();
      expect(villager.state).toBe('idle');
      expect(villager.worshipTempleId).toBeNull();
      expect(villager.pauseTimer).toBeGreaterThan(0);
    });

    test('should count down worship timer', () => {
      const villager = new Villager(1, 100, 100);
      villager.startWorship('temple_1');
      const initialTimer = villager.worshipTimer;
      villager.update(1000);
      expect(villager.worshipTimer).toBe(initialTimer - 1000);
      expect(villager.state).toBe('worshipping');
    });

    test('should auto-end worship when timer expires', () => {
      const villager = new Villager(1, 100, 100);
      villager.startWorship('temple_1');
      villager.update(villager.worshipDuration + 100);
      expect(villager.state).toBe('idle');
    });

    test('should start worship when reaching temple via goingToWorship', () => {
      const villager = new Villager(1, 0, 0);
      villager.goingToWorship = true;
      villager.worshipTempleId = 'temple_1';
      villager.setPath([{ x: 0, y: 0 }, { x: 1, y: 0 }]);
      villager.speed = 100;

      for (let i = 0; i < 100; i++) {
        villager.update(16);
        if (villager.state === 'worshipping') break;
      }

      expect(villager.state).toBe('worshipping');
      expect(villager.worshipTempleId).toBe('temple_1');
    });

    test('should enter sleep state', () => {
      const villager = new Villager(1, 100, 100);
      villager.startSleep();
      expect(villager.state).toBe('sleeping');
    });

    test('should not move while sleeping', () => {
      const villager = new Villager(1, 5, 5);
      villager.startSleep();
      const startX = villager.x;
      villager.update(1000);
      expect(villager.x).toBe(startX);
      expect(villager.state).toBe('sleeping');
    });

    test('should wake up from sleep', () => {
      const villager = new Villager(1, 100, 100);
      villager.startSleep();
      villager.wakeUp();
      expect(villager.state).toBe('idle');
      expect(villager.pauseTimer).toBeGreaterThan(0);
    });

    test('should apply speed multiplier to movement', () => {
      const villager = new Villager(1, 0, 0);
      villager.setPath([{ x: 0, y: 0 }, { x: 100, y: 0 }]);
      villager.speed = 10;
      villager.speedMultiplier = 0.5;
      villager.update(1000);
      // At speed 10 * 0.5 = 5 tiles/sec, after 1s should move 5 tiles
      expect(villager.x).toBeCloseTo(5, 0);
    });

    test('should sleep when reaching home via goingHome', () => {
      const villager = new Villager(1, 0, 0);
      villager.goingHome = true;
      villager.setPath([{ x: 0, y: 0 }, { x: 1, y: 0 }]);
      villager.speed = 100;

      for (let i = 0; i < 100; i++) {
        villager.update(16);
        if (villager.state === 'sleeping') break;
      }

      expect(villager.state).toBe('sleeping');
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
      const system = new VillagerSystem(createMockScene(), pathfindingSystem);
      system.setMapBounds(3, 3);
      const villager = system.spawnVillager(0, 0);

      system.assignRandomDestination(villager, 2, 2);

      expect(villager.state).toBe('moving');
      expect(villager.currentPath).not.toBeNull();
    });

    test('should handle unreachable destinations gracefully', () => {
      const terrainData = [
        [BIOME_TYPES.GRASSLAND, BIOME_TYPES.DEEP_OCEAN],
        [BIOME_TYPES.DEEP_OCEAN, BIOME_TYPES.GRASSLAND]
      ];

      const pathfindingSystem = new PathfindingSystem(terrainData);
      const system = new VillagerSystem(createMockScene(), pathfindingSystem);
      const villager = system.spawnVillager(0, 0);

      system.assignRandomDestination(villager, 1, 1);

      expect(villager.state).toBe('idle');
      expect(villager.currentPath).toBeNull();
    });
  });

  describe('Movement and Update', () => {
    test('should move along path when updated', () => {
      const villager = new Villager(1, 0, 0);
      const path = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 20 }
      ];

      villager.setPath(path);
      villager.speed = 100;
      villager.update(1000);

      expect(villager.x).toBeGreaterThan(0);
      expect(villager.y).toBeGreaterThan(0);
    });

    test('should reach destination and become idle', () => {
      const villager = new Villager(1, 0, 0);
      const path = [
        { x: 0, y: 0 },
        { x: 1, y: 1 }
      ];

      villager.setPath(path);
      villager.speed = 10;

      for (let i = 0; i < 100; i++) {
        villager.update(16);
        if (villager.state === 'idle') break;
      }

      expect(villager.state).toBe('idle');
    });

    test('should not move when paused', () => {
      const villager = new Villager(1, 0, 0);
      villager.setPath([{ x: 0, y: 0 }, { x: 100, y: 100 }]);
      villager.pause();

      const startX = villager.x;
      villager.update(1000);

      expect(villager.x).toBe(startX);
    });
  });

  describe('System Update', () => {
    test('should update all villagers', () => {
      const system = new VillagerSystem(createMockScene(), null);

      const v1 = system.spawnVillager(0, 0);
      const v2 = system.spawnVillager(10, 10);

      v1.update = jest.fn();
      v2.update = jest.fn();

      system.update(16);

      expect(v1.update).toHaveBeenCalledWith(16);
      expect(v2.update).toHaveBeenCalledWith(16);
    });

    test('should not update when system is paused', () => {
      const system = new VillagerSystem(createMockScene(), null);
      const villager = system.spawnVillager(0, 0);

      villager.update = jest.fn();

      system.pauseAll();
      system.update(16);

      expect(villager.update).not.toHaveBeenCalled();
    });
  });

  describe('Pause and Resume', () => {
    test('should pause all villagers', () => {
      const system = new VillagerSystem(createMockScene(), null);

      const v1 = system.spawnVillager(0, 0);
      const v2 = system.spawnVillager(10, 10);

      system.pauseAll();

      expect(system.isPaused).toBe(true);
      expect(v1.isPaused).toBe(true);
      expect(v2.isPaused).toBe(true);
    });

    test('should resume all villagers', () => {
      const system = new VillagerSystem(createMockScene(), null);

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
      const system = new VillagerSystem(createMockScene(), pathfindingSystem);
      system.setMapBounds(3, 3);

      const villager = system.spawnVillager(0, 0);
      system.assignRandomDestination(villager, 2, 2);

      expect(villager.currentPath).not.toBeNull();
      expect(villager.state).toBe('moving');
    });
  });

  describe('Villager Cleanup', () => {
    test('should remove villager from system', () => {
      const system = new VillagerSystem(createMockScene(), null);
      const villager = system.spawnVillager(100, 100);

      expect(system.villagers.length).toBe(1);
      system.removeVillager(villager.id);
      expect(system.villagers.length).toBe(0);
    });

    test('should clear all villagers', () => {
      const system = new VillagerSystem(createMockScene(), null);

      system.spawnVillager(0, 0);
      system.spawnVillager(10, 10);
      system.spawnVillager(20, 20);

      expect(system.villagers.length).toBe(3);
      system.clearAll();
      expect(system.villagers.length).toBe(0);
    });
  });

  describe('Villager Limit', () => {
    test('should respect maximum villager limit', () => {
      const system = new VillagerSystem(createMockScene(), null);
      expect(system.getMaxVillagers()).toBe(1400);
    });

    test('should not spawn villager when at max limit', () => {
      const system = new VillagerSystem(createMockScene(), null);
      system.villagers = new Array(1400).fill({ id: 1 });

      const result = system.spawnVillager(0, 0);
      expect(result).toBeNull();
      expect(system.villagers.length).toBe(1400);
    });

    test('should allow spawning when below max limit', () => {
      const system = new VillagerSystem(createMockScene(), null);
      const result = system.spawnVillager(0, 0);

      expect(result).not.toBeNull();
      expect(system.villagers.length).toBe(1);
    });
  });
});
