/**
 * PerformanceMonitor - Track FPS, frame times, and performance metrics
 * Helps identify performance bottlenecks and optimize game loop
 */

export class PerformanceMonitor {
  constructor(options = {}) {
    this.targetFPS = options.targetFPS || 60
    this.targetFrameTime = 1000 / this.targetFPS
    this.startTime = performance.now()

    // Frame tracking
    this.frameHistory = []
    this.maxFrameHistory = 60
    this.frameCount = 0
    this.lastFrameTime = 0
    this.frameDropThreshold = this.targetFrameTime * 2 // 2x target is a drop

    // System timing
    this.systemStats = new Map()
    this.currentSystemStart = null
    this.currentSystem = null

    // Entity tracking
    this.entityCounts = new Map()

    // Warning thresholds
    this.lowFPSThreshold = this.targetFPS * 0.7 // 70% of target
    this.highEntityCountThreshold = 500
    this.maxUpdateBudget = this.targetFrameTime

    // Callbacks
    this.performanceCallbacks = []
    this.lastCallbackTime = 0
    this.callbackThrottle = 1000 // 1 second
  }

  /**
   * Record a frame completion
   */
  recordFrame(deltaMs) {
    this.frameCount++
    this.frameHistory.push(deltaMs)

    // Keep only last N frames
    if (this.frameHistory.length > this.maxFrameHistory) {
      this.frameHistory.shift()
    }

    this.lastFrameTime = deltaMs

    // Check for performance issues
    if (deltaMs > this.frameDropThreshold) {
      this.triggerPerformanceCallback({
        type: 'frame-drop',
        frameTime: deltaMs,
        threshold: this.frameDropThreshold
      })
    }
  }

  /**
   * Get current FPS
   */
  getFPS() {
    if (this.frameHistory.length === 0) return this.targetFPS

    const avgFrameTime = this.getAverageFrameTime()
    return Math.round(1000 / avgFrameTime)
  }

  /**
   * Get average frame time
   */
  getAverageFrameTime() {
    if (this.frameHistory.length === 0) return 0

    const sum = this.frameHistory.reduce((a, b) => a + b, 0)
    return sum / this.frameHistory.length
  }

  /**
   * Get frame count
   */
  getFrameCount() {
    return this.frameCount
  }

  /**
   * Get min frame time
   */
  getMinFrameTime() {
    if (this.frameHistory.length === 0) return 0
    return Math.min(...this.frameHistory)
  }

  /**
   * Get max frame time
   */
  getMaxFrameTime() {
    if (this.frameHistory.length === 0) return 0
    return Math.max(...this.frameHistory)
  }

