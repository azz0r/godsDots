import { useRef, useCallback } from 'react'

export const useBuildingSystem = (worldSize, terrainSystem, godBoundary, pathSystem) => {
  const buildingsRef = useRef([])
  const buildingIdCounter = useRef(0)

  const createInitialBuildings = useCallback(() => {
    const centerX = worldSize.width / 2
    const centerY = worldSize.height / 2
    
    buildingsRef.current = [
      {
        id: buildingIdCounter.current++,
        x: centerX - 30,
        y: centerY - 30,
        width: 60,
        height: 60,
        type: 'temple',
        health: 100,
        level: 1,
        workers: 0,
        maxWorkers: 3
      }
    ]

    // Create initial houses around temple
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const distance = 120 + Math.random() * 80
      const houseX = centerX + Math.cos(angle) * distance - 15
      const houseY = centerY + Math.sin(angle) * distance - 15
      
      // Ensure house is on walkable terrain
      if (terrainSystem.isWalkable(houseX + 15, houseY + 15)) {
        buildingsRef.current.push({
          id: buildingIdCounter.current++,
          x: houseX,
          y: houseY,
          width: 30,
          height: 30,
          type: 'house',
          health: 80,
          level: 1,
          workers: 0,
          maxWorkers: 2,
          residents: Math.floor(Math.random() * 3) + 1
        })
      }
    }
    
    // Generate initial paths after buildings are created
    if (pathSystem && pathSystem.generateInitialPaths) {
      setTimeout(() => pathSystem.generateInitialPaths(buildingsRef.current), 100)
    }
  }, [worldSize, terrainSystem, pathSystem])

  const canPlaceBuilding = useCallback((x, y, width, height, buildingType) => {
    // Check if location is within god boundary (except for outposts)
    if (buildingType !== 'outpost' && !godBoundary.isWithinBoundary(x + width/2, y + height/2)) {
      return { canPlace: false, reason: 'Outside god boundary' }
    }

    // Check terrain walkability
    const corners = [
      { x, y },
      { x: x + width, y },
      { x, y: y + height },
      { x: x + width, y: y + height }
    ]
    
    for (const corner of corners) {
      if (!terrainSystem.isWalkable(corner.x, corner.y)) {
        return { canPlace: false, reason: 'On unwalkable terrain' }
      }
    }

    // Check for overlapping buildings
    const overlapping = buildingsRef.current.some(building => {
      return !(x >= building.x + building.width || 
               x + width <= building.x || 
               y >= building.y + building.height || 
               y + height <= building.y)
    })

    if (overlapping) {
      return { canPlace: false, reason: 'Overlapping with existing building' }
    }

    // Check minimum distance from other buildings
    const minDistance = buildingType === 'house' ? 40 : 60
    const tooClose = buildingsRef.current.some(building => {
      const centerX1 = x + width / 2
      const centerY1 = y + height / 2
      const centerX2 = building.x + building.width / 2
      const centerY2 = building.y + building.height / 2
      const distance = Math.sqrt((centerX1 - centerX2) ** 2 + (centerY1 - centerY2) ** 2)
      return distance < minDistance
    })

    if (tooClose) {
      return { canPlace: false, reason: 'Too close to existing building' }
    }

    return { canPlace: true }
  }, [terrainSystem, godBoundary])

  const placeBuilding = useCallback((x, y, buildingType) => {
    const buildingSpecs = {
      house: { width: 30, height: 30, cost: 100, maxWorkers: 2 },
      temple: { width: 60, height: 60, cost: 300, maxWorkers: 5 },
      workshop: { width: 40, height: 40, cost: 150, maxWorkers: 3 },
      outpost: { width: 25, height: 25, cost: 80, maxWorkers: 1 }
    }

    const spec = buildingSpecs[buildingType]
    if (!spec) return { success: false, reason: 'Unknown building type' }

    const placement = canPlaceBuilding(x, y, spec.width, spec.height, buildingType)
    if (!placement.canPlace) {
      return { success: false, reason: placement.reason }
    }

    const newBuilding = {
      id: buildingIdCounter.current++,
      x: x - spec.width / 2,
      y: y - spec.height / 2,
      width: spec.width,
      height: spec.height,
      type: buildingType,
      health: 100,
      level: 1,
      workers: 0,
      maxWorkers: spec.maxWorkers,
      constructionTime: 0,
      isUnderConstruction: true
    }

    if (buildingType === 'house') {
      newBuilding.residents = Math.floor(Math.random() * 3) + 1
    }

    buildingsRef.current.push(newBuilding)
    
    // Regenerate paths when new buildings are added
    if (pathSystem && pathSystem.generateInitialPaths) {
      setTimeout(() => pathSystem.generateInitialPaths(buildingsRef.current), 50)
    }
    
    return { success: true, building: newBuilding }
  }, [canPlaceBuilding])

  const updateBuildings = useCallback((gameTime) => {
    buildingsRef.current.forEach(building => {
      // Handle construction
      if (building.isUnderConstruction) {
        building.constructionTime += 1
        if (building.constructionTime >= 300) { // 5 seconds at 60fps
          building.isUnderConstruction = false
        }
      }

      // Building-specific updates
      if (building.type === 'temple') {
        // Temple generates belief over time
        if (gameTime % 180 === 0) { // Every 3 seconds
          // This will be handled in the main game state
        }
      }
    })
  }, [])

  const getBuildingsNear = useCallback((x, y, radius) => {
    return buildingsRef.current.filter(building => {
      const centerX = building.x + building.width / 2
      const centerY = building.y + building.height / 2
      const distance = Math.sqrt((centerX - x) ** 2 + (centerY - y) ** 2)
      return distance <= radius
    })
  }, [])

  const renderBuildings = useCallback((ctx) => {
    buildingsRef.current.forEach(building => {
      if (building.type === 'temple') {
        // Temple rendering
        ctx.fillStyle = building.isUnderConstruction ? '#ccaa00' : '#ffd700'
        ctx.fillRect(building.x, building.y, building.width, building.height)
        
        if (!building.isUnderConstruction) {
          ctx.fillStyle = '#ff6b35'
          ctx.fillRect(building.x + 20, building.y + 20, 20, 20)
          
          // Temple glow effect
          const gradient = ctx.createRadialGradient(
            building.x + building.width/2, building.y + building.height/2, 0,
            building.x + building.width/2, building.y + building.height/2, 40
          )
          gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)')
          gradient.addColorStop(1, 'rgba(255, 215, 0, 0)')
          
          ctx.fillStyle = gradient
          ctx.fillRect(building.x - 10, building.y - 10, building.width + 20, building.height + 20)
        }
      } else if (building.type === 'house') {
        // House rendering
        ctx.fillStyle = building.isUnderConstruction ? '#665533' : '#8b4513'
        ctx.fillRect(building.x, building.y, building.width, building.height)
        
        if (!building.isUnderConstruction) {
          ctx.fillStyle = '#654321'
          ctx.fillRect(building.x + 2, building.y + 2, building.width - 4, building.height - 4)
          
          // Door
          ctx.fillStyle = '#4a2c17'
          ctx.fillRect(building.x + building.width/2 - 3, building.y + building.height - 8, 6, 8)
          
          // Window
          ctx.fillStyle = '#ffff88'
          ctx.fillRect(building.x + 8, building.y + 8, 6, 6)
        }
      } else if (building.type === 'workshop') {
        // Workshop rendering
        ctx.fillStyle = building.isUnderConstruction ? '#666666' : '#888888'
        ctx.fillRect(building.x, building.y, building.width, building.height)
        
        if (!building.isUnderConstruction) {
          ctx.fillStyle = '#555555'
          ctx.fillRect(building.x + 2, building.y + 2, building.width - 4, building.height - 4)
          
          // Chimney
          ctx.fillStyle = '#333333'
          ctx.fillRect(building.x + building.width - 8, building.y - 5, 6, 10)
        }
      }

      // Construction progress indicator
      if (building.isUnderConstruction) {
        const progress = building.constructionTime / 300
        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)'
        ctx.fillRect(building.x, building.y - 8, building.width * progress, 4)
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.lineWidth = 1
        ctx.strokeRect(building.x, building.y - 8, building.width, 4)
      }
    })
  }, [])

  return {
    createInitialBuildings,
    canPlaceBuilding,
    placeBuilding,
    updateBuildings,
    getBuildingsNear,
    renderBuildings,
    buildings: buildingsRef.current
  }
}