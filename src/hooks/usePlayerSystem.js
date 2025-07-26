import { useRef, useCallback } from 'react'

export const usePlayerSystem = (worldSize, terrainSystem, pathSystem) => {
  const playersRef = useRef([])
  const playerIdCounter = useRef(0)

  const createPlayer = useCallback((type, position, color, name) => {
    const playerId = playerIdCounter.current++
    
    const player = {
      id: playerId,
      name: name || `${type === 'human' ? 'Player' : 'AI'} ${playerId}`,
      type, // 'human' or 'ai'
      color: color || (type === 'human' ? '#ffd700' : '#ff4444'),
      
      // Resources
      beliefPoints: 100,
      population: 0,
      resources: {
        food: 50,
        wood: 30,
        stone: 20
      },
      
      // Territory
      territory: {
        center: position,
        radius: 400, // Increased from 300 to give more building space
        strength: 1.0
      },
      
      // Buildings and followers
      buildings: [],
      villagers: [],
      
      // AI specific properties
      ai: type === 'ai' ? {
        aggressiveness: Math.random() * 0.8 + 0.2, // 0.2 to 1.0
        expansionDesire: Math.random() * 0.8 + 0.2,
        defensiveness: Math.random() * 0.8 + 0.2,
        lastAction: 0,
        strategy: Math.random() < 0.5 ? 'aggressive' : 'defensive',
        targetPlayer: null,
        actionCooldown: 0
      } : null,
      
      // Statistics
      stats: {
        buildingsBuilt: 0,
        villagersHealed: 0,
        powersCast: 0,
        territoryCaptured: 0
      }
    }
    
    playersRef.current.push(player)
    return player
  }, [])

  const initializePlayer = useCallback((player, initialBuildings, initialVillagers) => {
    // Create initial temple
    const temple = {
      id: `temple_${player.id}`,
      x: player.territory.center.x - 30,
      y: player.territory.center.y - 30,
      width: 60,
      height: 60,
      type: 'temple',
      health: 100,
      level: 1,
      playerId: player.id,
      workers: 0,
      maxWorkers: 3
    }
    
    player.buildings.push(temple)
    
    // Create initial houses around temple
    const houseCount = initialBuildings || 6
    for (let i = 0; i < houseCount; i++) {
      const angle = (i / houseCount) * Math.PI * 2
      const distance = 120 + Math.random() * 80
      const houseX = player.territory.center.x + Math.cos(angle) * distance - 15
      const houseY = player.territory.center.y + Math.sin(angle) * distance - 15
      
      // Ensure house is on walkable terrain
      if (terrainSystem.isWalkable(houseX + 15, houseY + 15)) {
        const house = {
          id: `house_${player.id}_${i}`,
          x: houseX,
          y: houseY,
          width: 30,
          height: 30,
          type: 'house',
          health: 80,
          level: 1,
          playerId: player.id,
          workers: 0,
          maxWorkers: 2,
          residents: Math.floor(Math.random() * 3) + 1
        }
        player.buildings.push(house)
      }
    }
    
    // Create initial villagers
    const villagerCount = initialVillagers || 20
    for (let i = 0; i < villagerCount; i++) {
      const villager = {
        id: `villager_${player.id}_${i}`,
        playerId: player.id,
        x: player.territory.center.x + (Math.random() - 0.5) * 200,
        y: player.territory.center.y + (Math.random() - 0.5) * 200,
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
      player.villagers.push(villager)
    }
    
    player.population = player.villagers.length
    
    // Generate paths for this player's settlement
    if (pathSystem && pathSystem.generateInitialPaths) {
      setTimeout(() => pathSystem.generateInitialPaths(player.buildings), 100)
    }
  }, [terrainSystem, pathSystem])

  const updatePlayerTerritory = useCallback((player) => {
    // Find primary temple
    const temple = player.buildings.find(b => b.type === 'temple')
    
    if (temple) {
      player.territory.center = {
        x: temple.x + temple.width / 2,
        y: temple.y + temple.height / 2
      }
      
      // Territory radius based on buildings and population
      const nearbyBuildings = player.buildings.filter(building => {
        const distance = Math.sqrt(
          (building.x - player.territory.center.x) ** 2 + 
          (building.y - player.territory.center.y) ** 2
        )
        return distance <= 400 && building.type === 'house'
      })
      
      player.territory.radius = Math.max(250, 250 + nearbyBuildings.length * 20)
      player.territory.strength = Math.min(2.0, 1.0 + nearbyBuildings.length * 0.1)
    }
  }, [])

  const isWithinPlayerTerritory = useCallback((player, x, y) => {
    const distance = Math.sqrt(
      (x - player.territory.center.x) ** 2 + 
      (y - player.territory.center.y) ** 2
    )
    return distance <= player.territory.radius
  }, [])

  const getPlayerAt = useCallback((x, y) => {
    return playersRef.current.find(player => 
      isWithinPlayerTerritory(player, x, y)
    )
  }, [isWithinPlayerTerritory])

  const canPlayerUsePowerAt = useCallback((player, x, y, powerType) => {
    if (!isWithinPlayerTerritory(player, x, y)) return false
    
    const powerRequirements = {
      heal: 0.3,
      food: 0.2,
      storm: 0.8,
      build: 0.5
    }
    
    const distance = Math.sqrt(
      (x - player.territory.center.x) ** 2 + 
      (y - player.territory.center.y) ** 2
    )
    const strength = player.territory.strength * (1 - (distance / player.territory.radius) * 0.5)
    
    return strength >= (powerRequirements[powerType] || 0.5)
  }, [isWithinPlayerTerritory])

  const renderPlayerTerritory = useCallback((ctx, player) => {
    const { center, radius } = player.territory
    
    // Draw territory circle with player color
    const gradient = ctx.createRadialGradient(
      center.x, center.y, 0,
      center.x, center.y, radius
    )
    
    const colorRgb = player.color === '#ffd700' 
      ? '255, 215, 0' 
      : player.color === '#ff4444'
      ? '255, 68, 68'
      : '100, 149, 237' // Default blue
    
    gradient.addColorStop(0, `rgba(${colorRgb}, 0.15)`)
    gradient.addColorStop(0.7, `rgba(${colorRgb}, 0.08)`)
    gradient.addColorStop(1, `rgba(${colorRgb}, 0.02)`)
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw territory border
    const alpha = player.type === 'human' ? 0.4 : 0.2
    ctx.strokeStyle = `rgba(${colorRgb}, ${alpha})`
    ctx.lineWidth = 2
    ctx.setLineDash([10, 5])
    ctx.beginPath()
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    
    // Draw energy particles around border
    const time = Date.now() * 0.001
    const particleCount = player.type === 'human' ? 20 : 12
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + time * 0.5
      const x = center.x + Math.cos(angle) * radius
      const y = center.y + Math.sin(angle) * radius
      
      const particleAlpha = player.type === 'human' 
        ? 0.3 + Math.sin(time * 3 + i) * 0.2
        : 0.15 + Math.sin(time * 2 + i) * 0.1
      
      ctx.fillStyle = `rgba(${colorRgb}, ${particleAlpha})`
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [])

  const renderPlayerBuildings = useCallback((ctx, player) => {
    player.buildings.forEach(building => {
      if (building.type === 'temple') {
        // Temple rendering with player color
        const baseColor = player.color
        ctx.fillStyle = building.isUnderConstruction ? '#999999' : baseColor
        ctx.fillRect(building.x, building.y, building.width, building.height)
        
        if (!building.isUnderConstruction) {
          ctx.fillStyle = player.type === 'human' ? '#ff6b35' : '#cc3333'
          ctx.fillRect(building.x + 20, building.y + 20, 20, 20)
        }
      } else if (building.type === 'house') {
        // House rendering with slight color variation
        const houseColor = player.type === 'human' ? '#8b4513' : '#7a3f12'
        ctx.fillStyle = building.isUnderConstruction ? '#665533' : houseColor
        ctx.fillRect(building.x, building.y, building.width, building.height)
        
        if (!building.isUnderConstruction) {
          ctx.fillStyle = player.type === 'human' ? '#654321' : '#5d3018'
          ctx.fillRect(building.x + 2, building.y + 2, building.width - 4, building.height - 4)
        }
      }
      
      // Construction progress indicator
      if (building.isUnderConstruction) {
        const progress = building.constructionTime / 300
        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)'
        ctx.fillRect(building.x, building.y - 8, building.width * progress, 4)
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.lineWidth = 1
        ctx.strokeRect(building.x, building.y - 8, building.width, 4)
      }
    })
  }, [])

  const renderPlayerVillagers = useCallback((ctx, player) => {
    player.villagers.forEach(villager => {
      // Health ring color
      const healthColor = villager.health > 70 ? '#00ff00' : 
                         villager.health > 30 ? '#ffff00' : '#ff0000'
      
      // Draw health ring
      ctx.fillStyle = healthColor
      ctx.beginPath()
      ctx.arc(villager.x, villager.y, 6, 0, Math.PI * 2)
      ctx.fill()
      
      // Draw villager body with player color tint
      const bodyColor = player.type === 'human' ? '#ffffff' : '#ffcccc'
      ctx.fillStyle = bodyColor
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
    createPlayer,
    initializePlayer,
    updatePlayerTerritory,
    isWithinPlayerTerritory,
    getPlayerAt,
    canPlayerUsePowerAt,
    renderPlayerTerritory,
    renderPlayerBuildings,
    renderPlayerVillagers,
    players: playersRef.current
  }
}