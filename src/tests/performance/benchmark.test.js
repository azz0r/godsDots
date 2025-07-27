import { AStar } from '../../utils/pathfinding/AStar';
import { PathfindingGrid } from '../../utils/pathfinding/PathfindingGrid';
import { TerrainGenerator } from '../../utils/mapGeneration/TerrainGenerator';
import { LandManager } from '../../classes/LandManager';

describe('Performance Benchmarks', () => {
  const performanceThresholds = {
    pathfinding: {
      shortPath: 10, // ms
      longPath: 50,
      complexPath: 100
    },
    terrainGeneration: {
      small: 50,
      medium: 200,
      large: 1000
    },
    landManagement: {
      plotLookup: 1,
      areaQuery: 5,
      merge: 10
    },
    rendering: {
      frameTime: 16.67 // 60 FPS
    }
  };

  describe('Pathfinding Performance', () => {
    let grid;
    let astar;

    beforeEach(() => {
      const mockTerrain = {
        getTerrainAt: jest.fn(() => ({ type: 'grass', walkable: true })),
        isWalkable: jest.fn(() => true)
      };
      grid = new PathfindingGrid(1000, 1000, mockTerrain);
      astar = new AStar(grid);
    });

    test('short path performance', () => {
      const iterations = 100;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        astar.findPath(0, 0, 200, 200);
      }
      
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      
      expect(avgTime).toBeLessThan(performanceThresholds.pathfinding.shortPath);
      console.log(`Short path avg: ${avgTime.toFixed(2)}ms`);
    });

    test('long path performance', () => {
      const iterations = 50;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        astar.findPath(0, 0, 900, 900);
      }
      
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      
      expect(avgTime).toBeLessThan(performanceThresholds.pathfinding.longPath);
      console.log(`Long path avg: ${avgTime.toFixed(2)}ms`);
    });

    test('complex path with obstacles', () => {
      // Add obstacles
      for (let i = 10; i < 40; i++) {
        for (let j = 0; j < 50; j++) {
          if (j !== 25) { // Leave one gap
            grid.nodes[i][j].walkable = false;
          }
        }
      }
      
      const iterations = 20;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        astar.findPath(0, 0, 900, 900);
      }
      
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      
      expect(avgTime).toBeLessThan(performanceThresholds.pathfinding.complexPath);
      console.log(`Complex path avg: ${avgTime.toFixed(2)}ms`);
    });

    test('concurrent pathfinding requests', async () => {
      const requests = 50;
      const start = performance.now();
      
      const promises = [];
      for (let i = 0; i < requests; i++) {
        promises.push(
          new Promise(resolve => {
            const path = astar.findPath(
              i * 20 % 1000,
              0,
              (i * 20 + 500) % 1000,
              900
            );
            resolve(path);
          })
        );
      }
      
      await Promise.all(promises);
      const elapsed = performance.now() - start;
      
      expect(elapsed).toBeLessThan(1000); // All should complete within 1 second
      console.log(`${requests} concurrent paths: ${elapsed.toFixed(2)}ms total`);
    });
  });

  describe('Terrain Generation Performance', () => {
    test('small map generation', () => {
      const iterations = 10;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const generator = new TerrainGenerator(50, 50, Date.now() + i);
        generator.generate();
      }
      
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      
      expect(avgTime).toBeLessThan(performanceThresholds.terrainGeneration.small);
      console.log(`Small map (50x50) avg: ${avgTime.toFixed(2)}ms`);
    });

    test('medium map generation', () => {
      const iterations = 5;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const generator = new TerrainGenerator(100, 100, Date.now() + i);
        generator.generate();
      }
      
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      
      expect(avgTime).toBeLessThan(performanceThresholds.terrainGeneration.medium);
      console.log(`Medium map (100x100) avg: ${avgTime.toFixed(2)}ms`);
    });

    test('large map generation', () => {
      const iterations = 3;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const generator = new TerrainGenerator(200, 200, Date.now() + i);
        generator.generate();
      }
      
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      
      expect(avgTime).toBeLessThan(performanceThresholds.terrainGeneration.large);
      console.log(`Large map (200x200) avg: ${avgTime.toFixed(2)}ms`);
    });
  });

  describe('Land Management Performance', () => {
    let landManager;

    beforeEach(() => {
      landManager = new LandManager();
      const mockTerrain = {
        getTerrainAt: jest.fn(() => ({ type: 'grass' }))
      };
      landManager.initializeGrid(1000, 1000, 20, mockTerrain);
    });

    test('plot lookup performance', () => {
      const iterations = 10000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const x = Math.random() * 1000;
        const y = Math.random() * 1000;
        landManager.getPlotAt(x, y);
      }
      
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      
      expect(avgTime).toBeLessThan(performanceThresholds.landManagement.plotLookup);
      console.log(`Plot lookup avg: ${avgTime.toFixed(4)}ms`);
    });

    test('area query performance', () => {
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const x = Math.random() * 800;
        const y = Math.random() * 800;
        landManager.getPlotsInArea(x, y, 200, 200);
      }
      
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      
      expect(avgTime).toBeLessThan(performanceThresholds.landManagement.areaQuery);
      console.log(`Area query avg: ${avgTime.toFixed(2)}ms`);
    });

    test('plot merge performance', () => {
      // Claim adjacent plots
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          landManager.claimPlot(i * 20 + 10, j * 20 + 10, 'Test Owner', 'test');
        }
      }
      
      const start = performance.now();
      
      // Merge some plots
      landManager.mergePlots(['0_0', '1_0']);
      landManager.mergePlots(['2_0', '3_0']);
      landManager.mergePlots(['4_0', '5_0']);
      
      const elapsed = performance.now() - start;
      
      expect(elapsed).toBeLessThan(performanceThresholds.landManagement.merge * 3);
      console.log(`Plot merge time: ${elapsed.toFixed(2)}ms for 3 merges`);
    });
  });

  describe('Memory Usage', () => {
    test('memory efficiency for large entity counts', () => {
      if (!global.gc) {
        console.log('Skipping memory test - run with --expose-gc flag');
        return;
      }
      
      // Force garbage collection
      global.gc();
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create many entities
      const entities = [];
      for (let i = 0; i < 10000; i++) {
        entities.push({
          id: i,
          x: Math.random() * 1000,
          y: Math.random() * 1000,
          vx: 0,
          vy: 0,
          target: null,
          type: 'villager'
        });
      }
      
      const afterCreation = process.memoryUsage().heapUsed;
      const memoryPerEntity = (afterCreation - initialMemory) / 10000;
      
      // Each entity should use less than 1KB
      expect(memoryPerEntity).toBeLessThan(1024);
      console.log(`Memory per entity: ${memoryPerEntity.toFixed(0)} bytes`);
      
      // Clean up
      entities.length = 0;
      global.gc();
    });
  });

  describe('Render Performance Simulation', () => {
    test('batch rendering performance', () => {
      const entities = [];
      for (let i = 0; i < 1000; i++) {
        entities.push({
          x: Math.random() * 1000,
          y: Math.random() * 1000,
          type: i % 3 === 0 ? 'villager' : 'resource'
        });
      }
      
      const start = performance.now();
      
      // Simulate batch processing
      const batches = {};
      entities.forEach(entity => {
        if (!batches[entity.type]) {
          batches[entity.type] = [];
        }
        batches[entity.type].push(entity);
      });
      
      // Process each batch
      Object.entries(batches).forEach(([type, batch]) => {
        batch.forEach(entity => {
          // Simulate render calculations
          const screenX = entity.x - 500 + 640;
          const screenY = entity.y - 500 + 360;
          const inView = screenX > -50 && screenX < 1330 && screenY > -50 && screenY < 770;
        });
      });
      
      const elapsed = performance.now() - start;
      
      expect(elapsed).toBeLessThan(performanceThresholds.rendering.frameTime);
      console.log(`Batch render simulation: ${elapsed.toFixed(2)}ms for 1000 entities`);
    });
  });
});