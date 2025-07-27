import { PathNode } from './PathNode.js'

/**
 * Grid representation for pathfinding
 * Manages walkable/non-walkable areas and terrain costs
 */
export class PathfindingGrid {
  constructor(worldWidth, worldHeight, terrainSystem = null) {
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
    this.terrainSystem = terrainSystem
    
    // Calculate grid dimensions
    this.width = Math.ceil(worldWidth / PathNode.GRID_SIZE)
    this.height = Math.ceil(worldHeight / PathNode.GRID_SIZE)
    
    // Initialize the grid
    this.nodes = []
    this.nodeMap = new Map()
    
    // Path cache for performance
    this.pathCache = new Map()
    this.cacheTimeout = 5000 // Cache paths for 5 seconds
    this.maxCacheSize = 100
    
    // Only initialize grid if we have a terrain system
    if (this.terrainSystem) {
      this.initializeGrid()
    } else {
      // Initialize with default walkable nodes
      this.initializeDefaultGrid()
    }
  }

  /**
   * Initialize the grid with default walkable nodes
   */
  initializeDefaultGrid() {
    for (let y = 0; y < this.height; y++) {
      this.nodes[y] = []
      for (let x = 0; x < this.width; x++) {
        // Default to walkable grass terrain
        const node = new PathNode(x, y, true, 'grass')
        this.nodes[y][x] = node
        this.nodeMap.set(`${x},${y}`, node)
      }
    }
  }

  /**
   * Initialize the grid with nodes based on terrain
   */
  initializeGrid() {
    for (let y = 0; y < this.height; y++) {
      this.nodes[y] = []
      for (let x = 0; x < this.width; x++) {
        const worldX = x * PathNode.GRID_SIZE
        const worldY = y * PathNode.GRID_SIZE
        
        // Get terrain at this position
        const terrain = this.terrainSystem.getTerrainAt(worldX, worldY)
        const terrainType = terrain ? terrain.type : 'grass'
        const walkable = terrain ? terrain.walkable : true
        
        const node = new PathNode(x, y, walkable, terrainType)
        this.nodes[y][x] = node
        this.nodeMap.set(`${x},${y}`, node)
      }
    }
  }

