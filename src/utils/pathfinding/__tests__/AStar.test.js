import { AStar } from '../AStar';
import { PathfindingGrid } from '../PathfindingGrid';

describe('AStar Pathfinding', () => {
  let grid;
  let astar;

  beforeEach(() => {
    // Create a simple terrain system mock
    const mockTerrainSystem = {
      getTerrainAt: jest.fn((x, y) => ({
        type: 'grass',
        walkable: true
      })),
      isWalkable: jest.fn(() => true)
    };
    
    grid = new PathfindingGrid(200, 200, mockTerrainSystem);
    astar = new AStar(grid);
  });

  describe('findPath', () => {
    it('should find a straight path between two points', () => {
      const path = astar.findPath(0, 0, 100, 0);
      
      expect(path).toBeDefined();
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[path.length - 1]).toEqual({ x: 100, y: 0 });
    });

    it('should find a diagonal path when allowed', () => {
      const path = astar.findPath(0, 0, 100, 100);
      
      expect(path).toBeDefined();
      expect(path.length).toBeGreaterThan(0);
      
      // Path should be shorter than Manhattan distance due to diagonal movement
      const manhattanDistance = 200;
      const pathDistance = path.length * 20; // Each node is 20 units
      expect(pathDistance).toBeLessThan(manhattanDistance);
    });

    it('should return null when no path exists', () => {
      // Block the path
      for (let x = 0; x < 10; x++) {
        grid.nodes[5][x].walkable = false;
      }
      
      const path = astar.findPath(0, 0, 0, 100);
      expect(path).toBeNull();
    });

    it('should avoid obstacles', () => {
      // Create an obstacle
      grid.nodes[5][5].walkable = false;
      grid.nodes[5][6].walkable = false;
      grid.nodes[5][7].walkable = false;
      
      const path = astar.findPath(0, 0, 200, 0);
      
      expect(path).toBeDefined();
      // Path should go around the obstacle
      const pathCrossesObstacle = path.some(point => 
        point.y === 100 && point.x >= 100 && point.x <= 140
      );
      expect(pathCrossesObstacle).toBe(false);
    });

    it('should handle different heuristics', () => {
      const manhattanPath = astar.findPath(0, 0, 100, 100, 'manhattan');
      const euclideanPath = astar.findPath(0, 0, 100, 100, 'euclidean');
      const octilePath = astar.findPath(0, 0, 100, 100, 'octile');
      
      expect(manhattanPath).toBeDefined();
      expect(euclideanPath).toBeDefined();
      expect(octilePath).toBeDefined();
      
      // All should find a path, but may differ in exact route
      expect(manhattanPath.length).toBeGreaterThan(0);
      expect(euclideanPath.length).toBeGreaterThan(0);
      expect(octilePath.length).toBeGreaterThan(0);
    });
  });

  describe('smoothPath', () => {
    it('should remove unnecessary waypoints from a path', () => {
      const zigzagPath = [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 40, y: 0 },
        { x: 60, y: 0 },
        { x: 80, y: 0 },
        { x: 100, y: 0 }
      ];
      
      const smoothed = astar.smoothPath(zigzagPath, grid);
      
      // Should reduce to just start and end points for a straight line
      expect(smoothed.length).toBe(2);
      expect(smoothed[0]).toEqual({ x: 0, y: 0 });
      expect(smoothed[1]).toEqual({ x: 100, y: 0 });
    });

    it('should preserve necessary waypoints around obstacles', () => {
      // Create an L-shaped path that must go around an obstacle
      grid.nodes[1][1].walkable = false;
      grid.nodes[1][2].walkable = false;
      
      const path = [
        { x: 0, y: 0 },
        { x: 0, y: 20 },
        { x: 0, y: 40 },
        { x: 20, y: 40 },
        { x: 40, y: 40 },
        { x: 40, y: 20 },
        { x: 40, y: 0 }
      ];
      
      const smoothed = astar.smoothPath(path, grid);
      
      // Should keep corner waypoints
      expect(smoothed.length).toBeGreaterThan(2);
      expect(smoothed.length).toBeLessThan(path.length);
    });
  });

  describe('performance', () => {
    it('should find paths quickly for reasonable distances', () => {
      const startTime = performance.now();
      const path = astar.findPath(0, 0, 180, 180);
      const endTime = performance.now();
      
      expect(path).toBeDefined();
      expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms
    });

    it('should handle multiple concurrent path requests', () => {
      const paths = [];
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        const promise = new Promise(resolve => {
          const path = astar.findPath(i * 20, 0, i * 20, 180);
          resolve(path);
        });
        promises.push(promise);
      }
      
      return Promise.all(promises).then(results => {
        expect(results.every(path => path !== null)).toBe(true);
        expect(results.every(path => path.length > 0)).toBe(true);
      });
    });
  });
});