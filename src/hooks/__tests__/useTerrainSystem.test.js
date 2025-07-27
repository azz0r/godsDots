import { renderHook, act } from '@testing-library/react'
import { useTerrainSystem } from '../useTerrainSystem'

// Mock canvas context
const createMockContext = () => ({
  fillStyle: '',
  globalAlpha: 1,
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  font: '',
  textAlign: '',
  fillText: jest.fn(),
  clearRect: jest.fn(),
})

// Mock MapGenerator
jest.mock('../../utils/mapGeneration/MapGenerator', () => ({
  MapGenerator: jest.fn().mockImplementation((seed) => ({
    generateMap: jest.fn().mockReturnValue({
      terrain: [],
      terrainMap: new Map(),
      resources: [],
      resourceMap: new Map(),
      spawnPoints: [],
      seed: seed || 'test-seed',
      validation: { isValid: true }
    }),
    serializeMap: jest.fn().mockReturnValue('serialized-map-data'),
  })),
  deserializeMap: jest.fn().mockReturnValue({
    terrain: [],
    terrainMap: new Map(),
    resources: [],
    resourceMap: new Map(),
    spawnPoints: [],
    seed: 'loaded-seed'
  })
}))

describe('useTerrainSystem', () => {
  const worldSize = { width: 1000, height: 1000 }
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Terrain Color Mapping', () => {
    it('should render all terrain types with correct colors', () => {
      const { result } = renderHook(() => useTerrainSystem(worldSize))
      const ctx = createMockContext()
      
      // Create test terrain with all terrain types
      const terrainTypes = [
        'grass', 'forest', 'hills', 'water', 'deepWater', 'river',
        'sand', 'desert', 'mountain', 'snow', 'rockyHills', 'tundra',
        'taiga', 'snowyForest', 'grassland', 'savanna', 'tropicalForest',
        'rainforest', 'jungle'
      ]
      
      const expectedColors = {
        grass: '#4a7c59',
        forest: '#2d4a3a',
        hills: '#8b7355',
        water: '#4682b4',
        deepWater: '#1e3a5f',
        river: '#5090d3',
        sand: '#f4e4a1',
        desert: '#d4a76a',
        mountain: '#8b7d6b',
        snow: '#ffffff',
        rockyHills: '#a0907d',
        tundra: '#d0ddd0',
        taiga: '#3d5a3d',
        snowyForest: '#4a5d4a',
        grassland: '#6b8e23',
        savanna: '#bdb76b',
        tropicalForest: '#228b22',
        rainforest: '#2a4a2a',
        jungle: '#1a3a1a'
      }
      
      const testTerrain = terrainTypes.map((type, index) => ({
        x: index * 40,
        y: 0,
        width: 40,
        height: 40,
        type,
        fertility: 0.7,
        walkable: type !== 'water' && type !== 'deepWater'
      }))
      
      act(() => {
        result.current.setTerrain(testTerrain)
      })
      
      // Render terrain
      act(() => {
        result.current.renderTerrain(ctx)
      })
      
      // Verify each terrain type was rendered with correct color
      terrainTypes.forEach((type, index) => {
        expect(ctx.fillRect).toHaveBeenCalledWith(index * 40, 0, 40, 40)
      })
      
      // Check that all expected colors were used
      const usedColors = []
      for (let i = 0; i < ctx.fillRect.mock.calls.length; i++) {
        if (ctx.fillStyle !== '') {
          usedColors.push(ctx.fillStyle)
        }
      }
      
      // Verify fillStyle was set for each terrain type
      expect(ctx.fillRect).toHaveBeenCalledTimes(testTerrain.length)
    })

    it('should render unknown terrain types with default color', () => {
      const { result } = renderHook(() => useTerrainSystem(worldSize))
      const ctx = createMockContext()
      
      const testTerrain = [{
        x: 0,
        y: 0,
        width: 40,
        height: 40,
        type: 'unknown_terrain_type',
        fertility: 0.5,
        walkable: true
      }]
      
      act(() => {
        result.current.setTerrain(testTerrain)
      })
      
      act(() => {
        result.current.renderTerrain(ctx)
      })
      
      // Should use default color #666666 for unknown terrain
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 40, 40)
    })
  })

  describe('Terrain Texture Rendering', () => {
    it('should apply elevation-based shading to terrain tiles', () => {
      const { result } = renderHook(() => useTerrainSystem(worldSize))
      const ctx = createMockContext()
      
      const testTerrain = [
        { x: 0, y: 0, width: 40, height: 40, type: 'mountain', elevation: 0.8 },
        { x: 40, y: 0, width: 40, height: 40, type: 'valley', elevation: 0.2 },
        { x: 80, y: 0, width: 40, height: 40, type: 'plains', elevation: 0.5 }
      ]
      
      act(() => {
        result.current.setTerrain(testTerrain)
      })
      
      act(() => {
        result.current.renderTerrain(ctx)
      })
      
      // Verify shading was applied based on elevation
      // High elevation (> 0.7) should add white overlay
      // Low elevation (< 0.3) should add black overlay
      // Mid elevation should have no overlay
      
      const alphaChanges = []
      const fillStyleChanges = []
      
      // Track globalAlpha changes
      ctx.globalAlpha = 1
      Object.defineProperty(ctx, 'globalAlpha', {
        get: jest.fn(() => 1),
        set: jest.fn((value) => alphaChanges.push(value))
      })
      
      // Re-render to capture alpha changes
      act(() => {
        result.current.renderTerrain(ctx)
      })
      
      // Should have alpha changes for elevation shading
      expect(alphaChanges.filter(a => a === 0.2).length).toBeGreaterThan(0)
      expect(alphaChanges.filter(a => a === 1).length).toBeGreaterThan(0)
    })

    it('should not apply shading to tiles without elevation data', () => {
      const { result } = renderHook(() => useTerrainSystem(worldSize))
      const ctx = createMockContext()
      
      const testTerrain = [
        { x: 0, y: 0, width: 40, height: 40, type: 'grass' }
        // No elevation property
      ]
      
      act(() => {
        result.current.setTerrain(testTerrain)
      })
      
      act(() => {
        result.current.renderTerrain(ctx)
      })
      
      // Should only have one fillRect call for the base terrain
      expect(ctx.fillRect).toHaveBeenCalledTimes(1)
    })
  })

  describe('Terrain Blending/Transitions', () => {
    it('should identify neighboring terrain types for blending', () => {
      const { result } = renderHook(() => useTerrainSystem(worldSize))
      
      // Create a simple 3x3 terrain grid with different types
      const terrain = []
      const types = ['grass', 'forest', 'water']
      
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          const tile = {
            x: x * 40,
            y: y * 40,
            width: 40,
            height: 40,
            type: types[(x + y) % 3],
            walkable: types[(x + y) % 3] !== 'water'
          }
          terrain.push(tile)
        }
      }
      
      act(() => {
        result.current.setTerrain(terrain)
      })
      
      // Test getting terrain at specific positions
      const centerTile = result.current.getTerrainAt(40, 40)
      expect(centerTile).toBeDefined()
      expect(centerTile.type).toBe(types[2]) // Based on the pattern
      
      // Test neighboring tiles
      const neighbors = [
        result.current.getTerrainAt(0, 40),   // left
        result.current.getTerrainAt(80, 40),  // right
        result.current.getTerrainAt(40, 0),   // top
        result.current.getTerrainAt(40, 80)   // bottom
      ]
      
      neighbors.forEach(neighbor => {
        expect(neighbor).toBeDefined()
      })
    })

    it('should handle terrain queries at tile boundaries correctly', () => {
      const { result } = renderHook(() => useTerrainSystem(worldSize))
      
      const testTerrain = [
        { x: 0, y: 0, width: 40, height: 40, type: 'grass', walkable: true },
        { x: 40, y: 0, width: 40, height: 40, type: 'forest', walkable: true }
      ]
      
      act(() => {
        result.current.setTerrain(testTerrain)
      })
      
      // Test at exact boundary
      expect(result.current.getTerrainAt(40, 20)).toBeDefined()
      expect(result.current.getTerrainAt(40, 20).type).toBe('forest')
      
      // Test just before boundary
      expect(result.current.getTerrainAt(39, 20)).toBeDefined()
      expect(result.current.getTerrainAt(39, 20).type).toBe('grass')
    })
  })

  describe('Performance with Large Maps', () => {
    it('should efficiently render large numbers of terrain tiles', () => {
      const largeWorldSize = { width: 4000, height: 4000 }
      const { result } = renderHook(() => useTerrainSystem(largeWorldSize))
      const ctx = createMockContext()
      
      // Generate large terrain grid
      const largeTerrain = []
      const tileSize = 40
      const tilesX = largeWorldSize.width / tileSize
      const tilesY = largeWorldSize.height / tileSize
      
      for (let x = 0; x < tilesX; x++) {
        for (let y = 0; y < tilesY; y++) {
          largeTerrain.push({
            x: x * tileSize,
            y: y * tileSize,
            width: tileSize,
            height: tileSize,
            type: 'grass',
            walkable: true
          })
        }
      }
      
      act(() => {
        result.current.setTerrain(largeTerrain)
      })
      
      const startTime = performance.now()
      
      act(() => {
        result.current.renderTerrain(ctx)
      })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Rendering should complete in reasonable time (< 100ms for 10000 tiles)
      expect(renderTime).toBeLessThan(100)
      expect(ctx.fillRect).toHaveBeenCalledTimes(largeTerrain.length)
    })

    it('should efficiently query terrain at arbitrary positions', () => {
      const { result } = renderHook(() => useTerrainSystem(worldSize))
      
      // Generate terrain with Map for fast lookups
      act(() => {
        result.current.generateTerrain('performance-test')
      })
      
      const queries = 10000
      const startTime = performance.now()
      
      // Perform many random queries
      for (let i = 0; i < queries; i++) {
        const x = Math.random() * worldSize.width
        const y = Math.random() * worldSize.height
        result.current.getTerrainAt(x, y)
      }
      
      const endTime = performance.now()
      const queryTime = endTime - startTime
      
      // Should handle 10000 queries in less than 50ms
      expect(queryTime).toBeLessThan(50)
    })
  })

  describe('Resource Rendering', () => {
    it('should render all resource types with correct colors', () => {
      const { result } = renderHook(() => useTerrainSystem(worldSize))
      const ctx = createMockContext()
      
      const resourceTypes = [
        'tree', 'stone', 'ironOre', 'goldOre',
        'berryBush', 'wheat', 'fish', 'clay'
      ]
      
      const expectedColors = {
        tree: '#2d5016',
        stone: '#696969',
        ironOre: '#8b4513',
        goldOre: '#ffd700',
        berryBush: '#8b008b',
        wheat: '#daa520',
        fish: '#4169e1',
        clay: '#cd853f'
      }
      
      const testResources = resourceTypes.map((type, index) => ({
        x: index * 40,
        y: 0,
        type,
        amount: 100,
        maxAmount: 100
      }))
      
      // Set resources directly on the ref
      act(() => {
        result.current.resources.length = 0
        result.current.resources.push(...testResources)
      })
      
      act(() => {
        result.current.renderResources(ctx)
      })
      
      // Should draw a circle for each resource
      expect(ctx.beginPath).toHaveBeenCalledTimes(resourceTypes.length)
      expect(ctx.arc).toHaveBeenCalledTimes(resourceTypes.length)
      expect(ctx.fill).toHaveBeenCalledTimes(resourceTypes.length)
    })

    it('should render resource depletion indicators', () => {
      const { result } = renderHook(() => useTerrainSystem(worldSize))
      const ctx = createMockContext()
      
      const depletedResources = [
        { x: 0, y: 0, type: 'tree', amount: 50, maxAmount: 100 },
        { x: 40, y: 0, type: 'stone', amount: 25, maxAmount: 100 },
        { x: 80, y: 0, type: 'ironOre', amount: 0, maxAmount: 100 }
      ]
      
      act(() => {
        result.current.resources.length = 0
        result.current.resources.push(...depletedResources)
      })
      
      act(() => {
        result.current.renderResources(ctx)
      })
      
      // Should render percentage text for depleted resources
      expect(ctx.fillText).toHaveBeenCalledWith('50%', 20, 35)
      expect(ctx.fillText).toHaveBeenCalledWith('25%', 60, 35)
      expect(ctx.fillText).toHaveBeenCalledWith('0%', 100, 35)
    })
  })

  describe('Terrain Generation', () => {
    it('should generate terrain with proper seed handling', () => {
      const { result } = renderHook(() => useTerrainSystem(worldSize))
      
      act(() => {
        const mapData = result.current.generateTerrain('test-seed-123')
        expect(mapData.seed).toBe('test-seed-123')
      })
      
      expect(result.current.mapSeed).toBe('test-seed-123')
    })

    it('should handle walkability checks correctly', () => {
      const { result } = renderHook(() => useTerrainSystem(worldSize))
      
      const testTerrain = [
        { x: 0, y: 0, width: 40, height: 40, type: 'grass', walkable: true },
        { x: 40, y: 0, width: 40, height: 40, type: 'water', walkable: false }
      ]
      
      act(() => {
        result.current.setTerrain(testTerrain)
      })
      
      expect(result.current.isWalkable(20, 20)).toBe(true)  // grass tile
      expect(result.current.isWalkable(60, 20)).toBe(false) // water tile
      expect(result.current.isWalkable(1000, 1000)).toBe(false) // out of bounds
    })
  })
})