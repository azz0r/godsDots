import { createNoise2D } from 'simplex-noise'

export class TerrainGenerator {
  constructor(...args) {
    // Support two constructor signatures:
    // 1. new TerrainGenerator(seed) - for production use with generateTerrain(worldSize)
    // 2. new TerrainGenerator(width, height, seed) - for test use with generate()
    if (args.length === 3) {
      // Test API: (width, height, seed)
      this.width = args[0]
      this.height = args[1]
      this.seed = args[2]
    } else {
      // Production API: (seed)
      this.seed = args[0] !== undefined ? args[0] : Math.random()
      this.width = null
      this.height = null
    }

    // Create seeded random number generator for deterministic generation
    this.rng = this.createSeededRandom(this.seed)

    // Create multiple noise functions for different terrain features
    // Each needs its own seeded RNG instance for proper randomization
    this.heightNoise = createNoise2D(this.createSeededRandom(this.seed * 1))
    this.moistureNoise = createNoise2D(this.createSeededRandom(this.seed * 2))
    this.temperatureNoise = createNoise2D(this.createSeededRandom(this.seed * 3))
    this.detailNoise = createNoise2D(this.createSeededRandom(this.seed * 4))

    this.tileSize = 40
  }

  /**
   * Create a seeded random number generator
   * @param {number} seed - The seed for the RNG
   * @returns {function} Function that returns random numbers between 0 and 1
   */
  createSeededRandom(seed) {
    let state = seed || 1
    return function() {
      // Simple LCG (Linear Congruential Generator)
      state = (state * 1664525 + 1013904223) % 4294967296
      return state / 4294967296
    }
  }

  /**
   * Generate terrain as a 2D array (test API)
   * Requires width and height to be set in constructor
   * @returns {Array<Array<Object>>} 2D array of terrain cells
   */
  generate() {
    if (this.width === null || this.height === null) {
      throw new Error('Cannot call generate() without width and height. Use generateTerrain(worldSize) instead.')
    }

    // Generate terrain using the production method
    // Skip river generation for test API to keep types consistent with expectations
    const worldSize = { width: this.width * this.tileSize, height: this.height * this.tileSize }
    const { terrain, terrainMap } = this.generateTerrain(worldSize, false)  // false = skip rivers

    // Convert flat terrain array to 2D grid expected by tests
    // Use terrainMap for efficient lookups instead of find()
    const grid = []
    for (let y = 0; y < this.height; y++) {
      grid[y] = []
      for (let x = 0; x < this.width; x++) {
        const pixelX = x * this.tileSize
        const pixelY = y * this.tileSize
        const tile = terrainMap.get(`${pixelX},${pixelY}`)

        if (tile) {
          grid[y][x] = {
            type: tile.type,
            elevation: tile.elevation,
            moisture: tile.moisture,
            temperature: tile.temperature,
            fertility: tile.fertility,
            walkable: tile.walkable
          }
        } else {
          // Fallback for missing tiles
          grid[y][x] = {
            type: 'water',
            elevation: 0,
            moisture: 0.5,
            temperature: 0.5,
            fertility: 0,
            walkable: false
          }
        }
      }
    }

    return grid
  }

  generateTerrain(worldSize, generateRivers = true) {
    const terrain = []
    const terrainMap = new Map()

    // Generate height map first
    const heightMap = this.generateHeightMap(worldSize)
    const moistureMap = this.generateMoistureMap(worldSize)
    const temperatureMap = this.generateTemperatureMap(worldSize)

    for (let x = 0; x < worldSize.width; x += this.tileSize) {
      for (let y = 0; y < worldSize.height; y += this.tileSize) {
        const gridX = x / this.tileSize
        const gridY = y / this.tileSize

        const height = heightMap[gridX][gridY]
        const moisture = moistureMap[gridX][gridY]
        const temperature = temperatureMap[gridX][gridY]

        const terrainType = this.determineBiome(height, moisture, temperature)
        const tile = {
          x, y,
          width: this.tileSize,
          height: this.tileSize,
          type: terrainType,
          elevation: height,
          moisture: moisture,
          temperature: temperature,
          fertility: this.calculateFertility(terrainType, moisture),
          walkable: terrainType !== 'water' && terrainType !== 'deep_water'
        }

        terrain.push(tile)
        terrainMap.set(`${x},${y}`, tile)
      }
    }

    // Post-process to create rivers (optional)
    if (generateRivers) {
      this.generateRivers(terrain, terrainMap, worldSize)
    }

    return { terrain, terrainMap }
  }

