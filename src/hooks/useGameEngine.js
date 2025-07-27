import { useState, useEffect, useCallback, useRef } from 'react'
import { useTerrainSystem } from './useTerrainSystem'
import { useVillagerSystem } from './useVillagerSystem'
import { useGodBoundary } from './useGodBoundary'
import { useBuildingSystemWithLand } from './useBuildingSystemWithLand'
import { usePathSystem } from './usePathSystem'
import { usePlayerSystem } from './usePlayerSystem'
import { useAISystem } from './useAISystem'
import { useResourceSystem } from './useResourceSystem'
import { usePixelPerfectMovement } from './usePixelPerfectMovement'
import { useLandManagement } from './useLandManagement'
import { GameInitializer } from '../utils/GameInitializer'
import { PathfindingGrid } from '../utils/pathfinding/PathfindingGrid'
import { dbService } from '../db/database.js'
import gameConfig from '../config/gameConfig'

export const useGameEngine = (gameContext = {}) => {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const gameTimeRef = useRef(0)
  const particlesRef = useRef([])
  const fpsRef = useRef({ frames: 0, lastTime: 0, current: 60 })
  const debugModeRef = useRef(gameContext.debugMode || false)
  
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 })
  const mouseRef = useRef({ x: 0, y: 0, down: false, lastX: 0, lastY: 0 })
  const worldSize = { width: gameConfig.map.width * gameConfig.tileSize, height: gameConfig.map.height * gameConfig.tileSize }

  const [gameState, setGameState] = useState({
    selectedPower: null,
    humanPlayerId: null,
    gameId: 1,
    levelId: null,
    autoSaveInterval: 30000, // 30 seconds
    lastAutoSave: 0,
    beliefPoints: gameConfig.startingBeliefPoints,
    population: 0,
    hoveredTile: null,
    selectedTile: null
  })

  // Initialize all systems with integrated pathfinding and land management
  const terrainSystem = useTerrainSystem(worldSize, gameContext.mapGenerator)
  const resourceSystem = useResourceSystem(worldSize, terrainSystem)
  const pathSystem = usePathSystem(worldSize, terrainSystem, gameContext.pathfindingGrid)
  const playerSystem = usePlayerSystem(worldSize, terrainSystem, pathSystem)
  const buildingSystem = useBuildingSystemWithLand(worldSize, terrainSystem, gameContext.landManager, gameContext.pathfindingGrid)
  const aiSystem = useAISystem(playerSystem, terrainSystem, buildingSystem)
  const pixelPerfect = usePixelPerfectMovement(gameConfig.pixelPerfect)
  const landManagement = useLandManagement(gameContext.landManager, gameState.beliefPoints)
  
  // Initialize PathfindingGrid once terrain system is ready
  useEffect(() => {
    if (terrainSystem && gameContext.setPathfindingGrid && !gameContext.pathfindingGrid) {
      const grid = new PathfindingGrid(worldSize.width, worldSize.height, terrainSystem)
      gameContext.setPathfindingGrid(grid)
    }
  }, [terrainSystem, gameContext, worldSize])

  const initializeGame = useCallback(async () => {
    console.log('🎮 Initializing game with integrated systems...')
    
    // Ensure pathfindingGrid is initialized
    let pathfindingGrid = gameContext.pathfindingGrid
    if (!pathfindingGrid) {
      console.log('Creating PathfindingGrid...')
      pathfindingGrid = new PathfindingGrid(
        worldSize.width,
        worldSize.height
      )
      // Update the context if we have setPathfindingGrid
      if (gameContext.setPathfindingGrid) {
        gameContext.setPathfindingGrid(pathfindingGrid)
      }
    }
    
    // Initialize game using the GameInitializer
    const gameInitializer = new GameInitializer({
      mapGenerator: gameContext.mapGenerator,
      landManager: gameContext.landManager,
      pathfindingGrid: pathfindingGrid
    })
    
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
      
      // Try to load existing game state
      const savedGameState = await dbService.loadCompleteGameState(level.id)
      
      if (savedGameState && savedGameState.players.length > 0) {
        // Load from database
        console.log('Loading saved game state')
        const loadedState = await gameInitializer.loadGame(savedGameState)
        await loadGameFromDatabase(loadedState)
      } else {
        // Create new game with integrated systems
        console.log('Creating new game with procedural generation')
        const initialState = await gameInitializer.initializeNewGame()
        
        // Apply generated state to systems
        terrainSystem.setTerrain(initialState.terrain)
        resourceSystem.setResources(initialState.resources)
        terrainSystem.setSpawnPoints(initialState.spawnPoints)
        
        // Set terrain system on pathfinding grid if needed
        if (pathfindingGrid && !pathfindingGrid.terrainSystem) {
          pathfindingGrid.setTerrainSystem(terrainSystem)
        }
        
        // Update game state
        setGameState(prev => ({ 
          ...prev, 
          beliefPoints: initialState.beliefPoints,
          population: initialState.population
        }))
        
        await createNewGame(level.id)
      }
      
    } catch (error) {
      console.error('Error initializing game:', error)
      // Fallback to creating new game without database
      const initialState = await gameInitializer.initializeNewGame()
      terrainSystem.setTerrain(initialState.terrain)
      resourceSystem.setResources(initialState.resources)
      terrainSystem.setSpawnPoints(initialState.spawnPoints)
      
      // Set terrain system on pathfinding grid if needed
      if (pathfindingGrid && !pathfindingGrid.terrainSystem) {
        pathfindingGrid.setTerrainSystem(terrainSystem)
      }
      await createNewGame(null)
    }
  }, [gameContext, terrainSystem, resourceSystem, playerSystem, gameState.gameId])

  const createNewGame = async (levelId) => {
    // Clear existing players
    playerSystem.players.length = 0
    
    // Get spawn points from terrain system
    const spawnPoints = terrainSystem.getSpawnPoints()
    
    if (spawnPoints.length === 0) {
      console.warn('No spawn points generated, falling back to center position')
      // Fallback to center if no spawn points
      const centerX = worldSize.width / 2
      const centerY = worldSize.height / 2
      const humanPlayer = playerSystem.createPlayer('human', { x: centerX, y: centerY }, '#ffd700', 'You')
      humanPlayer.levelId = levelId
      playerSystem.initializePlayer(humanPlayer, 8, 25)
      setGameState(prev => ({ ...prev, humanPlayerId: humanPlayer.id }))
    } else {
      // Use spawn points for player placement
      const humanSpawn = spawnPoints[0]
      const humanPlayer = playerSystem.createPlayer('human', { x: humanSpawn.x, y: humanSpawn.y }, '#ffd700', 'You')
      humanPlayer.levelId = levelId
      playerSystem.initializePlayer(humanPlayer, 8, 25)
      
      // Create AI players at other spawn points
      const aiConfigs = [
        { color: '#ff4444', name: 'Crimson God' },
        { color: '#4444ff', name: 'Azure God' },
        { color: '#44ff44', name: 'Emerald God' }
      ]
      
      for (let i = 0; i < Math.min(aiConfigs.length, spawnPoints.length - 1); i++) {
        const spawn = spawnPoints[i + 1]
        const config = aiConfigs[i]
        const aiPlayer = playerSystem.createPlayer('ai', { x: spawn.x, y: spawn.y }, config.color, config.name)
        aiPlayer.levelId = levelId
        playerSystem.initializePlayer(aiPlayer, 6, 18)
      }
      
      // Set human player ID for UI
      setGameState(prev => ({ ...prev, humanPlayerId: humanPlayer.id }))
      
      // Center camera on human spawn
      cameraRef.current.x = humanSpawn.x - 600
      cameraRef.current.y = humanSpawn.y - 400
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
    
    // Update pathfinding grid for the new building
    if (pathSystem && pathSystem.updateBuilding) {
      pathSystem.updateBuilding(newBuilding, 'add')
    }
    
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

  const updateGame = useCallback((currentTime) => {
    gameTimeRef.current++
    
    // Update FPS counter
    fpsRef.current.frames++
    if (currentTime - fpsRef.current.lastTime > 1000) {
      fpsRef.current.current = fpsRef.current.frames
      fpsRef.current.frames = 0
      fpsRef.current.lastTime = currentTime
    }
    
    // Update all players
    playerSystem.players.forEach(player => {
      // Update villager AI and movement with pixel-perfect system
      updatePlayerVillagers(player, gameTimeRef.current, currentTime)
      
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
    
    // Clean pathfinding cache every 10 seconds
    if (gameTimeRef.current % 600 === 0 && pathSystem.cleanupCache) {
      pathSystem.cleanupCache()
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

  const updatePlayerVillagers = (player, gameTime, currentTime) => {
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

      // Setup target for movement if needed
      if (!villager.movement.isIdle) {
        setupVillagerTarget(villager)
      }
      
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
    
    // Batch update movement with pixel-perfect system
    pixelPerfect.batchUpdateMovement(player.villagers, currentTime, terrainSystem, worldSize)
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
    const tileSize = gameConfig.tileSize
    
    switch (villager.state) {
      case 'wandering':
        if (!villager.path || villager.path.length === 0 || gameTime - villager.pathfinding.lastPathUpdate > 300 + Math.random() * 600) {
          // Find a random destination using A* pathfinding
          const currentTileX = Math.floor(villager.x / tileSize)
          const currentTileY = Math.floor(villager.y / tileSize)
          
          // Random destination within territory or nearby
          const radius = player.territory.radius / tileSize
          const centerX = player.territory.center.x / tileSize
          const centerY = player.territory.center.y / tileSize
          
          const targetX = Math.floor(centerX + (Math.random() - 0.5) * radius * 2)
          const targetY = Math.floor(centerY + (Math.random() - 0.5) * radius * 2)
          
          // Use A* pathfinding to find path
          if (gameContext.pathfindingGrid) {
            const path = gameContext.pathfindingGrid.findPath(
              currentTileX, currentTileY,
              targetX, targetY
            )
            
            if (path && path.length > 0) {
              villager.path = path.map(node => ({
                x: node.x * tileSize + tileSize / 2,
                y: node.y * tileSize + tileSize / 2
              }))
              villager.pathIndex = 0
              villager.pathfinding.lastPathUpdate = gameTime
            }
          }
        }
        break
        
      case 'fleeing':
        if (player.territory.center) {
          const currentTileX = Math.floor(villager.x / tileSize)
          const currentTileY = Math.floor(villager.y / tileSize)
          
          // Find path away from danger
          const dx = villager.x - player.territory.center.x
          const dy = villager.y - player.territory.center.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance > 20 * tileSize) {
            villager.state = 'wandering'
          } else {
            // Calculate flee target
            const fleeDistance = 10 // tiles
            const targetX = Math.floor(currentTileX + (dx / distance) * fleeDistance)
            const targetY = Math.floor(currentTileY + (dy / distance) * fleeDistance)
            
            if (gameContext.pathfindingGrid) {
              const path = gameContext.pathfindingGrid.findPath(
                currentTileX, currentTileY,
                targetX, targetY
              )
              
              if (path && path.length > 0) {
                villager.path = path.map(node => ({
                  x: node.x * tileSize + tileSize / 2,
                  y: node.y * tileSize + tileSize / 2
                }))
                villager.pathIndex = 0
              }
            }
          }
        }
        break
        
      case 'returning_home':
        if (player.territory.center) {
          const currentTileX = Math.floor(villager.x / tileSize)
          const currentTileY = Math.floor(villager.y / tileSize)
          const centerTileX = Math.floor(player.territory.center.x / tileSize)
          const centerTileY = Math.floor(player.territory.center.y / tileSize)
          
          const dx = player.territory.center.x - villager.x
          const dy = player.territory.center.y - villager.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance > player.territory.radius * 0.8) {
            // Still outside - pathfind home
            if (gameContext.pathfindingGrid) {
              const path = gameContext.pathfindingGrid.findPath(
                currentTileX, currentTileY,
                centerTileX, centerTileY
              )
              
              if (path && path.length > 0) {
                villager.path = path.map(node => ({
                  x: node.x * tileSize + tileSize / 2,
                  y: node.y * tileSize + tileSize / 2
                }))
                villager.pathIndex = 0
              }
            }
          } else {
            // Back in territory
            villager.state = 'wandering'
            villager.path = []
            villager.pathIndex = 0
          }
        }
        break
    }
  }

  const setupVillagerTarget = (villager) => {
    // Only set up target if villager doesn't have one
    if (!villager.target && !villager.pathfinding.targetNode) {
      const nearestPath = pathSystem.findNearestPathNode(villager.x, villager.y, 150)
      if (nearestPath) {
        villager.pathfinding.targetNode = nearestPath
        pathSystem.updatePathUsage(nearestPath)
      } else {
        villager.movement.isIdle = true
        villager.movement.idleDuration = 120 + Math.random() * 240
      }
    }
  }

  // Remove old constraint functions as they're handled by pixel-perfect movement

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
    
    // Render land borders if enabled
    if (gameContext.landManager && canvasRef.current.showLandBorders !== false) {
      renderLandBorders(ctx)
    }
    
    resourceSystem.renderResources(ctx)
    pathSystem.renderPaths(ctx)
    
    // Render all players
    playerSystem.players.forEach(player => {
      playerSystem.renderPlayerTerritory(ctx, player)
    })
    
    playerSystem.players.forEach(player => {
      buildingSystem.renderBuildings(ctx, player)
    })
    
    playerSystem.players.forEach(player => {
      playerSystem.renderPlayerVillagers(ctx, player)
    })
    
    // Render building preview if in build mode
    if (gameState.selectedPower === 'build') {
      renderBuildingPreview(ctx)
    }
    
    // Render debug info if enabled
    if (debugModeRef.current || gameContext.debugMode) {
      renderDebugInfo(ctx)
    }
    
    renderParticles(ctx)
    
    ctx.restore()
  }, [terrainSystem, pathSystem, playerSystem, buildingSystem, gameState.selectedPower, gameContext])

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

  const renderLandBorders = (ctx) => {
    if (!gameContext.landManager) return
    
    const plots = gameContext.landManager.getAllPlots()
    if (!plots || plots.length === 0) return
    
    plots.forEach(plot => {
      if (!plot) return
      
      // Draw simple rectangle border around plot
      ctx.strokeStyle = plot.owner ? gameConfig.land.ownedBorderColor : gameConfig.land.borderColor
      ctx.lineWidth = gameConfig.land.borderWidth
      ctx.strokeRect(plot.x, plot.y, plot.width, plot.height)
    })
  }

  const renderDebugInfo = (ctx) => {
    if (!gameConfig.debug.showGrid) return
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    
    const tileSize = gameConfig.tileSize
    const { width, height } = gameConfig.map
    
    // Draw grid
    for (let x = 0; x <= width; x++) {
      ctx.beginPath()
      ctx.moveTo(x * tileSize, 0)
      ctx.lineTo(x * tileSize, height * tileSize)
      ctx.stroke()
    }
    
    for (let y = 0; y <= height; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * tileSize)
      ctx.lineTo(width * tileSize, y * tileSize)
      ctx.stroke()
    }
    
    // Show pathfinding costs if enabled
    if (gameConfig.debug.showPathfinding && gameContext.pathfindingGrid) {
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const cost = gameContext.pathfindingGrid.getCost(x, y)
          if (cost !== 1 && cost !== Infinity) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.8)'
            ctx.fillText(cost.toFixed(1), x * tileSize + tileSize/2, y * tileSize + tileSize/2)
          }
        }
      }
    }
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

  const regenerateMap = useCallback(async (seed = null) => {
    console.log('Regenerating map with seed:', seed)
    
    // Generate new terrain and resources
    const mapData = terrainSystem.generateTerrain(seed)
    
    // Sync resources with resource system
    resourceSystem.setResources(terrainSystem.resources)
    
    // Clear existing players and reinitialize
    await createNewGame(gameState.levelId)
    
    console.log('Map regenerated successfully')
  }, [terrainSystem, resourceSystem, gameState.levelId])
  
  // Toggle debug mode with keyboard
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'd' && e.ctrlKey) {
        debugModeRef.current = !debugModeRef.current
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return {
    canvasRef,
    gameState: {
      ...gameState,
      // Expose human player data for UI
      beliefPoints: getHumanPlayer()?.beliefPoints || gameState.beliefPoints,
      population: getHumanPlayer()?.population || gameState.population
    },
    gameStateRef: {
      current: {
        camera: cameraRef.current,
        mouse: mouseRef.current,
        worldSize,
        time: gameTimeRef.current,
        showLandBorders: canvasRef.current?.showLandBorders
      }
    },
    selectPower,
    usePower,
    zoomToWorldView,
    manualSaveGame,
    autoSaveGame,
    regenerateMap,
    mapSeed: terrainSystem.mapSeed,
    hoveredTile: gameState.hoveredTile,
    selectedTile: gameState.selectedTile,
    // Expose systems for debugging/external access
    systems: {
      terrain: terrainSystem,
      resources: resourceSystem,
      paths: pathSystem,
      players: playerSystem,
      ai: aiSystem,
      building: buildingSystem,
      land: landManagement,
      pixelPerfect
    }
  }
}