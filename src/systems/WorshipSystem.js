/**
 * Worship System - Prayers and divine bonuses
 * Inspired by Black & White's prayer power system
 */

export class WorshipSystem {
  constructor() {
    // Prayer types and their effects
    this.PRAYER_TYPES = {
      PROSPERITY: {
        name: 'Prayer of Prosperity',
        duration: 300, // 5 seconds
        chargeTime: 60, // 1 second to charge
        effects: {
          resourceBonus: 1.5,
          buildSpeed: 1.3,
          beliefGeneration: 2
        },
        particleColor: '#FFD700'
      },
      PROTECTION: {
        name: 'Prayer of Protection',
        duration: 600, // 10 seconds
        chargeTime: 90,
        effects: {
          damageReduction: 0.5,
          healingRate: 2,
          territoryDefense: 1.5
        },
        particleColor: '#87CEEB'
      },
      FERTILITY: {
        name: 'Prayer of Fertility',
        duration: 900, // 15 seconds
        chargeTime: 120,
        effects: {
          cropGrowth: 3,
          animalBreeding: 2,
          villagerBirthRate: 1.5
        },
        particleColor: '#90EE90'
      },
      WISDOM: {
        name: 'Prayer of Wisdom',
        duration: 450,
        chargeTime: 75,
        effects: {
          researchSpeed: 2,
          experienceGain: 1.5,
          conversionPower: 1.3
        },
        particleColor: '#9370DB'
      },
      WAR: {
        name: 'Prayer of War',
        duration: 240,
        chargeTime: 45,
        effects: {
          attackPower: 2,
          moveSpeed: 1.5,
          morale: 1.5
        },
        particleColor: '#DC143C'
      }
    }

    // Active prayers by player
    this.activePrayers = new Map() // playerId -> Set of active prayers
    
    // Prayer charge accumulation
    this.prayerCharges = new Map() // templeId -> charge amount
    
    // Worship activities that generate prayer power
    this.WORSHIP_ACTIVITIES = {
      individualPrayer: 0.5,
      groupPrayer: 2,
      sacrifice: 5,
      festival: 10,
      miracle: 3
    }
  }

  /**
   * Initialize worship system for a player
   */
  initializePlayerWorship(player) {
    this.activePrayers.set(player.id, new Set())
    player.prayerPower = 0
    player.worshipLevel = 1
    player.divineAlignment = 0 // -100 (evil) to 100 (good)
  }

  /**
   * Update worship system each frame
   */
  updateWorship(players, temples, deltaTime) {
    // Update prayer charges at temples
    this.updateTempleCharges(temples, deltaTime)
    
    // Update active prayers
    this.updateActivePrayers(players, deltaTime)
    
    // Generate prayer power from worshipping villagers
    this.generatePrayerPower(players, temples)
  }

  updateTempleCharges(temples, deltaTime) {
    temples.forEach(temple => {
      if (!temple.isUnderConstruction) {
        // Check for praying villagers
        const prayingVillagers = temple.assignedVillagers?.filter(v => 
          v.state === 'praying' || v.task === 'praying'
        ) || []

        if (prayingVillagers.length > 0) {
          const currentCharge = this.prayerCharges.get(temple.id) || 0
          const chargeRate = prayingVillagers.length * 0.5 * (deltaTime / 1000)
          
          this.prayerCharges.set(temple.id, Math.min(100, currentCharge + chargeRate))
          
          // Visual feedback for charging
          if (currentCharge > 20) {
            temple.glowing = true
            temple.glowIntensity = currentCharge / 100
          }
        }
      }
    })
  }

  updateActivePrayers(players, deltaTime) {
    players.forEach(player => {
      const prayers = this.activePrayers.get(player.id)
      if (!prayers) return

      prayers.forEach(prayer => {
        prayer.timeRemaining -= deltaTime / 1000
        
        if (prayer.timeRemaining <= 0) {
          // Prayer expired
          prayers.delete(prayer)
          this.onPrayerExpired(player, prayer)
        } else {
          // Apply ongoing effects
          this.applyPrayerEffects(player, prayer, deltaTime)
        }
      })
    })
  }

  generatePrayerPower(players, temples) {
    players.forEach(player => {
      let totalPower = 0
      
      // Power from temples
      player.buildings.filter(b => b.type === 'temple').forEach(temple => {
        const charge = this.prayerCharges.get(temple.id) || 0
        if (charge >= 100) {
          totalPower += 10 * player.worshipLevel
          // Reset charge after collection
          this.prayerCharges.set(temple.id, 0)
        }
      })

      // Power from worshipping villagers
      const worshippers = player.villagers.filter(v => 
        v.state === 'praying' || v.task === 'praying'
      )
      totalPower += worshippers.length * this.WORSHIP_ACTIVITIES.individualPrayer

      // Bonus for group prayers
      if (worshippers.length >= 5) {
        totalPower += this.WORSHIP_ACTIVITIES.groupPrayer
      }

      player.prayerPower = Math.min(999, player.prayerPower + totalPower)
    })
  }

