import { useRef, useCallback } from 'react'

export const usePathSystem = (worldSize, terrainSystem) => {
  const pathsRef = useRef([])
  const pathNodesRef = useRef([])
  const pathUsageRef = useRef(new Map()) // Track how often paths are used

  const generateInitialPaths = useCallback((buildings) => {
    pathsRef.current = []
    pathNodesRef.current = []
    pathUsageRef.current.clear()

    // Find main temple
    const temple = buildings.find(b => b.type === 'temple')
    if (!temple) return

    const templeCenter = {
      x: temple.x + temple.width / 2,
      y: temple.y + temple.height / 2
    }

    // Create main paths from temple to each building
    buildings.forEach(building => {
      if (building.type !== 'temple') {
        const buildingCenter = {
          x: building.x + building.width / 2,
          y: building.y + building.height / 2
        }
        
        const path = createPath(templeCenter, buildingCenter, 'main')
        if (path.nodes.length > 0) {
          pathsRef.current.push(path)
          pathNodesRef.current.push(...path.nodes)
        }
      }
    })

    // Create circular paths around temple
    createCircularPaths(templeCenter, buildings)

    // Create inter-building paths for nearby buildings
    createInterBuildingPaths(buildings)

  }, [terrainSystem])

  const createPath = (start, end, pathType = 'main') => {
    const nodes = []
    const pathId = `${Math.floor(start.x)}_${Math.floor(start.y)}_to_${Math.floor(end.x)}_${Math.floor(end.y)}`
    
    // Simple pathfinding - create waypoints avoiding water
    const distance = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2)
    const steps = Math.max(5, Math.floor(distance / 40))
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      let nodeX = start.x + (end.x - start.x) * t
      let nodeY = start.y + (end.y - start.y) * t
      
      // Adjust node if it's on water
      if (!terrainSystem.isWalkable(nodeX, nodeY)) {
        const walkable = findNearestWalkable(nodeX, nodeY, 60)
        nodeX = walkable.x
        nodeY = walkable.y
      }
      
      nodes.push({
        x: nodeX,
        y: nodeY,
        id: `${pathId}_${i}`,
        pathId,
        pathType,
        usage: 0,
        connections: []
      })
    }

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
          const path = createPath(center1, center2, 'inter-building')
          if (path.nodes.length > 0) {
            pathsRef.current.push(path)
            pathNodesRef.current.push(...path.nodes)
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

  const renderPaths = useCallback((ctx) => {
    // Render main paths
    pathsRef.current.forEach(path => {
      if (path.nodes.length < 2) return
      
      // Path opacity based on usage
      const baseOpacity = path.type === 'main' ? 0.15 : 0.08
      const usageOpacity = Math.min(0.3, baseOpacity + (path.usage * 0.002))
      
      ctx.strokeStyle = `rgba(139, 69, 19, ${usageOpacity})`
      ctx.lineWidth = path.type === 'main' ? 3 : 2
      ctx.setLineDash(path.type === 'circular' ? [5, 5] : [])
      
      ctx.beginPath()
      ctx.moveTo(path.nodes[0].x, path.nodes[0].y)
      
      for (let i = 1; i < path.nodes.length; i++) {
        ctx.lineTo(path.nodes[i].x, path.nodes[i].y)
      }
      
      ctx.stroke()
      ctx.setLineDash([])
    })
    
    // Render heavily used nodes as small dots
    pathNodesRef.current.forEach(node => {
      if (node.usage > 20) {
        const opacity = Math.min(0.6, node.usage * 0.01)
        ctx.fillStyle = `rgba(139, 69, 19, ${opacity})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    })
  }, [])

  return {
    generateInitialPaths,
    findNearestPathNode,
    getPathDirection,
    findRandomDestinationOnPath,
    updatePathUsage,
    renderPaths,
    paths: pathsRef.current,
    pathNodes: pathNodesRef.current
  }
}