/**
 * Sleep System - Manages villager sleep based on darkness/day-night cycle
 * Villagers automatically sleep at night and wake at dawn
 */

export class SleepSystem {
  constructor(worldClock) {
    this.clock = worldClock

    // Sleep configuration
    this.config = {
      sleepRestoreRate: 15, // Rest points per second while sleeping
      sleepDeprivationRate: 0.3, // Hours per second of game time without sleep
      fatigueThreshold: 40, // Below this rest level, seek sleep urgently
      wakeUpThreshold: 75, // Above this rest level, can wake up
      collapseThreshold: 24, // Hours without sleep before collapse
      outdoorSleepQuality: 0.8, // Multiplier for sleeping outdoors
      houseSleepQuality: 1.2, // Multiplier for sleeping in house
      innSleepQuality: 1.5, // Multiplier for sleeping in inn/tavern
      manorSleepQuality: 2.0 // Multiplier for luxury sleeping
    }
  }

  /**
   * Update sleep system for all villagers
   */
  update(villagers, deltaMs) {
    if (!villagers || villagers.length === 0) return

    const deltaSeconds = deltaMs / 1000
    const timeData = this.clock.getTimeData()

    villagers.forEach(villager => {
      // Initialize sleep tracking if needed
      if (!villager.hasOwnProperty('isSleeping')) {
        villager.isSleeping = false
        villager.hoursWithoutSleep = 0
        villager.totalSleepTime = 0
        villager.sleepSessions = []
      }

      // Handle sleeping villagers
      if (villager.isSleeping && villager.state === 'sleeping') {
        this.updateSleepingVillager(villager, deltaSeconds, timeData)
      }
      // Handle awake villagers
      else {
        this.updateAwakeVillager(villager, deltaSeconds, timeData)
      }

      // Check for automatic sleep triggers
      this.checkSleepTriggers(villager, timeData)
    })
  }

  /**
   * Update a villager who is sleeping
   */
  updateSleepingVillager(villager, deltaSeconds, timeData) {
    // Restore rest while sleeping
    const sleepQuality = this.getSleepQuality(villager.sleepingLocation)
    const restoreAmount = this.config.sleepRestoreRate * sleepQuality * deltaSeconds

    villager.needs.rest = Math.min(100, villager.needs.rest + restoreAmount)

    // Reset hours without sleep
    villager.hoursWithoutSleep = 0

    // Track sleep duration
    if (villager.sleepStartTime) {
      const sleepDuration = Date.now() - villager.sleepStartTime
      villager.currentSleepDuration = sleepDuration
    }

    // Check if should wake up
    if (this.shouldWakeUp(villager, timeData)) {
      this.wakeUp(villager)
    }
  }

  /**
   * Update a villager who is awake
   */
  updateAwakeVillager(villager, deltaSeconds, timeData) {
    // Track hours without sleep
    const hoursElapsed = deltaSeconds * this.clock.timeScale
    villager.hoursWithoutSleep = (villager.hoursWithoutSleep || 0) + hoursElapsed

    // Check for collapse from exhaustion
    if (villager.hoursWithoutSleep >= this.config.collapseThreshold) {
      this.collapseFromExhaustion(villager)
    }
  }

  /**
   * Check if villager should automatically go to sleep
   */
  checkSleepTriggers(villager, timeData) {
    // Don't interrupt sleeping, collapsed, or critical state villagers
    if (villager.isSleeping || villager.state === 'collapsed' || villager.state === 'fleeing') {
      return
    }

    // Automatic sleep at night if tired
    if (timeData.isSleepTime && villager.needs.rest < this.config.fatigueThreshold) {
      this.putToSleep(villager)
    }
  }

  /**
   * Check if villager should wake up
   */
  shouldWakeUp(villager, timeData) {
    // Wake up if well rested and it's dawn or later
    if (villager.needs.rest >= this.config.wakeUpThreshold && !timeData.isSleepTime) {
      return true
    }

    // Wake up if it's past dawn (7 AM) even if not fully rested
    if (timeData.hour >= 7 && villager.needs.rest >= 60) {
      return true
    }

    return false
  }

  /**
   * Put villager to sleep
   */
  putToSleep(villager, location = null) {
    villager.state = 'sleeping'
    villager.isSleeping = true
    villager.sleepStartTime = Date.now()
    villager.sleepingLocation = location
    villager.vx = 0 // Stop moving
    villager.vy = 0
  }

