import { useRef, useCallback } from 'react'

export const useOptimizedMovement = () => {
  const lastFrameTime = useRef(0)
  const deltaTimeRef = useRef(0)
  
  // Cache for walkable terrain checks
  const walkableCache = useRef(new Map())
  const cacheLifetime = 5000 // 5 seconds
  
  // Movement constants
  const MOVEMENT_SPEED = 120 // pixels per second (was 3.0 per frame)
  const INTERPOLATION_SPEED = 0.15 // Smooth movement interpolation
  const PHYSICS_TIMESTEP = 1/60 // Fixed timestep for physics
  const MAX_DELTA = 0.1 // Cap delta time to prevent large jumps
  
  // Calculate delta time
  const updateDeltaTime = useCallback((currentTime) => {
    if (lastFrameTime.current === 0) {
      lastFrameTime.current = currentTime
      deltaTimeRef.current = PHYSICS_TIMESTEP
      return deltaTimeRef.current
    }
    
    const rawDelta = (currentTime - lastFrameTime.current) / 1000
    deltaTimeRef.current = Math.min(rawDelta, MAX_DELTA)
    lastFrameTime.current = currentTime
    
    return deltaTimeRef.current
  }, [])
  
  // Optimized walkable check with caching
  const isWalkableCached = useCallback((x, y, terrainSystem) => {
    const key = `${Math.floor(x/20)}_${Math.floor(y/20)}`
    const cached = walkableCache.current.get(key)
    
    if (cached && Date.now() - cached.time < cacheLifetime) {
      return cached.walkable
    }
    
    const walkable = terrainSystem.isWalkable(x, y)
    walkableCache.current.set(key, { walkable, time: Date.now() })
    
    // Clean old cache entries periodically
    if (walkableCache.current.size > 1000) {
      const now = Date.now()
      for (const [k, v] of walkableCache.current.entries()) {
        if (now - v.time > cacheLifetime) {
          walkableCache.current.delete(k)
        }
      }
    }
    
    return walkable
  }, [])
  
  // Optimized movement update with interpolation
  const updateEntityMovement = useCallback((entity, targetX, targetY, deltaTime) => {
    const dx = targetX - entity.x
    const dy = targetY - entity.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < 0.1) {
      entity.vx = 0
      entity.vy = 0
      return true // Reached target
    }
    
    // Calculate desired velocity
    const desiredVx = (dx / distance) * MOVEMENT_SPEED
    const desiredVy = (dy / distance) * MOVEMENT_SPEED
    
    // Smooth interpolation for natural movement
    entity.vx = entity.vx + (desiredVx - entity.vx) * INTERPOLATION_SPEED
    entity.vy = entity.vy + (desiredVy - entity.vy) * INTERPOLATION_SPEED
    
    // Store previous position for rollback
    const prevX = entity.x
    const prevY = entity.y
    
    // Update position based on delta time
    entity.x += entity.vx * deltaTime
    entity.y += entity.vy * deltaTime
    
    // Apply friction
    const friction = Math.pow(0.85, deltaTime * 60) // Frame-independent friction
    entity.vx *= friction
    entity.vy *= friction
    
    return false // Not reached target yet
  }, [])
  
  // Batch movement updates for multiple entities
  const batchUpdateMovement = useCallback((entities, gameTime, terrainSystem, worldSize) => {
    const deltaTime = updateDeltaTime(gameTime)
    
    // Process entities in batches to improve cache locality
    const batchSize = 50
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize)
      
      batch.forEach(entity => {
        // Skip if entity is idle
        if (entity.movement?.isIdle) {
          entity.movement.idleTime += deltaTime * 60
          if (entity.movement.idleTime >= entity.movement.idleDuration) {
            entity.movement.isIdle = false
            entity.movement.idleTime = 0
          } else {
            return
          }
        }
        
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
        
        // Update movement
        const reachedTarget = updateEntityMovement(entity, targetX, targetY, deltaTime)
        
        if (reachedTarget) {
          if (entity.pathfinding?.targetNode) {
            entity.pathfinding.targetNode = null
            entity.movement.isIdle = true
            entity.movement.idleDuration = 60 + Math.random() * 120
          } else {
            entity.target = null
          }
        }
        
        // Constrain to world bounds (optimized)
        const margin = 20
        if (entity.x < margin || entity.x > worldSize.width - margin ||
            entity.y < margin || entity.y > worldSize.height - margin) {
          entity.x = Math.max(margin, Math.min(worldSize.width - margin, entity.x))
          entity.y = Math.max(margin, Math.min(worldSize.height - margin, entity.y))
          entity.vx = 0
          entity.vy = 0
        }
      })
    }
  }, [updateDeltaTime, updateEntityMovement])
  
  // Optimized nearest walkable finder using spiral search
  const findNearestWalkableOptimized = useCallback((x, y, terrainSystem, maxRadius = 80) => {
    // Check if current position is already walkable
    if (isWalkableCached(x, y, terrainSystem)) {
      return { x, y }
    }
    
    // Spiral outward search pattern
    const steps = 8
    for (let radius = 20; radius <= maxRadius; radius += 20) {
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2
        const testX = x + Math.cos(angle) * radius
        const testY = y + Math.sin(angle) * radius
        
        if (isWalkableCached(testX, testY, terrainSystem)) {
          return { x: testX, y: testY }
        }
      }
    }
    
    return { x, y } // Fallback to original position
  }, [isWalkableCached])
  
  // Smooth camera movement with delta time
  const updateCameraSmooth = useCallback((camera, targetX, targetY, deltaTime) => {
    const smoothing = 0.1 // Camera smoothing factor
    const dx = targetX - camera.x
    const dy = targetY - camera.y
    
    camera.x += dx * smoothing * deltaTime * 60
    camera.y += dy * smoothing * deltaTime * 60
  }, [])
  
  // Get interpolated position for rendering
  const getInterpolatedPosition = useCallback((entity, alpha = 1.0) => {
    // Linear interpolation between previous and current position
    const prevX = entity.prevX || entity.x
    const prevY = entity.prevY || entity.y
    
    return {
      x: prevX + (entity.x - prevX) * alpha,
      y: prevY + (entity.y - prevY) * alpha
    }
  }, [])
  
  return {
    updateDeltaTime,
    batchUpdateMovement,
    findNearestWalkableOptimized,
    updateCameraSmooth,
    getInterpolatedPosition,
    isWalkableCached,
    // Export constants for external use
    MOVEMENT_SPEED,
    INTERPOLATION_SPEED,
    PHYSICS_TIMESTEP
  }
}