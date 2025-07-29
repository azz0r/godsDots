import { renderHook } from '@testing-library/react'
import { useGameEngine } from '../useGameEngine.js'

// Mock all the systems and services
jest.mock('../../db/databaseService.js', () => ({
  default: {
    createGame: jest.fn().mockResolvedValue('game1'),
    getGameById: jest.fn(),
    createLevel: jest.fn().mockResolvedValue('level1'),
    getActiveLevel: jest.fn(),
    loadCompleteGameState: jest.fn()
  }
}))

jest.mock('../../systems/GameInitializer.js', () => ({
  GameInitializer: jest.fn().mockImplementation(() => ({
    initializeNewGame: jest.fn().mockResolvedValue({
      players: [],
      resources: [],
      buildings: []
    })
  }))
}))

// Mock all the other systems to prevent errors
jest.mock('../../systems/PathfindingSystem.js', () => ({
  PathfindingGrid: jest.fn()
}))

jest.mock('../../systems/VillagerNeedsSystem.js', () => ({
  villagerNeedsSystem: {
    updateVillagerNeeds: jest.fn(),
    initializeVillagerNeeds: jest.fn()
  }
}))

jest.mock('../../systems/WorshipSystem.js', () => ({
  worshipSystem: {
    updateWorship: jest.fn()
  }
}))

jest.mock('../../systems/MiracleSystem.js', () => ({
  miracleSystem: {
    hasActiveMiracle: jest.fn()
  }
}))

// Add other system mocks as needed
const mockSystems = [
  'BuildingUpgradeSystem',
  'VillageExpansionSystem', 
  'DayNightSystem',
  'ProfessionSystem',
  'ImpressivenessSystem',
  'PreacherSystem',
  'LandManager',
  'GestureRecognizer'
].forEach(system => {
  jest.mock(`../../systems/${system}.js`, () => ({
    [system]: jest.fn(),
    [system.charAt(0).toLowerCase() + system.slice(1)]: {}
  }))
})

describe('useGameEngine runtime errors', () => {
  let dbService

  beforeEach(() => {
    jest.clearAllMocks()
    dbService = require('../../db/databaseService.js').default
  })

  test('should handle undefined level gracefully', async () => {
    // Setup: getActiveLevel returns undefined both times
    dbService.getActiveLevel.mockResolvedValue(undefined)
    dbService.getGameById.mockResolvedValue({ id: 'game1', name: 'Test Game' })
    
    const { result } = renderHook(() => useGameEngine())
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Should have error state
    expect(result.current.error).toBeTruthy()
    expect(result.current.error.message).toContain('Failed to create or retrieve level')
  })

  test('should create level when none exists', async () => {
    // Setup: first call returns undefined, second returns valid level
    dbService.getActiveLevel
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 'level1', name: 'Level 1' })
    dbService.getGameById.mockResolvedValue({ id: 'game1', name: 'Test Game' })
    
    const { result } = renderHook(() => useGameEngine())
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Should have created a level
    expect(dbService.createLevel).toHaveBeenCalledWith('game1')
    expect(result.current.gameState.levelId).toBe('level1')
  })

  test('should handle worship system with correct parameters', () => {
    const worshipSystem = require('../../systems/WorshipSystem.js').worshipSystem
    
    // Test that updateWorship is called with arrays
    const players = [{ id: 'player1', beliefPoints: 100 }]
    const temples = [{ id: 'temple1', x: 100, y: 100 }]
    const deltaTime = 16
    
    worshipSystem.updateWorship(players, temples, deltaTime)
    
    expect(worshipSystem.updateWorship).toHaveBeenCalledWith(players, temples, deltaTime)
  })

  test('should provide environment object to villager needs system', () => {
    const villagerNeedsSystem = require('../../systems/VillagerNeedsSystem.js').villagerNeedsSystem
    
    const villager = { id: 'v1', x: 100, y: 100 }
    const deltaTime = 16
    const environment = {
      nearbyVillagers: [],
      activeMiracle: false,
      festival: false
    }
    
    villagerNeedsSystem.updateVillagerNeeds(villager, deltaTime, environment)
    
    expect(villagerNeedsSystem.updateVillagerNeeds).toHaveBeenCalledWith(
      villager,
      deltaTime,
      expect.objectContaining({
        nearbyVillagers: expect.any(Array),
        activeMiracle: expect.any(Boolean),
        festival: expect.any(Boolean)
      })
    )
  })
})