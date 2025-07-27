/**
 * Scaling System for responsive canvas rendering and zoom management
 */
export class ScalingSystem {
  constructor(canvas) {
    this.canvas = canvas
    this.scale = 1
    this.offset = { x: 0, y: 0 }
    this.viewport = { x: 0, y: 0, width: 800, height: 600 }
    this.minZoom = 0.25
    this.maxZoom = 4
    this.renderMode = 'crisp'
    this.smoothZoomActive = false
    this.smoothZoomStart = 1
    this.smoothZoomTarget = 1
    this.smoothZoomDuration = 0
    this.smoothZoomElapsed = 0
    this.smoothZoomCallback = null
    this.transformMatrix = null
    this.matrixDirty = true
    this.batchMode = false
    this.followTargetObject = null
    this.followOptions = null
    this.tileSize = 40
    this.worldBounds = { width: 4000, height: 4000 }
    this.lodLevel = 'medium'

    const rect = this.canvas.getBoundingClientRect()
    this.viewport.width = rect.width
    this.viewport.height = rect.height
    this.initializeCanvas()
    this.updateViewport()
  }

  /**
   * Initialize canvas with proper sizing
   */
  initializeCanvas() {
    const rect = this.canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    // Set actual canvas size accounting for device pixel ratio
    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr

    // Scale canvas back down using CSS
    this.canvas.style.width = rect.width + 'px'
    this.canvas.style.height = rect.height + 'px'

    // Store device pixel ratio for later use
    this.devicePixelRatio = dpr
    // Don't overwrite viewport dimensions here - they're set by handleResize
  }

  /**
   * Handle window resize
   */
  handleResize(options = {}) {
    const rect = this.canvas.getBoundingClientRect()
    const previousAspect = this.viewport.width / this.viewport.height
    
    if (options.maintainAspectRatio) {
      // Calculate new dimensions maintaining aspect ratio
      const targetAspect = previousAspect
      const currentAspect = rect.width / rect.height
      
      if (currentAspect > targetAspect) {
        // Window is wider - fit to height and constrain width
        this.viewport.height = rect.height
        this.viewport.width = rect.height * targetAspect
      } else {
        // Window is taller - fit to width and constrain height
        this.viewport.width = rect.width
        this.viewport.height = rect.width / targetAspect
      }
    } else {
      this.viewport.width = rect.width
      this.viewport.height = rect.height
    }

    this.initializeCanvas()
    this.matrixDirty = true
  }

  /**
   * Apply current scale to context
   */
  applyScale(ctx) {
    ctx.scale(this.devicePixelRatio, this.devicePixelRatio)
    
    if (!this.batchMode) {
      ctx.save()
      ctx.translate(this.offset.x, this.offset.y)
      ctx.scale(this.scale, this.scale)
    }
  }

  /**
   * Get current scale
   */
  getScale() {
    return this.scale
  }

  /**
   * Set scale with limits
   */
  setScale(newScale) {
    this.scale = Math.max(this.minZoom, Math.min(this.maxZoom, newScale))
    this.matrixDirty = true
    this.updateLOD()
  }

  /**
   * Get viewport
   */
  getViewport() {
    return { ...this.viewport }
  }

  /**
   * Set viewport
   */
  setViewport(viewport) {
    this.viewport = { ...viewport }
    this.matrixDirty = true
  }

  /**
   * Scale UI element based on zoom
   */
  scaleUIElement(element) {
    const scaledSize = element.baseSize * this.scale
    return Math.max(element.minSize, Math.min(element.maxSize, scaledSize))
  }

  /**
   * Scale font size with limits
   */
  scaleFontSize(baseSize) {
    const scaled = baseSize * this.scale
    return Math.max(12, Math.min(48, Math.round(scaled)))
  }

  /**
   * Scale entire UI config
   */
  scaleUIConfig(config) {
    const scaled = {}
    
    for (const key in config) {
      const value = config[key]
      
      if (typeof value === 'number') {
        scaled[key] = value * this.scale
      } else if (typeof value === 'object' && value !== null) {
        scaled[key] = this.scaleUIConfig(value)
      } else {
        scaled[key] = value
      }
    }
    
    return scaled
  }

