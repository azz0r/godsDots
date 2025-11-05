/**
 * Automated Game Runner - Chaos/Soak Testing
 * Runs the game with random scenarios to catch runtime failures
 */

import { renderHook, act } from '@testing-library/react'
import { useGameEngine } from '../../hooks/useGameEngine'

describe('Automated Game Runner - Chaos Testing', () => {
  // Increase timeout for long-running tests
  jest.setTimeout(60000)

  const runGameScenario = async (scenario, duration = 5000) => {
    const errors = []
    const originalError = console.error

    // Capture errors
    console.error = (...args) => {
      errors.push(args.join(' '))
      originalError(...args)
    }

    try {
      const gameContext = {
        terrainSystem: null,
        pathfindingGrid: null,
        landManager: null,
        canvasRef: { current: document.createElement('canvas') }
      }

      const { result } = renderHook(() => useGameEngine(gameContext))

      // Initialize game with scenario
      await act(async () => {
        if (scenario.seed) {
          result.current.regenerateMap?.(scenario.seed)
        }
      })

      // Run game loop for specified duration
      const startTime = Date.now()
      const frameTime = 16.67 // ~60fps

      while (Date.now() - startTime < duration) {
        await act(async () => {
          // Simulate game tick
          if (result.current.gameStateRef?.current) {
            const gameState = result.current.gameStateRef.current

            // Random events
            if (Math.random() < 0.1) {
              // Randomly spawn villagers
              if (scenario.spawnVillagers && Math.random() < 0.5) {
                const randomPlayer = gameState.players?.[0]
                if (randomPlayer) {
                  gameState.villagers?.push({
                    id: `test_v_${Date.now()}`,
                    x: Math.random() * 1000,
                    y: Math.random() * 1000,
                    playerId: randomPlayer.id,
                    state: 'idle',
                    needs: { hunger: 50, rest: 50, faith: 50, social: 50 }
                  })
                }
              }

              // Randomly place buildings
              if (scenario.placeBuildings && Math.random() < 0.3) {
                const randomPlayer = gameState.players?.[0]
                if (randomPlayer) {
                  gameState.buildings?.push({
                    id: `test_b_${Date.now()}`,
                    x: Math.random() * 1000,
                    y: Math.random() * 1000,
                    width: 30,
                    height: 30,
                    type: ['house', 'temple', 'workshop'][Math.floor(Math.random() * 3)],
                    playerId: randomPlayer.id,
                    health: 100,
                    level: 1
                  })
                }
              }
            }
          }

          // Simulate time passing
          await new Promise(resolve => setTimeout(resolve, frameTime))
        })
      }

      return { success: true, errors }
    } catch (error) {
      errors.push(error.message)
      return { success: false, errors, error }
    } finally {
      console.error = originalError
    }
  }

  test('should run game with random map generation without crashing', async () => {
    const result = await runGameScenario({
      seed: Math.random() * 1000000,
      spawnVillagers: false,
      placeBuildings: false
    }, 3000)

    expect(result.success).toBe(true)
    expect(result.errors.filter(e => e.includes('TypeError')).length).toBe(0)
  })

  test('should handle random villager spawning without errors', async () => {
    const result = await runGameScenario({
      seed: 12345,
      spawnVillagers: true,
      placeBuildings: false
    }, 5000)

    expect(result.success).toBe(true)
    expect(result.errors.filter(e => e.includes('TypeError')).length).toBe(0)
  })

  test('should handle random building placement without errors', async () => {
    const result = await runGameScenario({
      seed: 67890,
      spawnVillagers: false,
      placeBuildings: true
    }, 5000)

    expect(result.success).toBe(true)
    expect(result.errors.filter(e => e.includes('TypeError')).length).toBe(0)
  })

  test('should handle chaos mode with all random events', async () => {
    const result = await runGameScenario({
      seed: Math.random() * 1000000,
      spawnVillagers: true,
      placeBuildings: true
    }, 5000)

    expect(result.success).toBe(true)

    // Allow some warnings but no TypeErrors
    const typeErrors = result.errors.filter(e => e.includes('TypeError'))
    if (typeErrors.length > 0) {
      console.log('TypeErrors found:', typeErrors)
    }
    expect(typeErrors.length).toBe(0)
  })

  test('should run multiple random scenarios sequentially', async () => {
    const scenarios = [
      { seed: 111, spawnVillagers: true, placeBuildings: false },
      { seed: 222, spawnVillagers: false, placeBuildings: true },
      { seed: 333, spawnVillagers: true, placeBuildings: true },
    ]

    for (const scenario of scenarios) {
      const result = await runGameScenario(scenario, 2000)
      expect(result.success).toBe(true)
    }
  })

  test('should handle rapid state changes without crashing', async () => {
    const errors = []
    const originalError = console.error
    console.error = (...args) => errors.push(args.join(' '))

    try {
      const gameContext = {
        terrainSystem: null,
        pathfindingGrid: null,
        landManager: null,
        canvasRef: { current: document.createElement('canvas') }
      }

      const { result } = renderHook(() => useGameEngine(gameContext))

      // Rapid state changes
      for (let i = 0; i < 50; i++) {
        await act(async () => {
          if (result.current.gameStateRef?.current) {
            const state = result.current.gameStateRef.current

            // Rapidly modify game state
            if (state.villagers) {
              state.villagers.forEach(v => {
                v.x = Math.random() * 1000
                v.y = Math.random() * 1000
                v.state = ['idle', 'wandering', 'working', 'seeking'][Math.floor(Math.random() * 4)]
              })
            }
          }
          await new Promise(resolve => setTimeout(resolve, 10))
        })
      }

      const typeErrors = errors.filter(e => e.includes('TypeError'))
      expect(typeErrors.length).toBe(0)
    } finally {
      console.error = originalError
    }
  })
})
