/**
 * Impressiveness System
 * Buildings generate influence based on their impressiveness
 * Affects conversion, happiness, and territory control
 */

export class ImpressivenessSystem {
  constructor() {
    // Base impressiveness values
    this.BASE_IMPRESSIVENESS = {
      // Basic buildings
      house: 1,
      farm: 0.5,
      storage: 0.8,
      workshop: 1.2,
      
      // Religious buildings
      shrine: 3,
      temple: 5,
      cathedral: 10,
      monastery: 4,
      oracle: 6,
      
      // Military buildings
      barracks: 2,
      watchtower: 3,
      fortress: 7,
      
      // Civic buildings
      townCenter: 4,
      market: 3,
      tavern: 2,
      school: 3,
      library: 4,
      
      // Monuments
      statue: 5,
      monument: 8,
      wonder: 15,
      fountain: 3,
      garden: 2
    }

    // Factors that modify impressiveness
    this.MODIFIERS = {
      level: {
        1: 1.0,
        2: 1.5,
        3: 2.0,
        4: 2.5,
        5: 3.0
      },
      specialization: 1.3,
      decoration: 1.2,
      maintenance: {
        perfect: 1.2,
        good: 1.0,
        poor: 0.7,
        ruined: 0.3
      },
      age: {
        new: 1.0,
        established: 1.1,
        ancient: 1.3,
        legendary: 1.5
      },
      location: {
        hilltop: 1.3,
        waterfront: 1.2,
        crossroads: 1.15,
        isolated: 0.8
      }
    }

    // Influence radius calculation
    this.INFLUENCE_RADIUS = {
      base: 100,
      perImpressiveness: 20,
      maxRadius: 500
    }

    // Effects of impressiveness
    this.EFFECTS = {
      conversionBonus: 0.1,      // Per point of impressiveness
      happinessRadius: 0.8,      // Multiplier of influence radius
      beliefGeneration: 0.2,     // Belief per impressiveness per second
      attractionPower: 0.15,     // Chance to attract new villagers
      intimidationFactor: 0.05   // Reduces enemy morale
    }

    // Building influence data
    this.buildingInfluence = new Map() // buildingId -> influence data
    
    // Area influence grid for optimization
    this.influenceGrid = null
    this.gridCellSize = 50
    
    // Visual effects
    this.auraEffects = new Map() // buildingId -> aura effect
  }

  /**
   * Initialize influence grid
   */
  initializeGrid(worldWidth, worldHeight) {
    const gridWidth = Math.ceil(worldWidth / this.gridCellSize)
    const gridHeight = Math.ceil(worldHeight / this.gridCellSize)
    
    this.influenceGrid = Array(gridHeight).fill(null).map(() => 
      Array(gridWidth).fill(null).map(() => ({
        influence: 0,
        sources: []
      }))
    )
  }

  /**
   * Calculate building impressiveness
   */
  calculateImpressiveness(building) {
    // Base value
    let impressiveness = this.BASE_IMPRESSIVENESS[building.type] || 1

    // Level modifier
    const level = building.level || 1
    impressiveness *= this.MODIFIERS.level[level] || 1

    // Specialization bonus
    if (building.specialization) {
      impressiveness *= this.MODIFIERS.specialization
    }

    // Decoration bonus
    if (building.decorations && building.decorations.length > 0) {
      impressiveness *= Math.min(1.5, 1 + (building.decorations.length * 0.1))
    }

    // Maintenance state
    const condition = building.condition || 100
    let maintenanceState = 'perfect'
    if (condition < 30) maintenanceState = 'ruined'
    else if (condition < 60) maintenanceState = 'poor'
    else if (condition < 90) maintenanceState = 'good'
    
    impressiveness *= this.MODIFIERS.maintenance[maintenanceState]

    // Age bonus
    const age = Date.now() - (building.builtTime || Date.now())
    const ageInDays = age / (1000 * 60 * 60 * 24)
    
    let ageCategory = 'new'
    if (ageInDays > 100) ageCategory = 'legendary'
    else if (ageInDays > 50) ageCategory = 'ancient'
    else if (ageInDays > 10) ageCategory = 'established'
    
    impressiveness *= this.MODIFIERS.age[ageCategory]

    // Location bonus
    const locationBonus = this.getLocationBonus(building)
    impressiveness *= locationBonus

    // Special building bonuses
    impressiveness *= this.getSpecialBonus(building)

    return Math.round(impressiveness * 10) / 10 // Round to 1 decimal
  }

