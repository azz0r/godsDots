import { createNoise2D } from 'simplex-noise'

export class ResourcePlacer {
  constructor(seed = Math.random()) {
    this.resourceNoise = createNoise2D(() => seed * 5)
    this.clusterNoise = createNoise2D(() => seed * 6)
    
    // Resource definitions with terrain preferences
    this.resourceTypes = {
      tree: {
        preferredTerrain: ['forest', 'taiga', 'snowyForest', 'tropicalForest', 'rainforest', 'jungle'],
        secondaryTerrain: ['grassland', 'hills'],
        density: 0.7,
        clusterSize: 5,
        minElevation: 0.35,
        maxElevation: 0.7,
        moisturePreference: 0.4
      },
      stone: {
        preferredTerrain: ['mountain', 'rockyHills', 'hills'],
        secondaryTerrain: ['grassland', 'desert'],
        density: 0.4,
        clusterSize: 3,
        minElevation: 0.5,
        maxElevation: 1.0,
        moisturePreference: null
      },
      ironOre: {
        preferredTerrain: ['mountain', 'rockyHills'],
        secondaryTerrain: ['hills'],
        density: 0.2,
        clusterSize: 2,
        minElevation: 0.6,
        maxElevation: 0.9,
        moisturePreference: null
      },
      goldOre: {
        preferredTerrain: ['mountain'],
        secondaryTerrain: ['rockyHills'],
        density: 0.05,
        clusterSize: 1,
        minElevation: 0.7,
        maxElevation: 0.95,
        moisturePreference: null
      },
      berryBush: {
        preferredTerrain: ['forest', 'grassland', 'tropicalForest'],
        secondaryTerrain: ['hills', 'taiga'],
        density: 0.3,
        clusterSize: 3,
        minElevation: 0.35,
        maxElevation: 0.6,
        moisturePreference: 0.5
      },
      wheat: {
        preferredTerrain: ['grassland', 'savanna'],
        secondaryTerrain: ['forest'],
        density: 0.25,
        clusterSize: 4,
        minElevation: 0.35,
        maxElevation: 0.55,
        moisturePreference: 0.4
      },
      fish: {
        preferredTerrain: ['water', 'river'],
        secondaryTerrain: ['deepWater'],
        density: 0.3,
        clusterSize: 2,
        minElevation: 0,
        maxElevation: 0.3,
        moisturePreference: 1.0
      },
      clay: {
        preferredTerrain: ['river', 'water'],
        secondaryTerrain: ['sand'],
        density: 0.2,
        clusterSize: 2,
        minElevation: 0.25,
        maxElevation: 0.35,
        moisturePreference: 0.8
      }
    }
  }

  placeResources(terrain, terrainMap, worldSize) {
    const resources = []
    const resourceMap = new Map()
    const occupiedTiles = new Set()
    
    // Place resources by type
    Object.entries(this.resourceTypes).forEach(([resourceType, config]) => {
      this.placeResourceType(
        resourceType,
        config,
        terrain,
        terrainMap,
        resources,
        resourceMap,
        occupiedTiles,
        worldSize
      )
    })
    
    return { resources, resourceMap }
  }

  placeResourceType(type, config, terrain, terrainMap, resources, resourceMap, occupiedTiles, worldSize) {
    const validTiles = terrain.filter(tile => {
      // Check if tile is already occupied
      if (occupiedTiles.has(`${tile.x},${tile.y}`)) return false
      
      // Check terrain type preference
      const isPreferred = config.preferredTerrain.includes(tile.type)
      const isSecondary = config.secondaryTerrain.includes(tile.type)
      if (!isPreferred && !isSecondary) return false
      
      // Check elevation constraints
      if (tile.elevation < config.minElevation || tile.elevation > config.maxElevation) return false
      
      // Check moisture preference
      if (config.moisturePreference !== null) {
        const moistureDiff = Math.abs(tile.moisture - config.moisturePreference)
        if (moistureDiff > 0.3) return false
      }
      
      return true
    })
    
    // Calculate number of resources to place
    const resourceCount = Math.floor(validTiles.length * config.density * (0.8 + Math.random() * 0.4))
    
    // Place resources using cluster-based approach
    let placed = 0
    const attempts = resourceCount * 3
    
    for (let i = 0; i < attempts && placed < resourceCount; i++) {
      const seedTile = validTiles[Math.floor(Math.random() * validTiles.length)]
      if (!seedTile || occupiedTiles.has(`${seedTile.x},${seedTile.y}`)) continue
      
      // Check cluster noise to determine if this should be a cluster center
      const clusterValue = this.clusterNoise(
        seedTile.x / worldSize.width * 10,
        seedTile.y / worldSize.height * 10
      )
      
      if (clusterValue > 0.2 || Math.random() < 0.3) {
        // Place a cluster
        const clusterResources = this.placeCluster(
          type,
          config,
          seedTile,
          terrainMap,
          occupiedTiles,
          config.clusterSize
        )
        
        clusterResources.forEach(resource => {
          resources.push(resource)
          resourceMap.set(`${resource.x},${resource.y}`, resource)
          occupiedTiles.add(`${resource.x},${resource.y}`)
          placed++
        })
      }
    }
  }

