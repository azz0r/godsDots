import { useRef, useCallback } from 'react'

export const useAdvancedBuildingSystem = (worldSize, terrainSystem, playerSystem) => {
  const buildingTypesRef = useRef({
    house: {
      name: 'House',
      width: 30,
      height: 30,
      cost: { wood: 20, stone: 10, belief: 50 },
      capacity: 4, // Villagers it can house
      produces: null
    },
    barn: {
      name: 'Barn',
      width: 40,
      height: 30,
      cost: { wood: 30, stone: 5, belief: 75 },
      capacity: 0,
      produces: null,
      stores: { food: 200 } // Food storage
    },
    granary: {
      name: 'Granary',
      width: 35,
      height: 35,
      cost: { wood: 25, stone: 15, belief: 100 },
      capacity: 0,
      produces: null,
      stores: { food: 300, preserves: true } // Better food storage
    },
    workshop: {
      name: 'Workshop',
      width: 40,
      height: 40,
      cost: { wood: 40, stone: 20, belief: 120 },
      capacity: 0,
      produces: { wood: 2, stone: 1 }, // Resources per work cycle
      workersNeeded: 2
    },
    temple: {
      name: 'Temple',
      width: 60,
      height: 60,
      cost: { wood: 50, stone: 100, belief: 200 },
      capacity: 0,
      produces: { belief: 5 }, // Belief per cycle
      workersNeeded: 3,
      isReligious: true
    },
    farm: {
      name: 'Farm',
      width: 50,
      height: 50,
      cost: { wood: 15, stone: 5, belief: 60 },
      capacity: 0,
      produces: { food: 8 }, // Food per cycle
      workersNeeded: 2,
      needsWater: true
    }
  })

  const canPlaceBuilding = useCallback((player, x, y, buildingType) => {
    const buildingSpec = buildingTypesRef.current[buildingType]
    if (!buildingSpec) return { canPlace: false, reason: 'Unknown building type' }

    // Check if player has enough resources
    const hasResources = Object.entries(buildingSpec.cost).every(([resource, amount]) => {
      if (resource === 'belief') {
        return player.beliefPoints >= amount
      }
      return (player.resources[resource] || 0) >= amount
    })

    if (!hasResources) {
      return { canPlace: false, reason: 'Insufficient resources' }
    }

    // For most buildings, must be in territory. Farms can be outside.
    if (buildingType !== 'farm' && !playerSystem.isWithinPlayerTerritory(player, x, y)) {
      return { canPlace: false, reason: 'Outside territory' }
    }

    // Check terrain
    if (!terrainSystem.isWalkable(x, y)) {
      return { canPlace: false, reason: 'Unwalkable terrain' }
    }

    // Special requirements
    if (buildingSpec.needsWater) {
      const nearWater = isNearWater(x, y, 100)
      if (!nearWater) {
        return { canPlace: false, reason: 'Farms need to be near water' }
      }
    }

    // Check for overlapping buildings
    const { width, height } = buildingSpec
    const overlapping = player.buildings.some(building => {
      return !(x >= building.x + building.width || 
               x + width <= building.x || 
               y >= building.y + building.height || 
               y + height <= building.y)
    })

    if (overlapping) {
      return { canPlace: false, reason: 'Overlapping with existing building' }
    }

    // Check minimum distance
    const minDistance = buildingType === 'farm' ? 30 : 40
    const tooClose = player.buildings.some(building => {
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
  }, [terrainSystem, playerSystem])

  const isNearWater = (x, y, radius) => {
    for (let checkX = x - radius; checkX <= x + radius; checkX += 20) {
      for (let checkY = y - radius; checkY <= y + radius; checkY += 20) {
        const terrain = terrainSystem.getTerrainAt(checkX, checkY)
        if (terrain && terrain.type === 'water') {
          const distance = Math.sqrt((checkX - x) ** 2 + (checkY - y) ** 2)
          if (distance <= radius) return true
        }
      }
    }
    return false
  }

  const placeBuilding = useCallback((player, x, y, buildingType) => {
    const buildingSpec = buildingTypesRef.current[buildingType]
    if (!buildingSpec) return { success: false, reason: 'Unknown building type' }

    const placement = canPlaceBuilding(player, x, y, buildingType)
    if (!placement.canPlace) {
      return { success: false, reason: placement.reason }
    }

    // Deduct resources
    Object.entries(buildingSpec.cost).forEach(([resource, amount]) => {
      if (resource === 'belief') {
        player.beliefPoints -= amount
      } else {
        player.resources[resource] = (player.resources[resource] || 0) - amount
      }
    })

    // Create building
    const newBuilding = {
      id: `${buildingType}_${player.id}_${Date.now()}`,
      x: x - buildingSpec.width / 2,
      y: y - buildingSpec.height / 2,
      width: buildingSpec.width,
      height: buildingSpec.height,
      type: buildingType,
      playerId: player.id,
      health: 100,
      level: 1,
      
      // Work-related properties
      workers: [],
      maxWorkers: buildingSpec.workersNeeded || 0,
      workProgress: 0,
      
      // Storage properties
      storage: buildingSpec.stores ? Object.keys(buildingSpec.stores).reduce((acc, resource) => {
        acc[resource] = 0
        return acc
      }, {}) : {},
      maxStorage: buildingSpec.stores || {},
      
      // Construction
      isUnderConstruction: true,
      constructionTime: 0,
      constructionDuration: buildingSpec.cost.belief || 300,
      
      // Production
      lastProduction: 0,
      productionCycle: 600 // 10 seconds
    }

    player.buildings.push(newBuilding)
    player.stats.buildingsBuilt++

    return { success: true, building: newBuilding }
  }, [canPlaceBuilding])

  const updateBuildings = useCallback((player, gameTime) => {
    player.buildings.forEach(building => {
      const buildingSpec = buildingTypesRef.current[building.type]
      
      // Handle construction
      if (building.isUnderConstruction) {
        building.constructionTime += 1
        if (building.constructionTime >= building.constructionDuration) {
          building.isUnderConstruction = false
        }
        return
      }

      // Handle production
      if (buildingSpec.produces && building.workers.length >= (buildingSpec.workersNeeded || 0)) {
        if (gameTime - building.lastProduction >= building.productionCycle) {
          Object.entries(buildingSpec.produces).forEach(([resource, amount]) => {
            if (resource === 'belief') {
              player.beliefPoints += amount
            } else {
              player.resources[resource] = (player.resources[resource] || 0) + amount
            }
          })
          building.lastProduction = gameTime
        }
      }

      // Auto-transfer resources to storage buildings
      if (building.maxStorage) {
        Object.entries(building.maxStorage).forEach(([resource, maxAmount]) => {
          const playerResource = player.resources[resource] || 0
          const currentStorage = building.storage[resource] || 0
          const canStore = maxAmount - currentStorage
          const toTransfer = Math.min(playerResource, canStore)
          
          if (toTransfer > 0) {
            building.storage[resource] = currentStorage + toTransfer
            player.resources[resource] = playerResource - toTransfer
          }
        })
      }
    })
  }, [])

  const renderBuildings = useCallback((ctx, player) => {
    player.buildings.forEach(building => {
      const buildingSpec = buildingTypesRef.current[building.type]
      
      switch (building.type) {
        case 'house':
          renderHouse(ctx, building, player)
          break
        case 'barn':
          renderBarn(ctx, building, player)
          break
        case 'granary':
          renderGranary(ctx, building, player)
          break
        case 'workshop':
          renderWorkshop(ctx, building, player)
          break
        case 'temple':
          renderTemple(ctx, building, player)
          break
        case 'farm':
          renderFarm(ctx, building, player)
          break
      }
      
      // Construction progress
      if (building.isUnderConstruction) {
        const progress = building.constructionTime / building.constructionDuration
        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)'
        ctx.fillRect(building.x, building.y - 8, building.width * progress, 4)
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.lineWidth = 1
        ctx.strokeRect(building.x, building.y - 8, building.width, 4)
      }
      
      // Worker indicators
      if (building.workers.length > 0) {
        ctx.fillStyle = '#ffff00'
        for (let i = 0; i < building.workers.length; i++) {
          ctx.fillRect(building.x + i * 6, building.y - 15, 4, 4)
        }
      }
    })
  }, [])

  const renderHouse = (ctx, building, player) => {
    const houseColor = player.type === 'human' ? '#8b4513' : '#7a3f12'
    ctx.fillStyle = building.isUnderConstruction ? '#665533' : houseColor
    ctx.fillRect(building.x, building.y, building.width, building.height)
    
    if (!building.isUnderConstruction) {
      ctx.fillStyle = player.type === 'human' ? '#654321' : '#5d3018'
      ctx.fillRect(building.x + 2, building.y + 2, building.width - 4, building.height - 4)
      
      // Door and window
      ctx.fillStyle = '#4a2c17'
      ctx.fillRect(building.x + building.width/2 - 3, building.y + building.height - 8, 6, 8)
      ctx.fillStyle = '#ffff88'
      ctx.fillRect(building.x + 8, building.y + 8, 6, 6)
    }
  }

  const renderBarn = (ctx, building, player) => {
    ctx.fillStyle = building.isUnderConstruction ? '#666' : '#8B0000'
    ctx.fillRect(building.x, building.y, building.width, building.height)
    
    if (!building.isUnderConstruction) {
      // Barn doors
      ctx.fillStyle = '#654321'
      ctx.fillRect(building.x + 5, building.y + building.height - 20, building.width - 10, 20)
      
      // Roof
      ctx.fillStyle = '#4a4a4a'
      ctx.beginPath()
      ctx.moveTo(building.x, building.y + 5)
      ctx.lineTo(building.x + building.width/2, building.y - 5)
      ctx.lineTo(building.x + building.width, building.y + 5)
      ctx.fill()
    }
  }

  const renderGranary = (ctx, building, player) => {
    ctx.fillStyle = building.isUnderConstruction ? '#666' : '#DAA520'
    ctx.fillRect(building.x, building.y, building.width, building.height)
    
    if (!building.isUnderConstruction) {
      // Circular storage
      ctx.fillStyle = '#B8860B'
      ctx.beginPath()
      ctx.arc(building.x + building.width/2, building.y + building.height/2, building.width/3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const renderWorkshop = (ctx, building, player) => {
    ctx.fillStyle = building.isUnderConstruction ? '#666' : '#708090'
    ctx.fillRect(building.x, building.y, building.width, building.height)
    
    if (!building.isUnderConstruction) {
      // Tools and anvil
      ctx.fillStyle = '#2F4F4F'
      ctx.fillRect(building.x + 5, building.y + 5, 10, 10)
      ctx.fillRect(building.x + building.width - 15, building.y + building.height - 15, 10, 10)
      
      // Chimney with smoke
      ctx.fillStyle = '#333'
      ctx.fillRect(building.x + building.width - 8, building.y - 10, 6, 15)
    }
  }

  const renderTemple = (ctx, building, player) => {
    const baseColor = player.color
    ctx.fillStyle = building.isUnderConstruction ? '#999' : baseColor
    ctx.fillRect(building.x, building.y, building.width, building.height)
    
    if (!building.isUnderConstruction) {
      // Inner sanctum
      ctx.fillStyle = player.type === 'human' ? '#ff6b35' : '#cc3333'
      ctx.fillRect(building.x + 20, building.y + 20, 20, 20)
      
      // Divine glow
      const gradient = ctx.createRadialGradient(
        building.x + building.width/2, building.y + building.height/2, 0,
        building.x + building.width/2, building.y + building.height/2, 40
      )
      gradient.addColorStop(0, `${baseColor}30`)
      gradient.addColorStop(1, `${baseColor}00`)
      
      ctx.fillStyle = gradient
      ctx.fillRect(building.x - 10, building.y - 10, building.width + 20, building.height + 20)
    }
  }

  const renderFarm = (ctx, building, player) => {
    // Farm field background
    ctx.fillStyle = building.isUnderConstruction ? '#8B4513' : '#9ACD32'
    ctx.fillRect(building.x, building.y, building.width, building.height)
    
    if (!building.isUnderConstruction) {
      // Crop rows
      ctx.strokeStyle = '#556B2F'
      ctx.lineWidth = 2
      for (let i = 1; i < 5; i++) {
        const rowY = building.y + (building.height / 5) * i
        ctx.beginPath()
        ctx.moveTo(building.x + 5, rowY)
        ctx.lineTo(building.x + building.width - 5, rowY)
        ctx.stroke()
      }
      
      // Small farmhouse
      ctx.fillStyle = '#8B4513'
      ctx.fillRect(building.x + building.width - 15, building.y + 5, 10, 10)
    }
  }

  return {
    buildingTypes: buildingTypesRef.current,
    canPlaceBuilding,
    placeBuilding,
    updateBuildings,
    renderBuildings
  }
}