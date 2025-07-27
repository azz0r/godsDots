/**
 * Village Expansion AI
 * Intelligent automatic building placement and town planning
 */

export class VillageExpansionAI {
  constructor() {
    // Building placement rules
    this.PLACEMENT_RULES = {
      house: {
        nearRoad: { weight: 2.0, maxDistance: 60 },
        nearCenter: { weight: 1.5, maxDistance: 300 },
        nearOtherHouses: { weight: 1.8, idealDistance: 40, maxDistance: 80 },
        avoidNoise: { weight: 1.3, sources: ['workshop', 'blacksmith'], minDistance: 100 },
        spacing: 60 // Minimum space between houses
      },
      farm: {
        nearWater: { weight: 2.5, maxDistance: 200 },
        nearFertileLand: { weight: 3.0 },
        outsideCenter: { weight: 1.5, minDistance: 150 },
        nearStorage: { weight: 1.8, maxDistance: 200 },
        spacing: 100
      },
      temple: {
        centralLocation: { weight: 3.0 },
        highGround: { weight: 2.0 },
        clearArea: { weight: 2.5, radius: 100 },
        impressive: { weight: 2.0 }, // Visible from afar
        spacing: 300
      },
      workshop: {
        nearResources: { weight: 2.5, maxDistance: 150 },
        nearRoad: { weight: 2.0, maxDistance: 40 },
        industrialZone: { weight: 1.8 }, // Group with other workshops
        spacing: 80
      },
      market: {
        centralLocation: { weight: 3.0 },
        nearRoads: { weight: 2.5 },
        nearPopulation: { weight: 2.0 },
        openSpace: { weight: 2.0, radius: 80 },
        spacing: 200
      },
      storage: {
        nearProduction: { weight: 2.5, sources: ['farm', 'workshop'], maxDistance: 150 },
        nearRoad: { weight: 1.5, maxDistance: 60 },
        accessible: { weight: 2.0 },
        spacing: 100
      },
      barracks: {
        nearWalls: { weight: 2.5, maxDistance: 100 },
        strategicPosition: { weight: 2.0 },
        nearTrainingGround: { weight: 1.8 },
        spacing: 150
      }
    }

    // Town planning patterns
    this.TOWN_PATTERNS = {
      ORGANIC: {
        name: 'Organic Growth',
        description: 'Natural expansion following terrain',
        rules: {
          followTerrain: true,
          irregularStreets: true,
          mixedZoning: true
        }
      },
      GRID: {
        name: 'Grid Pattern',
        description: 'Organized city blocks',
        rules: {
          straightRoads: true,
          regularBlocks: true,
          separateZones: true
        }
      },
      RADIAL: {
        name: 'Radial Pattern',
        description: 'Circular expansion from center',
        rules: {
          circularRoads: true,
          concentricZones: true,
          centralFocus: true
        }
      },
      DEFENSIVE: {
        name: 'Defensive Layout',
        description: 'Prioritize defense and control',
        rules: {
          wallPriority: true,
          gatehouseControl: true,
          militaryZones: true
        }
      }
    }

    // Zone definitions
    this.ZONES = {
      RESIDENTIAL: ['house', 'tavern', 'inn'],
      COMMERCIAL: ['market', 'shop', 'tradingPost'],
      INDUSTRIAL: ['workshop', 'blacksmith', 'mill'],
      AGRICULTURAL: ['farm', 'ranch', 'orchard'],
      RELIGIOUS: ['temple', 'shrine', 'monastery'],
      MILITARY: ['barracks', 'watchtower', 'armory'],
      STORAGE: ['warehouse', 'granary', 'storage']
    }

    // Expansion priorities
    this.EXPANSION_PRIORITIES = {
      GROWTH: { housing: 3, food: 2, industry: 1, military: 1 },
      DEFENSE: { military: 3, walls: 3, housing: 1, food: 2 },
      ECONOMY: { industry: 3, commerce: 3, storage: 2, housing: 1 },
      FAITH: { religious: 3, housing: 2, food: 1, culture: 2 }
    }
  }

  /**
   * Plan next building placement
   */
  planNextBuilding(player, availablePlots, resources) {
    // Analyze current needs
    const needs = this.analyzeVillageNeeds(player)
    
    // Determine building type needed
    const buildingType = this.selectBuildingType(needs, player.expansionStrategy || 'GROWTH')
    
    // Find optimal location
    const location = this.findOptimalLocation(
      buildingType,
      player,
      availablePlots
    )

    if (!location) {
      return null
    }

    return {
      type: buildingType,
      x: location.x,
      y: location.y,
      rotation: location.rotation,
      priority: location.score,
      reason: needs.primary
    }
  }

