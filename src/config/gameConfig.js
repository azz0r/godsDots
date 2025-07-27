const gameConfig = {
  // Map generation settings
  map: {
    width: 100,
    height: 100,
    defaultSeed: Date.now(),
    biomes: {
      plains: { weight: 0.4, color: '#90EE90' },
      forest: { weight: 0.3, color: '#228B22' },
      mountain: { weight: 0.15, color: '#8B7355' },
      water: { weight: 0.1, color: '#4682B4' },
      desert: { weight: 0.05, color: '#F4A460' }
    }
  },

  // Tile and rendering settings
  tileSize: 32,
  pixelPerfect: {
    enabled: true,
    subPixelPrecision: 100, // Internal precision multiplier
    smoothing: true
  },

  // Movement and pathfinding
  movement: {
    baseSpeed: 1.5, // Pixels per frame
    diagonalCost: 1.414, // sqrt(2)
    updateFrequency: 60 // Updates per second
  },

  // Terrain movement costs (for pathfinding)
  terrainCosts: {
    grassland: 1,
    forest: 1.5,
    desert: 2,
    savanna: 1.2,
    tundra: 1.8,
    hills: 2,
    mountain: 3,
    snow: 2.5,
    water: Infinity, // Impassable
    deepWater: Infinity,
    river: Infinity,
    plains: 1 // Fallback
  },

  // Terrain values (for land pricing)
  terrainValues: {
    grassland: 10,
    forest: 15,
    desert: 3,
    savanna: 8,
    tundra: 2,
    hills: 5,
    mountain: 5,
    snow: 1,
    water: 0,
    deepWater: 0,
    river: 0,
    plains: 10 // Fallback
  },

  // Land management
  land: {
    plotSize: 10, // Tiles per plot side (10x10 = 100 tiles per plot)
    costMultiplier: 10, // Multiplier for plot cost calculation
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 0, 0.5)',
    ownedBorderColor: 'rgba(0, 255, 0, 0.5)'
  },

  // Resource settings
  resources: {
    spawnRates: {
      plains: 0.05,
      forest: 0.1,
      mountain: 0.08,
      water: 0,
      desert: 0.02
    },
    types: {
      wood: { color: '#8B4513', value: 10 },
      stone: { color: '#696969', value: 15 },
      food: { color: '#FFD700', value: 5 },
      gold: { color: '#FFD700', value: 50 }
    }
  },

  // Game start settings
  startingBeliefPoints: 100,
  startingVillagers: 5,
  spawnPointCount: 3,

  // Building settings
  buildings: {
    house: {
      width: 2,
      height: 2,
      cost: { wood: 20, stone: 10 },
      capacity: 4
    },
    temple: {
      width: 3,
      height: 3,
      cost: { stone: 50, gold: 20 },
      beliefGeneration: 1
    },
    farm: {
      width: 3,
      height: 3,
      cost: { wood: 15 },
      foodGeneration: 2
    },
    storage: {
      width: 2,
      height: 2,
      cost: { wood: 30, stone: 20 },
      capacity: 500
    }
  },

  // AI and behavior settings
  ai: {
    updateInterval: 1000, // ms between AI updates
    visionRange: 10, // Tiles
    hungerThreshold: 30,
    buildThreshold: 100, // Resources needed before building
    faithThreshold: 20
  },

  // Debug settings
  debug: {
    showGrid: false,
    showPathfinding: false,
    showLandBorders: true,
    showFPS: true,
    showCoordinates: false,
    logAIDecisions: false
  },

  // Performance settings
  performance: {
    maxVillagers: 200,
    cullingDistance: 50, // Tiles from viewport
    batchRenderSize: 100,
    pathfindingTimeout: 5000, // ms
    autoSaveInterval: 60000 // ms (1 minute)
  },

  // Save/Load settings
  save: {
    version: '1.0.0',
    compression: true,
    maxSaveSlots: 5
  }
}

// Freeze config to prevent accidental modifications
export default Object.freeze(gameConfig)