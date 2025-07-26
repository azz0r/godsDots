import { LandPlot } from '../classes/LandPlot'
import gameConfig from '../config/gameConfig'

export class GameInitializer {
  constructor({ mapGenerator, landManager, pathfindingGrid }) {
    this.mapGenerator = mapGenerator
    this.landManager = landManager
    this.pathfindingGrid = pathfindingGrid
  }

  /**
   * Initialize a new game with all systems
   * @returns {Object} Initial game state
   */
  async initializeNewGame() {
    console.log('Initializing new game...')
    
    // Generate terrain
    const terrain = this.mapGenerator.generateTerrain()
    
    // Initialize pathfinding grid with terrain costs
    this.initializePathfindingGrid(terrain)
    
    // Generate and register land plots
    const plots = this.generateLandPlots(terrain)
    this.registerLandPlots(plots)
    
    // Generate initial resources
    const resources = this.generateInitialResources(terrain)
    
    // Create spawn points
    const spawnPoints = this.createSpawnPoints(terrain)
    
    // Create initial game state
    const initialState = {
      terrain,
      resources,
      spawnPoints,
      buildings: [],
      villagers: [],
      beliefPoints: gameConfig.startingBeliefPoints,
      population: 0,
      mapSeed: this.mapGenerator.seed,
      gameTime: 0,
      isPaused: false
    }
    
    // Add initial villagers at spawn points
    initialState.villagers = this.createInitialVillagers(spawnPoints)
    initialState.population = initialState.villagers.length
    
    console.log('Game initialization complete')
    return initialState
  }

