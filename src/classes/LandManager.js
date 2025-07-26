import { LandPlot } from './LandPlot.js'

export class LandManager {
  constructor(worldWidth, worldHeight, plotSize = 80) {
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
    this.plotSize = plotSize
    this.plots = new Map() // Key: "x,y", Value: LandPlot
    this.plotsById = new Map() // Key: id, Value: LandPlot
    this.plotIdCounter = 0
    
    // Grid dimensions
    this.gridWidth = Math.floor(worldWidth / plotSize)
    this.gridHeight = Math.floor(worldHeight / plotSize)
    
    // Ownership tracking
    this.ownershipMap = new Map() // Key: ownerId, Value: Set of plot IDs
    
    // Initialize the grid
    this.initializeGrid()
  }
  
  initializeGrid() {
    for (let gridX = 0; gridX < this.gridWidth; gridX++) {
      for (let gridY = 0; gridY < this.gridHeight; gridY++) {
        const x = gridX * this.plotSize
        const y = gridY * this.plotSize
        const id = this.plotIdCounter++
        
        const plot = new LandPlot(id, x, y, this.plotSize, this.plotSize)
        
        this.plots.set(`${gridX},${gridY}`, plot)
        this.plotsById.set(id, plot)
      }
    }
    
    // Set up neighbor relationships
    this.updateNeighborRelationships()
  }
  
  updateNeighborRelationships() {
    for (let gridX = 0; gridX < this.gridWidth; gridX++) {
      for (let gridY = 0; gridY < this.gridHeight; gridY++) {
        const plot = this.plots.get(`${gridX},${gridY}`)
        
        // North neighbor
        if (gridY > 0) {
          const northPlot = this.plots.get(`${gridX},${gridY - 1}`)
          if (northPlot) plot.setNeighbor('north', northPlot.id)
        }
        
        // South neighbor
        if (gridY < this.gridHeight - 1) {
          const southPlot = this.plots.get(`${gridX},${gridY + 1}`)
          if (southPlot) plot.setNeighbor('south', southPlot.id)
        }
        
        // East neighbor
        if (gridX < this.gridWidth - 1) {
          const eastPlot = this.plots.get(`${gridX + 1},${gridY}`)
          if (eastPlot) plot.setNeighbor('east', eastPlot.id)
        }
        
        // West neighbor
        if (gridX > 0) {
          const westPlot = this.plots.get(`${gridX - 1},${gridY}`)
          if (westPlot) plot.setNeighbor('west', westPlot.id)
        }
      }
    }
  }
  
  getPlotAt(x, y) {
    const gridX = Math.floor(x / this.plotSize)
    const gridY = Math.floor(y / this.plotSize)
    return this.plots.get(`${gridX},${gridY}`)
  }
  
  getPlotById(id) {
    return this.plotsById.get(id)
  }
  
  assignPlot(plotId, owner, ownerId) {
    const plot = this.plotsById.get(plotId)
    if (!plot) return { success: false, reason: 'Plot not found' }
    
    // Check for conflicts
    const conflicts = this.checkOwnershipConflicts(plot, ownerId)
    if (conflicts.length > 0) {
      return { success: false, reason: 'Ownership conflict', conflicts }
    }
    
    // Remove from previous owner if exists
    if (plot.ownerId) {
      const previousOwnerPlots = this.ownershipMap.get(plot.ownerId)
      if (previousOwnerPlots) {
        previousOwnerPlots.delete(plotId)
      }
    }
    
    // Assign to new owner
    if (plot.setOwner(owner, ownerId)) {
      if (!this.ownershipMap.has(ownerId)) {
        this.ownershipMap.set(ownerId, new Set())
      }
      this.ownershipMap.get(ownerId).add(plotId)
      
      return { success: true, plot }
    }
    
    return { success: false, reason: 'Plot is locked' }
  }
  
  checkOwnershipConflicts(plot, newOwnerId) {
    const conflicts = []
    
    // Check if neighboring plots have different owners
    Object.entries(plot.neighbors).forEach(([direction, neighborId]) => {
      if (neighborId) {
        const neighbor = this.plotsById.get(neighborId)
        if (neighbor && neighbor.ownerId && neighbor.ownerId !== newOwnerId) {
          // Allow different owners but track as potential conflict
          conflicts.push({
            type: 'boundary',
            direction,
            neighborId: neighbor.ownerId
          })
        }
      }
    })
    
    return conflicts
  }
  
