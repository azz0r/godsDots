import { renderHook, waitFor } from '@testing-library/react'
import { useGameEngine } from '../hooks/useGameEngine.js'
import dbService from '../db/databaseService.js'

// Mock console to suppress expected errors during tests
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
})
afterAll(() => {
  console.error = originalConsoleError
})

describe('Game Initialization Integration Tests', () => {
  beforeEach(async () => {
    // Clear any existing test data
    try {
      await dbService.clearAllData()
    } catch (e) {
      // Database might not exist yet
    }
  })

  test('should successfully initialize a new game without errors', async () => {
    const { result } = renderHook(() => useGameEngine())
    
    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    }, { timeout: 5000 })
    
    // Verify no errors occurred
    expect(result.current.error).toBe(null)
    
    // Verify game state is properly initialized
    expect(result.current.gameState).toMatchObject({
      gameId: expect.any(String),
      levelId: expect.any(String),
      isLoading: false
    })
    
    // Verify systems are initialized
    expect(result.current.terrainSystem).toBeDefined()
    expect(result.current.playerSystem).toBeDefined()
    expect(result.current.buildingSystem).toBeDefined()
  })

  test('should handle database failures gracefully', async () => {
    // Mock database failure
    const mockError = new Error('Database connection failed')
    jest.spyOn(dbService, 'getGameById').mockRejectedValueOnce(mockError)
    
    const { result } = renderHook(() => useGameEngine())
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })
    
    expect(result.current.error.message).toContain('Database')
  })

  test('should create level when none exists', async () => {
    // Mock game exists but no level
    jest.spyOn(dbService, 'getGameById').mockResolvedValueOnce({
      id: 'test-game',
      name: 'Test Game'
    })
    jest.spyOn(dbService, 'getActiveLevel')
      .mockResolvedValueOnce(null) // First call returns null
      .mockResolvedValueOnce({ id: 'test-level', name: 'Level 1' }) // After creation
    
    const createLevelSpy = jest.spyOn(dbService, 'createLevel')
    
    const { result } = renderHook(() => useGameEngine())
    
    await waitFor(() => {
      expect(result.current.gameState.levelId).toBe('test-level')
    })
    
    expect(createLevelSpy).toHaveBeenCalledWith('test-game')
  })

  test('should not call non-existent system methods', async () => {
    const { result } = renderHook(() => useGameEngine())
    
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })
    
    // Verify pathSystem doesn't have getNearbyPaths
    expect(result.current.pathSystem?.getNearbyPaths).toBeUndefined()
    
    // Run game loop update without errors
    expect(() => {
      result.current.update(16) // 16ms frame
    }).not.toThrow()
  })

  test('should handle missing worship system data', async () => {
    const { result } = renderHook(() => useGameEngine())
    
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })
    
    // Create a player with temples but verify worship system handles it
    const player = {
      id: 'player1',
      buildings: [{ type: 'temple', isUnderConstruction: false, x: 100, y: 100 }],
      villagers: []
    }
    
    // This should not throw even with empty villagers array
    expect(() => {
      result.current.update(16)
    }).not.toThrow()
  })

  test('should provide environment to villager needs system', async () => {
    const { result } = renderHook(() => useGameEngine())
    
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })
    
    // Add test villagers
    const villagers = [
      { id: 'v1', x: 100, y: 100, needs: {} },
      { id: 'v2', x: 110, y: 110, needs: {} }
    ]
    
    if (result.current.playerSystem?.players?.[0]) {
      result.current.playerSystem.players[0].villagers = villagers
    }
    
    // Update should calculate environment for each villager
    expect(() => {
      result.current.update(16)
    }).not.toThrow()
  })

  test('should handle compound index requirements', async () => {
    // This test verifies the compound index is properly defined
    const schema = require('../db/schema.js')
    const levelSchema = schema.stores.Level
    
    // Verify compound index is included
    expect(levelSchema).toContain('[gameId+isActive]')
  })

  test('should validate all required system references', async () => {
    const { result } = renderHook(() => useGameEngine())
    
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })
    
    // List of all systems that should be initialized
    const requiredSystems = [
      'terrainSystem',
      'resourceSystem', 
      'pathSystem',
      'playerSystem',
      'buildingSystem'
    ]
    
    requiredSystems.forEach(system => {
      expect(result.current[system]).toBeDefined()
      expect(result.current[system]).not.toBe(null)
    })
  })

  test('should handle rapid initialization/cleanup cycles', async () => {
    // Test mounting and unmounting quickly
    const { result, unmount } = renderHook(() => useGameEngine())
    
    // Don't wait for full initialization
    unmount()
    
    // Should not throw or leak
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining('memory leak')
    )
  })
})