  /**
   * Get UI breakpoints
   */
  getUIBreakpoints() {
    return {
      small: { maxWidth: 768, scale: 0.8 },
      medium: { maxWidth: 1024, scale: 1 },
      large: { maxWidth: 1440, scale: 1.2 },
      xlarge: { minWidth: 1440, scale: 1.5 }
    }
  }

  /**
   * Smooth zoom animation
   */
  smoothZoom(targetScale, duration, callback) {
    this.smoothZoomActive = true
    this.smoothZoomStart = this.scale
    this.smoothZoomTarget = Math.max(this.minZoom, Math.min(this.maxZoom, targetScale))
    this.smoothZoomDuration = duration
    this.smoothZoomElapsed = 0
    this.smoothZoomCallback = callback
  }

  /**
   * Update smooth zoom
   */
  update(deltaTime) {
    if (this.smoothZoomActive) {
      this.smoothZoomElapsed += deltaTime
      
      if (this.smoothZoomElapsed >= this.smoothZoomDuration) {
        this.scale = this.smoothZoomTarget
        this.smoothZoomActive = false
        if (this.smoothZoomCallback) {
          this.smoothZoomCallback(this.scale)
        }
      } else {
        const progress = this.smoothZoomElapsed / this.smoothZoomDuration
        const eased = this.easeInOutCubic(progress)
        this.scale = this.smoothZoomStart + (this.smoothZoomTarget - this.smoothZoomStart) * eased
        if (this.smoothZoomCallback) {
          this.smoothZoomCallback(this.scale)
        }
      }
      
      this.matrixDirty = true
      this.updateLOD()
    }

    // Update camera following
    if (this.followTargetObject && this.followOptions) {
      const targetX = this.followTargetObject.x + (this.followOptions.offset?.x || 0)
      const targetY = this.followTargetObject.y + (this.followOptions.offset?.y || 0)
      
      const centerX = this.viewport.width / 2 / this.scale
      const centerY = this.viewport.height / 2 / this.scale
      
      const desiredX = centerX - targetX
      const desiredY = centerY - targetY
      
      const smoothing = this.followOptions.smoothing || 0.1
      
      this.offset.x += (desiredX - this.offset.x) * smoothing
      this.offset.y += (desiredY - this.offset.y) * smoothing
      
      this.matrixDirty = true
    }
  }

  /**
   * Easing function
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  /**
   * Set zoom limits
   */
  setZoomLimits(min, max) {
    this.minZoom = min
    this.maxZoom = max
    this.setScale(this.scale) // Reapply limits
  }

  /**
   * Zoom to specific point
   */
  zoomToPoint(point, newScale) {
    const oldScale = this.scale
    
    // Get world position before zoom
    const worldPos = this.screenToWorld(point)
    
    // Apply new scale
    this.setScale(newScale)
    
    // Calculate new offset to keep point in same screen position
    const scaleRatio = this.scale / oldScale
    this.offset.x = point.x - worldPos.x * this.scale
    this.offset.y = point.y - worldPos.y * this.scale
    
    this.matrixDirty = true
  }

  /**
   * Get zoom presets
   */
  getZoomPresets() {
    return {
      'fit': 'fit',
      '50%': 0.5,
      '100%': 1,
      '200%': 2,
      '400%': 4
    }
  }

  /**
   * Set zoom preset
   */
  setZoomPreset(preset) {
    if (preset === 'fit') {
      // Calculate scale to fit world in viewport
      const scaleX = this.viewport.width / this.worldBounds.width
      const scaleY = this.viewport.height / this.worldBounds.height
      this.setScale(Math.min(scaleX, scaleY) * 0.9) // 90% to add padding
    } else if (typeof this.getZoomPresets()[preset] === 'number') {
      this.setScale(this.getZoomPresets()[preset])
    }
  }

  /**
   * Set offset
   */
  setOffset(offset) {
    this.offset = { ...offset }
    this.matrixDirty = true
  }

  /**
   * Snap position to pixel boundary
   */
  snapToPixel(pos) {
    return {
      x: Math.round(pos.x),
      y: Math.round(pos.y)
    }
  }

  /**
   * Set render mode
   */
  setRenderMode(mode) {
    this.renderMode = mode
  }

  /**
   * Get render position based on mode
   */
  getRenderPosition(pos) {
    if (this.renderMode === 'crisp') {
      return this.snapToPixel(pos)
    }
    return pos
  }

