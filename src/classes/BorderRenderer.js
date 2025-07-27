export class BorderRenderer {
  constructor() {
    this.animationTime = 0
    this.selectedPlots = new Set()
    this.hoveredPlot = null
    
    // Animation settings
    this.glowAnimation = {
      speed: 0.05,
      minAlpha: 0.3,
      maxAlpha: 0.8
    }
    
    // Style presets
    this.borderStyles = {
      default: {
        color: '#4a5568',
        width: 1,
        alpha: 0.6
      },
      owned: {
        color: '#48bb78',
        width: 2,
        alpha: 0.8
      },
      selected: {
        color: '#ffd700',
        width: 3,
        alpha: 1,
        glow: true
      },
      hovered: {
        color: '#ffffff',
        width: 2,
        alpha: 0.9,
        dashPattern: [5, 3]
      },
      water: {
        color: '#2b6cb4',
        width: 2,
        alpha: 0.7,
        animated: true
      },
      road: {
        color: '#718096',
        width: 1,
        alpha: 0.5,
        dashPattern: [10, 5]
      },
      forest: {
        color: '#2d4a3a',
        width: 2,
        alpha: 0.6
      },
      restricted: {
        color: '#e53e3e',
        width: 3,
        alpha: 0.8,
        dashPattern: [8, 4]
      }
    }
  }
  
  update(deltaTime) {
    this.animationTime += deltaTime * this.glowAnimation.speed
  }
  
  renderBorders(ctx, plots, camera = { x: 0, y: 0, zoom: 1 }) {
    // Save context state
    ctx.save()
    
    // Apply camera transform (scale first, then translate)
    ctx.scale(camera.zoom, camera.zoom)
    ctx.translate(-camera.x, -camera.y)
    
    // Group plots by type for batch rendering
    const plotsByType = this.groupPlotsByType(plots)
    
    // Render each type group
    Object.entries(plotsByType).forEach(([type, typePlots]) => {
      this.renderPlotGroup(ctx, typePlots, type)
    })
    
    // Render selected plots on top
    if (this.selectedPlots.size > 0) {
      plots.forEach(plot => {
        if (this.selectedPlots.has(plot.id)) {
          this.renderSelectedPlot(ctx, plot)
        }
      })
    }
    
    // Render hovered plot on very top
    if (this.hoveredPlot) {
      const hoveredPlotObj = plots.find(p => p.id === this.hoveredPlot)
      if (hoveredPlotObj) {
        this.renderHoveredPlot(ctx, hoveredPlotObj)
      }
    }
    
    // Restore context state
    ctx.restore()
  }
  
  renderPlotGroup(ctx, plots, type) {
    plots.forEach(plot => {
      // Skip if selected or hovered (rendered separately)
      if (this.selectedPlots.has(plot.id) || plot.id === this.hoveredPlot) {
        return
      }
      
      // Determine style based on plot state and type
      let style = this.borderStyles[type] || this.borderStyles.default
      if (plot.owner) {
        style = { ...style, ...this.borderStyles.owned }
      }
      
      this.drawPlotBorder(ctx, plot, style)
    })
  }
  
  renderSelectedPlot(ctx, plot) {
    const style = this.borderStyles.selected
    
    // Draw glow effect
    if (style.glow) {
      this.drawGlowEffect(ctx, plot, style)
    }
    
    // Draw main border
    this.drawPlotBorder(ctx, plot, style)
  }
  
  renderHoveredPlot(ctx, plot) {
    const style = this.borderStyles.hovered
    this.drawPlotBorder(ctx, plot, style)
  }
  
  drawPlotBorder(ctx, plot, style) {
    ctx.strokeStyle = style.color
    ctx.lineWidth = style.width
    ctx.globalAlpha = style.alpha || 1
    
    // Set dash pattern if specified
    if (style.dashPattern) {
      ctx.setLineDash(style.dashPattern)
    } else {
      ctx.setLineDash([])
    }
    
    // Check for seamless borders with neighbors
    const seamlessEdges = this.getSeamlessEdges(plot)
    
    // Draw border segments
    ctx.beginPath()
    
    // Top edge
    if (!seamlessEdges.north) {
      ctx.moveTo(plot.x, plot.y)
      ctx.lineTo(plot.x + plot.width, plot.y)
    }
    
    // Right edge
    if (!seamlessEdges.east) {
      ctx.moveTo(plot.x + plot.width, plot.y)
      ctx.lineTo(plot.x + plot.width, plot.y + plot.height)
    }
    
    // Bottom edge
    if (!seamlessEdges.south) {
      ctx.moveTo(plot.x + plot.width, plot.y + plot.height)
      ctx.lineTo(plot.x, plot.y + plot.height)
    }
    
    // Left edge
    if (!seamlessEdges.west) {
      ctx.moveTo(plot.x, plot.y + plot.height)
      ctx.lineTo(plot.x, plot.y)
    }
    
    ctx.stroke()
    
    // Draw corner indicators for owned plots
    if (plot.owner && !this.selectedPlots.has(plot.id)) {
      this.drawCornerIndicators(ctx, plot, style)
    }
    
    // Reset alpha
    ctx.globalAlpha = 1
    ctx.setLineDash([])
  }
  
  drawGlowEffect(ctx, plot, style) {
    const glowAlpha = this.calculateGlowAlpha()
    
    // Create gradient for glow
    const centerX = plot.x + plot.width / 2
    const centerY = plot.y + plot.height / 2
    const radius = Math.max(plot.width, plot.height) / 2
    
    const gradient = ctx.createRadialGradient(
      centerX, centerY, radius * 0.8,
      centerX, centerY, radius * 1.2
    )
    
    gradient.addColorStop(0, `rgba(255, 215, 0, ${glowAlpha * 0.3})`)
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)')
    
    ctx.fillStyle = gradient
    ctx.fillRect(
      plot.x - 10,
      plot.y - 10,
      plot.width + 20,
      plot.height + 20
    )
  }
  
  drawCornerIndicators(ctx, plot, style) {
    const cornerSize = 4
    ctx.fillStyle = style.color
    ctx.globalAlpha = style.alpha || 1
    
    // Top-left corner
    ctx.fillRect(plot.x - 1, plot.y - 1, cornerSize, cornerSize)
    
    // Top-right corner
    ctx.fillRect(plot.x + plot.width - cornerSize + 1, plot.y - 1, cornerSize, cornerSize)
    
    // Bottom-left corner
    ctx.fillRect(plot.x - 1, plot.y + plot.height - cornerSize + 1, cornerSize, cornerSize)
    
    // Bottom-right corner
    ctx.fillRect(
      plot.x + plot.width - cornerSize + 1,
      plot.y + plot.height - cornerSize + 1,
      cornerSize,
      cornerSize
    )
  }
  
  getSeamlessEdges(plot) {
    // This should be implemented with actual neighbor checking
    // For now, return no seamless edges
    return {
      north: false,
      south: false,
      east: false,
      west: false
    }
  }
  
  calculateGlowAlpha() {
    const normalized = (Math.sin(this.animationTime) + 1) / 2
    return this.glowAnimation.minAlpha + 
           (this.glowAnimation.maxAlpha - this.glowAnimation.minAlpha) * normalized
  }
  
  groupPlotsByType(plots) {
    const groups = {}
    
    plots.forEach(plot => {
      const type = plot.type || 'default'
      if (!groups[type]) {
        groups[type] = []
      }
      groups[type].push(plot)
    })
    
    return groups
  }
  
  selectPlot(plotId) {
    this.selectedPlots.add(plotId)
  }
  
  deselectPlot(plotId) {
    this.selectedPlots.delete(plotId)
  }
  
  clearSelection() {
    this.selectedPlots.clear()
  }
  
  setHoveredPlot(plotId) {
    this.hoveredPlot = plotId
  }
  
  renderPlotInfo(ctx, plot, x, y) {
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(x, y, 200, 100)
    
    // Border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, 200, 100)
    
    // Text
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px Arial'
    ctx.fillText(`Plot ID: ${plot.id}`, x + 10, y + 20)
    ctx.fillText(`Type: ${plot.type}`, x + 10, y + 40)
    ctx.fillText(`Owner: ${plot.owner || 'None'}`, x + 10, y + 60)
    ctx.fillText(`Size: ${plot.width}x${plot.height}`, x + 10, y + 80)
  }
  
  renderMinimap(ctx, plots, minimapBounds, worldBounds) {
    const scaleX = minimapBounds.width / worldBounds.width
    const scaleY = minimapBounds.height / worldBounds.height
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(minimapBounds.x, minimapBounds.y, minimapBounds.width, minimapBounds.height)
    
    // Border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(minimapBounds.x, minimapBounds.y, minimapBounds.width, minimapBounds.height)
    
    // Render plots
    plots.forEach(plot => {
      const x = minimapBounds.x + (plot.x * scaleX)
      const y = minimapBounds.y + (plot.y * scaleY)
      const width = plot.width * scaleX
      const height = plot.height * scaleY
      
      // Color based on type and ownership
      if (plot.owner) {
        ctx.fillStyle = '#48bb78'
      } else {
        const colors = {
          buildable: '#4a5568',
          water: '#2b6cb4',
          road: '#718096',
          forest: '#2d4a3a',
          restricted: '#e53e3e'
        }
        ctx.fillStyle = colors[plot.type] || '#4a5568'
      }
      
      ctx.globalAlpha = 0.7
      ctx.fillRect(x, y, width, height)
      
      // Highlight selected plots
      if (this.selectedPlots.has(plot.id)) {
        ctx.strokeStyle = '#ffd700'
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, width, height)
      }
    })
    
    ctx.globalAlpha = 1
  }
}