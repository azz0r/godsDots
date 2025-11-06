/**
 * EntityCullingSystem - Culls off-screen entities to improve performance
 * Only visible entities need to be rendered/updated
 */

export class EntityCullingSystem {
  constructor(options = {}) {
    this.buffer = options.buffer || 100 // Extra pixels around viewport
    this.throttleMs = options.throttleMs || 100 // Throttle culling updates
    this.movementThreshold = options.movementThreshold || 200 // Camera movement to force update

    // Statistics
    this.stats = {
      totalEntities: 0,
      visibleEntities: 0,
      culledEntities: 0,
      cullPercentage: 0
    }

    // Throttling state
    this.lastUpdateTime = 0
    this.lastCameraPos = { x: 0, y: 0, zoom: 1 }
  }

  /**
   * Check if entity is visible in camera view
   */
  isVisible(entity, camera) {
    // Debug: Log camera dimensions once
    if (!this._loggedCamera) {
      console.log('[EntityCulling] Camera:', {
        x: camera.x,
        y: camera.y,
        zoom: camera.zoom,
        width: camera.width,
        height: camera.height
      })
      this._loggedCamera = true
    }

    // Calculate view bounds with zoom
    const viewLeft = camera.x - this.buffer / camera.zoom
    const viewRight = camera.x + (camera.width / camera.zoom) + this.buffer / camera.zoom
    const viewTop = camera.y - this.buffer / camera.zoom
    const viewBottom = camera.y + (camera.height / camera.zoom) + this.buffer / camera.zoom

    // Get entity bounds
    let entityLeft = entity.x
    let entityRight = entity.x
    let entityTop = entity.y
    let entityBottom = entity.y

    // Handle entities with size
    if (entity.width && entity.height) {
      entityRight = entity.x + entity.width
      entityBottom = entity.y + entity.height
    } else if (entity.radius) {
      entityLeft = entity.x - entity.radius
      entityRight = entity.x + entity.radius
      entityTop = entity.y - entity.radius
      entityBottom = entity.y + entity.radius
    }

    // Check if entity overlaps with view
    const overlapsX = entityRight >= viewLeft && entityLeft <= viewRight
    const overlapsY = entityBottom >= viewTop && entityTop <= viewBottom

    return overlapsX && overlapsY
  }

  /**
   * Cull array of entities, returning only visible ones
   */
  cullEntities(entities, camera, options = {}) {
    const visible = []

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]

      // Check priority
      if (options.respectPriority && entity.priority === 'critical') {
        visible.push(entity)
        continue
      }

      // Aggressive culling for low priority
      if (options.aggressiveCulling && entity.priority === 'low') {
        // Use smaller buffer for low priority entities
        const tempBuffer = this.buffer
        this.buffer = this.buffer * 0.5
        const isVis = this.isVisible(entity, camera)
        this.buffer = tempBuffer

        if (isVis) {
          visible.push(entity)
        }
      } else {
        if (this.isVisible(entity, camera)) {
          visible.push(entity)
        }
      }
    }

    // Update statistics
    this.stats.totalEntities = entities.length
    this.stats.visibleEntities = visible.length
    this.stats.culledEntities = entities.length - visible.length
    this.stats.cullPercentage = entities.length > 0
      ? (this.stats.culledEntities / entities.length) * 100
      : 0

    // Debug: Log culling stats every 60 frames
    if (!this._frameCount) this._frameCount = 0
    this._frameCount++
    if (this._frameCount % 60 === 0 && entities.length > 0) {
      console.log('[EntityCulling] Stats:', {
        total: this.stats.totalEntities,
        visible: this.stats.visibleEntities,
        culled: this.stats.culledEntities,
        percentage: Math.round(this.stats.cullPercentage) + '%'
      })
    }

    return visible
  }

  /**
   * Update visibility flag on entities
   */
  updateVisibility(entities, camera) {
    for (let i = 0; i < entities.length; i++) {
      entities[i].isVisible = this.isVisible(entities[i], camera)
    }
  }

  /**
   * Check if culling should be updated (throttled)
   */
  shouldUpdateCulling(camera, currentTime) {
    // Check time throttle
    if (currentTime - this.lastUpdateTime < this.throttleMs) {
      // Check if camera moved significantly
      const dx = Math.abs(camera.x - this.lastCameraPos.x)
      const dy = Math.abs(camera.y - this.lastCameraPos.y)
      const dz = Math.abs(camera.zoom - this.lastCameraPos.zoom)

      if (dx < this.movementThreshold && dy < this.movementThreshold && dz < 0.1) {
        return false // Not enough movement
      }
    }

    // Update last position and time
    this.lastCameraPos.x = camera.x
    this.lastCameraPos.y = camera.y
    this.lastCameraPos.zoom = camera.zoom
    this.lastUpdateTime = currentTime

    return true
  }

  /**
   * Get culling statistics
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalEntities: 0,
      visibleEntities: 0,
      culledEntities: 0,
      cullPercentage: 0
    }
  }

  /**
   * Set buffer size
   */
  setBuffer(buffer) {
    this.buffer = buffer
  }

  /**
   * Get buffer size
   */
  getBuffer() {
    return this.buffer
  }
}
