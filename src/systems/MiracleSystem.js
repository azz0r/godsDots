/**
 * Miracle System
 * Handles miracle casting, effects, and resource management
 */

export class MiracleSystem {
  constructor() {
    // Miracle definitions
    this.MIRACLES = {
      // Basic Miracles
      healingRain: {
        name: 'Healing Rain',
        gesture: 'circle',
        cost: 20,
        cooldown: 5000, // 5 seconds
        radius: 150,
        description: 'Heals all units in the area',
        effects: {
          healing: 50,
          duration: 5000,
          tickRate: 500 // Heal every 0.5 seconds
        },
        particleColor: '#4169E1',
        sound: 'rain'
      },
      
      divineLight: {
        name: 'Divine Light',
        gesture: 'verticalLine',
        cost: 15,
        cooldown: 3000,
        radius: 100,
        description: 'Increases happiness and productivity',
        effects: {
          happiness: 20,
          productivity: 1.5,
          duration: 10000
        },
        particleColor: '#FFD700',
        sound: 'holy'
      },
      
      fertileGround: {
        name: 'Fertile Ground',
        gesture: 'zigzag',
        cost: 25,
        cooldown: 8000,
        radius: 200,
        description: 'Makes land fertile for farming',
        effects: {
          fertility: 2.0,
          cropGrowth: 3.0,
          permanent: true
        },
        particleColor: '#90EE90',
        sound: 'growth'
      },
      
      // Intermediate Miracles
      forestGrowth: {
        name: 'Forest Growth',
        gesture: 'tree',
        cost: 40,
        cooldown: 15000,
        radius: 180,
        description: 'Instantly grows a forest',
        effects: {
          treeCount: 15,
          treeMaturity: 'full',
          resourceAmount: 100
        },
        particleColor: '#228B22',
        sound: 'forest'
      },
      
      waterCreation: {
        name: 'Water Creation',
        gesture: 'sCurve',
        cost: 35,
        cooldown: 20000,
        radius: 100,
        description: 'Creates a water source',
        effects: {
          waterType: 'pond',
          permanent: true,
          fishSpawn: true
        },
        particleColor: '#00CED1',
        sound: 'splash'
      },
      
      lightningStrike: {
        name: 'Lightning Strike',
        gesture: 'lightning',
        cost: 50,
        cooldown: 10000,
        radius: 80,
        description: 'Strikes with divine lightning',
        effects: {
          damage: 150,
          chainCount: 3,
          chainRadius: 50,
          stunDuration: 2000
        },
        particleColor: '#FF00FF',
        sound: 'thunder'
      },
      
      shieldOfFaith: {
        name: 'Shield of Faith',
        gesture: 'square',
        cost: 45,
        cooldown: 12000,
        radius: 'drawn', // Uses drawn shape
        description: 'Protects an area from harm',
        effects: {
          damageReduction: 0.8,
          duration: 30000,
          blockProjectiles: true
        },
        particleColor: '#87CEEB',
        sound: 'shield'
      },
      
      // Advanced Miracles
      earthquake: {
        name: 'Earthquake',
        gesture: 'shake', // Special gesture - rapid movement
        cost: 80,
        cooldown: 30000,
        radius: 250,
        description: 'Shakes the earth violently',
        effects: {
          damage: 100,
          buildingDamage: 200,
          terrainChange: true,
          duration: 3000
        },
        particleColor: '#8B4513',
        sound: 'earthquake'
      },
      
      divineInspiration: {
        name: 'Divine Inspiration',
        gesture: 'star',
        cost: 75,
        cooldown: 45000,
        radius: 'target', // Single target
        description: 'Instantly completes construction or research',
        effects: {
          instantComplete: true,
          experienceBonus: 1000,
          inspireDuration: 60000
        },
        particleColor: '#FF69B4',
        sound: 'inspire'
      },
      
      meteorStrike: {
        name: 'Meteor Strike',
        gesture: 'spiral',
        cost: 100,
        cooldown: 60000,
        radius: 200,
        description: 'Calls down a devastating meteor',
        effects: {
          damage: 300,
          burnDuration: 10000,
          createCrater: true,
          shockwaveRadius: 300
        },
        particleColor: '#FF4500',
        sound: 'meteor'
      },
      
      resurrection: {
        name: 'Resurrection',
        gesture: 'infinity',
        cost: 90,
        cooldown: 120000,
        radius: 150,
        description: 'Brings the dead back to life',
        effects: {
          reviveCount: 10,
          healthPercent: 0.5,
          immunityDuration: 5000
        },
        particleColor: '#FFFFFF',
        sound: 'resurrect'
      }
    }

    // Active miracles tracking
    this.activeMiracles = new Map() // miracleId -> miracle instance
    this.cooldowns = new Map() // playerId -> { miracleName -> endTime }
    
    // Gesture state
    this.currentGesture = null
    this.gestureStartPos = null
    
    // Visual feedback
    this.previewActive = false
    this.previewMiracle = null
    this.previewLocation = null
  }

