/**
 * VillagerRenderer.js - Advanced sprite-based villager rendering system
 * Features animated sprites, emotions, and visual feedback
 */

export class VillagerRenderer {
  constructor() {
    // Color schemes for different player types
    this.colorSchemes = {
      human: {
        skin: '#f4d1ae',
        hair: '#4a3c2a',
        clothes: '#2563eb',
        accent: '#ffd700'
      },
      ai: {
        skin: '#e8c5a8',
        hair: '#2c1810',
        clothes: '#dc2626',
        accent: '#ff4444'
      }
    }
    
    // Animation frame definitions
    this.animations = {
      idle: {
        frames: 4,
        duration: 2000, // milliseconds for full cycle
        breathingAmplitude: 0.5
      },
      walking: {
        frames: 8,
        duration: 600,
        legSwing: 15 // degrees
      },
      working: {
        frames: 6,
        duration: 800,
        toolSwing: 30
      }
    }
    
    // Emotion bubble definitions
    this.emotionBubbles = {
      happy: { icon: '😊', color: '#10b981' },
      sad: { icon: '😢', color: '#3b82f6' },
      angry: { icon: '😠', color: '#ef4444' },
      tired: { icon: '😴', color: '#6b7280' },
      hungry: { icon: '🍞', color: '#f59e0b' },
      love: { icon: '❤️', color: '#ec4899' }
    }
    
    // Cache for pre-rendered sprites
    this.spriteCache = new Map()
  }
  
  /**
   * Main render function for a single villager
   */
  renderVillager(ctx, villager, player, camera, gameTime) {
    const x = Math.floor(villager.x)
    const y = Math.floor(villager.y)
    
    // Skip if off-screen (only if camera info is provided)
    if (camera && !this.isOnScreen(x, y, camera)) return
    
    // Get color scheme based on player type
    const colors = this.colorSchemes[player.type] || this.colorSchemes.human
    
    // Calculate animation frame
    const animState = this.getAnimationState(villager, gameTime)
    
    // Draw shadow
    this.drawShadow(ctx, x, y, animState)
    
    // Draw selection ring if selected
    if (villager.selected) {
      this.drawSelectionRing(ctx, x, y, player.color)
    }
    
    // Draw villager body parts
    this.drawVillagerBody(ctx, x, y, villager, colors, animState)
    
    // Draw emotion bubble if any
    if (villager.emotion) {
      this.drawEmotionBubble(ctx, x, y, villager.emotion)
    }
    
    // Draw speech bubble if any
    if (villager.speechBubble && villager.speechBubbleTimer > 0) {
      this.drawSpeechBubble(ctx, x, y, villager.speechBubble)
      villager.speechBubbleTimer--
    }
    
    // Draw health/hunger bars
    this.drawStatusBars(ctx, x, y, villager)
    
    // Draw work progress if working
    if (villager.state === 'working' && villager.workProgress) {
      this.drawWorkProgress(ctx, x, y, villager.workProgress)
    }
  }
  
  /**
   * Get current animation state based on villager state and time
   */
  getAnimationState(villager, gameTime) {
    const state = {
      type: 'idle',
      frame: 0,
      progress: 0,
      direction: this.getDirection(villager.vx, villager.vy)
    }
    
    // Determine animation type
    if (Math.abs(villager.vx) > 0.1 || Math.abs(villager.vy) > 0.1) {
      state.type = 'walking'
    } else if (villager.state === 'working') {
      state.type = 'working'
    }
    
    // Calculate animation progress
    const anim = this.animations[state.type]
    state.progress = (gameTime % anim.duration) / anim.duration
    state.frame = Math.floor(state.progress * anim.frames)
    
    return state
  }
  
  /**
   * Get 8-directional facing based on velocity
   */
  getDirection(vx, vy) {
    if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1) {
      return 'south' // Default facing
    }
    
    const angle = Math.atan2(vy, vx) * 180 / Math.PI
    
