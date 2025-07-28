/**
 * Preacher System
 * Specialized units that convert villagers and spread religious influence
 */

export class PreacherSystem {
  constructor() {
    // Preacher types and their abilities
    this.PREACHER_TYPES = {
      DISCIPLE: {
        name: 'Disciple',
        tier: 1,
        cost: { beliefPoints: 30, training: 300 }, // 5 seconds training
        abilities: {
          conversionPower: 1.0,
          conversionRange: 100,
          influenceRadius: 150,
          moveSpeed: 1.2,
          faithGeneration: 0.5
        },
        appearance: {
          robeColor: '#8B7355',
          symbol: '✝',
          glow: false
        }
      },
      
      PRIEST: {
        name: 'Priest',
        tier: 2,
        cost: { beliefPoints: 60, training: 600, experience: 100 },
        requirements: ['theology'],
        abilities: {
          conversionPower: 2.0,
          conversionRange: 150,
          influenceRadius: 200,
          moveSpeed: 1.0,
          faithGeneration: 1.0,
          healing: true,
          bless: true
        },
        appearance: {
          robeColor: '#FFD700',
          symbol: '☩',
          glow: true,
          glowColor: '#FFFACD'
        }
      },
      
      PROPHET: {
        name: 'Prophet',
        tier: 3,
        cost: { beliefPoints: 120, training: 900, experience: 500 },
        requirements: ['theology', 'mysticism'],
        abilities: {
          conversionPower: 3.5,
          conversionRange: 200,
          influenceRadius: 300,
          moveSpeed: 0.8,
          faithGeneration: 2.0,
          healing: true,
          bless: true,
          miracle: true,
          prophecy: true
        },
        appearance: {
          robeColor: '#FFFFFF',
          symbol: '☪',
          glow: true,
          glowColor: '#00FFFF',
          trail: true
        }
      }
    }

    // Conversion mechanics
    this.CONVERSION_FACTORS = {
      BASE_RESISTANCE: 100,
      HAPPINESS_MODIFIER: 0.5, // Unhappy villagers easier to convert
      FAITH_MODIFIER: 0.8,     // Low faith easier to convert
      DISTANCE_MODIFIER: 0.3,  // Closer to home = harder
      IMPRESSIVE_MODIFIER: 2.0 // Impressive buildings help conversion
    }

    // Active preachers
    this.preachers = new Map() // preacherId -> preacher data
    
    // Conversion progress tracking
    this.conversionProgress = new Map() // villagerId -> { preacher, progress, resistance }
    
    // Influence field visualization
    this.influenceFields = new Map() // preacherId -> influence data
  }

  /**
   * Create a new preacher from a villager
   */
  createPreacher(villager, player, type = 'DISCIPLE') {
    const preacherType = this.PREACHER_TYPES[type]
    if (!preacherType) return null

    // Check if player can afford
    if (player.beliefPoints < preacherType.cost.beliefPoints) {
      return { success: false, reason: 'Insufficient belief points' }
    }

    // Check requirements
    if (preacherType.requirements) {
      for (const req of preacherType.requirements) {
        if (!player.research?.includes(req)) {
          return { success: false, reason: `Requires ${req} research` }
        }
      }
    }

    // Deduct cost
    player.beliefPoints -= preacherType.cost.beliefPoints

    // Create preacher
    const preacher = {
      id: `preacher_${Date.now()}_${Math.random()}`,
      type,
      tier: preacherType.tier,
      villagerId: villager.id,
      playerId: player.id,
      abilities: { ...preacherType.abilities },
      appearance: { ...preacherType.appearance },
      
      // State
      state: 'training',
      trainingProgress: 0,
      trainingTime: preacherType.cost.training,
      
      // Stats
      experience: 0,
      level: 1,
      conversions: 0,
      
      // Current activity
      currentTarget: null,
      isPreaching: false,
      sermomCooldown: 0
    }

    // Transform villager
    villager.isPreacher = true
    villager.preacherId = preacher.id
    villager.profession = 'PREACHER'
    villager.appearance = {
      ...villager.appearance,
      ...preacherType.appearance
    }

    this.preachers.set(preacher.id, preacher)
    
    return { success: true, preacher }
  }

