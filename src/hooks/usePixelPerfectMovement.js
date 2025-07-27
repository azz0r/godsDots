import { useRef, useCallback } from 'react'

export const usePixelPerfectMovement = () => {
  const lastFrameTime = useRef(0)
  const accumulator = useRef(0)
  
  // Movement constants for pixel-perfect movement
  const PIXEL_SIZE = 1 // Base pixel size
  const FIXED_TIMESTEP = 1/60 // 60 FPS fixed timestep
  const MAX_ACCUMULATED_TIME = 0.1 // Prevent spiral of death
  
  // Movement speeds (pixels per second)
  const MOVEMENT_SPEEDS = {
    WALKING: 32,    // 32 pixels/second
    RUNNING: 64,    // 64 pixels/second
    ROAD_MULTIPLIER: 1.5
  }
  
  // Zoom configuration for smooth zooming
  const MIN_ZOOM = 0.25
  const MAX_ZOOM = 4.0
  const ZOOM_SPEED = 0.001 // Base zoom speed per delta unit
  
  // Cache for pixel-aligned positions
  const positionCache = useRef(new Map())
  
  // Ensure position is aligned to pixel grid
  const alignToPixel = useCallback((value) => {
    return Math.floor(value)
  }, [])
  
  // Snap position to pixel grid with caching
  const snapToPixelGrid = useCallback((x, y) => {
    const key = `${x},${y}`
    if (positionCache.current.has(key)) {
      return positionCache.current.get(key)
    }
    
    const snapped = {
      x: alignToPixel(x),
      y: alignToPixel(y)
    }
    
    // Limit cache size
    if (positionCache.current.size > 10000) {
      positionCache.current.clear()
    }
    
    positionCache.current.set(key, snapped)
    return snapped
  }, [alignToPixel])
  
  // Calculate movement delta with fixed timestep
  const calculateMovementDelta = useCallback((currentTime) => {
    if (lastFrameTime.current === 0) {
      lastFrameTime.current = currentTime
      return 0
    }
    
    const frameTime = (currentTime - lastFrameTime.current) / 1000
    lastFrameTime.current = currentTime
    
    accumulator.current += Math.min(frameTime, MAX_ACCUMULATED_TIME)
    
    let steps = 0
    while (accumulator.current >= FIXED_TIMESTEP) {
      accumulator.current -= FIXED_TIMESTEP
      steps++
    }
    
    return steps
  }, [])
  
  // Calculate pixel-perfect movement vector
  const calculateMovementVector = useCallback((entity, targetX, targetY, speed, onRoad = false) => {
    const dx = targetX - entity.x
    const dy = targetY - entity.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < 1) {
      return { vx: 0, vy: 0, arrived: true }
    }
    
    // Apply road speed multiplier
    const effectiveSpeed = onRoad ? speed * MOVEMENT_SPEEDS.ROAD_MULTIPLIER : speed
    
    // Calculate pixels to move per fixed timestep
    const pixelsPerStep = effectiveSpeed * FIXED_TIMESTEP
    
    // Normalize and scale by speed
    const vx = (dx / distance) * pixelsPerStep
    const vy = (dy / distance) * pixelsPerStep
    
    return { vx, vy, arrived: false }
  }, [])
  
  // Update entity position with pixel-perfect movement
  const updateEntityPosition = useCallback((entity, targetX, targetY, speed, onRoad, steps) => {
    if (steps === 0) return false
    
    const movement = calculateMovementVector(entity, targetX, targetY, speed, onRoad)
    
    if (movement.arrived) {
      entity.x = alignToPixel(targetX)
      entity.y = alignToPixel(targetY)
      entity.vx = 0
      entity.vy = 0
      return true
    }
    
    // Move entity by calculated velocity * steps
    const newX = entity.x + movement.vx * steps
    const newY = entity.y + movement.vy * steps
    
    // Snap to pixel grid
    const snapped = snapToPixelGrid(newX, newY)
    entity.x = snapped.x
    entity.y = snapped.y
    
    // Store velocity for rendering interpolation
    entity.vx = movement.vx
    entity.vy = movement.vy
    
    return false
  }, [alignToPixel, calculateMovementVector, snapToPixelGrid])
  
  // Batch update all entities
  const batchUpdateMovement = useCallback((entities, currentTime, terrainSystem, worldSize) => {
    const steps = calculateMovementDelta(currentTime)
    
    entities.forEach(entity => {
      // Skip if no movement needed
      if (!entity.target && !entity.pathfinding?.targetNode) return
      
      // Determine target
      let targetX = entity.x
      let targetY = entity.y
      
      if (entity.pathfinding?.targetNode) {
        targetX = entity.pathfinding.targetNode.x
        targetY = entity.pathfinding.targetNode.y
      } else if (entity.target) {
        targetX = entity.target.x
        targetY = entity.target.y
      }
      
      // Check if on road (simplified check)
      const onRoad = terrainSystem.getTileAt?.(entity.x, entity.y)?.type === 'road'
      
      // Determine speed
      const speed = entity.isRunning ? MOVEMENT_SPEEDS.RUNNING : MOVEMENT_SPEEDS.WALKING
      
      // Update position
      const arrived = updateEntityPosition(entity, targetX, targetY, speed, onRoad, steps)
      
      if (arrived) {
        if (entity.pathfinding?.targetNode) {
          entity.pathfinding.targetNode = null
        } else {
          entity.target = null
        }
      }
      
      // Constrain to world bounds (pixel-aligned)
      const margin = 20
      entity.x = alignToPixel(Math.max(margin, Math.min(worldSize.width - margin, entity.x)))
      entity.y = alignToPixel(Math.max(margin, Math.min(worldSize.height - margin, entity.y)))
    })
  }, [calculateMovementDelta, updateEntityPosition, alignToPixel])
  
  // Update camera with pixel-perfect following
  const updateCameraPixelPerfect = useCallback((camera, targetX, targetY, canvasWidth, canvasHeight, worldSize) => {
    // Calculate pixel-perfect camera position
    const targetCameraX = alignToPixel(targetX - canvasWidth / (2 * camera.zoom))
    const targetCameraY = alignToPixel(targetY - canvasHeight / (2 * camera.zoom))
    
    // Smooth camera movement but snap to pixels
    const smoothing = 0.15
    camera.x = alignToPixel(camera.x + (targetCameraX - camera.x) * smoothing)
    camera.y = alignToPixel(camera.y + (targetCameraY - camera.y) * smoothing)
    
    // Constrain camera to world bounds
    const maxCameraX = worldSize.width - canvasWidth / camera.zoom
    const maxCameraY = worldSize.height - canvasHeight / camera.zoom
    
    camera.x = alignToPixel(Math.max(0, Math.min(maxCameraX, camera.x)))
    camera.y = alignToPixel(Math.max(0, Math.min(maxCameraY, camera.y)))
  }, [alignToPixel])
  
  // Handle zoom with smooth interpolation and zoom-to-mouse
  const setPixelPerfectZoom = useCallback((camera, zoomDirection, mouseX, mouseY, canvasWidth, canvasHeight, deltaAmount = 100) => {
    // Calculate zoom factor based on scroll speed
    const normalizedDelta = Math.min(Math.abs(deltaAmount), 500) / 100 // Normalize to reasonable range
    const zoomAmount = ZOOM_SPEED * normalizedDelta * 10 // Scale for better feel
    const zoomFactor = zoomDirection > 0 ? 1 + zoomAmount : 1 - zoomAmount
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom * zoomFactor))
    
    if (newZoom === camera.zoom) return camera.zoom // No change
    
    // Calculate world position under mouse before zoom
    const worldX = camera.x + mouseX / camera.zoom
    const worldY = camera.y + mouseY / camera.zoom
    
    // Update zoom
    camera.zoom = newZoom
    
    // Calculate new camera position to keep mouse position stable
    const newCameraX = worldX - mouseX / newZoom
    const newCameraY = worldY - mouseY / newZoom
    
    // Update camera with bounds checking
    // Assuming world size is much larger than canvas (using config default of 100x100 tiles * 32 pixels)
    const worldWidth = 3200 // This should ideally be passed in
    const worldHeight = 3200
    const maxCameraX = Math.max(0, worldWidth - canvasWidth / newZoom)
    const maxCameraY = Math.max(0, worldHeight - canvasHeight / newZoom)
    
    camera.x = alignToPixel(Math.max(0, Math.min(maxCameraX, newCameraX)))
    camera.y = alignToPixel(Math.max(0, Math.min(maxCameraY, newCameraY)))
    
    return camera.zoom
  }, [alignToPixel])
  
  // Configure canvas for pixel-perfect rendering
  const configureCanvasPixelPerfect = useCallback((ctx) => {
    ctx.imageSmoothingEnabled = false
    ctx.imageSmoothingQuality = 'low'
    // For webkit browsers
    ctx.webkitImageSmoothingEnabled = false
    // For mozilla
    ctx.mozImageSmoothingEnabled = false
    // For IE
    ctx.msImageSmoothingEnabled = false
  }, [])
  
  // Render position with pixel alignment
  const getRenderPosition = useCallback((entity, interpolationAlpha = 0) => {
    // No interpolation for pixel-perfect rendering
    return {
      x: alignToPixel(entity.x),
      y: alignToPixel(entity.y)
    }
  }, [alignToPixel])
  
  // Debug visualization helpers
  const renderDebugGrid = useCallback((ctx, camera, canvasWidth, canvasHeight, gridSize = 16) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    
    const startX = alignToPixel(camera.x - (camera.x % gridSize))
    const startY = alignToPixel(camera.y - (camera.y % gridSize))
    const endX = camera.x + canvasWidth / camera.zoom
    const endY = camera.y + canvasHeight / camera.zoom
    
    // Vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(alignToPixel(x), startY)
      ctx.lineTo(alignToPixel(x), endY)
      ctx.stroke()
    }
    
    // Horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(startX, alignToPixel(y))
      ctx.lineTo(endX, alignToPixel(y))
      ctx.stroke()
    }
  }, [alignToPixel])
  
  const renderDebugInfo = useCallback((ctx, camera, fps, entityCount) => {
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset transform for UI rendering
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(10, 10, 200, 100)
    
    ctx.fillStyle = '#00ff00'
    ctx.font = '14px monospace'
    ctx.fillText(`FPS: ${fps.toFixed(1)}`, 20, 30)
    ctx.fillText(`Zoom: ${camera.zoom}x`, 20, 50)
    ctx.fillText(`Camera: ${alignToPixel(camera.x)}, ${alignToPixel(camera.y)}`, 20, 70)
    ctx.fillText(`Entities: ${entityCount}`, 20, 90)
    
    ctx.restore()
  }, [alignToPixel])
  
  const renderMovementVectors = useCallback((ctx, entities) => {
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)'
    ctx.lineWidth = 2
    
    entities.forEach(entity => {
      if (entity.vx !== 0 || entity.vy !== 0) {
        const pos = getRenderPosition(entity)
        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
        ctx.lineTo(
          alignToPixel(pos.x + entity.vx * 10),
          alignToPixel(pos.y + entity.vy * 10)
        )
        ctx.stroke()
        
        // Draw target if exists
        if (entity.target) {
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)'
          ctx.beginPath()
          ctx.arc(
            alignToPixel(entity.target.x),
            alignToPixel(entity.target.y),
            5, 0, Math.PI * 2
          )
          ctx.stroke()
          ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)'
        }
      }
    })
  }, [getRenderPosition, alignToPixel])
  
  return {
    // Core functions
    batchUpdateMovement,
    updateCameraPixelPerfect,
    setPixelPerfectZoom,
    configureCanvasPixelPerfect,
    getRenderPosition,
    snapToPixelGrid,
    alignToPixel,
    
    // Debug functions
    renderDebugGrid,
    renderDebugInfo,
    renderMovementVectors,
    
    // Constants
    MOVEMENT_SPEEDS,
    ZOOM_LEVELS,
    FIXED_TIMESTEP
  }
}