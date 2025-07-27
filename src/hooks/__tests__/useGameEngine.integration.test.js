import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameEngine } from '../useGameEngine';
import { PathfindingGrid } from '../../utils/pathfinding/PathfindingGrid';
import { LandManager } from '../../classes/LandManager';
import { MapGenerator } from '../../utils/mapGeneration/MapGenerator';

// Mock the database service
jest.mock('../../db/database.js', () => ({
  dbService: {
    getGame: jest.fn(),
    createGame: jest.fn(() => Promise.resolve(1)),
    getActiveLevel: jest.fn(),
    createLevel: jest.fn(() => Promise.resolve(1)),
    loadCompleteGameState: jest.fn(() => Promise.resolve(null)),
    saveCompleteGameState: jest.fn(() => Promise.resolve()),
    autoSaveGameState: jest.fn(() => Promise.resolve())
  }
}));

describe('useGameEngine Integration Tests', () => {
  let gameContext;

  beforeEach(() => {
    // Create game context with all systems
    gameContext = {
      landManager: new LandManager(),
      pathfindingGrid: null,
      setPathfindingGrid: jest.fn(),
      mapGenerator: new MapGenerator({ width: 10, height: 10, seed: 12345 }),
      debugMode: false,
      gameState: 'playing'
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize all game systems correctly', async () => {
      const { result } = renderHook(() => useGameEngine(gameContext));

      await waitFor(() => {
        expect(result.current.gameState).toBeDefined();
        expect(result.current.gameStateRef).toBeDefined();
      });

      // Should initialize pathfinding grid
      expect(gameContext.setPathfindingGrid).toHaveBeenCalled();
      const pathfindingGridCall = gameContext.setPathfindingGrid.mock.calls[0][0];
      expect(pathfindingGridCall).toBeInstanceOf(PathfindingGrid);
    });

    it('should create initial game state', async () => {
      const { result } = renderHook(() => useGameEngine(gameContext));

      await waitFor(() => {
        const state = result.current.gameState;
        expect(state.beliefPoints).toBe(1000);
        expect(state.population).toBe(0);
        expect(state.selectedPower).toBe(null);
      });
    });

    it('should initialize terrain with map generator', async () => {
      const { result } = renderHook(() => useGameEngine(gameContext));

      await waitFor(() => {
        const state = result.current.gameStateRef.current;
        expect(state.terrain).toBeDefined();
        expect(state.terrain.grid).toBeDefined();
        expect(state.terrain.spawnPoints).toBeDefined();
      });
    });
  });

  describe('game loop', () => {
    it('should update game state on each frame', async () => {
      const { result } = renderHook(() => useGameEngine(gameContext));
      
      // Mock requestAnimationFrame
      let frameCallback;
      global.requestAnimationFrame = jest.fn(cb => {
        frameCallback = cb;
        return 1;
      });

      await waitFor(() => {
        expect(global.requestAnimationFrame).toHaveBeenCalled();
      });

      // Simulate a frame
      act(() => {
        if (frameCallback) frameCallback(1000);
      });

      // Game time should advance
      await waitFor(() => {
        expect(result.current.gameStateRef.current.gameTime).toBeGreaterThan(0);
      });
    });

    it('should update villager positions', async () => {
      const { result } = renderHook(() => useGameEngine(gameContext));

      // Add a villager
      act(() => {
        result.current.gameStateRef.current.villagers.push({
          id: 1,
          x: 100,
          y: 100,
          vx: 1,
          vy: 0,
          target: { x: 200, y: 100 }
        });
      });

      // Mock animation frame
      let frameCallback;
      global.requestAnimationFrame = jest.fn(cb => {
        frameCallback = cb;
        return 1;
      });

      // Run a frame
      act(() => {
        if (frameCallback) frameCallback(1000);
      });

      await waitFor(() => {
        const villager = result.current.gameStateRef.current.villagers[0];
        expect(villager.x).toBeGreaterThan(100);
      });
    });
  });

  describe('power system', () => {
    it('should select and use powers', async () => {
      const { result } = renderHook(() => useGameEngine(gameContext));

      // Select create land power
      act(() => {
        result.current.selectPower('createLand');
      });

      expect(result.current.gameState.selectedPower).toBe('createLand');

      // Use power
      act(() => {
        result.current.usePower(100, 100);
      });

      // Should consume belief points
      await waitFor(() => {
        expect(result.current.gameState.beliefPoints).toBeLessThan(1000);
      });
    });

    it('should not use power without enough belief points', async () => {
      const { result } = renderHook(() => useGameEngine(gameContext));

      // Set low belief points
      act(() => {
        result.current.gameStateRef.current.beliefPoints = 10;
      });

      // Try to use expensive power
      act(() => {
        result.current.selectPower('spawnVillager');
        result.current.usePower(100, 100);
      });

      // Population should not increase
      expect(result.current.gameStateRef.current.villagers.length).toBe(0);
    });
  });

  describe('save/load system', () => {
    it('should save game state', async () => {
      const { dbService } = require('../../db/database.js');
      const { result } = renderHook(() => useGameEngine(gameContext));

      // Add some game data
      act(() => {
        result.current.gameStateRef.current.villagers.push({
          id: 1,
          x: 100,
          y: 100
        });
        result.current.gameStateRef.current.buildings.push({
          id: 1,
          type: 'house',
          x: 200,
          y: 200
        });
      });

      // Save game
      await act(async () => {
        await result.current.manualSaveGame();
      });

      expect(dbService.saveCompleteGameState).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({
          villagers: expect.arrayContaining([
            expect.objectContaining({ id: 1 })
          ]),
          buildings: expect.arrayContaining([
            expect.objectContaining({ id: 1 })
          ])
        })
      );
    });

    it('should auto-save periodically', async () => {
      const { dbService } = require('../../db/database.js');
      const { result } = renderHook(() => useGameEngine(gameContext));

      // Set auto-save interval to 100ms for testing
      act(() => {
        result.current.gameStateRef.current.autoSaveInterval = 100;
      });

      // Wait for auto-save
      await waitFor(() => {
        expect(dbService.autoSaveGameState).toHaveBeenCalled();
      }, { timeout: 300 });
    });
  });

  describe('map regeneration', () => {
    it('should regenerate map with new seed', async () => {
      const { result } = renderHook(() => useGameEngine(gameContext));

      const originalTerrain = result.current.gameStateRef.current.terrain.grid;

      // Regenerate map
      act(() => {
        result.current.regenerateMap();
      });

      await waitFor(() => {
        const newTerrain = result.current.gameStateRef.current.terrain.grid;
        expect(newTerrain).not.toBe(originalTerrain);
      });

      // Should reset game state
      expect(result.current.gameStateRef.current.villagers).toHaveLength(0);
      expect(result.current.gameStateRef.current.buildings).toHaveLength(1); // Just temple
    });
  });

  describe('integration with subsystems', () => {
    it('should update pathfinding grid when buildings change', async () => {
      const { result } = renderHook(() => useGameEngine(gameContext));

      // Wait for pathfinding grid to be initialized
      await waitFor(() => {
        expect(gameContext.pathfindingGrid).toBeDefined();
      });

      const updateBuildingSpy = jest.spyOn(gameContext.pathfindingGrid, 'updateBuilding');

      // Add a building
      act(() => {
        const building = {
          id: 2,
          type: 'house',
          x: 100,
          y: 100,
          width: 30,
          height: 30
        };
        result.current.gameStateRef.current.buildings.push(building);
        result.current.gameStateRef.current.buildingSystem.placeBuilding(100, 100, 'house');
      });

      expect(updateBuildingSpy).toHaveBeenCalled();
    });

    it('should integrate land management with building placement', async () => {
      const { result } = renderHook(() => useGameEngine(gameContext));

      // Initialize land plots
      act(() => {
        gameContext.landManager.initializeGrid(
          200, 
          200, 
          40,
          result.current.gameStateRef.current.terrain
        );
      });

      // Try to place building on restricted land
      const restrictedPlot = gameContext.landManager.getPlotAt(100, 100);
      restrictedPlot.setType('restricted');

      act(() => {
        result.current.selectPower('placeBuilding');
        result.current.usePower(100, 100, { buildingType: 'house' });
      });

      // Building should not be placed
      const buildings = result.current.gameStateRef.current.buildings;
      const buildingAtLocation = buildings.find(b => 
        b.x === 100 && b.y === 100 && b.type === 'house'
      );
      expect(buildingAtLocation).toBeUndefined();
    });
  });
});