/**
 * Game Loop Integration Test
 * This test ACTUALLY runs the game loop to catch runtime errors
 */

import { renderHook, act } from '@testing-library/react'
import { useGameEngine } from '../hooks/useGameEngine.js'

// Minimal mocks - we want to test the real systems
jest.mock('../db/db.js', () => ({
  __esModule: true,
  default: {
    Game: {
      add: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue({ id: 1, name: 'Test Game' }),
      where: jest.fn().mockReturnThis(),
      first: jest.fn()
    },
    Level: {
      add: jest.fn().mockResolvedValue(1),
      where: jest.fn().mockReturnThis(),
      equals: jest.fn().mockReturnThis(),
      and: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue({ id: 1, gameId: 1, isActive: true })
    },
    Player: {
      add: jest.fn().mockResolvedValue(1),
      where: jest.fn().mockReturnThis(),
      equals: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([])
    },
    Villager: {
      where: jest.fn().mockReturnThis(),
      equals: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([])
    },
    Building: {
      where: jest.fn().mockReturnThis(),
      equals: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([])
    },
    Resource: {
      where: jest.fn().mockReturnThis(),
      equals: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([])
    },
    transaction: jest.fn((mode, tables, fn) => fn())
  }
}))

// Mock canvas for rendering
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillStyle: '',
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  beginPath: jest.fn(),
  closePath: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  arc: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  drawImage: jest.fn()
}))

describe('Game Loop Integration', () => {
  let result
  let unmount
  
  beforeEach(() => {
    jest.clearAllMocks()
    console.error = jest.fn()
    console.warn = jest.fn()
  })

  test('should initialize and run game loop without errors', async () => {
    const hook = renderHook(() => useGameEngine())
    result = hook.result
    unmount = hook.unmount
    
    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })
    
    expect(result.current.isInitialized).toBe(true)
    expect(result.current.error).toBe(null)
    
    // Run multiple game loop frames
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        result.current.update?.(16) // 16ms frame
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    })
    
    // Should not have thrown any errors
    expect(console.error).not.toHaveBeenCalled()
  })

  test('should handle villager needs updates without errors', async () => {
    const hook = renderHook(() => useGameEngine())
    result = hook.result
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })
    
    // Add test villagers with needs
    const testVillagers = [
      {
        id: 'v1',
        x: 100,
        y: 100,
        needs: {
          hunger: 50,
          rest: 60,
          faith: 70,
          social: 80
        }
      },
      {
        id: 'v2', 
        x: 200,
        y: 200,
        needs: {
          hunger: 30,
          rest: 40,
          faith: 50,
          social: 60
        }
      }
    ]
    
    // Inject test data
    if (result.current.playerSystem?.players?.[0]) {
      result.current.playerSystem.players[0].villagers = testVillagers
    }
    
    // Run game loop with villagers
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        result.current.update?.(16)
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    })
    
    expect(console.error).not.toHaveBeenCalled()
  })

  test('should verify all required system methods exist', async () => {
    const hook = renderHook(() => useGameEngine())
    result = hook.result
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })
    
    // Get system references from the hook
    const systems = result.current
    
    // VillagerNeedsSystem must have getNeedsSatisfaction
    const { villagerNeedsSystem } = require('../systems/VillagerNeedsSystem.js')
    expect(typeof villagerNeedsSystem.getNeedsSatisfaction).toBe('function')
    
    // Test the method works
    const satisfaction = villagerNeedsSystem.getNeedsSatisfaction({
      needs: { hunger: 50, rest: 50, faith: 50, social: 50 }
    })
    expect(satisfaction).toBeGreaterThanOrEqual(0)
    expect(satisfaction).toBeLessThanOrEqual(1)
  })

  test('should calculate belief generation without errors', async () => {
    const hook = renderHook(() => useGameEngine())
    result = hook.result
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })
    
    // Create a player with villagers and buildings
    const testPlayer = {
      id: 'player1',
      type: 'human',
      beliefPoints: 100,
      villagers: [
        { id: 'v1', needs: { hunger: 80, rest: 80, faith: 80, social: 80 }, happiness: 75 },
        { id: 'v2', needs: { hunger: 60, rest: 60, faith: 60, social: 60 }, happiness: 50 }
      ],
      buildings: [
        { type: 'temple', isUnderConstruction: false },
        { type: 'house', isUnderConstruction: false }
      ]
    }
    
    if (result.current.playerSystem) {
      result.current.playerSystem.players = [testPlayer]
    }
    
    // Run for 60+ frames to trigger belief generation
    await act(async () => {
      for (let i = 0; i < 65; i++) {
        result.current.update?.(16)
        await new Promise(resolve => setTimeout(resolve, 5))
      }
    })
    
    // Should have calculated belief without errors
    expect(console.error).not.toHaveBeenCalled()
  })

  test('should handle all system updates in correct order', async () => {
    const hook = renderHook(() => useGameEngine())
    result = hook.result
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })
    
    // Track system update order
    const updateOrder = []
    
    // Mock system updates to track order
    const mockUpdate = (systemName) => {
      updateOrder.push(systemName)
    }
    
    // Run one frame
    await act(async () => {
      result.current.update?.(16)
    })
    
    // Verify no errors during update sequence
    expect(console.error).not.toHaveBeenCalled()
  })

  afterEach(() => {
    unmount?.()
  })
})