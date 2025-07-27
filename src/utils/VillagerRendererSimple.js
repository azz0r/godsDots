/**
 * Simplified villager renderer for better visibility and performance
 */
export class VillagerRendererSimple {
  constructor() {
    // High contrast colors for each player
    this.playerColors = {
      human: {
        main: '#FFD700',       // Gold
        outline: '#B8860B',    // Dark gold
        selected: '#FFFFFF'    // White
      },
      ai: {
        0: {
          main: '#FF4444',     // Red
          outline: '#CC0000',  // Dark red
          selected: '#FFAAAA'  // Light red
        },
        1: {
          main: '#4444FF',     // Blue
          outline: '#0000CC',  // Dark blue
          selected: '#AAAAFF'  // Light blue
        },
        2: {
          main: '#44FF44',     // Green
          outline: '#00CC00',  // Dark green
          selected: '#AAFFAA'  // Light green
        }
      }
    }
  }
  
  /**
   * Render a single villager with simple, clear visuals
   */
  renderVillager(ctx, villager, player, camera, gameTime) {
    const x = Math.floor(villager.x)
    const y = Math.floor(villager.y)
    
    // Get colors for this player
    const colors = player.type === 'human' 
      ? this.playerColors.human
      : this.playerColors.ai[player.id % 3] || this.playerColors.ai[0]
    
    // Simple circle for the villager
    const size = villager.selected ? 8 : 6
    
    // Draw outline for visibility
    ctx.strokeStyle = colors.outline
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, size + 1, 0, Math.PI * 2)
    ctx.stroke()
    
    // Fill with player color
    ctx.fillStyle = colors.main
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
    
    // Selection indicator
    if (villager.selected) {
      ctx.strokeStyle = colors.selected
      ctx.lineWidth = 2
      ctx.setLineDash([5, 3])
      ctx.beginPath()
      ctx.arc(x, y, size + 6, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
    
    // Simple status indicators
    this.drawSimpleStatus(ctx, x, y, villager)
    
    // Direction indicator (small line showing movement)
    if (Math.abs(villager.vx) > 0.1 || Math.abs(villager.vy) > 0.1) {
      const angle = Math.atan2(villager.vy, villager.vx)
      const lineLength = 8
      ctx.strokeStyle = colors.outline
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(
        x + Math.cos(angle) * lineLength,
        y + Math.sin(angle) * lineLength
      )
      ctx.stroke()
    }
  }
  
  /**
   * Draw simple status bars
   */
  drawSimpleStatus(ctx, x, y, villager) {
    const barWidth = 20
    const barHeight = 3
    const barY = y - 15
    
    // Only show health if damaged
    if (villager.health < 100) {
      // Health bar background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(x - barWidth/2, barY, barWidth, barHeight)
      
      // Health bar fill
      const healthPercent = villager.health / 100
      const healthColor = healthPercent > 0.5 ? '#00FF00' : 
                         healthPercent > 0.25 ? '#FFFF00' : '#FF0000'
      ctx.fillStyle = healthColor
      ctx.fillRect(x - barWidth/2, barY, barWidth * healthPercent, barHeight)
    }
    
    // Task indicator (simple icon above head)
    if (villager.task && villager.task !== 'idle') {
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      const taskIcon = this.getTaskIcon(villager.task)
      ctx.fillStyle = '#FFFFFF'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3
      ctx.strokeText(taskIcon, x, y - 18)
      ctx.fillText(taskIcon, x, y - 18)
    }
  }
  
  /**
   * Get simple icon for task
   */
  getTaskIcon(task) {
    switch(task) {
      case 'harvesting': return '🌲'
      case 'building': return '🔨'
      case 'farming': return '🌾'
      case 'praying': return '🙏'
      case 'fleeing': return '!'
      default: return ''
    }
  }
  
  /**
   * Render all villagers for a player
   */
  renderAllVillagers(ctx, player, camera, gameTime) {
    player.villagers.forEach(villager => {
      this.renderVillager(ctx, villager, player, camera, gameTime)
    })
  }
  
  /**
   * Render villager path (simplified)
   */
  renderVillagerPath(ctx, villager) {
    if (!villager.path || villager.path.length < 2) return
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    
    ctx.beginPath()
    ctx.moveTo(villager.x, villager.y)
    
    for (let i = villager.pathIndex; i < villager.path.length; i++) {
      const node = villager.path[i]
      ctx.lineTo(node.x, node.y)
    }
    
    ctx.stroke()
    ctx.setLineDash([])
  }
}

// Export singleton instance
export const villagerRendererSimple = new VillagerRendererSimple()