    if (angle >= -22.5 && angle < 22.5) return 'east'
    if (angle >= 22.5 && angle < 67.5) return 'southeast'
    if (angle >= 67.5 && angle < 112.5) return 'south'
    if (angle >= 112.5 && angle < 157.5) return 'southwest'
    if (angle >= 157.5 || angle < -157.5) return 'west'
    if (angle >= -157.5 && angle < -112.5) return 'northwest'
    if (angle >= -112.5 && angle < -67.5) return 'north'
    return 'northeast'
  }
  
  /**
   * Draw villager shadow
   */
  drawShadow(ctx, x, y, animState) {
    ctx.save()
    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#000000'
    
    // Shadow gets smaller when jumping/working
    const scale = animState.type === 'working' ? 0.8 : 1.0
    ctx.beginPath()
    ctx.ellipse(x, y + 8, 6 * scale, 3 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  
  /**
   * Draw selection ring around selected villager
   */
  drawSelectionRing(ctx, x, y, playerColor) {
    ctx.save()
    ctx.strokeStyle = playerColor
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.8 + Math.sin(Date.now() * 0.005) * 0.2
    
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.stroke()
    
    // Add corner markers
    ctx.lineWidth = 3
    const size = 15
    const gap = 5
    
    // Top left
    ctx.beginPath()
    ctx.moveTo(x - size, y - size + gap)
    ctx.lineTo(x - size, y - size)
    ctx.lineTo(x - size + gap, y - size)
    ctx.stroke()
    
    // Top right
    ctx.beginPath()
    ctx.moveTo(x + size - gap, y - size)
    ctx.lineTo(x + size, y - size)
    ctx.lineTo(x + size, y - size + gap)
    ctx.stroke()
    
    // Bottom left
    ctx.beginPath()
    ctx.moveTo(x - size, y + size - gap)
    ctx.lineTo(x - size, y + size)
    ctx.lineTo(x - size + gap, y + size)
    ctx.stroke()
    
    // Bottom right
    ctx.beginPath()
    ctx.moveTo(x + size - gap, y + size)
    ctx.lineTo(x + size, y + size)
    ctx.lineTo(x + size, y + size - gap)
    ctx.stroke()
    
    ctx.restore()
  }
  
  /**
   * Draw the main villager body with animation
   */
  drawVillagerBody(ctx, x, y, villager, colors, animState) {
    ctx.save()
    
    // Apply breathing animation for idle
    let breathOffset = 0
    if (animState.type === 'idle') {
      breathOffset = Math.sin(animState.progress * Math.PI * 2) * this.animations.idle.breathingAmplitude
    }
    
    // Draw body
    ctx.fillStyle = colors.clothes
    const bodyY = y - 5 + breathOffset
    ctx.fillRect(x - 4, bodyY, 8, 10)
    
    // Draw head
    ctx.fillStyle = colors.skin
    const headY = y - 12 + breathOffset
    ctx.beginPath()
    ctx.arc(x, headY, 5, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw hair
    ctx.fillStyle = colors.hair
    ctx.beginPath()
    ctx.arc(x, headY - 2, 5, Math.PI, 0)
    ctx.fill()
    
    // Draw simple face based on direction
    this.drawFace(ctx, x, headY, animState.direction, villager)
    
    // Draw arms
    if (animState.type === 'working') {
      this.drawWorkingArms(ctx, x, bodyY, colors.skin, animState.progress)
    } else {
      this.drawArms(ctx, x, bodyY, colors.skin, animState)
    }
    
    // Draw legs with walking animation
    this.drawLegs(ctx, x, y, colors.clothes, animState)
    
    ctx.restore()
  }
  
  /**
   * Draw simple face features
   */
  drawFace(ctx, x, y, direction, villager) {
    ctx.fillStyle = '#000000'
    
    // Simplified face - just dots for eyes
    if (direction !== 'north' && direction !== 'northwest' && direction !== 'northeast') {
      // Eyes
      ctx.beginPath()
      ctx.arc(x - 2, y, 0.5, 0, Math.PI * 2)
      ctx.arc(x + 2, y, 0.5, 0, Math.PI * 2)
      ctx.fill()
      
      // Blink occasionally
      if (Math.random() < 0.01) {
        villager.blinking = true
        villager.blinkTime = 100
      }
      
      if (villager.blinking) {
        ctx.fillStyle = villager.colors?.skin || '#f4d1ae'
        ctx.fillRect(x - 3, y - 1, 6, 2)
        villager.blinkTime--
        if (villager.blinkTime <= 0) {
          villager.blinking = false
        }
      }
    }
  }
  
  /**
   * Draw arms with idle or walking swing
   */
  drawArms(ctx, x, bodyY, skinColor, animState) {
    ctx.fillStyle = skinColor
    
    let armSwing = 0
    if (animState.type === 'walking') {
      armSwing = Math.sin(animState.progress * Math.PI * 2) * 10
    }
    
    // Left arm
    ctx.save()
    ctx.translate(x - 4, bodyY + 3)
    ctx.rotate(armSwing * Math.PI / 180)
    ctx.fillRect(-1, 0, 2, 6)
    ctx.restore()
    
    // Right arm
    ctx.save()
    ctx.translate(x + 4, bodyY + 3)
    ctx.rotate(-armSwing * Math.PI / 180)
    ctx.fillRect(-1, 0, 2, 6)
    ctx.restore()
  }
  
  /**
   * Draw arms in working animation
   */
  drawWorkingArms(ctx, x, bodyY, skinColor, progress) {
    ctx.fillStyle = skinColor
    
    const swing = Math.sin(progress * Math.PI * 2) * this.animations.working.toolSwing
    
    // Both arms raised for working
    ctx.save()
    ctx.translate(x, bodyY + 3)
    ctx.rotate((swing - 45) * Math.PI / 180)
    ctx.fillRect(-1, 0, 2, 8)
    ctx.restore()
    
    // Draw simple tool
    ctx.fillStyle = '#8B4513'
    ctx.save()
    ctx.translate(x, bodyY - 2)
    ctx.rotate((swing - 45) * Math.PI / 180)
    ctx.fillRect(-1, -2, 2, 12)
    ctx.restore()
  }
  
  /**
   * Draw legs with walking animation
   */
  drawLegs(ctx, x, y, clothesColor, animState) {
    ctx.fillStyle = clothesColor
    
    if (animState.type === 'walking') {
      const legSwing = Math.sin(animState.progress * Math.PI * 4) * this.animations.walking.legSwing
      
      // Left leg
      ctx.save()
      ctx.translate(x - 2, y)
      ctx.rotate(legSwing * Math.PI / 180)
      ctx.fillRect(-1, 0, 2, 6)
      ctx.restore()
      
      // Right leg
      ctx.save()
      ctx.translate(x + 2, y)
      ctx.rotate(-legSwing * Math.PI / 180)
      ctx.fillRect(-1, 0, 2, 6)
      ctx.restore()
    } else {
      // Static legs
      ctx.fillRect(x - 3, y, 2, 6)
      ctx.fillRect(x + 1, y, 2, 6)
    }
  }
  
  /**
   * Draw emotion bubble above villager
   */
  drawEmotionBubble(ctx, x, y, emotion) {
    const bubble = this.emotionBubbles[emotion]
    if (!bubble) return
    
    const bubbleY = y - 25
    
    // Draw bubble background
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = bubble.color
    ctx.lineWidth = 2
    
    ctx.beginPath()
    ctx.arc(x, bubbleY, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    
    // Draw tail
    ctx.beginPath()
    ctx.moveTo(x - 3, bubbleY + 6)
    ctx.lineTo(x, bubbleY + 10)
    ctx.lineTo(x + 3, bubbleY + 6)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    
    // Draw emotion icon (simplified)
    ctx.fillStyle = bubble.color
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(bubble.icon, x, bubbleY)
  }
  
  /**
   * Draw health and hunger bars
   */
  drawStatusBars(ctx, x, y, villager) {
    const barWidth = 20
    const barHeight = 3
    const barY = y - 20
    
    // Health bar
    ctx.fillStyle = '#000000'
    ctx.fillRect(x - barWidth/2 - 1, barY - 1, barWidth + 2, barHeight + 2)
    
    const healthPercent = villager.health / 100
    const healthColor = healthPercent > 0.7 ? '#10b981' : 
                       healthPercent > 0.3 ? '#f59e0b' : '#ef4444'
    
    ctx.fillStyle = healthColor
    ctx.fillRect(x - barWidth/2, barY, barWidth * healthPercent, barHeight)
    
    // Hunger bar (if applicable)
    if (villager.hunger !== undefined) {
      const hungerY = barY + barHeight + 2
      ctx.fillStyle = '#000000'
      ctx.fillRect(x - barWidth/2 - 1, hungerY - 1, barWidth + 2, barHeight + 2)
      
      const hungerPercent = villager.hunger / 100
      const hungerColor = hungerPercent > 0.7 ? '#f59e0b' : 
                         hungerPercent > 0.3 ? '#f97316' : '#dc2626'
      
      ctx.fillStyle = hungerColor
      ctx.fillRect(x - barWidth/2, hungerY, barWidth * hungerPercent, barHeight)
    }
  }
  
  /**
   * Draw work progress indicator
   */
  drawWorkProgress(ctx, x, y, progress) {
    const radius = 15
    const startAngle = -Math.PI / 2
    const endAngle = startAngle + (Math.PI * 2 * progress)
    
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    
    ctx.beginPath()
    ctx.arc(x, y, radius, startAngle, endAngle)
    ctx.stroke()
  }
  
  /**
   * Draw speech bubble with text
   */
  drawSpeechBubble(ctx, x, y, text) {
    const bubbleY = y - 35
    const padding = 8
    const maxWidth = 100
    
    // Measure text
    ctx.font = '10px Arial'
    const metrics = ctx.measureText(text)
    const textWidth = Math.min(metrics.width, maxWidth)
    const bubbleWidth = textWidth + padding * 2
    const bubbleHeight = 20
    
    // Draw bubble background
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#333333'
    ctx.lineWidth = 2
    
    // Rounded rectangle
    const radius = 8
    ctx.beginPath()
    ctx.moveTo(x - bubbleWidth/2 + radius, bubbleY - bubbleHeight/2)
    ctx.arcTo(x + bubbleWidth/2, bubbleY - bubbleHeight/2, x + bubbleWidth/2, bubbleY + bubbleHeight/2, radius)
    ctx.arcTo(x + bubbleWidth/2, bubbleY + bubbleHeight/2, x - bubbleWidth/2, bubbleY + bubbleHeight/2, radius)
    ctx.arcTo(x - bubbleWidth/2, bubbleY + bubbleHeight/2, x - bubbleWidth/2, bubbleY - bubbleHeight/2, radius)
    ctx.arcTo(x - bubbleWidth/2, bubbleY - bubbleHeight/2, x + bubbleWidth/2, bubbleY - bubbleHeight/2, radius)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    
    // Draw tail
    ctx.beginPath()
    ctx.moveTo(x - 5, bubbleY + bubbleHeight/2 - 2)
    ctx.lineTo(x, bubbleY + bubbleHeight/2 + 8)
    ctx.lineTo(x + 5, bubbleY + bubbleHeight/2 - 2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    
    // Draw text
    ctx.fillStyle = '#333333'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x, bubbleY, maxWidth)
  }
  
  /**
   * Check if position is visible on screen
   */
  isOnScreen(x, y, camera) {
    if (!camera) return true // If no camera info, assume on screen
    
    const buffer = 50
    const screenWidth = camera.width || 1200 // Default canvas width
    const screenHeight = camera.height || 800 // Default canvas height
    const zoom = camera.zoom || 1
    
    return x > camera.x - buffer && 
           x < camera.x + screenWidth / zoom + buffer &&
           y > camera.y - buffer && 
           y < camera.y + screenHeight / zoom + buffer
  }
  
  /**
   * Batch render all villagers for a player
   */
  renderAllVillagers(ctx, player, camera, gameTime) {
    // Sort villagers by Y position for proper depth ordering
    const sortedVillagers = [...player.villagers].sort((a, b) => a.y - b.y)
    
    sortedVillagers.forEach(villager => {
      this.renderVillager(ctx, villager, player, camera, gameTime)
    })
  }
  
  /**
   * Render path visualization for selected villager
   */
  renderVillagerPath(ctx, villager) {
    if (!villager.selected || !villager.path || villager.path.length === 0) return
    
    ctx.save()
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.globalAlpha = 0.6
    
    ctx.beginPath()
    ctx.moveTo(villager.x, villager.y)
    
    for (let i = villager.pathIndex || 0; i < villager.path.length; i++) {
      const node = villager.path[i]
      ctx.lineTo(node.x, node.y)
    }
    
    ctx.stroke()
    
    // Draw waypoints
    ctx.fillStyle = '#3b82f6'
    ctx.globalAlpha = 0.8
    for (let i = villager.pathIndex || 0; i < villager.path.length; i++) {
      const node = villager.path[i]
      ctx.beginPath()
      ctx.arc(node.x, node.y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.restore()
  }
}

// Export singleton instance
export const villagerRenderer = new VillagerRenderer()