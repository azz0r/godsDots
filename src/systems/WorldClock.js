/**
 * WorldClock - Centralized time management system
 * All game systems synchronize with this clock
 */

export class WorldClock {
  constructor(options = {}) {
    // Configuration
    this.timeScale = options.timeScale || 0.04 // Hours per real second (10 min full cycle)
    this.currentHour = options.startHour || 6
    this.currentMinute = options.startMinute || 0
    this.currentDay = 1
    this.isPaused = false

    // Time periods definition
    this.TIME_PERIODS = {
      DAWN: { start: 5, end: 7, name: 'DAWN' },
      MORNING: { start: 7, end: 12, name: 'MORNING' },
      AFTERNOON: { start: 12, end: 17, name: 'AFTERNOON' },
      DUSK: { start: 17, end: 19, name: 'DUSK' },
      NIGHT: { start: 19, end: 5, name: 'NIGHT' } // Wraps around midnight
    }

    // Subscribers
    this.subscribers = []
    this.periodChangeCallbacks = []
    this.previousPeriod = this.getCurrentPeriod()
  }

  /**
   * Update clock with delta time
   * @param {number} deltaMs - Milliseconds elapsed since last update
   */
  update(deltaMs) {
    if (this.isPaused) return

    const deltaSeconds = deltaMs / 1000
    const hoursToAdd = deltaSeconds * this.timeScale

    // Add time
    const totalMinutes = this.currentHour * 60 + this.currentMinute + hoursToAdd * 60

    // Handle day wraparound
    if (totalMinutes >= 24 * 60) {
      this.currentDay++
      this.currentHour = 0
      this.currentMinute = 0
    }

    this.currentHour = Math.floor(totalMinutes / 60) % 24
    this.currentMinute = totalMinutes % 60

    // Check for period change
    const currentPeriod = this.getCurrentPeriod()
    if (currentPeriod !== this.previousPeriod) {
      this.notifyPeriodChange(currentPeriod)
      this.previousPeriod = currentPeriod
    }

    // Notify subscribers
    this.notifySubscribers()
  }

  /**
   * Set time directly
   */
  setTime(hour, minute) {
    const previousPeriod = this.getCurrentPeriod()
    this.currentHour = hour
    this.currentMinute = minute

    const currentPeriod = this.getCurrentPeriod()
    if (currentPeriod !== previousPeriod) {
      this.notifyPeriodChange(currentPeriod)
      this.previousPeriod = currentPeriod
    }
  }

  /**
   * Get current time as total hours (fractional)
   */
  getCurrentTime() {
    return this.currentHour + this.currentMinute / 60
  }

  /**
   * Get current hour (0-23)
   */
  getCurrentHour() {
    return Math.floor(this.currentHour)
  }

  /**
   * Get current minute (0-59)
   */
  getCurrentMinute() {
    return Math.floor(this.currentMinute)
  }

  /**
   * Get current day
   */
  getCurrentDay() {
    return this.currentDay
  }

  /**
   * Get current period (DAWN, MORNING, AFTERNOON, DUSK, NIGHT)
   */
  getCurrentPeriod() {
    const hour = this.getCurrentHour()

    if (hour >= this.TIME_PERIODS.DAWN.start && hour < this.TIME_PERIODS.DAWN.end) {
      return 'DAWN'
    } else if (hour >= this.TIME_PERIODS.MORNING.start && hour < this.TIME_PERIODS.MORNING.end) {
      return 'MORNING'
    } else if (hour >= this.TIME_PERIODS.AFTERNOON.start && hour < this.TIME_PERIODS.AFTERNOON.end) {
      return 'AFTERNOON'
    } else if (hour >= this.TIME_PERIODS.DUSK.start && hour < this.TIME_PERIODS.DUSK.end) {
      return 'DUSK'
    } else {
      return 'NIGHT'
    }
  }

  /**
   * Get light level (0.0 to 1.0)
   */
  getLightLevel() {
    const time = this.getCurrentTime()
    const period = this.getCurrentPeriod()

    switch (period) {
      case 'DAWN':
        // Gradual increase from 0.2 to 0.9
        const dawnProgress = (time - 5) / 2 // 0 to 1 over 2 hours
        return 0.2 + dawnProgress * 0.7

      case 'MORNING':
        return 1.0

      case 'AFTERNOON':
        return 1.0

      case 'DUSK':
        // Gradual decrease from 0.9 to 0.3
        const duskProgress = (time - 17) / 2 // 0 to 1 over 2 hours
        return 0.9 - duskProgress * 0.6

      case 'NIGHT':
        return 0.2

      default:
        return 1.0
    }
  }

  /**
   * Check if it's currently dark (light level < 0.4)
   */
  isDark() {
    return this.getLightLevel() < 0.4
  }

  /**
   * Check if it's sleep time
   */
  isSleepTime() {
    return this.getCurrentPeriod() === 'NIGHT'
  }

  /**
   * Check if it's work time
   */
  isWorkTime() {
    const period = this.getCurrentPeriod()
    return period === 'MORNING' || period === 'AFTERNOON'
  }

  /**
   * Check if it's rest time
   */
  isRestTime() {
    return this.getCurrentPeriod() === 'DUSK'
  }

  /**
   * Pause time
   */
  pause() {
    this.isPaused = true
  }

  /**
   * Resume time
   */
  resume() {
    this.isPaused = false
  }

  /**
   * Set time scale multiplier
   */
  setTimeScale(scale) {
    this.timeScale = scale * 0.04 // Base scale is 0.04
  }

  /**
   * Subscribe to time updates
   * @param {Function} callback - Called on each update with time data
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.push(callback)

    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to period change events
   */
  onPeriodChange(callback) {
    this.periodChangeCallbacks.push(callback)
  }

  /**
   * Notify all subscribers of time update
   */
  notifySubscribers() {
    const timeData = {
      hour: this.getCurrentHour(),
      minute: this.getCurrentMinute(),
      day: this.getCurrentDay(),
      period: this.getCurrentPeriod(),
      lightLevel: this.getLightLevel()
    }

    this.subscribers.forEach(callback => callback(timeData))
  }

  /**
   * Notify period change callbacks
   */
  notifyPeriodChange(newPeriod) {
    const timeData = {
      period: newPeriod,
      hour: this.getCurrentHour(),
      minute: this.getCurrentMinute(),
      day: this.getCurrentDay(),
      lightLevel: this.getLightLevel()
    }

    this.periodChangeCallbacks.forEach(callback => callback(newPeriod, timeData))
  }

  /**
   * Get formatted time string
   */
  getTimeString() {
    const hour = this.getCurrentHour()
    const minute = this.getCurrentMinute()
    const period = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12

    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`
  }

  /**
   * Get complete time data
   */
  getTimeData() {
    return {
      hour: this.getCurrentHour(),
      minute: this.getCurrentMinute(),
      day: this.getCurrentDay(),
      period: this.getCurrentPeriod(),
      lightLevel: this.getLightLevel(),
      isDark: this.isDark(),
      isSleepTime: this.isSleepTime(),
      isWorkTime: this.isWorkTime(),
      isRestTime: this.isRestTime(),
      timeString: this.getTimeString()
    }
  }
}