  getLocationBonus(building) {
    let bonus = 1.0

    // Hilltop bonus
    if (building.elevation && building.elevation > 0.7) {
      bonus *= this.MODIFIERS.location.hilltop
    }

    // Waterfront bonus
    if (building.nearWater) {
      bonus *= this.MODIFIERS.location.waterfront
    }

    // Crossroads bonus
    if (building.nearRoads >= 2) {
      bonus *= this.MODIFIERS.location.crossroads
    }

    // Isolation penalty
    if (building.isolated) {
      bonus *= this.MODIFIERS.location.isolated
    }

    return bonus
  }

  getSpecialBonus(building) {
    let bonus = 1.0

    // Wonder-specific bonuses
    if (building.type === 'wonder') {
      // Each wonder is unique
      if (building.wonderType === 'colossus') bonus *= 1.5
      if (building.wonderType === 'hanging_gardens') bonus *= 1.4
      if (building.wonderType === 'lighthouse') bonus *= 1.3
    }

    // Synergy bonuses
    if (building.type === 'temple' && building.nearbyReligiousBuildings > 0) {
      bonus *= 1 + (building.nearbyReligiousBuildings * 0.1)
    }

    // Player achievements affect impressiveness
    if (building.owner) {
      const player = this.getPlayer(building.owner)
      if (player?.achievements?.includes('master_builder')) bonus *= 1.2
      if (player?.achievements?.includes('divine_architect')) bonus *= 1.3
    }

    return bonus
  }

  /**
   * Calculate influence radius
   */
  calculateInfluenceRadius(impressiveness) {
    const radius = this.INFLUENCE_RADIUS.base + 
                  (impressiveness * this.INFLUENCE_RADIUS.perImpressiveness)
    
    return Math.min(this.INFLUENCE_RADIUS.maxRadius, radius)
  }

  /**
   * Update building influence
   */
  updateBuildingInfluence(building) {
    const impressiveness = this.calculateImpressiveness(building)
    const radius = this.calculateInfluenceRadius(impressiveness)
    
    const influence = {
      buildingId: building.id,
      impressiveness,
      radius,
      center: {
        x: building.x + building.width / 2,
        y: building.y + building.height / 2
      },
      strength: impressiveness / 10, // Normalized strength
      effects: this.calculateEffects(impressiveness),
      auraColor: this.getAuraColor(building, impressiveness)
    }

    this.buildingInfluence.set(building.id, influence)
    
    // Update influence grid
    this.updateInfluenceGrid(influence)
    
    // Update visual aura
    this.updateAuraEffect(building, influence)
    
    return influence
  }

  calculateEffects(impressiveness) {
    return {
      conversionBonus: impressiveness * this.EFFECTS.conversionBonus,
      happinessBonus: impressiveness * 2,
      beliefGeneration: impressiveness * this.EFFECTS.beliefGeneration,
      attractionChance: Math.min(0.5, impressiveness * this.EFFECTS.attractionPower),
      intimidation: impressiveness * this.EFFECTS.intimidationFactor
    }
  }

  getAuraColor(building, impressiveness) {
    // Color based on building type and impressiveness
    const typeColors = {
      temple: '#FFD700',     // Gold
      cathedral: '#FFFFFF',   // White
      wonder: '#FF69B4',     // Pink
      monument: '#4169E1',   // Royal Blue
      fortress: '#DC143C',   // Crimson
      library: '#9370DB',    // Medium Purple
      market: '#FF8C00'      // Dark Orange
    }

    const baseColor = typeColors[building.type] || '#87CEEB' // Sky Blue default
    
    // Adjust brightness based on impressiveness
    const brightness = Math.min(1, 0.5 + (impressiveness / 20))
    
    return this.adjustColorBrightness(baseColor, brightness)
  }

  adjustColorBrightness(color, brightness) {
    // Simple brightness adjustment
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    const adjust = (channel) => Math.min(255, Math.floor(channel * brightness))
    
    return `#${adjust(r).toString(16).padStart(2, '0')}${adjust(g).toString(16).padStart(2, '0')}${adjust(b).toString(16).padStart(2, '0')}`
  }

