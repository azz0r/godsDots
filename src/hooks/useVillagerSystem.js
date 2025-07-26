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
    if (!villager.pathfinding.targetNode || gameTime - villager.pathfinding.lastPathUpdate > 300 + Math.random() * 600) {
      // Find a path to follow - prefer main paths or circular routes
      const pathDestination = pathSystem.findRandomDestinationOnPath(Math.random() < 0.7 ? 'main' : 'circular')
      
      if (pathDestination) {
        villager.pathfinding.targetNode = pathDestination
        villager.pathfinding.lastPathUpdate = gameTime
      } else {
        // Fallback to old behavior if no paths available
        const targetX = villager.x + (Math.random() - 0.5) * 100
        const targetY = villager.y + (Math.random() - 0.5) * 100
        const walkableTarget = findNearestWalkableTile(targetX, targetY)
        villager.target = walkableTarget
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
        villager.target = {
          x: villager.x + (dx / distance) * 100,
          y: villager.y + (dy / distance) * 100
        }
      } else {
        villager.state = 'wandering'
      }
    }
  }

  const updateReturningHome = (villager, gameTime) => {
    if (villager.homeBuilding) {
      const dx = villager.homeBuilding.x - villager.x
      const dy = villager.homeBuilding.y - villager.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 30) {
        villager.target = {
          x: villager.homeBuilding.x,
          y: villager.homeBuilding.y
        }
      } else {
        villager.state = 'idle'
        villager.target = null
      }
    }
  }

  const updateMovement = (villager, gameTime) => {
    let targetX, targetY
    
    // Priority 1: Follow path nodes
    if (villager.pathfinding.targetNode) {
      targetX = villager.pathfinding.targetNode.x
      targetY = villager.pathfinding.targetNode.y
      
      // Update path usage
      pathSystem.updatePathUsage(villager.pathfinding.targetNode)
    }
    // Priority 2: Follow legacy target system
    else if (villager.target) {
      targetX = villager.target.x
      targetY = villager.target.y
    }
    // Priority 3: Gravitate toward nearest path
    else {
      const nearestPath = pathSystem.findNearestPathNode(villager.x, villager.y, 150)
      if (nearestPath) {
        targetX = nearestPath.x
        targetY = nearestPath.y
        villager.pathfinding.targetNode = nearestPath
      } else {
        // No movement target, enter idle state
        villager.movement.isIdle = true
        villager.movement.idleDuration = 120 + Math.random() * 240 // 2-6 seconds of idle
        return
      }
    }
    
    // Calculate movement
    const dx = targetX - villager.x
    const dy = targetY - villager.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > 8) {
      const speed = 0.8 // Slower, more natural movement
      villager.vx = (dx / distance) * speed
      villager.vy = (dy / distance) * speed
    } else {
      // Reached target
      if (villager.pathfinding.targetNode) {
        // Clear path target and enter brief idle
        villager.pathfinding.targetNode = null
        villager.movement.isIdle = true
        villager.movement.idleDuration = 60 + Math.random() * 120 // 1-3 second pause
      } else {
        villager.target = null
      }
      villager.vx = 0
      villager.vy = 0
    }

    villager.x += villager.vx
    villager.y += villager.vy
    villager.vx *= 0.85 // More friction for smoother movement
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
      
      if (villager.pathfinding.stuck > 10) {
        villager.state = 'fleeing'
        villager.pathfinding.stuck = 0
      }
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
      
      // Draw health ring
      ctx.fillStyle = healthColor
      ctx.beginPath()
      ctx.arc(villager.x, villager.y, 6, 0, Math.PI * 2)
      ctx.fill()
      
      // Draw villager body
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(villager.x, villager.y, 4, 0, Math.PI * 2)
      ctx.fill()
      
      // Draw state indicator
      if (villager.state === 'working') {
        ctx.fillStyle = '#ffff00'
        ctx.fillRect(villager.x - 2, villager.y - 10, 4, 2)
      } else if (villager.state === 'fleeing') {
        ctx.fillStyle = '#ff0000'
        ctx.fillRect(villager.x - 2, villager.y - 10, 4, 2)
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