/**
 * Villager Needs System - Inspired by Black & White
 * Manages hunger, rest, faith, and social needs for each villager
 */

export class VillagerNeedsSystem {
  constructor() {
    // Need thresholds
    this.NEEDS = {
      HUNGER: {
        max: 100,
        decayRate: 0.5, // per second
        critical: 20,
        satisfied: 80,
        deathThreshold: 0
      },
      REST: {
        max: 100,
        decayRate: 0.3, // per second
        critical: 15,
        satisfied: 85,
        collapseThreshold: 0
      },
      FAITH: {
        max: 100,
        decayRate: 0.1, // per second
        critical: 10,
        satisfied: 70,
        conversionThreshold: 5
      },
      SOCIAL: {
        max: 100,
        decayRate: 0.2, // per second
        critical: 25,
        satisfied: 60,
        depressionThreshold: 10
      }
    }

    // Need satisfaction sources
    this.SATISFACTION_SOURCES = {
      HUNGER: ['berryBush', 'farm', 'storage', 'feast'],
      REST: ['house', 'bed', 'tavern'],
      FAITH: ['temple', 'shrine', 'miracle', 'blessing'],
      SOCIAL: ['tavern', 'market', 'festival', 'nearbyVillagers']
    }

    // Mood effects based on needs
    this.MOOD_MODIFIERS = {
      allSatisfied: { happiness: 10, productivity: 1.2 },
      hungry: { happiness: -20, productivity: 0.5 },
      tired: { happiness: -15, productivity: 0.3 },
      faithless: { happiness: -10, productivity: 0.8 },
      lonely: { happiness: -25, productivity: 0.6 }
    }
  }

  /**
   * Initialize needs for a new villager
   */
  initializeVillagerNeeds(villager) {
    villager.needs = {
      hunger: this.randomizeStartingNeed(this.NEEDS.HUNGER),
      rest: this.randomizeStartingNeed(this.NEEDS.REST),
      faith: this.randomizeStartingNeed(this.NEEDS.FAITH),
      social: this.randomizeStartingNeed(this.NEEDS.SOCIAL)
    }

    villager.needPriority = null // Current priority need
    villager.seeking = null // What they're looking for
    villager.moodModifier = 1.0
  }

  randomizeStartingNeed(needConfig) {
    return needConfig.satisfied + (Math.random() * 20 - 10)
  }

  /**
   * Update all needs for a villager
   */
  updateVillagerNeeds(villager, deltaTime, environment) {
    // Decay needs over time
    this.decayNeeds(villager, deltaTime)
    
    // Check for need satisfaction opportunities
    this.checkNeedSatisfaction(villager, environment)
    
    // Determine priority need
    this.updateNeedPriority(villager)
    
    // Apply mood effects
    this.updateMoodFromNeeds(villager)
    
    // Check critical conditions
    this.checkCriticalConditions(villager)
  }

  decayNeeds(villager, deltaTime) {
    const decayMultiplier = deltaTime / 1000 // Convert to seconds

    // Hunger decays faster when working
    const hungerDecay = villager.state === 'working' ? 1.5 : 1.0
    villager.needs.hunger = Math.max(0, 
      villager.needs.hunger - (this.NEEDS.HUNGER.decayRate * decayMultiplier * hungerDecay))

    // Rest decays faster when running or working
    const restDecay = villager.state === 'fleeing' ? 2.0 : 
                     villager.state === 'working' ? 1.3 : 1.0
    villager.needs.rest = Math.max(0,
      villager.needs.rest - (this.NEEDS.REST.decayRate * decayMultiplier * restDecay))

    // Faith decays slower when near temple
    const faithDecay = villager.nearTemple ? 0.5 : 1.0
    villager.needs.faith = Math.max(0,
      villager.needs.faith - (this.NEEDS.FAITH.decayRate * decayMultiplier * faithDecay))

    // Social decays slower when near other villagers
    const socialDecay = villager.nearbyVillagers > 0 ? 0.3 : 1.0
    villager.needs.social = Math.max(0,
      villager.needs.social - (this.NEEDS.SOCIAL.decayRate * decayMultiplier * socialDecay))
  }

  checkNeedSatisfaction(villager, environment) {
    // Check if villager is at a satisfaction source
    if (villager.state === 'seeking' && villager.target) {
      const distance = Math.sqrt(
        Math.pow(villager.x - villager.target.x, 2) +
        Math.pow(villager.y - villager.target.y, 2)
      )

      if (distance < 50) { // Close enough to interact
        this.satisfyNeedAtSource(villager, villager.target)
      }
    }

    // Passive satisfaction from environment
    this.checkPassiveSatisfaction(villager, environment)
  }

  satisfyNeedAtSource(villager, source) {
    const satisfactionRate = 2.0 // per frame

    switch (source.type) {
      case 'berryBush':
      case 'farm':
      case 'storage':
        villager.needs.hunger = Math.min(this.NEEDS.HUNGER.max,
          villager.needs.hunger + satisfactionRate)
        if (villager.needs.hunger >= this.NEEDS.HUNGER.satisfied) {
          villager.state = 'idle'
          villager.seeking = null
        }
        break

      case 'house':
        villager.needs.rest = Math.min(this.NEEDS.REST.max,
          villager.needs.rest + satisfactionRate * 0.5)
        if (villager.needs.rest >= this.NEEDS.REST.satisfied) {
          villager.state = 'idle'
          villager.seeking = null
        }
        break

      case 'temple':
        villager.needs.faith = Math.min(this.NEEDS.FAITH.max,
          villager.needs.faith + satisfactionRate * 0.3)
        // Also slightly restore social need at temple
        villager.needs.social = Math.min(this.NEEDS.SOCIAL.max,
          villager.needs.social + satisfactionRate * 0.1)
        break

      case 'tavern':
        // Taverns satisfy social need primarily, rest secondarily
        villager.needs.social = Math.min(this.NEEDS.SOCIAL.max,
          villager.needs.social + satisfactionRate)
        villager.needs.rest = Math.min(this.NEEDS.REST.max,
          villager.needs.rest + satisfactionRate * 0.3)
        break
    }
  }