  /**
   * Initialize pathfinding grid based on terrain
   */
  initializePathfindingGrid(terrain) {
    const { width, height } = gameConfig.map
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = terrain[y]?.[x]
        if (!tile) continue
        
        // Set movement costs based on terrain type
        const cost = gameConfig.terrainCosts[tile.type] || 1
        this.pathfindingGrid.setCost(x, y, cost)
        
        // Mark impassable tiles
        if (cost === Infinity) {
          this.pathfindingGrid.setWalkable(x, y, false)
        }
      }
    }
  }

  /**
   * Generate land plots based on terrain
   */
  generateLandPlots(terrain) {
    const plots = []
    const { plotSize } = gameConfig.land
    const { width, height } = gameConfig.map
    
    // Create a grid of plots
    for (let y = 0; y < height; y += plotSize) {
      for (let x = 0; x < width; x += plotSize) {
        const tiles = []
        let totalValue = 0
        let hasWater = false
        let hasMountain = false
        
        // Collect tiles for this plot
        for (let py = 0; py < plotSize && y + py < height; py++) {
          for (let px = 0; px < plotSize && x + px < width; px++) {
            const tileX = x + px
            const tileY = y + py
            const tile = terrain[tileY]?.[tileX]
            
            if (tile) {
              tiles.push({ x: tileX, y: tileY })
              
              // Calculate plot value based on terrain
              if (tile.type === 'water') hasWater = true
              if (tile.type === 'mountain') hasMountain = true
              
              totalValue += gameConfig.terrainValues[tile.type] || 1
            }
          }
        }
        
        // Only create plot if it has some usable land
        if (tiles.length > 0 && !hasWater && !hasMountain) {
          const plot = new LandPlot(
            `plot_${x}_${y}`,
            tiles,
            Math.floor(totalValue * gameConfig.land.costMultiplier)
          )
          plots.push(plot)
        }
      }
    }
    
    return plots
  }

  /**
   * Register land plots with the land manager
   */
  registerLandPlots(plots) {
    plots.forEach(plot => {
      this.landManager.addPlot(plot)
    })
    
    console.log(`Registered ${plots.length} land plots`)
  }

  /**
   * Generate initial resources on the map
   */
  generateInitialResources(terrain) {
    const resources = []
    const { width, height } = gameConfig.map
    const { spawnRates } = gameConfig.resources
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = terrain[y]?.[x]
        if (!tile) continue
        
        // Check spawn chance for this terrain type
        const spawnChance = spawnRates[tile.type]
        if (spawnChance && Math.random() < spawnChance) {
          resources.push({
            id: `resource_${x}_${y}`,
            x,
            y,
            type: this.getResourceTypeForTerrain(tile.type),
            amount: Math.floor(Math.random() * 50) + 50
          })
        }
      }
    }
    
    return resources
  }

  /**
   * Get appropriate resource type for terrain
   */
  getResourceTypeForTerrain(terrainType) {
    const resourceMap = {
      forest: 'wood',
      mountain: 'stone',
      plains: 'food',
      desert: 'gold'
    }
    
    return resourceMap[terrainType] || 'food'
  }

  /**
   * Create spawn points for villagers
   */
  createSpawnPoints(terrain) {
    const spawnPoints = []
    const { width, height } = gameConfig.map
    const centerX = Math.floor(width / 2)
    const centerY = Math.floor(height / 2)
    const searchRadius = 10
    
    // Find suitable spawn locations near center
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const x = centerX + dx
        const y = centerY + dy
        
        if (x < 0 || x >= width || y < 0 || y >= height) continue
        
        const tile = terrain[y]?.[x]
        if (tile && tile.type === 'plains') {
          spawnPoints.push({ x, y })
          
          if (spawnPoints.length >= gameConfig.spawnPointCount) {
            return spawnPoints
          }
        }
      }
    }
    
    // If not enough plains tiles found, use any walkable tile
    if (spawnPoints.length < gameConfig.spawnPointCount) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          const x = centerX + dx
          const y = centerY + dy
          
          if (x < 0 || x >= width || y < 0 || y >= height) continue
          
          const tile = terrain[y]?.[x]
          if (tile && tile.type !== 'water' && tile.type !== 'mountain') {
            if (!spawnPoints.some(sp => sp.x === x && sp.y === y)) {
              spawnPoints.push({ x, y })
              
              if (spawnPoints.length >= gameConfig.spawnPointCount) {
                return spawnPoints
              }
            }
          }
        }
      }
    }
    
    return spawnPoints
  }

  /**
   * Create initial villagers at spawn points
   */
  createInitialVillagers(spawnPoints) {
    const villagers = []
    const villagersPerSpawn = Math.ceil(gameConfig.startingVillagers / spawnPoints.length)
    
    spawnPoints.forEach((spawn, index) => {
      for (let i = 0; i < villagersPerSpawn && villagers.length < gameConfig.startingVillagers; i++) {
        villagers.push({
          id: `villager_${villagers.length}`,
          x: spawn.x * gameConfig.tileSize + Math.random() * gameConfig.tileSize,
          y: spawn.y * gameConfig.tileSize + Math.random() * gameConfig.tileSize,
          targetX: null,
          targetY: null,
          path: [],
          speed: gameConfig.movement.baseSpeed,
          state: 'idle',
          health: 100,
          hunger: 50,
          faith: 50,
          skills: {
            farming: Math.random() * 5,
            building: Math.random() * 5,
            combat: Math.random() * 5
          }
        })
      }
    })
    
    return villagers
  }

  /**
   * Load game state from saved data
   */
  async loadGame(savedData) {
    console.log('Loading saved game...')
    
    // Restore terrain to pathfinding grid
    this.initializePathfindingGrid(savedData.terrain)
    
    // Restore land plots
    if (savedData.landPlots) {
      savedData.landPlots.forEach(plotData => {
        const plot = new LandPlot(plotData.id, plotData.tiles, plotData.baseCost)
        plot.owner = plotData.owner
        plot.buildings = plotData.buildings
        this.landManager.addPlot(plot)
      })
    }
    
    // Update pathfinding grid with buildings
    if (savedData.buildings) {
      savedData.buildings.forEach(building => {
        const { x, y, width, height } = building
        for (let by = 0; by < height; by++) {
          for (let bx = 0; bx < width; bx++) {
            this.pathfindingGrid.setWalkable(x + bx, y + by, false)
          }
        }
      })
    }
    
    console.log('Game loaded successfully')
    return savedData
  }
}