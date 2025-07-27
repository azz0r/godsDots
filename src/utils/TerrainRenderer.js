/**
 * Enhanced terrain rendering system with beautiful visuals
 */
export class TerrainRenderer {
  constructor() {
    this.terrainColors = {
      // Water terrains with beautiful gradients
      deepWater: {
        base: '#1a3a52',
        gradient: ['#0d1f2f', '#1a3a52', '#2a5a7a'],
        pattern: 'waves',
        animation: true
      },
      water: {
        base: '#3c7ea8',
        gradient: ['#2a5a7a', '#3c7ea8', '#4a9ed8'],
        pattern: 'waves',
        animation: true
      },
      river: {
        base: '#5090d3',
        gradient: ['#4080c3', '#5090d3', '#60a0e3'],
        pattern: 'flow',
        animation: true
      },
      
      // Land terrains with organic patterns
      sand: {
        base: '#f4e4a1',
        gradient: ['#e4d491', '#f4e4a1', '#fff4b1'],
        pattern: 'dots',
        noise: true
      },
      grass: {
        base: '#7cb342',
        gradient: ['#6ca332', '#7cb342', '#8cc352'],
        pattern: 'grass',
        sway: true
      },
      grassland: {
        base: '#8bc34a',
        gradient: ['#7bb33a', '#8bc34a', '#9bd35a'],
        pattern: 'tallgrass',
        sway: true
      },
      savanna: {
        base: '#cddc39',
        gradient: ['#bdcc29', '#cddc39', '#dded49'],
        pattern: 'sparse',
        heat: true
      },
      
      // Forest terrains with tree patterns
      forest: {
        base: '#4caf50',
        gradient: ['#3c9f40', '#4caf50', '#5cbf60'],
        pattern: 'trees',
        canopy: true
      },
      taiga: {
        base: '#2e7d32',
        gradient: ['#1e6d22', '#2e7d32', '#3e8d42'],
        pattern: 'conifers',
        snow: 0.2
      },
      tropicalForest: {
        base: '#388e3c',
        gradient: ['#287e2c', '#388e3c', '#489e4c'],
        pattern: 'palms',
        mist: true
      },
      rainforest: {
        base: '#1b5e20',
        gradient: ['#0b4e10', '#1b5e20', '#2b6e30'],
        pattern: 'dense',
        mist: true,
        canopy: true
      },
      jungle: {
        base: '#0d4f0d',
        gradient: ['#003f00', '#0d4f0d', '#1d5f1d'],
        pattern: 'vines',
        mist: true,
        canopy: true
      },
      
      // Mountain terrains with rock patterns
      hills: {
        base: '#8d6e63',
        gradient: ['#7d5e53', '#8d6e63', '#9d7e73'],
        pattern: 'rocks',
        shadow: true
      },
      rockyHills: {
        base: '#6d4c41',
        gradient: ['#5d3c31', '#6d4c41', '#7d5c51'],
        pattern: 'boulders',
        shadow: true
      },
      mountain: {
        base: '#5d4037',
        gradient: ['#4d3027', '#5d4037', '#6d5047'],
        pattern: 'cliffs',
        shadow: true,
        snow: 0.5
      },
      
      // Cold terrains with snow effects
      tundra: {
        base: '#eceff1',
        gradient: ['#dcdfe1', '#eceff1', '#fcffff'],
        pattern: 'frost',
        snow: 0.8
      },
      snow: {
        base: '#ffffff',
        gradient: ['#f0f0f0', '#ffffff', '#ffffff'],
        pattern: 'sparkle',
        sparkle: true
      },
      snowyForest: {
        base: '#90a4ae',
        gradient: ['#8094a0', '#90a4ae', '#a0b4be'],
        pattern: 'snowtrees',
        snow: 0.6
      },
      
      // Desert terrains with heat effects
      desert: {
        base: '#ffb74d',
        gradient: ['#ffa73d', '#ffb74d', '#ffc75d'],
        pattern: 'dunes',
        heat: true
      }
    }
    
    // Cache for patterns and gradients
    this.patternCache = new Map()
    this.gradientCache = new Map()
    
    // Animation state
    this.animationTime = 0
    this.waveOffset = 0
    this.swayOffset = 0
    this.cloudOffset = 0
  }
  
