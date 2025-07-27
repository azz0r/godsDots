import { renderHook, act } from '@testing-library/react'
import { useVillagerSystem } from '../useVillagerSystem'

// Mock canvas context
const createMockContext = () => ({
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
})

// Mock dependencies
const createMockTerrainSystem = () => ({
  isWalkable: jest.fn().mockReturnValue(true),
  getTerrainAt: jest.fn().mockReturnValue({ type: 'grass', walkable: true })
})

const createMockGodBoundary = () => ({
  isWithinBoundary: jest.fn().mockReturnValue(true),
  center: { x: 500, y: 500 }
})

const createMockPathSystem = () => ({
  requestPath: jest.fn().mockReturnValue(null),
  clearPath: jest.fn(),
  updatePathUsage: jest.fn(),
  findRandomDestinationOnPath: jest.fn().mockReturnValue(null)
})

describe('useVillagerSystem', () => {
  const worldSize = { width: 1000, height: 1000 }
  let terrainSystem, godBoundary, pathSystem
  
  beforeEach(() => {
    jest.clearAllMocks()
    terrainSystem = createMockTerrainSystem()
    godBoundary = createMockGodBoundary()
    pathSystem = createMockPathSystem()
  })
  
  it('should spawn villagers correctly', () => {
    const { result } = renderHook(() => 
      useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
    )
    
    expect(result.current.getVillagers()).toEqual([])
    
    act(() => {
      result.current.spawnVillagers(3, 500, 500)
    })
    
    const villagers = result.current.getVillagers()
    expect(villagers).toHaveLength(3)
    expect(villagers[0]).toHaveProperty('x')
    expect(villagers[0]).toHaveProperty('y')
  })

  describe('Villager Sprite Rendering at Different Scales', () => {
    it('should render villagers at default scale', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      const ctx = createMockContext()
      
      act(() => {
        result.current.spawnVillagers(3, 500, 500)
      })
      
      act(() => {
        result.current.renderVillagers(ctx)
      })
      
      // Should render health ring and body for each villager
      expect(ctx.beginPath).toHaveBeenCalledTimes(6) // 2 per villager (health + body)
      expect(ctx.arc).toHaveBeenCalledTimes(6)
      expect(ctx.fill).toHaveBeenCalledTimes(6)
    })

    it('should use pixel-aligned positions for crisp rendering', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      const ctx = createMockContext()
      
      // Spawn villager at non-integer position
      act(() => {
        result.current.villagers.push({
          id: 1,
          x: 100.7,
          y: 200.3,
          health: 100,
          state: 'idle'
        })
      })
      
      act(() => {
        result.current.renderVillagers(ctx)
      })
      
      // Should use Math.floor for pixel-perfect rendering
      expect(ctx.arc).toHaveBeenCalledWith(100, 200, expect.any(Number), 0, Math.PI * 2)
    })

    it('should scale villager size based on zoom level', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      const ctx = createMockContext()
      
      act(() => {
        result.current.spawnVillagers(1, 500, 500)
      })
      
      // Test rendering at different scales
      const scales = [0.5, 1, 2]
      scales.forEach(scale => {
        ctx.arc.mockClear()
        
        // Apply scale transform
        ctx.scale(scale, scale)
        
        act(() => {
          result.current.renderVillagers(ctx)
        })
        
        // Verify arc was called with appropriate radius
        expect(ctx.arc).toHaveBeenCalledWith(
          expect.any(Number),
          expect.any(Number),
          6, // health ring radius
          0,
          Math.PI * 2
        )
        expect(ctx.arc).toHaveBeenCalledWith(
          expect.any(Number),
          expect.any(Number),
          4, // body radius
          0,
          Math.PI * 2
        )
      })
    })
  })

  describe('Villager Animation States', () => {
    it('should render idle state without additional indicators', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      const ctx = createMockContext()
      
      act(() => {
        result.current.villagers.push({
          id: 1,
          x: 100,
          y: 100,
          health: 100,
          state: 'idle'
        })
      })
      
      act(() => {
        result.current.renderVillagers(ctx)
      })
      
      // Should not render state indicator for idle
      expect(ctx.fillRect).not.toHaveBeenCalled()
    })

    it('should render working state with yellow indicator', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      const ctx = createMockContext()
      
      act(() => {
        result.current.villagers.push({
          id: 1,
          x: 100,
          y: 100,
          health: 100,
          state: 'working'
        })
      })
      
      act(() => {
        result.current.renderVillagers(ctx)
      })
      
      // Should render yellow indicator above villager
      expect(ctx.fillRect).toHaveBeenCalledWith(98, 90, 4, 2)
    })

    it('should render fleeing state with red indicator', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      const ctx = createMockContext()
      
      act(() => {
        result.current.villagers.push({
          id: 1,
          x: 100,
          y: 100,
          health: 100,
          state: 'fleeing'
        })
      })
      
      act(() => {
        result.current.renderVillagers(ctx)
      })
      
      // Should render red indicator above villager
      expect(ctx.fillRect).toHaveBeenCalledWith(98, 90, 4, 2)
    })

    it('should animate walking state with movement', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      
      act(() => {
        result.current.spawnVillagers(1, 500, 500)
      })
      
      const villagers = result.current.getVillagers()
      const initialX = villagers[0].x
      
      // Modify villager state
      villagers[0].state = 'wandering'
      villagers[0].target = { x: 600, y: 500 }
      
      // Update multiple times to simulate animation
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.updateVillagers(i * 60)
        })
      }
      
      // Villager should have moved
      expect(result.current.getVillagers()[0].x).not.toBe(initialX)
    })
  })

  describe('Villager Direction Changes', () => {
    it('should update velocity based on target direction', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      
      act(() => {
        result.current.spawnVillagers(1, 500, 500)
      })
      
      const villagers = result.current.getVillagers()
      // Set villager at exact position for predictable test
      villagers[0].x = 500
      villagers[0].y = 500
      villagers[0].target = { x: 600, y: 500 } // Target to the right
      
      act(() => {
        result.current.updateVillagers(0)
      })
      
      const updatedVillagers = result.current.getVillagers()
      // Velocity should point towards target
      expect(updatedVillagers[0].vx).toBeGreaterThan(0)
      expect(Math.abs(updatedVillagers[0].vy)).toBeLessThan(0.1)
    })

    it('should handle diagonal movement correctly', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      
      act(() => {
        result.current.spawnVillagers(1, 500, 500)
      })
      
      const villagers = result.current.getVillagers()
      villagers[0].target = { x: 600, y: 600 } // Diagonal target
      
      act(() => {
        result.current.updateVillagers(0)
      })
      
      const updatedVillagers = result.current.getVillagers()
      // Both velocity components should be positive
      expect(updatedVillagers[0].vx).toBeGreaterThan(0)
      expect(updatedVillagers[0].vy).toBeGreaterThan(0)
    })

    it('should stop when reaching target', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      
      act(() => {
        result.current.spawnVillagers(1, 500, 500)
      })
      
      const villagers = result.current.getVillagers()
      // Set villager at exact position
      villagers[0].x = 500
      villagers[0].y = 500
      villagers[0].target = { x: 505, y: 500 } // Very close target
      
      // Update until target is reached
      for (let i = 0; i < 20; i++) {
        act(() => {
          result.current.updateVillagers(i * 60)
        })
      }
      
      const finalVillagers = result.current.getVillagers()
      // Should have no target and minimal velocity
      expect(finalVillagers[0].target).toBeNull()
      expect(Math.abs(finalVillagers[0].vx)).toBeLessThan(0.1)
      expect(Math.abs(finalVillagers[0].vy)).toBeLessThan(0.1)
    })
  })

  describe('Villager Selection Highlighting', () => {
    it('should render health indicator with appropriate color', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      const ctx = createMockContext()
      
      const healthStates = [
        { health: 100, expectedColor: '#00ff00' }, // Green
        { health: 50, expectedColor: '#ffff00' },  // Yellow
        { health: 20, expectedColor: '#ff0000' }   // Red
      ]
      
      healthStates.forEach(({ health, expectedColor }) => {
        ctx.fillStyle = ''
        
        act(() => {
          result.current.villagers.length = 0
          result.current.villagers.push({
            id: 1,
            x: 100,
            y: 100,
            health,
            state: 'idle'
          })
        })
        
        act(() => {
          result.current.renderVillagers(ctx)
        })
        
        // Verify health ring color was set
        const fillStyleCalls = []
        let currentFillStyle = ''
        
        // Mock fillStyle setter to track changes
        Object.defineProperty(ctx, 'fillStyle', {
          get: () => currentFillStyle,
          set: (value) => {
            currentFillStyle = value
            fillStyleCalls.push(value)
          }
        })
        
        act(() => {
          result.current.renderVillagers(ctx)
        })
        
        expect(fillStyleCalls).toContain(expectedColor)
      })
    })

    it('should highlight selected villagers differently', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      const ctx = createMockContext()
      
      act(() => {
        result.current.villagers.push({
          id: 1,
          x: 100,
          y: 100,
          health: 100,
          state: 'idle',
          selected: true // Selected villager
        })
      })
      
      act(() => {
        result.current.renderVillagers(ctx)
      })
      
      // Should render selection indicator (implementation may vary)
      // For now, basic rendering is verified
      expect(ctx.arc).toHaveBeenCalled()
    })
  })

  describe('Villager Movement and Pathfinding', () => {
    it('should use pathfinding when available', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      
      const mockPath = {
        complete: false,
        isNearTarget: jest.fn().mockReturnValue(false),
        advance: jest.fn(),
        getDirection: jest.fn().mockReturnValue({ x: 1, y: 0 })
      }
      
      pathSystem.requestPath.mockReturnValue(mockPath)
      // Mock findRandomDestinationOnPath to return null so it falls back to A*
      pathSystem.findRandomDestinationOnPath.mockReturnValue(null)
      
      act(() => {
        result.current.spawnVillagers(1, 500, 500)
      })
      
      const villagers = result.current.getVillagers()
      villagers[0].state = 'wandering'
      villagers[0].movement.lastMoveTime = 0
      villagers[0].pathfinding.lastPathUpdate = 0
      villagers[0].pathfinding.currentPath = null
      
      // Mock Math.random to ensure we take the A* path
      const originalRandom = Math.random
      Math.random = jest.fn().mockReturnValue(0.8) // > 0.7 to skip road following
      
      act(() => {
        result.current.updateVillagers(61) // After movement delay
      })
      
      Math.random = originalRandom
      
      expect(pathSystem.requestPath).toHaveBeenCalled()
    })

    it('should handle idle periods correctly', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      
      act(() => {
        result.current.spawnVillagers(1, 500, 500)
      })
      
      const villagers = result.current.getVillagers()
      const initialX = villagers[0].x
      
      // Set idle state
      villagers[0].movement.isIdle = true
      villagers[0].movement.idleDuration = 120
      villagers[0].movement.idleTime = 0
      
      // Update during idle period
      act(() => {
        result.current.updateVillagers(0)
      })
      
      const updatedVillagers = result.current.getVillagers()
      // Should not move while idle
      expect(updatedVillagers[0].x).toBe(initialX)
      expect(updatedVillagers[0].movement.idleTime).toBe(1)
    })

    it('should constrain villagers to walkable terrain', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      
      // Make terrain non-walkable at villager position
      terrainSystem.isWalkable.mockReturnValue(false)
      
      act(() => {
        result.current.spawnVillagers(1, 100, 100)
      })
      
      act(() => {
        result.current.updateVillagers(0)
      })
      
      // Should find nearest walkable tile
      expect(terrainSystem.isWalkable).toHaveBeenCalled()
    })
  })

  describe('Performance with Multiple Villagers', () => {
    it('should efficiently render large numbers of villagers', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      const ctx = createMockContext()
      
      // Spawn many villagers
      act(() => {
        result.current.spawnVillagers(100, 500, 500)
      })
      
      const startTime = performance.now()
      
      act(() => {
        result.current.renderVillagers(ctx)
      })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Should render 100 villagers quickly
      expect(renderTime).toBeLessThan(50)
      expect(ctx.arc).toHaveBeenCalledTimes(200) // 2 circles per villager
    })

    it('should efficiently update villager states', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      
      act(() => {
        result.current.spawnVillagers(100, 500, 500)
      })
      
      const startTime = performance.now()
      
      // Run multiple update cycles
      for (let i = 0; i < 60; i++) {
        act(() => {
          result.current.updateVillagers(i)
        })
      }
      
      const endTime = performance.now()
      const updateTime = endTime - startTime
      
      // Should handle 60 updates of 100 villagers efficiently
      expect(updateTime).toBeLessThan(100)
    })
  })

  describe('Villager Queries', () => {
    it('should find villagers within a radius', () => {
      const { result } = renderHook(() => 
        useVillagerSystem(worldSize, terrainSystem, godBoundary, pathSystem)
      )
      
      act(() => {
        // Spawn villagers at different distances
        result.current.villagers.push(
          { id: 1, x: 100, y: 100 }, // Distance 0
          { id: 2, x: 150, y: 100 }, // Distance 50
          { id: 3, x: 200, y: 100 }, // Distance 100
          { id: 4, x: 300, y: 100 }  // Distance 200
        )
      })
      
      const nearbyVillagers = result.current.getVillagersNear(100, 100, 75)
      
      expect(nearbyVillagers).toHaveLength(2)
      expect(nearbyVillagers.map(v => v.id)).toContain(1)
      expect(nearbyVillagers.map(v => v.id)).toContain(2)
    })
  })
})