  /**
   * Start casting a miracle
   */
  startCasting(player, x, y) {
    this.currentGesture = []
    this.gestureStartPos = { x, y }
    this.previewActive = false
  }

  /**
   * Update gesture while casting
   */
  updateCasting(x, y) {
    if (!this.gestureStartPos) return
    
    this.currentGesture.push({ x, y })
    
    // Try to recognize gesture for preview
    if (this.currentGesture.length > 10) {
      // This would integrate with gesture recognizer
      // For now, we'll skip preview during gesture drawing
      this.previewLocation = { x, y }
    }
  }

  /**
   * Complete casting and execute miracle
   */
  completeCasting(player, gestureResult) {
    if (!gestureResult) {
      this.cancelCasting()
      return { success: false, reason: 'No gesture recognized' }
    }

    // Find miracle by gesture
    const miracle = this.findMiracleByGesture(gestureResult.name)
    if (!miracle) {
      this.cancelCasting()
      return { success: false, reason: 'Unknown miracle gesture' }
    }

    // Check if player can cast
    const canCast = this.canCastMiracle(player, miracle)
    if (!canCast.allowed) {
      this.cancelCasting()
      return { success: false, reason: canCast.reason }
    }

    // Get casting location (end of gesture or center)
    const location = this.previewLocation || this.gestureStartPos

    // Execute miracle
    const result = this.castMiracle(player, miracle, location)
    
    this.cancelCasting()
    return result
  }

  /**
   * Cancel current casting
   */
  cancelCasting() {
    this.currentGesture = null
    this.gestureStartPos = null
    this.previewActive = false
    this.previewMiracle = null
    this.previewLocation = null
  }

  /**
   * Find miracle by gesture name
   */
  findMiracleByGesture(gestureName) {
    for (const [name, miracle] of Object.entries(this.MIRACLES)) {
      if (miracle.gesture === gestureName) {
        return { name, ...miracle }
      }
    }
    return null
  }

  /**
   * Check if player can cast miracle
   */
  canCastMiracle(player, miracle) {
    // Check belief points
    if (player.beliefPoints < miracle.cost) {
      return { allowed: false, reason: 'Insufficient belief points' }
    }

    // Check cooldown
    const cooldowns = this.cooldowns.get(player.id) || {}
    const cooldownEnd = cooldowns[miracle.name]
    if (cooldownEnd && Date.now() < cooldownEnd) {
      const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000)
      return { allowed: false, reason: `Cooldown: ${remaining}s remaining` }
    }

    // Check if area is valid (not enemy territory for some miracles)
    if (miracle.requiresFriendlyTerritory && !this.isInFriendlyTerritory(player, location)) {
      return { allowed: false, reason: 'Must cast in your territory' }
    }

