/**
 * Day/Night Cycle System
 * Affects villager behavior, visibility, and atmosphere
 */

export class DayNightSystem {
  constructor() {
    // Time configuration
    this.TIME_CONFIG = {
      dayDuration: 600, // 10 minutes real time for full cycle
      startTime: 6, // 6 AM
      timeScale: 0.04 // Game hours per real second
    }

    // Time periods
    this.TIME_PERIODS = {
      DAWN: { start: 5, end: 7, light: 0.4, color: '#FFA500' },
      MORNING: { start: 7, end: 12, light: 0.9, color: '#FFFFCC' },
      AFTERNOON: { start: 12, end: 17, light: 1.0, color: '#FFFFFF' },
      DUSK: { start: 17, end: 19, light: 0.5, color: '#FF6B35' },
      NIGHT: { start: 19, end: 5, light: 0.2, color: '#191970' }
    }

    // Current time state
    this.currentTime = this.TIME_CONFIG.startTime
    this.currentPeriod = 'MORNING'
    this.dayCount = 1

    // Activity schedules by time
    this.ACTIVITY_SCHEDULE = {
      DAWN: {
        villager: ['waking', 'praying', 'preparing'],
        priority: 'faith'
      },
      MORNING: {
        villager: ['working', 'gathering', 'building'],
        priority: 'work'
      },
      AFTERNOON: {
        villager: ['working', 'trading', 'socializing'],
        priority: 'work'
      },
      DUSK: {
        villager: ['returning', 'eating', 'socializing'],
        priority: 'social'
      },
      NIGHT: {
        villager: ['sleeping', 'guarding', 'praying'],
        priority: 'rest'
      }
    }

    // Night-time modifiers
    this.NIGHT_MODIFIERS = {
      visibility: 0.3,
      workSpeed: 0.5,
      moveSpeed: 0.8,
      dangerLevel: 1.5,
      faithGeneration: 1.3 // Prayers more effective at night
    }
  }

  /**
   * Update time progression
   */
  updateTime(deltaTime) {
    // Advance time
    this.currentTime += this.TIME_CONFIG.timeScale * (deltaTime / 1000)
    
    // Wrap around at 24 hours
    if (this.currentTime >= 24) {
      this.currentTime -= 24
      this.dayCount++
      this.onNewDay()
    }

    // Update current period
    const oldPeriod = this.currentPeriod
    this.currentPeriod = this.getCurrentPeriod()
    
    if (oldPeriod !== this.currentPeriod) {
      this.onPeriodChange(oldPeriod, this.currentPeriod)
    }
  }

  getCurrentPeriod() {
    for (const [period, config] of Object.entries(this.TIME_PERIODS)) {
      if (config.start <= config.end) {
        // Normal period (doesn't cross midnight)
        if (this.currentTime >= config.start && this.currentTime < config.end) {
          return period
        }
      } else {
        // Period crosses midnight (like NIGHT)
        if (this.currentTime >= config.start || this.currentTime < config.end) {
          return period
        }
      }
    }
    return 'MORNING' // Default
  }

  onNewDay() {
    // Reset daily cycles
    console.log(`Day ${this.dayCount} begins`)
    
    // Trigger daily events
    this.triggerDailyEvents()
  }

  onPeriodChange(oldPeriod, newPeriod) {
    console.log(`Time period changed from ${oldPeriod} to ${newPeriod}`)
    
    // Trigger period-specific events
    this.triggerPeriodEvents(newPeriod)
  }

  triggerDailyEvents() {
    // Daily resource regeneration
    // Market prices reset
    // Quest updates
    return {
      type: 'NEW_DAY',
      day: this.dayCount,
      events: ['resource_regen', 'market_reset', 'quest_update']
    }
  }

  triggerPeriodEvents(period) {
    const events = []
    
    switch (period) {
      case 'DAWN':
        events.push('villagers_wake', 'morning_prayers', 'rooster_crow')
        break
      case 'DUSK':
        events.push('villagers_return', 'evening_meal', 'torch_lighting')
        break
      case 'NIGHT':
        events.push('villagers_sleep', 'guards_patrol', 'nocturnal_creatures')
        break
    }

    return { type: 'PERIOD_CHANGE', period, events }
  }

  /**
   * Get lighting conditions for rendering
   */
  getLightingConditions() {
    const period = this.TIME_PERIODS[this.currentPeriod]
    const baseLight = period.light

    // Smooth transitions between periods
    const transitionLight = this.calculateTransitionLight()
    
    return {
      ambient: baseLight * transitionLight,
      color: period.color,
      shadows: this.currentPeriod === 'NIGHT' || this.currentPeriod === 'DUSK',
      torchesNeeded: baseLight < 0.5
    }
  }

  calculateTransitionLight() {
    // Find how far we are into the current period
    const period = this.TIME_PERIODS[this.currentPeriod]
    let periodProgress

    if (period.start <= period.end) {
      periodProgress = (this.currentTime - period.start) / (period.end - period.start)
    } else {
      // Handle periods that cross midnight
      if (this.currentTime >= period.start) {
        periodProgress = (this.currentTime - period.start) / (24 - period.start + period.end)
      } else {
        periodProgress = (24 - period.start + this.currentTime) / (24 - period.start + period.end)
      }
    }

    // Smooth curve for transitions
    return 0.5 + 0.5 * Math.sin((periodProgress - 0.5) * Math.PI)
  }