  analyzeVillageNeeds(player) {
    const needs = {
      housing: 0,
      food: 0,
      production: 0,
      storage: 0,
      faith: 0,
      defense: 0,
      commerce: 0
    }

    // Housing need
    const homelessVillagers = player.villagers.filter(v => !v.home).length
    const housingCapacity = player.buildings
      .filter(b => b.type === 'house')
      .reduce((sum, b) => sum + (b.capacity || 4), 0)
    needs.housing = Math.max(0, player.villagers.length - housingCapacity + 5) // Buffer

    // Food need
    const foodConsumption = player.villagers.length * 2
    const foodProduction = player.buildings
      .filter(b => b.type === 'farm')
      .reduce((sum, b) => sum + (b.foodProduction || 2), 0)
    needs.food = Math.max(0, foodConsumption - foodProduction)

    // Storage need
    const totalResources = Object.values(player.resources).reduce((a, b) => a + b, 0)
    const storageCapacity = player.buildings
      .filter(b => b.type === 'storage')
      .reduce((sum, b) => sum + (b.capacity || 500), 0)
    needs.storage = totalResources > storageCapacity * 0.8 ? 1 : 0

    // Faith need
    const faithfulVillagers = player.villagers.filter(v => v.needs?.faith < 50).length
    needs.faith = faithfulVillagers > 5 ? 1 : 0

    // Defense need
    const threats = this.assessThreats(player)
    needs.defense = threats.level

    // Find primary need
    const primary = Object.entries(needs)
      .sort(([,a], [,b]) => b - a)[0][0]

    return { ...needs, primary }
  }

  assessThreats(player) {
    // Simple threat assessment
    const enemyStrength = player.nearbyEnemies?.reduce((sum, e) => sum + e.militaryPower, 0) || 0
    const ownStrength = player.buildings.filter(b => b.type === 'barracks').length * 10

    return {
      level: enemyStrength > ownStrength ? 2 : enemyStrength > 0 ? 1 : 0,
      direction: null // Could calculate threat direction
    }
  }

  selectBuildingType(needs, strategy) {
    const priorities = this.EXPANSION_PRIORITIES[strategy]
    
    // Weight needs by strategy
    const weightedNeeds = {}
    if (needs.housing > 0 && priorities.housing) {
      weightedNeeds.house = needs.housing * priorities.housing
    }
    if (needs.food > 0 && priorities.food) {
      weightedNeeds.farm = needs.food * priorities.food
    }
    if (needs.storage > 0 && priorities.storage) {
      weightedNeeds.storage = needs.storage * priorities.storage
    }
    if (needs.faith > 0 && priorities.religious) {
      weightedNeeds.temple = needs.faith * priorities.religious
    }
    if (needs.defense > 0 && priorities.military) {
      weightedNeeds.barracks = needs.defense * priorities.military
    }

    // Select highest priority
    const sorted = Object.entries(weightedNeeds).sort(([,a], [,b]) => b - a)
    return sorted.length > 0 ? sorted[0][0] : 'house' // Default to house
  }

  findOptimalLocation(buildingType, player, availablePlots) {
    const rules = this.PLACEMENT_RULES[buildingType]
    if (!rules) return null

    const candidates = []
    const townPattern = player.townPattern || 'ORGANIC'
    const pattern = this.TOWN_PATTERNS[townPattern]

    // Evaluate each available plot
    availablePlots.forEach(plot => {
      if (!this.canPlaceBuilding(buildingType, plot, player)) {
        return
      }

      let score = 0
      const location = {
        x: plot.x + plot.width / 2,
        y: plot.y + plot.height / 2
      }

      // Apply placement rules
      score += this.scoreByProximity(location, player, rules)
      score += this.scoreByTerrain(plot, buildingType)
      score += this.scoreByPattern(location, player, pattern)
      score += this.scoreByZoning(location, buildingType, player)

      candidates.push({
        ...location,
        score,
        plot,
        rotation: this.calculateRotation(location, player.townCenter)
      })
    })

    // Sort by score and return best
    candidates.sort((a, b) => b.score - a.score)
    return candidates[0] || null
  }

  canPlaceBuilding(buildingType, plot, player) {
    const rules = this.PLACEMENT_RULES[buildingType]
    
    // Check spacing requirements
    const nearbyBuildings = player.buildings.filter(b => {
      const dist = Math.sqrt(
        Math.pow(b.x - plot.x, 2) + 
        Math.pow(b.y - plot.y, 2)
      )
      return dist < rules.spacing
    })

    return nearbyBuildings.length === 0
  }

