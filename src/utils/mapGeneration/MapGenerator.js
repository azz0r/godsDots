import { TerrainGenerator } from './TerrainGenerator'
import { ResourcePlacer } from './ResourcePlacer'

export class MapGenerator {
  constructor(seed = null) {
    // Use provided seed or generate a random one
    this.seed = seed !== null ? seed : Math.random() * 1000000
    this.terrainGenerator = new TerrainGenerator(this.seed)
    this.resourcePlacer = new ResourcePlacer(this.seed)
    this.tileSize = 40
  }

  generateMap(worldSize) {
    console.log(`Generating map with seed: ${this.seed}`)
    
    // Generate terrain
    const { terrain, terrainMap } = this.terrainGenerator.generateTerrain(worldSize)
    
    // Place resources
    const { resources, resourceMap } = this.resourcePlacer.placeResources(
      terrain, 
      terrainMap, 
      worldSize
    )
    
    // Generate spawn points
    const spawnPoints = this.generateSpawnPoints(terrain, terrainMap, resourceMap, worldSize)
    
    // Generate initial building locations
    const buildingLocations = this.generateBuildingLocations(
      terrain, 
      terrainMap, 
      resourceMap, 
      spawnPoints,
      worldSize
    )
    
    // Validate map playability
    const validation = this.validateMap(terrain, resources, spawnPoints, buildingLocations)
    
    if (!validation.isValid) {
      console.warn('Generated map failed validation:', validation.issues)
      // Could recursively try to generate a new map here
    }
    
    return {
      seed: this.seed,
      worldSize,
      terrain,
      terrainMap,
      resources,
      resourceMap,
      spawnPoints,
      buildingLocations,
      validation,
      metadata: {
        generatedAt: Date.now(),
        version: '1.0.0',
        tileSize: this.tileSize
      }
    }
  }

  generateSpawnPoints(terrain, terrainMap, resourceMap, worldSize) {
    const spawnPoints = []
    const minSpawnDistance = 200 // Minimum distance between spawn points
    const idealSpawnCount = 4 // Try to create 4 spawn points
    
    // Find suitable spawn areas (grassland/forest near resources)
    const suitableTiles = terrain.filter(tile => {
      // Must be walkable and suitable terrain
      if (!tile.walkable) return false
      if (!['grassland', 'forest', 'savanna'].includes(tile.type)) return false
      
      // Check proximity to resources
      const nearbyResources = this.countNearbyResources(tile, resourceMap, 5)
      if (nearbyResources < 3) return false
      
      // Check that there's enough buildable space around
      const buildableSpace = this.countBuildableSpace(tile, terrainMap, 3)
      if (buildableSpace < 5) return false
      
      return true
    })
    
    // Sort by quality (fertility + resource access)
    suitableTiles.sort((a, b) => {
      const qualityA = a.fertility + this.countNearbyResources(a, resourceMap, 5) * 0.1
      const qualityB = b.fertility + this.countNearbyResources(b, resourceMap, 5) * 0.1
      return qualityB - qualityA
    })
    
    // Place spawn points with minimum distance constraint
    for (const tile of suitableTiles) {
      if (spawnPoints.length >= idealSpawnCount) break
      
      // Check distance from other spawn points
      const tooClose = spawnPoints.some(spawn => {
        const distance = Math.sqrt(
          Math.pow(spawn.x - tile.x, 2) + 
          Math.pow(spawn.y - tile.y, 2)
        )
        return distance < minSpawnDistance
      })
      
      if (!tooClose) {
        spawnPoints.push({
          id: `spawn_${spawnPoints.length}`,
          x: tile.x + this.tileSize / 2,
          y: tile.y + this.tileSize / 2,
          tileX: tile.x,
          tileY: tile.y,
          quality: tile.fertility + this.countNearbyResources(tile, resourceMap, 5) * 0.1
        })
      }
    }
    
    // Ensure at least one spawn point
    if (spawnPoints.length === 0 && suitableTiles.length > 0) {
      const tile = suitableTiles[0]
      spawnPoints.push({
        id: 'spawn_0',
        x: tile.x + this.tileSize / 2,
        y: tile.y + this.tileSize / 2,
        tileX: tile.x,
        tileY: tile.y,
        quality: tile.fertility
      })
    }
    
    return spawnPoints
  }