  /**
   * Update all preachers
   */
  updatePreachers(deltaTime, gameState) {
    this.preachers.forEach(preacher => {
      // Handle training
      if (preacher.state === 'training') {
        this.updateTraining(preacher, deltaTime)
        return
      }

      // Update cooldowns
      if (preacher.sermomCooldown > 0) {
        preacher.sermomCooldown -= deltaTime
      }

      // Find villager entity
      const villager = this.getVillagerEntity(preacher.villagerId, gameState)
      if (!villager) return

      // Update influence field
      this.updateInfluenceField(preacher, villager)

      // AI behavior based on state
      switch (preacher.state) {
        case 'idle':
          this.findConversionTarget(preacher, villager, gameState)
          break
          
        case 'traveling':
          this.updateTraveling(preacher, villager)
          break
          
        case 'preaching':
          this.updatePreaching(preacher, villager, gameState, deltaTime)
          break
          
        case 'converting':
          this.updateConverting(preacher, villager, gameState, deltaTime)
          break
          
        case 'blessing':
          this.updateBlessing(preacher, villager, gameState, deltaTime)
          break
      }

      // Generate faith passively
      this.generateFaith(preacher, gameState, deltaTime)
    })

    // Update conversion progress
    this.updateConversionProgress(deltaTime, gameState)
  }

  updateTraining(preacher, deltaTime) {
    preacher.trainingProgress += deltaTime
    
    if (preacher.trainingProgress >= preacher.trainingTime) {
      preacher.state = 'idle'
      preacher.trainingProgress = 0
      
      // Apply training complete effects
      this.onTrainingComplete(preacher)
    }
  }

  onTrainingComplete(preacher) {
    // Visual effect
    preacher.trainingCompleteEffect = {
      type: 'holy_aura',
      duration: 2000
    }
    
    // Boost initial stats
    preacher.abilities.conversionPower *= 1.1
  }

  findConversionTarget(preacher, villager, gameState) {
    const player = gameState.players.find(p => p.id === preacher.playerId)
    if (!player) return

    // Find nearby enemy or neutral villagers
    const targets = []
    
    gameState.players.forEach(otherPlayer => {
      if (otherPlayer.id === player.id) return
      
      otherPlayer.villagers.forEach(target => {
        const distance = this.getDistance(villager, target)
        
        if (distance < preacher.abilities.conversionRange * 3) {
          const convertibility = this.calculateConvertibility(target, distance, otherPlayer)
          
          targets.push({
            villager: target,
            distance,
            convertibility,
            player: otherPlayer
          })
        }
      })
    })

    // Sort by convertibility
    targets.sort((a, b) => b.convertibility - a.convertibility)
    
    if (targets.length > 0) {
      preacher.currentTarget = targets[0].villager.id
      preacher.targetPlayer = targets[0].player.id
      preacher.state = 'traveling'
    } else {
      // No targets, patrol or preach to own villagers
      this.startLocalPreaching(preacher, villager, player)
    }
  }

  calculateConvertibility(target, distance, targetPlayer) {
    let score = this.CONVERSION_FACTORS.BASE_RESISTANCE

    // Happiness factor (unhappy = easier)
    const happinessFactor = (100 - target.happiness) / 100
    score *= 1 + (happinessFactor * this.CONVERSION_FACTORS.HAPPINESS_MODIFIER)

    // Faith factor (low faith = easier)
    if (target.needs?.faith) {
      const faithFactor = (100 - target.needs.faith) / 100
      score *= 1 + (faithFactor * this.CONVERSION_FACTORS.FAITH_MODIFIER)
    }

    // Distance from home factor
    const homeDistance = this.getDistanceFromHome(target, targetPlayer)
    const distanceFactor = Math.min(1, homeDistance / 500)
    score *= 1 + (distanceFactor * this.CONVERSION_FACTORS.DISTANCE_MODIFIER)

    // Already being converted factor
    if (this.conversionProgress.has(target.id)) {
      score *= 0.5 // Less attractive if already targeted
    }

    return score
  }

