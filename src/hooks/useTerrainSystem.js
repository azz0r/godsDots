import { useRef, useCallback } from 'react'

export const useTerrainSystem = (worldSize) => {
  const terrainRef = useRef([])
  const terrainMapRef = useRef(new Map())

  const generateTerrain = useCallback(() => {
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

  const renderTerrain = useCallback((ctx) => {
    const colors = {
      grass: '#4a7c59',
      forest: '#2d4a3a',
      hills: '#8b7355',
      water: '#4682b4'
    }
    
    terrainRef.current.forEach(tile => {
      ctx.fillStyle = colors[tile.type]
      ctx.fillRect(tile.x, tile.y, tile.width, tile.height)
    })
  }, [])

  return {
    generateTerrain,
    getTerrainAt,
    isWalkable,
    renderTerrain,
    terrain: terrainRef.current
  }
}