  /**
   * Wake up villager
   */
  wakeUp(villager) {
    const wasAsleep = villager.isSleeping

    villager.isSleeping = false
    villager.state = 'idle'

    // Track sleep session
    if (wasAsleep && villager.sleepStartTime) {
      const sleepDuration = Date.now() - villager.sleepStartTime
      villager.totalSleepTime = (villager.totalSleepTime || 0) + sleepDuration

      const sleepQuality = this.getSleepQuality(villager.sleepingLocation)
      villager.sleepSessions = villager.sleepSessions || []
      villager.sleepSessions.push({
        quality: sleepQuality,
        duration: sleepDuration / 1000 / 3600, // Hours
        endTime: Date.now()
      })

      // Keep only last 7 days of sleep sessions
      if (villager.sleepSessions.length > 7) {
        villager.sleepSessions = villager.sleepSessions.slice(-7)
      }
    }

    villager.sleepStartTime = null
    villager.sleepingLocation = null
    villager.currentSleepDuration = 0
  }

  /**
   * Collapse from exhaustion
   */
  collapseFromExhaustion(villager) {
    villager.state = 'collapsed'
    villager.isSleeping = false
    villager.vx = 0
    villager.vy = 0

    // Take health damage from exhaustion
    if (!villager.health) villager.health = 100
    villager.health = Math.max(0, villager.health - 20)

    // Emergency sleep after 5 seconds
    setTimeout(() => {
      if (villager.state === 'collapsed') {
        this.putToSleep(villager)
        villager.needs.rest = 10 // Still exhausted
      }
    }, 5000)
  }

  /**
   * Find suitable sleep location for villager
   */
  findSleepLocation(villager, buildings) {
    if (!buildings || buildings.length === 0) return null

    // Find houses owned by villager's player
    const playerHouses = buildings.filter(b =>
      (b.type === 'house' || b.type === 'tavern' || b.type === 'inn') &&
      b.playerId === villager.playerId &&
      b.residents < b.maxResidents
    )

    if (playerHouses.length === 0) return null

    // Find nearest available house
    let nearestHouse = null
    let minDistance = Infinity

    playerHouses.forEach(house => {
      const dx = house.x - villager.x
      const dy = house.y - villager.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < minDistance) {
        minDistance = distance
        nearestHouse = house
      }
    })

    return nearestHouse
  }

  /**
   * Get sleep quality multiplier based on location
   */
  getSleepQuality(location) {
    if (!location) {
      return this.config.outdoorSleepQuality
    }

    // Check for specializations
    if (location.specialization === 'inn') {
      return this.config.innSleepQuality
    }

    if (location.specialization === 'manor') {
      return this.config.manorSleepQuality
    }

    // Check building level
    if (location.type === 'house') {
      return this.config.houseSleepQuality * (location.level || 1) * 0.3 + 1.0
    }

    if (location.type === 'tavern' || location.type === 'inn') {
      return this.config.innSleepQuality
    }

    return 1.0
  }

  /**
   * Get average sleep quality for villager
   */
  getAverageSleepQuality(villager) {
    if (!villager.sleepSessions || villager.sleepSessions.length === 0) {
      return 1.0
    }

    const totalQuality = villager.sleepSessions.reduce((sum, session) => sum + session.quality, 0)
    return totalQuality / villager.sleepSessions.length
  }

  /**
   * Get total sleep hours for villager
   */
  getTotalSleepHours(villager) {
    if (!villager.totalSleepTime) return 0
    return villager.totalSleepTime / 1000 / 3600 // Convert ms to hours
  }

  /**
   * Check if villager is well rested
   */
  isWellRested(villager) {
    return villager.needs.rest >= this.config.wakeUpThreshold
  }

  /**
   * Check if villager is sleep deprived
   */
  isSleepDeprived(villager) {
    return (villager.hoursWithoutSleep || 0) >= 18
  }

  /**
   * Get sleep status for villager
   */
  getSleepStatus(villager) {
    if (villager.isSleeping) {
      return 'sleeping'
    }

    if (villager.state === 'collapsed') {
      return 'collapsed'
    }

    const hoursWithoutSleep = villager.hoursWithoutSleep || 0

    if (hoursWithoutSleep >= this.config.collapseThreshold) {
      return 'critical'
    }

    if (hoursWithoutSleep >= 18) {
      return 'exhausted'
    }

    if (villager.needs.rest < this.config.fatigueThreshold) {
      return 'tired'
    }

    if (villager.needs.rest >= this.config.wakeUpThreshold) {
      return 'rested'
    }

    return 'normal'
  }
}