  scoreByProximity(location, player, rules) {
    let score = 0

    // Score by distance to roads
    if (rules.nearRoad) {
      const roadDist = this.getDistanceToNearestRoad(location, player)
      if (roadDist < rules.nearRoad.maxDistance) {
        score += rules.nearRoad.weight * (1 - roadDist / rules.nearRoad.maxDistance)
      }
    }

    // Score by distance to center
    if (rules.nearCenter) {
      const centerDist = this.getDistanceToCenter(location, player)
      if (centerDist < rules.nearCenter.maxDistance) {
        score += rules.nearCenter.weight * (1 - centerDist / rules.nearCenter.maxDistance)
      }
    }

    // Score by proximity to other buildings
    if (rules.nearOtherHouses) {
      const houseDist = this.getAverageDistanceToBuildings(location, player, 'house')
      const idealDist = rules.nearOtherHouses.idealDistance
      const diff = Math.abs(houseDist - idealDist)
      score += rules.nearOtherHouses.weight * Math.max(0, 1 - diff / idealDist)
    }

    return score
  }

  scoreByTerrain(plot, buildingType) {
    let score = 0

    switch (buildingType) {
      case 'farm':
        // Farms prefer fertile land
        if (plot.terrain === 'grassland' || plot.terrain === 'plains') {
          score += 2
        }
        break
      case 'temple':
        // Temples prefer high ground
        if (plot.elevation > 0.6) {
          score += 2
        }
        break
      case 'house':
        // Houses prefer flat, pleasant terrain
        if (plot.terrain === 'grassland' && plot.elevation > 0.3 && plot.elevation < 0.7) {
          score += 1.5
        }
        break
    }

    return score
  }

  scoreByPattern(location, player, pattern) {
    let score = 0

    if (pattern.rules.straightRoads) {
      // Prefer alignment with existing buildings
      const aligned = this.isAlignedWithGrid(location, player)
      score += aligned ? 1.5 : 0
    }

    if (pattern.rules.concentricZones) {
      // Prefer appropriate distance from center based on building type
      const dist = this.getDistanceToCenter(location, player)
      const idealDist = this.getIdealDistanceForZone(location.type)
      score += Math.max(0, 1 - Math.abs(dist - idealDist) / idealDist)
    }

    return score
  }

  scoreByZoning(location, buildingType, player) {
    // Find which zone this building belongs to
    let buildingZone = null
    for (const [zone, types] of Object.entries(this.ZONES)) {
      if (types.includes(buildingType)) {
        buildingZone = zone
        break
      }
    }

    if (!buildingZone) return 0

    // Count nearby buildings of same and different zones
    let sameZone = 0
    let differentZone = 0

    player.buildings.forEach(building => {
      const dist = Math.sqrt(
        Math.pow(building.x - location.x, 2) +
        Math.pow(building.y - location.y, 2)
      )
      
      if (dist < 150) { // Within zone radius
        let otherZone = null
        for (const [zone, types] of Object.entries(this.ZONES)) {
          if (types.includes(building.type)) {
            otherZone = zone
            break
          }
        }

        if (otherZone === buildingZone) {
          sameZone++
        } else {
          differentZone++
        }
      }
    })

    // Prefer same zone, penalize different zones
    return sameZone * 0.5 - differentZone * 0.3
  }

  // Helper methods
  getDistanceToNearestRoad(location, player) {
    let minDist = Infinity
    player.roads?.forEach(road => {
      const dist = this.pointToLineDistance(location, road.start, road.end)
      minDist = Math.min(minDist, dist)
    })
    return minDist
  }

  getDistanceToCenter(location, player) {
    const center = player.townCenter || player.territory?.center || { x: 0, y: 0 }
    return Math.sqrt(
      Math.pow(location.x - center.x, 2) +
      Math.pow(location.y - center.y, 2)
    )
  }

  getAverageDistanceToBuildings(location, player, buildingType) {
    const buildings = player.buildings.filter(b => b.type === buildingType)
    if (buildings.length === 0) return 0

    const totalDist = buildings.reduce((sum, b) => {
      return sum + Math.sqrt(
        Math.pow(b.x - location.x, 2) +
        Math.pow(b.y - location.y, 2)
      )
    }, 0)

    return totalDist / buildings.length
  }

