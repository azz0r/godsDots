/**
 * Visual Effects System for particle effects and visual feedback
 */
export class VisualEffects {
  constructor() {
    this.effects = []
    this.effectId = 0
  }

  /**
   * Create an explosion effect
   */
  createExplosion(x, y, options = {}) {
    const effect = {
      id: this.effectId++,
      type: 'explosion',
      x,
      y,
      particles: [],
      duration: options.duration || 1000,
      elapsed: 0,
      active: true,
      gravity: options.gravity || 0,
      friction: options.friction || 0.98,
      scaleOverTime: options.scaleOverTime || false,
      finalSize: options.finalSize || 2
    }

    const particleCount = options.particleCount || 20
    const maxVelocity = options.maxVelocity || 5
    const color = options.color || '#ff6600'
    const particleSize = options.particleSize || 4

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5
      const velocity = maxVelocity * (0.5 + Math.random() * 0.5)

      const actualSize = particleSize + Math.random() * 2
      effect.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: actualSize,
        color,
        alpha: 1,
        initialSize: actualSize
      })
    }

    this.effects.push(effect)
    return effect
  }

  /**
   * Create a smoke effect
   */
  createSmoke(x, y, options = {}) {
    const effect = {
      id: this.effectId++,
      type: 'smoke',
      x,
      y,
      particles: [],
      duration: options.duration || 2000,
      elapsed: 0,
      active: true,
      spread: options.spread || 30,
      friction: options.friction || 0.95
    }

    const particleCount = options.particleCount || 15
    const color = options.color || '#666666'

    for (let i = 0; i < particleCount; i++) {
      effect.particles.push({
        x: x + (Math.random() - 0.5) * options.spread,
        y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 2 - 1,
        size: 10 + Math.random() * 10,
        color,
        alpha: 0.6,
        rotation: Math.random() * Math.PI * 2
      })
    }

    this.effects.push(effect)
    return effect
  }

  /**
   * Create a sparkle effect
   */
  createSparkle(x, y, options = {}) {
    const effect = {
      id: this.effectId++,
      type: 'sparkle',
      x,
      y,
      particles: [],
      duration: options.duration || 500,
      elapsed: 0,
      active: true
    }

    const particleCount = options.particleCount || 10
    const colors = options.colors || ['#ffff00', '#ffffff']

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const velocity = 1 + Math.random() * 2

      effect.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 2,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        sparkle: true,
        phase: Math.random() * Math.PI * 2
      })
    }

    this.effects.push(effect)
    return effect
  }

  /**
   * Create a dust cloud effect
   */
  createDustCloud(x, y, options = {}) {
    const effect = {
      id: this.effectId++,
      type: 'dust',
      x,
      y,
      particles: [],
      duration: options.duration || 800,
      elapsed: 0,
      active: true
    }

    const particleCount = options.particleCount || 30
    const color = options.color || '#8b7355'
    const radius = options.radius || 40

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = Math.random() * radius
      const particleX = x + Math.cos(angle) * distance
      const particleY = y + Math.sin(angle) * distance

      effect.particles.push({
        x: particleX,
        y: particleY,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 0.5,
        size: 5 + Math.random() * 5,
        color,
        alpha: 0.4 + Math.random() * 0.2
      })
    }

    this.effects.push(effect)
    return effect
  }

  /**
   * Create click feedback effect
   */
  createClickFeedback(x, y, options = {}) {
    const effect = {
      id: this.effectId++,
      type: options.type || 'ripple',
      x,
      y,
      radius: 0,
      maxRadius: options.maxRadius || 30,
      color: options.color || '#00ff00',
      duration: options.duration || 300,
      elapsed: 0,
      active: true,
      alpha: 1
    }

    this.effects.push(effect)
    return effect
  }

  /**
   * Create building placement effect
   */
  createPlacementEffect(x, y, options = {}) {
    const effect = {
      id: this.effectId++,
      type: 'placement',
      x,
      y,
      width: options.width || 40,
      height: options.height || 40,
      color: options.color || '#4169e1',
      duration: options.duration || 500,
      elapsed: 0,
      active: true,
      scale: 0,
      targetScale: 1
    }

    this.effects.push(effect)
    return effect
  }

  /**
   * Create resource collection effect
   */
  createCollectionEffect(x, y, options = {}) {
    const effect = {
      id: this.effectId++,
      type: 'collection',
      x,
      y,
      particles: [],
      targetX: options.targetX || x,
      targetY: options.targetY || y,
      resourceType: options.resourceType || 'generic',
      duration: 1000,
      elapsed: 0,
      active: true
    }

    const particleCount = options.amount || 5
    const colors = {
      wood: '#8b4513',
      stone: '#696969',
      gold: '#ffd700',
      food: '#ff6347'
    }
    const color = colors[options.resourceType] || '#ffffff'

    for (let i = 0; i < particleCount; i++) {
      effect.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        size: 4 + Math.random() * 4,
        color,
        alpha: 1,
        delay: i * 50
      })
    }

    this.effects.push(effect)
    return effect
  }

  /**
   * Create damage effect
   */
  createDamageEffect(x, y, options = {}) {
    const effect = {
      id: this.effectId++,
      type: 'damage',
      x,
      y,
      text: `-${options.damage || 0}`,
      color: options.color || '#ff0000',
      fontSize: options.fontSize || 16,
      duration: options.duration || 1000,
      elapsed: 0,
      active: true,
      alpha: 1,
      offsetY: 0,
      floatSpeed: options.floatSpeed || 50
    }

    this.effects.push(effect)
    return effect
  }

  /**
   * Create rain effect
   */
  createRainEffect(x, y, options = {}) {
    const effect = {
      id: this.effectId++,
      type: 'rain',
      x,
      y,
      particles: [],
      duration: options.duration || 2000,
      elapsed: 0,
      active: true,
      radius: options.radius || 150
    }

    const particleCount = options.particleCount || 50
    for (let i = 0; i < particleCount; i++) {
      effect.particles.push({
        x: x + (Math.random() - 0.5) * effect.radius * 2,
        y: y - effect.radius + Math.random() * 50,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 5 + Math.random() * 3,
        size: 1 + Math.random() * 2,
        color: '#4488ff',
        alpha: 0.6,
        length: 10 + Math.random() * 10
      })
    }

    this.effects.push(effect)
    return effect
  }

  /**
   * Create earthquake effect
   */
  createEarthquakeEffect(x, y, options = {}) {
    const effect = {
      id: this.effectId++,
      type: 'earthquake',
      x,
      y,
      particles: [],
      duration: options.duration || 1500,
      elapsed: 0,
      active: true,
      radius: options.radius || 200,
      shakeIntensity: options.shakeIntensity || 10
    }

    // Create debris particles
    const particleCount = options.particleCount || 40
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = Math.random() * effect.radius
      effect.particles.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 4 - 2,
        size: 3 + Math.random() * 5,
        color: ['#8b7355', '#696969', '#a0522d'][Math.floor(Math.random() * 3)],
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      })
    }

    this.effects.push(effect)
    return effect
  }

  /**
   * Create batch effects
   */
  createBatchEffect(type, positions, options = {}) {
    const effects = []

    positions.forEach(pos => {
      let effect
      switch (type) {
        case 'explosion':
          effect = this.createExplosion(pos.x, pos.y, options)
          break
        case 'smoke':
          effect = this.createSmoke(pos.x, pos.y, options)
          break
        case 'sparkle':
          effect = this.createSparkle(pos.x, pos.y, options)
          break
        default:
          effect = this.createExplosion(pos.x, pos.y, options)
      }
      effects.push(effect)
    })

    return effects
  }

  /**
   * Update all active effects
   */
  update(deltaTime) {
    this.effects = this.effects.filter(effect => {
      if (!effect.active) return false

      effect.elapsed += deltaTime

      if (effect.elapsed >= effect.duration) {
        effect.active = false
        return false
      }

      const progress = effect.elapsed / effect.duration

      switch (effect.type) {
        case 'explosion':
        case 'smoke':
        case 'dust':
        case 'sparkle':
        case 'rain':
        case 'earthquake':
        case 'leaf':
          this.updateParticleEffect(effect, deltaTime, progress)
          break
        case 'ripple':
          this.updateRippleEffect(effect, progress)
          break
        case 'placement':
          this.updatePlacementEffect(effect, progress)
          break
        case 'collection':
          this.updateCollectionEffect(effect, deltaTime, progress)
          break
        case 'damage':
          this.updateDamageEffect(effect, deltaTime, progress)
          break
      }

      return true
    })
  }

  /**
   * Update particle-based effects
   */
  updateParticleEffect(effect, deltaTime, progress) {
    const dt = deltaTime / 1000

    effect.particles.forEach(particle => {
      // Apply velocity
      particle.x += particle.vx
      particle.y += particle.vy

      // Apply gravity
      if (effect.gravity) {
        particle.vy += effect.gravity * dt
      }

      // Apply friction
      if (effect.friction) {
        particle.vx *= effect.friction
        particle.vy *= effect.friction
      }

      // Fade out
      if (effect.type === 'explosion' || effect.type === 'sparkle') {
        particle.alpha = 1 - progress
      }

      // Scale over time
      if (effect.scaleOverTime && effect.type === 'explosion') {
        const scaleFactor = 1 - progress * 0.8
        particle.size = particle.initialSize * scaleFactor
        // Ensure minimum size
        if (particle.size < effect.finalSize) {
          particle.size = effect.finalSize
        }
      }

      // Sparkle animation
      if (particle.sparkle) {
        particle.phase += dt * 10
      }
      
      // Rain-specific behavior
      if (effect.type === 'rain') {
        // Reset rain particles when they hit the ground
        if (particle.y > effect.y + effect.radius) {
          particle.y = effect.y - effect.radius + Math.random() * 50
          particle.x = effect.x + (Math.random() - 0.5) * effect.radius * 2
        }
      }
      
      // Earthquake debris behavior
      if (effect.type === 'earthquake') {
        particle.vy += 15 * dt // gravity
        if (particle.rotation !== undefined) {
          particle.rotation += particle.rotationSpeed
        }
      }
      
      // Leaf falling behavior
      if (effect.type === 'leaf') {
        // Gentle swaying motion
        particle.vx = Math.sin(effect.elapsed * 0.002 + particle.rotation) * 0.5
        particle.vy = 1 + Math.sin(effect.elapsed * 0.003) * 0.2
        if (particle.rotation !== undefined) {
          particle.rotation += particle.rotationSpeed
        }
      }
    })
  }

  /**
   * Update ripple effect
   */
  updateRippleEffect(effect, progress) {
    effect.radius = effect.maxRadius * progress
    effect.alpha = 1 - progress
  }

  /**
   * Update placement effect
   */
  updatePlacementEffect(effect, progress) {
    effect.scale = progress
    effect.alpha = progress < 0.5 ? 1 : 2 - progress * 2
  }

  /**
   * Update collection effect
   */
  updateCollectionEffect(effect, deltaTime, progress) {
    effect.particles.forEach(particle => {
      if (effect.elapsed < particle.delay) return

      const adjustedProgress = (effect.elapsed - particle.delay) / (effect.duration - particle.delay)
      
      if (adjustedProgress > 0) {
        // Move towards target
        const dx = effect.targetX - particle.x
        const dy = effect.targetY - particle.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance > 1) {
          const speed = 3
          particle.x += (dx / distance) * speed * adjustedProgress
          particle.y += (dy / distance) * speed * adjustedProgress
        }

        particle.alpha = 1 - adjustedProgress
        particle.size *= 0.98
      }
    })
  }

  /**
   * Update damage effect
   */
  updateDamageEffect(effect, deltaTime, progress) {
    effect.offsetY = -effect.floatSpeed * progress
    effect.y = effect.y + effect.offsetY * (deltaTime / 1000)
    effect.alpha = progress < 0.5 ? 1 : 2 - progress * 2
  }

  /**
   * Render all effects
   */
  render(ctx) {
    this.effects.forEach(effect => {
      ctx.save()

      switch (effect.type) {
        case 'explosion':
        case 'smoke':
        case 'dust':
        case 'sparkle':
        case 'construction':
        case 'earthquake':
        case 'leaf':
          this.renderParticles(ctx, effect)
          break
        case 'rain':
          this.renderRain(ctx, effect)
          break
        case 'ripple':
          this.renderRipple(ctx, effect)
          break
        case 'placement':
          this.renderPlacement(ctx, effect)
          break
        case 'collection':
          this.renderParticles(ctx, effect)
          break
        case 'damage':
          this.renderDamage(ctx, effect)
          break
      }

      ctx.restore()
    })
  }

  /**
   * Render particle effects
   */
  renderParticles(ctx, effect) {
    effect.particles.forEach(particle => {
      if (particle.alpha <= 0) return

      ctx.save()
      ctx.globalAlpha = particle.alpha
      ctx.fillStyle = particle.color

      if (particle.sparkle) {
        // Sparkle effect
        const sparkleSize = particle.size * (0.5 + 0.5 * Math.sin(particle.phase))
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, sparkleSize, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Regular particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    })
  }

  /**
   * Render ripple effect
   */
  renderRipple(ctx, effect) {
    ctx.globalAlpha = effect.alpha
    ctx.strokeStyle = effect.color
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  /**
   * Render placement effect
   */
  renderPlacement(ctx, effect) {
    ctx.globalAlpha = effect.alpha
    ctx.strokeStyle = effect.color
    ctx.lineWidth = 3

    const w = effect.width * effect.scale
    const h = effect.height * effect.scale
    const x = effect.x - w / 2
    const y = effect.y - h / 2

    ctx.strokeRect(x, y, w, h)
  }

  /**
   * Render damage effect
   */
  renderDamage(ctx, effect) {
    ctx.globalAlpha = effect.alpha
    ctx.fillStyle = effect.color
    ctx.font = `${effect.fontSize}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.fillText(effect.text, effect.x, effect.y + effect.offsetY)
  }

  /**
   * Render rain effect
   */
  renderRain(ctx, effect) {
    ctx.strokeStyle = '#4488ff'
    ctx.lineWidth = 1
    
    effect.particles.forEach(particle => {
      if (particle.alpha <= 0) return
      
      ctx.save()
      ctx.globalAlpha = particle.alpha
      ctx.beginPath()
      ctx.moveTo(particle.x, particle.y)
      ctx.lineTo(particle.x - particle.vx * 2, particle.y - particle.length)
      ctx.stroke()
      
      // Small splash at bottom
      if (particle.y > effect.y + effect.radius - 10) {
        ctx.fillStyle = particle.color
        ctx.globalAlpha = particle.alpha * 0.5
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    })
  }

  /**
   * Get active effects
   */
  getActiveEffects() {
    return this.effects.filter(e => e.active)
  }

  /**
   * Clear all effects
   */
  clear() {
    this.effects = []
  }

  // Preset effects
  buildingConstruction(x, y) {
    this.createDustCloud(x, y, {
      particleCount: 20,
      color: '#8b7355',
      radius: 30,
      duration: 1000
    })
    
    // Create and return a construction effect
    const effect = {
      id: this.effectId++,
      type: 'construction',
      x,
      y,
      particles: [],
      duration: 1500,
      elapsed: 0,
      active: true
    }
    
    // Add sparkle particles
    const colors = ['#ffff00', '#ffa500']
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2
      const velocity = 1 + Math.random() * 2
      
      effect.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 2,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        sparkle: true,
        phase: Math.random() * Math.PI * 2
      })
    }
    
    this.effects.push(effect)
    return effect
  }

  resourceDepleted(x, y, resourceType) {
    const colors = {
      tree: '#654321',
      stone: '#696969',
      ironOre: '#8b4513'
    }
    
    return this.createExplosion(x, y, {
      particleCount: 15,
      color: colors[resourceType] || '#666666',
      maxVelocity: 3,
      duration: 800,
      gravity: 5
    })
  }

  villagerAction(x, y, action) {
    switch (action) {
      case 'harvest':
        return this.createSparkle(x, y, {
          particleCount: 5,
          duration: 500
        })
      case 'build':
        return this.createDustCloud(x, y, {
          particleCount: 10,
          duration: 600
        })
      default:
        return this.createSparkle(x, y, {
          particleCount: 3,
          duration: 300
        })
    }
  }
}