  updateTraveling(preacher, villager) {
    if (!preacher.currentTarget) {
      preacher.state = 'idle'
      return
    }

    // Check if close enough to target
    const targetVillager = this.getTargetVillager(preacher.currentTarget)
    if (!targetVillager) {
      preacher.state = 'idle'
      preacher.currentTarget = null
      return
    }

    const distance = this.getDistance(villager, targetVillager)
    
    if (distance <= preacher.abilities.conversionRange) {
      // Start converting
      preacher.state = 'converting'
      this.startConversion(preacher, targetVillager)
    }
  }

  startConversion(preacher, targetVillager) {
    // Initialize conversion progress
    const resistance = this.calculateResistance(targetVillager)
    
    this.conversionProgress.set(targetVillager.id, {
      preacherId: preacher.id,
      progress: 0,
      resistance,
      startTime: Date.now()
    })

    // Visual feedback
    preacher.conversionBeam = {
      target: targetVillager.id,
      color: preacher.appearance.glowColor || '#FFD700'
    }
  }

  calculateResistance(villager) {
    let resistance = this.CONVERSION_FACTORS.BASE_RESISTANCE

    // Personality traits affect resistance
    if (villager.traits?.loyal) resistance *= 2.0
    if (villager.traits?.skeptical) resistance *= 1.5
    if (villager.traits?.spiritual) resistance *= 0.7
    if (villager.traits?.curious) resistance *= 0.8

    // Current state affects resistance
    if (villager.happiness > 80) resistance *= 1.5
    if (villager.needs?.faith > 80) resistance *= 1.3
    
    // Profession affects resistance
    if (villager.profession === 'PRIEST') resistance *= 3.0
    if (villager.profession === 'SOLDIER') resistance *= 1.8

    return resistance
  }

  updateConverting(preacher, villager, gameState, deltaTime) {
    const progress = this.conversionProgress.get(preacher.currentTarget)
    if (!progress) {
      preacher.state = 'idle'
      return
    }

    const targetVillager = this.getTargetVillager(preacher.currentTarget)
    if (!targetVillager) {
      this.conversionProgress.delete(preacher.currentTarget)
      preacher.state = 'idle'
      return
    }

    // Check distance
    const distance = this.getDistance(villager, targetVillager)
    if (distance > preacher.abilities.conversionRange) {
      // Too far, chase
      preacher.state = 'traveling'
      return
    }

    // Apply conversion power
    const conversionRate = preacher.abilities.conversionPower * (deltaTime / 1000)
    const impressiveBonus = this.getImpressiveBonus(villager, gameState)
    
    progress.progress += conversionRate * impressiveBonus

    // Check if conversion complete
    if (progress.progress >= progress.resistance) {
      this.completeConversion(preacher, targetVillager, gameState)
    }

    // Update visual effect intensity
    if (preacher.conversionBeam) {
      preacher.conversionBeam.intensity = progress.progress / progress.resistance
    }
  }

  getImpressiveBonus(preacherVillager, gameState) {
    let bonus = 1.0
    const player = gameState.players.find(p => p.id === preacherVillager.playerId)
    if (!player) return bonus

    // Check nearby impressive buildings
    player.buildings.forEach(building => {
      const distance = this.getDistance(preacherVillager, building)
      
      if (distance < 300) {
        const impressiveness = this.getBuildingImpressiveness(building)
        const distanceFactor = 1 - (distance / 300)
        bonus += impressiveness * distanceFactor * 0.1
      }
    })

    // Recent miracles boost conversion
    if (player.recentMiracles?.length > 0) {
      bonus *= 1.5
    }

    return Math.min(3.0, bonus) // Cap at 3x
  }