  generateBuildingLocations(terrain, terrainMap, resourceMap, spawnPoints, worldSize) {
    const buildingLocations = []
    
    // For each spawn point, suggest initial building locations
    spawnPoints.forEach((spawn, index) => {
      const centerX = spawn.tileX
      const centerY = spawn.tileY
      
      // Town center location (near spawn)
      buildingLocations.push({
        id: `townhall_${index}`,
        type: 'townhall',
        x: centerX,
        y: centerY,
        suggested: true,
        spawnId: spawn.id
      })
      
      // Find good spots for other buildings around spawn
      const radius = 5 // Search radius in tiles
      
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) < 2 && Math.abs(dy) < 2) continue // Too close to town center
          
          const x = centerX + dx * this.tileSize
          const y = centerY + dy * this.tileSize
          const tile = terrainMap.get(`${x},${y}`)
          
          if (!tile || !tile.walkable) continue
          if (resourceMap.has(`${x},${y}`)) continue // Has resource
          
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          // Suggest house locations
          if (distance >= 2 && distance <= 4 && 
              ['grassland', 'forest', 'savanna'].includes(tile.type)) {
            if (buildingLocations.filter(b => b.type === 'house' && b.spawnId === spawn.id).length < 4) {
              buildingLocations.push({
                id: `house_${index}_${buildingLocations.length}`,
                type: 'house',
                x,
                y,
                suggested: true,
                spawnId: spawn.id
              })
            }
          }
          
          // Suggest storage near resources
          const nearbyResources = this.countNearbyResources(tile, resourceMap, 2)
          if (nearbyResources >= 2 && distance <= 3) {
            if (!buildingLocations.some(b => b.type === 'storage' && b.spawnId === spawn.id)) {
              buildingLocations.push({
                id: `storage_${index}`,
                type: 'storage',
                x,
                y,
                suggested: true,
                spawnId: spawn.id
              })
            }
          }
        }
      }
    })
    
    return buildingLocations
  }

  countNearbyResources(tile, resourceMap, radius) {
    let count = 0
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = tile.x + dx * this.tileSize
        const y = tile.y + dy * this.tileSize
        
        if (resourceMap.has(`${x},${y}`)) {
          count++
        }
      }
    }
    
    return count
  }

  countBuildableSpace(tile, terrainMap, radius) {
    let count = 0
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = tile.x + dx * this.tileSize
        const y = tile.y + dy * this.tileSize
        const checkTile = terrainMap.get(`${x},${y}`)
        
        if (checkTile && checkTile.walkable && 
            !['water', 'deepWater', 'river', 'mountain', 'snow'].includes(checkTile.type)) {
          count++
        }
      }
    }
    
    return count
  }

  validateMap(terrain, resources, spawnPoints, buildingLocations) {
    const issues = []
    
    // Check minimum spawn points
    if (spawnPoints.length === 0) {
      issues.push('No valid spawn points found')
    }
    
    // Check resource distribution
    const validation = this.resourcePlacer.validateResourceBalance(resources, {
      width: Math.max(...terrain.map(t => t.x)) + this.tileSize,
      height: Math.max(...terrain.map(t => t.y)) + this.tileSize
    })
    
    if (!validation.balanced) {
      issues.push('Insufficient resource distribution')
    }
    
    // Check walkable area percentage
    const walkableTiles = terrain.filter(t => t.walkable).length
    const walkablePercentage = walkableTiles / terrain.length
    
    if (walkablePercentage < 0.3) {
      issues.push(`Insufficient walkable area: ${(walkablePercentage * 100).toFixed(1)}%`)
    }
    
    // Check each spawn point has access to basic resources
    spawnPoints.forEach(spawn => {
      const nearbyResources = new Set()
      const searchRadius = 10
      
      resources.forEach(resource => {
        const distance = Math.sqrt(
          Math.pow(resource.x - spawn.tileX, 2) + 
          Math.pow(resource.y - spawn.tileY, 2)
        )
        
        if (distance <= searchRadius * this.tileSize) {
          nearbyResources.add(resource.type)
        }
      })
      
      // Check for essential resources
      const essentials = ['tree', 'stone']
      const missingEssentials = essentials.filter(type => !nearbyResources.has(type))
      
      if (missingEssentials.length > 0) {
        issues.push(`Spawn ${spawn.id} missing essential resources: ${missingEssentials.join(', ')}`)
      }
    })
    
    return {
      isValid: issues.length === 0,
      issues,
      stats: {
        spawnPoints: spawnPoints.length,
        resources: resources.length,
        walkablePercentage: (walkablePercentage * 100).toFixed(1),
        resourceCounts: validation.counts
      }
    }
  }

  // Serialize map data for saving
  serializeMap(mapData) {
    return {
      seed: mapData.seed,
      worldSize: mapData.worldSize,
      terrain: mapData.terrain.map(tile => ({
        x: tile.x,
        y: tile.y,
        type: tile.type,
        elevation: tile.elevation,
        moisture: tile.moisture,
        temperature: tile.temperature,
        fertility: tile.fertility
      })),
      resources: mapData.resources.map(resource => ({
        id: resource.id,
        type: resource.type,
        x: resource.x,
        y: resource.y,
        amount: resource.amount,
        maxAmount: resource.maxAmount
      })),
      spawnPoints: mapData.spawnPoints,
      buildingLocations: mapData.buildingLocations,
      metadata: mapData.metadata
    }
  }

  // Deserialize saved map data
  static deserializeMap(data) {
    const terrainMap = new Map()
    const resourceMap = new Map()
    
    // Rebuild terrain with full tile objects
    const terrain = data.terrain.map(tileData => {
      const tile = {
        ...tileData,
        width: 40,
        height: 40,
        walkable: !['water', 'deepWater', 'river'].includes(tileData.type)
      }
      terrainMap.set(`${tile.x},${tile.y}`, tile)
      return tile
    })
    
    // Rebuild resources
    const resources = data.resources.map(resourceData => {
      const resource = {
        ...resourceData,
        respawnRate: new ResourcePlacer().getRespawnRate(resourceData.type),
        lastHarvested: null
      }
      resourceMap.set(`${resource.x},${resource.y}`, resource)
      return resource
    })
    
    return {
      ...data,
      terrain,
      terrainMap,
      resources,
      resourceMap
    }
  }
}