  setPlotType(plotId, newType, terrainSystem) {
    const plot = this.plotsById.get(plotId)
    if (!plot) return false
    
    // If we have terrain system, check terrain compatibility
    if (terrainSystem) {
      const centerX = plot.x + plot.width / 2
      const centerY = plot.y + plot.height / 2
      const terrain = terrainSystem.getTerrainAt(centerX, centerY)
      
      // Enforce terrain-based restrictions
      if (terrain) {
        if (terrain.type === 'water' && newType !== 'water') {
          return false
        }
        if (terrain.type !== 'water' && newType === 'water') {
          return false
        }
      }
    }
    
    return plot.setType(newType)
  }
  
  mergePlots(plotIds) {
    if (plotIds.length < 2) return { success: false, reason: 'Need at least 2 plots to merge' }
    
    const plots = plotIds.map(id => this.plotsById.get(id)).filter(Boolean)
    if (plots.length !== plotIds.length) {
      return { success: false, reason: 'Some plots not found' }
    }
    
    // Check if all plots have the same owner
    const firstOwnerId = plots[0].ownerId
    if (!plots.every(p => p.ownerId === firstOwnerId)) {
      return { success: false, reason: 'All plots must have the same owner' }
    }
    
    // Check if plots are contiguous
    if (!this.arePlotsContiguous(plots)) {
      return { success: false, reason: 'Plots must be contiguous' }
    }
    
    // Check if any plot has buildings
    if (plots.some(p => p.building)) {
      return { success: false, reason: 'Cannot merge plots with buildings' }
    }
    
    // Find bounding box
    const minX = Math.min(...plots.map(p => p.x))
    const minY = Math.min(...plots.map(p => p.y))
    const maxX = Math.max(...plots.map(p => p.x + p.width))
    const maxY = Math.max(...plots.map(p => p.y + p.height))
    
    // Create merged plot
    const mergedId = this.plotIdCounter++
    const mergedPlot = new LandPlot(
      mergedId,
      minX,
      minY,
      maxX - minX,
      maxY - minY,
      plots[0].type
    )
    
    mergedPlot.setOwner(plots[0].owner, plots[0].ownerId)
    
    // Remove old plots and add merged plot
    plots.forEach(plot => {
      const gridX = Math.floor(plot.x / this.plotSize)
      const gridY = Math.floor(plot.y / this.plotSize)
      this.plots.delete(`${gridX},${gridY}`)
      this.plotsById.delete(plot.id)
      
      if (plot.ownerId) {
        const ownerPlots = this.ownershipMap.get(plot.ownerId)
        if (ownerPlots) ownerPlots.delete(plot.id)
      }
    })
    
    // Add merged plot to maps
    this.plotsById.set(mergedId, mergedPlot)
    if (mergedPlot.ownerId) {
      const ownerPlots = this.ownershipMap.get(mergedPlot.ownerId)
      if (ownerPlots) ownerPlots.add(mergedId)
    }
    
    return { success: true, mergedPlot }
  }
  
  splitPlot(plotId, splitLines) {
    const plot = this.plotsById.get(plotId)
    if (!plot) return { success: false, reason: 'Plot not found' }
    
    if (plot.building) {
      return { success: false, reason: 'Cannot split plot with building' }
    }
    
    // For simplicity, we'll split into grid-aligned sub-plots
    const subPlots = []
    const subPlotSize = this.plotSize
    
    for (let x = plot.x; x < plot.x + plot.width; x += subPlotSize) {
      for (let y = plot.y; y < plot.y + plot.height; y += subPlotSize) {
        const width = Math.min(subPlotSize, plot.x + plot.width - x)
        const height = Math.min(subPlotSize, plot.y + plot.height - y)
        
        const subPlotId = this.plotIdCounter++
        const subPlot = new LandPlot(subPlotId, x, y, width, height, plot.type)
        
        if (plot.owner) {
          subPlot.setOwner(plot.owner, plot.ownerId)
        }
        
        subPlots.push(subPlot)
        
        // Add to maps
        const gridX = Math.floor(x / this.plotSize)
        const gridY = Math.floor(y / this.plotSize)
        this.plots.set(`${gridX},${gridY}`, subPlot)
        this.plotsById.set(subPlotId, subPlot)
        
        if (subPlot.ownerId) {
          const ownerPlots = this.ownershipMap.get(subPlot.ownerId)
          if (ownerPlots) ownerPlots.add(subPlotId)
        }
      }
    }
    
    // Remove original plot
    this.plotsById.delete(plotId)
    if (plot.ownerId) {
      const ownerPlots = this.ownershipMap.get(plot.ownerId)
      if (ownerPlots) ownerPlots.delete(plotId)
    }
    
    // Update neighbor relationships
    this.updateNeighborRelationships()
    
    return { success: true, subPlots }
  }
  