  /**
   * Update animation state
   */
  update(deltaTime) {
    this.animationTime += deltaTime
    this.waveOffset = Math.sin(this.animationTime * 0.001) * 2
    this.swayOffset = Math.sin(this.animationTime * 0.0008) * 3
    this.cloudOffset = (this.animationTime * 0.01) % 1000
  }
  
  /**
   * Render terrain with enhanced visuals
   */
  renderTerrain(ctx, terrain, camera = { x: 0, y: 0, zoom: 1 }, resources = null) {
    // Don't apply camera transform here - it should be applied by the caller
    // This ensures terrain and resources use the same coordinate system
    
    // Group terrain by type for batch rendering
    const terrainGroups = this.groupTerrainByType(terrain)
    
    // Render each terrain type with simplified visuals
    terrainGroups.forEach((tiles, type) => {
      this.renderTerrainTypeSimple(ctx, tiles, type)
    })
    
    // Skip terrain blending and ambient effects for performance
    // this.renderTerrainBlending(ctx, terrain)
    // this.renderAmbientEffects(ctx, terrain)
  }
  
  /**
   * Group terrain tiles by type for efficient rendering
   */
  groupTerrainByType(terrain) {
    const groups = new Map()
    
    terrain.forEach(tile => {
      if (!groups.has(tile.type)) {
        groups.set(tile.type, [])
      }
      groups.get(tile.type).push(tile)
    })
    
    return groups
  }
  
  /**
   * Render all tiles with simplified solid colors
   */
  renderTerrainTypeSimple(ctx, tiles, type) {
    const terrainConfig = this.terrainColors[type] || {
      base: '#666666'
    }
    
    // Use solid color for all tiles of this type
    ctx.fillStyle = terrainConfig.base
    
    tiles.forEach(tile => {
      ctx.fillRect(tile.x, tile.y, tile.width, tile.height)
    })
  }
  
  /**
   * Render all tiles of a specific terrain type (kept for reference but unused)
   */
  renderTerrainType(ctx, tiles, type) {
    const terrainConfig = this.terrainColors[type] || {
      base: '#666666',
      gradient: ['#666666']
    }
    
    tiles.forEach(tile => {
      // Get or create gradient
      const gradient = this.getGradient(ctx, tile, terrainConfig)
      
      // Fill base terrain
      ctx.fillStyle = gradient
      ctx.fillRect(tile.x, tile.y, tile.width, tile.height)
      
      // Apply texture pattern
      if (terrainConfig.pattern) {
        this.applyPattern(ctx, tile, terrainConfig)
      }
      
      // Apply elevation-based shading
      if (tile.elevation !== undefined) {
        this.applyElevationShading(ctx, tile)
      }
      
      // Apply special effects
      this.applySpecialEffects(ctx, tile, terrainConfig)
    })
  }
  
  /**
   * Get or create gradient for terrain
   */
  getGradient(ctx, tile, config) {
    const key = `${tile.type}_${tile.x}_${tile.y}`
    
    if (this.gradientCache.has(key)) {
      return this.gradientCache.get(key)
    }
    
    const gradient = ctx.createLinearGradient(
      tile.x, tile.y,
      tile.x + tile.width, tile.y + tile.height
    )
    
    const colors = config.gradient || [config.base]
    colors.forEach((color, index) => {
      gradient.addColorStop(index / (colors.length - 1), color)
    })
    
    this.gradientCache.set(key, gradient)
    return gradient
  }
  