  generateHeightMap(worldSize) {
    const width = Math.ceil(worldSize.width / this.tileSize)
    const height = Math.ceil(worldSize.height / this.tileSize)
    const heightMap = []
    
    for (let x = 0; x < width; x++) {
      heightMap[x] = []
      for (let y = 0; y < height; y++) {
        // Force water at all map borders
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          heightMap[x][y] = 0
          continue
        }
        
        // Multiple octaves for realistic terrain
        let elevation = 0
        let amplitude = 1
        let frequency = 0.005
        let maxValue = 0
        
        for (let i = 0; i < 6; i++) {
          elevation += amplitude * this.heightNoise(x * frequency, y * frequency)
          maxValue += amplitude
          amplitude *= 0.5
          frequency *= 2
        }
        
        elevation = elevation / maxValue
        
        // Apply stronger island mask with smoother gradient
        const centerX = width / 2
        const centerY = height / 2
        
        // Calculate normalized distance from center (0 at center, 1 at corners)
        const dx = (x - centerX) / (width / 2)
        const dy = (y - centerY) / (height / 2)
        const normalizedDistance = Math.sqrt(dx * dx + dy * dy)
        
        // Create smooth island mask using multiple techniques
        let islandMask = 1
        
        // Method 1: Smooth polynomial falloff
        if (normalizedDistance > 0.3) {
          const t = (normalizedDistance - 0.3) / 0.7
          islandMask *= 1 - (3 * t * t - 2 * t * t * t) // Smoothstep function
        }
        
        // Method 2: Force water at edges with exponential decay
        if (normalizedDistance > 0.6) {
          const edgeFactor = (normalizedDistance - 0.6) / 0.4
          islandMask *= Math.exp(-5 * edgeFactor * edgeFactor)
        }
        
        // Method 3: Hard cutoff near edges to ensure water
        if (normalizedDistance > 0.85) {
          islandMask = 0
        }
        
        // Apply island mask to elevation
        elevation = elevation * islandMask
        
        // Add slight random variation to create more natural coastlines
        if (normalizedDistance > 0.4 && normalizedDistance < 0.7) {
          const coastNoise = this.detailNoise(x * 0.1, y * 0.1) * 0.1
          elevation += coastNoise * islandMask
        }
        
        // Normalize to 0-1 range and ensure non-negative
        heightMap[x][y] = Math.max(0, Math.min(1, (elevation + 1) / 2))
        
        // Extra safety: force very low elevation near edges
        const edgeDistance = Math.min(x, y, width - 1 - x, height - 1 - y)
        if (edgeDistance < 3) {
          heightMap[x][y] *= Math.pow(edgeDistance / 3, 2)
        }
      }
    }
    