  getBuildingImpressiveness(building) {
    const baseImpressiveness = {
      temple: 2.0,
      cathedral: 4.0,
      monument: 3.0,
      palace: 3.5,
      wonder: 5.0
    }

    let impressive = baseImpressiveness[building.type] || 1.0
    
    // Level multiplier
    impressive *= (building.level || 1)
    
    // Specialization bonus
    if (building.specialization) {
      impressive *= 1.5
    }

    return impressive
  }

  completeConversion(preacher, targetVillager, gameState) {
    const targetPlayer = gameState.players.find(p => 
      p.villagers.some(v => v.id === targetVillager.id)
    )
    const newPlayer = gameState.players.find(p => p.id === preacher.playerId)

    if (!targetPlayer || !newPlayer) return

    // Remove from old player
    targetPlayer.villagers = targetPlayer.villagers.filter(v => v.id !== targetVillager.id)
    targetPlayer.population--

    // Add to new player
    targetVillager.playerId = newPlayer.id
    targetVillager.converted = true
    targetVillager.convertedBy = preacher.id
    targetVillager.loyaltyTransition = {
      from: targetPlayer.color,
      to: newPlayer.color,
      progress: 0,
      duration: 3000
    }
    
    newPlayer.villagers.push(targetVillager)
    newPlayer.population++

    // Update preacher stats
    preacher.conversions++
    preacher.experience += 50
    this.checkLevelUp(preacher)

    // Clear conversion progress
    this.conversionProgress.delete(targetVillager.id)
    preacher.currentTarget = null
    preacher.state = 'idle'
    
    // Visual celebration
    this.createConversionEffect(targetVillager, newPlayer.color)
    
    // Conversion complete audio/visual feedback
    preacher.conversionSuccess = {
      duration: 2000,
      particles: true
    }
  }

  updatePreaching(preacher, villager, gameState, deltaTime) {
    // Area preaching to boost faith and happiness
    if (preacher.sermomCooldown > 0) return

    const player = gameState.players.find(p => p.id === preacher.playerId)
    if (!player) return

    let targetCount = 0
    
    player.villagers.forEach(target => {
      const distance = this.getDistance(villager, target)
      
      if (distance <= preacher.abilities.influenceRadius) {
        // Boost faith
        if (target.needs?.faith) {
          target.needs.faith = Math.min(100, target.needs.faith + 0.5)
        }
        
        // Boost happiness
        target.happiness = Math.min(100, target.happiness + 0.2)
        
        targetCount++
      }
    })

    // Generate extra belief from sermon
    if (targetCount > 5) {
      player.beliefPoints += preacher.abilities.faithGeneration * targetCount * 0.1
      
      // Sermon cooldown
      preacher.sermomCooldown = 10000 // 10 seconds
    }
  }

  startLocalPreaching(preacher, villager, player) {
    // Find gathering spot (temple or town center)
    const temple = player.buildings.find(b => b.type === 'temple')
    
    if (temple) {
      villager.target = {
        x: temple.x + temple.width / 2,
        y: temple.y + temple.height / 2
      }
      preacher.state = 'preaching'
    } else {
      // Wander and preach
      preacher.state = 'idle'
    }
  }

  updateInfluenceField(preacher, villager) {
    this.influenceFields.set(preacher.id, {
      center: { x: villager.x, y: villager.y },
      radius: preacher.abilities.influenceRadius,
      strength: preacher.abilities.conversionPower,
      color: preacher.appearance.glowColor || '#FFD700'
    })
  }

  generateFaith(preacher, gameState, deltaTime) {
    const player = gameState.players.find(p => p.id === preacher.playerId)
    if (!player) return

    // Base faith generation
    const faithPerSecond = preacher.abilities.faithGeneration
    player.beliefPoints += faithPerSecond * (deltaTime / 1000)

    // Bonus from nearby believers
    const nearbyBelievers = this.countNearbyBelievers(preacher, player)
    if (nearbyBelievers > 0) {
      player.beliefPoints += nearbyBelievers * 0.1 * (deltaTime / 1000)
    }
  }