  /**
   * Configure context for pixel art
   */
  configureContextForPixelArt(ctx) {
    ctx.imageSmoothingEnabled = false
    ctx.imageSmoothingQuality = 'low'
  }

  /**
   * Align to grid
   */
  alignToGrid(pos, gridSize) {
    return {
      x: Math.round(pos.x / gridSize) * gridSize,
      y: Math.round(pos.y / gridSize) * gridSize
    }
  }

  /**
   * Convert screen to world coordinates
   */
  screenToWorld(screenPos) {
    return {
      x: (screenPos.x - this.offset.x) / this.scale,
      y: (screenPos.y - this.offset.y) / this.scale
    }
  }

  /**
   * Convert world to screen coordinates
   */
  worldToScreen(worldPos) {
    return {
      x: worldPos.x * this.scale + this.offset.x,
      y: worldPos.y * this.scale + this.offset.y
    }
  }

  /**
   * Get mouse world position
   */
  getMouseWorldPosition(event) {
    const rect = this.canvas.getBoundingClientRect()
    const screenPos = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
    return this.screenToWorld(screenPos)
  }

  /**
   * Get transform matrix
   */
  getTransformMatrix() {
    if (this.matrixDirty || !this.transformMatrix) {
      this.transformMatrix = {
        a: this.scale,
        b: 0,
        c: 0,
        d: this.scale,
        e: this.offset.x,
        f: this.offset.y
      }
      this.matrixDirty = false
    }
    return this.transformMatrix
  }

  /**
   * Begin batch update
   */
  beginBatchUpdate() {
    this.batchMode = true
  }

  /**
   * End batch update
   */
  endBatchUpdate(ctx) {
    this.batchMode = false
    const matrix = this.getTransformMatrix()
    ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)
  }

  /**
   * Rotate (placeholder for future implementation)
   */
  rotate(angle) {
    // Future implementation
  }

  /**
   * Check if object is in viewport
   */
  isInViewport(obj) {
    // Check if object is within world viewport bounds
    const objRight = obj.x + (obj.width || 0)
    const objBottom = obj.y + (obj.height || 0)
    const viewRight = this.viewport.x + this.viewport.width / this.scale
    const viewBottom = this.viewport.y + this.viewport.height / this.scale
    
    return !(
      objRight < this.viewport.x ||
      objBottom < this.viewport.y ||
      obj.x > viewRight ||
      obj.y > viewBottom
    )
  }

  /**
   * Update LOD based on scale
   */
  updateLOD() {
    if (this.scale < 0.5) {
      this.lodLevel = 'low'
    } else if (this.scale < 1.5) {
      this.lodLevel = 'medium'
    } else {
      this.lodLevel = 'high'
    }
  }

  /**
   * Get current LOD
   */
  getCurrentLOD() {
    return this.lodLevel
  }

  /**
   * Get LOD config
   */
  getLODConfig() {
    return {
      low: { minScale: 0, maxScale: 0.5 },
      medium: { minScale: 0.5, maxScale: 1.5 },
      high: { minScale: 1.5, maxScale: Infinity }
    }
  }

  /**
   * Configure for tile-based game
   */
  configureForTileBasedGame(config) {
    this.tileSize = config.tileSize
    this.worldBounds = config.worldSize
    this.setZoomLimits(config.minZoom, config.maxZoom)
  }

  /**
   * Get tile size
   */
  getTileSize() {
    return this.tileSize
  }

  /**
   * Get world bounds
   */
  getWorldBounds() {
    return { ...this.worldBounds }
  }

  /**
   * Follow target
   */
  followTarget(target, options = {}) {
    this.followTargetObject = target
    this.followOptions = options
  }

  /**
   * Get minimap scale
   */
  getMinimapScale(minimapSize, worldSize) {
    const scaleX = minimapSize.width / worldSize.width
    const scaleY = minimapSize.height / worldSize.height
    return Math.min(scaleX, scaleY)
  }

  /**
   * Update viewport position
   */
  updateViewport() {
    this.viewport.x = Math.abs(-this.offset.x / this.scale) === 0 ? 0 : -this.offset.x / this.scale
    this.viewport.y = Math.abs(-this.offset.y / this.scale) === 0 ? 0 : -this.offset.y / this.scale
  }
}