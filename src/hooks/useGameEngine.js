import { useState, useEffect, useCallback, useRef } from 'react'
import { useTerrainSystem } from './useTerrainSystem'
import { useVillagerSystem } from './useVillagerSystem'
import { useGodBoundary } from './useGodBoundary'
import { useBuildingSystem } from './useBuildingSystem'
import { usePathSystem } from './usePathSystem'
import { usePlayerSystem } from './usePlayerSystem'
import { useAISystem } from './useAISystem'
import { useResourceSystem } from './useResourceSystem'
import { dbService } from '../db/database.js'

export const useGameEngine = () => {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const gameTimeRef = useRef(0)
  const particlesRef = useRef([])
  
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 })
  const mouseRef = useRef({ x: 0, y: 0, down: false, lastX: 0, lastY: 0 })
  const worldSize = { width: 4800, height: 3200 }

  const [gameState, setGameState] = useState({
    selectedPower: null,
    humanPlayerId: null,
    gameId: 1,
    levelId: null,
    autoSaveInterval: 30000, // 30 seconds
    lastAutoSave: 0
  })

  // Initialize all systems
  const terrainSystem = useTerrainSystem(worldSize)
  const resourceSystem = useResourceSystem(worldSize, terrainSystem)
  const pathSystem = usePathSystem(worldSize, terrainSystem)
  const playerSystem = usePlayerSystem(worldSize, terrainSystem, pathSystem)
  const aiSystem = useAISystem(playerSystem, terrainSystem)

  const initializeGame = useCallback(async () => {
    console.log('🎮 Initializing game with database...')
    try {
      // Initialize or get existing game
      console.log('Checking for existing game with ID:', gameState.gameId)
      let game = await dbService.getGame(gameState.gameId)
      if (!game) {
        console.log('No existing game found, creating new one...')
        const gameId = await dbService.createGame()
        game = await dbService.getGame(gameId)
        setGameState(prev => ({ ...prev, gameId }))
        console.log('New game created and loaded:', game)
      } else {
        console.log('Existing game found:', game)
      }

      // Initialize or get active level
      let level = await dbService.getActiveLevel(game.id)
      if (!level) {
        const levelId = await dbService.createLevel(game.id)
        level = await dbService.getActiveLevel(game.id)
      }
      
      setGameState(prev => ({ ...prev, levelId: level.id }))

      // Initialize terrain and resources
      terrainSystem.generateTerrain()
      resourceSystem.generateResources()
      console.log(`Generated ${resourceSystem.resources.length} resources`)
      
      // Try to load existing game state
      const savedGameState = await dbService.loadCompleteGameState(level.id)
      
      if (savedGameState && savedGameState.players.length > 0) {
        // Load from database
        console.log('Loading saved game state')
        await loadGameFromDatabase(savedGameState)
      } else {
        // Create new game
        console.log('Creating new game')
        // Force resource regeneration for new games
        resourceSystem.generateResources()
        console.log(`New game resource generation: ${resourceSystem.resources.length} resources`)
        await createNewGame(level.id)
      }
      
    } catch (error) {
      console.error('Error initializing game:', error)
      // Fallback to creating new game without database
      await createNewGame(null)
    }
  }, [terrainSystem, resourceSystem, playerSystem, worldSize, gameState.gameId])

  const createNewGame = async (levelId) => {
    // Clear existing players
    playerSystem.players.length = 0
    
    // Create human player at center
    const centerX = worldSize.width / 2
    const centerY = worldSize.height / 2
    const humanPlayer = playerSystem.createPlayer('human', { x: centerX, y: centerY }, '#ffd700', 'You')
    humanPlayer.levelId = levelId
    playerSystem.initializePlayer(humanPlayer, 8, 25)
    
    // Create 3 AI rival gods at different locations (adjusted for smaller world)
    const aiPositions = [
      { x: centerX - 1000, y: centerY - 600, color: '#ff4444', name: 'Crimson God' },
      { x: centerX + 1000, y: centerY - 500, color: '#4444ff', name: 'Azure God' },
      { x: centerX, y: centerY + 800, color: '#44ff44', name: 'Emerald God' }
    ]
    
    aiPositions.forEach(pos => {
      const aiPlayer = playerSystem.createPlayer('ai', { x: pos.x, y: pos.y }, pos.color, pos.name)
      aiPlayer.levelId = levelId
      playerSystem.initializePlayer(aiPlayer, 6, 18)
    })
    
    // Set human player ID for UI
    setGameState(prev => ({ ...prev, humanPlayerId: humanPlayer.id }))
    
    // Only set initial camera position if not already set
    if (cameraRef.current.zoom === 1 && cameraRef.current.x === 0) {
      cameraRef.current.x = centerX - 600 // Offset to center the view
      cameraRef.current.y = centerY - 400
      cameraRef.current.zoom = 1
    }
    
    // Reset particles and game time
    particlesRef.current = []
    gameTimeRef.current = 0
  }

  const loadGameFromDatabase = async (savedGameState) => {
    // Clear existing players
    playerSystem.players.length = 0
    
    // Recreate players from database
    for (const dbPlayer of savedGameState.players) {
      const player = playerSystem.createPlayer(
        dbPlayer.type, 
        dbPlayer.position, 
        dbPlayer.color, 
        dbPlayer.name
      )
      
      // Restore player state
      player.id = dbPlayer.id
      player.levelId = dbPlayer.levelId
      player.beliefPoints = dbPlayer.beliefPoints
      player.stats = {
        powersCast: dbPlayer.statistics.miraclesCast,
        buildingsBuilt: dbPlayer.statistics.buildingsBuilt,
        villagersHealed: dbPlayer.statistics.villagersHealed,
        totalBeliefGenerated: dbPlayer.totalBeliefGenerated
      }
      
      // Restore villagers
      player.villagers = dbPlayer.villagers.map(dbVillager => ({
        id: dbVillager.id,
        name: dbVillager.name,
        x: dbVillager.position.x,
        y: dbVillager.position.y,
        vx: dbVillager.velocity.x,
        vy: dbVillager.velocity.y,
        health: dbVillager.health,
        happiness: dbVillager.happiness,
        age: dbVillager.age,
        state: dbVillager.state,
        task: dbVillager.task,
        personality: dbVillager.personality,
        skills: dbVillager.skills,
        target: null,
        pathfinding: {
          targetNode: null,
          lastPathUpdate: 0
        },
        movement: {
          isIdle: false,
          idleTime: 0,
          idleDuration: 60,
          lastMoveTime: 0
        }
      }))
      
      // Restore buildings
      player.buildings = dbPlayer.buildings.map(dbBuilding => ({
        id: dbBuilding.id,
        name: dbBuilding.name,
        type: dbBuilding.type,
        x: dbBuilding.position.x,
        y: dbBuilding.position.y,
        width: dbBuilding.size.width,
        height: dbBuilding.size.height,
        health: dbBuilding.health,
        level: dbBuilding.level,
        playerId: dbBuilding.playerId,
        workers: 0,
        maxWorkers: dbBuilding.capacity.workers,
        residents: dbBuilding.capacity.residents,
        isUnderConstruction: dbBuilding.isUnderConstruction,
        constructionTime: Math.max(0, 300 - (dbBuilding.constructionProgress / 100) * 300)
      }))
      
      // Update territory and population
      playerSystem.updatePlayerTerritory(player)
      player.population = player.villagers.length
      
      // Set human player if this is the human player
      if (player.type === 'human') {
        setGameState(prev => ({ ...prev, humanPlayerId: player.id }))
      }
    }
    
    // Restore resources - need to update the internal ref
    const restoredResources = savedGameState.resources.map(dbResource => ({
      id: dbResource.id,
      type: dbResource.type,
      x: dbResource.position.x,
      y: dbResource.position.y,
      amount: dbResource.amount,
      maxAmount: dbResource.maxAmount,
      regeneration: dbResource.regenerationRate,
      selected: false,
      beingHarvested: dbResource.isBeingHarvested,
      harvestProgress: dbResource.harvestProgress
    }))
    
    // Update the resource system's internal reference
    resourceSystem.setResources(restoredResources)
    console.log(`Loaded ${restoredResources.length} resources from database`)
  }

  const selectPower = useCallback((powerType) => {
    setGameState(prev => ({
      ...prev,
      selectedPower: prev.selectedPower === powerType ? null : powerType
    }))
  }, [])

  const zoomToWorldView = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Calculate zoom level to fit entire world
    const zoomX = canvas.width / worldSize.width
    const zoomY = canvas.height / worldSize.height
    const targetZoom = Math.min(zoomX, zoomY) * 0.9 // Add 10% padding

    // Center on world
    cameraRef.current.zoom = targetZoom
    cameraRef.current.x = (worldSize.width - canvas.width / targetZoom) / 2
    cameraRef.current.y = (worldSize.height - canvas.height / targetZoom) / 2
  }, [worldSize])

  const usePower = useCallback((worldX, worldY) => {
    const { selectedPower, humanPlayerId } = gameState
    if (!selectedPower || !humanPlayerId) return

    const humanPlayer = playerSystem.players.find(p => p.id === humanPlayerId)
    if (!humanPlayer) return

    // Check if power can be used at this location
    if (!playerSystem.canPlayerUsePowerAt(humanPlayer, worldX, worldY, selectedPower)) {
      createParticle(worldX, worldY, 'failed')
      return
    }

    const powerCosts = { heal: 20, storm: 50, food: 15, build: 100 }
    const cost = powerCosts[selectedPower] || 0

    if (humanPlayer.beliefPoints < cost) {
      createParticle(worldX, worldY, 'failed')
      return
    }

    humanPlayer.beliefPoints -= cost
    humanPlayer.stats.powersCast++

    switch (selectedPower) {
      case 'heal':
        castHeal(worldX, worldY, humanPlayer)
        break
      case 'storm':
        castStorm(worldX, worldY, humanPlayer)
        break
      case 'food':
        createFood(worldX, worldY, humanPlayer)
        break
      case 'build':
        buildStructure(worldX, worldY, humanPlayer)
        break
    }
    
    selectPower(null)
  }, [gameState, playerSystem, selectPower])

  const castHeal = (x, y, player) => {
    const nearbyVillagers = player.villagers.filter(villager => {
      const distance = Math.sqrt((villager.x - x) ** 2 + (villager.y - y) ** 2)
      return distance <= 100
    })
    
    const distance = Math.sqrt((x - player.territory.center.x) ** 2 + (y - player.territory.center.y) ** 2)
    const strength = player.territory.strength * (1 - (distance / player.territory.radius) * 0.5)
    
    nearbyVillagers.forEach(villager => {
      const healAmount = 30 * strength
      villager.health = Math.min(100, villager.health + healAmount)
      villager.happiness += 10 * strength
      villager.state = 'wandering'
      player.stats.villagersHealed++
    })
    
    createParticle(x, y, 'heal')
  }

  const castStorm = (x, y, player) => {
    // Storm affects ALL players' villagers in range
    playerSystem.players.forEach(targetPlayer => {
      const nearbyVillagers = targetPlayer.villagers.filter(villager => {
        const distance = Math.sqrt((villager.x - x) ** 2 + (villager.y - y) ** 2)
        return distance <= 150
      })
      
      const distance = Math.sqrt((x - player.territory.center.x) ** 2 + (y - player.territory.center.y) ** 2)
      const strength = player.territory.strength * (1 - (distance / player.territory.radius) * 0.5)
      
      nearbyVillagers.forEach(villager => {
        const damage = 20 * strength
        villager.health -= damage
        villager.happiness -= 15 * strength
        villager.state = 'fleeing'
        
        if (villager.health <= 0) {
          // Remove dead villager
          const index = targetPlayer.villagers.indexOf(villager)
          if (index > -1) {
            targetPlayer.villagers.splice(index, 1)
            targetPlayer.population = targetPlayer.villagers.length
          }
        }
      })
    })
    
    createParticle(x, y, 'storm')
  }

  const createFood = (x, y, player) => {
    const nearbyVillagers = player.villagers.filter(villager => {
      const distance = Math.sqrt((villager.x - x) ** 2 + (villager.y - y) ** 2)
      return distance <= 80
    })
    
    const distance = Math.sqrt((x - player.territory.center.x) ** 2 + (y - player.territory.center.y) ** 2)
    const strength = player.territory.strength * (1 - (distance / player.territory.radius) * 0.5)
    
    nearbyVillagers.forEach(villager => {
      villager.happiness += 15 * strength
      villager.health = Math.min(100, villager.health + 5 * strength)
    })
    
    createParticle(x, y, 'food')
  }

  const buildStructure = (x, y, player) => {
    // Check if location is within player's territory
    if (!playerSystem.isWithinPlayerTerritory(player, x, y)) {
      console.log('Build failed: Outside territory')
      createParticle(x, y, 'failed')
      return
    }
    
    // Check if terrain is walkable
    if (!terrainSystem.isWalkable(x, y)) {
      console.log('Build failed: Unwalkable terrain')
      createParticle(x, y, 'failed')
      return
    }
    
    // Check distance from other buildings
    const tooClose = player.buildings.some(building => {
      const dx = (x - 15) - building.x
      const dy = (y - 15) - building.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      return distance < 50 // Reduced from 60 to make building easier
    })
    
    if (tooClose) {
      console.log('Build failed: Too close to existing building')
      createParticle(x, y, 'failed')
      return
    }
    
    // Success - create the building
    const newBuilding = {
      id: `house_${player.id}_${Date.now()}`,
      x: x - 15,
      y: y - 15,
      width: 30,
      height: 30,
      type: 'house',
      health: 80,
      level: 1,
      playerId: player.id,
      workers: 0,
      maxWorkers: 2,
      residents: Math.floor(Math.random() * 3) + 1,
      isUnderConstruction: true,
      constructionTime: 0
    }
    
    player.buildings.push(newBuilding)
    player.stats.buildingsBuilt++
    
    console.log(`Build success! Player ${player.id} now has ${player.buildings.length} buildings`)
    
    // Update territory
    playerSystem.updatePlayerTerritory(player)
    
    // Regenerate paths to include new building
    if (pathSystem && pathSystem.generateInitialPaths) {
      setTimeout(() => pathSystem.generateInitialPaths(player.buildings), 100)
    }
    
    createParticle(x, y, 'build')
  }

  const createParticle = (x, y, type) => {
    const colors = {
      heal: '#00ff00',
      storm: '#ff0000', 
      food: '#ffff00',
      build: '#00ffff',
      failed: '#ff8888'
    }
    
    const particleCount = type === 'storm' ? 30 : 20
    
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        color: colors[type] || '#ffffff',
        life: type === 'storm' ? 80 : 60,
        maxLife: type === 'storm' ? 80 : 60,
        size: type === 'storm' ? 4 : 3
      })
    }
  }

  const updateGame = useCallback(() => {
    gameTimeRef.current++
    
    // Update all players
    playerSystem.players.forEach(player => {
      // Update villager AI and movement
      updatePlayerVillagers(player, gameTimeRef.current)
      
      // Update buildings
      updatePlayerBuildings(player, gameTimeRef.current)
      
      // Update territory
      playerSystem.updatePlayerTerritory(player)
      
      // Generate belief points continuously based on followers
      if (gameTimeRef.current % 60 === 0) { // Every second
        const populationFactor = Math.max(0, player.villagers.length * 0.3) // Increased from 0.1
        const happinessFactor = getAverageHappiness(player) * 0.02 // Increased from 0.01
        const templeFactor = player.buildings.filter(b => b.type === 'temple' && !b.isUnderConstruction).length * 1.0 // Increased from 0.5
        
        const beliefGeneration = populationFactor + happinessFactor + templeFactor
        
        if (player.type === 'human') {
          console.log(`Belief generation: pop=${populationFactor.toFixed(1)}, happiness=${happinessFactor.toFixed(1)}, temple=${templeFactor}, total=${beliefGeneration.toFixed(1)}, current=${player.beliefPoints.toFixed(1)}`)
        }
        
        player.beliefPoints += beliefGeneration
        
        // Cap belief points at higher level
        player.beliefPoints = Math.min(2000, player.beliefPoints)
      }
    })
    
    // Update AI players
    aiSystem.updateAIPlayers(gameTimeRef.current, playerSystem.players)
    
    // Update resources
    resourceSystem.updateResources(gameTimeRef.current)
    
    // Auto-save every 30 seconds (1800 ticks at 60fps)
    if (gameTimeRef.current % 1800 === 0 && gameState.levelId) {
      autoSaveGame()
    }
    
    // Update particles
    particlesRef.current = particlesRef.current.filter(particle => {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.vx *= 0.95
      particle.vy *= 0.95
      particle.life--
      return particle.life > 0
    })
  }, [playerSystem, aiSystem, gameState.levelId])

  const autoSaveGame = useCallback(async () => {
    try {
      if (gameState.levelId && gameState.gameId) {
        console.log('Auto-saving game...')
        await dbService.saveCompleteGameState(
          gameState.gameId,
          gameState.levelId,
          playerSystem,
          resourceSystem
        )
        setGameState(prev => ({ ...prev, lastAutoSave: Date.now() }))
        console.log('Auto-save completed')
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, [gameState.gameId, gameState.levelId, playerSystem, resourceSystem])

  const manualSaveGame = useCallback(async () => {
    try {
      if (gameState.levelId && gameState.gameId) {
        console.log('Manual save...')
        await dbService.saveCompleteGameState(
          gameState.gameId,
          gameState.levelId,
          playerSystem,
          resourceSystem
        )
        console.log('Manual save completed')
        return true
      }
      return false
    } catch (error) {
      console.error('Manual save failed:', error)
      return false
    }
  }, [gameState.gameId, gameState.levelId, playerSystem, resourceSystem])

  const getAverageHappiness = (player) => {
    if (player.villagers.length === 0) return 0
    const totalHappiness = player.villagers.reduce((sum, v) => sum + v.happiness, 0)
    return totalHappiness / player.villagers.length
  }

  const updatePlayerVillagers = (player, gameTime) => {
    player.villagers.forEach(villager => {
      // Handle idle periods
      if (villager.movement.isIdle) {
        villager.movement.idleTime++
        if (villager.movement.idleTime >= villager.movement.idleDuration) {
          villager.movement.isIdle = false
          villager.movement.idleTime = 0
        } else {
          return
        }
      }

      // Update AI state less frequently
      if (gameTime - villager.movement.lastMoveTime > 60) {
        updateVillagerAI(villager, player, gameTime)
        villager.movement.lastMoveTime = gameTime
      }

      // Movement with path following
      updateVillagerMovement(villager, gameTime)
      
      // Constrain to world bounds and avoid water
      constrainVillager(villager)
      
      // Update happiness based on territory - but keep villagers loyal to their god
      if (gameTime % 300 === Math.floor(villager.id % 300)) {
        const inOwnTerritory = playerSystem.isWithinPlayerTerritory(player, villager.x, villager.y)
        if (inOwnTerritory) {
          villager.happiness = Math.min(100, villager.happiness + 0.5)
        } else {
          // If outside own territory, strongly encourage return
          villager.happiness = Math.max(0, villager.happiness - 5)
          villager.state = 'returning_home'
        }
      }
    })

    player.population = player.villagers.length
  }

  const updatePlayerBuildings = (player, gameTime) => {
    player.buildings.forEach(building => {
      if (building.isUnderConstruction) {
        building.constructionTime += 1
        if (building.constructionTime >= 300) {
          building.isUnderConstruction = false
        }
      }
    })
  }

  const updateVillagerAI = (villager, player, gameTime) => {
    switch (villager.state) {
      case 'wandering':
        if (!villager.pathfinding.targetNode || gameTime - villager.pathfinding.lastPathUpdate > 300 + Math.random() * 600) {
          const pathDestination = pathSystem.findRandomDestinationOnPath(Math.random() < 0.7 ? 'main' : 'circular')
          if (pathDestination) {
            villager.pathfinding.targetNode = pathDestination
            villager.pathfinding.lastPathUpdate = gameTime
          }
        }
        break
      case 'fleeing':
        if (player.territory.center) {
          const dx = player.territory.center.x - villager.x
          const dy = player.territory.center.y - villager.y
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
        break
      case 'returning_home':
        // Force villager back to their own territory center
        if (player.territory.center) {
          const dx = player.territory.center.x - villager.x
          const dy = player.territory.center.y - villager.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance > player.territory.radius * 0.8) {
            // Still outside - keep heading home
            villager.target = {
              x: player.territory.center.x + (Math.random() - 0.5) * player.territory.radius,
              y: player.territory.center.y + (Math.random() - 0.5) * player.territory.radius
            }
          } else {
            // Back in territory - resume normal behavior
            villager.state = 'wandering'
            villager.target = null
          }
        }
        break
    }
  }

  const updateVillagerMovement = (villager, gameTime) => {
    let targetX, targetY
    
    if (villager.pathfinding.targetNode) {
      targetX = villager.pathfinding.targetNode.x
      targetY = villager.pathfinding.targetNode.y
      pathSystem.updatePathUsage(villager.pathfinding.targetNode)
    } else if (villager.target) {
      targetX = villager.target.x
      targetY = villager.target.y
    } else {
      const nearestPath = pathSystem.findNearestPathNode(villager.x, villager.y, 150)
      if (nearestPath) {
        targetX = nearestPath.x
        targetY = nearestPath.y
        villager.pathfinding.targetNode = nearestPath
      } else {
        villager.movement.isIdle = true
        villager.movement.idleDuration = 120 + Math.random() * 240
        return
      }
    }
    
    const dx = targetX - villager.x
    const dy = targetY - villager.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > 8) {
      const speed = 3.0 // Increased from 1.5
      villager.vx = (dx / distance) * speed
      villager.vy = (dy / distance) * speed
    } else {
      if (villager.pathfinding.targetNode) {
        villager.pathfinding.targetNode = null
        villager.movement.isIdle = true
        villager.movement.idleDuration = 60 + Math.random() * 120
      } else {
        villager.target = null
      }
      villager.vx = 0
      villager.vy = 0
    }

    villager.x += villager.vx
    villager.y += villager.vy
    villager.vx *= 0.85
    villager.vy *= 0.85
  }

  const constrainVillager = (villager) => {
    if (!terrainSystem.isWalkable(villager.x, villager.y)) {
      const walkable = findNearestWalkable(villager.x, villager.y, 80)
      villager.x = walkable.x
      villager.y = walkable.y
      villager.vx = 0
      villager.vy = 0
      villager.target = null
      villager.pathfinding.targetNode = null
    }

    villager.x = Math.max(20, Math.min(worldSize.width - 20, villager.x))
    villager.y = Math.max(20, Math.min(worldSize.height - 20, villager.y))
  }

  const findNearestWalkable = (x, y, radius = 80) => {
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
  }

  const renderGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const camera = cameraRef.current
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(camera.zoom, camera.zoom)
    ctx.translate(-camera.x, -camera.y)
    
    // Render in layers
    terrainSystem.renderTerrain(ctx)
    resourceSystem.renderResources(ctx)
    pathSystem.renderPaths(ctx)
    
    // Render all players
    playerSystem.players.forEach(player => {
      playerSystem.renderPlayerTerritory(ctx, player)
    })
    
    playerSystem.players.forEach(player => {
      playerSystem.renderPlayerBuildings(ctx, player)
    })
    
    playerSystem.players.forEach(player => {
      playerSystem.renderPlayerVillagers(ctx, player)
    })
    
    // Render building preview if in build mode
    if (gameState.selectedPower === 'build') {
      renderBuildingPreview(ctx)
    }
    
    renderParticles(ctx)
    
    ctx.restore()
  }, [terrainSystem, pathSystem, playerSystem, gameState.selectedPower])

  const renderBuildingPreview = (ctx) => {
    const humanPlayer = getHumanPlayer()
    if (!humanPlayer) return

    // Get mouse position in world coordinates
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const camera = cameraRef.current
    const mouseX = mouseRef.current.x
    const mouseY = mouseRef.current.y
    
    if (mouseX === 0 && mouseY === 0) return // No mouse position yet

    const worldX = (mouseX - rect.left) / camera.zoom + camera.x
    const worldY = (mouseY - rect.top) / camera.zoom + camera.y

    // Check if we can build here
    const canBuild = playerSystem.isWithinPlayerTerritory(humanPlayer, worldX, worldY) &&
                     terrainSystem.isWalkable(worldX, worldY) &&
                     !humanPlayer.buildings.some(building => {
                       const dx = (worldX - 15) - building.x
                       const dy = (worldY - 15) - building.y
                       const distance = Math.sqrt(dx * dx + dy * dy)
                       return distance < 50
                     })

    // Draw preview building
    const previewX = worldX - 15
    const previewY = worldY - 15
    const previewSize = 30

    if (canBuild) {
      // Green preview for valid placement
      ctx.fillStyle = 'rgba(0, 255, 0, 0.5)'
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'
    } else {
      // Red preview for invalid placement
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)'
    }

    ctx.fillRect(previewX, previewY, previewSize, previewSize)
    ctx.strokeRect(previewX, previewY, previewSize, previewSize)
    ctx.lineWidth = 2

    // Add text indicator
    ctx.fillStyle = canBuild ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    const text = canBuild ? 'BUILD HERE (100 belief)' : 'CANNOT BUILD HERE'
    ctx.fillText(text, worldX, worldY - 25)
  }

  const renderParticles = (ctx) => {
    particlesRef.current.forEach(particle => {
      const alpha = particle.life / particle.maxLife
      ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0')
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size || 3, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  const gameLoop = useCallback(() => {
    updateGame()
    renderGame()
    animationRef.current = requestAnimationFrame(gameLoop)
  }, [updateGame, renderGame])

  useEffect(() => {
    let initialized = false
    
    const initialize = async () => {
      if (!initialized && playerSystem.players.length === 0) {
        initialized = true
        await initializeGame()
        gameLoop()
      }
    }
    
    initialize()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, []) // Empty dependency array to initialize only once

  const getHumanPlayer = useCallback(() => {
    return playerSystem.players.find(p => p.id === gameState.humanPlayerId)
  }, [playerSystem.players, gameState.humanPlayerId])

  return {
    canvasRef,
    gameState: {
      ...gameState,
      // Expose human player data for UI
      beliefPoints: getHumanPlayer()?.beliefPoints || 0,
      population: getHumanPlayer()?.population || 0
    },
    gameStateRef: {
      current: {
        camera: cameraRef.current,
        mouse: mouseRef.current,
        worldSize,
        time: gameTimeRef.current
      }
    },
    selectPower,
    usePower,
    zoomToWorldView,
    manualSaveGame,
    autoSaveGame,
    // Expose systems for debugging/external access
    systems: {
      terrain: terrainSystem,
      resources: resourceSystem,
      paths: pathSystem,
      players: playerSystem,
      ai: aiSystem
    }
  }
}