  updateInfluenceGrid(influence) {
    if (!this.influenceGrid) return

    const gridX = Math.floor(influence.center.x / this.gridCellSize)
    const gridY = Math.floor(influence.center.y / this.gridCellSize)
    const gridRadius = Math.ceil(influence.radius / this.gridCellSize)

    // Clear old influence
    this.clearBuildingInfluence(influence.buildingId)

    // Add new influence
    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      for (let dy = -gridRadius; dy <= gridRadius; dy++) {
        const gx = gridX + dx
        const gy = gridY + dy
        
        if (gx >= 0 && gx < this.influenceGrid[0].length &&
            gy >= 0 && gy < this.influenceGrid.length) {
          
          const distance = Math.sqrt(dx * dx + dy * dy) * this.gridCellSize
          if (distance <= influence.radius) {
            const falloff = 1 - (distance / influence.radius)
            const cellInfluence = influence.strength * falloff
            
            this.influenceGrid[gy][gx].influence += cellInfluence
            this.influenceGrid[gy][gx].sources.push({
              buildingId: influence.buildingId,
              contribution: cellInfluence
            })
          }
        }
      }
    }
  }

  clearBuildingInfluence(buildingId) {
    if (!this.influenceGrid) return

    for (let y = 0; y < this.influenceGrid.length; y++) {
      for (let x = 0; x < this.influenceGrid[0].length; x++) {
        const cell = this.influenceGrid[y][x]
        cell.sources = cell.sources.filter(s => s.buildingId !== buildingId)
        cell.influence = cell.sources.reduce((sum, s) => sum + s.contribution, 0)
      }
    }
  }

  updateAuraEffect(building, influence) {
    this.auraEffects.set(building.id, {
      radius: influence.radius,
      color: influence.auraColor,
      intensity: influence.strength,
      pulseSpeed: 2 - influence.strength, // Faster pulse for more impressive
      particles: influence.impressiveness > 5
    })
  }

  /**
   * Get influence at a specific point
   */
  getInfluenceAt(x, y, playerId = null) {
    if (!this.influenceGrid) return { total: 0, sources: [] }

    const gridX = Math.floor(x / this.gridCellSize)
    const gridY = Math.floor(y / this.gridCellSize)

    if (gridX < 0 || gridX >= this.influenceGrid[0].length ||
        gridY < 0 || gridY >= this.influenceGrid.length) {
      return { total: 0, sources: [] }
    }

    const cell = this.influenceGrid[gridY][gridX]
    
    if (playerId) {
      // Filter by player
      const playerSources = cell.sources.filter(s => {
        const building = this.getBuilding(s.buildingId)
        return building && building.owner === playerId
      })
      
      const total = playerSources.reduce((sum, s) => sum + s.contribution, 0)
      return { total, sources: playerSources }
    }

    return { total: cell.influence, sources: cell.sources }
  }

  /**
   * Apply influence effects to entities
   */
  applyInfluenceEffects(entities, buildings, deltaTime) {
    entities.forEach(entity => {
      if (entity.type !== 'villager') return

      const influence = this.getInfluenceAt(entity.x, entity.y)
      
      if (influence.total > 0) {
        // Get strongest influence source
        const strongestSource = influence.sources.reduce((max, s) => 
          s.contribution > max.contribution ? s : max
        , { contribution: 0 })

        if (strongestSource.buildingId) {
          const buildingInfluence = this.buildingInfluence.get(strongestSource.buildingId)
          if (buildingInfluence) {
            this.applyEffectsToEntity(entity, buildingInfluence.effects, deltaTime)
          }
        }
      }
    })
  }

  applyEffectsToEntity(entity, effects, deltaTime) {
    const timeMultiplier = deltaTime / 1000

    // Happiness effect
    if (effects.happinessBonus && entity.happiness !== undefined) {
      entity.happiness = Math.min(100, 
        entity.happiness + effects.happinessBonus * timeMultiplier * 0.1
      )
    }

    // Conversion resistance
    if (effects.conversionBonus && entity.conversionResistance !== undefined) {
      entity.conversionResistance *= (1 + effects.conversionBonus)
    }

    // Inspiration effect
    if (effects.beliefGeneration > 2) {
      entity.inspired = true
      entity.inspiredDuration = 5000
    }
  }

  /**
   * Check if point is within impressive building influence
   */
  isInImpressiveArea(x, y, minImpressiveness = 5) {
    const influence = this.getInfluenceAt(x, y)
    
    return influence.sources.some(source => {
      const buildingInfluence = this.buildingInfluence.get(source.buildingId)
      return buildingInfluence && buildingInfluence.impressiveness >= minImpressiveness
    })
  }

  /**
   * Get most impressive building for a player
   */
  getMostImpressiveBuilding(player) {
    let mostImpressive = null
    let highestScore = 0

    player.buildings.forEach(building => {
      const impressiveness = this.calculateImpressiveness(building)
      if (impressiveness > highestScore) {
        highestScore = impressiveness
        mostImpressive = building
      }
    })

    return { building: mostImpressive, impressiveness: highestScore }
  }

  /**
   * Calculate total impressiveness for a player
   */
  getPlayerImpressiveness(player) {
    let total = 0
    let buildingCount = 0

    player.buildings.forEach(building => {
      const impressiveness = this.calculateImpressiveness(building)
      total += impressiveness
      buildingCount++
    })

    return {
      total,
      average: buildingCount > 0 ? total / buildingCount : 0,
      buildingCount
    }
  }

  /**
   * Get impressiveness bonus for conversion
   */
  getConversionBonus(converterId, targetId) {
    const converter = this.getEntity(converterId)
    const target = this.getEntity(targetId)
    
    if (!converter || !target) return 1.0

    // Get influence at converter's position
    const converterInfluence = this.getInfluenceAt(converter.x, converter.y, converter.playerId)
    
    // Get influence at target's position
    const targetInfluence = this.getInfluenceAt(target.x, target.y, target.playerId)
    
    // Calculate bonus
    let bonus = 1.0
    
    // Converter's impressive buildings help
    if (converterInfluence.total > 0) {
      bonus += converterInfluence.total * 0.1
    }
    
    // Target's impressive buildings hinder
    if (targetInfluence.total > 0) {
      bonus -= targetInfluence.total * 0.05
    }

    return Math.max(0.5, Math.min(3.0, bonus))
  }

  /**
   * Attract new villagers with impressive buildings
   */
  checkVillagerAttraction(player, deltaTime) {
    const impressiveness = this.getPlayerImpressiveness(player)
    
    // Only very impressive civilizations attract villagers
    if (impressiveness.average < 5) return

    // Calculate attraction chance
    const baseChance = 0.001 // 0.1% per second
    const impressivenessBonus = impressiveness.average * 0.0001
    const chance = (baseChance + impressivenessBonus) * (deltaTime / 1000)

    if (Math.random() < chance) {
      // Attract a new villager
      this.attractNewVillager(player, impressiveness)
    }
  }

  attractNewVillager(player, impressiveness) {
    // Find most impressive building as spawn point
    const { building } = this.getMostImpressiveBuilding(player)
    if (!building) return

    const spawnPoint = {
      x: building.x + building.width / 2,
      y: building.y + building.height + 20
    }

    // Create attracted villager event
    return {
      type: 'villager_attracted',
      player: player.id,
      spawnPoint,
      reason: 'impressive_buildings',
      impressiveness: impressiveness.average
    }
  }

  /**
   * Get aura effects for rendering
   */
  getAuraEffects() {
    return Array.from(this.auraEffects.entries()).map(([buildingId, aura]) => ({
      buildingId,
      ...aura
    }))
  }

  /**
   * Get influence visualization data
   */
  getInfluenceVisualization(playerId = null) {
    if (!this.influenceGrid) return []

    const visualization = []
    
    for (let y = 0; y < this.influenceGrid.length; y++) {
      for (let x = 0; x < this.influenceGrid[0].length; x++) {
        const cell = this.influenceGrid[y][x]
        
        if (cell.influence > 0.1) {
          let influence = cell.influence
          
          if (playerId) {
            // Filter by player
            influence = cell.sources
              .filter(s => {
                const building = this.getBuilding(s.buildingId)
                return building && building.owner === playerId
              })
              .reduce((sum, s) => sum + s.contribution, 0)
          }

          if (influence > 0.1) {
            visualization.push({
              x: x * this.gridCellSize,
              y: y * this.gridCellSize,
              size: this.gridCellSize,
              influence,
              opacity: Math.min(0.5, influence * 0.2)
            })
          }
        }
      }
    }

    return visualization
  }

  // Stub methods for integration
  getPlayer(playerId) {
    // Would integrate with player system
    return null
  }

  getBuilding(buildingId) {
    // Would integrate with building system
    return null
  }

  getEntity(entityId) {
    // Would integrate with entity system
    return null
  }
}

// Export singleton
export const impressivenessSystem = new ImpressivenessSystem()