  /**
   * Activate a prayer for a player
   */
  activatePrayer(player, prayerType, targetLocation = null) {
    const prayer = this.PRAYER_TYPES[prayerType]
    if (!prayer) return false

    // Check if player has enough prayer power
    const cost = prayer.chargeTime
    if (player.prayerPower < cost) return false

    // Check if prayer is already active
    const activePrayers = this.activePrayers.get(player.id)
    const existingPrayer = Array.from(activePrayers).find(p => p.type === prayerType)
    if (existingPrayer) return false

    // Deduct prayer power
    player.prayerPower -= cost

    // Create prayer instance
    const prayerInstance = {
      id: `prayer_${Date.now()}`,
      type: prayerType,
      ...prayer,
      timeRemaining: prayer.duration,
      targetLocation,
      caster: player.id
    }

    activePrayers.add(prayerInstance)
    
    // Trigger prayer activation effects
    this.onPrayerActivated(player, prayerInstance)
    
    return true
  }

  onPrayerActivated(player, prayer) {
    // Visual effects
    if (prayer.targetLocation) {
      // Area effect prayer
      this.createPrayerVisuals(prayer.targetLocation, prayer.particleColor, 'area')
    } else {
      // Global effect prayer
      player.buildings.filter(b => b.type === 'temple').forEach(temple => {
        this.createPrayerVisuals(
          { x: temple.x + temple.width/2, y: temple.y + temple.height/2 },
          prayer.particleColor,
          'burst'
        )
      })
    }

    // Alignment shift based on prayer type
    switch (prayer.type) {
      case 'PROTECTION':
      case 'FERTILITY':
        player.divineAlignment = Math.min(100, player.divineAlignment + 5)
        break
      case 'WAR':
        player.divineAlignment = Math.max(-100, player.divineAlignment - 5)
        break
    }

    // Notify villagers
    player.villagers.forEach(v => {
      if (v.needs?.faith < 80) {
        v.needs.faith = Math.min(100, v.needs.faith + 20)
      }
      v.inspired = true
      v.inspiredTimer = 180 // 3 seconds
    })
  }

  applyPrayerEffects(player, prayer, deltaTime) {
    const effects = prayer.effects

    // Apply effects based on prayer type
    if (effects.resourceBonus) {
      player.resourceGatherRate = effects.resourceBonus
    }
    
    if (effects.buildSpeed) {
      player.buildSpeedModifier = effects.buildSpeed
    }
    
    if (effects.beliefGeneration) {
      player.beliefPoints += effects.beliefGeneration * (deltaTime / 1000)
    }
    
    if (effects.healingRate) {
      player.villagers.forEach(v => {
        if (v.health < 100) {
          v.health = Math.min(100, v.health + effects.healingRate * (deltaTime / 1000))
        }
      })
    }
    
    if (effects.cropGrowth && prayer.targetLocation) {
      // Accelerate crop growth in area
      const radius = 200
      player.buildings.filter(b => b.type === 'farm').forEach(farm => {
        const dist = Math.sqrt(
          Math.pow(farm.x - prayer.targetLocation.x, 2) +
          Math.pow(farm.y - prayer.targetLocation.y, 2)
        )
        if (dist < radius) {
          farm.growthRate = effects.cropGrowth
        }
      })
    }
  }

  onPrayerExpired(player, prayer) {
    // Reset any modified values
    player.resourceGatherRate = 1
    player.buildSpeedModifier = 1
    
    // Remove visual effects
    player.buildings.forEach(building => {
      if (building.type === 'farm') {
        building.growthRate = 1
      }
    })
  }

  /**
   * Create visual effects for prayers
   */
  createPrayerVisuals(location, color, type) {
    // This would integrate with the visual effects system
    // For now, return effect description
    return {
      type: type === 'area' ? 'divine_circle' : 'divine_burst',
      x: location.x,
      y: location.y,
      color,
      radius: type === 'area' ? 150 : 50,
      duration: 2000,
      particleCount: type === 'area' ? 50 : 100
    }
  }

  /**
   * Get active prayers for UI display
   */
  getActivePrayers(player) {
    const prayers = this.activePrayers.get(player.id)
    if (!prayers) return []

    return Array.from(prayers).map(prayer => ({
      name: prayer.name,
      timeRemaining: Math.ceil(prayer.timeRemaining),
      progress: prayer.timeRemaining / prayer.duration,
      effects: prayer.effects,
      color: prayer.particleColor
    }))
  }

  /**
   * Start a group prayer at a temple
   */
  startGroupPrayer(temple, villagers) {
    if (villagers.length < 3) return false

    villagers.forEach(villager => {
      villager.state = 'praying'
      villager.task = 'praying'
      villager.target = {
        x: temple.x + temple.width / 2,
        y: temple.y + temple.height / 2
      }
    })

    // Bonus charge for group prayers
    const currentCharge = this.prayerCharges.get(temple.id) || 0
    this.prayerCharges.set(temple.id, Math.min(100, currentCharge + 20))

    return true
  }
}

// Export singleton
export const worshipSystem = new WorshipSystem()