  /**
   * Apply texture patterns to terrain
   */
  applyPattern(ctx, tile, config) {
    // For animated patterns, always redraw
    const animatedPatterns = ['waves', 'flow', 'grass', 'tallgrass', 'dunes']
    const isAnimated = animatedPatterns.includes(config.pattern)
    
    // Try to use cached pattern for static patterns
    if (!isAnimated) {
      const patternKey = `${config.pattern}_${tile.type}`
      if (this.patternCache.has(patternKey)) {
        const pattern = this.patternCache.get(patternKey)
        ctx.save()
        ctx.globalAlpha = 0.3
        ctx.fillStyle = pattern
        ctx.fillRect(tile.x, tile.y, tile.width, tile.height)
        ctx.restore()
        return
      }
    }
    
    ctx.save()
    ctx.globalAlpha = 0.3
    
    switch (config.pattern) {
      case 'waves':
        this.drawWavePattern(ctx, tile)
        break
      case 'flow':
        this.drawFlowPattern(ctx, tile)
        break
      case 'grass':
        this.drawGrassPattern(ctx, tile)
        break
      case 'tallgrass':
        this.drawTallGrassPattern(ctx, tile)
        break
      case 'trees':
        this.drawTreePattern(ctx, tile)
        break
      case 'conifers':
        this.drawConiferPattern(ctx, tile)
        break
      case 'rocks':
        this.drawRockPattern(ctx, tile)
        break
      case 'boulders':
        this.drawBoulderPattern(ctx, tile)
        break
      case 'dots':
        this.drawDotPattern(ctx, tile)
        break
      case 'dunes':
        this.drawDunePattern(ctx, tile)
        break
    }
    
    ctx.restore()
  }
  
  /**
   * Draw wave pattern for water
   */
  drawWavePattern(ctx, tile) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 1
    
