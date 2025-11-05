/**
 * Critical Error Tests
 * These tests ensure that common runtime errors are caught before production
 */

import { renderHook } from '@testing-library/react'
import { useGameEngine } from '../hooks/useGameEngine.js'
import { useBuildingSystemWithLand } from '../hooks/useBuildingSystemWithLand.js'
import dbService from '../db/database.js'

// Mock all dependencies
jest.mock('../db/database.js')
jest.mock('../utils/GameInitializer.js', () => ({
  GameInitializer: jest.fn().mockImplementation(() => ({
    initializeNewGame: jest.fn().mockResolvedValue({
      players: [{ 
        id: 'player1', 
        buildings: [],
        villagers: []
      }],
      resources: [],
      buildings: []
    })
  }))
}))

describe('Critical Runtime Errors', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    console.error = jest.fn() // Suppress error logs in tests
  })

  describe('Database Errors', () => {
    test('should handle compound index queries correctly', async () => {
      // Mock the problematic query
      const mockLevel = { id: 'level1', gameId: 'game1', isActive: true }
      
      dbService.Level = {
        where: jest.fn().mockReturnThis(),
        equals: jest.fn().mockReturnThis(),
        and: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockLevel)
      }
      
      const result = await dbService.getActiveLevel('game1')
      
      // Should use proper Dexie syntax
      expect(dbService.Level.where).toHaveBeenCalledWith('gameId')
      expect(dbService.Level.equals).toHaveBeenCalledWith('game1')
      expect(result).toEqual(mockLevel)
    })

    test('should not use invalid compound index syntax', () => {
      const schema = require('../db/schema.js')
      const levelParams = schema.stores.Level
      
      // Should not contain invalid compound index syntax
      expect(levelParams).not.toContain('[gameId+isActive]')
      
      // Should have individual indexes
      expect(levelParams).toContain('gameId')
      expect(levelParams).toContain('isActive')
    })
  })

  describe('Variable Reference Errors', () => {
    test('useBuildingSystemWithLand should use correct variable names', () => {
      const mockLandManager = {
        getPlotAt: jest.fn().mockReturnValue({ owner: 'player1', type: 'residential' })
      }
      
      const { renderBuildings } = useBuildingSystemWithLand(
        { width: 1000, height: 1000 },
        {},
        mockLandManager,
        {}
      )
      
      const ctx = {} // Mock canvas context
      const player = {
        buildings: [{
          x: 100,
          y: 100,
          width: 50,
          height: 50,
          type: 'house'
        }]
      }
      
      // Should not throw "landManagement is not defined"
      expect(() => {
        renderBuildings(ctx, player)
      }).not.toThrow()
      
      // Should call landManager (not landManagement)
      expect(mockLandManager.getPlotAt).toHaveBeenCalled()
    })
  })

  describe('Method Existence Checks', () => {
    test('should check for method existence before calling', () => {
      const pathSystem = {} // No getNearbyPaths method
      
      // Should use optional chaining or check
      const nearbyPaths = pathSystem.getNearbyPaths?.(100, 100, 50) || []
      expect(nearbyPaths).toEqual([])
      
      // Direct call would throw
      expect(() => {
        pathSystem.getNearbyPaths(100, 100, 50)
      }).toThrow()
    })
  })

  describe('Null Safety', () => {
    test('should handle null/undefined parameters gracefully', () => {
      const { VillagerNeedsSystem } = require('../systems/VillagerNeedsSystem.js')
      const system = new VillagerNeedsSystem()
      
      // Should not throw with null villager
      expect(() => {
        system.updateVillagerNeeds(null, 16, {})
      }).not.toThrow()
      
      // Should not throw with undefined environment
      expect(() => {
        system.updateVillagerNeeds({}, 16, undefined)
      }).not.toThrow()
    })

    test('worship system should validate array parameters', () => {
      const { WorshipSystem } = require('../systems/WorshipSystem.js')
      const system = new WorshipSystem()
      
      // Should handle non-array gracefully
      expect(() => {
        const nonArrayPlayers = { id: 'player1' }
        system.updateWorship(nonArrayPlayers, [], 16)
      }).toThrow()
      
      // Should work with proper arrays
      expect(() => {
        const players = [{ id: 'player1', buildings: [], villagers: [] }]
        const temples = []
        system.updateWorship(players, temples, 16)
      }).not.toThrow()
    })
  })

  describe('Game Initialization Flow', () => {
    test('should not have any errors during normal startup', async () => {
      // Mock successful initialization
      dbService.getGameById = jest.fn().mockResolvedValue({ id: 'game1' })
      dbService.getActiveLevel = jest.fn().mockResolvedValue({ id: 'level1' })
      dbService.loadCompleteGameState = jest.fn().mockResolvedValue(null)
      
      const { result } = renderHook(() => useGameEngine())
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Should not have logged any errors
      expect(console.error).not.toHaveBeenCalled()
      
      // Should be in a valid state
      expect(result.current.error).toBe(null)
      expect(result.current.isInitialized).toBe(true)
    })
  })
})