  placeCluster(type, config, centerTile, terrainMap, occupiedTiles, maxSize) {
    const cluster = []
    const tileSize = 40
    const searchRadius = 3
    
    // Always place center resource
    if (!occupiedTiles.has(`${centerTile.x},${centerTile.y}`)) {
      cluster.push(this.createResource(type, centerTile.x, centerTile.y))
    }
    
    // Place additional resources around center
    const additionalCount = Math.floor(Math.random() * maxSize)
    
    for (let i = 0; i < additionalCount; i++) {
      // Find nearby valid tiles
      const nearbyTiles = []
      
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
          if (dx === 0 && dy === 0) continue
          
          const x = centerTile.x + dx * tileSize
          const y = centerTile.y + dy * tileSize
          const key = `${x},${y}`
          
          if (occupiedTiles.has(key)) continue
          
          const tile = terrainMap.get(key)
          if (!tile) continue
          
          // Check if tile is suitable
          const isPreferred = config.preferredTerrain.includes(tile.type)
          const isSecondary = config.secondaryTerrain.includes(tile.type)
          
          if ((isPreferred || isSecondary) && 
              tile.elevation >= config.minElevation && 
              tile.elevation <= config.maxElevation) {
            nearbyTiles.push(tile)
          }
        }
      }
      
      if (nearbyTiles.length > 0) {
        const tile = nearbyTiles[Math.floor(Math.random() * nearbyTiles.length)]
        cluster.push(this.createResource(type, tile.x, tile.y))
        occupiedTiles.add(`${tile.x},${tile.y}`)
      }
    }
    
    return cluster
  }

  createResource(type, x, y) {
    const baseAmounts = {
      tree: { min: 50, max: 100 },
      stone: { min: 30, max: 80 },
      ironOre: { min: 20, max: 50 },
      goldOre: { min: 10, max: 25 },
      berryBush: { min: 20, max: 40 },
      wheat: { min: 30, max: 60 },
      fish: { min: 40, max: 80 },
      clay: { min: 25, max: 50 }
    }
    
    const amounts = baseAmounts[type] || { min: 20, max: 50 }
    const amount = amounts.min + Math.floor(Math.random() * (amounts.max - amounts.min))
    
    return {
      id: `${type}_${x}_${y}_${Date.now()}_${Math.random()}`,
      type,
      x,
      y,
      amount,
      maxAmount: amount,
      respawnRate: this.getRespawnRate(type),
      lastHarvested: null
    }
  }

  getRespawnRate(type) {
    // Respawn rates in game ticks (assuming 60 ticks per second)
    const rates = {
      tree: 18000,      // 5 minutes
      stone: 36000,     // 10 minutes
      ironOre: 54000,   // 15 minutes
      goldOre: 108000,  // 30 minutes
      berryBush: 9000,  // 2.5 minutes
      wheat: 12000,     // 3.3 minutes
      fish: 6000,       // 1.7 minutes
      clay: 24000       // 6.7 minutes
    }
    
    return rates[type] || 18000
  }

  // Method to check resource balance and adjust if needed
  validateResourceBalance(resources, worldSize) {
    const resourceCounts = {}
    resources.forEach(r => {
      resourceCounts[r.type] = (resourceCounts[r.type] || 0) + 1
    })
    
    // Calculate expected minimums based on world size
    const totalTiles = (worldSize.width / 40) * (worldSize.height / 40)
    const minimums = {
      tree: totalTiles * 0.1,
      stone: totalTiles * 0.05,
      berryBush: totalTiles * 0.03,
      wheat: totalTiles * 0.02
    }
    
    // Check if we have minimum required resources
    const balanced = Object.entries(minimums).every(([type, min]) => {
      return (resourceCounts[type] || 0) >= min
    })
    
    return {
      balanced,
      counts: resourceCounts,
      minimums
    }
  }
}