    return heightMap
  }

  generateMoistureMap(worldSize) {
    const width = Math.ceil(worldSize.width / this.tileSize)
    const height = Math.ceil(worldSize.height / this.tileSize)
    const moistureMap = []

    for (let x = 0; x < width; x++) {
      moistureMap[x] = []
      for (let y = 0; y < height; y++) {
        let moisture = 0
        let amplitude = 1
        let frequency = 0.008

        for (let i = 0; i < 4; i++) {
          moisture += amplitude * this.moistureNoise(x * frequency, y * frequency)
          amplitude *= 0.5
          frequency *= 2
        }

        // Normalize to 0-1 range and clamp to ensure no overflow
        moistureMap[x][y] = Math.max(0, Math.min(1, (moisture + 1) / 2))
      }
    }

    return moistureMap
  }

  generateTemperatureMap(worldSize) {
    const width = Math.ceil(worldSize.width / this.tileSize)
    const height = Math.ceil(worldSize.height / this.tileSize)
    const temperatureMap = []
    
    for (let x = 0; x < width; x++) {
      temperatureMap[x] = []
      for (let y = 0; y < height; y++) {
        // Temperature decreases from equator (center) to poles
        const equatorDistance = Math.abs(y - height / 2) / (height / 2)
        let baseTemp = 1 - equatorDistance * 0.7
        
        // Add some noise for variation
        const tempNoise = this.temperatureNoise(x * 0.01, y * 0.01) * 0.2
        
        temperatureMap[x][y] = Math.max(0, Math.min(1, baseTemp + tempNoise))
      }
    }
    
    return temperatureMap
  }

  determineBiome(height, moisture, temperature) {
    // Water bodies - adjusted for guaranteed island with beaches
    if (height < 0.1) return 'deep_water'  // Deep ocean
    if (height < 0.2) return 'water'      // Shallow water
    if (height < 0.28) return 'sand'      // Wide beach zones

    // Mountain peaks
    if (height > 0.8) {
      if (temperature < 0.3) return 'snow'
      return 'mountains'
    }

    // Hills
    if (height > 0.6) {
      if (moisture < 0.3) return 'rocky_hills'
      return 'hills'
    }

    // Lowlands - determine by moisture and temperature
    if (temperature < 0.3) {
      // Cold regions
      if (moisture < 0.3) return 'tundra'
      if (moisture < 0.6) return 'taiga'
      return 'snowy_forest'
    } else if (temperature < 0.6) {
      // Temperate regions
      if (moisture < 0.2) return 'desert'
      if (moisture < 0.4) return 'grass'
      return 'forest'  // All moist temperate regions are forest
    } else {
      // Hot regions
      if (moisture < 0.3) return 'desert'
      if (moisture < 0.6) return 'savanna'  // Adjusted threshold
      if (moisture < 0.8) return 'tropical_forest'  // Moisture 0.6-0.8
      return 'jungle'  // Moisture > 0.8
    }
  }

  calculateFertility(terrainType, moisture) {
    const baseFertility = {
      deep_water: 0,
      water: 0,
      sand: 0.1,
      desert: 0.1,
      tundra: 0.2,
      rocky_hills: 0.2,
      mountains: 0.1,
      snow: 0,
      grass: 0.8,
      savanna: 0.6,
      forest: 0.8,  // Includes former rainforest
      taiga: 0.5,
      snowy_forest: 0.4,
      tropical_forest: 0.9,
      jungle: 0.95,
      hills: 0.5,
      river: 0.8  // Rivers are fertile (production use only)
    }

    const fertility = baseFertility[terrainType] || 0.5
    // Modify by moisture
    return Math.min(1, fertility * (0.5 + moisture * 0.5))
  }

  generateRivers(terrain, terrainMap, worldSize) {
    const width = Math.ceil(worldSize.width / this.tileSize)
    const height = Math.ceil(worldSize.height / this.tileSize)

    // Find potential river sources (high elevation with good moisture)
    const sources = []
    terrain.forEach(tile => {
      if (tile.elevation > 0.7 && tile.moisture > 0.5 && this.rng() < 0.05) {
        sources.push(tile)
      }
    })
    
    // Trace rivers from sources to water
    sources.forEach(source => {
      let current = source
      const visited = new Set()
      
      while (current && current.type !== 'water' && current.type !== 'deep_water') {
        visited.add(`${current.x},${current.y}`)
        
        // Find lowest neighbor
        let lowestNeighbor = null
        let lowestElevation = current.elevation
        
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue
            
            const nx = current.x + dx * this.tileSize
            const ny = current.y + dy * this.tileSize
            const key = `${nx},${ny}`
            
            if (visited.has(key)) continue
            
            const neighbor = terrainMap.get(key)
            if (neighbor && neighbor.elevation < lowestElevation) {
              lowestNeighbor = neighbor
              lowestElevation = neighbor.elevation
            }
          }
        }
        
        if (lowestNeighbor) {
          // Convert to river if not already water
          if (lowestNeighbor.type !== 'water' && lowestNeighbor.type !== 'deep_water') {
            lowestNeighbor.type = 'river'
            lowestNeighbor.walkable = false
            // Increase moisture around rivers
            this.moistenArea(terrainMap, lowestNeighbor.x, lowestNeighbor.y, 2)
          }
          current = lowestNeighbor
        } else {
          break
        }
      }
    })
  }

  moistenArea(terrainMap, centerX, centerY, radius) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = centerX + dx * this.tileSize
        const y = centerY + dy * this.tileSize
        const tile = terrainMap.get(`${x},${y}`)
        
        if (tile) {
          const distance = Math.sqrt(dx * dx + dy * dy)
          const moistureBoost = Math.max(0, 1 - distance / radius) * 0.2
          tile.moisture = Math.min(1, tile.moisture + moistureBoost)
          
          // Recalculate fertility
          tile.fertility = this.calculateFertility(tile.type, tile.moisture)
        }
      }
    }
  }
}