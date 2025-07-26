import { useRef, useCallback } from 'react'

export const useVillagerSystem = (worldSize, terrainSystem, godBoundary, pathSystem) => {
  const villagersRef = useRef([])
  const villagerIdCounter = useRef(0)

  const spawnVillagers = useCallback((count, centerX, centerY) => {
    villagersRef.current = []
    
    for (let i = 0; i < count; i++) {
      const villager = {
        id: villagerIdCounter.current++,
        x: centerX + (Math.random() - 0.5) * 200,
        y: centerY + (Math.random() - 0.5) * 200,
        vx: 0, vy: 0,
        health: 100,
        happiness: 50,
        task: 'idle',
        target: null,
        age: Math.random() * 60 + 18,
        lastMove: 0,
        state: 'wandering',
        homeBuilding: null,
        pathfinding: {
          currentPath: null,
          targetNode: null,
          stuck: 0,
          lastPathUpdate: 0
        },
        movement: {
          isIdle: false,
          idleTime: 0,
          idleDuration: 0,
          lastMoveTime: 0
        }
      }
      villagersRef.current.push(villager)
    }
  }, [])

  const findNearestWalkableTile = useCallback((x, y, radius = 100) => {
    for (let r = 20; r <= radius; r += 20) {
      for (let angle = 0; angle < Math.PI * 2; angle += 0.5) {
        const testX = x + Math.cos(angle) * r
        const testY = y + Math.sin(angle) * r
        
        if (terrainSystem.isWalkable(testX, testY)) {
          return { x: testX, y: testY }
        }
      }
    }
    return { x, y }
  }, [terrainSystem])

  const updateVillagers = useCallback((gameTime) => {
    villagersRef.current.forEach(villager => {
      // Handle idle periods - villagers don't move constantly
      if (villager.movement.isIdle) {
        villager.movement.idleTime++
        if (villager.movement.idleTime >= villager.movement.idleDuration) {
          villager.movement.isIdle = false
          villager.movement.idleTime = 0
        } else {
          return // Skip movement updates while idle
        }
      }

      // Update villager AI based on state (less frequently)
      if (gameTime - villager.movement.lastMoveTime > 60) { // Update every second instead of every frame
        switch (villager.state) {
          case 'wandering':
            updateWandering(villager, gameTime)
            break
          case 'working':
            updateWorking(villager, gameTime)
            break
          case 'fleeing':
            updateFleeing(villager, gameTime)
            break
          case 'returning_home':
            updateReturningHome(villager, gameTime)
            break
        }
        villager.movement.lastMoveTime = gameTime
      }

      // Apply movement with path following
      updateMovement(villager, gameTime)
      
      // Constrain to world bounds and avoid water
      constrainVillager(villager)
      
      // Update happiness less frequently
      if (gameTime % 300 === Math.floor(villager.id % 300)) {
        const inBoundary = godBoundary.isWithinBoundary(villager.x, villager.y)
        if (inBoundary) {
          villager.happiness = Math.min(100, villager.happiness + 0.5)
        } else {
          villager.happiness = Math.max(0, villager.happiness - 1)
        }
      }
    })
  }, [terrainSystem, godBoundary, pathSystem])

  const updateWandering = (villager, gameTime) => {
    if (!villager.pathfinding.currentPath || villager.pathfinding.currentPath.complete || 
        gameTime - villager.pathfinding.lastPathUpdate > 300 + Math.random() * 600) {
      
      // Clear old path if exists
      if (villager.pathfinding.currentPath) {
        pathSystem.clearPath(villager.id)
        villager.pathfinding.currentPath = null
      }

      // Decide between following existing roads or finding a new destination
      if (Math.random() < 0.7) {
        // Follow existing paths
        const pathDestination = pathSystem.findRandomDestinationOnPath(Math.random() < 0.7 ? 'main' : 'circular')
        
        if (pathDestination) {
          // Use A* to find path to the road node
          const path = pathSystem.requestPath(
            villager.id,
            villager.x,
            villager.y,
            pathDestination.x,
            pathDestination.y
          )
          
          if (path) {
            villager.pathfinding.currentPath = path
            villager.pathfinding.lastPathUpdate = gameTime
          }
        }
      } else {
        // Find random walkable destination
        const targetX = villager.x + (Math.random() - 0.5) * 200
        const targetY = villager.y + (Math.random() - 0.5) * 200
        
        // Use A* pathfinding to reach the destination
        const path = pathSystem.requestPath(
          villager.id,
          villager.x,
          villager.y,
          targetX,
          targetY
        )
        
        if (path) {
          villager.pathfinding.currentPath = path
          villager.pathfinding.lastPathUpdate = gameTime
        } else {
          // Fallback to simple movement if no path found
          const walkableTarget = findNearestWalkableTile(targetX, targetY)
          villager.target = walkableTarget
        }
      }
      
      villager.lastMove = gameTime
    }
  }

  const updateWorking = (villager, gameTime) => {
    // Working villagers stay near their workplace
    if (!villager.target && Math.random() < 0.01) {
      const workRadius = 50
      const targetX = villager.x + (Math.random() - 0.5) * workRadius
      const targetY = villager.y + (Math.random() - 0.5) * workRadius
      
      const walkableTarget = findNearestWalkableTile(targetX, targetY)
      villager.target = walkableTarget
    }
  }

  const updateFleeing = (villager, gameTime) => {
    // Flee toward god boundary center
    if (godBoundary.center) {
      const dx = godBoundary.center.x - villager.x
      const dy = godBoundary.center.y - villager.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 20) {
        // Clear existing path
        if (villager.pathfinding.currentPath) {
          pathSystem.clearPath(villager.id)
          villager.pathfinding.currentPath = null
        }

        // Request urgent path to safety
        const safeX = godBoundary.center.x + (Math.random() - 0.5) * 50
        const safeY = godBoundary.center.y + (Math.random() - 0.5) * 50
        
        const path = pathSystem.requestPath(
          villager.id,
          villager.x,
          villager.y,
          safeX,
          safeY
        )
        
        if (path) {
          villager.pathfinding.currentPath = path
          villager.pathfinding.lastPathUpdate = gameTime
        } else {
          // Fallback to direct movement if no path
          villager.target = {
            x: villager.x + (dx / distance) * 100,
            y: villager.y + (dy / distance) * 100
          }
        }
      } else {
        villager.state = 'wandering'
        if (villager.pathfinding.currentPath) {
          pathSystem.clearPath(villager.id)
          villager.pathfinding.currentPath = null
        }
      }
    }
  }

  const updateReturningHome = (villager, gameTime) => {
    if (villager.homeBuilding) {
      const dx = villager.homeBuilding.x - villager.x
      const dy = villager.homeBuilding.y - villager.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 30) {
        // Request path home if we don't have one
        if (!villager.pathfinding.currentPath || villager.pathfinding.currentPath.complete) {
          if (villager.pathfinding.currentPath) {
            pathSystem.clearPath(villager.id)
          }
          
          const path = pathSystem.requestPath(
            villager.id,
            villager.x,
            villager.y,
            villager.homeBuilding.x + villager.homeBuilding.width / 2,
            villager.homeBuilding.y + villager.homeBuilding.height / 2
          )
          
          if (path) {
            villager.pathfinding.currentPath = path
            villager.pathfinding.lastPathUpdate = gameTime
          } else {
            // Fallback to direct movement
            villager.target = {
              x: villager.homeBuilding.x,
              y: villager.homeBuilding.y
            }
          }
        }
      } else {
        villager.state = 'idle'
        villager.target = null
        if (villager.pathfinding.currentPath) {
          pathSystem.clearPath(villager.id)
          villager.pathfinding.currentPath = null
        }
      }
    }
  }

  const updateMovement = (villager, gameTime) => {
    let targetX, targetY
    
    // Priority 1: Follow A* path
    if (villager.pathfinding.currentPath && !villager.pathfinding.currentPath.complete) {
      const path = villager.pathfinding.currentPath
      
      // Check if we reached current waypoint
      if (path.isNearTarget(villager.x, villager.y, 12)) {
        path.advance()
      }
      
      // Get direction to current waypoint
      const direction = path.getDirection(villager.x, villager.y)
      
      if (direction.x !== 0 || direction.y !== 0) {
        const speed = 0.8 // Base speed
        
        // Speed modifier based on terrain (roads are faster)
        const speedModifier = 1.0 // Base speed for now, can be enhanced later
        
        villager.vx = direction.x * speed * speedModifier
        villager.vy = direction.y * speed * speedModifier
      } else {
        // Path complete
        villager.vx = 0
        villager.vy = 0
        villager.movement.isIdle = true
        villager.movement.idleDuration = 60 + Math.random() * 120
      }
    }
    // Priority 2: Follow legacy path nodes
    else if (villager.pathfinding.targetNode) {
      targetX = villager.pathfinding.targetNode.x
      targetY = villager.pathfinding.targetNode.y
      
      // Update path usage
      pathSystem.updatePathUsage(villager.pathfinding.targetNode)
      
      const dx = targetX - villager.x
      const dy = targetY - villager.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 8) {
        const speed = 0.8
        villager.vx = (dx / distance) * speed
        villager.vy = (dy / distance) * speed
      } else {
        // Reached target
        villager.pathfinding.targetNode = null
        villager.movement.isIdle = true
        villager.movement.idleDuration = 60 + Math.random() * 120
        villager.vx = 0
        villager.vy = 0
      }
    }
    // Priority 3: Follow legacy target system
    else if (villager.target) {
      targetX = villager.target.x
      targetY = villager.target.y
      
      const dx = targetX - villager.x
      const dy = targetY - villager.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 8) {
        const speed = 0.8
        villager.vx = (dx / distance) * speed
        villager.vy = (dy / distance) * speed
      } else {
        villager.target = null
        villager.vx = 0
        villager.vy = 0
      }
    }
    // Priority 4: No target - enter idle
    else {
      if (!villager.movement.isIdle) {
        villager.movement.isIdle = true
        villager.movement.idleDuration = 120 + Math.random() * 240
      }
      villager.vx = 0
      villager.vy = 0
      return
    }

    // Apply movement
    villager.x += villager.vx
    villager.y += villager.vy
    villager.vx *= 0.85 // Friction
    villager.vy *= 0.85
  }

  const constrainVillager = (villager) => {
    // First check if the new position would be in water
    if (!terrainSystem.isWalkable(villager.x, villager.y)) {
      // Find nearest walkable tile
      const walkable = findNearestWalkableTile(villager.x, villager.y, 80)
      villager.x = walkable.x
      villager.y = walkable.y
      villager.vx = 0
      villager.vy = 0
      villager.target = null
      villager.pathfinding.stuck++
      
      // Clear current path if stuck
      if (villager.pathfinding.currentPath) {
        pathSystem.clearPath(villager.id)
        villager.pathfinding.currentPath = null
      }
      
      if (villager.pathfinding.stuck > 10) {
        villager.state = 'fleeing'
        villager.pathfinding.stuck = 0
      }
    } else {
      // Reset stuck counter when moving normally
      villager.pathfinding.stuck = 0
    }

    // Constrain to world bounds
    villager.x = Math.max(20, Math.min(worldSize.width - 20, villager.x))
    villager.y = Math.max(20, Math.min(worldSize.height - 20, villager.y))
  }

  const getVillagersNear = useCallback((x, y, radius) => {
    return villagersRef.current.filter(villager => {
      const distance = Math.sqrt((villager.x - x) ** 2 + (villager.y - y) ** 2)
      return distance <= radius
    })
  }, [])

  const renderVillagers = useCallback((ctx) => {
    villagersRef.current.forEach(villager => {
      // Health ring color
      const healthColor = villager.health > 70 ? '#00ff00' : 
                         villager.health > 30 ? '#ffff00' : '#ff0000'
      
      // Use pixel-aligned positions
      const x = Math.floor(villager.x)
      const y = Math.floor(villager.y)
      
      // Draw health ring
      ctx.fillStyle = healthColor
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fill()
      
      // Draw villager body
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
      
      // Draw state indicator
      if (villager.state === 'working') {
        ctx.fillStyle = '#ffff00'
        ctx.fillRect(x - 2, y - 10, 4, 2)
      } else if (villager.state === 'fleeing') {
        ctx.fillStyle = '#ff0000'
        ctx.fillRect(x - 2, y - 10, 4, 2)
      }
    })
  }, [])

  return {
    spawnVillagers,
    updateVillagers,
    getVillagersNear,
    renderVillagers,
    villagers: villagersRef.current
  }
}