  /**
   * Get node at grid coordinates
   * @param {number} x - Grid x coordinate
   * @param {number} y - Grid y coordinate
   * @returns {PathNode|null}
   */
  getNodeAt(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null
    }
    return this.nodes[y][x]
  }

  /**
   * Get node at world coordinates
   * @param {number} worldX 
   * @param {number} worldY 
   * @returns {PathNode|null}
   */
  getNodeAtWorldPosition(worldX, worldY) {
    const gridX = Math.floor(worldX / PathNode.GRID_SIZE)
    const gridY = Math.floor(worldY / PathNode.GRID_SIZE)
    return this.getNodeAt(gridX, gridY)
  }

  /**
   * Update grid when a building is placed
   * @param {Object} building - Building object with x, y, width, height properties
   */
  updateForBuilding(building) {
    const startX = Math.floor(building.x / PathNode.GRID_SIZE)
    const startY = Math.floor(building.y / PathNode.GRID_SIZE)
    const endX = Math.ceil((building.x + building.width) / PathNode.GRID_SIZE)
    const endY = Math.ceil((building.y + building.height) / PathNode.GRID_SIZE)

    // Mark all nodes covered by the building as non-walkable
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const node = this.getNodeAt(x, y)
        if (node) {
          node.walkable = false
          node.terrain = 'building'
          node.cost = Infinity
        }
      }
    }

    // Clear path cache when grid changes
    this.clearCache()
  }

  /**
   * Update grid when a building is removed
   * @param {Object} building 
   */
  updateForBuildingRemoval(building) {
    const startX = Math.floor(building.x / PathNode.GRID_SIZE)
    const startY = Math.floor(building.y / PathNode.GRID_SIZE)
    const endX = Math.ceil((building.x + building.width) / PathNode.GRID_SIZE)
    const endY = Math.ceil((building.y + building.height) / PathNode.GRID_SIZE)

    // Restore original terrain for nodes that were covered by the building
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const node = this.getNodeAt(x, y)
        if (node && node.terrain === 'building') {
          const worldX = x * PathNode.GRID_SIZE
          const worldY = y * PathNode.GRID_SIZE
          const terrain = this.terrainSystem.getTerrainAt(worldX, worldY)
          
          if (terrain) {
            node.walkable = terrain.walkable
            node.terrain = terrain.type
            node.cost = node.getTerrainCost()
          }
        }
      }
    }

    this.clearCache()
  }

  /**
   * Update all buildings at once (more efficient for initial setup)
   * @param {Array} buildings 
   */
  updateAllBuildings(buildings) {
    // First reset all building nodes to their terrain state
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const node = this.nodes[y][x]
        if (node.terrain === 'building') {
          const worldX = x * PathNode.GRID_SIZE
          const worldY = y * PathNode.GRID_SIZE
          const terrain = this.terrainSystem.getTerrainAt(worldX, worldY)
          
          if (terrain) {
            node.walkable = terrain.walkable
            node.terrain = terrain.type
            node.cost = node.getTerrainCost()
          }
        }
      }
    }

    // Then mark all building areas
    for (const building of buildings) {
      this.updateForBuilding(building)
    }
  }

  /**
   * Create road/path terrain for faster movement
   * @param {Array<{x: number, y: number}>} pathNodes 
   */
  createRoad(pathNodes) {
    for (const pathNode of pathNodes) {
      const gridX = Math.floor(pathNode.x / PathNode.GRID_SIZE)
      const gridY = Math.floor(pathNode.y / PathNode.GRID_SIZE)
      const node = this.getNodeAt(gridX, gridY)
      
      if (node && node.terrain !== 'building' && node.terrain !== 'water') {
        node.terrain = 'road'
        node.cost = node.getTerrainCost()
      }
    }

    this.clearCache()
  }

  /**
   * Set the terrain system and reinitialize grid
   * @param {Object} terrainSystem - The terrain system to use
   */
  setTerrainSystem(terrainSystem) {
    this.terrainSystem = terrainSystem
    if (terrainSystem) {
      this.initializeGrid()
    }
  }

  /**
   * Set walkability for a node at grid coordinates
   * @param {number} x - Grid x coordinate
   * @param {number} y - Grid y coordinate
   * @param {boolean} walkable - Whether the node is walkable
   */
  setWalkable(x, y, walkable) {
    const node = this.getNodeAt(x, y)
    if (node) {
      node.walkable = walkable
      this.clearCache() // Clear path cache when walkability changes
    }
  }

  /**
   * Set movement cost for a node at grid coordinates
   * @param {number} x - Grid x coordinate
   * @param {number} y - Grid y coordinate
   * @param {number} cost - Movement cost (1 = normal, higher = slower)
   */
  setCost(x, y, cost) {
    const node = this.getNodeAt(x, y)
    if (node) {
      node.cost = cost
      this.clearCache() // Clear path cache when costs change
    }
  }

  /**
   * Get walkable neighbors of a node
   * @param {number} x - Grid x coordinate
   * @param {number} y - Grid y coordinate
   * @returns {Array<PathNode>} Array of walkable neighbor nodes
   */
  getNeighbors(x, y) {
    const neighbors = []
    
    // Check all 8 directions
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue // Skip self
        
        const nx = x + dx
        const ny = y + dy
        const node = this.getNodeAt(nx, ny)
        
        if (node && node.walkable && !node.temporaryObstacle) {
          neighbors.push(node)
        }
      }
    }
    
    return neighbors
  }

  /**
   * Reset all nodes for pathfinding
   */
  resetNodes() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.nodes[y][x].reset()
      }
    }
  }

  /**
   * Get cached path or null if not cached/expired
   * @param {string} key 
   * @returns {Array<PathNode>|null}
   */
  getCachedPath(key) {
    const cached = this.pathCache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.path
    }
    return null
  }

  /**
   * Cache a path
   * @param {string} key 
   * @param {Array<PathNode>} path 
   */
  cachePath(key, path) {
    // Limit cache size
    if (this.pathCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const oldestKey = this.pathCache.keys().next().value
      this.pathCache.delete(oldestKey)
    }

    this.pathCache.set(key, {
      path: path,
      timestamp: Date.now()
    })
  }

  /**
   * Clear path cache
   */
  clearCache() {
    this.pathCache.clear()
  }

  /**
   * Clean expired cache entries
   */
  cleanCache() {
    const now = Date.now()
    for (const [key, value] of this.pathCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.pathCache.delete(key)
      }
    }
  }

  /**
   * Get nodes in a radius around a world position
   * @param {number} worldX 
   * @param {number} worldY 
   * @param {number} radius 
   * @returns {Array<PathNode>}
   */
  getNodesInRadius(worldX, worldY, radius) {
    const centerX = Math.floor(worldX / PathNode.GRID_SIZE)
    const centerY = Math.floor(worldY / PathNode.GRID_SIZE)
    const gridRadius = Math.ceil(radius / PathNode.GRID_SIZE)
    
    const nodes = []
    
    for (let y = centerY - gridRadius; y <= centerY + gridRadius; y++) {
      for (let x = centerX - gridRadius; x <= centerX + gridRadius; x++) {
        const node = this.getNodeAt(x, y)
        if (node) {
          const dx = node.x - centerX
          const dy = node.y - centerY
          if (dx * dx + dy * dy <= gridRadius * gridRadius) {
            nodes.push(node)
          }
        }
      }
    }
    
    return nodes
  }

  /**
   * Debug render method to visualize the grid
   * @param {CanvasRenderingContext2D} ctx 
   * @param {boolean} showCosts 
   */
  debugRender(ctx, showCosts = false) {
    const colors = {
      grass: 'rgba(74, 124, 89, 0.3)',
      forest: 'rgba(45, 74, 58, 0.3)',
      hills: 'rgba(139, 115, 85, 0.3)',
      water: 'rgba(70, 130, 180, 0.5)',
      road: 'rgba(139, 69, 19, 0.3)',
      building: 'rgba(255, 0, 0, 0.5)'
    }

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const node = this.nodes[y][x]
        
        if (!node.walkable) {
          ctx.fillStyle = colors[node.terrain] || 'rgba(0, 0, 0, 0.5)'
          ctx.fillRect(
            node.worldX,
            node.worldY,
            PathNode.GRID_SIZE,
            PathNode.GRID_SIZE
          )
        }

        if (showCosts && node.walkable && node.cost !== 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
          ctx.font = '10px Arial'
          ctx.fillText(
            node.cost.toFixed(1),
            node.worldX + 2,
            node.worldY + 12
          )
        }
      }
    }
  }
}