  countNearbyBelievers(preacher, player) {
    const villager = player.villagers.find(v => v.id === preacher.villagerId)
    if (!villager) return 0

    return player.villagers.filter(v => {
      const distance = this.getDistance(villager, v)
      return distance <= preacher.abilities.influenceRadius && v.needs?.faith > 50
    }).length
  }

  checkLevelUp(preacher) {
    const xpThresholds = [0, 100, 300, 600, 1000, 1500]
    const currentLevel = preacher.level
    
    for (let i = currentLevel; i < xpThresholds.length; i++) {
      if (preacher.experience >= xpThresholds[i]) {
        preacher.level = i + 1
        this.applyLevelUpBonuses(preacher)
      }
    }
  }

  applyLevelUpBonuses(preacher) {
    // Increase abilities
    preacher.abilities.conversionPower *= 1.1
    preacher.abilities.conversionRange *= 1.05
    preacher.abilities.influenceRadius *= 1.05
    preacher.abilities.faithGeneration *= 1.15

    // Unlock new abilities at certain levels
    if (preacher.level === 3 && preacher.type === 'PRIEST') {
      preacher.abilities.massConversion = true
    }
    
    if (preacher.level === 5 && preacher.type === 'PROPHET') {
      preacher.abilities.divineVision = true
    }

    // Visual upgrade
    preacher.levelUpEffect = {
      duration: 3000,
      newAura: true
    }
  }

  updateConversionProgress(deltaTime, gameState) {
    const completed = []
    
    this.conversionProgress.forEach((progress, villagerId) => {
      // Check if target still exists
      const exists = gameState.players.some(p => 
        p.villagers.some(v => v.id === villagerId)
      )
      
      if (!exists) {
        completed.push(villagerId)
      }
      
      // Timeout old conversions
      if (Date.now() - progress.startTime > 30000) {
        completed.push(villagerId)
      }
    })
    
    completed.forEach(id => this.conversionProgress.delete(id))
  }

  // Helper methods
  getDistance(entity1, entity2) {
    return Math.sqrt(
      Math.pow(entity1.x - entity2.x, 2) + 
      Math.pow(entity1.y - entity2.y, 2)
    )
  }

  getDistanceFromHome(villager, player) {
    if (!player.territory?.center) return 0
    return this.getDistance(villager, player.territory.center)
  }

  getVillagerEntity(villagerId, gameState) {
    for (const player of gameState.players) {
      const villager = player.villagers.find(v => v.id === villagerId)
      if (villager) return villager
    }
    return null
  }

  getTargetVillager(villagerId) {
    // This would integrate with the game state
    return null
  }

  createConversionEffect(villager, newColor) {
    return {
      type: 'conversion',
      position: { x: villager.x, y: villager.y },
      fromColor: villager.originalColor,
      toColor: newColor,
      duration: 2000,
      particles: 50
    }
  }

  /**
   * Get preacher info for UI
   */
  getPreacherInfo(preacherId) {
    const preacher = this.preachers.get(preacherId)
    if (!preacher) return null

    return {
      type: preacher.type,
      level: preacher.level,
      experience: preacher.experience,
      conversions: preacher.conversions,
      abilities: preacher.abilities,
      state: preacher.state,
      cooldowns: {
        sermon: Math.max(0, preacher.sermomCooldown)
      }
    }
  }

  /**
   * Get influence fields for rendering
   */
  getInfluenceFields() {
    return Array.from(this.influenceFields.values())
  }

  /**
   * Get conversion beams for rendering
   */
  getConversionBeams() {
    const beams = []
    
    this.preachers.forEach(preacher => {
      if (preacher.conversionBeam) {
        beams.push({
          from: preacher.villagerId,
          to: preacher.conversionBeam.target,
          color: preacher.conversionBeam.color,
          intensity: preacher.conversionBeam.intensity || 1
        })
      }
    })
    
    return beams
  }
}

// Export singleton
export const preacherSystem = new PreacherSystem()