  arePlotsContiguous(plots) {
    if (plots.length === 0) return false
    
    const visited = new Set()
    const toVisit = [plots[0].id]
    const plotSet = new Set(plots.map(p => p.id))
    
    while (toVisit.length > 0) {
      const currentId = toVisit.pop()
      if (visited.has(currentId)) continue
      
      visited.add(currentId)
      const current = this.plotsById.get(currentId)
      
      if (!current) continue
      
      // Check all neighbors
      Object.values(current.neighbors).forEach(neighborId => {
        if (neighborId && plotSet.has(neighborId) && !visited.has(neighborId)) {
          toVisit.push(neighborId)
        }
      })
    }
    
    return visited.size === plots.length
  }
  
  getPlotsByOwner(ownerId) {
    const plotIds = this.ownershipMap.get(ownerId)
    if (!plotIds) return []
    
    return Array.from(plotIds).map(id => this.plotsById.get(id)).filter(Boolean)
  }
  
  getPlotsInArea(x, y, width, height) {
    const plots = []
    
    const startGridX = Math.floor(x / this.plotSize)
    const startGridY = Math.floor(y / this.plotSize)
    const endGridX = Math.ceil((x + width) / this.plotSize)
    const endGridY = Math.ceil((y + height) / this.plotSize)
    
    for (let gridX = startGridX; gridX < endGridX; gridX++) {
      for (let gridY = startGridY; gridY < endGridY; gridY++) {
        const plot = this.plots.get(`${gridX},${gridY}`)
        if (plot) plots.push(plot)
      }
    }
    
    return plots
  }
  
  syncWithTerrain(terrainSystem) {
    this.plotsById.forEach(plot => {
      const centerX = plot.x + plot.width / 2
      const centerY = plot.y + plot.height / 2
      const terrain = terrainSystem.getTerrainAt(centerX, centerY)
      
      if (terrain) {
        if (terrain.type === 'water') {
          plot.setType('water')
        } else if (terrain.type === 'forest') {
          plot.setType('forest')
        } else if (plot.type === 'water') {
          // If terrain is not water but plot is, change it to buildable
          plot.setType('buildable')
        }
      }
    })
  }
  
  getAllPlots() {
    return Array.from(this.plotsById.values())
  }
  
  toJSON() {
    return {
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      plotSize: this.plotSize,
      plots: Array.from(this.plotsById.values()).map(plot => plot.toJSON()),
      ownershipMap: Array.from(this.ownershipMap.entries()).map(([ownerId, plotIds]) => ({
        ownerId,
        plotIds: Array.from(plotIds)
      }))
    }
  }
  
  static fromJSON(data) {
    const manager = new LandManager(data.worldWidth, data.worldHeight, data.plotSize)
    
    // Clear and rebuild
    manager.plots.clear()
    manager.plotsById.clear()
    manager.ownershipMap.clear()
    
    // Restore plots
    data.plots.forEach(plotData => {
      const plot = LandPlot.fromJSON(plotData)
      const gridX = Math.floor(plot.x / manager.plotSize)
      const gridY = Math.floor(plot.y / manager.plotSize)
      
      manager.plots.set(`${gridX},${gridY}`, plot)
      manager.plotsById.set(plot.id, plot)
    })
    
    // Restore ownership map
    data.ownershipMap.forEach(({ ownerId, plotIds }) => {
      manager.ownershipMap.set(ownerId, new Set(plotIds))
    })
    
    return manager
  }
}