    for (let y = 0; y < tile.height; y += 8) {
      ctx.beginPath()
      ctx.moveTo(tile.x, tile.y + y)
      
      for (let x = 0; x <= tile.width; x += 4) {
        const waveY = y + Math.sin((x + this.waveOffset) * 0.1) * 2
        ctx.lineTo(tile.x + x, tile.y + waveY)
      }
      
      ctx.stroke()
    }
  }
  
  /**
   * Draw flowing water pattern
   */
  drawFlowPattern(ctx, tile) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 2
    
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      const startY = tile.y + Math.random() * tile.height
      ctx.moveTo(tile.x, startY)
      
      const controlX = tile.x + tile.width / 2 + Math.sin(this.animationTime * 0.001 + i) * 10
      const controlY = startY + Math.random() * 20 - 10
      
      ctx.quadraticCurveTo(
        controlX, controlY,
        tile.x + tile.width, startY + Math.random() * 20 - 10
      )
      ctx.stroke()
    }
  }
  
  /**
   * Draw grass pattern
   */
  drawGrassPattern(ctx, tile) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.lineWidth = 1
    
    for (let i = 0; i < 20; i++) {
      const x = tile.x + Math.random() * tile.width
      const y = tile.y + Math.random() * tile.height
      const height = 3 + Math.random() * 3
      const sway = Math.sin(this.swayOffset + x * 0.01) * 1
      
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + sway, y - height)
      ctx.stroke()
    }
  }
  
  /**
   * Draw tree pattern for forests
   */
  drawTreePattern(ctx, tile) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    
    for (let i = 0; i < 5; i++) {
      const x = tile.x + Math.random() * tile.width
      const y = tile.y + Math.random() * tile.height
      const size = 4 + Math.random() * 4
      
      // Tree crown
      ctx.beginPath()
      ctx.arc(x, y - size, size, 0, Math.PI * 2)
      ctx.fill()
      
      // Tree trunk
      ctx.fillRect(x - 1, y - size, 2, size)
    }
  }
  
  /**
   * Draw tall grass pattern
   */
  drawTallGrassPattern(ctx, tile) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.lineWidth = 1.5
    
    for (let i = 0; i < 30; i++) {
      const x = tile.x + Math.random() * tile.width
      const y = tile.y + Math.random() * tile.height
      const height = 5 + Math.random() * 5
      const sway = Math.sin(this.swayOffset + x * 0.01) * 2
      
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(
        x + sway / 2, y - height / 2,
        x + sway, y - height
      )
      ctx.stroke()
    }
  }
  
  /**
   * Draw conifer pattern
   */
  drawConiferPattern(ctx, tile) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
    
    for (let i = 0; i < 4; i++) {
      const x = tile.x + Math.random() * tile.width
      const y = tile.y + Math.random() * tile.height
      const size = 5 + Math.random() * 3
      
      // Conifer shape
      ctx.beginPath()
      ctx.moveTo(x, y - size * 2)
      ctx.lineTo(x - size, y)
      ctx.lineTo(x + size, y)
      ctx.closePath()
      ctx.fill()
    }
  }
  
  /**
   * Draw boulder pattern
   */
  drawBoulderPattern(ctx, tile) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.lineWidth = 0.5
    
    for (let i = 0; i < 5; i++) {
      const x = tile.x + Math.random() * tile.width
      const y = tile.y + Math.random() * tile.height
      const w = 6 + Math.random() * 8
      const h = 4 + Math.random() * 6
      
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(Math.random() * Math.PI)
      
      ctx.beginPath()
      ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      
      ctx.restore()
    }
  }
  
  /**
   * Draw dot pattern for sand
   */
  drawDotPattern(ctx, tile) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
    
    for (let x = tile.x; x < tile.x + tile.width; x += 4) {
      for (let y = tile.y; y < tile.y + tile.height; y += 4) {
        if (Math.random() > 0.5) {
          ctx.fillRect(x, y, 1, 1)
        }
      }
    }
  }
  
  /**
   * Draw dune pattern for desert
   */
  drawDunePattern(ctx, tile) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.lineWidth = 2
    
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      const startY = tile.y + (i + 1) * (tile.height / 4)
      ctx.moveTo(tile.x, startY)
      
      for (let x = 0; x <= tile.width; x += 10) {
        const duneY = startY + Math.sin((x + this.animationTime * 0.0001) * 0.1) * 3
        ctx.lineTo(tile.x + x, duneY)
      }
      
      ctx.stroke()
    }
  }
  
  /**
   * Draw rock pattern
   */
  drawRockPattern(ctx, tile) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    
    for (let i = 0; i < 8; i++) {
      const x = tile.x + Math.random() * tile.width
      const y = tile.y + Math.random() * tile.height
      const w = 3 + Math.random() * 5
      const h = 2 + Math.random() * 3
      
      ctx.beginPath()
      ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  
  /**
   * Apply elevation-based shading
   */
  applyElevationShading(ctx, tile) {
    ctx.save()
    
    if (tile.elevation > 0.7) {
      // Highlight for high elevation
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.fillRect(tile.x, tile.y, tile.width, tile.height)
    } else if (tile.elevation < 0.3) {
      // Shadow for low elevation
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(tile.x, tile.y, tile.width, tile.height)
    }
    
    // Edge shadows for depth
    if (tile.elevation > 0.5) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      ctx.fillRect(tile.x + tile.width - 2, tile.y + 2, 2, tile.height)
      ctx.fillRect(tile.x + 2, tile.y + tile.height - 2, tile.width, 2)
    }
    
    ctx.restore()
  }
  
  /**
   * Apply special effects based on terrain type
   */
  applySpecialEffects(ctx, tile, config) {
    ctx.save()
    
    // Snow effect
    if (config.snow) {
      ctx.fillStyle = `rgba(255, 255, 255, ${config.snow * 0.3})`
      ctx.fillRect(tile.x, tile.y, tile.width, tile.height)
      
      // Snow sparkles
      if (config.sparkle) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        for (let i = 0; i < 3; i++) {
          const x = tile.x + Math.random() * tile.width
          const y = tile.y + Math.random() * tile.height
          const sparkle = Math.sin(this.animationTime * 0.01 + x + y) * 0.5 + 0.5
          ctx.globalAlpha = sparkle
          ctx.fillRect(x, y, 1, 1)
        }
      }
    }
    
    // Heat shimmer effect
    if (config.heat) {
      const shimmer = Math.sin(this.animationTime * 0.005 + tile.x * 0.01) * 0.1
      ctx.fillStyle = `rgba(255, 200, 0, ${Math.abs(shimmer)})`
      ctx.fillRect(tile.x, tile.y, tile.width, tile.height)
    }
    
    // Mist effect
    if (config.mist) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
      const mistY = tile.y + Math.sin(this.animationTime * 0.001 + tile.x * 0.01) * 5
      ctx.fillRect(tile.x, mistY, tile.width, tile.height * 0.3)
    }
    
    ctx.restore()
  }
  
  /**
   * Render smooth transitions between terrain types
   */
  renderTerrainBlending(ctx, terrain) {
    ctx.save()
    ctx.globalAlpha = 0.3
    
    terrain.forEach(tile => {
      // Check adjacent tiles
      const neighbors = this.getNeighbors(tile, terrain)
      
      neighbors.forEach(neighbor => {
        if (neighbor.type !== tile.type) {
          // Create gradient transition
          const gradient = ctx.createLinearGradient(
            tile.x + tile.width / 2, tile.y + tile.height / 2,
            neighbor.x + neighbor.width / 2, neighbor.y + neighbor.height / 2
          )
          
          const tileColor = this.terrainColors[tile.type]?.base || '#666666'
          const neighborColor = this.terrainColors[neighbor.type]?.base || '#666666'
          
          gradient.addColorStop(0, tileColor)
          gradient.addColorStop(1, neighborColor)
          
          ctx.fillStyle = gradient
          
          // Draw blending area
          const blendX = Math.min(tile.x, neighbor.x)
          const blendY = Math.min(tile.y, neighbor.y)
          const blendW = Math.abs(tile.x - neighbor.x) + tile.width
          const blendH = Math.abs(tile.y - neighbor.y) + tile.height
          
          ctx.fillRect(blendX, blendY, blendW, blendH)
        }
      })
    })
    
    ctx.restore()
  }
  
  /**
   * Get neighboring tiles
   */
  getNeighbors(tile, terrain) {
    const neighbors = []
    const offsets = [
      { dx: -tile.width, dy: 0 },
      { dx: tile.width, dy: 0 },
      { dx: 0, dy: -tile.height },
      { dx: 0, dy: tile.height }
    ]
    
    offsets.forEach(({ dx, dy }) => {
      const neighbor = terrain.find(t => 
        t.x === tile.x + dx && t.y === tile.y + dy
      )
      if (neighbor) {
        neighbors.push(neighbor)
      }
    })
    
    return neighbors
  }
  
  /**
   * Render ambient effects like cloud shadows
   */
  renderAmbientEffects(ctx, terrain) {
    ctx.save()
    
    // Cloud shadows
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
    
    for (let i = 0; i < 5; i++) {
      const x = (this.cloudOffset + i * 200) % 2000 - 200
      const y = Math.sin(i) * 100 + i * 50
      const w = 150 + Math.sin(i * 2) * 50
      const h = 80 + Math.cos(i * 2) * 30
      
      ctx.beginPath()
      ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.restore()
  }
  
  /**
   * Generate noise for organic terrain appearance
   */
  generateNoise(x, y, scale = 0.01, octaves = 3) {
    let value = 0
    let amplitude = 1
    let frequency = scale
    let maxValue = 0
    
    for (let i = 0; i < octaves; i++) {
      value += Math.sin(x * frequency) * Math.cos(y * frequency) * amplitude
      maxValue += amplitude
      amplitude *= 0.5
      frequency *= 2
    }
    
    return value / maxValue
  }
  
  /**
   * Apply noise-based texture variation
   */
  applyNoiseTexture(ctx, tile, intensity = 0.1) {
    ctx.save()
    
    const imageData = ctx.getImageData(tile.x, tile.y, tile.width, tile.height)
    const data = imageData.data
    
    for (let y = 0; y < tile.height; y++) {
      for (let x = 0; x < tile.width; x++) {
        const noise = this.generateNoise(tile.x + x, tile.y + y) * intensity
        const index = (y * tile.width + x) * 4
        
        // Apply noise to RGB channels
        data[index] = Math.max(0, Math.min(255, data[index] + noise * 255))
        data[index + 1] = Math.max(0, Math.min(255, data[index + 1] + noise * 255))
        data[index + 2] = Math.max(0, Math.min(255, data[index + 2] + noise * 255))
      }
    }
    
    ctx.putImageData(imageData, tile.x, tile.y)
    ctx.restore()
  }
  
  /**
   * Clear caches when needed
   */
  clearCaches() {
    this.patternCache.clear()
    this.gradientCache.clear()
  }
}