  /**
   * Determine villager behavior based on time
   */
  getVillagerSchedule(villager) {
    const schedule = this.ACTIVITY_SCHEDULE[this.currentPeriod]
    const isNight = this.currentPeriod === 'NIGHT'

    // Special cases
    if (villager.profession === 'SOLDIER' && isNight) {
      return { activity: 'guarding', location: 'patrol' }
    }

    if (villager.profession === 'PRIEST' && this.currentPeriod === 'DAWN') {
      return { activity: 'praying', location: 'temple' }
    }

    // Night time behavior
    if (isNight) {
      if (villager.traits?.nightOwl) {
        return { activity: 'working', location: 'workshop' }
      }
      return { activity: 'sleeping', location: 'home' }
    }

    // Default schedule
    return {
      activity: schedule.villager[0],
      location: this.getActivityLocation(schedule.villager[0])
    }
  }

  getActivityLocation(activity) {
    const locations = {
      working: 'workplace',
      gathering: 'resource',
      building: 'construction',
      sleeping: 'home',
      eating: 'home',
      praying: 'temple',
      socializing: 'tavern',
      guarding: 'walls'
    }
    return locations[activity] || 'town_center'
  }

  /**
   * Apply time-based modifiers to activities
   */
  getActivityModifiers(activity) {
    const modifiers = { efficiency: 1.0, safety: 1.0 }
    
    if (this.currentPeriod === 'NIGHT') {
      // Night penalties
      if (['working', 'gathering', 'building'].includes(activity)) {
        modifiers.efficiency *= this.NIGHT_MODIFIERS.workSpeed
      }
      modifiers.safety *= this.NIGHT_MODIFIERS.dangerLevel
      
      // Night bonuses
      if (activity === 'praying') {
        modifiers.efficiency *= this.NIGHT_MODIFIERS.faithGeneration
      }
    } else if (this.currentPeriod === 'AFTERNOON') {
      // Peak efficiency
      modifiers.efficiency *= 1.1
    } else if (this.currentPeriod === 'DAWN' || this.currentPeriod === 'DUSK') {
      // Transition periods
      modifiers.efficiency *= 0.9
    }

    return modifiers
  }

  /**
   * Render day/night overlay
   */
  renderDayNightOverlay(ctx, camera, canvasWidth, canvasHeight) {
    const lighting = this.getLightingConditions()
    
    if (lighting.ambient < 1.0) {
      ctx.save()
      
      // Reset transform for screen overlay
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      
      // Dark overlay
      const darkness = 1.0 - lighting.ambient
      ctx.fillStyle = `rgba(0, 0, 20, ${darkness * 0.8})`
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)
      
      // Add color tint
      ctx.fillStyle = lighting.color
      ctx.globalAlpha = 0.1
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)
      
      ctx.restore()
    }

    // Render torches/lights if needed
    if (lighting.torchesNeeded) {
      this.renderLightSources(ctx, camera)
    }
  }

  renderLightSources(ctx, camera) {
    // This would render light circles around torches, fires, etc.
    // For now, just return the concept
    return {
      torches: [],
      campfires: [],
      windowLights: []
    }
  }

  /**
   * Create atmospheric effects based on time
   */
  getAtmosphericEffects() {
    const effects = []

    switch (this.currentPeriod) {
      case 'DAWN':
        effects.push({
          type: 'fog',
          density: 0.3,
          color: '#FFFFFF'
        })
        effects.push({
          type: 'birds',
          count: 5,
          behavior: 'waking'
        })
        break
        
      case 'NIGHT':
        effects.push({
          type: 'fireflies',
          count: 10,
          glow: true
        })
        effects.push({
          type: 'stars',
          brightness: 0.8
        })
        if (Math.random() < 0.3) {
          effects.push({
            type: 'owl',
            sound: 'hoot'
          })
        }
        break
        
      case 'DUSK':
        effects.push({
          type: 'bats',
          count: 3,
          behavior: 'emerging'
        })
        break
    }

    return effects
  }

  /**
   * Get time display for UI
   */
  getTimeDisplay() {
    const hours = Math.floor(this.currentTime)
    const minutes = Math.floor((this.currentTime % 1) * 60)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours)
    
    return {
      time: `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`,
      period: this.currentPeriod,
      day: this.dayCount,
      lighting: this.getLightingConditions().ambient
    }
  }

  /**
   * Check if activity is appropriate for current time
   */
  isActivityAppropriate(activity, profession = null) {
    const schedule = this.ACTIVITY_SCHEDULE[this.currentPeriod]
    
    // Some professions have special schedules
    if (profession === 'SOLDIER' && this.currentPeriod === 'NIGHT') {
      return ['guarding', 'patrolling'].includes(activity)
    }
    
    if (profession === 'PRIEST') {
      return true // Priests can work any time
    }

    return schedule.villager.includes(activity)
  }
}

// Export singleton
export const dayNightSystem = new DayNightSystem()