import { LandManager } from '../LandManager';
import { LandPlot } from '../LandPlot';

describe('LandManager', () => {
  let landManager;

  beforeEach(() => {
    landManager = new LandManager();
  });

  describe('initialization', () => {
    it('should create a grid of land plots', () => {
      const mockTerrain = {
        getTerrainAt: jest.fn(() => ({ type: 'grass' }))
      };
      
      landManager.initializeGrid(100, 100, 20, mockTerrain);
      
      expect(landManager.plots.size).toBe(25); // 5x5 grid
      expect(landManager.gridWidth).toBe(5);
      expect(landManager.gridHeight).toBe(5);
    });

    it('should set correct plot types based on terrain', () => {
      const mockTerrain = {
        getTerrainAt: jest.fn((x, y) => {
          if (x < 50) return { type: 'water' };
          if (y < 50) return { type: 'forest' };
          return { type: 'grass' };
        })
      };
      
      landManager.initializeGrid(100, 100, 50, mockTerrain);
      
      const waterPlot = landManager.getPlotAt(25, 75);
      const forestPlot = landManager.getPlotAt(75, 25);
      const grassPlot = landManager.getPlotAt(75, 75);
      
      expect(waterPlot.type).toBe('water');
      expect(forestPlot.type).toBe('forest');
      expect(grassPlot.type).toBe('buildable');
    });
  });

  describe('plot management', () => {
    beforeEach(() => {
      const mockTerrain = {
        getTerrainAt: jest.fn(() => ({ type: 'grass' }))
      };
      landManager.initializeGrid(100, 100, 20, mockTerrain);
    });

    it('should get plot at coordinates', () => {
      const plot = landManager.getPlotAt(25, 25);
      
      expect(plot).toBeInstanceOf(LandPlot);
      expect(plot.contains(25, 25)).toBe(true);
    });

    it('should get plot by ID', () => {
      const plot = landManager.getPlotById('1_1');
      
      expect(plot).toBeInstanceOf(LandPlot);
      expect(plot.id).toBe('1_1');
    });

    it('should update neighbor relationships', () => {
      landManager.updateNeighbors();
      
      const centerPlot = landManager.getPlotById('2_2');
      expect(centerPlot.neighbors.north).toBe('2_1');
      expect(centerPlot.neighbors.south).toBe('2_3');
      expect(centerPlot.neighbors.east).toBe('3_2');
      expect(centerPlot.neighbors.west).toBe('1_2');
    });
  });

  describe('plot operations', () => {
    beforeEach(() => {
      const mockTerrain = {
        getTerrainAt: jest.fn(() => ({ type: 'grass' }))
      };
      landManager.initializeGrid(100, 100, 20, mockTerrain);
    });

    it('should claim a plot', () => {
      const result = landManager.claimPlot(25, 25, 'Player 1', 'player1');
      
      expect(result).toBe(true);
      const plot = landManager.getPlotAt(25, 25);
      expect(plot.owner).toBe('Player 1');
      expect(plot.ownerId).toBe('player1');
    });

    it('should not claim an already owned plot', () => {
      landManager.claimPlot(25, 25, 'Player 1', 'player1');
      const result = landManager.claimPlot(25, 25, 'Player 2', 'player2');
      
      expect(result).toBe(false);
      const plot = landManager.getPlotAt(25, 25);
      expect(plot.owner).toBe('Player 1');
    });

    it('should get plots in area', () => {
      const plots = landManager.getPlotsInArea(10, 10, 30, 30);
      
      expect(plots.length).toBe(4); // 2x2 area
      expect(plots.every(p => p instanceof LandPlot)).toBe(true);
    });
  });

  describe('plot merging', () => {
    beforeEach(() => {
      const mockTerrain = {
        getTerrainAt: jest.fn(() => ({ type: 'grass' }))
      };
      landManager.initializeGrid(100, 100, 20, mockTerrain);
    });

    it('should merge adjacent plots with same owner', () => {
      // Claim two adjacent plots
      landManager.claimPlot(25, 25, 'Player 1', 'player1');
      landManager.claimPlot(45, 25, 'Player 1', 'player1');
      
      const result = landManager.mergePlots(['1_1', '2_1']);
      
      expect(result).toBe(true);
      expect(landManager.plots.size).toBe(24); // One less plot
      
      const mergedPlot = landManager.getPlotAt(25, 25);
      expect(mergedPlot.width).toBe(40); // Double width
    });

    it('should not merge plots with different owners', () => {
      landManager.claimPlot(25, 25, 'Player 1', 'player1');
      landManager.claimPlot(45, 25, 'Player 2', 'player2');
      
      const result = landManager.mergePlots(['1_1', '2_1']);
      
      expect(result).toBe(false);
      expect(landManager.plots.size).toBe(25); // No change
    });

    it('should not merge non-adjacent plots', () => {
      landManager.claimPlot(25, 25, 'Player 1', 'player1');
      landManager.claimPlot(65, 25, 'Player 1', 'player1');
      
      const result = landManager.mergePlots(['1_1', '3_1']);
      
      expect(result).toBe(false);
    });
  });

  describe('plot splitting', () => {
    beforeEach(() => {
      const mockTerrain = {
        getTerrainAt: jest.fn(() => ({ type: 'grass' }))
      };
      landManager.initializeGrid(100, 100, 40, mockTerrain); // Larger plots
    });

    it('should split a plot into smaller plots', () => {
      const plotId = '1_1';
      const result = landManager.splitPlot(plotId, 2, 2);
      
      expect(result).toBe(true);
      expect(landManager.plots.size).toBe(7); // 3 original + 4 new - 1 removed
      
      // Check that new plots exist
      const subPlots = landManager.getPlotsInArea(40, 40, 40, 40);
      expect(subPlots.length).toBe(4);
      expect(subPlots.every(p => p.width === 20 && p.height === 20)).toBe(true);
    });

    it('should preserve owner when splitting', () => {
      landManager.claimPlot(60, 60, 'Player 1', 'player1');
      
      const result = landManager.splitPlot('1_1', 2, 2);
      
      expect(result).toBe(true);
      const subPlots = landManager.getPlotsInArea(40, 40, 40, 40);
      expect(subPlots.every(p => p.owner === 'Player 1')).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const mockTerrain = {
        getTerrainAt: jest.fn(() => ({ type: 'grass' }))
      };
      landManager.initializeGrid(100, 100, 20, mockTerrain);
      landManager.claimPlot(25, 25, 'Player 1', 'player1');
      
      const json = landManager.toJSON();
      expect(json.plots).toHaveLength(25);
      expect(json.gridWidth).toBe(5);
      expect(json.gridHeight).toBe(5);
      
      const newManager = LandManager.fromJSON(json);
      expect(newManager.plots.size).toBe(25);
      expect(newManager.getPlotAt(25, 25).owner).toBe('Player 1');
    });
  });
});