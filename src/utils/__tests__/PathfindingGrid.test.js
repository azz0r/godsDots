import { PathfindingGrid } from '../pathfinding/PathfindingGrid'
import { PathNode } from '../pathfinding/PathNode'

describe('PathfindingGrid', () => {
  describe('initialization', () => {
    it('should initialize without terrain system', () => {
      const grid = new PathfindingGrid(640, 480)
      
      expect(grid.worldWidth).toBe(640)
      expect(grid.worldHeight).toBe(480)
      expect(grid.width).toBe(Math.ceil(640 / PathNode.GRID_SIZE))
      expect(grid.height).toBe(Math.ceil(480 / PathNode.GRID_SIZE))
      expect(grid.nodes).toBeDefined()
      expect(grid.nodeMap).toBeDefined()
    })
    
    it('should create default walkable nodes when no terrain system is provided', () => {
      const grid = new PathfindingGrid(320, 320)
      
      const node = grid.getNodeAt(0, 0)
      expect(node).toBeDefined()
      expect(node.walkable).toBe(true)
      expect(node.terrain).toBe('grass')
    })
    
    it('should initialize with terrain system', () => {
      const mockTerrainSystem = {
        getTerrainAt: jest.fn().mockReturnValue({
          type: 'water',
          walkable: false
        })
      }
      
      const grid = new PathfindingGrid(320, 320, mockTerrainSystem)
      
      expect(mockTerrainSystem.getTerrainAt).toHaveBeenCalled()
      const node = grid.getNodeAt(0, 0)
      expect(node.walkable).toBe(false)
      expect(node.terrain).toBe('water')
    })
    
    it('should update terrain system after construction', () => {
      const grid = new PathfindingGrid(320, 320)
      
      // Initially all nodes are walkable
      let node = grid.getNodeAt(0, 0)
      expect(node.walkable).toBe(true)
      
      // Set terrain system
      const mockTerrainSystem = {
        getTerrainAt: jest.fn().mockReturnValue({
          type: 'mountain',
          walkable: false
        })
      }
      
      grid.setTerrainSystem(mockTerrainSystem)
      
      // Now nodes should be updated
      node = grid.getNodeAt(0, 0)
      expect(node.walkable).toBe(false)
      expect(node.terrain).toBe('mountain')
    })
  })
  
  describe('node operations', () => {
    let grid
    
    beforeEach(() => {
      grid = new PathfindingGrid(320, 320)
    })
    
    it('should get node at grid coordinates', () => {
      const node = grid.getNodeAt(5, 5)
      expect(node).toBeDefined()
      expect(node.x).toBe(5)
      expect(node.y).toBe(5)
    })
    
    it('should get node at world coordinates', () => {
      const node = grid.getNodeAtWorldPosition(100, 100)
      expect(node).toBeDefined()
      expect(node.x).toBe(Math.floor(100 / PathNode.GRID_SIZE))
      expect(node.y).toBe(Math.floor(100 / PathNode.GRID_SIZE))
    })
    
    it('should set node walkability', () => {
      grid.setWalkable(3, 3, false)
      const node = grid.getNodeAt(3, 3)
      expect(node.walkable).toBe(false)
    })
    
    it('should set node cost', () => {
      grid.setCost(2, 2, 2.5)
      const node = grid.getNodeAt(2, 2)
      expect(node.cost).toBe(2.5)
    })
    
    it('should get neighbors', () => {
      const neighbors = grid.getNeighbors(5, 5)
      expect(neighbors.length).toBeGreaterThan(0)
      expect(neighbors.length).toBeLessThanOrEqual(8) // Max 8 neighbors
    })
    
    it('should only return walkable neighbors', () => {
      // Make some neighbors unwalkable
      grid.setWalkable(4, 5, false)
      grid.setWalkable(6, 5, false)
      
      const neighbors = grid.getNeighbors(5, 5)
      const unwalkableNeighbors = neighbors.filter(n => !n.walkable)
      expect(unwalkableNeighbors.length).toBe(0)
    })
  })
  
  describe('caching', () => {
    let grid
    
    beforeEach(() => {
      grid = new PathfindingGrid(320, 320)
    })
    
    it('should cache paths', () => {
      const path = [grid.getNodeAt(0, 0), grid.getNodeAt(1, 1)]
      grid.cachePath('test-key', path)
      
      const cached = grid.getCachedPath('test-key')
      expect(cached).toEqual(path)
    })
    
    it('should return null for expired cache', () => {
      const path = [grid.getNodeAt(0, 0), grid.getNodeAt(1, 1)]
      grid.cachePath('test-key', path)
      
      // Mock time passage
      grid.pathCache.get('test-key').timestamp = Date.now() - grid.cacheTimeout - 1
      
      const cached = grid.getCachedPath('test-key')
      expect(cached).toBeNull()
    })
    
    it('should limit cache size', () => {
      grid.maxCacheSize = 2
      
      grid.cachePath('key1', [])
      grid.cachePath('key2', [])
      grid.cachePath('key3', []) // Should evict key1
      
      expect(grid.pathCache.has('key1')).toBe(false)
      expect(grid.pathCache.has('key2')).toBe(true)
      expect(grid.pathCache.has('key3')).toBe(true)
    })
  })
})