  pointToLineDistance(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x
    const B = point.y - lineStart.y
    const C = lineEnd.x - lineStart.x
    const D = lineEnd.y - lineStart.y

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1

    if (lenSq !== 0) {
      param = dot / lenSq
    }

    let xx, yy

    if (param < 0) {
      xx = lineStart.x
      yy = lineStart.y
    } else if (param > 1) {
      xx = lineEnd.x
      yy = lineEnd.y
    } else {
      xx = lineStart.x + param * C
      yy = lineStart.y + param * D
    }

    const dx = point.x - xx
    const dy = point.y - yy
    return Math.sqrt(dx * dx + dy * dy)
  }

  isAlignedWithGrid(location, player) {
    const gridSize = 40 // Grid unit size
    const tolerance = 10

    // Check if location aligns with any existing building
    return player.buildings.some(building => {
      const xAligned = Math.abs((location.x - building.x) % gridSize) < tolerance
      const yAligned = Math.abs((location.y - building.y) % gridSize) < tolerance
      return xAligned || yAligned
    })
  }

  calculateRotation(location, center) {
    if (!center) return 0
    
    const angle = Math.atan2(location.y - center.y, location.x - center.x)
    // Snap to 90-degree angles for grid alignment
    return Math.round(angle / (Math.PI / 2)) * (Math.PI / 2)
  }

  getIdealDistanceForZone(buildingType) {
    // Define ideal distances from center for different building types
    const distances = {
      temple: 50,
      market: 100,
      house: 200,
      workshop: 300,
      farm: 400,
      barracks: 250
    }
    return distances[buildingType] || 200
  }

  /**
   * Generate road network plan
   */
  planRoadNetwork(player) {
    const roads = []
    const buildings = player.buildings
    const pattern = this.TOWN_PATTERNS[player.townPattern || 'ORGANIC']

    if (pattern.rules.straightRoads) {
      // Create grid roads
      roads.push(...this.createGridRoads(buildings))
    } else if (pattern.rules.circularRoads) {
      // Create radial roads
      roads.push(...this.createRadialRoads(buildings, player.townCenter))
    } else {
      // Create organic roads connecting buildings
      roads.push(...this.createOrganicRoads(buildings))
    }

    return roads
  }

  createGridRoads(buildings) {
    // Simple grid based on building positions
    const roads = []
    const gridSize = 120

    // Find bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    buildings.forEach(b => {
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x)
      maxY = Math.max(maxY, b.y)
    })

    // Create horizontal roads
    for (let y = minY; y <= maxY; y += gridSize) {
      roads.push({
        start: { x: minX - 50, y },
        end: { x: maxX + 50, y },
        type: 'main'
      })
    }

    // Create vertical roads
    for (let x = minX; x <= maxX; x += gridSize) {
      roads.push({
        start: { x, y: minY - 50 },
        end: { x, y: maxY + 50 },
        type: 'main'
      })
    }

    return roads
  }

  createRadialRoads(buildings, center) {
    const roads = []
    if (!center) return roads

    // Create roads from center to key buildings
    buildings.forEach(building => {
      if (building.type === 'temple' || building.type === 'market') {
        roads.push({
          start: center,
          end: { x: building.x, y: building.y },
          type: 'main'
        })
      }
    })

    // Create circular roads at different radii
    const radii = [150, 300, 450]
    radii.forEach(radius => {
      const segments = 16
      for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2
        const angle2 = ((i + 1) / segments) * Math.PI * 2
        
        roads.push({
          start: {
            x: center.x + Math.cos(angle1) * radius,
            y: center.y + Math.sin(angle1) * radius
          },
          end: {
            x: center.x + Math.cos(angle2) * radius,
            y: center.y + Math.sin(angle2) * radius
          },
          type: 'circular'
        })
      }
    })

    return roads
  }

  createOrganicRoads(buildings) {
    const roads = []
    
    // Connect buildings with minimum spanning tree
    // Simplified version - connect each building to nearest neighbor
    buildings.forEach((building, index) => {
      if (index === 0) return
      
      let nearest = null
      let minDist = Infinity
      
      for (let i = 0; i < index; i++) {
        const other = buildings[i]
        const dist = Math.sqrt(
          Math.pow(building.x - other.x, 2) +
          Math.pow(building.y - other.y, 2)
        )
        
        if (dist < minDist) {
          minDist = dist
          nearest = other
        }
      }
      
      if (nearest && minDist < 300) {
        roads.push({
          start: { x: building.x, y: building.y },
          end: { x: nearest.x, y: nearest.y },
          type: 'path'
        })
      }
    })

    return roads
  }
}

// Export singleton
export const villageExpansionAI = new VillageExpansionAI()