import { useRef, useCallback, useEffect } from 'react'
import { PathfindingGrid } from '../utils/pathfinding/PathfindingGrid.js'
import { AStar } from '../utils/pathfinding/AStar.js'
import { PathNode } from '../utils/pathfinding/PathNode.js'

export const usePathSystem = (worldSize, terrainSystem, pathfindingGrid) => {
  const pathsRef = useRef([])
  const pathNodesRef = useRef([])
  const pathUsageRef = useRef(new Map())
  const gridRef = useRef(pathfindingGrid)
  const astarRef = useRef(null)
  const activePathsRef = useRef(new Map()) // Track active paths for each entity

  // Initialize A* when pathfinding grid is ready
  useEffect(() => {
    if (pathfindingGrid) {
      gridRef.current = pathfindingGrid
      astarRef.current = new AStar(pathfindingGrid)
    }
  }, [pathfindingGrid])

  // Initialize local grid if no global one provided (backward compatibility)
  useEffect(() => {
    if (!pathfindingGrid && terrainSystem && worldSize && !gridRef.current) {
      gridRef.current = new PathfindingGrid(worldSize.width, worldSize.height, terrainSystem)
      astarRef.current = new AStar(gridRef.current)
    }
  }, [terrainSystem, worldSize, pathfindingGrid])

  const generateInitialPaths = useCallback((buildings) => {
    pathsRef.current = []
    pathNodesRef.current = []
    pathUsageRef.current.clear()

    // Update grid with all buildings
    if (gridRef.current) {
      gridRef.current.updateAllBuildings(buildings)
    }

    // Find main temple
    const temple = buildings.find(b => b.type === 'temple')
    if (!temple) return

    const templeCenter = {
      x: temple.x + temple.width / 2,
      y: temple.y + temple.height / 2
    }

    // Create main paths from temple to each building using A*
    buildings.forEach(building => {
      if (building.type !== 'temple') {
        const buildingCenter = {
          x: building.x + building.width / 2,
          y: building.y + building.height / 2
        }
        
        const path = createPathWithAStar(templeCenter, buildingCenter, 'main')
        if (path.nodes.length > 0) {
          pathsRef.current.push(path)
          pathNodesRef.current.push(...path.nodes)
          
          // Mark these nodes as roads for faster travel
          if (gridRef.current) {
            gridRef.current.createRoad(path.nodes)
          }
        }
      }
    })

    // Create circular paths around temple
    createCircularPaths(templeCenter, buildings)

    // Create inter-building paths for nearby buildings
    createInterBuildingPaths(buildings)

  }, [terrainSystem])

  const createPathWithAStar = (start, end, pathType = 'main') => {
    if (!astarRef.current || !gridRef.current) {
      return { nodes: [] }
    }

    const pathId = `${Math.floor(start.x)}_${Math.floor(start.y)}_to_${Math.floor(end.x)}_${Math.floor(end.y)}`
    
    // Convert world coordinates to grid coordinates
    const startX = Math.floor(start.x / PathNode.GRID_SIZE)
    const startY = Math.floor(start.y / PathNode.GRID_SIZE)
    const endX = Math.floor(end.x / PathNode.GRID_SIZE)
    const endY = Math.floor(end.y / PathNode.GRID_SIZE)

    // Check cache first
    const cacheKey = `${startX},${startY}-${endX},${endY}`
    const cachedPath = gridRef.current.getCachedPath(cacheKey)
    if (cachedPath) {
      return {
        id: pathId,
        type: pathType,
        nodes: cachedPath.map((node, i) => ({
          x: node.worldX + PathNode.GRID_SIZE / 2,
          y: node.worldY + PathNode.GRID_SIZE / 2,
          id: `${pathId}_${i}`,
          pathId,
          pathType,
          usage: 0,
          connections: []
        })),
        start,
        end,
        usage: 0,
        lastUsed: 0
      }
    }

    // Find path using A*
    const pathNodes = astarRef.current.findPath(startX, startY, endX, endY)
    
    if (pathNodes.length === 0) {
      return { nodes: [] }
    }

    // Smooth the path
    const smoothedPath = astarRef.current.smoothPath(pathNodes)
    
    // Cache the path
    gridRef.current.cachePath(cacheKey, smoothedPath)

    // Convert PathNode objects to path node format
    const nodes = smoothedPath.map((node, i) => ({
      x: node.worldX + PathNode.GRID_SIZE / 2,
      y: node.worldY + PathNode.GRID_SIZE / 2,
      id: `${pathId}_${i}`,
      pathId,
      pathType,
      usage: 0,
      connections: []
    }))

    // Connect adjacent nodes
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].connections.push(nodes[i + 1])
      nodes[i + 1].connections.push(nodes[i])
    }

    return {
      id: pathId,
      type: pathType,
      nodes,
      start,
      end,
      usage: 0,
      lastUsed: 0
    }
  }

  const createPath = createPathWithAStar // Alias for backward compatibility

  const createCircularPaths = (center, buildings) => {
    const radiuses = [80, 140, 200]
    
    radiuses.forEach((radius, index) => {
      const nodes = []
      const nodeCount = Math.max(8, Math.floor(radius / 20))
      const pathId = `circular_${radius}`
      
      for (let i = 0; i < nodeCount; i++) {
        const angle = (i / nodeCount) * Math.PI * 2
        let nodeX = center.x + Math.cos(angle) * radius
        let nodeY = center.y + Math.sin(angle) * radius
        
        // Adjust if on water
        if (!terrainSystem.isWalkable(nodeX, nodeY)) {
          const walkable = findNearestWalkable(nodeX, nodeY, 40)
          nodeX = walkable.x
          nodeY = walkable.y
        }
        
        nodes.push({
          x: nodeX,
          y: nodeY,
          id: `${pathId}_${i}`,
          pathId,
          pathType: 'circular',
          usage: 0,
          connections: []
        })
      }
      
      // Connect nodes in a circle
      for (let i = 0; i < nodes.length; i++) {
        const nextIndex = (i + 1) % nodes.length
        nodes[i].connections.push(nodes[nextIndex])
        nodes[nextIndex].connections.push(nodes[i])
      }
      
      pathsRef.current.push({
        id: pathId,
        type: 'circular',
        nodes,
        center,
        radius,
        usage: 0,
        lastUsed: 0
      })
      
      pathNodesRef.current.push(...nodes)
    })
  }

  const createInterBuildingPaths = (buildings) => {
    const houses = buildings.filter(b => b.type === 'house')
    
    // Connect nearby houses
    houses.forEach((house1, i) => {
      houses.slice(i + 1).forEach(house2 => {
        const center1 = {
          x: house1.x + house1.width / 2,
          y: house1.y + house1.height / 2
        }
        const center2 = {
          x: house2.x + house2.width / 2,
          y: house2.y + house2.height / 2
        }
        
        const distance = Math.sqrt((center2.x - center1.x) ** 2 + (center2.y - center1.y) ** 2)
        
        // Only connect if reasonably close
        if (distance < 120) {
          const path = createPathWithAStar(center1, center2, 'inter-building')
          if (path.nodes.length > 0) {
            pathsRef.current.push(path)
            pathNodesRef.current.push(...path.nodes)
            
            // Mark as roads
            if (gridRef.current) {
              gridRef.current.createRoad(path.nodes)
            }
          }
        }
      })
    })
  }

  const findNearestWalkable = (x, y, radius = 80) => {
    for (let r = 20; r <= radius; r += 20) {
      for (let angle = 0; angle < Math.PI * 2; angle += 0.5) {
        const testX = x + Math.cos(angle) * r
        const testY = y + Math.sin(angle) * r
        
        if (terrainSystem.isWalkable(testX, testY)) {
          return { x: testX, y: testY }
        }
      }
    }
    return { x, y }
  }

  const findNearestPathNode = useCallback((x, y, maxDistance = 100) => {
    let nearestNode = null
    let minDistance = maxDistance
    
    pathNodesRef.current.forEach(node => {
      const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2)
      if (distance < minDistance) {
        minDistance = distance
        nearestNode = node
      }
    })
    
    return nearestNode
  }, [])

  const getPathDirection = useCallback((fromNode, toNode) => {
    const dx = toNode.x - fromNode.x
    const dy = toNode.y - fromNode.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    return distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 0, y: 0 }
  }, [])

  const findRandomDestinationOnPath = useCallback((pathType = 'any') => {
    const availablePaths = pathType === 'any' 
      ? pathsRef.current 
      : pathsRef.current.filter(p => p.type === pathType)
    
    if (availablePaths.length === 0) return null
    
    const randomPath = availablePaths[Math.floor(Math.random() * availablePaths.length)]
    const randomNode = randomPath.nodes[Math.floor(Math.random() * randomPath.nodes.length)]
    
    // Update usage statistics
    randomNode.usage++
    randomPath.usage++
    randomPath.lastUsed = Date.now()
    
    return randomNode
  }, [])

  const updatePathUsage = useCallback((node) => {
    if (node) {
      node.usage++
      pathUsageRef.current.set(node.id, (pathUsageRef.current.get(node.id) || 0) + 1)
    }
  }, [])

  /**
   * Find path using A* algorithm
   * @param {number} startX - Start world X coordinate
   * @param {number} startY - Start world Y coordinate
   * @param {number} endX - End world X coordinate
   * @param {number} endY - End world Y coordinate
   * @param {Array} dynamicObstacles - Array of {x, y} positions to avoid
   * @returns {Array} Array of {x, y} waypoints in world coordinates
   */
  const findPath = useCallback((startX, startY, endX, endY, dynamicObstacles = []) => {
    if (!astarRef.current || !gridRef.current) {
      return []
    }

    // Convert world to grid coordinates
    const gridStartX = Math.floor(startX / PathNode.GRID_SIZE)
    const gridStartY = Math.floor(startY / PathNode.GRID_SIZE)
    const gridEndX = Math.floor(endX / PathNode.GRID_SIZE)
    const gridEndY = Math.floor(endY / PathNode.GRID_SIZE)

    // Check cache
    const cacheKey = `${gridStartX},${gridStartY}-${gridEndX},${gridEndY}`
    const cachedPath = gridRef.current.getCachedPath(cacheKey)
    
    if (cachedPath && dynamicObstacles.length === 0) {
      return cachedPath.map(node => ({
        x: node.worldX + PathNode.GRID_SIZE / 2,
        y: node.worldY + PathNode.GRID_SIZE / 2
      }))
    }

    // Find path
    const path = dynamicObstacles.length > 0
      ? astarRef.current.findPathWithDynamicObstacles(gridStartX, gridStartY, gridEndX, gridEndY, dynamicObstacles)
      : astarRef.current.findPath(gridStartX, gridStartY, gridEndX, gridEndY)

    if (path.length === 0) {
      return []
    }

    // Smooth and cache if no dynamic obstacles
    const smoothedPath = astarRef.current.smoothPath(path)
    if (dynamicObstacles.length === 0) {
      gridRef.current.cachePath(cacheKey, smoothedPath)
    }

    // Convert to world coordinates
    return smoothedPath.map(node => ({
      x: node.worldX + PathNode.GRID_SIZE / 2,
      y: node.worldY + PathNode.GRID_SIZE / 2
    }))
  }, [])

  /**
   * Request a path for an entity (manages multiple concurrent paths)
   * @param {string} entityId - Unique identifier for the entity
   * @param {number} startX 
   * @param {number} startY 
   * @param {number} endX 
   * @param {number} endY 
   * @returns {Object} Path object with waypoints and helpers
   */
  const requestPath = useCallback((entityId, startX, startY, endX, endY) => {
    const waypoints = findPath(startX, startY, endX, endY)
    
    if (waypoints.length === 0) {
      return null
    }

    const pathObject = {
      id: entityId,
      waypoints,
      currentIndex: 0,
      complete: false,
      
      // Get current target waypoint
      getCurrentTarget() {
        if (this.currentIndex >= this.waypoints.length) {
          this.complete = true
          return null
        }
        return this.waypoints[this.currentIndex]
      },
      
      // Advance to next waypoint
      advance() {
        this.currentIndex++
        if (this.currentIndex >= this.waypoints.length) {
          this.complete = true
        }
      },
      
      // Check if close enough to current waypoint
      isNearTarget(x, y, threshold = 10) {
        const target = this.getCurrentTarget()
        if (!target) return false
        
        const dx = target.x - x
        const dy = target.y - y
        return dx * dx + dy * dy < threshold * threshold
      },
      
      // Get direction to current target
      getDirection(x, y) {
        const target = this.getCurrentTarget()
        if (!target) return { x: 0, y: 0 }
        
        const dx = target.x - x
        const dy = target.y - y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        return distance > 0 
          ? { x: dx / distance, y: dy / distance }
          : { x: 0, y: 0 }
      }
    }

    activePathsRef.current.set(entityId, pathObject)
    return pathObject
  }, [findPath])

  /**
   * Get active path for an entity
   * @param {string} entityId 
   * @returns {Object|null}
   */
  const getActivePath = useCallback((entityId) => {
    return activePathsRef.current.get(entityId) || null
  }, [])

  /**
   * Clear path for an entity
   * @param {string} entityId 
   */
  const clearPath = useCallback((entityId) => {
    activePathsRef.current.delete(entityId)
  }, [])

  /**
   * Update grid when buildings change
   * @param {Object} building 
   * @param {string} action - 'add' or 'remove'
   */
  const updateBuilding = useCallback((building, action = 'add') => {
    if (!gridRef.current) return

    if (action === 'add') {
      gridRef.current.updateForBuilding(building)
    } else {
      gridRef.current.updateForBuildingRemoval(building)
    }
  }, [])

  /**
   * Clean up expired cache entries periodically
   */
  const cleanupCache = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.cleanCache()
    }
  }, [])

  const renderPaths = useCallback((ctx, showPaths = true) => {
    // Only render if showPaths is true
    if (!showPaths) return
    
    // First pass: Draw road surfaces (wide, light paths)
    ctx.save()
    pathsRef.current.forEach(path => {
      if (path.nodes.length < 2) return
      
      const baseWidth = path.type === 'main' ? 12 : 8
      const usageWidth = Math.min(4, path.usage * 0.02)
      const totalWidth = baseWidth + usageWidth
      
      // Road surface gradient based on path type
      const gradient = ctx.createRadialGradient(
        path.nodes[0].x, path.nodes[0].y, 0,
        path.nodes[0].x, path.nodes[0].y, 200
      )
      
      if (path.type === 'main') {
        // Main roads: darker, more defined
        gradient.addColorStop(0, 'rgba(180, 140, 100, 0.8)')
        gradient.addColorStop(1, 'rgba(160, 120, 80, 0.6)')
      } else if (path.type === 'circular') {
        // Circular paths: lighter, decorative
        gradient.addColorStop(0, 'rgba(200, 180, 160, 0.6)')
        gradient.addColorStop(1, 'rgba(180, 160, 140, 0.4)')
      } else {
        // Inter-building paths: subtle
        gradient.addColorStop(0, 'rgba(190, 170, 150, 0.5)')
        gradient.addColorStop(1, 'rgba(170, 150, 130, 0.3)')
      }
      
      // Draw road surface
      ctx.strokeStyle = gradient
      ctx.lineWidth = totalWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      ctx.beginPath()
      ctx.moveTo(path.nodes[0].x, path.nodes[0].y)
      
      // Smooth path drawing with quadratic curves
      for (let i = 1; i < path.nodes.length - 1; i++) {
        const xc = (path.nodes[i].x + path.nodes[i + 1].x) / 2
        const yc = (path.nodes[i].y + path.nodes[i + 1].y) / 2
        ctx.quadraticCurveTo(path.nodes[i].x, path.nodes[i].y, xc, yc)
      }
      
      // Last segment
      if (path.nodes.length > 1) {
        const lastNode = path.nodes[path.nodes.length - 1]
        ctx.lineTo(lastNode.x, lastNode.y)
      }
      
      ctx.stroke()
    })
    ctx.restore()
    
    // Second pass: Draw road edges and details
    ctx.save()
    pathsRef.current.forEach(path => {
      if (path.nodes.length < 2) return
      
      const baseWidth = path.type === 'main' ? 10 : 6
      const usageWidth = Math.min(3, path.usage * 0.015)
      const edgeWidth = baseWidth + usageWidth
      
      // Draw darker edges
      ctx.strokeStyle = path.type === 'main' 
        ? 'rgba(120, 80, 40, 0.7)'
        : 'rgba(140, 100, 60, 0.5)'
      ctx.lineWidth = edgeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      // Add dashed pattern for circular paths
      if (path.type === 'circular') {
        ctx.setLineDash([15, 10])
      }
      
      ctx.beginPath()
      ctx.moveTo(path.nodes[0].x, path.nodes[0].y)
      
      for (let i = 1; i < path.nodes.length; i++) {
        ctx.lineTo(path.nodes[i].x, path.nodes[i].y)
      }
      
      ctx.stroke()
      ctx.setLineDash([])
    })
    ctx.restore()
    
    // Third pass: Draw wear patterns on heavily used paths
    ctx.save()
    pathsRef.current.forEach(path => {
      if (path.usage < 50) return
      
      const wearOpacity = Math.min(0.4, path.usage * 0.002)
      ctx.strokeStyle = `rgba(100, 70, 40, ${wearOpacity})`
      ctx.lineWidth = path.type === 'main' ? 3 : 2
      ctx.lineCap = 'round'
      
      // Draw wear marks as shorter segments
      for (let i = 0; i < path.nodes.length - 1; i += 3) {
        const start = path.nodes[i]
        const end = path.nodes[Math.min(i + 2, path.nodes.length - 1)]
        
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
      }
    })
    ctx.restore()
    
    // Fourth pass: Draw intersection markers
    pathNodesRef.current.forEach(node => {
      // Only draw nodes that connect multiple paths
      if (node.connections.length <= 2) return
      
      const nodeOpacity = 0.4 + Math.min(0.4, node.usage * 0.005)
      
      // Draw intersection circle
      ctx.fillStyle = `rgba(160, 140, 120, ${nodeOpacity})`
      ctx.beginPath()
      ctx.arc(node.x, node.y, 8, 0, Math.PI * 2)
      ctx.fill()
      
      // Draw center stone
      ctx.fillStyle = `rgba(140, 120, 100, ${nodeOpacity})`
      ctx.beginPath()
      ctx.arc(node.x, node.y, 4, 0, Math.PI * 2)
      ctx.fill()
      
      // Draw highlight for very busy intersections
      if (node.usage > 100) {
        ctx.strokeStyle = `rgba(200, 180, 160, ${nodeOpacity * 0.5})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(node.x, node.y, 10, 0, Math.PI * 2)
        ctx.stroke()
      }
    })

    // Debug render grid if needed
    if (window.DEBUG_PATHFINDING && gridRef.current) {
      gridRef.current.debugRender(ctx, true)
    }
  }, [])

  return {
    generateInitialPaths,
    findNearestPathNode,
    getPathDirection,
    findRandomDestinationOnPath,
    updatePathUsage,
    renderPaths,
    paths: pathsRef.current,
    pathNodes: pathNodesRef.current,
    // New A* pathfinding methods
    findPath,
    requestPath,
    getActivePath,
    clearPath,
    updateBuilding,
    cleanupCache
  }
}