  /**
   * Get percentile frame time
   */
  getPercentile(percentile) {
    if (this.frameHistory.length === 0) return 0

    const sorted = [...this.frameHistory].sort((a, b) => a - b)
    // For 99th percentile of 100 samples, we want index 98 (99% of data below this point)
    const index = Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1)
    return sorted[index]
  }

  /**
   * Get frame drop count
   */
  getFrameDrops() {
    return this.frameHistory.filter(time => time > this.frameDropThreshold).length
  }

  /**
   * Check for stuttering (high variance in frame times)
   */
  hasStuttering() {
    if (this.frameHistory.length < 10) return false

    const avg = this.getAverageFrameTime()
    const variance = this.frameHistory.reduce((sum, time) => {
      return sum + Math.pow(time - avg, 2)
    }, 0) / this.frameHistory.length

    const stdDev = Math.sqrt(variance)

    // High variance indicates stuttering
    return stdDev > this.targetFrameTime * 0.5
  }

  /**
   * Check for performance warnings
   */
  hasPerformanceWarning() {
    const fps = this.getFPS()
    return fps < this.lowFPSThreshold
  }

  /**
   * Get warning level
   */
  getWarningLevel() {
    const fps = this.getFPS()

    if (fps < this.targetFPS * 0.5) return 'critical'
    if (fps < this.lowFPSThreshold) return 'low-fps'
    if (this.hasStuttering()) return 'stuttering'
    if (this.isBudgetExceeded()) return 'budget-exceeded'

    return null
  }

  /**
   * Start tracking system update
   */
  startSystemUpdate(systemName) {
    this.currentSystem = systemName
    this.currentSystemStart = performance.now()
  }

  /**
   * End tracking system update
   */
  endSystemUpdate(systemName, manualTime = null) {
    const time = manualTime !== null ? manualTime : performance.now() - this.currentSystemStart

    this.recordSystemTime(systemName, time)

    this.currentSystem = null
    this.currentSystemStart = null
  }

  /**
   * Record system execution time
   */
  recordSystemTime(systemName, timeMs) {
    if (!this.systemStats.has(systemName)) {
      this.systemStats.set(systemName, {
        times: [],
        averageTime: 0,
        maxTime: 0,
        calls: 0
      })
    }

    const stats = this.systemStats.get(systemName)
    stats.times.push(timeMs)

    // Keep only last 60 samples
    if (stats.times.length > 60) {
      stats.times.shift()
    }

    stats.averageTime = stats.times.reduce((a, b) => a + b, 0) / stats.times.length
    stats.maxTime = Math.max(stats.maxTime, timeMs)
    stats.calls++

    // Warn on slow systems
    if (timeMs > this.targetFrameTime * 0.5) {
      this.triggerPerformanceCallback({
        type: 'slow-system',
        system: systemName,
        time: timeMs,
        threshold: this.targetFrameTime * 0.5
      })
    }
  }

  /**
   * Get system statistics
   */
  getSystemStats(systemName) {
    return this.systemStats.get(systemName) || {
      times: [],
      averageTime: 0,
      maxTime: 0,
      calls: 0
    }
  }

  /**
   * Get slow systems
   */
  getSlowSystems() {
    const slowSystems = []

    this.systemStats.forEach((stats, name) => {
      if (stats.averageTime > this.targetFrameTime * 0.3) {
        slowSystems.push(name)
      }
    })

    return slowSystems
  }

  /**
   * Get total update budget used
   */
  getTotalUpdateBudget() {
    let total = 0

    this.systemStats.forEach(stats => {
      total += stats.averageTime
    })

    return total
  }

  /**
   * Check if budget exceeded
   */
  isBudgetExceeded() {
    return this.getTotalUpdateBudget() > this.maxUpdateBudget
  }

  /**
   * Record entity count
   */
  recordEntityCount(entityType, count) {
    this.entityCounts.set(entityType, count)

    // Warn on high entity count
    if (count > this.highEntityCountThreshold) {
      this.triggerPerformanceCallback({
        type: 'high-entity-count',
        entityType,
        count,
        threshold: this.highEntityCountThreshold
      })
    }
  }

  /**
   * Get entity count
   */
  getEntityCount(entityType) {
    return this.entityCounts.get(entityType) || 0
  }

  /**
   * Get total entity count
   */
  getTotalEntityCount() {
    let total = 0
    this.entityCounts.forEach(count => total += count)
    return total
  }

  /**
   * Check for memory warnings
   */
  hasMemoryWarning() {
    return this.getTotalEntityCount() > this.highEntityCountThreshold
  }

  /**
   * Get performance summary
   */
  getSummary() {
    return {
      fps: this.getFPS(),
      averageFrameTime: this.getAverageFrameTime(),
      minFrameTime: this.getMinFrameTime(),
      maxFrameTime: this.getMaxFrameTime(),
      frameDrops: this.getFrameDrops(),
      stuttering: this.hasStuttering(),
      warningLevel: this.getWarningLevel(),
      totalUpdateBudget: this.getTotalUpdateBudget(),
      budgetExceeded: this.isBudgetExceeded()
    }
  }

  /**
   * Get display text
   */
  getDisplayText() {
    const fps = this.getFPS()
    const avgFrame = this.getAverageFrameTime().toFixed(2)
    return `FPS: ${fps} (${avgFrame}ms avg)`
  }

  /**
   * Get detailed report
   */
  getDetailedReport() {
    const systems = {}
    this.systemStats.forEach((stats, name) => {
      systems[name] = {
        average: stats.averageTime.toFixed(2),
        max: stats.maxTime.toFixed(2),
        calls: stats.calls
      }
    })

    const entities = {}
    this.entityCounts.forEach((count, type) => {
      entities[type] = count
    })

    return {
      performance: this.getSummary(),
      systems,
      entities,
      uptime: ((performance.now() - this.startTime) / 1000).toFixed(1)
    }
  }

  /**
   * Reset statistics
   */
  reset() {
    this.frameHistory = []
    this.frameCount = 0
    this.systemStats.clear()
    this.entityCounts.clear()
    this.startTime = performance.now()
  }

  /**
   * Get performance suggestions
   */
  getSuggestions() {
    const suggestions = []

    // Check entity count
    if (this.hasMemoryWarning()) {
      suggestions.push(`Reduce entity count (current: ${this.getTotalEntityCount()}, recommend: <${this.highEntityCountThreshold})`)
    }

    // Check slow systems
    const slowSystems = this.getSlowSystems()
    if (slowSystems.length > 0) {
      slowSystems.forEach(system => {
        const stats = this.getSystemStats(system)
        suggestions.push(`Optimize ${system} system (avg: ${stats.averageTime.toFixed(2)}ms)`)
      })
    }

    // Check budget
    if (this.isBudgetExceeded()) {
      suggestions.push(`Total update time exceeds frame budget (${this.getTotalUpdateBudget().toFixed(2)}ms / ${this.maxUpdateBudget.toFixed(2)}ms)`)
    }

    // Check stuttering
    if (this.hasStuttering()) {
      suggestions.push('Frame time variance is high - consider smoothing updates or reducing workload spikes')
    }

    return suggestions
  }

  /**
   * Register performance callback
   */
  onPerformanceIssue(callback) {
    this.performanceCallbacks.push(callback)
  }

  /**
   * Trigger performance callbacks
   */
  triggerPerformanceCallback(data) {
    const now = performance.now()

    // Throttle callbacks
    if (now - this.lastCallbackTime < this.callbackThrottle) {
      return
    }

    this.lastCallbackTime = now

    this.performanceCallbacks.forEach(callback => {
      try {
        callback(data)
      } catch (err) {
        console.error('Performance callback error:', err)
      }
    })
  }
}
