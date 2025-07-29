import { useRef, useCallback } from 'react'

export const useBuildingSystemWithLand = (worldSize, terrainSystem, landManager, pathfindingGrid) => {
  const buildingsRef = useRef([])
  const buildingIdCounter = useRef(0)

  const createInitialBuildings = useCallback(() => {
    const centerX = worldSize.width / 2
    const centerY = worldSize.height / 2
    
    // Create temple
    const temple = {
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
    
    buildingsRef.current = [temple]
    
    // Register temple with land management
    if (landManager) {
      const plot = landManager.getPlotAt(centerX, centerY)
      if (plot) {
        plot.setOwner('Temple of the Gods')
        plot.addBuilding(temple)
      }
    }

    // Create initial houses around temple
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const distance = 120 + Math.random() * 80
      const houseX = centerX + Math.cos(angle) * distance - 15
      const houseY = centerY + Math.sin(angle) * distance - 15
      
      // Check both terrain and land management
      if (terrainSystem.isWalkable(houseX + 15, houseY + 15)) {
        const house = {
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
        }
        
        // Check if land allows building
        let canPlace = true
        if (landManager) {
          const plot = landManager.getPlotAt(houseX + 15, houseY + 15)
          if (plot && !plot.canPlaceBuilding('house')) {
            canPlace = false
          }
        }
        
        if (canPlace) {
          buildingsRef.current.push(house)
          
          // Register with land management
          if (landManager) {
            const plot = landManager.getPlotAt(houseX + 15, houseY + 15)
            if (plot) {
              plot.addBuilding(house)
            }
          }
        }
      }
    }
    
    // Update pathfinding grid with buildings
    if (pathfindingGrid) {
      pathfindingGrid.updateAllBuildings(buildingsRef.current)
    }
  }, [worldSize, terrainSystem, landManager, pathfindingGrid])

  const canPlaceBuilding = useCallback((x, y, width, height, buildingType) => {
    // First check land management system
    if (landManager) {
      const plot = landManager.getPlotAt(x + width/2, y + height/2)
      if (plot && !plot.canPlaceBuilding(buildingType)) {
        return { canPlace: false, reason: 'Land plot does not allow this building type' }
      }
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
  }, [terrainSystem, landManager])

  const placeBuilding = useCallback((x, y, buildingType, ownerId = null) => {
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
      isUnderConstruction: true,
      ownerId: ownerId
    }

    if (buildingType === 'house') {
      newBuilding.residents = Math.floor(Math.random() * 3) + 1
    }

    buildingsRef.current.push(newBuilding)
    
    // Register with land management
    if (landManager) {
      const plot = landManager.getPlotAt(x, y)
      if (plot) {
        plot.addBuilding(newBuilding)
        
        // If owner is specified, claim the plot
        if (ownerId) {
          plot.setOwner(`Player ${ownerId}`)
        }
      }
    }
    
    // Update pathfinding grid
    if (pathfindingGrid) {
      pathfindingGrid.updateBuilding(newBuilding, true)
    }
    
    return { success: true, building: newBuilding }
  }, [canPlaceBuilding, landManager, pathfindingGrid])

  const removeBuilding = useCallback((buildingId) => {
    const buildingIndex = buildingsRef.current.findIndex(b => b.id === buildingId)
    if (buildingIndex === -1) return false
    
    const building = buildingsRef.current[buildingIndex]
    
    // Clear from land plot
    if (landManager) {
      const plot = landManager.getPlotAt(
        building.x + building.width / 2,
        building.y + building.height / 2
      )
      if (plot) {
        plot.removeBuilding(building.id)
      }
    }
    
    // Remove building
    buildingsRef.current.splice(buildingIndex, 1)
    
    // Update pathfinding grid
    if (pathfindingGrid) {
      pathfindingGrid.updateBuilding(building, false)
    }
    
    return true
  }, [landManager, pathfindingGrid])

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

  const renderBuildings = useCallback((ctx, player) => {
    player.buildings.forEach(building => {
      // Get plot information for enhanced rendering
      let plotInfo = null
      if (landManager) {
        const plot = landManager.getPlotAt(
          building.x + building.width / 2,
          building.y + building.height / 2
        )
        if (plot) {
          plotInfo = {
            owned: !!plot.owner,
            type: plot.type,
            developmentLevel: plot.developmentLevel
          }
        }
      }
      
      // Draw hover effect first (behind building)
      if (building.hovered) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.lineWidth = 3
        ctx.strokeRect(building.x - 2, building.y - 2, building.width + 4, building.height + 4)
        
        // Glow effect
        const gradient = ctx.createRadialGradient(
          building.x + building.width/2, building.y + building.height/2, 0,
          building.x + building.width/2, building.y + building.height/2, Math.max(building.width, building.height)
        )
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)')
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = gradient
        ctx.fillRect(building.x - 10, building.y - 10, building.width + 20, building.height + 20)
      }
      
      if (building.type === 'temple') {
        // Temple rendering
        ctx.fillStyle = building.isUnderConstruction ? '#ccaa00' : '#ffd700'
        ctx.fillRect(building.x, building.y, building.width, building.height)
        
        if (!building.isUnderConstruction) {
          ctx.fillStyle = '#ff6b35'
          ctx.fillRect(building.x + 20, building.y + 20, 20, 20)
          
          // Temple glow effect (enhanced if on owned plot)
          const glowRadius = plotInfo?.owned ? 50 : 40
          const gradient = ctx.createRadialGradient(
            building.x + building.width/2, building.y + building.height/2, 0,
            building.x + building.width/2, building.y + building.height/2, glowRadius
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
          
          // Window (more windows if on developed plot)
          ctx.fillStyle = '#ffff88'
          ctx.fillRect(building.x + 8, building.y + 8, 6, 6)
          
          if (plotInfo?.developmentLevel > 2) {
            ctx.fillRect(building.x + building.width - 14, building.y + 8, 6, 6)
          }
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
      
      // Owner indicator (if building has owner)
      if (building.ownerId && !building.isUnderConstruction) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.font = '10px Arial'
        ctx.fillText(building.ownerId.toString(), building.x + 2, building.y - 2)
      }
      
      // Hover tooltip
      if (building.hovered) {
        const tooltipX = building.x + building.width / 2
        const tooltipY = building.y - 20
        const tooltipText = building.type.charAt(0).toUpperCase() + building.type.slice(1)
        const residents = building.residents || 0
        const healthPercent = Math.round((building.health / 100) * 100)
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
        ctx.fillRect(tooltipX - 50, tooltipY - 35, 100, 30)
        
        // Text
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 12px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(tooltipText, tooltipX, tooltipY - 20)
        
        ctx.font = '10px Arial'
        ctx.fillText(`Health: ${healthPercent}%`, tooltipX, tooltipY - 8)
        if (building.type === 'house') {
          ctx.fillText(`Residents: ${residents}`, tooltipX, tooltipY + 4)
        }
        ctx.textAlign = 'left'
      }
    })
  }, [landManager])

  return {
    createInitialBuildings,
    canPlaceBuilding,
    placeBuilding,
    removeBuilding,
    updateBuildings,
    getBuildingsNear,
    renderBuildings,
    buildings: buildingsRef.current
  }
}