  checkPassiveSatisfaction(villager, environment) {
    // Social need satisfied by proximity to other villagers
    if (environment.nearbyVillagers && environment.nearbyVillagers.length > 0) {
      villager.needs.social = Math.min(this.NEEDS.SOCIAL.max,
        villager.needs.social + 0.1 * environment.nearbyVillagers.length)
    }

    // Faith increased during festivals or miracles
    if (environment.activeMiracle || environment.festival) {
      villager.needs.faith = Math.min(this.NEEDS.FAITH.max,
        villager.needs.faith + 1.0)
    }
  }

  updateNeedPriority(villager) {
    let lowestNeed = null
    let lowestValue = 100

    // Find the most critical need
    for (const [need, value] of Object.entries(villager.needs)) {
      const config = this.NEEDS[need.toUpperCase()]
      
      // Prioritize based on criticality
      const adjustedValue = value + (config.critical - value) * 0.5
      
      if (adjustedValue < lowestValue) {
        lowestValue = adjustedValue
        lowestNeed = need
      }
    }

    // Only change priority if significantly different
    if (lowestValue < 40 && lowestNeed !== villager.needPriority) {
      villager.needPriority = lowestNeed
      villager.seeking = this.SATISFACTION_SOURCES[lowestNeed.toUpperCase()][0]
      villager.state = 'seeking'
    }
  }

  updateMoodFromNeeds(villager) {
    let happinessModifier = 0
    let productivityModifier = 1.0

    // Check each need
    const allSatisfied = Object.entries(villager.needs).every(([need, value]) => {
      const config = this.NEEDS[need.toUpperCase()]
      return value >= config.satisfied
    })

    if (allSatisfied) {
      happinessModifier += this.MOOD_MODIFIERS.allSatisfied.happiness
      productivityModifier *= this.MOOD_MODIFIERS.allSatisfied.productivity
    } else {
      // Apply penalties for low needs
      if (villager.needs.hunger < this.NEEDS.HUNGER.critical) {
        happinessModifier += this.MOOD_MODIFIERS.hungry.happiness
        productivityModifier *= this.MOOD_MODIFIERS.hungry.productivity
      }
      if (villager.needs.rest < this.NEEDS.REST.critical) {
        happinessModifier += this.MOOD_MODIFIERS.tired.happiness
        productivityModifier *= this.MOOD_MODIFIERS.tired.productivity
      }
      if (villager.needs.faith < this.NEEDS.FAITH.critical) {
        happinessModifier += this.MOOD_MODIFIERS.faithless.happiness
        productivityModifier *= this.MOOD_MODIFIERS.faithless.productivity
      }
      if (villager.needs.social < this.NEEDS.SOCIAL.critical) {
        happinessModifier += this.MOOD_MODIFIERS.lonely.happiness
        productivityModifier *= this.MOOD_MODIFIERS.lonely.productivity
      }
    }

    // Apply mood changes
    villager.happiness = Math.max(0, Math.min(100, 
      villager.happiness + happinessModifier * 0.1))
    villager.moodModifier = productivityModifier
  }

  checkCriticalConditions(villager) {
    // Death from starvation
    if (villager.needs.hunger <= this.NEEDS.HUNGER.deathThreshold) {
      villager.health -= 1
      if (villager.health <= 0) {
        villager.deathCause = 'starvation'
        villager.isDead = true
      }
    }

    // Collapse from exhaustion
    if (villager.needs.rest <= this.NEEDS.REST.collapseThreshold) {
      villager.state = 'collapsed'
      villager.immobilized = true
      villager.collapseTimer = 300 // 5 seconds
    }

    // Vulnerable to conversion when faith is low
    if (villager.needs.faith <= this.NEEDS.FAITH.conversionThreshold) {
      villager.conversionResistance = 0.2 // 80% easier to convert
    } else {
      villager.conversionResistance = 1.0
    }

    // Depression from loneliness
    if (villager.needs.social <= this.NEEDS.SOCIAL.depressionThreshold) {
      villager.depressed = true
      villager.workSpeed *= 0.5
    } else {
      villager.depressed = false
    }
  }

  /**
   * Get need status for UI display
   */
  getVillagerNeedStatus(villager) {
    return {
      hunger: {
        value: villager.needs.hunger,
        status: this.getNeedStatus(villager.needs.hunger, this.NEEDS.HUNGER),
        seeking: villager.seeking === 'food'
      },
      rest: {
        value: villager.needs.rest,
        status: this.getNeedStatus(villager.needs.rest, this.NEEDS.REST),
        seeking: villager.seeking === 'house'
      },
      faith: {
        value: villager.needs.faith,
        status: this.getNeedStatus(villager.needs.faith, this.NEEDS.FAITH),
        seeking: villager.seeking === 'temple'
      },
      social: {
        value: villager.needs.social,
        status: this.getNeedStatus(villager.needs.social, this.NEEDS.SOCIAL),
        seeking: villager.seeking === 'tavern'
      }
    }
  }

  getNeedStatus(value, config) {
    if (value >= config.satisfied) return 'satisfied'
    if (value <= config.critical) return 'critical'
    return 'normal'
  }
}

// Export singleton
export const villagerNeedsSystem = new VillagerNeedsSystem()