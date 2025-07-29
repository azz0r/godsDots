/**
 * Real Integration Tests - Minimal Mocking
 * These tests run the actual game loop with real systems to catch runtime errors
 */

import { renderHook, act } from '@testing-library/react'
import { useGameEngine } from '../hooks/useGameEngine.js'

// Only mock the database layer - everything else is real
jest.mock('../db/database.js', () => ({
  default: {
    async getGameById(id) {
      return { id: 1, name: 'Test Game', worldSeed: 'test' }
    },
    async createGame(name) {
      return 1
    },
    async getActiveLevel(gameId) {
      return { id: 1, gameId: 1, isActive: true, levelNumber: 1 }
    },
    async createLevel(gameId) {
      return 1
    },
    async loadCompleteGameState(levelId) {
      return null // Force new game creation
    },
    async saveCompleteGameState(levelId, state) {
      return true
    },
    async getAllGames() {
      return []
    },
    async createPlayer(data) {
      return 1
    },
    async savePlayer(data) {
      return data.id
    }
  }
}))

// Mock canvas for rendering
const mockCanvasContext = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
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
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) }))
}

global.HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCanvasContext)

describe('Real Game Loop Integration', () => {
  let result
  let unmount
  let errors = []
  let warnings = []
  const originalError = console.error
  const originalWarn = console.warn
  const originalLog = console.log

  beforeEach(() => {
    jest.clearAllMocks()
    errors = []
    warnings = []
    
    // Capture but don't suppress console output
    console.error = jest.fn((...args) => {
      errors.push(args)
      originalError(...args)
    })
    console.warn = jest.fn((...args) => {
      warnings.push(args)
      originalWarn(...args)
    })
    console.log = jest.fn() // Suppress logs for cleaner test output
  })

  afterEach(() => {
    console.error = originalError
    console.warn = originalWarn
    console.log = originalLog
    unmount?.()
  })

  test('should initialize all systems without errors', async () => {
    const hook = renderHook(() => useGameEngine())
    result = hook.result
    unmount = hook.unmount
    
    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
    })
    
    // Check all systems are initialized
    expect(result.current.isInitialized).toBe(true)
    expect(result.current.error).toBe(null)
    
    // Verify core systems exist
    expect(result.current.terrainSystem).toBeDefined()
    expect(result.current.playerSystem).toBeDefined()
    expect(result.current.buildingSystem).toBeDefined()
    expect(result.current.resourceSystem).toBeDefined()
    
    // No critical errors during initialization
    const criticalErrors = errors.filter(e => 
      e.some(arg => String(arg).includes('is not a function') ||
                    String(arg).includes('Cannot read') ||
                    String(arg).includes('of undefined'))
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should run game loop for 100 frames without crashes', async () => {
    const hook = renderHook(() => useGameEngine())
    result = hook.result
    unmount = hook.unmount
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
    })
    
    expect(result.current.isInitialized).toBe(true)
    
    // Run 100 game loop frames
    let frameCount = 0
    const startTime = performance.now()
    
    await act(async () => {
      while (frameCount < 100) {
        const currentTime = performance.now()
        const deltaTime = Math.min(currentTime - startTime, 16)
        
        // This simulates requestAnimationFrame calling the game loop
        if (result.current.update) {
          result.current.update(deltaTime)
        }
        
        frameCount++
        await new Promise(resolve => setTimeout(resolve, 16))
      }
    })
    
    // Should complete without critical errors
    const criticalErrors = errors.filter(e => 
      e.some(arg => String(arg).includes('is not a function') ||
                    String(arg).includes('Cannot read'))
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should handle villager needs system correctly', async () => {
    const hook = renderHook(() => useGameEngine())
    result = hook.result
    unmount = hook.unmount
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
    })
    
    // Get the human player
    const players = result.current.playerSystem?.players || []
    const humanPlayer = players.find(p => p.type === 'human')
    
    expect(humanPlayer).toBeDefined()
    expect(humanPlayer.villagers).toBeDefined()
    expect(humanPlayer.villagers.length).toBeGreaterThan(0)
    
    // Verify villagers have needs initialized
    humanPlayer.villagers.forEach(villager => {
      expect(villager.needs).toBeDefined()
      expect(villager.needs.hunger).toBeDefined()
      expect(villager.needs.rest).toBeDefined()
      expect(villager.needs.faith).toBeDefined()
      expect(villager.needs.social).toBeDefined()
    })
    
    // Run several frames to update needs
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        result.current.update?.(16)
        await new Promise(resolve => setTimeout(resolve, 16))
      }
    })
    
    // No errors related to needs system
    const needsErrors = errors.filter(e => 
      e.some(arg => String(arg).includes('needs') || 
                    String(arg).includes('getNeedsSatisfaction'))
    )
    expect(needsErrors).toHaveLength(0)
  })

  test('should calculate belief generation without errors', async () => {
    const hook = renderHook(() => useGameEngine())
    result = hook.result
    unmount = hook.unmount
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
    })
    
    const humanPlayer = result.current.playerSystem?.players?.find(p => p.type === 'human')
    expect(humanPlayer).toBeDefined()
    
    const initialBelief = humanPlayer.beliefPoints
    
    // Run 65 frames to trigger belief calculation (happens every 60 frames)
    await act(async () => {
      for (let i = 0; i < 65; i++) {
        result.current.update?.(16)
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    })
    
    // Should have calculated belief without errors
    const beliefErrors = errors.filter(e => 
      e.some(arg => String(arg).includes('belief') || 
                    String(arg).includes('getNeedsSatisfaction'))
    )
    expect(beliefErrors).toHaveLength(0)
    
    // Belief should have changed
    expect(humanPlayer.beliefPoints).not.toBe(initialBelief)
  })

  test('should handle worship system with correct parameters', async () => {
    const hook = renderHook(() => useGameEngine())
    result = hook.result
    unmount = hook.unmount
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
    })
    
    const humanPlayer = result.current.playerSystem?.players?.find(p => p.type === 'human')
    
    // Add a temple to trigger worship system
    humanPlayer.buildings.push({
      id: 'temple1',
      type: 'temple',
      x: 100,
      y: 100,
      width: 60,
      height: 60,
      isUnderConstruction: false
    })
    
    // Run frames to trigger worship update
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        result.current.update?.(16)
        await new Promise(resolve => setTimeout(resolve, 16))
      }
    })
    
    // No worship system errors
    const worshipErrors = errors.filter(e => 
      e.some(arg => String(arg).includes('worship') || 
                    String(arg).includes('forEach is not a function'))
    )
    expect(worshipErrors).toHaveLength(0)
  })

  test('should handle all system interactions without type errors', async () => {
    const hook = renderHook(() => useGameEngine())
    result = hook.result
    unmount = hook.unmount
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
    })
    
    // Run a full second of game time
    await act(async () => {
      for (let i = 0; i < 60; i++) {
        result.current.update?.(16)
        await new Promise(resolve => setTimeout(resolve, 16))
      }
    })
    
    // Check for any type-related errors
    const typeErrors = errors.filter(e => 
      e.some(arg => {
        const str = String(arg)
        return str.includes('is not a function') ||
               str.includes('Cannot read property') ||
               str.includes('Cannot read properties') ||
               str.includes('of undefined') ||
               str.includes('of null') ||
               str.includes('is not defined')
      })
    )
    
    expect(typeErrors).toHaveLength(0)
  })
})