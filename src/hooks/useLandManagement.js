import { useRef, useCallback, useEffect } from 'react'
import { LandManager } from '../classes/LandManager'
import { BorderRenderer } from '../classes/BorderRenderer'

export const useLandManagement = (worldSize, terrainSystem) => {
  const landManagerRef = useRef(null)
  const borderRendererRef = useRef(null)
  const selectedPlotRef = useRef(null)
  const hoveredPlotRef = useRef(null)
  
  // Initialize land management system
  const initializeLandSystem = useCallback(() => {
    if (!landManagerRef.current) {
      landManagerRef.current = new LandManager(worldSize.width, worldSize.height)
      borderRendererRef.current = new BorderRenderer()
      
      // Sync with terrain if available
      if (terrainSystem) {
        landManagerRef.current.syncWithTerrain(terrainSystem)
      }
    }
  }, [worldSize, terrainSystem])
  
  // Initialize on mount
  useEffect(() => {
    initializeLandSystem()
  }, [initializeLandSystem])
  
  // Get plot at coordinates
  const getPlotAt = useCallback((x, y) => {
    if (!landManagerRef.current) return null
    return landManagerRef.current.getPlotAt(x, y)
  }, [])
  
  // Check if building can be placed
  const canPlaceBuilding = useCallback((x, y, width, height, buildingType) => {
    if (!landManagerRef.current) {
      return { canPlace: false, reason: 'Land system not initialized' }
    }
    
    // Get all plots that the building would occupy
    const plots = landManagerRef.current.getPlotsInArea(x, y, width, height)
    
    if (plots.length === 0) {
      return { canPlace: false, reason: 'No valid land plot' }
    }
    
    // Check each plot
    for (const plot of plots) {
      // Check if plot type allows building
      if (!plot.canBuild(buildingType)) {
        return { 
          canPlace: false, 
          reason: `Plot type '${plot.type}' does not allow '${buildingType}' buildings` 
        }
      }
      
      // Check if plot already has a building
      if (plot.building) {
        return { canPlace: false, reason: 'Plot already has a building' }
      }
      
      // Check ownership requirements (optional)
      if (plot.owner && plot.restrictions.requiresPermit) {
        return { canPlace: false, reason: 'Plot requires building permit' }
      }
    }
    
    return { canPlace: true }
  }, [])
  
  // Register building on plot
  const registerBuilding = useCallback((building) => {
    if (!landManagerRef.current) return false
    
    const plot = landManagerRef.current.getPlotAt(
      building.x + building.width / 2,
      building.y + building.height / 2
    )
    
    if (plot) {
      return plot.setBuilding(building, building.id)
    }
    
    return false
  }, [])
  
  // Claim plot for owner
  const claimPlot = useCallback((x, y, owner, ownerId) => {
    if (!landManagerRef.current) return { success: false, reason: 'Land system not initialized' }
    
    const plot = landManagerRef.current.getPlotAt(x, y)
    if (!plot) return { success: false, reason: 'No plot at location' }
    
    return landManagerRef.current.assignPlot(plot.id, owner, ownerId)
  }, [])
  
  // Handle mouse hover
  const handleMouseMove = useCallback((x, y) => {
    if (!landManagerRef.current || !borderRendererRef.current) return
    
    const plot = landManagerRef.current.getPlotAt(x, y)
    
    if (plot) {
      if (hoveredPlotRef.current !== plot.id) {
        hoveredPlotRef.current = plot.id
        borderRendererRef.current.setHoveredPlot(plot.id)
      }
    } else {
      if (hoveredPlotRef.current !== null) {
        hoveredPlotRef.current = null
        borderRendererRef.current.setHoveredPlot(null)
      }
    }
  }, [])
  
  // Handle plot selection
  const selectPlot = useCallback((x, y) => {
    if (!landManagerRef.current || !borderRendererRef.current) return
    
    const plot = landManagerRef.current.getPlotAt(x, y)
    
    if (plot) {
      // Deselect previous plot
      if (selectedPlotRef.current && selectedPlotRef.current !== plot.id) {
        const prevPlot = landManagerRef.current.getPlotById(selectedPlotRef.current)
        if (prevPlot) prevPlot.deselect()
        borderRendererRef.current.deselectPlot(selectedPlotRef.current)
      }
      
      // Select new plot
      plot.select()
      borderRendererRef.current.selectPlot(plot.id)
      selectedPlotRef.current = plot.id
      
      return plot
    }
    
    return null
  }, [])
  
  // Clear selection
  const clearSelection = useCallback(() => {
    if (!landManagerRef.current || !borderRendererRef.current) return
    
    if (selectedPlotRef.current) {
      const plot = landManagerRef.current.getPlotById(selectedPlotRef.current)
      if (plot) plot.deselect()
      borderRendererRef.current.clearSelection()
      selectedPlotRef.current = null
    }
  }, [])
  
  // Merge plots
  const mergePlots = useCallback((plotIds) => {
    if (!landManagerRef.current) return { success: false, reason: 'Land system not initialized' }
    return landManagerRef.current.mergePlots(plotIds)
  }, [])
  
  // Split plot
  const splitPlot = useCallback((plotId) => {
    if (!landManagerRef.current) return { success: false, reason: 'Land system not initialized' }
    return landManagerRef.current.splitPlot(plotId)
  }, [])
  
  // Get plots by owner
  const getPlotsByOwner = useCallback((ownerId) => {
    if (!landManagerRef.current) return []
    return landManagerRef.current.getPlotsByOwner(ownerId)
  }, [])
  
  // Update animations
  const update = useCallback((deltaTime) => {
    if (borderRendererRef.current) {
      borderRendererRef.current.update(deltaTime)
    }
  }, [])
  
  // Render land borders
  const renderLandBorders = useCallback((ctx, camera) => {
    if (!landManagerRef.current || !borderRendererRef.current) return
    
    const plots = landManagerRef.current.getAllPlots()
    borderRendererRef.current.renderBorders(ctx, plots, camera)
  }, [])
  
  // Render plot info (for UI overlay)
  const renderPlotInfo = useCallback((ctx, x, y) => {
    if (!landManagerRef.current || !borderRendererRef.current) return
    
    if (hoveredPlotRef.current) {
      const plot = landManagerRef.current.getPlotById(hoveredPlotRef.current)
      if (plot) {
        borderRendererRef.current.renderPlotInfo(ctx, plot, x, y)
      }
    }
  }, [])
  
  // Render minimap
  const renderMinimap = useCallback((ctx, minimapBounds) => {
    if (!landManagerRef.current || !borderRendererRef.current) return
    
    const plots = landManagerRef.current.getAllPlots()
    const worldBounds = {
      x: 0,
      y: 0,
      width: worldSize.width,
      height: worldSize.height
    }
    
    borderRendererRef.current.renderMinimap(ctx, plots, minimapBounds, worldBounds)
  }, [worldSize])
  
  // Save/Load functionality
  const saveLandData = useCallback(() => {
    if (!landManagerRef.current) return null
    return landManagerRef.current.toJSON()
  }, [])
  
  const loadLandData = useCallback((data) => {
    if (data) {
      landManagerRef.current = LandManager.fromJSON(data)
      
      // Re-sync with terrain if available
      if (terrainSystem) {
        landManagerRef.current.syncWithTerrain(terrainSystem)
      }
    }
  }, [terrainSystem])
  
  return {
    // Core functions
    getPlotAt,
    canPlaceBuilding,
    registerBuilding,
    claimPlot,
    
    // Interaction
    handleMouseMove,
    selectPlot,
    clearSelection,
    
    // Plot management
    mergePlots,
    splitPlot,
    getPlotsByOwner,
    
    // Rendering
    update,
    renderLandBorders,
    renderPlotInfo,
    renderMinimap,
    
    // Data persistence
    saveLandData,
    loadLandData,
    
    // Direct access (if needed)
    getLandManager: () => landManagerRef.current,
    getBorderRenderer: () => borderRendererRef.current
  }
}