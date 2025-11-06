import React, { createContext, useContext, useRef, useCallback } from 'react'

const CameraContext = createContext(null)

/**
 * CameraContext provides smooth camera controls with interpolation
 * Handles zoom, pan, and transitions without jank
 */
export const CameraProvider = ({ children, worldSize }) => {
  const cameraRef = useRef({
    x: 0,
    y: 0,
    zoom: 1,
    // Smooth transition targets
    targetX: null,
    targetY: null,
    targetZoom: null,
    transitioning: false,
    // Smooth zoom/pan velocities
    velocityX: 0,
    velocityY: 0,
    velocityZoom: 0,
    // Smoothing factors
    smoothingFactor: 0.15, // How quickly camera reaches target (0.1 = smooth, 0.3 = snappy)
    zoomSmoothingFactor: 0.12, // Slightly slower for zoom
    // Constraints
    minZoom: 0.3,
    maxZoom: 3.0
  })

  /**
   * Update camera with smooth interpolation
   * Call this every frame from game loop
   */
  const updateCamera = useCallback((deltaTime = 16) => {
    const camera = cameraRef.current
    const dt = Math.min(deltaTime / 16, 2) // Normalize to 60fps, cap at 2x

    // Smooth zoom interpolation
    if (camera.targetZoom !== null && Math.abs(camera.targetZoom - camera.zoom) > 0.001) {
      const zoomDiff = camera.targetZoom - camera.zoom
      camera.velocityZoom += zoomDiff * camera.zoomSmoothingFactor * dt
      camera.velocityZoom *= 0.85 // Damping
      camera.zoom += camera.velocityZoom

      // Snap when very close
      if (Math.abs(camera.targetZoom - camera.zoom) < 0.001) {
        camera.zoom = camera.targetZoom
        camera.targetZoom = null
        camera.velocityZoom = 0
      }
    }

    // Smooth position interpolation
    if (camera.targetX !== null && Math.abs(camera.targetX - camera.x) > 0.5) {
      const xDiff = camera.targetX - camera.x
      camera.velocityX += xDiff * camera.smoothingFactor * dt
      camera.velocityX *= 0.85 // Damping
      camera.x += camera.velocityX

      // Snap when very close
      if (Math.abs(camera.targetX - camera.x) < 0.5) {
        camera.x = camera.targetX
        camera.targetX = null
        camera.velocityX = 0
      }
    }

    if (camera.targetY !== null && Math.abs(camera.targetY - camera.y) > 0.5) {
      const yDiff = camera.targetY - camera.y
      camera.velocityY += yDiff * camera.smoothingFactor * dt
      camera.velocityY *= 0.85 // Damping
      camera.y += camera.velocityY

      // Snap when very close
      if (Math.abs(camera.targetY - camera.y) < 0.5) {
        camera.y = camera.targetY
        camera.targetY = null
        camera.velocityY = 0
      }
    }

    // Check if transition complete
    if (camera.transitioning) {
      if (camera.targetX === null && camera.targetY === null && camera.targetZoom === null) {
        camera.transitioning = false
      }
    }

    return camera
  }, [])

  /**
   * Set zoom with smooth interpolation
   */
  const setZoom = useCallback((newZoom, centerX = null, centerY = null) => {
    const camera = cameraRef.current

    // Clamp zoom
    const clampedZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, newZoom))

    // If center point provided, zoom towards that point
    if (centerX !== null && centerY !== null) {
      const currentWorldX = centerX / camera.zoom + camera.x
      const currentWorldY = centerY / camera.zoom + camera.y

      camera.targetX = currentWorldX - centerX / clampedZoom
      camera.targetY = currentWorldY - centerY / clampedZoom
      camera.transitioning = true
    }

    camera.targetZoom = clampedZoom
    camera.transitioning = true
  }, [])

  /**
   * Smooth zoom by delta (for mouse wheel)
   */
  const zoomBy = useCallback((delta, mouseX, mouseY, canvasWidth, canvasHeight) => {
    const camera = cameraRef.current

    // Calculate zoom factor based on delta
    const zoomFactor = delta > 0 ? 1.1 : 0.9
    const newZoom = camera.zoom * zoomFactor

    // Use current zoom for calculations if we're mid-transition
    const currentZoom = camera.zoom

    // Calculate world position under mouse
    const worldX = mouseX / currentZoom + camera.x
    const worldY = mouseY / currentZoom + camera.y

    // Clamp zoom
    const clampedZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, newZoom))

    // Calculate new camera position to keep mouse over same world point
    const newX = worldX - mouseX / clampedZoom
    const newY = worldY - mouseY / clampedZoom

    // Set smooth targets
    camera.targetZoom = clampedZoom
    camera.targetX = newX
    camera.targetY = newY
    camera.transitioning = true
  }, [])

  /**
   * Pan camera with smooth interpolation
   */
  const panBy = useCallback((deltaX, deltaY) => {
    const camera = cameraRef.current

    // Instant pan for user drag (feels more responsive)
    camera.x -= deltaX / camera.zoom
    camera.y -= deltaY / camera.zoom

    // Constrain to world bounds
    constrainCamera()
  }, [])

  /**
   * Smooth pan to position
   */
  const panTo = useCallback((x, y) => {
    const camera = cameraRef.current
    camera.targetX = x
    camera.targetY = y
    camera.transitioning = true
  }, [])

  /**
   * Constrain camera to world bounds
   */
  const constrainCamera = useCallback((canvasWidth = 1200, canvasHeight = 800) => {
    const camera = cameraRef.current

    const maxX = Math.max(0, worldSize.width - canvasWidth / camera.zoom)
    const maxY = Math.max(0, worldSize.height - canvasHeight / camera.zoom)

    camera.x = Math.max(0, Math.min(maxX, camera.x))
    camera.y = Math.max(0, Math.min(maxY, camera.y))
  }, [worldSize])

  /**
   * Zoom to fit world
   */
  const zoomToWorld = useCallback((canvasWidth, canvasHeight) => {
    const camera = cameraRef.current

    const zoomX = canvasWidth / worldSize.width
    const zoomY = canvasHeight / worldSize.height
    const targetZoom = Math.min(zoomX, zoomY) * 0.9

    camera.targetZoom = targetZoom
    camera.targetX = (worldSize.width - canvasWidth / targetZoom) / 2
    camera.targetY = (worldSize.height - canvasHeight / targetZoom) / 2
    camera.transitioning = true
  }, [worldSize])

  /**
   * Zoom to specific location
   */
  const zoomToLocation = useCallback((x, y, zoom, canvasWidth, canvasHeight) => {
    const camera = cameraRef.current

    camera.targetZoom = zoom
    camera.targetX = x - canvasWidth / 2 / zoom
    camera.targetY = y - canvasHeight / 2 / zoom
    camera.transitioning = true
  }, [])

  /**
   * Get screen coordinates from world coordinates
   */
  const worldToScreen = useCallback((worldX, worldY) => {
    const camera = cameraRef.current
    return {
      x: (worldX - camera.x) * camera.zoom,
      y: (worldY - camera.y) * camera.zoom
    }
  }, [])

  /**
   * Get world coordinates from screen coordinates
   */
  const screenToWorld = useCallback((screenX, screenY) => {
    const camera = cameraRef.current
    return {
      x: screenX / camera.zoom + camera.x,
      y: screenY / camera.zoom + camera.y
    }
  }, [])

  const value = {
    cameraRef,
    updateCamera,
    setZoom,
    zoomBy,
    panBy,
    panTo,
    constrainCamera,
    zoomToWorld,
    zoomToLocation,
    worldToScreen,
    screenToWorld
  }

  return (
    <CameraContext.Provider value={value}>
      {children}
    </CameraContext.Provider>
  )
}

export const useCamera = () => {
  const context = useContext(CameraContext)
  if (!context) {
    throw new Error('useCamera must be used within a CameraProvider')
  }
  return context
}