    return { allowed: true }
  }

  /**
   * Cast a miracle
   */
  castMiracle(player, miracle, location) {
    // Deduct cost
    player.beliefPoints -= miracle.cost

    // Set cooldown
    if (!this.cooldowns.has(player.id)) {
      this.cooldowns.set(player.id, {})
    }
    this.cooldowns.get(player.id)[miracle.name] = Date.now() + miracle.cooldown

    // Create miracle instance
    const miracleInstance = {
      id: `miracle_${Date.now()}_${Math.random()}`,
      name: miracle.name,
      caster: player.id,
      location,
      startTime: Date.now(),
      effects: { ...miracle.effects },
      radius: miracle.radius,
      particleColor: miracle.particleColor,
      active: true
    }

    // Apply immediate effects
    this.applyMiracleEffects(miracleInstance, player)

    // Store if has duration
    if (miracle.effects.duration) {
      this.activeMiracles.set(miracleInstance.id, miracleInstance)
    }

    // Trigger visual effects
    this.createVisualEffects(miracleInstance)

    // Update alignment based on miracle type
    this.updateAlignment(player, miracle)

    return { 
      success: true, 
      miracle: miracleInstance,
      message: `Cast ${miracle.name}!`
    }
  }

  /**
   * Apply miracle effects
   */
  applyMiracleEffects(miracle, player) {
    const effects = miracle.effects

    switch (miracle.name) {
      case 'Healing Rain':
        // Will be handled in update loop
        break

      case 'Divine Light':
        this.applyAreaEffect(miracle.location, miracle.radius, entity => {
          if (entity.type === 'villager') {
            entity.happiness = Math.min(100, entity.happiness + effects.happiness)
            entity.divineInspiration = {
              productivity: effects.productivity,
              endTime: Date.now() + effects.duration
            }
          }
        })
        break

      case 'Fertile Ground':
        this.modifyTerrain(miracle.location, miracle.radius, tile => {
          tile.fertility = Math.min(1.0, tile.fertility * effects.fertility)
          tile.fertileBlessing = true
        })
        break

      case 'Forest Growth':
        this.spawnForest(miracle.location, miracle.radius, effects.treeCount)
        break

      case 'Water Creation':
        this.createWater(miracle.location, effects.waterType)
        break

      case 'Lightning Strike':
        this.castLightning(miracle.location, effects, player)
        break

      case 'Shield of Faith':
        // Creates a persistent shield effect
        miracle.shieldBounds = this.getDrawnBounds(miracle.location)
        break

      case 'Earthquake':
        this.startEarthquake(miracle)
        break

      case 'Divine Inspiration':
        const target = this.getTargetBuilding(miracle.location)
        if (target) {
          if (target.isUnderConstruction) {
            target.isUnderConstruction = false
            target.constructionTime = target.maxConstructionTime
          }
          if (target.research) {
            target.research.progress = target.research.required
          }
        }
        break

      case 'Meteor Strike':
        this.summonMeteor(miracle)
        break

      case 'Resurrection':
        this.resurrectDead(miracle.location, miracle.radius, effects.reviveCount)
        break
    }
  }

  /**
   * Update active miracles
   */
  updateMiracles(deltaTime, gameState) {
    const completed = []

    this.activeMiracles.forEach((miracle, id) => {
      const elapsed = Date.now() - miracle.startTime

      // Check if miracle has expired
      if (miracle.effects.duration && elapsed > miracle.effects.duration) {
        completed.push(id)
        return
      }

      // Update ongoing effects
      switch (miracle.name) {
        case 'Healing Rain':
          if (elapsed % miracle.effects.tickRate < deltaTime) {
            this.applyAreaEffect(miracle.location, miracle.radius, entity => {
              if (entity.type === 'villager' && entity.health < 100) {
                entity.health = Math.min(100, entity.health + miracle.effects.healing / 10)
              }
            })
          }
          break

        case 'Shield of Faith':
          // Check for incoming damage and reduce it
          this.maintainShield(miracle)
          break

        case 'Earthquake':
          // Apply shake effects
          this.updateEarthquake(miracle, deltaTime)
          break
      }
    })

    // Remove completed miracles
    completed.forEach(id => this.activeMiracles.delete(id))
  }

  /**
   * Create visual effects for miracle
   */
  createVisualEffects(miracle) {
    const effects = []

    switch (miracle.name) {
      case 'Healing Rain':
        effects.push({
          type: 'rain',
          location: miracle.location,
          radius: miracle.radius,
          color: miracle.particleColor,
          duration: miracle.effects.duration
        })
        break

      case 'Divine Light':
        effects.push({
          type: 'beam',
          location: miracle.location,
          radius: miracle.radius,
          color: miracle.particleColor,
          duration: 1000
        })
        break

      case 'Lightning Strike':
        effects.push({
          type: 'lightning',
          start: { x: miracle.location.x, y: miracle.location.y - 500 },
          end: miracle.location,
          color: miracle.particleColor,
          branches: 5
        })
        break

      case 'Meteor Strike':
        effects.push({
          type: 'meteor',
          start: { x: miracle.location.x - 200, y: miracle.location.y - 400 },
          end: miracle.location,
          size: 30,
          trail: true,
          impact: true
        })
        break
    }

    return effects
  }

  /**
   * Update player alignment based on miracle
   */
  updateAlignment(player, miracle) {
    const alignmentShifts = {
      'Healing Rain': 5,      // Good
      'Divine Light': 3,      // Good
      'Fertile Ground': 3,    // Good
      'Forest Growth': 2,     // Good
      'Shield of Faith': 4,   // Good
      'Resurrection': 10,     // Very Good
      'Lightning Strike': -3, // Evil
      'Earthquake': -5,       // Evil
      'Meteor Strike': -8     // Very Evil
    }

    const shift = alignmentShifts[miracle.name] || 0
    if (shift !== 0) {
      player.alignment = Math.max(-100, Math.min(100, player.alignment + shift))
    }
  }

  /**
   * Helper methods
   */
  applyAreaEffect(center, radius, effectFn) {
    // This would integrate with the entity system
    // For now, return affected count
    let affected = 0
    // gameState.entities.forEach(entity => {
    //   const dist = Math.sqrt(Math.pow(entity.x - center.x, 2) + Math.pow(entity.y - center.y, 2))
    //   if (dist <= radius) {
    //     effectFn(entity)
    //     affected++
    //   }
    // })
    return affected
  }

  modifyTerrain(center, radius, modifyFn) {
    // Integrate with terrain system
    // terrainSystem.modifyArea(center, radius, modifyFn)
  }

  spawnForest(center, radius, count) {
    // Integrate with resource system
    // resourceSystem.spawnTrees(center, radius, count)
  }

  createWater(location, type) {
    // Integrate with terrain system
    // terrainSystem.createWaterBody(location, type)
  }

  castLightning(target, effects, player) {
    // Apply damage and chain to nearby enemies
    // combatSystem.lightningStrike(target, effects)
  }

  startEarthquake(miracle) {
    // Integrate with terrain and building systems
    // terrainSystem.startEarthquake(miracle)
  }

  summonMeteor(miracle) {
    // Create meteor entity
    // entitySystem.createMeteor(miracle)
  }

  resurrectDead(center, radius, maxCount) {
    // Find and revive dead villagers
    // villagerSystem.resurrectInArea(center, radius, maxCount)
  }

  /**
   * Get miracle preview info
   */
  getMiraclePreview() {
    if (!this.previewActive || !this.previewMiracle) {
      return null
    }

    return {
      name: this.previewMiracle.name,
      description: this.previewMiracle.description,
      cost: this.previewMiracle.cost,
      radius: this.previewMiracle.radius,
      location: this.previewLocation,
      color: this.previewMiracle.particleColor
    }
  }

  /**
   * Get active miracles for rendering
   */
  getActiveMiracles() {
    return Array.from(this.activeMiracles.values())
  }

  /**
   * Get cooldown info for UI
   */
  getCooldowns(playerId) {
    const cooldowns = this.cooldowns.get(playerId) || {}
    const result = {}

    for (const [miracleName, endTime] of Object.entries(cooldowns)) {
      const remaining = Math.max(0, endTime - Date.now())
      if (remaining > 0) {
        // Find the miracle definition by its name property
        let miracleDef = null
        for (const [key, miracle] of Object.entries(this.MIRACLES)) {
          if (miracle.name === miracleName) {
            miracleDef = miracle
            break
          }
        }
        
        if (miracleDef) {
          result[miracleName] = {
            remaining: Math.ceil(remaining / 1000),
            progress: 1 - (remaining / miracleDef.cooldown)
          }
        }
      }
    }

    return result
  }
}

// Export singleton
export const miracleSystem = new MiracleSystem()