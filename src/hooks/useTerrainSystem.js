import { useRef, useCallback, useState } from 'react'
import { MapGenerator } from '../utils/mapGeneration/MapGenerator'
import { TerrainRenderer } from '../utils/TerrainRenderer'

export const useTerrainSystem = (worldSize) => {
  const terrainRef = useRef([])
  const terrainMapRef = useRef(new Map())
  const resourcesRef = useRef([])
  const resourceMapRef = useRef(new Map())
  const spawnPointsRef = useRef([])
  const [mapSeed, setMapSeed] = useState(null)
  const mapGeneratorRef = useRef(null)
  const terrainRendererRef = useRef(new TerrainRenderer())

  const generateTerrain = useCallback((seed = null) => {
    // Create new map generator with seed
    mapGeneratorRef.current = new MapGenerator(seed)
    const mapData = mapGeneratorRef.current.generateMap(worldSize)
    
    // Store the generated data
    terrainRef.current = mapData.terrain
    terrainMapRef.current = mapData.terrainMap
    resourcesRef.current = mapData.resources
    resourceMapRef.current = mapData.resourceMap
    spawnPointsRef.current = mapData.spawnPoints
    setMapSeed(mapData.seed)
    
    // Log generation results
    console.log('Map generated:', {
      seed: mapData.seed,
      terrainTiles: mapData.terrain.length,
      resources: mapData.resources.length,
      spawnPoints: mapData.spawnPoints.length,
      validation: mapData.validation
    })
    
    return mapData
  }, [worldSize])

  const generateTerrainOld = useCallback(() => {
    terrainRef.current = []
    terrainMapRef.current.clear()
    
    const tileSize = 40
    
    for (let x = 0; x < worldSize.width; x += tileSize) {
      for (let y = 0; y < worldSize.height; y += tileSize) {
        const terrainType = getTerrainType(x, y, worldSize)
        const tile = {
          x, y, 
          width: tileSize, 
          height: tileSize,
          type: terrainType,
          fertility: Math.random() * 0.5 + 0.5,
          walkable: terrainType !== 'water'
        }
        
        terrainRef.current.push(tile)
        terrainMapRef.current.set(`${x},${y}`, tile)
      }
    }
  }, [worldSize])

  const getTerrainType = (x, y, worldSize) => {
    const centerX = worldSize.width / 2
    const centerY = worldSize.height / 2
    const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
    
    // Multiple noise layers for more varied terrain
    const noise1 = Math.sin(x * 0.005) * Math.cos(y * 0.005) * 200
    const noise2 = Math.sin(x * 0.015) * Math.cos(y * 0.015) * 80
    const noise3 = Math.sin(x * 0.03) * Math.cos(y * 0.03) * 40
    const combinedNoise = noise1 + noise2 + noise3
    
    const adjustedDistance = distanceFromCenter + combinedNoise
    
    // Much larger grass areas, less water
    if (adjustedDistance < 800) return 'grass'
    if (adjustedDistance < 1400) return 'forest' 
    if (adjustedDistance < 1800) return 'hills'
    if (adjustedDistance < 2200) return 'grass' // More grass in outer areas
    return 'water'
  }

  const getTerrainAt = useCallback((x, y) => {
    const tileX = Math.floor(x / 40) * 40
    const tileY = Math.floor(y / 40) * 40
    return terrainMapRef.current.get(`${tileX},${tileY}`)
  }, [])

  const isWalkable = useCallback((x, y) => {
    const terrain = getTerrainAt(x, y)
    return terrain ? terrain.walkable : false
  }, [getTerrainAt])

  const renderTerrain = useCallback((ctx, camera = { x: 0, y: 0, zoom: 1 }) => {
    // Use the enhanced terrain renderer
    terrainRendererRef.current.renderTerrain(ctx, terrainRef.current, camera)
  }, [])

  const renderResources = useCallback((ctx) => {
    const resourceColors = {
      tree: '#2d5016',
      stone: '#696969',
      ironOre: '#8b4513',
      goldOre: '#ffd700',
      berryBush: '#8b008b',
      wheat: '#daa520',
      fish: '#4169e1',
      clay: '#cd853f'
    }
    
    // Resource symbols for better visibility
    const resourceSymbols = {
      tree: '🌲',
      stone: '⬤',
      ironOre: '▲',
      goldOre: '◆',
      berryBush: '●',
      wheat: '┃',
      fish: '~',
      clay: '■'
    }
    
    resourcesRef.current.forEach(resource => {
      const centerX = resource.x + resource.width / 2
      const centerY = resource.y + resource.height / 2
      
      // Draw resource based on type
      if (resource.type === 'tree') {
        // Simple triangle tree
        ctx.fillStyle = resourceColors[resource.type]
        ctx.beginPath()
        ctx.moveTo(centerX, centerY - 15)
        ctx.lineTo(centerX - 10, centerY + 5)
        ctx.lineTo(centerX + 10, centerY + 5)
        ctx.closePath()
        ctx.fill()
        
        // Trunk
        ctx.fillStyle = '#654321'
        ctx.fillRect(centerX - 2, centerY + 5, 4, 8)
      } else {
        // Draw simple shapes for other resources
        ctx.fillStyle = resourceColors[resource.type] || '#ffffff'
        ctx.beginPath()
        
        switch(resource.type) {
          case 'stone':
            // Rock shape
            ctx.arc(centerX, centerY, 6, 0, Math.PI * 2)
            break
          case 'goldOre':
            // Diamond shape
            ctx.moveTo(centerX, centerY - 8)
            ctx.lineTo(centerX + 6, centerY)
            ctx.lineTo(centerX, centerY + 8)
            ctx.lineTo(centerX - 6, centerY)
            ctx.closePath()
            break
          case 'berryBush':
            // Berry clusters
            for(let i = 0; i < 3; i++) {
              const angle = (i / 3) * Math.PI * 2
              const bx = centerX + Math.cos(angle) * 4
              const by = centerY + Math.sin(angle) * 4
              ctx.moveTo(bx + 3, by)
              ctx.arc(bx, by, 3, 0, Math.PI * 2)
            }
            break
          default:
            ctx.arc(centerX, centerY, 6, 0, Math.PI * 2)
        }
        
        ctx.fill()
      }
      
      // Draw amount indicator only if depleted
      if (resource.amount < resource.maxAmount * 0.5) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)'
        ctx.fillRect(centerX - 10, centerY + 12, 20 * (resource.amount / resource.maxAmount), 3)
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.strokeRect(centerX - 10, centerY + 12, 20, 3)
      }
    })
  }, [])

  const getResourceAt = useCallback((x, y) => {
    const tileX = Math.floor(x / 40) * 40
    const tileY = Math.floor(y / 40) * 40
    return resourceMapRef.current.get(`${tileX},${tileY}`)
  }, [])

  const getResourcesInArea = useCallback((x, y, radius) => {
    const resources = []
    const tileRadius = Math.ceil(radius / 40)
    const centerTileX = Math.floor(x / 40) * 40
    const centerTileY = Math.floor(y / 40) * 40
    
    for (let dx = -tileRadius; dx <= tileRadius; dx++) {
      for (let dy = -tileRadius; dy <= tileRadius; dy++) {
        const tileX = centerTileX + dx * 40
        const tileY = centerTileY + dy * 40
        const resource = resourceMapRef.current.get(`${tileX},${tileY}`)
        
        if (resource) {
          const distance = Math.sqrt((tileX - x) ** 2 + (tileY - y) ** 2)
          if (distance <= radius) {
            resources.push(resource)
          }
        }
      }
    }
    
    return resources
  }, [])

  const getSpawnPoints = useCallback(() => {
    return spawnPointsRef.current
  }, [])

  const saveMapData = useCallback(() => {
    if (!mapGeneratorRef.current) return null
    
    const mapData = {
      seed: mapSeed,
      worldSize,
      terrain: terrainRef.current,
      terrainMap: terrainMapRef.current,
      resources: resourcesRef.current,
      resourceMap: resourceMapRef.current,
      spawnPoints: spawnPointsRef.current,
      metadata: {
        generatedAt: Date.now(),
        version: '1.0.0',
        tileSize: 40
      }
    }
    
    return mapGeneratorRef.current.serializeMap(mapData)
  }, [mapSeed, worldSize])

  const loadMapData = useCallback((data) => {
    const mapData = MapGenerator.deserializeMap(data)
    
    terrainRef.current = mapData.terrain
    terrainMapRef.current = mapData.terrainMap
    resourcesRef.current = mapData.resources
    resourceMapRef.current = mapData.resourceMap
    spawnPointsRef.current = mapData.spawnPoints
    setMapSeed(mapData.seed)
    
    return mapData
  }, [])

  const setTerrain = (newTerrain) => {
    terrainRef.current.length = 0
    terrainRef.current.push(...newTerrain)
    
    // Also update the terrain map for lookups
    terrainMapRef.current.clear()
    newTerrain.forEach(tile => {
      terrainMapRef.current.set(`${tile.x},${tile.y}`, tile)
    })
  }
  
  const setSpawnPoints = (newSpawnPoints) => {
    spawnPointsRef.current.length = 0
    spawnPointsRef.current.push(...newSpawnPoints)
  }
  
  const updateTerrainAnimation = useCallback((deltaTime) => {
    // Disabled for performance
    // terrainRendererRef.current.update(deltaTime)
  }, [])

  return {
    generateTerrain,
    getTerrainAt,
    isWalkable,
    renderTerrain,
    renderResources,
    getResourceAt,
    getResourcesInArea,
    getSpawnPoints,
    setTerrain,
    setSpawnPoints,
    saveMapData,
    loadMapData,
    updateTerrainAnimation,
    terrain: terrainRef.current,
    resources: resourcesRef.current,
    spawnPoints: spawnPointsRef.current,
    mapSeed
  }
}